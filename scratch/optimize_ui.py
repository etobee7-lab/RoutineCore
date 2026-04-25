import sys

with open('src/App.jsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_content = """const ScheduleOnlyCalendar = ({ todos, startEdit, closeCalendar, userPoints, progress, userAvatar, currentUser, setShowSuccessRoom, setShowMyPage, setShowDailyChart, handleInstallClick, showInstallBtn, setIsAuthenticated, setCurrentUser }) => {
  const [baseDate, setBaseDate] = useState(new Date()); 
  const [viewMode, setViewMode] = useState('week'); 

  const dayNameToIndex = { '일': 0, '월': 1, '화': 2, '수': 3, '목': 4, '금': 5, '토': 6 };
  const dayColors = {
    0: '#f87171', 1: '#60a5fa', 2: '#34d399',
    3: '#fbbf24', 4: '#a78bfa', 5: '#f472b6', 6: '#fb923c'
  };
  const dayNames = ['일', '월', '화', '수', '목', '금', '토'];

  const toLocalDateStr = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const today = new Date();
  today.setHours(0,0,0,0);
  const todayStr = toLocalDateStr(today);

  const moveWeek = (offset) => {
    const next = new Date(baseDate);
    next.setDate(baseDate.getDate() + offset * 7);
    setBaseDate(next);
  };

  const moveMonth = (offset) => {
    const next = new Date(baseDate);
    next.setMonth(baseDate.getMonth() + offset);
    setBaseDate(next);
  };

  const resetToToday = () => {
    setBaseDate(new Date());
    setViewMode('week');
  };

  const getDisplayDays = () => {
    if (viewMode === 'week') {
      const d = new Date(baseDate);
      const diff = d.getDay() === 0 ? -6 : 1 - d.getDay();
      d.setDate(d.getDate() + diff);
      return Array.from({ length: 7 }, (_, i) => {
        const target = new Date(d);
        target.setDate(d.getDate() + i);
        return { dayIndex: target.getDay(), date: target, dateStr: toLocalDateStr(target) };
      });
    } else {
      const year = baseDate.getFullYear();
      const month = baseDate.getMonth();
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      const days = [];
      for (let i = 1; i <= lastDay.getDate(); i++) {
        const target = new Date(year, month, i);
        days.push({ dayIndex: target.getDay(), date: target, dateStr: toLocalDateStr(target) });
      }
      return days;
    }
  };

  const displayDays = getDisplayDays();

  const getScheduleTodosByDay = (dayIndex, dateStr) => {
    return todos.filter(todo => {
      if (todo.scheduleMode !== 'schedule') return false;
      if (todo.startDate && dateStr < todo.startDate) return false;
      if (todo.endDate && dateStr > todo.endDate) return false;
      if (todo.days && todo.days.trim() !== '') {
        const indices = todo.days.split(',').map(d => dayNameToIndex[d.trim()]).filter(i => i !== undefined);
        return indices.includes(dayIndex);
      }
      return true;
    }).sort((a, b) => (a.time || '00:00').localeCompare(b.time || '00:00'));
  };

  const formatTime = (timeStr) => {
    const [h, m] = (timeStr || '09:00').split(':').map(Number);
    return `${h < 12 ? '오전' : '오후'} ${String(h % 12 || 12).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  const currentHeader = viewMode === 'week' 
    ? `${baseDate.getFullYear()}년 ${baseDate.getMonth() + 1}월 ${Math.ceil(baseDate.getDate() / 7)}주차`
    : `${baseDate.getFullYear()}년 ${baseDate.getMonth() + 1}월 전체`;

  return (
    <div className="calendar-optimized-layout" style={{ 
      display: 'flex', flexDirection: 'column', gap: '0', 
      background: 'linear-gradient(to bottom, #0f172a, #1e293b)', 
      minHeight: '100vh', paddingBottom: '120px' 
    }}>
      
      <div className="premium-header-sticky" style={{
        background: 'rgba(15, 23, 42, 0.8)',
        padding: '20px 25px', borderRadius: '0 0 25px 25px',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 4px 30px rgba(0,0,0,0.4)',
        position: 'sticky', top: 0, zIndex: 1000, backdropFilter: 'blur(20px)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div className="brand-logo" onClick={() => setShowDailyChart(true)} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
            <img src="/logo512.png" alt="Logo" style={{ width: '42px', height: '42px', filter: 'drop-shadow(0 0 8px rgba(96, 165, 250, 0.3))' }} />
            <div style={{ marginLeft: '12px' }}>
              <h1 style={{ fontSize: '1.25rem', margin: 0, color: '#fff', fontWeight: '900', letterSpacing: '-0.5px' }}>Routine</h1>
              <span style={{ fontSize: '1.1rem', color: '#60a5fa', fontWeight: '800', lineHeight: 0.8 }}>Core</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ 
              display: 'flex', alignItems: 'center', gap: '10px', 
              padding: '6px 12px', background: 'rgba(255,255,255,0.03)', 
              borderRadius: '15px', border: '1px solid rgba(255,255,255,0.06)' 
            }}>
              <span style={{ fontSize: '1.1rem', fontWeight: '900', color: '#fbbf24' }}>💰 {userPoints.toLocaleString()}</span>
              <div style={{ width: '1px', height: '18px', background: 'rgba(255,255,255,0.1)' }}></div>
              <div style={{ width: '30px', height: '30px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', position: 'relative', overflow: 'hidden' }}>
                <div style={{ width: '100%', height: f"{progress}%", background: '#60a5fa', position: 'absolute', bottom: 0 }}></div>
                <span style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontSize: '0.65rem', fontWeight: 'bold', color: '#fff', zIndex: 1 }}>{Math.round(progress)}%</span>
              </div>
            </div>

            <div style={{ 
              display: 'flex', alignItems: 'center', gap: '10px', 
              padding: '5px 12px 5px 6px', background: 'rgba(96, 165, 250, 0.1)', 
              borderRadius: '25px', border: '1px solid rgba(96, 165, 250, 0.2)',
              cursor: 'pointer'
            }} onClick={() => setShowMyPage(true)}>
              <div style={{ width: '34px', height: '34px', borderRadius: '50%', border: '1.5px solid #60a5fa', overflow: 'hidden' }}>
                <RenderAvatar avatar={userAvatar} />
              </div>
              <span style={{ fontSize: '0.85rem', color: '#fff', fontWeight: '700' }}>{currentUser}</span>
            </div>

            <button onClick={() => {
              setIsAuthenticated(false);
              setCurrentUser('');
              localStorage.removeItem('routine_auth');
              localStorage.removeItem('routine_user');
            }} style={{
              background: 'rgba(239, 68, 68, 0.1)', color: '#fca5a5', border: '1px solid rgba(239, 68, 68, 0.2)',
              padding: '8px 14px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 'bold'
            }}>🚪 나가기</button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="nav-btn-opt active" style={{ 
            flex: 1, padding: '10px', borderRadius: '12px', 
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', 
            color: '#fff', fontWeight: '700', fontSize: '0.85rem',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' 
          }}>
            📅 일정 캘린더
          </button>
          <button className="nav-btn-opt" onClick={() => setShowSuccessRoom(true)} style={{ 
            flex: 1, padding: '10px', borderRadius: '12px', 
            background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', 
            color: '#94a3b8', fontWeight: '600', fontSize: '0.85rem',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' 
          }}>
            🏛️ 성공의 방
          </button>
          <button className="nav-btn-opt" onClick={() => setShowMyPage(true)} style={{ 
            flex: 1, padding: '10px', borderRadius: '12px', 
            background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', 
            color: '#94a3b8', fontWeight: '600', fontSize: '0.85rem',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' 
          }}>
            👤 MY
          </button>
        </div>
      </div>

      <div style={{ padding: '20px 15px' }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 15px', background: 'rgba(255,255,255,0.02)', borderRadius: '18px',
          border: '1px solid rgba(255,255,255,0.04)', marginBottom: '20px'
        }}>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button className="btn-sq-nav" onClick={() => viewMode === 'week' ? moveWeek(-1) : moveMonth(-1)}>◀</button>
            <button className="btn-rect-nav" onClick={resetToToday}>오늘</button>
            <button className="btn-sq-nav" onClick={() => viewMode === 'week' ? moveWeek(1) : moveMonth(1)}>▶</button>
          </div>
          <span style={{ fontWeight: '800', fontSize: '1rem', color: '#e2e8f0', letterSpacing: '-0.3px' }}>{currentHeader}</span>
          <select 
            value={viewMode} 
            onChange={(e) => setViewMode(e.target.value)}
            style={{ 
              background: '#1e293b', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', 
              borderRadius: '10px', fontSize: '0.8rem', padding: '6px 10px' 
            }}
          >
            <option value="week">주간</option>
            <option value="month">월간</option>
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {displayDays.map(({ dayIndex, date, dateStr }) => {
            const dayTodos = getScheduleTodosByDay(dayIndex, dateStr);
            const isToday = dateStr === todayStr;
            const color = dayColors[dayIndex];
            const month = date.getMonth() + 1;
            const day = date.getDate();

            return (
              <div
                key={dateStr}
                style={{
                  borderRadius: '20px',
                  background: isToday ? 'rgba(99, 102, 241, 0.04)' : 'rgba(255,255,255,0.01)',
                  border: isToday ? '1.5px solid rgba(99,102,241,0.3)' : '1px solid rgba(255,255,255,0.04)',
                  overflow: 'hidden'
                }}
              >
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px',
                  background: isToday ? 'rgba(99, 102, 241, 0.08)' : 'rgba(255,255,255,0.02)',
                  borderBottom: dayTodos.length > 0 ? '1px solid rgba(255,255,255,0.03)' : 'none'
                }}>
                  <span style={{
                    width: '34px', height: '34px', borderRadius: '10px',
                    background: isToday ? color : 'rgba(255,255,255,0.06)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.9rem', fontWeight: '900', color: isToday ? '#fff' : color,
                    flexShrink: 0
                  }}>
                    {dayNames[dayIndex]}
                  </span>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ color: isToday ? '#fff' : '#cbd5e1', fontSize: '0.95rem', fontWeight: '700' }}>
                      {month}월 {day}일
                      {isToday && <span style={{ marginLeft: '8px', fontSize: '0.65rem', background: '#4f46e5', color: '#fff', padding: '2px 8px', borderRadius: '20px', fontWeight: '800' }}>TODAY</span>}
                    </span>
                  </div>
                  <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: '#64748b', fontWeight: '600' }}>
                    {dayTodos.length}개 일정
                  </span>
                </div>

                {dayTodos.length > 0 && (
                  <div style={{ padding: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {dayTodos.map(todo => (
                      <div
                        key={todo.id}
                        onClick={() => { closeCalendar(); startEdit(todo); }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 15px',
                          borderRadius: '14px', background: 'rgba(255,255,255,0.02)',
                          borderLeft: f"4px solid {color}",
                          cursor: 'pointer'
                        }}
                      >
                        <span style={{ fontSize: '0.75rem', color: color, fontWeight: '800', minWidth: '60px' }}>
                          {formatTime(todo.time)}
                        </span>
                        <span style={{ fontSize: '0.9rem', color: '#f1f5f9', flex: 1, fontWeight: '500' }}>
                          {todo.text}
                        </span>
                        <span style={{ fontSize: '0.8rem', opacity: 0.4 }}>✏️</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};"""

# Find Start and End lines
start_idx = -1
end_idx = -1

for i, line in enumerate(lines):
    if 'const ScheduleOnlyCalendar =' in line:
        start_idx = i
    if start_idx != -1 and line.strip() == '};' and i > start_idx:
        # Check if it's likely the end of the component
        if i < start_idx + 300: # Typical size
            end_idx = i
            break

if start_idx != -1 and end_idx != -1:
    lines[start_idx:end_idx+1] = [new_content + '\n']
    with open('src/App.jsx', 'w', encoding='utf-8') as f:
        f.writelines(lines)
    print(f"Successfully replaced from line {start_idx+1} to {end_idx+1}")
else:
    print(f"Failed to find indices: start={start_idx}, end={end_idx}")
    sys.exit(1)
