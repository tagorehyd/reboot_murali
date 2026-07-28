import React, { useState } from 'react';

const DEFAULT_FEATURES = [
  { name: 'Amount Spike', key: 'amountSpike', value: 0.85 },
  { name: 'Velocity Rate', key: 'velocityRate', value: 0.65 },
  { name: 'Device Fingerprint', key: 'deviceDivergence', value: 0.90 },
  { name: 'Geo Distance', key: 'geoDistance', value: 0.75 },
  { name: 'Time Delta', key: 'timeAnomaly', value: 0.40 },
  { name: 'Mempool Friction', key: 'mempoolFriction', value: 0.55 },
  { name: 'Beneficiary Risk', key: 'beneficiaryRisk', value: 0.80 },
  { name: 'Auth Entropy', key: 'authEntropy', value: 0.60 },
];

export default function RadarChart({
  features = DEFAULT_FEATURES,
  title = "Isolation Forest 8D Anomaly Vector",
  score = 0.58,
  anomaly = true,
  size = 360,
}) {
  const [hoveredIdx, setHoveredIdx] = useState(null);

  const center = size / 2;
  const radius = (size / 2) - 55;
  const totalAxes = features.length;
  const angleSlice = (Math.PI * 2) / totalAxes;

  // Concentric levels (20%, 40%, 60%, 80%, 100%)
  const levels = [0.2, 0.4, 0.6, 0.8, 1.0];

  // Helper to calculate (x, y) for a value (0.0 to 1.0) along axis i
  const getCoordinates = (i, val) => {
    const angle = i * angleSlice - Math.PI / 2;
    const r = radius * Math.min(1.0, Math.max(0.0, val));
    return {
      x: center + r * Math.cos(angle),
      y: center + r * Math.sin(angle),
    };
  };

  // Build polygon points string for dataset
  const polygonPoints = features
    .map((f, i) => {
      const { x, y } = getCoordinates(i, f.value);
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <div className="relative bg-slate-950/90 backdrop-blur-xl border border-emerald-500/30 rounded-2xl p-6 shadow-[0_0_30px_rgba(16,185,129,0.15)] text-slate-100 font-sans max-w-lg mx-auto overflow-hidden">
      {/* Background glow circle */}
      <div className="absolute -top-24 -right-24 w-60 h-60 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-60 h-60 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between mb-4 border-b border-slate-800/80 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            <h3 className="text-sm font-bold tracking-wider uppercase text-emerald-400 font-mono">
              {title}
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5 font-mono">
            Unsupervised ML Isolation Forest Feature Extraction
          </p>
        </div>

        <div className="text-right">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black tracking-wide font-mono ${
            anomaly ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
          }`}>
            <span>SCORE:</span>
            <span className="text-sm">{score}</span>
          </span>
        </div>
      </div>

      {/* SVG Radar */}
      <div className="flex justify-center items-center my-2">
        <svg width={size} height={size} className="overflow-visible">
          <defs>
            <radialGradient id="radarGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.1" />
            </radialGradient>
            <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Concentric grid lines (Web) */}
          {levels.map((lvl, lIdx) => {
            const gridPoints = features
              .map((_, i) => {
                const { x, y } = getCoordinates(i, lvl);
                return `${x},${y}`;
              })
              .join(' ');

            return (
              <polygon
                key={`grid-${lIdx}`}
                points={gridPoints}
                fill="none"
                stroke="#334155"
                strokeWidth="1"
                strokeDasharray={lIdx === levels.length - 1 ? 'none' : '2,2'}
                opacity={0.6}
              />
            );
          })}

          {/* Axis spokes and labels */}
          {features.map((f, i) => {
            const endCoord = getCoordinates(i, 1.0);
            const labelCoord = getCoordinates(i, 1.18);
            const isHovered = hoveredIdx === i;

            return (
              <g key={`axis-${i}`}>
                {/* Spoke Line */}
                <line
                  x1={center}
                  y1={center}
                  x2={endCoord.x}
                  y2={endCoord.y}
                  stroke="#475569"
                  strokeWidth="1"
                  opacity={0.5}
                />

                {/* Label text */}
                <text
                  x={labelCoord.x}
                  y={labelCoord.y}
                  textAnchor="middle"
                  dominantBaseline="central"
                  className={`text-[10px] font-mono transition-all duration-200 ${
                    isHovered
                      ? 'fill-emerald-300 font-bold scale-110'
                      : 'fill-slate-400 font-medium'
                  }`}
                >
                  {f.name}
                </text>
              </g>
            );
          })}

          {/* Feature Data Polygon */}
          <polygon
            points={polygonPoints}
            fill="url(#radarGlow)"
            stroke="#10b981"
            strokeWidth="2.5"
            filter="url(#neonGlow)"
            className="transition-all duration-300"
          />

          {/* Data Points / Handles */}
          {features.map((f, i) => {
            const { x, y } = getCoordinates(i, f.value);
            const isHovered = hoveredIdx === i;

            return (
              <g key={`point-${i}`}>
                <circle
                  cx={x}
                  cy={y}
                  r={isHovered ? 6 : 4}
                  fill={isHovered ? '#38bdf8' : '#34d399'}
                  stroke="#0284c7"
                  strokeWidth="2"
                  className="cursor-pointer transition-all duration-200"
                  onMouseEnter={() => setHoveredIdx(i)}
                  onMouseLeave={() => setHoveredIdx(null)}
                />
              </g>
            );
          })}
        </svg>
      </div>

      {/* Tooltip / Active Feature Detail */}
      <div className="mt-3 bg-slate-900/80 rounded-xl p-3 border border-slate-800 text-xs flex items-center justify-between font-mono">
        {hoveredIdx !== null ? (
          <>
            <span className="text-emerald-400 font-bold">
              📍 {features[hoveredIdx].name}:
            </span>
            <span className="text-white font-bold bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
              {(features[hoveredIdx].value * 100).toFixed(1)}% Anomaly Index
            </span>
          </>
        ) : (
          <span className="text-slate-400 text-center w-full">
            💡 Hover over any feature node on the radar to inspect vectors
          </span>
        )}
      </div>
    </div>
  );
}
