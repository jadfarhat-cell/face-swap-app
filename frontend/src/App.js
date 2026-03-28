import React, { useCallback, useRef, useState } from 'react';
import axios from 'axios';
import DropZone from './components/DropZone';
import Spinner from './components/Spinner';
import StepBadge from './components/StepBadge';

/* ── icons ──────────────────────────────────────────────────────────────────── */
function PhotoIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
    </svg>
  );
}

function VideoIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9A2.25 2.25 0 004.5 18.75z" />
    </svg>
  );
}

function SparklesIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
    </svg>
  );
}

/* ── status labels used during processing ─────────────────────────────── */
const STEPS = [
  'Uploading reference image…',
  'Uploading driving video…',
  'Running face swap (this may take a while)…',
];

/* ════════════════════════════════════════════════════════════════════════════
   App
════════════════════════════════════════════════════════════════════════════ */
export default function App() {
  /* file state */
  const [imageFile, setImageFile]       = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [videoFile, setVideoFile]       = useState(null);
  const [videoPreview, setVideoPreview] = useState(null);

  /* process state */
  const [loading, setLoading]         = useState(false);
  const [stepIndex, setStepIndex]     = useState(-1);   // which STEPS label is active
  const [error, setError]             = useState(null);
  const [result, setResult]           = useState(null); // { downloadUrl, filename, frames, fps }

  const resultVideoRef = useRef(null);

  /* ── file setters ── */
  const handleImageFile = useCallback((file) => {
    setImageFile(file);
    setImagePreview(file ? URL.createObjectURL(file) : null);
    setResult(null);
    setError(null);
  }, []);

  const handleVideoFile = useCallback((file) => {
    setVideoFile(file);
    setVideoPreview(file ? URL.createObjectURL(file) : null);
    setResult(null);
    setError(null);
  }, []);

  /* ── process pipeline ── */
  const handleProcess = async () => {
    if (!imageFile || !videoFile || loading) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      /* Step 1 – upload image */
      setStepIndex(0);
      const imgForm = new FormData();
      imgForm.append('file', imageFile);
      const { data: imgData } = await axios.post('/upload-image', imgForm);

      /* Step 2 – upload video */
      setStepIndex(1);
      const vidForm = new FormData();
      vidForm.append('file', videoFile);
      const { data: vidData } = await axios.post('/upload-video', vidForm);

      /* Step 3 – process */
      setStepIndex(2);
      const { data: procData } = await axios.post('/process', null, {
        params: {
          image_filename: imgData.filename,
          video_filename: vidData.filename,
        },
      });

      setResult({
        downloadUrl:  procData.download_url,
        filename:     procData.output_filename,
        frames:       procData.frames_processed,
        totalFrames:  procData.total_frames,
        fps:          procData.fps,
      });
    } catch (err) {
      const detail = err.response?.data?.detail;
      setError(typeof detail === 'string' ? detail : 'An unexpected error occurred.');
    } finally {
      setLoading(false);
      setStepIndex(-1);
    }
  };

  const canProcess = imageFile && videoFile && !loading;

  return (
    <div className="min-h-screen bg-gray-950 px-4 py-12">
      <div className="mx-auto max-w-3xl space-y-8">

        {/* ── header ── */}
        <header className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full bg-brand/10 px-4 py-1.5 text-sm font-medium text-brand ring-1 ring-brand/20">
            <SparklesIcon />
            AI Face Swap
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-white">
            Face Swap Studio
          </h1>
          <p className="text-gray-500 text-sm">
            Upload a reference face and a driving video — we'll do the rest.
          </p>
        </header>

        {/* ── step tracker ── */}
        <div className="flex items-center justify-center gap-6 text-sm">
          <StepBadge step={1} label="Reference image" done={!!imageFile} />
          <Divider />
          <StepBadge step={2} label="Driving video" done={!!videoFile} />
          <Divider />
          <StepBadge step={3} label="Process" done={!!result} />
        </div>

        {/* ── upload grid ── */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <DropZone
            accept="image/*"
            label="Reference Face"
            hint="JPG · PNG · WEBP"
            icon={<PhotoIcon />}
            file={imageFile}
            preview={imagePreview}
            onFile={handleImageFile}
            previewType="image"
          />
          <DropZone
            accept="video/*"
            label="Driving Video"
            hint="MP4 · MOV · AVI"
            icon={<VideoIcon />}
            file={videoFile}
            preview={videoPreview}
            onFile={handleVideoFile}
            previewType="video"
          />
        </div>

        {/* ── process button ── */}
        <button
          onClick={handleProcess}
          disabled={!canProcess}
          className={[
            'w-full rounded-2xl py-4 text-base font-bold tracking-wide transition-all duration-200',
            'flex items-center justify-center gap-2 shadow-lg',
            canProcess
              ? 'bg-brand hover:bg-brand-hover text-white hover:shadow-brand/30 hover:shadow-xl active:scale-[0.98]'
              : 'bg-gray-800 text-gray-600 cursor-not-allowed',
          ].join(' ')}
        >
          <SparklesIcon />
          {loading ? 'Processing…' : 'Swap Faces'}
        </button>

        {/* ── loading ── */}
        {loading && (
          <div className="rounded-2xl bg-gray-900 border border-gray-800 p-6 space-y-4 animate-fade-in">
            <Spinner label={STEPS[stepIndex] ?? 'Working…'} />
            <div className="space-y-2 px-2">
              {STEPS.map((s, i) => (
                <div key={s} className="flex items-center gap-3 text-sm">
                  <span className={[
                    'flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                    i < stepIndex  ? 'bg-brand text-white'
                    : i === stepIndex ? 'bg-brand/20 text-brand ring-1 ring-brand/40'
                    : 'bg-gray-800 text-gray-600',
                  ].join(' ')}>
                    {i < stepIndex ? '✓' : i + 1}
                  </span>
                  <span className={i <= stepIndex ? 'text-gray-300' : 'text-gray-600'}>{s}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── error ── */}
        {error && (
          <div className="animate-slide-up rounded-2xl border border-red-500/30 bg-red-950/40 px-5 py-4 text-sm text-red-400">
            <span className="font-semibold">Error: </span>{error}
          </div>
        )}

        {/* ── result ── */}
        {result && (
          <div className="animate-slide-up rounded-2xl border border-gray-800 bg-gray-900 overflow-hidden">
            {/* success banner */}
            <div className="flex items-center gap-2 border-b border-gray-800 bg-brand/10 px-5 py-3 text-sm font-semibold text-brand">
              <SparklesIcon />
              Face swap complete!
              <span className="ml-auto text-xs font-normal text-gray-500">
                {result.frames} frames · {Number(result.fps).toFixed(1)} fps
              </span>
            </div>

            {/* video player */}
            <div className="p-5 space-y-4">
              <video
                ref={resultVideoRef}
                src={result.downloadUrl}
                controls
                className="w-full rounded-xl shadow-xl bg-black"
                style={{ maxHeight: '420px' }}
              />

              {/* stats row */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Frames processed', value: result.frames },
                  { label: 'Total frames',     value: result.totalFrames },
                  { label: 'Frame rate',        value: `${Number(result.fps).toFixed(1)} fps` },
                ].map(({ label, value }) => (
                  <div key={label} className="rounded-xl bg-gray-800/60 px-4 py-3 text-center">
                    <p className="text-lg font-bold text-white">{value}</p>
                    <p className="mt-0.5 text-xs text-gray-500">{label}</p>
                  </div>
                ))}
              </div>

              {/* download button */}
              <a
                href={result.downloadUrl}
                download={result.filename}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-3.5 text-sm font-bold text-white hover:bg-brand-hover transition-colors shadow-lg hover:shadow-brand/30 active:scale-[0.98]"
              >
                <DownloadIcon />
                Download Video
              </a>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

function Divider() {
  return <div className="h-px w-8 bg-gray-700" />;
}
