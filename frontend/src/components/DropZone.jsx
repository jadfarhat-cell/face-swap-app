import React, { useCallback, useRef, useState } from 'react';

/**
 * Reusable drag-and-drop / file-picker zone.
 *
 * Props:
 *   accept        – MIME type string passed to <input> (e.g. "image/*")
 *   label         – heading text
 *   hint          – sub-label (e.g. "JPG, PNG, WEBP")
 *   icon          – JSX icon element shown when empty
 *   file          – currently selected File object (controlled)
 *   preview       – object URL for preview (controlled)
 *   onFile        – callback(file: File) when a new file is chosen
 *   previewType   – "image" | "video"
 */
export default function DropZone({ accept, label, hint, icon, file, preview, onFile, previewType = 'image' }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  const processFile = useCallback(
    (f) => {
      if (!f) return;
      onFile(f);
    },
    [onFile],
  );

  /* ── drag handlers ── */
  const onDragOver = (e) => {
    e.preventDefault();
    setDragging(true);
  };
  const onDragLeave = () => setDragging(false);
  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) processFile(f);
  };

  const onInputChange = (e) => {
    processFile(e.target.files?.[0]);
    e.target.value = '';           // allow re-selecting same file
  };

  const clearFile = (e) => {
    e.stopPropagation();
    onFile(null);
  };

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={[
        'relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed',
        'cursor-pointer transition-all duration-200 select-none overflow-hidden',
        'min-h-[240px] p-5',
        dragging
          ? 'border-brand bg-brand/10 scale-[1.01]'
          : file
          ? 'border-brand/40 bg-gray-900 hover:border-brand/70'
          : 'border-gray-700 bg-gray-900 hover:border-gray-500',
      ].join(' ')}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={onInputChange}
      />

      {/* ── empty state ── */}
      {!file && (
        <div className="flex flex-col items-center gap-3 text-center animate-fade-in">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-800 text-gray-400">
            {icon}
          </div>
          <div>
            <p className="font-semibold text-gray-200">{label}</p>
            <p className="mt-1 text-sm text-gray-500">
              Drag &amp; drop or{' '}
              <span className="text-brand font-medium">browse</span>
            </p>
            {hint && <p className="mt-1 text-xs text-gray-600">{hint}</p>}
          </div>
        </div>
      )}

      {/* ── image preview ── */}
      {file && previewType === 'image' && preview && (
        <div className="animate-fade-in w-full flex flex-col items-center gap-3">
          <img
            src={preview}
            alt="preview"
            className="max-h-48 w-full rounded-xl object-cover shadow-lg"
          />
          <FileName name={file.name} onClear={clearFile} />
        </div>
      )}

      {/* ── video preview ── */}
      {file && previewType === 'video' && preview && (
        <div className="animate-fade-in w-full flex flex-col items-center gap-3">
          <video
            src={preview}
            className="max-h-48 w-full rounded-xl object-cover shadow-lg"
            muted
            playsInline
            onMouseEnter={(e) => e.target.play()}
            onMouseLeave={(e) => { e.target.pause(); e.target.currentTime = 0; }}
          />
          <FileName name={file.name} onClear={clearFile} />
        </div>
      )}

      {/* ── drag overlay ── */}
      {dragging && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-2xl bg-brand/20 backdrop-blur-sm">
          <p className="text-lg font-bold text-brand">Drop it!</p>
        </div>
      )}
    </div>
  );
}

function FileName({ name, onClear }) {
  return (
    <div className="flex w-full items-center gap-2 rounded-lg bg-gray-800 px-3 py-1.5 text-sm">
      <span className="flex-1 truncate text-gray-300">{name}</span>
      <button
        onClick={onClear}
        className="shrink-0 rounded p-0.5 text-gray-500 hover:bg-gray-700 hover:text-gray-200 transition-colors"
        title="Remove"
      >
        <XIcon />
      </button>
    </div>
  );
}

function XIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
    </svg>
  );
}
