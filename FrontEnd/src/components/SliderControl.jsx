import React from 'react';

export default function SliderControl({
  id,
  label,
  value,
  min,
  max,
  step = 100,
  inputStep,
  onChange,
  prefix = '£',
  hint,
}) {
  const normalizedValue = Number.isFinite(Number(value)) ? Number(value) : min;

  const handleNumberChange = (rawValue) => {
    if (rawValue === '') {
      return;
    }

    const parsed = Number(rawValue);
    if (Number.isNaN(parsed)) {
      return;
    }

    const clamped = Math.max(min, Math.min(max, parsed));
    onChange(clamped);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-end justify-between gap-3">
        <label htmlFor={id} className="text-xs font-bold uppercase tracking-wider text-slate-700">
          {label}
        </label>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-600">{prefix}</span>
          <input
            type="number"
            value={normalizedValue}
            min={min}
            max={max}
            step={inputStep || step}
            onChange={(e) => handleNumberChange(e.target.value)}
            className="w-28 rounded-lg border border-slate-300 bg-white px-2 py-1 text-right text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />
        </div>
      </div>

      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={normalizedValue}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-gradient-to-r from-cyan-200 via-sky-300 to-indigo-400"
      />

      <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500">
        <span>{prefix}{Number(min).toLocaleString()}</span>
        <span>{prefix}{Number(max).toLocaleString()}</span>
      </div>

      {hint ? <p className="text-xs text-slate-600">{hint}</p> : null}
    </div>
  );
}
