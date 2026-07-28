import React from 'react';

export default function ToggleSwitch({ checked, onChange, label, description }) {
  return (
    <div className={`flex items-start justify-between gap-3 rounded-xl border px-3 py-2 transition-colors ${
      checked
        ? 'border-indigo-200 bg-indigo-50 dark:bg-indigo-900/30 dark:border-indigo-800/50'
        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900'
    }`}>
      <div>
        <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{label}</p>
        {description ? <p className="text-[10px] text-slate-600 dark:text-slate-400 leading-snug mt-0.5">{description}</p> : null}
      </div>

      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors shrink-0 ${
          checked ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-600'
        }`}
        aria-pressed={checked}
      >
        <span
          className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
            checked ? 'translate-x-4.5' : 'translate-x-1'
          }`}
          style={{ transform: checked ? 'translateX(18px)' : 'translateX(2px)' }}
        />
      </button>
    </div>
  );
}
