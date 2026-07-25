import { useMemo, useState } from 'react';

function buildChartGeometry(points, width, height, padX, padY) {
  const max = Math.max(...points.map((p) => p.amount), 1);
  const min = Math.min(...points.map((p) => p.amount), 0);
  const range = max - min || 1;
  const innerW = width - padX * 2;
  const innerH = height - padY * 2;

  const coords = points.map((p, i) => {
    const x = padX + (i / Math.max(points.length - 1, 1)) * innerW;
    const y = padY + innerH - ((p.amount - min) / range) * innerH;
    return { ...p, x, y };
  });

  const line = coords.map((c) => `${c.x},${c.y}`).join(' ');
  const area = `${padX},${height - padY} ${line} ${width - padX},${height - padY}`;

  return { coords, line, area, max, min };
}

export function ReferralEarningsChart({ data }) {
  const [hover, setHover] = useState(null);
  const width = 560;
  const height = 220;
  const padX = 32;
  const padY = 28;

  const { coords, line, area } = useMemo(
    () => buildChartGeometry(data, width, height, padX, padY),
    [data],
  );

  return (
    <section className="portal-ref-dash__chart portal-dash-panel" aria-labelledby="referral-chart-title">
      <h2 id="referral-chart-title" className="portal-ref-dash__section-title">Monthly Earnings</h2>

      <div className="portal-ref-dash__chart-body">
        <svg
          className="portal-ref-dash__chart-svg"
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label="Monthly earnings line chart">
          <defs>
            <linearGradient id="ref-chart-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(255,85,0,0.18)" />
              <stop offset="100%" stopColor="rgba(255,85,0,0)" />
            </linearGradient>
          </defs>

          {[0, 1, 2, 3].map((i) => {
            const y = padY + ((height - padY * 2) / 3) * i;
            return (
              <line
                key={i}
                x1={padX}
                y1={y}
                x2={width - padX}
                y2={y}
                stroke="rgba(26,26,26,0.06)"
                strokeWidth="1"
              />
            );
          })}

          <polygon points={area} fill="url(#ref-chart-fill)" />
          <polyline
            points={line}
            fill="none"
            stroke="var(--brand-primary, #ff5500)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {coords.map((c, i) => (
            <g key={c.month}>
              <circle
                cx={c.x}
                cy={c.y}
                r={hover === i ? 6 : 4}
                fill="#fff"
                stroke="var(--brand-primary, #ff5500)"
                strokeWidth="2"
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
                tabIndex={0}
                role="presentation"
              />
              <text
                x={c.x}
                y={height - 8}
                textAnchor="middle"
                className="portal-ref-dash__chart-axis">
                {c.month}
              </text>
            </g>
          ))}
        </svg>

        {hover != null && coords[hover] ? (
          <div
            className="portal-ref-dash__chart-tooltip"
            style={{
              left: `${(coords[hover].x / width) * 100}%`,
              top: `${(coords[hover].y / height) * 100}%`,
            }}>
            <span className="portal-ref-dash__chart-tooltip-month">{coords[hover].month}</span>
            <strong>{coords[hover].amount.toLocaleString('en-US')} USDT</strong>
          </div>
        ) : null}
      </div>
    </section>
  );
}
