import os
import shutil
import subprocess
import tempfile
import uuid
from pathlib import Path

# Use FFMPEG_PATH env var if set, otherwise search PATH, otherwise fall back to
# the known Windows install location from setup.
_ffmpeg_path = os.getenv("FFMPEG_PATH") or shutil.which("ffmpeg")
if _ffmpeg_path is None:
    # common location after manual install on Windows
    _ffmpeg_path = r"C:\Users\jadkf\ffmpeg\ffmpeg-8.0.1-essentials_build\bin\ffmpeg.exe"
FFMPEG = _ffmpeg_path

import cv2
import insightface
import numpy as np
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from insightface.app import FaceAnalysis

app = FastAPI(title="Face Swap API")

# Comma-separated list of allowed origins, e.g.:
#   ALLOWED_ORIGINS=http://localhost:3000,http://myhost:3000
_raw_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000")
ALLOWED_ORIGINS = [o.strip() for o in _raw_origins.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOADS_DIR = Path("uploads")
OUTPUTS_DIR = Path("outputs")
MODELS_DIR = Path("models")

for d in [UPLOADS_DIR, OUTPUTS_DIR, MODELS_DIR]:
    d.mkdir(exist_ok=True)

app.mount("/outputs", StaticFiles(directory="outputs"), name="outputs")

# ---------------------------------------------------------------------------
# Model loading — done once at startup
# ---------------------------------------------------------------------------

face_analyser = FaceAnalysis(name="buffalo_l", providers=["CUDAExecutionProvider", "CPUExecutionProvider"])
face_analyser.prepare(ctx_id=0, det_size=(640, 640))

_swapper_path = MODELS_DIR / "inswapper_128.onnx"
face_swapper = insightface.model_zoo.get_model(
    str(_swapper_path),
    providers=["CUDAExecutionProvider", "CPUExecutionProvider"],
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _get_best_face(faces):
    """Return the largest face by bounding-box area."""
    if not faces:
        return None
    return max(faces, key=lambda f: (f.bbox[2] - f.bbox[0]) * (f.bbox[3] - f.bbox[1]))


def _swap_frame(frame: np.ndarray, source_face) -> np.ndarray:
    """Detect all faces in *frame* and swap each one with *source_face*."""
    target_faces = face_analyser.get(frame)
    for face in target_faces:
        frame = face_swapper.get(frame, face, source_face, paste_back=True)
    return frame


def _get_video_fps(cap: cv2.VideoCapture) -> float:
    fps = cap.get(cv2.CAP_PROP_FPS)
    return fps if fps and fps > 0 else 25.0


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@app.get("/")
def root():
    return {"status": "ok", "message": "Face Swap API is running"}


@app.post("/upload-image")
async def upload_image(file: UploadFile = File(...)):
    """Accept a reference face image and save it to /uploads."""
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    suffix = Path(file.filename).suffix or ".jpg"
    filename = f"img_{uuid.uuid4()}{suffix}"
    dest = UPLOADS_DIR / filename

    with dest.open("wb") as f:
        shutil.copyfileobj(file.file, f)

    return {"filename": filename, "path": str(dest)}


@app.post("/upload-video")
async def upload_video(file: UploadFile = File(...)):
    """Accept a driving video and save it to /uploads."""
    if not file.content_type.startswith("video/"):
        raise HTTPException(status_code=400, detail="File must be a video")

    suffix = Path(file.filename).suffix or ".mp4"
    filename = f"vid_{uuid.uuid4()}{suffix}"
    dest = UPLOADS_DIR / filename

    with dest.open("wb") as f:
        shutil.copyfileobj(file.file, f)

    return {"filename": filename, "path": str(dest)}


@app.post("/process")
async def process(image_filename: str, video_filename: str):
    """
    Run face swap on every frame of *video_filename* using the face in
    *image_filename*, then reassemble the frames into an MP4 with ffmpeg.

    Both filenames must already exist in /uploads (uploaded via the
    /upload-image and /upload-video endpoints).
    """
    image_path = UPLOADS_DIR / image_filename
    video_path = UPLOADS_DIR / video_filename

    if not image_path.exists():
        raise HTTPException(status_code=404, detail=f"Image not found: {image_filename}")
    if not video_path.exists():
        raise HTTPException(status_code=404, detail=f"Video not found: {video_filename}")

    # --- detect source face ---------------------------------------------------
    source_img = cv2.imread(str(image_path))
    if source_img is None:
        raise HTTPException(status_code=422, detail="Could not decode reference image")

    source_faces = face_analyser.get(source_img)
    source_face = _get_best_face(source_faces)
    if source_face is None:
        raise HTTPException(status_code=422, detail="No face detected in reference image")

    # --- open video -----------------------------------------------------------
    cap = cv2.VideoCapture(str(video_path))
    if not cap.isOpened():
        raise HTTPException(status_code=422, detail="Could not open video file")

    fps = _get_video_fps(cap)
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

    # --- write swapped frames to a temporary raw video (no audio) -------------
    output_id = uuid.uuid4()
    with tempfile.NamedTemporaryFile(suffix=".avi", delete=False) as tmp:
        raw_path = Path(tmp.name)

    fourcc = cv2.VideoWriter_fourcc(*"XVID")
    writer = cv2.VideoWriter(str(raw_path), fourcc, fps, (width, height))

    frame_idx = 0
    try:
        while True:
            ret, frame = cap.read()
            if not ret:
                break
            swapped = _swap_frame(frame, source_face)
            writer.write(swapped)
            frame_idx += 1
    finally:
        cap.release()
        writer.release()

    if frame_idx == 0:
        raw_path.unlink(missing_ok=True)
        raise HTTPException(status_code=422, detail="Video contains no readable frames")

    # --- re-encode with ffmpeg, merging original audio ------------------------
    output_filename = f"output_{output_id}.mp4"
    output_path = OUTPUTS_DIR / output_filename

    ffmpeg_cmd = [
        FFMPEG, "-y",
        "-i", str(raw_path),          # swapped frames (no audio)
        "-i", str(video_path),        # original video (for audio stream)
        "-map", "0:v:0",              # video from swapped frames
        "-map", "1:a:0?",             # audio from original (? = optional)
        "-c:v", "libx264",
        "-crf", "18",
        "-preset", "fast",
        "-c:a", "aac",
        "-movflags", "+faststart",
        str(output_path),
    ]

    result = subprocess.run(ffmpeg_cmd, capture_output=True, text=True)
    raw_path.unlink(missing_ok=True)

    if result.returncode != 0:
        raise HTTPException(
            status_code=500,
            detail=f"ffmpeg failed: {result.stderr[-800:]}",
        )

    return {
        "output_filename": output_filename,
        "output_path": str(output_path),
        "frames_processed": frame_idx,
        "total_frames": total_frames,
        "fps": fps,
        "download_url": f"/download/{output_filename}",
    }


@app.get("/download/{filename}")
async def download(filename: str):
    """Serve a processed video from /outputs for download."""
    # Prevent path traversal
    if "/" in filename or "\\" in filename or ".." in filename:
        raise HTTPException(status_code=400, detail="Invalid filename")

    file_path = OUTPUTS_DIR / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")

    return FileResponse(
        path=str(file_path),
        media_type="video/mp4",
        filename=filename,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@app.get("/outputs")
def list_outputs():
    files = [f.name for f in OUTPUTS_DIR.iterdir() if f.is_file()]
    return {"outputs": files}
