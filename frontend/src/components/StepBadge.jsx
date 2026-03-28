import React from 'react';

export default function StepBadge({ step, label, done }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={[
          'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold',
          done ? 'bg-brand text-white' : 'bg-gray-800 text-gray-500',
        ].join(' ')}
      >
        {done ? <CheckIcon /> : step}
      </span>
      <span className={done ? 'text-gray-300' : 'text-gray-500'}>{label}</span>
    </div>
  );
}

function CheckIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
    </svg>
  );
}
