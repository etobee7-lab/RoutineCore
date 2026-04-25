import React from 'react';

// 차트 상수
const radius = 140;
const center = 180;

const polarToCartesian = (cx, cy, r, angleInDegrees) => {
  const angleInRadians = (angleInDegrees - 90) * (Math.PI / 180.0);
  return {
    x: cx + r * Math.cos(angleInRadians),
    y: cy + r * Math.sin(angleInRadians),
  };
};

const describeArc = (x, y, r, startAngle, endAngle) => {
  const diff = endAngle - startAngle;
  if (diff <= 0) return '';
  if (diff >= 359.99) {
    return `M ${x},${y - r} A ${r},${r} 0 1 1 ${x - 0.01},${y - r} Z`;
  }
  const start = polarToCartesian(x, y, r, endAngle);
  const end = polarToCartesian(x, y, r, startAngle);
  const largeArcFlag = diff <= 180 ? '0' : '1';
  return ['M', x, y, 'L', start.x, start.y, 'A', r, r, 0, largeArcFlag, 0, end.x, end.y, 'Z'].join(' ');
};

const getDailyScheduleData = (todos) => {
  const sortedTodos = [...todos].sort((a, b) => (a.time || '00:00').localeCompare(b.time || '00:00'));
  if (sortedTodos.length === 0) return [];
  const segments = [];
  for (let i = 0; i < sortedTodos.length; i++) {
    const current = sortedTodos[i];
    const next = sortedTodos[(i + 1) % sortedTodos.length];
    const timeParts = (current.time || '00:00').split(':').map(Number);
    const nextParts = (next.time || '00:00').split(':').map(Number);
    let startMinutes = (timeParts[0] || 0) * 60 + (timeParts[1] || 0);
    let endMinutes = (nextParts[0] || 0) * 60 + (nextParts[1] || 0);
    if (endMinutes <= startMinutes) endMinutes += 24 * 60;
    if (endMinutes - startMinutes === 0) continue;
    segments.push({
      text: current.text || '일정',
      startMinutes,
      endMinutes,
      color: `hsl(${(i * 137.5) % 360}, 70%, 65%)`,
    });
  }
  return segments;
};

const DailyScheduleChart = ({ todos }) => {
  const segments = getDailyScheduleData(todos);
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const nowAngle = (nowMinutes / (24 * 60)) * 360;
  const pEnd = polarToCartesian(center, center, radius + 15, nowAngle);

  return (
    <div className="daily-chart-svg-wrapper">
      <svg viewBox="0 0 360 360" className="daily-chart-svg">
        <circle cx={center} cy={center} r={radius + 20} fill="rgba(255, 255, 255, 0.02)" />
        <circle cx={center} cy={center} r={radius} fill="#0f172a" stroke="rgba(255, 255, 255, 0.1)" strokeWidth="4" />
        {Array.from({ length: 24 }).map((_, i) => {
          const angle = i * 15;
          const isMain = i % 3 === 0;
          const p1 = polarToCartesian(center, center, radius - 8, angle);
          const p2 = polarToCartesian(center, center, radius + 8, angle);
          return (
            <g key={i}>
              <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke={isMain ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.1)'} strokeWidth={isMain ? '2' : '1'} />
              {isMain && (
                <text x={polarToCartesian(center, center, radius + 25, angle).x} y={polarToCartesian(center, center, radius + 25, angle).y} fill="rgba(255,255,255,0.5)" fontSize="13" fontWeight="bold" textAnchor="middle" dominantBaseline="middle">
                  {i}
                </text>
              )}
            </g>
          );
        })}
        {segments.map((seg, i) => {
          const startAngle = (seg.startMinutes / (24 * 60)) * 360;
          const endAngle = (seg.endMinutes / (24 * 60)) * 360;
          const midAngle = startAngle + (endAngle - startAngle) / 2;
          const textPos = polarToCartesian(center, center, radius * 0.65, midAngle);
          return (
            <g key={i} className="chart-segment-group">
              <path d={describeArc(center, center, radius - 4, startAngle, endAngle)} fill={seg.color} className="chart-path" opacity="0.8" />
              {endAngle - startAngle > 10 && (
                <g style={{ pointerEvents: 'none' }}>
                  <text x={textPos.x} y={textPos.y} fill="none" stroke="#ffffff" strokeWidth="3" strokeLinejoin="round" fontSize="14" fontWeight="900" textAnchor="middle" dominantBaseline="middle">
                    {seg.text.length > 8 ? seg.text.substring(0, 7) + '..' : seg.text}
                  </text>
                  <text x={textPos.x} y={textPos.y} fill="#000000" fontSize="14" fontWeight="900" textAnchor="middle" dominantBaseline="middle">
                    {seg.text.length > 8 ? seg.text.substring(0, 7) + '..' : seg.text}
                  </text>
                </g>
              )}
            </g>
          );
        })}
        <g className="now-hand">
          <line x1={center} y1={center} x2={pEnd.x} y2={pEnd.y} stroke="#ff4757" strokeWidth="3" strokeLinecap="round" />
          <circle cx={center} cy={center} r="6" fill="#0f172a" stroke="#ff4757" strokeWidth="2" />
          <circle cx={pEnd.x} cy={pEnd.y} r="5" fill="#ff4757" />
        </g>
      </svg>
    </div>
  );
};

export default DailyScheduleChart;
