#!/usr/bin/env bash
# =============================================================================
# setup_model.sh
# Downloads InsightFace models required by the face-swap-app backend.
#
# Models fetched:
#   1. inswapper_128.onnx  → backend/models/
#   2. buffalo_l pack      → ~/.insightface/models/buffalo_l/
#      (InsightFace's FaceAnalysis loads buffalo_l from that XDG-style cache;
#       the backend mounts backend/models/ only for the swapper model.)
# =============================================================================
set -euo pipefail

# ── colours ──────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'

info()    { echo -e "${BLUE}[INFO]${NC}  $*"; }
success() { echo -e "${GREEN}[OK]${NC}    $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error()   { echo -e "${RED}[ERROR]${NC} $*" >&2; }
die()     { error "$*"; exit 1; }

# ── paths ────────────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MODELS_DIR="$SCRIPT_DIR/backend/models"
INSIGHTFACE_CACHE="${INSIGHTFACE_HOME:-$HOME/.insightface}/models"

INSWAPPER_FILE="$MODELS_DIR/inswapper_128.onnx"
BUFFALO_DIR="$INSIGHTFACE_CACHE/buffalo_l"

# InsightFace model zoo — inswapper is distributed via Hugging Face
INSWAPPER_URL="https://huggingface.co/deepinsight/insightface/resolve/main/models/inswapper_128.onnx"

# buffalo_l zip from the InsightFace GitHub release (same archive the library
# auto-downloads; we do it manually so it's done before the first run)
BUFFALO_URL="https://github.com/deepinsight/insightface/releases/download/v0.7/buffalo_l.zip"

# Expected sizes (bytes) — used as a basic integrity guard
INSWAPPER_MIN_BYTES=500000000   # ~554 MB
BUFFALO_MIN_BYTES=400000000     # ~416 MB (zip)

# ── helpers ──────────────────────────────────────────────────────────────────

# Prefer wget; fall back to curl
download() {
    local url="$1" dest="$2" label="$3"
    info "Downloading $label …"
    if command -v wget &>/dev/null; then
        wget --show-progress -q -O "$dest" "$url"
    elif command -v curl &>/dev/null; then
        curl -L --progress-bar -o "$dest" "$url"
    else
        die "Neither wget nor curl found. Install one and retry."
    fi
}

file_size() {
    # portable: works on Linux (stat -c) and macOS (stat -f)
    if stat --version &>/dev/null 2>&1; then
        stat -c%s "$1"
    else
        stat -f%z "$1"
    fi
}

verify_min_size() {
    local file="$1" min="$2" label="$3"
    if [[ ! -f "$file" ]]; then
        die "$label not found at $file"
    fi
    local size
    size=$(file_size "$file")
    if (( size < min )); then
        die "$label looks too small (${size} bytes). The download may be corrupt."
    fi
    success "$label  ✓  ($(( size / 1024 / 1024 )) MB)"
}

# ── banner ───────────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}║       Face Swap App — Model Setup            ║${NC}"
echo -e "${BOLD}╚══════════════════════════════════════════════════════╝${NC}"
echo ""

# ── preflight checks ─────────────────────────────────────────────────────────
info "Checking prerequisites …"

if ! command -v python3 &>/dev/null; then
    die "python3 not found. Install Python 3.10+ and retry."
fi
if ! python3 -c "import zipfile" &>/dev/null; then
    die "Python zipfile module not available."
fi
success "python3 found  →  $(python3 --version)"

# ── 1. create directories ────────────────────────────────────────────────────
echo ""
info "Creating model directories …"
mkdir -p "$MODELS_DIR"
mkdir -p "$BUFFALO_DIR"
success "backend/models/          →  $MODELS_DIR"
success "InsightFace cache/       →  $INSIGHTFACE_CACHE"

# ── 2. inswapper_128.onnx ────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}── Step 1 / 2 : inswapper_128.onnx ────────────────────────${NC}"

if [[ -f "$INSWAPPER_FILE" ]]; then
    size=$(file_size "$INSWAPPER_FILE")
    if (( size >= INSWAPPER_MIN_BYTES )); then
        warn "inswapper_128.onnx already present ($(( size / 1024 / 1024 )) MB). Skipping download."
    else
        warn "Existing inswapper_128.onnx is too small (${size} bytes) — re-downloading …"
        rm -f "$INSWAPPER_FILE"
        download "$INSWAPPER_URL" "$INSWAPPER_FILE" "inswapper_128.onnx"
    fi
else
    download "$INSWAPPER_URL" "$INSWAPPER_FILE" "inswapper_128.onnx"
fi

verify_min_size "$INSWAPPER_FILE" "$INSWAPPER_MIN_BYTES" "inswapper_128.onnx"

# ── 3. buffalo_l ─────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}── Step 2 / 2 : buffalo_l face analysis pack ────────────${NC}"

BUFFALO_LANDMARK="$BUFFALO_DIR/2d106det.onnx"   # one of six files in the pack

if [[ -f "$BUFFALO_LANDMARK" ]]; then
    warn "buffalo_l already extracted at $BUFFALO_DIR. Skipping download."
else
    BUFFALO_ZIP="$(mktemp /tmp/buffalo_l_XXXXXX.zip)"
    trap 'rm -f "$BUFFALO_ZIP"' EXIT

    download "$BUFFALO_URL" "$BUFFALO_ZIP" "buffalo_l.zip"

    # Verify zip is not empty before extracting
    zip_size=$(file_size "$BUFFALO_ZIP")
    if (( zip_size < BUFFALO_MIN_BYTES )); then
        die "buffalo_l.zip too small (${zip_size} bytes). The download may be corrupt."
    fi

    info "Extracting buffalo_l.zip → $BUFFALO_DIR …"
    # InsightFace expects the files directly inside buffalo_l/, not in a sub-folder
    python3 - <<PYEOF
import zipfile, pathlib, sys

zip_path = "$BUFFALO_ZIP"
dest     = pathlib.Path("$BUFFALO_DIR")
dest.mkdir(parents=True, exist_ok=True)

with zipfile.ZipFile(zip_path) as zf:
    members = zf.namelist()
    for member in members:
        # strip any leading directory component (e.g. "buffalo_l/foo.onnx" → "foo.onnx")
        filename = pathlib.Path(member).name
        if not filename:
            continue
        target = dest / filename
        with zf.open(member) as src, open(target, "wb") as dst:
            dst.write(src.read())
        print(f"  extracted: {filename}")

print(f"Done — {len(members)} files extracted to {dest}")
PYEOF
fi

# ── 4. verify all expected buffalo_l files ───────────────────────────────────
echo ""
info "Verifying buffalo_l model files …"

BUFFALO_EXPECTED=(
    "det_10g.onnx"
    "2d106det.onnx"
    "genderage.onnx"
    "w600k_r50.onnx"
    "1k3d68.onnx"
)

all_ok=true
for f in "${BUFFALO_EXPECTED[@]}"; do
    path="$BUFFALO_DIR/$f"
    if [[ -f "$path" ]]; then
        size=$(file_size "$path")
        success "$f  ($(( size / 1024 )) KB)"
    else
        error "Missing: $f"
        all_ok=false
    fi
done

if [[ "$all_ok" != true ]]; then
    die "One or more buffalo_l files are missing. Delete $BUFFALO_DIR and re-run."
fi

# ── 5. final summary ─────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}║              All models ready!               ║${NC}"
echo -e "${BOLD}╚══════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  ${GREEN}inswapper_128.onnx${NC}  →  backend/models/"
echo -e "  ${GREEN}buffalo_l/${NC}          →  ~/.insightface/models/buffalo_l/"
echo ""
info "You can now start the backend:"
echo ""
echo -e "    ${BOLD}cd backend && uvicorn main:app --reload${NC}"
echo -e "    ${BOLD}# or:  docker compose up --build${NC}"
echo ""
