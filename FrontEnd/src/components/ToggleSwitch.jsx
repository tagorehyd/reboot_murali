import React from 'react';

export default function ToggleSwitch({ checked, onChange, label, description }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2">
      <div>
        <p className="text-sm font-bold text-slate-900">{label}</p>
        {description ? <p className="text-xs text-slate-600">{description}</p> : null}
      </div>

      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          checked ? 'bg-cyan-600' : 'bg-slate-300'
        }`}
        aria-pressed={checked}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
}
