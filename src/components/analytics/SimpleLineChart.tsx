interface SeriesPoint {
  label: string;
  value: number;
}

interface SimpleLineChartProps {
  data: SeriesPoint[];
  formatValue?: (value: number) => string;
  height?: number;
  emptyLabel?: string;
}

const SimpleLineChart = ({
  data,
  formatValue = (value) => value.toLocaleString(),
  height = 260,
  emptyLabel = 'No chart data available.',
}: SimpleLineChartProps) => {
  const width = 720;
  const padding = 44;
  const values = data.map((point) => point.value).filter(Number.isFinite);
  const min = values.length ? Math.min(...values) : 0;
  const max = values.length ? Math.max(...values) : 0;
  const span = max - min || 1;
  const points = data.map((point, index) => {
    const x = data.length === 1 ? width / 2 : padding + (index * (width - padding * 2)) / (data.length - 1);
    const y = height - padding - ((point.value - min) / span) * (height - padding * 2);
    return { ...point, x, y };
  });
  const path = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');

  if (!data.length) {
    return (
      <div className="flex min-h-[220px] items-center justify-center rounded-xl border border-dashed border-outline-variant/20 bg-surface-container-lowest p-8 text-center text-sm text-secondary">
        {emptyLabel}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <svg role="img" aria-label="Line chart" viewBox={`0 0 ${width} ${height}`} className="min-w-[620px]">
        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#d1d5db" />
        <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="#d1d5db" />
        <text x={padding} y={padding - 14} className="fill-slate-500 text-[11px]">{formatValue(max)}</text>
        <text x={padding} y={height - padding + 24} className="fill-slate-500 text-[11px]">{formatValue(min)}</text>
        <path d={path} fill="none" stroke="#0f172a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((point) => (
          <g key={`${point.label}-${point.x}`}>
            <circle cx={point.x} cy={point.y} r="5" fill="#0f172a" />
            <title>{`${point.label}: ${formatValue(point.value)}`}</title>
          </g>
        ))}
        {points.map((point, index) => (
          index % Math.max(1, Math.ceil(points.length / 6)) === 0 ? (
            <text key={point.label} x={point.x} y={height - 10} textAnchor="middle" className="fill-slate-500 text-[10px]">
              {point.label}
            </text>
          ) : null
        ))}
      </svg>
    </div>
  );
};

export default SimpleLineChart;
