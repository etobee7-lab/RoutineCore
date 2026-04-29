import React, { useState, useEffect } from 'react';
import RenderAvatar from './RenderAvatar';

const ScheduleOnlyCalendar = ({ 
  todos, 
  completions, 
  startEdit, 
  closeCalendar, 
  toggleTodo, 
  userPoints, 
  progress, 
  userAvatar, 
  currentUser, 
  setShowSuccessRoom, 
  setShowMyPage, 
  setShowDailyChart, 
  handleInstallClick, 
  showInstallBtn, 
  setIsAuthenticated, 
  setCurrentUser 
}) => {
  const [baseDate, setBaseDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('week');
  const [filterMode, setFilterMode] = useState('all'); // 'all' | 'completed' | 'incomplete' 

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

  useEffect(() => {
    // [남개발 부장] 일정 캘린더 진입 시 오늘 날짜로 자동 스크롤!
    setTimeout(() => {
      const todayEl = document.getElementById('calendar-today');
      if (todayEl) {
        todayEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  }, []);

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
    }).filter(todo => {
      if (filterMode === 'all') return true;
      if (filterMode === 'completed') return todo.completed;
      if (filterMode === 'incomplete') return !todo.completed;
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
    <div className="calendar-mobile-optimized" style={{ 
      display: 'flex', flexDirection: 'column', gap: '0', 
      background: 'linear-gradient(to bottom, #0f172a, #1e293b)', 
      minHeight: '100vh', paddingBottom: '120px',
      position: 'relative', zIndex: 1
    }}>
      <style>{`
        @media (max-width: 600px) {
          .premium-header-sticky { padding: 15px 15px 12px 15px !important; }
          .brand-logo h1 { font-size: 1.1rem !important; }
          .brand-logo span { font-size: 0.9rem !important; }
          .brand-logo img { width: 34px !important; height: 34px !important; }
          .points-pill { padding: 5px 10px !important; gap: 8px !important; border-radius: 14px !important; }
          .points-pill span { font-size: 0.9rem !important; }
          .points-pill .progress-mini { width: 25px !important; height: 30px !important; }
          .user-profile-pill { padding: 4px 10px 4px 4px !important; border-radius: 20px !important; }
          .user-profile-pill span { display: none !important; }
          .user-profile-pill div { width: 32px !important; height: 32px !important; }
          .nav-btn-premium { padding: 10px !important; font-size: 0.8rem !important; border-radius: 14px !important; }
          .nav-btn-premium span { font-size: 1rem !important; }
          .day-card-premium { border-radius: 20px !important; }
          .day-header-premium { padding: 12px 15px !important; }
          .day-header-premium .date-text { font-size: 0.95rem !important; }
          .todo-item-premium { padding: 12px 15px !important; border-radius: 14px !important; }
          .todo-item-premium span { font-size: 0.85rem !important; }
          .exit-btn { padding: 8px 12px !important; font-size: 1rem !important; }
          .nav-arrow, .nav-today-btn { height: 36px !important; width: 36px !important; font-size: 0.8rem !important; }
          .nav-today-btn { width: auto !important; padding: 0 12px !important; }
          .header-title-mobile { font-size: 0.95rem !important; }
        }
      `}</style>
      
      <div className="premium-header-sticky" style={{
        background: 'rgba(15, 23, 42, 0.9)',
        padding: '12px 15px 10px 15px', borderRadius: '0 0 20px 20px',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
        position: 'sticky', top: 0, zIndex: 10, backdropFilter: 'blur(20px)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <div className="brand-logo" onClick={closeCalendar} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
            <img src="/logo512.png" alt="Logo" style={{ width: '30px', height: '30px', filter: 'drop-shadow(0 0 8px rgba(96, 165, 250, 0.4))' }} />
            <div style={{ marginLeft: '8px' }}>
              <h1 style={{ fontSize: '1.05rem', margin: 0, color: '#fff', fontWeight: '900', letterSpacing: '-0.8px', lineHeight: 1.1 }}>Routine</h1>
              <span style={{ fontSize: '0.85rem', color: '#60a5fa', fontWeight: '800' }}>Core</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="points-pill" style={{ 
              display: 'flex', alignItems: 'center', gap: '8px', 
              padding: '5px 10px', background: 'rgba(255,255,255,0.04)', 
              borderRadius: '14px', border: '1px solid rgba(255,255,255,0.08)' 
            }}>
              <span style={{ fontSize: '0.9rem', fontWeight: '900', color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '4px' }}>💰 {userPoints.toLocaleString()}</span>
              <div style={{ width: '1px', height: '16px', background: 'rgba(255,255,255,0.1)' }}></div>
              <div className="progress-mini" style={{ width: '22px', height: '26px', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', position: 'relative', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
                <div style={{ width: '100%', height: `${progress}%`, background: 'linear-gradient(to top, #3b82f6, #60a5fa)', position: 'absolute', bottom: 0, transition: 'height 0.8s' }}></div>
              </div>
            </div>

            <div className="user-profile-pill" style={{ 
              display: 'flex', alignItems: 'center', gap: '6px', 
              padding: '4px 8px 4px 4px', background: 'rgba(96, 165, 250, 0.1)', 
              borderRadius: '24px', border: '1px solid rgba(96, 165, 250, 0.2)',
              cursor: 'pointer'
            }} onClick={() => setShowMyPage(true)}>
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', border: '2px solid #60a5fa', padding: '1px', background: 'rgba(96, 165, 250, 0.1)', overflow: 'hidden' }}>
                <RenderAvatar avatar={userAvatar} />
              </div>
              <span style={{ fontSize: '0.85rem', color: '#fff', fontWeight: '700' }}>{currentUser}</span>
            </div>

            <button className="exit-btn" onClick={() => {
              setIsAuthenticated(false);
              setCurrentUser('');
              localStorage.removeItem('routine_auth');
              localStorage.removeItem('routine_user');
            }} style={{
              background: 'rgba(239, 68, 68, 0.12)', color: '#fca5a5', border: '1px solid rgba(239, 68, 68, 0.25)',
              padding: '7px 10px', borderRadius: '14px', fontSize: '0.85rem', fontWeight: '800'
            }}>🚪</button>
          </div>
        </div>

        <div className="header-action-grid">
          <button className="nav-btn calendar active" onClick={closeCalendar}>📝 일정등록</button>
          <button className="nav-btn room" onClick={() => { setShowMyPage(false); setShowSuccessRoom(true); }}>🏛️ 성공의 방</button>
          <button className="nav-btn my" onClick={() => { setShowSuccessRoom(false); setShowMyPage(true); }}>👤 MY</button>
        </div>
      </div>

      <div style={{ padding: '15px 14px' }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: '16px',
          border: '1px solid rgba(255,255,255,0.06)', marginBottom: '12px'
        }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="nav-arrow" style={{ width: '34px', height: '34px', borderRadius: '10px' }} onClick={() => viewMode === 'week' ? moveWeek(-1) : moveMonth(-1)}>◀</button>
            <button className="nav-today-btn" style={{ padding: '0 12px', height: '34px', borderRadius: '10px', fontSize: '0.8rem', fontWeight: '800' }} onClick={resetToToday}>오늘</button>
            <button className="nav-arrow" style={{ width: '34px', height: '34px', borderRadius: '10px' }} onClick={() => viewMode === 'week' ? moveWeek(1) : moveMonth(1)}>▶</button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button onClick={() => setFilterMode('all')} style={{
              padding: '5px 10px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: '800',
              background: filterMode === 'all' ? 'rgba(99, 102, 241, 0.3)' : 'rgba(255,255,255,0.05)',
              border: filterMode === 'all' ? '1px solid rgba(99, 102, 241, 0.5)' : '1px solid rgba(255,255,255,0.1)',
              color: filterMode === 'all' ? '#fff' : '#94a3b8', cursor: 'pointer'
            }}>전체</button>
            <button onClick={() => setFilterMode('incomplete')} style={{
              padding: '5px 10px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: '800',
              background: filterMode === 'incomplete' ? 'rgba(251, 191, 36, 0.3)' : 'rgba(255,255,255,0.05)',
              border: filterMode === 'incomplete' ? '1px solid rgba(251, 191, 36, 0.5)' : '1px solid rgba(255,255,255,0.1)',
              color: filterMode === 'incomplete' ? '#fff' : '#94a3b8', cursor: 'pointer'
            }}>미완료</button>
            <button onClick={() => setFilterMode('completed')} style={{
              padding: '5px 10px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: '800',
              background: filterMode === 'completed' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(255,255,255,0.05)',
              border: filterMode === 'completed' ? '1px solid rgba(34, 197, 94, 0.5)' : '1px solid rgba(255,255,255,0.1)',
              color: filterMode === 'completed' ? '#fff' : '#94a3b8', cursor: 'pointer'
            }}>완료</button>
          </div>
        </div>
        <div style={{ marginBottom: '10px', textAlign: 'center' }}>
          <span className="header-title-mobile" style={{ fontWeight: '900', fontSize: '0.95rem', color: '#fff', letterSpacing: '-0.5px' }}>{currentHeader}</span>
        </div>

      <div className="calendar-grid-premium" style={{ 
        padding: '10px', 
        display: 'grid', 
        gridTemplateColumns: 'repeat(3, 1fr)', 
        gap: '12px',
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
        <style>{`
          .calendar-grid-premium {
            display: grid !important;
            grid-template-columns: repeat(3, 1fr) !important;
          }
          @media (max-width: 900px) {
            .calendar-grid-premium {
              grid-template-columns: repeat(2, 1fr) !important;
            }
          }
          @media (max-width: 600px) {
            .calendar-grid-premium {
              grid-template-columns: 1fr !important;
            }
          }
          .day-column-premium {
            display: flex;
            flex-direction: column;
            gap: 12px;
          }
          .day-card-premium {
            min-height: 150px;
            display: flex;
            flex-direction: column;
          }
          .todo-list-scroll {
            flex: 1;
            overflow-y: auto;
            max-height: 400px;
            scrollbar-width: thin;
            scrollbar-color: rgba(255,255,255,0.1) transparent;
          }
          .todo-list-scroll::-webkit-scrollbar { width: 4px; }
          .todo-list-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
        `}</style>

        {displayDays.map(({ dayIndex, date, dateStr }) => {
          const dayTodos = getScheduleTodosByDay(dayIndex, dateStr);
          const isToday = dateStr === todayStr;
          const color = dayColors[dayIndex];
          const month = date.getMonth() + 1;
          const day = date.getDate();

          return (
            <div
              key={dateStr}
              id={isToday ? 'calendar-today' : undefined}
              className="day-card-premium"
              style={{
                borderRadius: '20px',
                background: isToday ? 'rgba(99, 102, 241, 0.08)' : 'rgba(255,255,255,0.02)',
                border: isToday ? '1px solid rgba(99,102,241,0.4)' : '1px solid rgba(255,255,255,0.06)',
                overflow: 'hidden',
                boxShadow: isToday ? '0 15px 40px rgba(0,0,0,0.4)' : 'none',
                transition: 'all 0.3s ease'
              }}
            >
              <div className="day-header-premium" style={{
                display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px',
                background: isToday ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255,255,255,0.04)',
                borderBottom: '1px solid rgba(255,255,255,0.05)'
              }}>
                <span style={{ width: '28px', height: '28px', borderRadius: '8px', background: isToday ? color : 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: '900', color: isToday ? '#fff' : color }}>
                  {dayNames[dayIndex]}
                </span>
                <span className="date-text" style={{ color: isToday ? '#fff' : '#cbd5e1', fontSize: '0.85rem', fontWeight: '800' }}>
                  {month}/{day}
                  {isToday && <span style={{ marginLeft: '6px', fontSize: '0.6rem', color: '#6366f1', fontWeight: '900' }}>●</span>}
                </span>
                <span style={{ marginLeft: 'auto', fontSize: '0.7rem', color: '#64748b', fontWeight: '700' }}>{dayTodos.length}</span>
              </div>

              <div className="todo-list-scroll" style={{ padding: '8px' }}>
                {dayTodos.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {dayTodos.map(todo => (
                      <div
                        key={todo.id}
                        className="todo-item-premium"
                        onClick={() => { closeCalendar(); startEdit(todo); }}
                        style={{
                          display: 'flex', flexDirection: 'column', gap: '2px',
                          padding: '4px 8px', borderRadius: '8px',
                          background: todo.completed ? 'rgba(34, 197, 94, 0.05)' : 'rgba(255,255,255,0.02)',
                          borderLeft: `3px solid ${todo.completed ? '#22c55e' : color}`,
                          cursor: 'pointer', transition: 'all 0.1s',
                          opacity: todo.completed ? 0.6 : 1,
                          marginBottom: '2px'
                        }}
                      >
                        {/* 상단: 체크박스와 시간 (초소형) */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleTodo(todo, dateStr);
                            }}
                            style={{
                              width: '14px', height: '14px', minWidth: '14px',
                              borderRadius: '4px',
                              border: `1.5px solid ${completions.some(c => String(c.todo_id) === String(todo.id) && c.date === dateStr) ? '#22c55e' : color}`,
                              background: completions.some(c => String(c.todo_id) === String(todo.id) && c.date === dateStr) ? '#22c55e' : 'transparent',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              cursor: 'pointer'
                            }}
                          >
                            {completions.some(c => String(c.todo_id) === String(todo.id) && c.date === dateStr) && <span style={{ color: '#fff', fontSize: '0.6rem', fontWeight: '900' }}>✓</span>}
                          </div>
                          <span style={{ 
                            fontSize: '0.65rem', 
                            color: completions.some(c => String(c.todo_id) === String(todo.id) && c.date === dateStr) ? '#64748b' : color, 
                            fontWeight: '800',
                            letterSpacing: '-0.2px'
                          }}>
                            {formatTime(todo.time)}
                          </span>
                        </div>

                        {/* 하단: 일정 내용 (초소형) */}
                        <div style={{ paddingLeft: '0' }}>
                          <span style={{ 
                            fontSize: '0.75rem', 
                            color: completions.some(c => String(c.todo_id) === String(todo.id) && c.date === dateStr) ? '#64748b' : '#f1f5f9', 
                            fontWeight: '600', 
                            textDecoration: completions.some(c => String(c.todo_id) === String(todo.id) && c.date === dateStr) ? 'line-through' : 'none', 
                            display: 'block',
                            lineHeight: '1.2',
                            wordBreak: 'break-all',
                            letterSpacing: '-0.3px'
                          }}>
                            {todo.text}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '20px 0', color: 'rgba(255,255,255,0.05)', fontSize: '0.7rem' }}>일정 없음</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  </div>
  );
};

export default ScheduleOnlyCalendar;
