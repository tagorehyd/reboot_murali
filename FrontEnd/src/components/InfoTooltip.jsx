import React from 'react';

export default function InfoTooltip({ text }) {
  return (
    <span className="group relative inline-flex">
      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-slate-200 text-[10px] font-black text-slate-700">i</span>
      <span className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 hidden w-56 -translate-x-1/2 rounded-lg bg-slate-900 px-2.5 py-2 text-[11px] font-medium text-white shadow-xl group-hover:block">
        {text}
      </span>
    </span>
  );
}
