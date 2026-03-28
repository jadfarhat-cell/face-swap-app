import React from 'react';

export default function Spinner({ label }) {
  return (
    <div className="flex flex-col items-center gap-4 py-6 animate-fade-in">
      <div className="relative h-14 w-14">
        {/* outer ring */}
        <svg className="animate-spin-slow h-14 w-14" viewBox="0 0 56 56" fill="none">
          <circle cx="28" cy="28" r="24" stroke="#374151" strokeWidth="4" />
          <path
            d="M28 4a24 24 0 0 1 24 24"
            stroke="#7c3aed"
            strokeWidth="4"
            strokeLinecap="round"
          />
        </svg>
        {/* inner pulse dot */}
        <span className="absolute inset-0 m-auto h-4 w-4 rounded-full bg-brand/30 animate-ping" />
        <span className="absolute inset-0 m-auto h-3 w-3 rounded-full bg-brand" />
      </div>
      {label && (
        <p className="text-sm font-medium text-gray-400 tracking-wide">{label}</p>
      )}
    </div>
  );
}
