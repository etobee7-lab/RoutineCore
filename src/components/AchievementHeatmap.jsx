import React from 'react';

const AchievementHeatmap = ({ data }) => {
  if (!data) return null;

  // 최근 1년치(52주) 날짜 데이터 생성
  const today = new Date();
  const days = [];
  // 시작 날짜를 작년 오늘로부터 일요일까지 앞으로 당겨서 7열 격자를 맞춤
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - 364);
  const startDay = startDate.getDay();
  startDate.setDate(startDate.getDate() - startDay); // 해당 주의 일요일로 맞춤

  const totalDays = 371; // 약 53주 (7 * 53)
  for (let i = 0; i < totalDays; i++) {
    const d = new Date(startDate);
    d.setDate(startDate.getDate() + i);
    days.push(d.toISOString().split('T')[0]);
  }

  const dataMap = data.reduce((acc, row) => {
    acc[row.date] = row.completed_missions / (row.total_missions || 1);
    return acc;
  }, {});

  const weekDays = ['일', '월', '화', '수', '목', '금', '토'];

  return (
    <div className="heatmap-wrapper">
      <div className="heatmap-header-row">
        {weekDays.map(d => <span key={d} className="heatmap-weekday-label">{d}</span>)}
      </div>
      <div className="heatmap-grid-container">
        {days.map(date => {
          const ratio = dataMap[date] || 0;
          let level = 0;
          if (ratio > 0) level = 1;
          if (ratio > 0.3) level = 2;
          if (ratio > 0.6) level = 3;
          if (ratio >= 0.9) level = 4;
          
          const isFuture = date > today.toISOString().split('T')[0];

          return (
            <div 
              key={date} 
              className={`heatmap-cell level-${level} ${isFuture ? 'future' : ''}`} 
              title={`${date}: ${Math.round(ratio * 100)}% 달성`}
            />
          );
        })}
      </div>
    </div>
  );
};

export default AchievementHeatmap;
