import { useState, useEffect, useRef } from 'react'
import * as XLSX from 'xlsx'
import './App.css'

import RenderAvatar from './components/RenderAvatar'
import ScrollPicker from './components/ScrollPicker'
import DailyScheduleChart from './components/DailyScheduleChart'
import AchievementHeatmap from './components/AchievementHeatmap'
import ScheduleOnlyCalendar from './components/ScheduleOnlyCalendar'

import { API_URLS, fetchAPI } from './services/api'
import { useAuth } from './hooks/useAuth'
import { useTodos } from './hooks/useTodos'
import { usePWA } from './hooks/usePWA'
import { useAlarm, ALARM_SOUNDS } from './hooks/useAlarm'
import { useNotifications } from './hooks/useNotifications'


const AVATARS = [
  '/avatar_m2.png', '/avatar_m3.png', '/avatar_m5.png', '/avatar_m6.png', '/avatar_m8.png', '/avatar_m9.png',
  '/avatar_f1.png', '/avatar_f3.png', '/avatar_f4.png', '/avatar_f6.png',
  '😊', '😎', '🦁', '🐯', '🦊', '🐻', '🐼', '🐨', '🐸', '🌟', '🔥', '💎', '🚀', '🎯', '👑', '🧠', '💪', '🌈', '🍀', '⭐'
];



const DAYS_OF_WEEK = ['일', '월', '화', '수', '목', '금', '토'];


// ===== 성공의 방 아이템 정의 =====
const SUCCESS_ITEMS = [
  { id: 'pen', name: '고급만년필', icon: '✒️', cost: 50 },
  { id: 'wine', name: '빈티지와인', icon: '🍷', cost: 100 },
  { id: 'wallet', name: '지갑', icon: '👛', cost: 150 },
  { id: 'giftcard', name: '기프트카드', icon: '💳', cost: 200 },
  { id: 'medal', name: '훈장', icon: '🥇', cost: 300 },
  { id: 'award', name: '상장', icon: '🏆', cost: 500 },
  { id: 'orchid', name: '축하란', icon: '🪴', cost: 400 },
];



// [남개발 부장] 주간 일정 관리를 위한 주차 계산 유틸리티 (월요일 기준)
const getWeekStr = () => {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const day = now.getDay();
  const diff = now.getDate() - (day === 0 ? 6 : day - 1);
  const monday = new Date(now.setDate(diff));
  return toStdDateStr(monday);
};

// [남개발 부장] 포인트 기반 성취 등급 추출 (3번 제안)
const getLevelInfo = (points) => {
  if (points < 1000) return { title: '루틴의 시작', color: '#94a3b8' };
  if (points < 5000) return { title: '루틴의 성장', color: '#6366f1' };
  if (points < 15000) return { title: '루틴의 정착', color: '#a855f7' };
  if (points < 30000) return { title: '고요한 지배자', color: '#f43f5e' };
  if (points < 60000) return { title: '시간의 설계자', color: '#fbbf24' };
  return { title: '자정의 전설', color: '#f59e0b' };
};

const formatTime = (timeStr) => {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':').map(Number);
  const ampm = h < 12 ? '오전' : '오후';
  const h12 = h % 12 || 12;
  return `${ampm} ${h12}:${String(m).padStart(2, '0')}`;
};





// [남개발 부장] 날짜 비교를 위한 표준 포맷 도우미 (YYYY-MM-DD)
const toStdDateStr = (d) => d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` : '';

function App() {
  const { 
    currentUser, setCurrentUser, isAuthenticated, setIsAuthenticated, 
    userAvatar, setUserAvatar, userPoints, setUserPoints, ownedItems, setOwnedItems,
    fetchProfile, login, register, logout 
  } = useAuth();

  const { 
    todos, setTodos, completions, setCompletions, heatmapData, affirmations, setAffirmations,
    fetchTodos, fetchHeatmapData, fetchAffirmations,
    lastAddedId, setLastAddedId, togglingIds, updateTogglingIds
  } = useTodos(currentUser, isAuthenticated);

  const { showInstallBtn, handleInstallClick } = usePWA();
  const { voices, speakText, playAlarmSound } = useAlarm();
  const { subscribeUserToPush } = useNotifications();

  const togglingIdsRef = useRef(new Set());

  // 현재 시간 기준 기본값 계산 함수
  const getDefaultTime = () => {
    const now = new Date();
    const future = new Date(now.getTime() + 5 * 60 * 1000); // 5분 뒤
    const m = future.getMinutes();
    const roundedM = Math.round(m / 5) * 5; // 5분 단위 반올림
    if (roundedM >= 60) {
      future.setHours(future.getHours() + 1);
      future.setMinutes(0);
    } else {
      future.setMinutes(roundedM);
    }

    let h = future.getHours();
    const ampmLabel = h < 12 ? '오전' : '오후';
    const displayH = h % 12 || 12;
    return {
      ampm: ampmLabel,
      hour: String(displayH).padStart(2, '0'),
      minute: String(future.getMinutes()).padStart(2, '0')
    };
  };

  const defaultT = getDefaultTime();

  const [inputValue, setInputValue] = useState('')
  const [ampm, setAmpm] = useState(defaultT.ampm)
  const [hour, setHour] = useState(defaultT.hour)
  const [minute, setMinute] = useState(defaultT.minute)
  const [selectedDays, setSelectedDays] = useState(['월', '화', '수', '목', '금']) // 루틴 기본 요일: 월화수목금
  const [excludeHolidays, setExcludeHolidays] = useState(false) // 당일 요일 중심이므로 기본 해제
  const [scheduleMode, setScheduleMode] = useState('routine') // 루틴 모드 기본
  const [listFilter, setListFilter] = useState('schedule') // 'all' | 'routine' | 'schedule'
  const [searchQuery, setSearchQuery] = useState('') // 검색어
  const [isWeeklyView, setIsWeeklyView] = useState(false) // [NAM] Weekly Board Mode
  const [listSort, setListSort] = useState('asc') // 'asc' | 'desc'
  const [prevIsSchedule, setPrevIsSchedule] = useState(null) // 이전 입력값의 일정 여부 추적용
  const [allCandidates, setAllCandidates] = useState([]) // 주간 관리자용 전체 후보 리스트
  const [weeklySelectedIds, setWeeklySelectedIds] = useState(new Set()) // 주간 관리자 선택 IDs

  // [남개발 부장] 기간 선택 캘린더 엔진용 센서 장착!
  const [showCalendar, setShowCalendar] = useState(false); // 달력 노출 여부
  const todayStr = toStdDateStr(new Date());
  const [rangeStart, setRangeStart] = useState(todayStr);   // 시작일
  const [rangeEnd, setRangeEnd] = useState(todayStr);       // 종료일
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());

  // [남개발 부장] 스와이프 퀵 액션용 센서
  const [swipingId, setSwipingId] = useState(null);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const touchStartX = useRef(0);



  // [남개발 팀장] 지능형 모드 감지 엔진 (대표님 지시: 기본=일정, 루틴/메모는 키워드 필수)
  useEffect(() => {
    const text = inputValue.trim();
    if (!text) {
      setPrevIsSchedule(null);
      return;
    }

    // 1. 모드 판별 (대표님 지시: 기본=일정, 키워드 우선 분기)
    const isRoutine = text.includes('루틴');
    const isMemo = text.includes('메모');
    const isSchedule = text.includes('일정');

    if (isRoutine) {
      setScheduleMode('routine');
    } else if (isMemo) {
      setScheduleMode('memo');
    } else if (isSchedule) {
      setScheduleMode('schedule');
    } else {
      setScheduleMode('schedule'); // [남개발 팀장] 아무것도 없으면 기본은 일정!
    }

    setPrevIsSchedule(true); // 기본이 일정이므로 true로 유지
  }, [inputValue]);


  const [editingId, setEditingId] = useState(null)
  const [editValue, setEditValue] = useState('')
  const [editDays, setEditDays] = useState([])
  const [editExcludeHolidays, setEditExcludeHolidays] = useState(false)
  const [editAmpm, setEditAmpm] = useState('오전')
  const [editHour, setEditHour] = useState('09')
  const [editMinute, setEditMinute] = useState('00')

  // [남개발 팀장] [편집 모드 전용] 실시간 시간 감지 엔진 (7시 13분 등 대응)
  useEffect(() => {
    const text = editValue.trim();
    if (!text || editingId === null) return;

    // [남개발 팀장] [편집 모드 전용] 모드 판별 (루틴/일정/메모)
    const isRoutine = text.includes('루틴');
    const isMemo = text.includes('메모');
    const isSchedule = text.includes('일정');

    if (isRoutine) {
      setScheduleMode('routine');
    } else if (isMemo) {
      setScheduleMode('memo');
    } else if (isSchedule) {
      setScheduleMode('schedule');
    }
    // 편집 모드에서는 기존 모드를 존중하되 키워드 발견 시에만 변경하도록 유지

    // 1. 오전/오후 감지
    if (text.includes('오후') || text.includes('점심') || text.includes('저녁') || text.includes('밤')) {
      setEditAmpm('오후');
    } else if (text.includes('오전') || text.includes('아침') || text.includes('새벽')) {
      setEditAmpm('오전');
    }

    // 2. 시간 감지 (7시, 11시 등)
    const hMatch = text.match(/(\d+)\s*시/);
    if (hMatch) {
      const hInt = parseInt(hMatch[1]);
      const displayH = String(hInt > 12 ? hInt - 12 : hInt).padStart(2, '0');
      if (hInt >= 12) setEditAmpm('오후');
      setEditHour(displayH);
    } else {
      const korNumbers = { '한': '01', '두': '02', '세': '03', '네': '04', '다섯': '05', '여섯': '06', '일곱': '07', '여덟': '08', '아홉': '09', '열': '10', '열한': '11', '열두': '12' };
      for (let [key, val] of Object.entries(korNumbers)) {
        if (text.includes(key + '시') || text.includes(key + ' 시')) {
          setEditHour(val);
          break;
        }
      }
    }

    // 3. 분 감지 (7시 13분 등 정밀 감지)
    const mMatch = text.match(/(\d+)\s*분/);
    const mRawMatch = text.match(/시\s*(\d+)/);
    if (mMatch) {
      setEditMinute(String(parseInt(mMatch[1]) % 60).padStart(2, '0'));
    } else if (mRawMatch) {
      setEditMinute(String(parseInt(mRawMatch[1]) % 60).padStart(2, '0'));
    } else if (text.includes('반')) {
      setEditMinute('30');
    }
  }, [editValue, editingId]);
  const [alertPreference, setAlertPreference] = useState(localStorage.getItem('alertPreference') || 'both')
  const [alarmSound, setAlarmSound] = useState(localStorage.getItem('alarmSound') || 'chime')

  useEffect(() => {
    localStorage.setItem('alertPreference', alertPreference);
  }, [alertPreference]);

  useEffect(() => {
    localStorage.setItem('alarmSound', alarmSound);
  }, [alarmSound]);


  const [loginId, setLoginId] = useState('');
  const [loginPw, setLoginPw] = useState('');
  const [isSignUpMode, setIsSignUpMode] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [loginSuccess, setLoginSuccess] = useState('');
  const [signUpName, setSignUpName] = useState('');
  const [signUpConfirmPw, setSignUpConfirmPw] = useState('');
  const [backendUrlInput, setBackendUrlInput] = useState(localStorage.getItem('backendUrl') || '');

  const [alarmFilter, setAlarmFilter] = useState(() => localStorage.getItem('alarmFilter') || 'all');

  useEffect(() => { localStorage.setItem('alarmFilter', alarmFilter); }, [alarmFilter]);

  const [useVoiceAlarm, setUseVoiceAlarm] = useState(() => {
    try {
      const saved = localStorage.getItem('useVoiceAlarm');
      if (saved === null) {
        return currentUser && currentUser.toLowerCase().startsWith('master');
      }
      return saved === 'true';
    } catch (e) {
      return false; // localStorage 접근 불가 환경(시크릿 모드 등) 대응
    }
  });
  const [selectedVoiceName, setSelectedVoiceName] = useState(localStorage.getItem('selectedVoiceName') || '');

  const [pendingAlerts, setPendingAlerts] = useState([])
  const currentAlert = pendingAlerts.length > 0 ? pendingAlerts[0] : null;
  const [notifiedIds, setNotifiedIds] = useState(() => {
    const saved = localStorage.getItem('notifiedIds');
    if (saved) {
      try {
        const { date, ids } = JSON.parse(saved);
        if (date === new Date().toLocaleDateString()) {
          return new Set(ids);
        }
      } catch (e) { console.error(e); }
    }
    return new Set();
  });

  const notifiedIdsRef = useRef(new Set());
  useEffect(() => { notifiedIdsRef.current = notifiedIds; }, [notifiedIds]);

  useEffect(() => {
    const data = {
      date: new Date().toLocaleDateString(),
      ids: Array.from(notifiedIds)
    };
    localStorage.setItem('notifiedIds', JSON.stringify(data));
  }, [notifiedIds]);
  const [affirmationInput, setAffirmationInput] = useState('')
  const [showAffirmations, setShowAffirmations] = useState(false)
  const [affirmationTypeTab, setAffirmationTypeTab] = useState('positive')
  const [editingAffirmationId, setEditingAffirmationId] = useState(null)
  const [editingAffirmationValue, setEditingAffirmationValue] = useState('')
  const [selectedAfId, setSelectedAfId] = useState(null)
  const [showDailyChart, setShowDailyChart] = useState(false)
  const [showAdminPanel, setShowAdminPanel] = useState(false)
  const [showScheduleCalendar, setShowScheduleCalendar] = useState(false)

  // 마이페이지 관련 state
  const [showMyPage, setShowMyPage] = useState(false);
  const [myPageTab, setMyPageTab] = useState('alarm'); // 'alarm' | 'password' | 'avatar'
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmNewPw, setConfirmNewPw] = useState('');
  const [pwMessage, setPwMessage] = useState('');
  const [pwError, setPwError] = useState('');


  const [historySearchTerm, setHistorySearchTerm] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatCurrentTime = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const dow = DAYS_OF_WEEK[date.getDay()];
    const hh = date.getHours();
    const ampmText = hh < 12 ? '오전' : '오후';
    const h12 = hh % 12 || 12;
    const mm = String(date.getMinutes()).padStart(2, '0');
    const ss = String(date.getSeconds()).padStart(2, '0');
    return `${y}년 ${m}월 ${d}일 (${dow}) ${ampmText} ${h12}:${mm}:${ss}`;
  };

  // [남개발 부장] 매주 월요일 아침 안내 시스템
  useEffect(() => {
    if (!isAuthenticated) return;
    const now = new Date();
    if (now.getDay() === 1 && now.getHours() < 12) { // 월요일 오전
      const lastNotice = localStorage.getItem('lastWeeklyNotice');
      if (lastNotice !== getWeekStr()) {
        setTimeout(() => {
          alert("📋 새로운 한 주가 시작되었습니다!\n마이페이지 '주간 일정 관리'에서 이번 주에 수행할 일들을 선발해 주세요.");
          localStorage.setItem('lastWeeklyNotice', getWeekStr());
        }, 2000);
      }
    }
  }, [isAuthenticated]);

  const [isListening, setIsListening] = useState(false); // 음성 인식 상태
  const [showSuccessRoom, setShowSuccessRoom] = useState(false); // 성공의 방 모달

  const todosRef = useRef([]);
  useEffect(() => { todosRef.current = todos; }, [todos]);



  // [남개발 부장] 신규 추가 시 자동 스크롤 추적 시스템
  useEffect(() => {
    if (lastAddedId) {
      setTimeout(() => {
        const el = document.getElementById(`todo-${lastAddedId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          // 2초 뒤에 추적 아이디 초기화 (깜빡임 애니메이션 종료 용도)
          setTimeout(() => setLastAddedId(null), 2500);
        }
      }, 150);
    }
  }, [todos, lastAddedId]);

  // [남개발 부장] 수정 모드 진입 시 해당 위치로 정밀 자동 스크롤 (대표님 지시: 캘린더 연동 강화)
  useEffect(() => {
    if (editingId) {
      // 리스트가 렌더링될 시간을 줍니다 (필터링 등으로 인해 새로 그려질 수 있음)
      setTimeout(() => {
        const el = document.getElementById(`todo-${editingId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 300);
    }
  }, [editingId]);

  // [남개발 부장] 기간 선택 시 해당하는 요일들을 자동으로 추출하는 지능형 도우미
  const getDaysInRange = (start, end) => {
    if (!start || !end) return [];
    const s = new Date(start);
    const e = new Date(end);
    const days = new Set();
    const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];

    let curr = new Date(s);
    while (curr <= e) {
      days.add(DAY_NAMES[curr.getDay()]);
      curr.setDate(curr.getDate() + 1);
      if (days.size === 7) break; // 모든 요일이 다 차면 루프 조기 종료
    }
    return Array.from(days);
  };

  // [남개발 부장] 요일 배열을 바탕으로 현재 주차의 날짜 범위를 계산하는 순수 도우미 함수
  const getRangeFromDays = (days) => {
    if (!days || days.length === 0) return { start: null, end: null };
    const DAY_MAP = { '일': 6, '월': 0, '화': 1, '수': 2, '목': 3, '금': 4, '토': 5 }; // 월요일 기준 인덱스 (Date.getDay()와 다름)
    
    // 유효한 요일만 필터링하고 정렬
    const indices = days.map(d => DAY_MAP[d]).filter(idx => idx !== undefined).sort((a, b) => a - b);
    if (indices.length === 0) return { start: null, end: null };

    const minIdx = indices[0];
    const maxIdx = indices[indices.length - 1];

    const now = new Date();
    const day = now.getDay();
    // Monday of current week calculation
    const diff = now.getDate() - (day === 0 ? 6 : day - 1);
    const monday = new Date(now.setDate(diff));
    monday.setHours(0, 0, 0, 0);

    const startDate = new Date(monday);
    startDate.setDate(monday.getDate() + minIdx);
    
    const endDate = new Date(monday);
    endDate.setDate(monday.getDate() + maxIdx);

    return {
      start: toStdDateStr(startDate),
      end: toStdDateStr(endDate)
    };
  };

  // [남개발 부장] 요일 선택 시 현재 주차 내의 해당 날짜 범위로 캘린더 자동 동기화 (대표님 지시)
  const syncDaysToRange = (days, setStart, setEnd) => {
    const { start, end } = getRangeFromDays(days);
    setStart(start);
    setEnd(end);
  };



  // [남개발 부장] 캘린더 오픈 시 기간이 없으면 현재 선택된 요일에 맞춰 자동 계산!
  const handleOpenCalendar = () => {
    if (!rangeStart) {
      const { start, end } = getRangeFromDays(editingId ? editDays : selectedDays);
      if (start) {
        setRangeStart(start);
        setRangeEnd(end);
      } else {
        setRangeStart(toStdDateStr(new Date()));
      }
    }
    // [남개발 부장] 열 때 현재 선택된 시작일의 달로 이동하는 센스!
    if (rangeStart) {
      const d = new Date(rangeStart);
      setCalendarYear(d.getFullYear());
      setCalendarMonth(d.getMonth());
    } else {
      const now = new Date();
      setCalendarYear(now.getFullYear());
      setCalendarMonth(now.getMonth());
    }
    setShowCalendar(true);
  };

  const handlePrevMonth = () => {
    setCalendarMonth(prev => {
      if (prev === 0) {
        setCalendarYear(y => y - 1);
        return 11;
      }
      return prev - 1;
    });
  };

  const handleNextMonth = () => {
    setCalendarMonth(prev => {
      if (prev === 11) {
        setCalendarYear(y => y + 1);
        return 0;
      }
      return prev + 1;
    });
  };


  const fetchAllCandidates = async () => {
    if (!currentUser) return;
    try {
      const data = await fetchAPI(`${API_URLS.TODOS}?username=${currentUser}&includeInactive=true`);
      // 일정과 메모만 후보로 추출
      const candidates = data.filter(t => t.scheduleMode !== 'routine');
      setAllCandidates(candidates);

      // 현재 주차에 이미 활성화된 아이템들을 미리 체크
      const activeIds = candidates.filter(c => c.activatedWeek === getWeekStr()).map(c => c.id);
      setWeeklySelectedIds(new Set(activeIds));
    } catch (e) { console.error("Fetch candidates failed", e); }
  };

  const handleActivateWeekly = async () => {
    try {
      const ids = Array.from(weeklySelectedIds);
      await fetchAPI(API_URLS.ACTIVATE_WEEKLY, {
        method: 'POST',
        body: JSON.stringify({
          username: currentUser,
          ids,
          weekStr: getWeekStr()
        })
      });
      alert("이번 주 전술 지도가 성공적으로 배포되었습니다! 🛡️");
      fetchTodos();
    } catch (e) { 
      console.error("Activation failed", e);
      alert(e.message || "배포에 실패했습니다.");
    }
  };


  const handlePurchaseItem = async (item) => {
    if (userPoints < item.cost) {
      alert("포인트가 부족합니다!");
      return;
    }
    if (ownedItems.includes(item.id)) {
      alert("이미 보유 중인 아이템입니다.");
      return;
    }

    if (!window.confirm(`${item.name}을(를) ${item.cost}P에 구매하시겠습니까?`)) return;

    try {
      const data = await fetchAPI(API_URLS.PURCHASE_ITEM, {
        method: 'POST',
        body: JSON.stringify({ username: currentUser, itemId: item.id, cost: item.cost })
      });
      setOwnedItems(prev => [...prev, item.id]);
      setUserPoints(data.newPoints);
      alert("구매 완료! 성공의 방에 전시되었습니다.");
    } catch (e) {
      console.error("Purchase failed", e);
      alert(e.message || "구매 도중 오류가 발생했습니다.");
    }
  };

  const handleResetRoom = async () => {
    if (!window.confirm("성공의 방에 전시된 모든 아이템을 비우시겠습니까?\n(구매한 아이템은 삭제되지만 포인트는 환불되지 않습니다.)")) return;

    try {
      await fetchAPI(`${API_URLS.USER_ITEMS_RESET}?username=${currentUser}`, {
        method: 'DELETE'
      });
      setOwnedItems([]);
      alert("방이 초기화되었습니다. 다시 멋지게 꾸며보세요!");
    } catch (e) {
      console.error("Reset failed", e);
      alert(e.message || "초기화 도중 오류가 발생했습니다.");
    }
  };



  const handleChangePassword = async () => {
    setPwMessage(''); setPwError('');
    if (!currentPw || !newPw) { setPwError('모든 항목을 입력해주세요.'); return; }
    if (newPw.length < 4) { setPwError('새 비밀번호는 4자리 이상이어야 합니다.'); return; }
    if (newPw !== confirmNewPw) { setPwError('새 비밀번호가 일치하지 않습니다.'); return; }
    try {
      await fetchAPI(API_URLS.CHANGE_PW, {
        method: 'POST',
        body: JSON.stringify({ username: currentUser, currentPassword: currentPw, newPassword: newPw })
      });
      setPwMessage('비밀번호가 변경되었습니다! ✅');
      setCurrentPw(''); setNewPw(''); setConfirmNewPw('');
    } catch (e) { 
      setPwError(e.message || '변경에 실패했습니다.');
    }
  };

  const handleSelectAvatar = async (emoji) => {
    setUserAvatar(emoji);
    localStorage.setItem('routine_avatar', emoji);
    try {
      await fetchAPI(API_URLS.UPDATE_PROFILE, {
        method: 'POST',
        body: JSON.stringify({ username: currentUser, avatar: emoji })
      });
    } catch (e) { console.error('Avatar update failed', e); }
  };


  useEffect(() => {
    if (!isAuthenticated) return;
    
    // [남개발 부장] 로그인 즉시 입력기 시간을 현재 시각으로 동기화
    resetForm();
    
    fetchTodos();
    fetchAffirmations();
    fetchProfile();
    // [남개발 부장] 모바일/보안 규정 준수: 자동 푸시 요청 차단 (반드시 사용자 클릭 시에만 수행)
    // subscribeUserToPush(currentUser);

    const handleMessage = (event) => {
      if (event.data && event.data.type === 'REFRESH_TODOS') {
        fetchTodos();
      }
    };
    navigator.serviceWorker.addEventListener('message', handleMessage);

    return () => {
      navigator.serviceWorker.removeEventListener('message', handleMessage);
    };
  }, [isAuthenticated, currentUser]);

  // [남개발 부장] 로그인/새로고침 시 현재 시각에 가장 가까운 할 일로 지능적 자동 스크롤
  useEffect(() => {
    if (!isAuthenticated || todos.length === 0) return;

    // 이미 자동 스크롤을 수행했는지 확인 (세션당 1회 또는 특정 조건)
    // 여기서는 todos가 처음 로딩되었을 때 1회 수행하도록 함
    const hasScrolled = sessionStorage.getItem('initial_scroll_done');
    if (hasScrolled === 'true') return;

    const now = new Date();
    const currentH24 = now.getHours();
    const currentM24 = now.getMinutes();
    const currentTimeStr = `${String(currentH24).padStart(2, '0')}:${String(currentM24).padStart(2, '0')}`;

    // 시간 순으로 정렬된 리스트에서 현재 시각 이후의 첫 번째 항목 찾기
    const sorted = [...todos].sort((a, b) => {
      if (!a.time) return 1;
      if (!b.time) return -1;
      return a.time.localeCompare(b.time);
    });
    const nextTask = sorted.find(t => t.time && t.time >= currentTimeStr) || sorted[0];

    if (nextTask) {
      setTimeout(() => {
        const el = document.getElementById(`todo-${nextTask.id}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          sessionStorage.setItem('initial_scroll_done', 'true');
        }
      }, 500); // UI 렌더링 대기
    }
  }, [isAuthenticated, todos.length]);

  // 로그아웃 시 스크롤 상태 초기화
  useEffect(() => {
    if (!isAuthenticated) {
      sessionStorage.removeItem('initial_scroll_done');
    }
  }, [isAuthenticated]);

  // 기기 간 알람 동기화: 서버 데이터를 기반으로 다른 기기에서 확인된 알람 제거
  useEffect(() => {
    if (todos.length === 0 || pendingAlerts.length === 0) return;
    const today = new Date().toLocaleDateString();

    setPendingAlerts(prev => {
      const filtered = prev.filter(alert => {
        const serverTodo = todos.find(t => t.id === alert.todo.id);
        // 서버에서 이미 완료되었을 때만 삭제 (lastNotifiedDate에 의한 삭제 제거하여 화면 유지)
        if (serverTodo && serverTodo.completed) {
          return false;
        }
        return true;
      });
      return filtered.length !== prev.length ? filtered : prev;
    });
  }, [todos, pendingAlerts.length]);

  useEffect(() => {
    const timer = setInterval(() => {
      const actualNow = new Date();
      // 지정된 시간에 즉시 알람이 뜨도록 (딜레이 제거)
      const now = actualNow;

      const todayString = actualNow.toLocaleDateString();
      const currentDay = DAYS_OF_WEEK[actualNow.getDay()];
      const isWeekend = actualNow.getDay() === 0 || actualNow.getDay() === 6;

      const h24 = String(actualNow.getHours()).padStart(2, '0');
      const m24 = String(actualNow.getMinutes()).padStart(2, '0');
      const currentTime = `${h24}:${m24}`;

      // 자정이 지나면 notifiedIds 초기화
      const savedData = localStorage.getItem('notifiedIds');
      if (savedData) {
        try {
          const { date } = JSON.parse(savedData);
          if (date !== todayString) {
            setNotifiedIds(new Set());
            localStorage.removeItem('notifiedIds');
          }
        } catch (e) { }
      }

      todosRef.current.forEach(todo => {
        const days = todo.days ? todo.days.split(',').map(d => d.trim()) : [];
        const isScheduledToday = days.includes(currentDay);
        const isTimeMatch = todo.time === currentTime;
        const excludeVal = !!Number(todo.excludeHolidays);
        const isNotExcludingWeekend = !(excludeVal && isWeekend);

        // 알람 조건 검사 (로그 출력으로 원인 파악 용이하게 함)
        if (isTimeMatch && !todo.completed) {
          if (!isScheduledToday) {
            // console.log(`[ALARM_SKIP] ${todo.text} (NOT scheduled for ${currentDay})`);
            return;
          }

          // 주말/공휴일 제외 설정보다 사용자가 선택한 요일이 우선순위가 높습니다.
          // (일요일 일정을 목록에 표시했으므로 알람도 울리게 처리)
          if (notifiedIdsRef.current.has(todo.id)) {
            return;
          }

          // alarmFilter 적용
          const filter = localStorage.getItem('alarmFilter') || 'all';
          if (filter === 'off') return;
          if (filter === 'schedule' && todo.scheduleMode !== 'schedule') return;
          if (filter === 'routine' && todo.scheduleMode !== 'routine') return;

          console.log(`[ALARM_TRIGGER] Triggering for: ${todo.text} (ID: ${todo.id})`);
          let affirmationText = '';
          let affirmationType = 'positive';

          let validAffirmations = affirmations;
          if (alertPreference !== 'both') {
            validAffirmations = affirmations.filter(a => (a.type || 'positive') === alertPreference);
          }

          if (validAffirmations.length > 0) {
            const randomIdx = Math.floor(Math.random() * validAffirmations.length);
            affirmationText = validAffirmations[randomIdx].text;
            affirmationType = validAffirmations[randomIdx].type || 'positive';
          }

          setPendingAlerts(prev => [...prev, { todo, affirmationText, affirmationType }]);

          // Ref를 즉시 업데이트하여 다음 1초 뒤 인터벌에서 중복 발동 방지
          const nextSet = new Set(notifiedIdsRef.current);
          nextSet.add(todo.id);
          notifiedIdsRef.current = nextSet;
          setNotifiedIds(nextSet);

          // 알림음 및 데스크톱 알림 발생
          playAlarmSound(alarmSound);

          // 음성 알람 지원
          // [남개발 부장] 음성 알람 고도화: 일정 내용과 확언을 연속해서 낭독
          if (useVoiceAlarm) {
            const voiceMsg = `${todo.text} 시간입니다. ${affirmationText ? '오늘의 메시지입니다. ' + affirmationText : ''}`;
            speakText(voiceMsg, selectedVoiceName);
          }

          if (window.Notification && window.Notification.permission === "granted" && document.hidden) {
            navigator.serviceWorker.ready.then(registration => {
              registration.showNotification("🕒 Routine Core 알람", {
                body: `[${formatTime(todo.time)}] ${todo.text}\n할 일을 확인해 주세요!`,
                icon: "/logo192.png",
                badge: "/logo192.png",
                requireInteraction: true,
                tag: `alarm-${todo.id}`,
                renotify: true,
                data: {
                  todoId: todo.id,
                  username: currentUser
                },
                actions: [
                  { action: 'confirm', title: '확인 ✅' },
                  { action: 'rest', title: '쉬어감 💤' }
                ]
              });
            });
          }
        }
      });


      // 5분이 지나면 자동으로 미션 실패(알림 해제)
      setPendingAlerts(prev => {
        if (prev.length === 0) return prev;
        const currentAlert = prev[0];
        if (!currentAlert || !currentAlert.todo || !currentAlert.todo.time) return prev;

        const [targetH, targetM] = currentAlert.todo.time.split(':').map(Number);
        let diffMinutes = (actualNow.getHours() * 60 + actualNow.getMinutes()) - (targetH * 60 + targetM);
        if (diffMinutes < -12 * 60) diffMinutes += 24 * 60;

        if (diffMinutes >= 5) {
          const latestTodo = todosRef.current.find(t => t.id === currentAlert.todo.id);
          if (latestTodo && !latestTodo.completed && !latestTodo.isFailed) {
            fetchAPI(`${API_URLS.TODOS}/${latestTodo.id}`, {
              method: 'PATCH',
              body: JSON.stringify({ isFailed: true })
            }).then(() => {
              fetchTodos();
              speakText(`${latestTodo.text} 일정이 쉬어감으로 변경되었습니다. 다음 일정을 준비해 보세요.`);
            });
          }
          return prev.slice(1);
        }
        return prev;
      });

    }, 1000);
    return () => clearInterval(timer);
  }, [notifiedIds, affirmations, alertPreference, alarmSound]);


  // ===== 음성 비서 기능 (AI Voice Command) =====
  const startVoiceCommand = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("이 브라우저는 음성 인식을 지원하지 않습니다. 크롬이나 엣지를 사용해 주세요.");
      return;
    }

    const recognition = new SpeechRecognition();
    const initialInput = inputValue.trim();

    recognition.lang = 'ko-KR';
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = (e) => {
      console.error("Speech Recognition Error:", e);
      setIsListening(false);
    };

    recognition.onresult = (event) => {
      let interimTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          parseAndSetTodo(transcript);
        } else {
          interimTranscript += transcript;
          const combined = initialInput ? `${initialInput} ${interimTranscript}` : interimTranscript;
          setInputValue(combined);
        }
      }
    };
    recognition.start();
  };

  const parseAndSetTodo = (text) => {
    const now = new Date();
    let parsedTime = { ampm: now.getHours() < 12 ? '오전' : '오후', hour: '07', minute: '00' };

    // 1. 모드 판별 (키워드가 있을 때만 변경, 없으면 현재 모드 유지)
    let targetMode = scheduleMode;
    if (text.includes('루틴')) targetMode = 'routine';
    else if (text.includes('메모')) targetMode = 'memo';
    else if (text.includes('일정')) targetMode = 'schedule';
    
    setScheduleMode(targetMode);

    // 2. 시간 추출
    if (text.includes('오후') || text.includes('점심') || text.includes('저녁') || text.includes('밤')) parsedTime.ampm = '오후';
    else if (text.includes('오전') || text.includes('아침') || text.includes('새벽')) parsedTime.ampm = '오전';
    
    const hMatch = text.match(/(\d+)\s*시/);
    if (hMatch) {
      const hInt = parseInt(hMatch[1]);
      const displayH = String(hInt > 12 ? hInt - 12 : hInt).padStart(2, '0');
      if (hInt >= 12) parsedTime.ampm = '오후';  // 12시 이상은 오후로 설정
      setHour(displayH);
    }
    const mMatch = text.match(/(\d+)\s*분/);
    const mRawMatch = text.match(/시\s*(\d+)/);
    if (mMatch) setMinute(String(parseInt(mMatch[1]) % 60).padStart(2, '0'));
    else if (mRawMatch) setMinute(String(parseInt(mRawMatch[1]) % 60).padStart(2, '0'));
    else if (text.includes('반')) setMinute('30');
    setAmpm(parsedTime.ampm);  // 최종 ampm 설정 (시간 파싱 결과 반영됨)

    // 3. 업무명 정제 (7시 47분 보호막 소거, '해/줘' 단독 글자 필터 제외) 🛡️
    const filter = /(일정|루틴|메모|오전|오후|아침|점심|저녁|밤|새벽|반|(\d+)\s*시|(\d+)\s*분|한시|두시|세시|네시|다섯시|여섯시|일곱시|여덟시|아홉시|열시|열한시|열두시|예약|등록|해줘)/g;
    let cleaned = text.replace(filter, '').replace(/\s+/g, ' ').trim();
    if (!cleaned) cleaned = text.trim();
    
    // [남개발 부장] 음성 입력 시에도 선택된 모드 키워드를 자동으로 붙여줌 (사용자 요청 반영)
    const modeLabel = targetMode === 'routine' ? '루틴' : (targetMode === 'memo' ? '메모' : '일정');
    setInputValue(`${modeLabel} ${cleaned}`);
  };

  const resetForm = (isSubmitted = false) => {
    const nextT = getDefaultTime();
    const DAYS_KOR = ['일', '월', '화', '수', '목', '금', '토'];
    const now = new Date();
    const todayKor = DAYS_KOR[now.getDay()];
    const currentTodayStr = toStdDateStr(now);

    setInputValue('');
    setExcludeHolidays(false);
    setSelectedDays([todayKor]);
    setAmpm(nextT.ampm);
    setHour(nextT.hour);
    setMinute(nextT.minute);
    setScheduleMode('schedule');
    setEditingId(null);
    setPrevIsSchedule(null);
    setRangeStart(currentTodayStr);
    setRangeEnd(currentTodayStr);
  };

  // [남개발 팀장] 예약/Enter 버튼 누를 때 시간 파싱 후 저장
  const handleAddTodo = () => {
    const text = inputValue.trim();
    const isMemo = text.includes('메모');
    const hasTimeKeyword = /\d+\s*시/.test(text);
    
    // 시간 키워드가 있고 메모가 아니면 시간 직접 파싱하여 addTodo에 전달
    if (hasTimeKeyword && !isMemo) {
      let parsedTime = { ampm: '오전', hour: '07', minute: '00' };
      
      if (text.includes('오후') || text.includes('점심') || text.includes('저녁') || text.includes('밤')) {
        parsedTime.ampm = '오후';
      } else if (text.includes('오전') || text.includes('아침') || text.includes('새벽')) {
        parsedTime.ampm = '오전';
      }
      
      const hMatch = text.match(/(\d+)\s*시/);
      if (hMatch) {
        const hInt = parseInt(hMatch[1]);
        const displayH = String(hInt > 12 ? hInt - 12 : hInt).padStart(2, '0');
        if (hInt >= 12) parsedTime.ampm = '오후';
        parsedTime.hour = displayH;
      }
      
      const mMatch = text.match(/(\d+)\s*분/);
      const mRawMatch = text.match(/시\s*(\d+)/);
      if (mMatch) {
        parsedTime.minute = String(parseInt(mMatch[1]) % 60).padStart(2, '0');
      } else if (mRawMatch) {
        parsedTime.minute = String(parseInt(mRawMatch[1]) % 60).padStart(2, '0');
      } else if (text.includes('반')) {
        parsedTime.minute = '30';
      }
      
      // 파싱된 시간을 직접 addTodo에 전달 (setState 비동기 우회)
      addTodo(parsedTime);
      return;
    }
    
    addTodo();
  };

  const addTodo = async (overrideTime = null) => {
    const filter = /(일정|루틴|메모|오전|오후|아침|점심|저녁|밤|새벽|반|(\d+)\s*시|(\d+)\s*분|한시|두시|세시|네시|다섯시|여섯시|일곱시|여덟시|아홉시|열시|열한시|열두시|예약|등록|해줘)/g;
    let rawVal = inputValue.trim();
    let cleaned = rawVal.replace(filter, '').replace(/\s+/g, ' ').trim();
    if (!cleaned) cleaned = rawVal;

    if (!cleaned) {
      alert("할 일을 입력해 주세요.");
      return;
    }

    // [메모 전용 처리] 메모 모드일 때는 시간/요일 없이 저장
    const isMemoMode = scheduleMode === 'memo' || cleaned.includes('메모');
    
    if (!isMemoMode && selectedDays.length === 0) {
      alert("최소 한 개의 요일을 선택해 주세요.");
      return;
    }

    try {
      let time = null;
      let days = '';
      
      if (!isMemoMode) {
        // 일정/루틴 모드: 시간과 요일 설정 (overrideTime 우선 적용)
        const useAmpm = overrideTime ? overrideTime.ampm : ampm;
        const useHour = overrideTime ? overrideTime.hour : hour;
        const useMinute = overrideTime ? overrideTime.minute : minute;
        let h = parseInt(useHour);
        if (useAmpm === '오후' && h !== 12) h += 12;
        if (useAmpm === '오전' && h === 12) h = 0;
        time = `${String(h).padStart(2, '0')}:${useMinute}`;
        days = selectedDays.join(',');
        
        const duplicate = todos.find(t => t.time === time);
        if (duplicate) {
          if (!window.confirm(`중복된 시간(${formatTime(time)})에 '${duplicate.text}' 일정이 이미 있습니다. 추가하시겠습니까?`)) return;
        }
      }

      const timestamp = Date.now();
      const finalMode = isMemoMode ? 'memo' : scheduleMode;

      const newTodo = {
        id: timestamp,
        text: cleaned,
        time,
        days,
        excludeHolidays: isMemoMode ? false : !!excludeHolidays,
        scheduleMode: finalMode,
        completed: false,
        createdAt: timestamp,
        username: currentUser,
        startDate: (finalMode === 'routine') ? null : (isMemoMode ? null : rangeStart),
        endDate: (finalMode === 'routine') ? null : (isMemoMode ? null : rangeEnd)
      };
      
      await fetchAPI(API_URLS.TODOS, { method: 'POST', body: JSON.stringify(newTodo) });

      if (isMemoMode) {
        alert(`📝 [메모] ${cleaned}\n메모가 저장되었습니다! ✅`);
      } else {
        alert(`[${formatTime(time)}] ${cleaned}\n예약이 완료되었습니다! ✅`);
      }
      
      resetForm(true);
      setListFilter(finalMode);
      setLastAddedId(timestamp);
      fetchTodos();
    } catch (e) {
      console.error("Add failed", e);
      alert(`등록 중 오류가 발생했습니다: ${e.message}`);
    }
  };


  const startEdit = (todo) => {
    setEditingId(todo.id);
    setEditValue(todo.text || '');
    const days = todo.days ? todo.days.split(',') : [];
    setEditDays(days);
    setEditExcludeHolidays(!!todo.excludeHolidays);

    const [h, m] = (todo.time || '09:00').split(':');
    let hourNum = parseInt(h);
    const p = hourNum >= 12 ? '오후' : '오전';
    setEditAmpm(p);
    if (hourNum > 12) hourNum -= 12;
    if (hourNum === 0) hourNum = 12;
    setEditHour(String(hourNum).padStart(2, '0'));
    setEditMinute(m);

    // [남개발 부장] 수정 시 기존 기간 정보를 캘린더 센서에 미리 동기화!
    setRangeStart(todo.startDate || null);
    setRangeEnd(todo.endDate || null);
  };

  const resetEditForm = () => {
    setEditValue('');
    setEditDays([]);
    setEditExcludeHolidays(false);
    setEditAmpm('오전');
    setEditHour('09');
    setEditMinute('00');
    setRangeStart(todayStr);
    setRangeEnd(todayStr);
  };

  const saveEdit = async (id) => {
    try {
      if (editDays.length === 0) {
        await fetchAPI(`${API_URLS.TODOS}/${id}`, { method: 'DELETE' });
      } else {
        let h = parseInt(editHour);
        if (editAmpm === '오후' && h !== 12) h += 12;
        if (editAmpm === '오전' && h === 12) h = 0;
        const formattedTime = `${String(h).padStart(2, '0')}:${editMinute}`;

        // [남개발 부장] 수정 시 대상 항목을 찾기 위해 scheduleMode를 포함하여 전송 (서버 최적화)
        const todoToUpdate = todos.find(t => String(t.id) === String(id));
        const mode = todoToUpdate ? todoToUpdate.scheduleMode : null;

        const filter = /(일정|루틴|메모|오전|오후|아침|점심|저녁|밤|새벽|반|(\d+)\s*시|(\d+)\s*분|한시|두시|세시|네시|다섯시|여섯시|일곱시|여덟시|아홉시|열시|열한시|열두시|예약|등록|해줘)/g;
        let cleanedEditValue = editValue.replace(filter, '').replace(/\s+/g, ' ').trim();
        if (!cleanedEditValue) cleanedEditValue = editValue;

        await fetchAPI(`${API_URLS.TODOS}/${id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            text: cleanedEditValue,
            time: formattedTime,
            days: editDays.join(','),
            excludeHolidays: editExcludeHolidays,
            startDate: rangeStart,
            endDate: rangeEnd,
            scheduleMode: mode // 추가
          })
        });

        // 수정 시 해당 일정의 알람 완료 목록(notifiedIds) 초기화 (새로운 시간에 다시 울릴 수 있도록)
        setNotifiedIds(prev => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
      setEditingId(null);
    } catch (e) {
      console.error("Save failed", e);
      alert(`수정에 실패했습니다: ${e.message}`);
    }
    fetchTodos();
  };

  const dismissAlertGlobally = async (todoId) => {
    const today = new Date().toLocaleDateString();
    try {
      await fetchAPI(`${API_URLS.TODOS}/${todoId}`, {
        method: 'PATCH',
        body: JSON.stringify({ lastNotifiedDate: today })
      });
      fetchTodos();
    } catch (e) { console.error("Global dismiss failed", e); }
  };

  const toggleTodo = async (todo, targetDate) => {
    // [남개발 부장] 중복 클릭 방지 락
    const todoIdStr = String(todo.id);
    if (togglingIdsRef.current.has(todoIdStr)) return;

    // [남개발 부장] 미래 날짜 성공 처리 방지 로직 (숫자형 비교로 오차 제로화)
    const dateStr = (targetDate || toStdDateStr(new Date())).slice(0, 10);
    const todayLimit = toStdDateStr(new Date());
    
    const d1 = Number(dateStr.replace(/-/g, ''));
    const d2 = Number(todayLimit.replace(/-/g, ''));
    
    if (d1 > d2) {
      alert("미래 날짜는 미리 성공 처리할 수 없습니다.");
      return;
    }

    // [남개발 부장] 즉각적인 반응을 위해 화면 상태부터 업데이트 (Optimistic UI)
    // 1. completions 상태 업데이트
    const isAlreadyDone = completions.some(c => String(c.todo_id) === todoIdStr && c.date === dateStr);
    if (isAlreadyDone) {
      setCompletions(prev => prev.filter(c => !(String(c.todo_id) === todoIdStr && c.date === dateStr)));
    } else {
      setCompletions(prev => [...prev, { todo_id: todo.id, date: dateStr }]);
    }

    // 2. 하위 호환성을 위해 todos의 completed 상태도 업데이트 (오늘 날짜인 경우)
    if (dateStr === todayLimit) {
      setTodos(prev => prev.map(t => t.id === todo.id ? { ...t, completed: !isAlreadyDone } : t));
    }

    togglingIdsRef.current.add(todoIdStr);

    try {
      await fetchAPI(`${API_URLS.COMPLETIONS}/toggle`, {
        method: 'POST',
        body: JSON.stringify({ todo_id: todo.id, date: dateStr, username: currentUser.split('=')[0] })
      });
    } catch (e) {
      console.error("Toggle error:", e);
      alert(e.message || "변경 사항 저장 실패");
      // 롤백
      if (isAlreadyDone) {
        setCompletions(prev => [...prev, { todo_id: todo.id, date: dateStr }]);
      } else {
        setCompletions(prev => prev.filter(c => !(String(c.todo_id) === todoIdStr && c.date === dateStr)));
      }
      if (dateStr === todayLimit) {
        setTodos(prev => prev.map(t => t.id === todo.id ? { ...t, completed: isAlreadyDone } : t));
      }
    } finally {
      togglingIdsRef.current.delete(todoIdStr);
    }
  };

  const addAffirmation = async () => {
    if (!affirmationInput.trim()) return;
    try {
      await fetchAPI(API_URLS.AFFIRMATIONS, {
        method: 'POST',
        body: JSON.stringify({ text: affirmationInput, type: affirmationTypeTab, username: currentUser })
      });
      setAffirmationInput('');
      fetchAffirmations();
    } catch (e) {
      console.error("Add affirmation failed", e);
    }
  };

  const deleteAffirmation = async (id) => {
    try {
      await fetchAPI(`${API_URLS.AFFIRMATIONS}/${id}`, { method: 'DELETE' });
      fetchAffirmations();
    } catch (e) {
      console.error("Delete affirmation failed", e);
    }
  };

  const handleAlarmConfirm = async (alert) => {
    if (!alert || !alert.todo) return;
    const todoId = alert.todo.id;
    const todoIdStr = String(todoId);
    const todayDate = new Date();
    const today = `${todayDate.getFullYear()}-${String(todayDate.getMonth()+1).padStart(2,'0')}-${String(todayDate.getDate()).padStart(2,'0')}`;

    console.log(`[ALARM] Confirming todo: ${todoIdStr} ("${alert.todo.text}")`);

    // 즉시 해당 일정의 모든 알람창을 닫음 (중복 생성 대비)
    setPendingAlerts(prev => prev.filter(a => String(a.todo.id) !== todoIdStr));

    // 락(Lock) 및 화면 업데이트 (Optimistic UI)
    updateTogglingIds(prev => new Set([...prev, todoIdStr]));
    setTodos(prev => prev.map(t => String(t.id) === todoIdStr ? { ...t, completed: true, isFailed: false } : t));

    try {
      await fetchAPI(`${API_URLS.TODOS}/${todoId}`, {
        method: 'PATCH',
        body: JSON.stringify({ completed: true, isFailed: false, lastNotifiedDate: today, scheduleMode: alert.todo.scheduleMode })
      });

      // 3초 후 락 해제 및 최신화
      setTimeout(() => {
        updateTogglingIds(prev => {
          const next = new Set(prev);
          next.delete(todoIdStr);
          return next;
        });
        fetchTodos();
      }, 3000);
    } catch (e) {
      console.error("[ALARM] Confirmation error:", e);
      // 에러 발생 시 락 해제
      updateTogglingIds(prev => { const next = new Set(prev); next.delete(todoIdStr); return next; });
    }
  };

  const handleAlarmFail = async (alert) => {
    if (!alert || !alert.todo) return;
    const todoId = alert.todo.id;
    const todoIdStr = String(todoId);
    const todayDate = new Date();
    const today = `${todayDate.getFullYear()}-${String(todayDate.getMonth()+1).padStart(2,'0')}-${String(todayDate.getDate()).padStart(2,'0')}`;

    console.log(`[ALARM] Failing todo: ${todoIdStr} ("${alert.todo.text}")`);

    // 즉시 해당 일정의 알람창을 닫음
    setPendingAlerts(prev => prev.filter(a => String(a.todo.id) !== todoIdStr));

    // 락 및 화면 업데이트
    updateTogglingIds(prev => new Set([...prev, todoIdStr]));
    setTodos(prev => prev.map(t => String(t.id) === todoIdStr ? { ...t, completed: false, isFailed: true } : t));

    try {
      await fetchAPI(`${API_URLS.TODOS}/${todoId}`, {
        method: 'PATCH',
        body: JSON.stringify({ completed: false, isFailed: true, lastNotifiedDate: today, scheduleMode: alert.todo.scheduleMode })
      });

      speakText(`${alert.todo.text} 일정이 쉬어감으로 변경되었습니다.`);

      setTimeout(() => {
        updateTogglingIds(prev => {
          const next = new Set(prev);
          next.delete(todoIdStr);
          return next;
        });
        fetchTodos();
      }, 3000);
    } catch (e) {
      console.error("[ALARM] Failure error:", e);
      updateTogglingIds(prev => { const next = new Set(prev); next.delete(todoIdStr); return next; });
    }
  };

  const handleAdminDeleteTodo = async (id, text) => {
    if (!window.confirm(`'${text}' 항목을 정말로 삭제하시겠습니까?`)) return;
    try {
      await fetchAPI(`${API_URLS.TODOS}/${id}`, { method: 'DELETE' });
      setTodos(prev => prev.filter(t => t.id !== id));
      alert("삭제되었습니다.");
    } catch (e) {
      console.error("Delete todo failed", e);
      alert("삭제 중 오류가 발생했습니다.");
    }
  };

  const reuseTodo = async (todo) => {
    if (!window.confirm(`'${todo.text}' 항목을 오늘 일정으로 다시 활용하시겠습니까?`)) return;
    try {
      const today = Date.now();
      await fetchAPI(`${API_URLS.TODOS}/${todo.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          createdAt: today,
          completed: false,
          isFailed: false,
          lastNotifiedDate: null
        })
      });
      fetchTodos();
      alert("오늘 일정으로 등록되었습니다! ✨");
    } catch (e) {
      console.error("Reuse failed", e);
    }
  };

  const updateAffirmation = async (id) => {
    if (!editingAffirmationValue.trim()) return;
    try {
      await fetchAPI(`${API_URLS.AFFIRMATIONS}/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ text: editingAffirmationValue })
      });
      setEditingAffirmationId(null);
      fetchAffirmations();
    } catch (e) {
      console.error("Update affirmation failed", e);
    }
  };

  const startEditingAffirmation = (af) => {
    setEditingAffirmationId(af.id);
    setEditingAffirmationValue(af.text);
  };

  const formatTime = (t) => {
    if (!t || typeof t !== 'string' || !t.includes(':')) return t;
    const [h, m] = t.split(':').map(Number);
    if (isNaN(h) || isNaN(m)) return t;
    return `${h < 12 ? '오전' : '오후'} ${String(h % 12 || 12).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  const progress = todos.length ? (todos.filter(t => t.completed).length / todos.length) * 100 : 0;




  const handleSpecificExport = async (type, label) => {
    console.log(`[DEBUG] Exporting: ${type}`);
    try {
      const url = `${API_URLS.ADMIN_EXPORT}?username=${currentUser}`;
      const resData = await fetchAPI(url);
      const { data } = resData;

      const wb = XLSX.utils.book_new();
      let exportData = [];
      let sheetName = "";

      if (type === 'todos') {
        exportData = data.todos || [];
        sheetName = "루틴일정 전체";
      } else if (type === 'positive') {
        exportData = (data.affirmations || []).filter(a => a.type === 'positive');
        sheetName = "긍정확언";
      } else if (type === 'tough') {
        exportData = (data.affirmations || []).filter(a => a.type === 'tough');
        sheetName = "뼈때리는말";
      }

      const ws = XLSX.utils.json_to_sheet(exportData);
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
      XLSX.writeFile(wb, `${label}_${toStdDateStr(new Date())}.xlsx`);
    } catch (err) { alert("내보내기 실패: " + err.message); }
  };

  const handleSpecificImport = async (event, type) => {
    const file = event.target.files[0];
    if (!file) return;

    let confirmMsg = "";
    if (type === 'todos') confirmMsg = "기존 모든 루틴/일정이 삭제되고 파일 내용으로 대체됩니다. 계속하시겠습니까?";
    else if (type === 'positive') confirmMsg = "기존 긍정확언이 모두 삭제되고 파일 내용으로 대체됩니다. 계속하시겠습니까?";
    else if (type === 'tough') confirmMsg = "기존 뼈때리는말이 모두 삭제되고 파일 내용으로 대체됩니다. 계속하시겠습니까?";

    if (!confirm(confirmMsg)) {
      event.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const dataArr = new Uint8Array(e.target.result);
        const workbook = XLSX.read(dataArr, { type: 'array' });
        const sheetName = workbook.SheetNames[0]; // 첫 번째 시트 사용
        const sheetData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

        const importPayload = {
          data: {
            todos: type === 'todos' ? sheetData : [],
            affirmations: (type === 'positive' || type === 'tough') ? sheetData.map(item => ({ ...item, type: type === 'positive' ? 'positive' : 'tough' })) : [],
            users: []
          }
        };

        await fetchAPI(API_URLS.ADMIN_IMPORT, {
          method: 'POST',
          body: JSON.stringify({ username: currentUser, importData: importPayload })
        });

        alert("데이터가 성공적으로 복구되었습니다!");
        window.location.reload();
      } catch (err) { alert("가져오기 중 오류 발생: " + err.message); }
      event.target.value = '';
    };
    reader.readAsArrayBuffer(file);
  };

  // 하루 일과표 (원그래프)용 데이터 준비


  const handleLogin = async () => {
    setLoginError('');
    if (!loginId || !loginPw) {
      setLoginError('아이디와 비밀번호를 입력해주세요.');
      return;
    }
    const result = await login(loginId, loginPw);
    if (result.success) {
      resetForm();
      setListFilter('schedule');
      setScheduleMode('schedule');
      setShowScheduleCalendar(true);
      subscribeUserToPush(loginId);
    } else {
      setLoginError(result.error);
    }
  };

  const handleRegister = async () => {
    setLoginError('');
    setLoginSuccess('');
    if (!signUpName.trim()) {
      setLoginError('이름을 입력해주세요.');
      return;
    }
    if (!loginId || !loginPw) {
      setLoginError('아이디와 비밀번호를 입력해주세요.');
      return;
    }
    if (loginPw.length < 4) {
      setLoginError('비밀번호는 4자리 이상이어야 합니다.');
      return;
    }
    if (loginPw !== signUpConfirmPw) {
      setLoginError('비밀번호가 일치하지 않습니다.');
      return;
    }
    const result = await register(loginId, loginPw, signUpName.trim());
    if (result.success) {
      setLoginSuccess('회원가입 성공! 로그인해주세요.');
      setIsSignUpMode(false);
      setLoginPw('');
      setSignUpName('');
      setSignUpConfirmPw('');
    } else {
      setLoginError(result.error);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="landing-page">
        <div className="landing-overlay" />
        <div className="landing-content">
          <div className="landing-hero">
            <div className="logo-badge">Premium</div>
            <h1 className="hero-title">Routine<span>Core</span></h1>
            <p className="hero-subtitle">성공하는 사람들의 핵심 루틴 시스템</p>
          </div>

          <div className="login-card">
            <h2 className="login-card-title">{isSignUpMode ? '회원가입' : '로그인'}</h2>
            <div className="login-input-group">
              {isSignUpMode && (
                <input
                  type="text"
                  placeholder="이름"
                  value={signUpName}
                  onChange={(e) => { setSignUpName(e.target.value); setLoginError(''); }}
                  onKeyPress={(e) => e.key === 'Enter' && handleRegister()}
                  className="login-input"
                />
              )}
              <input
                type="text"
                placeholder="아이디"
                value={loginId}
                onChange={(e) => { setLoginId(e.target.value); setLoginError(''); setLoginSuccess(''); }}
                onKeyPress={(e) => e.key === 'Enter' && (isSignUpMode ? handleRegister() : handleLogin())}
                className="login-input"
              />
              <input
                type="password"
                placeholder={isSignUpMode ? '비밀번호 (4자리 이상)' : '비밀번호'}
                value={loginPw}
                onChange={(e) => { setLoginPw(e.target.value); setLoginError(''); setLoginSuccess(''); }}
                onKeyPress={(e) => e.key === 'Enter' && (isSignUpMode ? handleRegister() : handleLogin())}
                className="login-input"
              />
              {isSignUpMode && (
                <input
                  type="password"
                  placeholder="비밀번호 확인"
                  value={signUpConfirmPw}
                  onChange={(e) => { setSignUpConfirmPw(e.target.value); setLoginError(''); }}
                  onKeyPress={(e) => e.key === 'Enter' && handleRegister()}
                  className="login-input"
                />
              )}
            </div>
            {loginError && <p className="login-msg error">{loginError}</p>}
            {loginSuccess && <p className="login-msg success">{loginSuccess}</p>}
            <button className={`login-btn ${isSignUpMode ? 'signup-mode' : ''}`} onClick={isSignUpMode ? handleRegister : handleLogin}>
              {isSignUpMode ? '회원가입 완료' : '로그인 시작하기'}
            </button>
            <div className="login-footer">
              {isSignUpMode ? (
                <><span onClick={() => { setIsSignUpMode(false); setLoginError(''); setLoginSuccess(''); setSignUpName(''); setSignUpConfirmPw(''); }}>← 로그인으로 돌아가기</span></>
              ) : (
                <>처음이신가요? <span onClick={() => { setIsSignUpMode(true); setLoginError(''); setLoginSuccess(''); }}>회원가입</span></>
              )}
            </div>
            {!isSignUpMode && (
              <div className="demo-guide-box" style={{
                marginTop: '20px',
                padding: '15px',
                background: 'rgba(99, 102, 241, 0.08)',
                borderRadius: '12px',
                border: '1px dashed rgba(99, 102, 241, 0.2)',
                textAlign: 'center'
              }}>
                <p style={{ margin: '0 0 8px 0', fontSize: '0.85rem', color: '#818cf8', fontWeight: 'bold' }}>🚀 루틴코어 즉시 체험 (권장사례)</p>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', fontSize: '0.9rem', color: '#e2e8f0' }}>
                  <span>ID: <strong style={{ color: '#fff' }}>MASTER</strong></span>
                  <span>PW: <strong style={{ color: '#fff' }}>2tobee</strong></span>
                </div>
                <p style={{ margin: '8px 0 0 0', fontSize: '0.7rem', color: '#64748b' }}>* 비밀번호 대소문자를 정확히 입력해주세요.</p>
              </div>
            )}
          </div>

          <div className="landing-features">
            <div className="feature-item">
              <span className="feature-icon">✨</span>
              <p>긍정확언</p>
            </div>
            <div className="feature-item">
              <span className="feature-icon">📅</span>
              <p>일과표</p>
            </div>
            <div className="feature-item">
              <span className="feature-icon">🔔</span>
              <p>스마트 알림</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {currentAlert && (
        <div className="alert-overlay"
          style={{ zIndex: 99999, display: 'flex' }}
          onClick={() => handleAlarmConfirm(currentAlert)}
        >
          <div className="alert-modal" onClick={e => e.stopPropagation()} style={{ zIndex: 100000 }}>
            <span className="alert-icon">🔔</span>
            <p className="alert-time">{formatTime(currentAlert.todo.time)}</p>
            <p className="alert-message">{currentAlert.todo.text}<br />할 일을 확인해 주세요!</p>
            {currentAlert.affirmationText && (
              <div className="affirmation-alert-box">
                <p className="affirmation-label">{currentAlert.affirmationType === 'tough' ? '⚡️ 뼈때리는 말 ⚡️' : '✨ 오늘의 유인력 포인트 ✨'}</p>
                <p className="affirmation-text">"{currentAlert.affirmationText}"</p>
              </div>
            )}
            <div className="alert-btn-group">
              <button className="alert-close-btn" onClick={() => handleAlarmConfirm(currentAlert)}>확인</button>
              <button className="alert-fail-btn" onClick={() => handleAlarmFail(currentAlert)}>쉬어감</button>
            </div>
          </div>
        </div>
      )}

      {showAffirmations && (
        <div className="modal-overlay full-screen" onClick={() => { setShowAffirmations(false); setSelectedAfId(null); setEditingAffirmationId(null); }}>
          <div className="affirmation-modal full-screen" onClick={e => e.stopPropagation()}>
            <div className="modal-sticky-area" style={{ position: 'sticky', top: 0, zIndex: 1000, background: '#0f172a', paddingBottom: '10px' }}>
              <div className="modal-header">
                <h2>안내글귀 관리</h2>
                <button className="modal-close-x" onClick={() => { setShowAffirmations(false); setSelectedAfId(null); setEditingAffirmationId(null); }}>✕</button>
              </div>

              <div className="alert-pref-group" onClick={e => e.stopPropagation()} style={{ padding: '10px 15px', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                <p style={{ margin: '0 0 10px 0', fontSize: '13px', color: '#94a3b8', fontWeight: 'bold' }}>알람 발생 시 어떤 글귀를 띄울까요?</p>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'space-between' }}>
                  <label className="pref-label" style={{ color: alertPreference === 'positive' ? '#fff' : '#94a3b8' }}>
                    <input type="radio" name="alertPref" className="custom-radio-sq" value="positive" checked={alertPreference === 'positive'} onChange={e => setAlertPreference(e.target.value)} /> ✨ 긍정확언
                  </label>
                  <label className="pref-label" style={{ color: alertPreference === 'tough' ? '#fff' : '#94a3b8' }}>
                    <input type="radio" name="alertPref" className="custom-radio-sq" value="tough" checked={alertPreference === 'tough'} onChange={e => setAlertPreference(e.target.value)} /> ⚡️ 뼈때림
                  </label>
                  <label className="pref-label" style={{ color: alertPreference === 'both' ? '#fff' : '#94a3b8' }}>
                    <input type="radio" name="alertPref" className="custom-radio-sq" value="both" checked={alertPreference === 'both'} onChange={e => setAlertPreference(e.target.value)} /> 🎲 둘 다
                  </label>
                </div>
              </div>

              <div className="af-tab-group" onClick={e => e.stopPropagation()} style={{ display: 'flex', gap: '10px', padding: '10px 15px' }}>
                <button className={`af-tab-btn ${affirmationTypeTab === 'positive' ? 'active' : ''}`} onClick={() => setAffirmationTypeTab('positive')} style={{ flex: 1, padding: '8px', fontSize: '0.8rem', borderRadius: '10px', border: 'none', background: affirmationTypeTab === 'positive' ? '#6366f1' : '#1e293b', color: affirmationTypeTab === 'positive' ? '#fff' : '#94a3b8', cursor: 'pointer', fontWeight: 'bold' }}>✨ 긍정확언</button>
                <button className={`af-tab-btn ${affirmationTypeTab === 'tough' ? 'active' : ''}`} onClick={() => setAffirmationTypeTab('tough')} style={{ flex: 1, padding: '8px', fontSize: '0.8rem', borderRadius: '10px', border: 'none', background: affirmationTypeTab === 'tough' ? '#ef4444' : '#1e293b', color: affirmationTypeTab === 'tough' ? '#fff' : '#94a3b8', cursor: 'pointer', fontWeight: 'bold' }}>⚡️ 뼈때리는 말</button>
              </div>

              <div className="affirmation-input-group" onClick={e => e.stopPropagation()} style={{ margin: '0 15px', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '12px' }}>
                <input
                  type="text"
                  value={affirmationInput}
                  onChange={e => setAffirmationInput(e.target.value)}
                  placeholder={affirmationTypeTab === 'tough' ? "새로운 뼈때리는 말을 입력해 보세요..." : "새로운 긍정확언을 입력해 보세요..."}
                  onKeyPress={e => e.key === 'Enter' && addAffirmation()}
                  style={{ paddingLeft: '15px' }}
                />
                <button className="add-af-btn" onClick={addAffirmation}>추가</button>
              </div>
            </div>

            <ul className="affirmation-list no-scrollbar" onClick={e => e.stopPropagation()} style={{ padding: '10px 15px 40px 15px' }}>
              {affirmations.filter(a => (a.type || 'positive') === affirmationTypeTab).length === 0 ? (
                <p className="empty-msg">등록된 내용이 없습니다.</p>
              ) : (
                affirmations.filter(a => (a.type || 'positive') === affirmationTypeTab).map(af => (
                  <li
                    key={af.id}
                    className={`${editingAffirmationId === af.id ? 'editing' : ''} ${selectedAfId === af.id ? 'selected' : ''}`}
                    onClick={(e) => { e.stopPropagation(); setSelectedAfId(selectedAfId === af.id ? null : af.id); }}
                    style={{ cursor: 'pointer' }}
                  >
                    {editingAffirmationId === af.id ? (
                      <div className="af-edit-mode" onClick={e => e.stopPropagation()}>
                        <input
                          type="text"
                          value={editingAffirmationValue}
                          onChange={e => setEditingAffirmationValue(e.target.value)}
                          onKeyPress={e => e.key === 'Enter' && updateAffirmation(af.id)}
                          autoFocus
                        />
                        <div className="af-edit-btns">
                          <button className="af-save-btn" onClick={() => updateAffirmation(af.id)}>저장</button>
                          <button className="af-cancel-btn" onClick={() => { setEditingAffirmationId(null); setSelectedAfId(null); }}>취소</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <span className="af-text">{af.text}</span>
                        {selectedAfId === af.id && (
                          <div className="af-item-btns" onClick={e => e.stopPropagation()}>
                            <button className="af-edit-btn" onClick={() => startEditingAffirmation(af)}>수정</button>
                            <button className="af-del-btn" onClick={() => deleteAffirmation(af.id)}>삭제</button>
                          </div>
                        )}
                      </>
                    )}
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      )}

      {showScheduleCalendar && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: '#0f172a', zIndex: 9999, overflowY: 'auto',
          display: 'flex', flexDirection: 'column', alignItems: 'center'
        }}>
          <div style={{ width: '100%', maxWidth: '480px', flex: 1 }}>
            <ScheduleOnlyCalendar 
              todos={todos} 
              completions={completions}
              startEdit={startEdit} 
              closeCalendar={() => setShowScheduleCalendar(false)} 
              toggleTodo={toggleTodo}
              userPoints={userPoints}
              progress={progress}
              userAvatar={userAvatar}
              currentUser={currentUser}
              setShowSuccessRoom={setShowSuccessRoom}
              setShowMyPage={setShowMyPage}
              setShowDailyChart={setShowDailyChart}
              handleInstallClick={handleInstallClick}
              showInstallBtn={showInstallBtn}
              setIsAuthenticated={setIsAuthenticated}
              setCurrentUser={setCurrentUser}
            />
            {/* 하단 sticky 닫기 버튼 */}
            <div style={{
              position: 'sticky', bottom: 0,
              background: 'linear-gradient(to top, rgba(15,23,42,1) 65%, rgba(15,23,42,0))',
              padding: '28px 20px 24px',
              display: 'flex', justifyContent: 'center',
              pointerEvents: 'none'
            }}>
              <button
                onClick={() => setShowScheduleCalendar(false)}
                style={{
                  pointerEvents: 'auto',
                  background: 'linear-gradient(135deg, rgba(239,68,68,0.9), rgba(220,38,38,0.95))',
                  color: '#fff',
                  border: '1px solid rgba(255,255,255,0.2)',
                  padding: '13px 32px',
                  borderRadius: '50px',
                  fontWeight: '900',
                  fontSize: '0.95rem',
                  boxShadow: '0 8px 28px rgba(239,68,68,0.45), 0 2px 8px rgba(0,0,0,0.4)',
                  display: 'flex', alignItems: 'center', gap: '8px',
                  cursor: 'pointer',
                  letterSpacing: '-0.3px'
                }}
              >
                ← 대시보드로 돌아가기
              </button>
            </div>
          </div>
        </div>
      )}

      {showDailyChart && (
          <div className="modal-overlay full-screen" onClick={() => setShowDailyChart(false)}>
            <div className="affirmation-modal full-screen" onClick={e => e.stopPropagation()}>
              <div className="modal-sticky-area" style={{ position: 'sticky', top: 0, zIndex: 1000, background: '#0f172a' }}>
                <div className="modal-header">
                  <h2>📅 하루 일과표</h2>
                  <button className="modal-close-x" onClick={() => setShowDailyChart(false)}>✕</button>
                </div>
              </div>
              <div className="chart-modal-content" style={{ padding: '20px 15px 60px 15px' }}>
                <DailyScheduleChart todos={todos} />
                <div className="todo-list-section">
                  <p className="legend-hint">* 바늘은 현재 시간을 나타냅니다.</p>
                  <div className="legend-list">
                    {getDailyScheduleData(todos).map((seg, i) => (
                      <div key={i} className="legend-item">
                        <span className="dot" style={{ backgroundColor: seg.color }}></span>
                        <span className="time-range">{Math.floor(seg.startMinutes / 60).toString().padStart(2, '0')}:{(seg.startMinutes % 60).toString().padStart(2, '0')}</span>
                        <span className="label">{seg.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      }

      {showMyPage && (
        <div className="modal-overlay full-screen" onClick={() => { setShowMyPage(false); setPwMessage(''); setPwError(''); }}>
          <div className="affirmation-modal full-screen" onClick={e => e.stopPropagation()}>
            <div className="modal-sticky-area" style={{ position: 'sticky', top: '0px', zIndex: 1000, background: '#0f172a' }}>
              <div className="modal-header">
                <div className="modal-header-left">
                  <h2>마이페이지</h2>
                  <span className="modal-subtitle">나의 정보 및 알람 관리</span>
                </div>
                <button className="modal-close-x" onClick={() => { setShowMyPage(false); setPwMessage(''); setPwError(''); }}>✕</button>
              </div>
            </div>

            <div className="mypage-content-area no-scrollbar">
              <div className="mypage-user-info">
                <div className="mypage-avatar-big">
                  <RenderAvatar avatar={userAvatar} />
                </div>
                <div className="mypage-user-meta">
                  <p className="mypage-username">{currentUser} 님</p>
                  <div className="mypage-user-badges" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <div className="mypage-level-badge" style={{
                      fontSize: '0.7rem',
                      padding: '2px 8px',
                      borderRadius: '8px',
                      background: getLevelInfo(userPoints).color,
                      color: '#fff',
                      fontWeight: '900'
                    }}>
                      🏆 {getLevelInfo(userPoints).title}
                    </div>
                    <div className="mypage-points-badge">💰 {userPoints.toLocaleString()} Points</div>
                  </div>
                </div>
              </div>

              {/* [남개발 부장] 성공 대시보드 - 여기는 스크롤됨 */}
              <div className="mypage-dashboard-box" style={{ margin: '0 20px 20px 20px', padding: '15px', background: 'rgba(99, 102, 241, 0.1)', borderRadius: '15px', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 'bold' }}>🎯 이번 주 주간 점유율</span>
                  <span style={{ fontSize: '0.9rem', color: '#6366f1', fontWeight: '900' }}>
                    {(() => {
                      const currentWeek = getWeekStr();
                      const weekItems = todos.filter(t =>
                        t.scheduleMode === 'routine' || t.activatedWeek === currentWeek
                      );
                      const completed = weekItems.filter(t => t.completed).length;
                      const total = weekItems.length;
                      return total > 0 ? `${Math.round((completed / total) * 100)}%` : '0%';
                    })()}
                  </span>
                </div>
                <div style={{ height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    background: 'linear-gradient(90deg, #6366f1, #a855f7)',
                    width: (() => {
                      const currentWeek = getWeekStr();
                      const weekItems = todos.filter(t => t.scheduleMode === 'routine' || t.activatedWeek === currentWeek);
                      const completed = weekItems.filter(t => t.completed).length;
                      const total = weekItems.length;
                      return total > 0 ? `${(completed / total) * 100}%` : '0%';
                    })(),
                    transition: 'width 0.5s ease'
                  }}></div>
                </div>
              </div>

              {/* [남개발 부장] 탭 메뉴 - 여기는 다시 스티키하게 헤더 바로 밑에 붙게 처리 */}
              <div className="mypage-tabs-sticky-wrap" style={{ position: 'sticky', top: '55px', zIndex: 999, background: '#0f172a', paddingBottom: '15px', paddingTop: '5px' }}>
                <div className="mypage-tabs-container" style={{ display: 'flex', flexDirection: 'column', gap: '15px', padding: '0 20px 0 20px' }}>
                  <div className="tab-group-section">
                    <p className="tab-group-label" style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 'bold', marginBottom: '8px', paddingLeft: '5px' }}>🛡️ 주간 전략실 (PLANS)</p>
                    <div className="mypage-tabs no-scrollbar" style={{ padding: 0 }}>
                      <button className={`mypage-tab ${myPageTab === 'weekly' ? 'active' : ''}`} onClick={() => { setMyPageTab('weekly'); fetchAllCandidates(); }}><span className="tab-icon-small">📅</span> 주간 관리</button>
                      <button className={`mypage-tab ${myPageTab === 'reservation' ? 'active' : ''}`} onClick={() => setMyPageTab('reservation')}><span className="tab-icon-small">🔄</span> 루틴</button>
                      <button className={`mypage-tab ${myPageTab === 'history' ? 'active' : ''}`} onClick={() => setMyPageTab('history')}><span className="tab-icon-small">🔍</span> 검색</button>
                    </div>
                  </div>

                  <div className="tab-group-section">
                    <p className="tab-group-label" style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 'bold', marginBottom: '8px', paddingLeft: '5px' }}>📊 성과 관리 (PERFORMANCE)</p>
                    <div className="mypage-tabs no-scrollbar" style={{ padding: 0 }}>
                      <button className={`mypage-tab ${myPageTab === 'heatmap' ? 'active' : ''}`} onClick={() => { setMyPageTab('heatmap'); fetchHeatmapData(); }}><span className="tab-icon-small">📈</span> 성취기록</button>
                      <button className="mypage-tab" onClick={() => setShowAffirmations(true)}><span className="tab-icon-small">✨</span> 확언관리</button>
                      <button className="mypage-tab" onClick={() => setShowDailyChart(true)}><span className="tab-icon-small">📅</span> 일과표</button>
                    </div>
                  </div>

                  <div className="tab-group-section" style={{ display: myPageTab === 'alarm' || myPageTab === 'tips' || myPageTab === 'avatar' || myPageTab === 'password' ? 'block' : 'none' }}>
                    <p className="tab-group-label" style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 'bold', marginBottom: '8px', paddingLeft: '5px' }}>⚙️ 기타 설정 (ETC)</p>
                    <div className="mypage-tabs no-scrollbar" style={{ padding: 0 }}>
                      <button className={`mypage-tab ${myPageTab === 'alarm' ? 'active' : ''}`} onClick={() => setMyPageTab('alarm')}><span className="tab-icon-small">⏰</span> 알람</button>
                      <button className={`mypage-tab ${myPageTab === 'tips' ? 'active' : ''}`} onClick={() => setMyPageTab('tips')}><span className="tab-icon-small">💡</span> 팁</button>
                      <button className={`mypage-tab ${myPageTab === 'avatar' ? 'active' : ''}`} onClick={() => setMyPageTab('avatar')}><span className="tab-icon-small">👤</span> 아바타</button>
                      <button className={`mypage-tab ${myPageTab === 'password' ? 'active' : ''}`} onClick={() => setMyPageTab('password')}><span className="tab-icon-small">🔒</span> 비번</button>
                    </div>
                  </div>
                </div>
              </div>

              {myPageTab === 'weekly' && (
                <div className="mypage-section weekly-section">
                  <p className="mypage-label">📅 이번 주 정예 일정/메모 선발</p>
                  <p className="mypage-subtitle" style={{ fontSize: '0.85rem', color: '#94a3b8', margin: '-10px 20px 20px 20px' }}>
                    매주 월요일, 이번 주에 집중할 항목들을 선택해 활성화하세요.<br />
                    루틴은 고정이며, 일정과 메모만 여기서 관리합니다.
                  </p>

                  <div className="weekly-manage-controls" style={{ padding: '0 20px 15px 20px', display: 'flex', gap: '10px' }}>
                    <button className="activate-all-btn" onClick={handleActivateWeekly} style={{ flex: 1, padding: '12px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 'bold' }}>
                      이번 주 전술 배치 (선택 완료) 🚀
                    </button>
                  </div>

                  <div className="mypage-routine-list no-scrollbar">
                    {allCandidates.length === 0 ? (
                      <div className="empty-state" style={{ padding: '40px 0' }}>
                        <span className="empty-icon" style={{ fontSize: '3rem', opacity: 0.3 }}>🏛️</span>
                        <p style={{ marginTop: '10px' }}>아직 선발할 후보가 없습니다.<br />할 일을 먼저 등록해 보세요!</p>
                      </div>
                    ) : (
                      allCandidates.map(todo => (
                        <div key={todo.id} className={`mypage-routine-item card-style ${weeklySelectedIds.has(todo.id) ? 'active-weekly' : ''}`}
                          onClick={() => {
                            setWeeklySelectedIds(prev => {
                              const next = new Set(prev);
                              if (next.has(todo.id)) next.delete(todo.id);
                              else next.add(todo.id);
                              return next;
                            });
                          }}
                          style={{
                            cursor: 'pointer',
                            background: 'rgba(255,255,255,0.03)',
                            borderRadius: '16px',
                            padding: '18px',
                            marginBottom: '12px',
                            border: weeklySelectedIds.has(todo.id) ? '2px solid #6366f1' : '1px solid rgba(255,255,255,0.08)',
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            transform: weeklySelectedIds.has(todo.id) ? 'scale(1.02)' : 'scale(1)'
                          }}
                        >
                          <div className="todo-content-row">
                            <div className="todo-info" style={{ opacity: weeklySelectedIds.has(todo.id) ? 1 : 0.6 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                                <span style={{
                                  fontSize: '0.65rem',
                                  padding: '2px 8px',
                                  borderRadius: '6px',
                                  background: todo.scheduleMode === 'schedule' ? '#3b82f6' : '#10b981',
                                  color: '#fff',
                                  fontWeight: 'bold'
                                }}>
                                  {todo.scheduleMode === 'schedule' ? 'SCHEDULE' : 'MEMO'}
                                </span>
                                <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{formatTime(todo.time)}</span>
                              </div>
                              <span style={{ fontSize: '1rem', fontWeight: 'bold', color: '#fff' }}>{todo.text}</span>
                              <div style={{ marginTop: '8px', display: 'flex', gap: '10px' }}>
                                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>🗓️ {todo.days}</span>
                              </div>
                            </div>
                            <div className="selection-indicator">
                              <div className={`custom-checkbox ${weeklySelectedIds.has(todo.id) ? 'checked' : ''}`}
                                style={{ width: '28px', height: '28px', borderRadius: '50%', border: '2px solid #6366f1', background: weeklySelectedIds.has(todo.id) ? '#6366f1' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: weeklySelectedIds.has(todo.id) ? '0 0 10px rgba(99, 102, 241, 0.4)' : 'none' }}>
                                {weeklySelectedIds.has(todo.id) && <span style={{ color: '#fff', fontSize: '16px' }}>✓</span>}
                              </div>
                            </div>
                          </div>
                          {/* [남개발 부장] 주간 관리에서도 수정/삭제가 가능하도록 조치 */}
                          <div className="item-actions" style={{ marginTop: '12px', display: 'flex', gap: '10px', justifyContent: 'flex-end', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '10px' }}>
                            <button className="action-btn edit" onClick={(e) => { e.stopPropagation(); startEdit(todo); }} style={{ fontSize: '0.75rem', padding: '6px 14px' }}>수정</button>
                            <button className="action-btn delete" onClick={(e) => { e.stopPropagation(); handleAdminDeleteTodo(todo.id, todo.text); }} style={{ fontSize: '0.75rem', padding: '6px 14px' }}>삭제</button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
              {myPageTab === 'history' && (
                <div className="mypage-section history-section">
                  <p className="mypage-label">🔍 전체 기록 검색 (루틴/일정/메모)</p>
                  <div className="history-search-input-group" style={{ padding: '0 20px' }}>
                    <input
                      type="text"
                      placeholder="검색어를 입력하세요 (예: 회의, 아이디어, 운동...)"
                      value={historySearchTerm}
                      onChange={(e) => setHistorySearchTerm(e.target.value)}
                      className="mypage-input"
                    />
                  </div>
                  <div className="mypage-routine-list no-scrollbar">
                    {(() => {
                      const searchLower = historySearchTerm.toLowerCase();
                      const filteredHistory = todos.filter(t =>
                        (t.text || '').toLowerCase().includes(searchLower) ||
                        (t.scheduleMode || '').toLowerCase().includes(searchLower)
                      );

                      if (filteredHistory.length === 0) {
                        return (
                          <div className="empty-state" style={{ padding: '60px 0' }}>
                            <span className="empty-icon" style={{ fontSize: '4rem', opacity: 0.2 }}>🔍</span>
                            <p style={{ marginTop: '15px', color: '#64748b' }}>"{historySearchTerm}"에 대한 검색 결과가 없습니다.</p>
                          </div>
                        );
                      }

                      return filteredHistory
                        .sort((a, b) => (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0))
                        .map(todo => (
                          <div key={todo.id} className={`mypage-routine-item card-style history-item ${editingId === todo.id ? 'editing' : ''}`}
                            style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '16px', padding: '15px', marginBottom: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
                            {editingId === todo.id ? (
                              <div className="edit-container" style={{ margin: 0, padding: 0, border: 'none', background: 'transparent' }}>
                                <input type="text" value={editValue} onChange={e => setEditValue(e.target.value)} className="edit-input" />
                                <div className="edit-days-row">
                                  {['월', '화', '수', '목', '금', '토', '일'].map(d => (
                                    <button key={d} className={`edit-day-btn ${editDays.includes(d) ? 'active' : ''}`} onClick={() => {
                                      const next = editDays.includes(d) ? editDays.filter(x => x !== d) : [...editDays, d];
                                      setEditDays(next);
                                      syncDaysToRange(next, setRangeStart, setRangeEnd);
                                    }}>{d}</button>
                                  ))}
                                </div>
                                <div className="input-helper-row edit-mode">
                                  <label className="holiday-toggle">
                                    <input type="checkbox" checked={editExcludeHolidays} onChange={e => setEditExcludeHolidays(e.target.checked)} />
                                    <span>공휴일/주말 제외</span>
                                  </label>
                                  <button type="button" className="clear-form-btn" onClick={() => resetEditForm()}>초기화</button>
                                </div>
                                <div className="edit-actions">
                                  <button className="save-btn" onClick={() => saveEdit(todo.id)}>저장</button>
                                  <button className="cancel-btn" onClick={() => setEditingId(null)}>취소</button>
                                </div>
                              </div>
                            ) : (
                              <div className="todo-content-row">
                                <div className="todo-info">
                                  <div style={{ display: 'flex', gap: '8px', marginBottom: '4px' }}>
                                    <span style={{
                                      fontSize: '0.62rem',
                                      padding: '2px 6px',
                                      borderRadius: '4px',
                                      background: todo.scheduleMode === 'routine' ? '#818cf8' : (todo.scheduleMode === 'schedule' ? '#3b82f6' : '#10b981'),
                                      color: '#fff',
                                      fontWeight: 'bold'
                                    }}>
                                      {todo.scheduleMode.toUpperCase()}
                                    </span>
                                  </div>
                                  <span style={{ fontSize: '0.95rem', fontWeight: 'bold', color: '#e2e8f0' }}>{todo.text}</span>
                                  <div className="todo-meta-premium" style={{ marginTop: '6px' }}>
                                    {todo.scheduleMode !== 'memo' && todo.time && (
                                      <span className="todo-time-badge">{formatTime(todo.time)}</span>
                                    )}
                                    {todo.scheduleMode !== 'memo' && todo.days && (
                                      <span className="todo-days-tag">{todo.days}</span>
                                    )}
                                    {todo.scheduleMode === 'memo' && (
                                      <span className="memo-badge-small" style={{
                                        background: 'rgba(16, 185, 129, 0.2)',
                                        color: '#10b981',
                                        border: '1px solid rgba(16, 185, 129, 0.4)',
                                        fontSize: '0.65rem',
                                        padding: '2px 8px',
                                        borderRadius: '10px',
                                        fontWeight: 'bold'
                                      }}>📝 메모</span>
                                    )}
                                    <span className="todo-date-tag">🗓️ {new Date(Number(todo.createdAt)).toLocaleDateString()}</span>
                                  </div>
                                </div>
                                <div className="item-actions">
                                  <button className="action-btn reuse" onClick={() => reuseTodo(todo)} style={{ background: 'rgba(52, 211, 153, 0.1)', color: '#34d399', borderColor: 'rgba(52, 211, 153, 0.2)' }}>활용</button>
                                  <button className="action-btn edit" onClick={() => startEdit(todo)}>수정</button>
                                  <button className="action-btn delete" onClick={() => handleAdminDeleteTodo(todo.id, todo.text)}>삭제</button>
                                </div>
                              </div>
                            )}
                          </div>
                        ));
                    })()}
                  </div>
                </div>
              )}
              {myPageTab === 'heatmap' && (
                <div className="mypage-section heatmap-section">
                  <p className="mypage-label">📈 연간 루틴 성취 히트맵</p>
                  <p className="mypage-subtitle" style={{ fontSize: '0.85rem', color: '#94a3b8', margin: '-10px 20px 20px 20px' }}>
                    지난 1년간의 꾸준함을 시각적으로 확인하세요.<br />
                    색이 짙을수록 해당 날짜의 루틴 달성률이 높음을 의미합니다.
                  </p>
                  <div style={{ padding: '0 20px 30px 20px' }}>
                    <AchievementHeatmap data={heatmapData} />
                  </div>
                </div>
              )}
              {myPageTab === 'tips' && (
                <div className="mypage-section tips-section">
                  <p className="mypage-label">💡 이용꿀팁</p>
                  <div className="tips-container">
                    <div className="tip-card manual-card" style={{ border: '1px solid rgba(99, 102, 241, 0.3)', background: 'rgba(99, 102, 241, 0.05)' }}>
                      <div className="tip-header">
                        <span className="tip-icon">📘</span>
                        <h4 className="tip-title">RoutineCore 사용법 (초간단)</h4>
                      </div>
                      <p className="tip-desc">
                        핵심 기능들을 마스터하고 더 빠르게 성공 루틴을 만들어보세요.
                      </p>
                      <ul className="tip-list manual-list">
                        <li><strong>스마트 등록:</strong> "일정", "메모", "아이디어" 단어를 넣으면 🔄루틴이 아닌 📅일정/📝메모 모드로 자동 전환됩니다.</li>
                        <li><strong>알람 액션:</strong> 알람창의 <strong>[확인]</strong>은 100% 완료, <strong>[쉬어감]</strong>은 50% 인정으로 기록됩니다.</li>
                        <li><strong>포인트 정산:</strong> 매일 자정, 오늘의 달성률에 따라 루틴 코인이 자동 지급됩니다.</li>
                        <li><strong>성공의 방:</strong> 코인을 모아 상점에서 아이템을 구매하고 나만의 '성공의 전당'을 꾸며보세요.</li>
                      </ul>
                    </div>
                    <div className="tip-card">
                      <div className="tip-header">
                        <span className="tip-icon">🔔</span>
                        <h4 className="tip-title">화면이 꺼져있을 때 알람 받기</h4>
                      </div>
                      <p className="tip-desc">
                        휴대폰 화면이 꺼져 있거나 앱이 닫혀 있어도 알람을 받으려면 <strong>'웹 푸시'</strong> 설정이 필요합니다.
                      </p>
                      <ul className="tip-list">
                        <li>앱 접속 시 나타나는 <strong>알림 권한 요청</strong>을 승인해 주세요.</li>
                        <li>브라우저(Chrome 등) 설정에서 <strong>알림 허용</strong>이 켜져 있어야 합니다.</li>
                        <li>로그인 시 'Push Subscribed' 메시지가 나오면 정상 설정된 것입니다.</li>
                      </ul>
                    </div>

                    <div className="tip-card">
                      <div className="tip-header">
                        <span className="tip-icon">🔋</span>
                        <h4 className="tip-title">알람 누락 방지 (중요)</h4>
                      </div>
                      <p className="tip-desc">
                        안드로이드 등 일부 기기에서는 배터리 절약을 위해 알람을 차단할 수 있습니다.
                      </p>
                      <ul className="tip-list">
                        <li>휴대폰 설정 &gt; 애플리케이션 &gt; <strong>브라우저 앱(Chrome 등)</strong> 선택</li>
                        <li>배터리 &gt; <strong>제한 없음</strong> 또는 <strong>최적화 제외</strong>로 설정해 주세요.</li>
                      </ul>
                    </div>

                    <div className="tip-card">
                      <div className="tip-header">
                        <span className="tip-icon">✨</span>
                        <h4 className="tip-title">포인트 획득 팁</h4>
                      </div>
                      <p className="tip-desc">
                        매일 설정한 루틴을 완료할 때마다 포인트가 쌓입니다.
                      </p>
                      <ul className="tip-list">
                        <li>자정이 되면 미션 달성률에 따라 루틴 코인이 자동 정산됩니다.</li>
                        <li>모은 포인트로 <strong>'성공의 방'</strong>에서 나만의 멋진 공간을 꾸며보세요!</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}
              {myPageTab === 'reservation' && (
                <div className="mypage-section">
                  <p className="mypage-label">📋 영구 반복 루틴 리스트 관리</p>
                  <div className="mypage-routine-list no-scrollbar">
                    {(() => {
                      const routinesOnly = todos.filter(t => t.scheduleMode === 'routine');
                      if (routinesOnly.length === 0) {
                        return (
                          <div className="empty-state" style={{ padding: '60px 0' }}>
                            <span className="empty-icon" style={{ fontSize: '4rem', opacity: 0.2 }}>🔄</span>
                            <p style={{ marginTop: '15px' }}>등록된 루틴이 없습니다.<br />성공의 기둥을 세워보세요!</p>
                          </div>
                        );
                      }

                      return routinesOnly.map(todo => (
                        <div key={todo.id} className={`mypage-routine-item card-style ${editingId === todo.id ? 'editing' : ''}`}
                          style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '16px', padding: '15px', marginBottom: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
                          {editingId === todo.id ? (
                            <div className="edit-container" style={{ margin: 0, padding: 0, border: 'none', background: 'transparent' }}>
                              <input type="text" value={editValue} onChange={e => setEditValue(e.target.value)} className="edit-input" />
                              <div className="edit-days-row">
                                {['월', '화', '수', '목', '금', '토', '일'].map(d => (
                                  <button key={d} className={`edit-day-btn ${editDays.includes(d) ? 'active' : ''}`} onClick={() => {
                                    const next = editDays.includes(d) ? editDays.filter(x => x !== d) : [...editDays, d];
                                    setEditDays(next);
                                    syncDaysToRange(next, setRangeStart, setRangeEnd);
                                  }}>{d}</button>
                                ))}
                              </div>
                              <div className="input-helper-row edit-mode">
                                <label className="holiday-toggle">
                                  <input type="checkbox" checked={editExcludeHolidays} onChange={e => {
                                    const isChecked = e.target.checked;
                                    setEditExcludeHolidays(isChecked);
                                    if (isChecked) {
                                      const next = ['월', '화', '수', '목', '금'];
                                      setEditDays(next);
                                      syncDaysToRange(next, setRangeStart, setRangeEnd);
                                    } else {
                                      const next = ['월', '화', '수', '목', '금', '토', '일'];
                                      setEditDays(next);
                                      syncDaysToRange(next, setRangeStart, setRangeEnd);
                                    }
                                  }} />
                                  <span>공휴일/주말 제외</span>
                                </label>
                                <button type="button" className="clear-form-btn" onClick={() => resetEditForm()}>초기화</button>
                              </div>
                              <div className="edit-actions">
                                <button className="save-btn" onClick={() => saveEdit(todo.id)}>저장</button>
                                <button className="cancel-btn" onClick={() => setEditingId(null)}>취소</button>
                              </div>
                            </div>
                          ) : (
                            <div className="todo-content-row">
                              <div className="todo-info">
                                <div style={{ display: 'flex', gap: '8px', marginBottom: '4px' }}>
                                  <span style={{
                                    fontSize: '0.62rem',
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    background: '#818cf8',
                                    color: '#fff',
                                    fontWeight: 'bold'
                                  }}>
                                    ROUTINE
                                  </span>
                                </div>
                                <span style={{ fontSize: '0.95rem', fontWeight: 'bold', color: '#e2e8f0' }}>{todo.text}</span>
                                <div className="todo-meta-premium" style={{ marginTop: '6px' }}>
                                  {todo.scheduleMode !== 'memo' && todo.time && (
                                    <span className="todo-time-badge">{formatTime(todo.time)}</span>
                                  )}
                                  {todo.scheduleMode !== 'memo' && todo.days && (
                                    <span className="todo-days-tag">{todo.days}</span>
                                  )}
                                  {todo.scheduleMode === 'memo' && (
                                    <span className="memo-badge-small" style={{
                                      background: 'rgba(16, 185, 129, 0.2)',
                                      color: '#10b981',
                                      border: '1px solid rgba(16, 185, 129, 0.4)',
                                      fontSize: '0.65rem',
                                      padding: '2px 8px',
                                      borderRadius: '10px',
                                      fontWeight: 'bold'
                                    }}>📝 메모</span>
                                  )}
                                </div>
                              </div>
                              <div className="item-actions">
                                <button className="action-btn edit" onClick={() => startEdit(todo)}>수정</button>
                                <button className="action-btn delete" onClick={() => handleAdminDeleteTodo(todo.id, todo.text)}>삭제</button>
                              </div>
                            </div>
                          )}
                        </div>
                      ));
                    })()}
                  </div>
                </div>
              )}
              {myPageTab === 'alarm' && (
                <div className="mypage-section">
                  <p className="mypage-label">🔔 알람 받을 일정 유형</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', padding: '0 20px', marginBottom: '20px' }}>
                    {[
                      { key: 'all', icon: '📅', label: '일정+루틴', sub: '모두 알람' },
                      { key: 'schedule', icon: '🗓️', label: '일정만', sub: '스케줄 알람' },
                      { key: 'routine', icon: '🔁', label: '루틴만', sub: '루틴 알람' },
                      { key: 'off', icon: '🔕', label: '알람 끔', sub: '모든 알람 끔' },
                    ].map(({ key, icon, label, sub }) => (
                      <div
                        key={key}
                        onClick={() => setAlarmFilter(key)}
                        style={{
                          padding: '14px 12px',
                          borderRadius: '14px',
                          background: alarmFilter === key ? (key === 'off' ? 'rgba(239,68,68,0.15)' : 'rgba(99,102,241,0.2)') : 'rgba(255,255,255,0.04)',
                          border: `1px solid ${alarmFilter === key ? (key === 'off' ? 'rgba(239,68,68,0.5)' : 'rgba(99,102,241,0.5)') : 'rgba(255,255,255,0.08)'}`,
                          cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s',
                          boxShadow: alarmFilter === key ? '0 4px 15px rgba(0,0,0,0.2)' : 'none'
                        }}
                      >
                        <div style={{ fontSize: '1.6rem', marginBottom: '4px' }}>{icon}</div>
                        <div style={{ fontSize: '0.85rem', fontWeight: '900', color: alarmFilter === key ? '#fff' : '#94a3b8' }}>{label}</div>
                        <div style={{ fontSize: '0.7rem', color: alarmFilter === key ? 'rgba(255,255,255,0.7)' : '#475569', marginTop: '2px' }}>{sub}</div>
                      </div>
                    ))}
                  </div>
                  <p className="mypage-label">🔊 알람 소리 선택</p>
                  <div className="alarm-sound-grid" style={{ padding: '0 20px' }}>
                    {ALARM_SOUNDS.map(s => (
                      <div key={s.id} className={`alarm-sound-item ${alarmSound === s.id ? 'selected' : ''}`} onClick={() => setAlarmSound(s.id)}>
                        <div className="alarm-sound-top">
                          <span className="alarm-sound-name">{s.name}</span>
                          <button className="alarm-preview-btn" onClick={(e) => { e.stopPropagation(); playAlarmSound(s.id); }}>▶</button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="voice-alarm-setting" style={{ marginTop: '20px', padding: '0 20px' }}>
                    <div
                      className={`voice-alarm-toggle ${useVoiceAlarm ? 'active' : ''}`}
                      onClick={() => {
                        const next = !useVoiceAlarm;
                        setUseVoiceAlarm(next);
                        if (next) speakText("음성 알람이 활성화되었습니다.", selectedVoiceName);
                      }}
                      style={{
                        padding: '15px',
                        background: useVoiceAlarm ? 'rgba(56, 189, 248, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                        border: `1px solid ${useVoiceAlarm ? '#38bdf8' : 'rgba(255,255,255,0.1)'}`,
                        borderRadius: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        marginBottom: '10px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '1.2rem' }}>🎙️</span>
                        <div>
                          <p style={{ margin: 0, fontWeight: 'bold', fontSize: '0.95rem' }}>음성 알람 읽어주기</p>
                          <p style={{ margin: 0, fontSize: '0.75rem', opacity: 0.6 }}>알람 시 내용과 확언을 읽어줍니다.</p>
                        </div>
                      </div>
                      <div className={`toggle-switch ${useVoiceAlarm ? 'on' : ''}`} />
                    </div>

                    {useVoiceAlarm && (
                      <div className="voice-selector-container" style={{ padding: '10px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px' }}>
                        <p style={{ margin: '0 0 8px 0', fontSize: '0.8rem', opacity: 0.7 }}>🗣️ 목소리 선택</p>
                        <select
                          value={selectedVoiceName}
                          onChange={(e) => {
                            setSelectedVoiceName(e.target.value);
                            speakText("새로운 목소리가 설정되었습니다.", e.target.value);
                          }}
                          style={{
                            width: '100%',
                            padding: '10px',
                            background: '#1e293b',
                            color: 'white',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '8px',
                            fontSize: '0.9rem'
                          }}
                        >
                          <option value="">기본 음성</option>
                          {voices
                            .filter(v => v.lang.includes('ko'))
                            .map(v => (
                              <option key={v.name} value={v.name}>{v.name}</option>
                            ))
                          }
                        </select>
                      </div>
                    )}
                  </div>
                </div>
              )}
              {myPageTab === 'password' && (
                <div className="mypage-section">
                  <p className="mypage-label">🔑 비밀번호 변경</p>
                  <div className="pw-change-form" style={{ padding: '0 20px' }}>
                    <input type="password" placeholder="현재 비밀번호" value={currentPw} onChange={e => { setCurrentPw(e.target.value); setPwError(''); setPwMessage(''); }} className="mypage-input" />
                    <input type="password" placeholder="새 비밀번호" value={newPw} onChange={e => { setNewPw(e.target.value); setPwError(''); setPwMessage(''); }} className="mypage-input" />
                    <button className="pw-change-btn" onClick={handleChangePassword}>비밀번호 변경</button>
                    {pwError && <p className="pw-msg error">{pwError}</p>}
                    {pwMessage && <p className="pw-msg success">{pwMessage}</p>}
                  </div>
                </div>
              )}
              {myPageTab === 'avatar' && (
                <div className="mypage-section">
                  <p className="mypage-label">😊 아바타 선택</p>
                  <div className="avatar-grid" style={{ padding: '0 20px' }}>
                    {AVATARS.map(val => (
                      <button key={val} className={`avatar-option ${userAvatar === val ? 'selected' : ''}`} onClick={() => handleSelectAvatar(val)}>
                        <RenderAvatar avatar={val} />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===== 성공의 방 모달 ===== */}
      {
        showSuccessRoom && (
          <div className="modal-overlay full-screen" onClick={() => setShowSuccessRoom(false)}>
            <div className="affirmation-modal full-screen" onClick={e => e.stopPropagation()}>
              <div className="modal-sticky-area" style={{ position: 'sticky', top: 0, zIndex: 1000, background: '#0f172a' }}>
                <div className="modal-header">
                  <div className="modal-header-left-room">
                    <h2>🏛️ 성공의 방</h2>
                    <div className="room-header-avatar">
                      <RenderAvatar avatar={userAvatar} />
                    </div>
                  </div>
                  <div className="modal-header-right">
                    <span className="room-points-display">💰 {userPoints.toLocaleString()}P</span>
                    <button className="modal-close-x" onClick={() => setShowSuccessRoom(false)}>✕</button>
                  </div>
                </div>
              </div>

              <div className="success-room-container no-scrollbar" style={{ padding: '0 15px 60px 15px' }}>
                <div className="room-display">
                  <div className="room-background">
                    {/* 아바타가 헤더로 이동됨 */}
                    <div className="room-items-grid">
                      {SUCCESS_ITEMS.filter(item => ownedItems.includes(item.id)).map(item => (
                        <div key={item.id} className="room-item-placed" title={item.name}>
                          <span className="item-icon">{item.icon}</span>
                          <span className="item-label">{item.name}</span>
                        </div>
                      ))}
                      {ownedItems.length === 0 && <p className="empty-room-msg">아직 텅 비어있네요.<br />노력의 결실로 방을 채워보세요!</p>}
                    </div>
                  </div>
                </div>

                <div className="room-actions" style={{ justifyContent: 'center', display: 'flex' }}>
                  <button className="room-reset-btn" onClick={handleResetRoom}>🧹 방 설정 초기화</button>
                </div>

                <div className="success-store">
                  <h3>💎 포인트 상점 (성공의 전유물)</h3>
                  <div className="store-grid">
                    {SUCCESS_ITEMS.map(item => (
                      <div key={item.id} className={`store-item ${ownedItems.includes(item.id) ? 'owned' : ''}`}>
                        <span className="store-icon">{item.icon}</span>
                        <div className="store-info">
                          <span className="store-name">{item.name}</span>
                          <span className="store-cost">{item.cost}P</span>
                        </div>
                        <button
                          className="buy-btn"
                          disabled={ownedItems.includes(item.id)}
                          onClick={() => handlePurchaseItem(item)}
                        >
                          {ownedItems.includes(item.id) ? '보유중' : '구매'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      }
      {/* ===== 데이터 관리 모달 (관리자 전용) ===== */}
      {
        showAdminPanel && (
          <div className="modal-overlay full-screen admin-overlay" onClick={() => setShowAdminPanel(false)}>
            <div className="affirmation-modal full-screen" onClick={e => e.stopPropagation()}>
              <div className="modal-sticky-area" style={{ position: 'sticky', top: 0, zIndex: 1000, background: '#0f172a' }}>
                <div className="modal-header">
                  <h2>⚙️ 데이터 통합 관리</h2>
                  <button className="modal-close-x" onClick={() => setShowAdminPanel(false)}>✕</button>
                </div>
              </div>

              <div className="admin-panel-content" style={{ display: 'flex', flexDirection: 'column', gap: '24px', padding: '20px 15px 60px 15px' }}>
                <div className="admin-section" style={{ background: 'rgba(255,255,255,0.05)', padding: '15px', borderRadius: '16px' }}>
                  <h3 style={{ color: '#fff', fontSize: '1rem', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>📅 루틴 / 일정 전체</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <button className="pw-change-btn" onClick={() => handleSpecificExport('todos', '루틴일정_전체')} style={{ padding: '0.6rem', fontSize: '0.9rem', background: 'linear-gradient(135deg, #4f46e5, #3730a3)' }}>내보내기</button>
                    <label className="pw-change-btn" style={{ padding: '0.6rem', fontSize: '0.9rem', background: 'linear-gradient(135deg, #0ea5e9, #0284c7)', cursor: 'pointer', textAlign: 'center' }}>
                      가져오기
                      <input type="file" accept=".xlsx, .xls" onChange={(e) => handleSpecificImport(e, 'todos')} style={{ display: 'none' }} />
                    </label>
                  </div>
                </div>

                <div className="admin-section" style={{ background: 'rgba(255,255,255,0.05)', padding: '15px', borderRadius: '16px' }}>
                  <h3 style={{ color: '#fff', fontSize: '1rem', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>✨ 긍정확언 관리</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <button className="pw-change-btn" onClick={() => handleSpecificExport('positive', '긍정확언')} style={{ padding: '0.6rem', fontSize: '0.9rem', background: 'linear-gradient(135deg, #10b981, #059669)' }}>내보내기</button>
                    <label className="pw-change-btn" style={{ padding: '0.6rem', fontSize: '0.9rem', background: 'linear-gradient(135deg, #0ea5e9, #0284c7)', cursor: 'pointer', textAlign: 'center' }}>
                      가져오기
                      <input type="file" accept=".xlsx, .xls" onChange={(e) => handleSpecificImport(e, 'positive')} style={{ display: 'none' }} />
                    </label>
                  </div>
                </div>

                <div className="admin-section" style={{ background: 'rgba(255,255,255,0.05)', padding: '15px', borderRadius: '16px' }}>
                  <h3 style={{ color: '#fff', fontSize: '1rem', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>💪 뼈때리는말 관리</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <button className="pw-change-btn" onClick={() => handleSpecificExport('tough', '뼈때리는말')} style={{ padding: '0.6rem', fontSize: '0.9rem', background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>내보내기</button>
                    <label className="pw-change-btn" style={{ padding: '0.6rem', fontSize: '0.9rem', background: 'linear-gradient(135deg, #0ea5e9, #0284c7)', cursor: 'pointer', textAlign: 'center' }}>
                      가져오기
                      <input type="file" accept=".xlsx, .xls" onChange={(e) => handleSpecificImport(e, 'tough')} style={{ display: 'none' }} />
                    </label>
                  </div>
                </div>

                <p style={{ color: '#f87171', fontSize: '0.8rem', textAlign: 'center', marginTop: '10px' }}>※ 가져오기 시 해당 카테고리의 기존 데이터는 삭제됩니다.</p>
              </div>
            </div>
          </div>
        )
      }


      <div className={`todo-container ${scheduleMode}-mode`}>
        <div className="main-sticky-wrapper">
          <div className="app-header-premium" style={{ margin: 0 }}>
            <div className="header-topmost-row">
              <div className="brand-logo" onClick={() => { setShowSuccessRoom(false); setShowMyPage(false); setShowScheduleCalendar(true); }}>
                <img src="/logo512.png" alt="Routine Core Logo" className="header-logo-img" />
                <h1>Routine<br /><span>Core</span></h1>
              </div>

              <div className="user-profile-compact" onClick={() => setShowMyPage(true)}>
                <div className="profile-info-left">
                  <div className="points-pill-small">💰 {userPoints.toLocaleString()}</div>
                  <div className="progress-mini-row">
                    <div className="progress-mini-bar-bg">
                      <div className="progress-mini-bar-fill" style={{ height: `${progress}%` }}></div>
                    </div>
                    <span className="progress-mini-text">{Math.round(progress)}%</span>
                  </div>
                </div>
                <div className="profile-avatar-group">
                  <div className="header-avatar-circle">
                    <RenderAvatar avatar={userAvatar} />
                  </div>
                  <span className="user-name-label">{currentUser}</span>
                </div>
              </div>

              <button className="top-logout-btn" onClick={() => {
                setIsAuthenticated(false);
                setCurrentUser('');
                localStorage.removeItem('routine_auth');
                localStorage.removeItem('routine_user');
              }}>🚪 나가기</button>
            </div>

            <div className="header-action-grid">
              <button className="nav-btn calendar" onClick={() => { setShowSuccessRoom(false); setShowMyPage(false); setShowScheduleCalendar(true); }}>📅 일정 캘린더</button>
              <button className="nav-btn room" onClick={() => { setShowScheduleCalendar(false); setShowMyPage(false); setShowSuccessRoom(true); }}>🏛️ 성공의 방</button>
              <button className="nav-btn my" onClick={() => { setShowScheduleCalendar(false); setShowSuccessRoom(false); setShowMyPage(true); }}>👤 MY</button>
              {showInstallBtn && (
                <button className="nav-btn install" onClick={handleInstallClick} style={{ background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', border: 'none', fontWeight: 'bold' }}>📲 앱 설치</button>
              )}
              {currentUser === 'master' && (
                <button className="nav-btn admin" onClick={() => setShowAdminPanel(true)} style={{ background: 'rgba(239, 68, 68, 0.12)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.25)', fontSize: '0.64rem' }}>⚙️ 관리</button>
              )}
            </div>
            <div className="current-header-time">
              {formatCurrentTime(currentTime)}
            </div>
          </div>
        </div>
        <div style={{ padding: '0 1.2rem 1.2rem' }}>
          <div className="input-group scheduler">
            <div className="mode-toggle-group" style={{ marginBottom: '0.5rem' }}>
                {([
                  { key: 'schedule', label: '일정', full: '📅 일정', color: '#3b82f6' },
                  { key: 'routine', label: '루틴', full: '🔁 루틴', color: '#8b5cf6' },
                  { key: 'memo', label: '메모', full: '📝 메모', color: '#10b981' }
                ]).map(({ key, label, full }) => (
                  <button
                    key={key}
                    className={`mode-toggle-btn ${scheduleMode === key ? 'active' : ''}`}
                    onClick={() => {
                      setScheduleMode(key);
                      // [남개발 부장] 버튼 클릭 시 입력창에 해당 키워드 자동 주입 (사용자 편의성 극대화)
                      const currentVal = inputValue.trim();
                      const keywords = ['일정', '루틴', '메모'];
                      let hasKeyword = keywords.some(k => currentVal.startsWith(k));
                      
                      if (!currentVal || hasKeyword) {
                        // 비어있거나 이미 키워드로 시작하면 교체
                        setInputValue(`${label} `);
                      } else {
                        // 내용이 있으면 앞에 추가 (기존 내용 보존)
                        setInputValue(`${label} ${currentVal}`);
                      }
                      
                      // 입력창으로 포커스 이동 (선택 사항)
                      document.querySelector('.todo-input-main')?.focus();
                    }}
                  style={{
                    flex: 1,
                    padding: '0.4rem 0.6rem',
                    borderRadius: '10px',
                    border: '1px solid rgba(255,255,255,0.1)',
                    background: scheduleMode === key
                      ? (key === 'schedule' ? 'rgba(59,130,246,0.2)' : key === 'routine' ? 'rgba(139,92,246,0.2)' : 'rgba(16,185,129,0.2)')
                      : 'rgba(255,255,255,0.03)',
                    color: scheduleMode === key
                      ? (key === 'schedule' ? '#60a5fa' : key === 'routine' ? '#a78bfa' : '#34d399')
                      : '#94a3b8',
                    fontSize: '0.8rem',
                    fontWeight: scheduleMode === key ? '700' : '500',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  >
                    {full}
                  </button>
                ))}
            </div>
            <div className="input-with-voice">
              <input
                type="text"
                className="todo-input-main"
                placeholder="일정이나 루틴을 입력하세요..."
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                onKeyPress={e => e.key === 'Enter' && handleAddTodo()}
              />
              <button className={`voice-btn ${isListening ? 'listening' : ''}`} onClick={startVoiceCommand}>
                <span className="mic-icon">{isListening ? '🛑' : '🎤'}</span>
              </button>
            </div>
            <div className="day-selector-wrap">
              <div className="days-toggle-row">
                {['월', '화', '수', '목', '금', '토', '일'].map(d => (
                  <button key={d} className={`day-btn ${selectedDays.includes(d) ? 'active' : ''}`} onClick={() => {
                    const next = selectedDays.includes(d) ? selectedDays.filter(x => x !== d) : [...selectedDays, d];
                    setSelectedDays(next);
                    syncDaysToRange(next, setRangeStart, setRangeEnd);
                  }}>{d}</button>
                ))}
              </div>
              <div className="input-helper-row">
                <div className="left-options">
                  <label className="holiday-toggle">
                    <input type="checkbox" checked={excludeHolidays} onChange={e => {
                      const isChecked = e.target.checked;
                      setExcludeHolidays(isChecked);
                      const nextDays = isChecked ? ['월', '화', '수', '목', '금'] : ['월', '화', '수', '목', '금', '토', '일'];
                      setSelectedDays(nextDays);
                      syncDaysToRange(nextDays, setRangeStart, setRangeEnd);
                    }} />
                    <span>주말 제외</span>
                  </label>
                  <button type="button" className="calendar-picker-btn" title="날짜 선택" onClick={handleOpenCalendar}>📅 {rangeStart ? (rangeEnd && rangeEnd !== rangeStart ? `${rangeStart.slice(5)} ~ ${rangeEnd.slice(5)}` : rangeStart.slice(5)) : '날짜'}</button>
                </div>
                <button type="button" className="clear-form-btn" onClick={() => resetForm(false)}>초기화</button>
              </div>
            </div>
            <div className="time-selector-group scroll-style">
              <div className="ampm-toggle-group">
                {['오전', '오후'].map(p => (
                  <button key={p} className={`ampm-option ${ampm === p ? 'selected' : ''}`} onClick={() => setAmpm(p)}>{p}</button>
                ))}
              </div>
              <div className="scroll-picker-container">
                <ScrollPicker options={Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'))} value={hour} onChange={setHour} unit="시" />
                <ScrollPicker options={Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'))} value={minute} onChange={setMinute} unit="분" />
              </div>
              <button className="now-btn" onClick={() => {
                const now = new Date();
                const h = now.getHours();
                const m = now.getMinutes();
                setAmpm(h < 12 ? '오전' : '오후');
                setHour(String(h % 12 || 12).padStart(2, '0'));
                setMinute(String(Math.round(m / 5) * 5 % 60).padStart(2, '0'));
              }}>지금</button>
              <button className="add-btn-small" onClick={handleAddTodo}>예약</button>
            </div>
          </div>

          <div className="list-controls" style={{ paddingBottom: '10px', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
            <div className="filter-btns">
              <button className={`filter-btn ${listFilter === 'all' ? 'active' : ''}`} onClick={() => setListFilter('all')}>전체</button>
              <button className={`filter-btn ${listFilter === 'routine' ? 'active' : ''}`} onClick={() => setListFilter('routine')}>🔄 루틴</button>
              <button className={`filter-btn ${listFilter === 'schedule' ? 'active' : ''}`} onClick={() => setListFilter('schedule')}>📅 일정</button>
              <button className={`filter-btn ${listFilter === 'memo' ? 'active' : ''}`} onClick={() => setListFilter('memo')}>📝 메모</button>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  placeholder="검색..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{
                    padding: '6px 12px 6px 32px',
                    borderRadius: '8px',
                    border: '1px solid rgba(255,255,255,0.1)',
                    background: 'rgba(255,255,255,0.05)',
                    color: '#f1f5f9',
                    fontSize: '0.8rem',
                    outline: 'none',
                    width: '120px',
                    transition: 'all 0.2s ease'
                  }}
                  onFocus={e => e.target.style.width = '160px'}
                  onBlur={e => e.target.style.width = '120px'}
                />
                <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.9rem' }}>🔍</span>
              </div>
              <button className="sort-toggle-btn" onClick={() => setListSort(prev => prev === 'asc' ? 'desc' : 'asc')}>
                {listSort === 'asc' ? '⏲️ 시간순' : '⏲️ 역순'}
              </button>
            </div>
          </div>
          <h2 className="section-title-premium">📋 오늘의 루틴 리스트</h2>
        <ul className="todo-list">
          {(() => {
            const currentDay = DAYS_OF_WEEK[new Date().getDay()];
            const todayStr = toStdDateStr(new Date());

            const filtered = todos.filter(t => {
              if (editingId === t.id) return true;
              if (searchQuery.trim()) {
                const query = searchQuery.toLowerCase();
                if (!t.text.toLowerCase().includes(query)) return false;
              }

              const dayList = t.days ? t.days.split(',').map(d => d.trim()).filter(Boolean) : [];
              const isScheduledToday = dayList.length === 0 || dayList.includes(currentDay);

              const d = new Date();
              const todayDateStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
              const isInDateRange = (!t.startDate || todayDateStr >= t.startDate) && (!t.endDate || todayDateStr <= t.endDate);
              const isPastEnded = t.endDate && t.endDate < todayDateStr;
              const isFutureStart = t.startDate && t.startDate > todayDateStr;

              const mode = t.scheduleMode || 'routine';
              const shouldShowByDate = !isPastEnded && !isFutureStart;
              const isShownToday = isScheduledToday && shouldShowByDate;

              if (listFilter === 'all') return isShownToday;
              if (listFilter === 'routine') return mode === 'routine' && isShownToday;
              if (listFilter === 'schedule') return mode === 'schedule' && isShownToday;
              if (listFilter === 'memo') return mode === 'memo' && isShownToday;
              return false;
            });

            if (filtered.length === 0) {
              return (
                <div className="empty-state">
                  <span className="empty-icon">☕</span>
                  <p>오늘의 모든 미션을 완료하셨습니다! ✨</p>
                </div>
              );
            }

            const sorted = [...filtered].sort((a, b) => {
              const compA = completions.some(c => String(c.todo_id) === String(a.id) && c.date === todayStr);
              const compB = completions.some(c => String(c.todo_id) === String(b.id) && c.date === todayStr);
              if (compA !== compB) return compA ? 1 : -1;

              const timeA = a.time || '99:99';
              const timeB = b.time || '99:99';
              if (timeA !== timeB) {
                return listSort === 'asc' ? timeA.localeCompare(timeB) : timeB.localeCompare(timeA);
              }
              return (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0);
            });

            const groups = {
              schedule: sorted.filter(t => t.scheduleMode === 'schedule'),
              routine: sorted.filter(t => (t.scheduleMode || 'routine') === 'routine'),
              memo: sorted.filter(t => t.scheduleMode === 'memo')
            };

            const renderTodoItem = (todo) => {
              const todoIdStr = String(todo.id);
              const isDone = completions.some(c => String(c.todo_id) === todoIdStr && c.date === todayStr);
              
              const handleTouchStart = (e, id) => {
                touchStartX.current = e.touches[0].clientX;
                setSwipingId(id);
                setSwipeOffset(0);
              };

              const handleTouchMove = (e, id) => {
                if (swipingId !== id) return;
                const currentX = e.touches[0].clientX;
                const diff = currentX - touchStartX.current;
                let offset = diff;
                if (Math.abs(diff) > 120) {
                  offset = diff > 0 ? 120 + (diff - 120) * 0.2 : -120 + (diff + 120) * 0.2;
                }
                setSwipeOffset(offset);
              };

              const handleTouchEnd = (e, todo) => {
                if (swipingId !== todo.id) return;
                const threshold = 100;
                if (swipeOffset > threshold) {
                  toggleTodo(todo);
                } else if (swipeOffset < -threshold) {
                  startEdit(todo);
                }
                setSwipingId(null);
                setSwipeOffset(0);
              };

              return (
                <div key={`${todo.scheduleMode}-${todoIdStr}`} className="todo-swipe-container">
                  <div className={`swipe-background success`} style={{ opacity: swipingId === todo.id && swipeOffset > 20 ? Math.min(swipeOffset / 80, 1) : 0 }}>
                    <span>✅ 성공 처리</span>
                  </div>
                  <div className={`swipe-background edit`} style={{ opacity: swipingId === todo.id && swipeOffset < -20 ? Math.min(Math.abs(swipeOffset) / 80, 1) : 0 }}>
                    <span>📝 수정하기</span>
                  </div>

                  <li 
                    id={`todo-${todoIdStr}`} 
                    className={`todo-item ${isDone ? 'completed' : ''} ${todo.isFailed ? 'failed' : ''} ${editingId === todo.id ? 'editing' : ''} ${lastAddedId === todo.id ? 'newly-added' : ''} ${swipingId === todo.id ? 'swiping' : ''}`}
                    style={{ transform: swipingId === todo.id ? `translateX(${swipeOffset}px)` : 'translateX(0)' }}
                    onTouchStart={(e) => handleTouchStart(e, todo.id)}
                    onTouchMove={(e) => handleTouchMove(e, todo.id)}
                    onTouchEnd={(e) => handleTouchEnd(e, todo)}
                  >
                    {editingId === todo.id ? (
                      <div className="edit-container">
                        <input type="text" value={editValue} onChange={e => setEditValue(e.target.value)} className="edit-input" />
                        <div className="edit-days-row">
                          {['월', '화', '수', '목', '금', '토', '일'].map(d => (
                            <button key={d} className={`edit-day-btn ${editDays.includes(d) ? 'active' : ''}`} onClick={() => {
                              const next = editDays.includes(d) ? editDays.filter(x => x !== d) : [...editDays, d];
                              setEditDays(next);
                              syncDaysToRange(next, setRangeStart, setRangeEnd);
                            }}>{d}</button>
                          ))}
                        </div>
                        <div className="input-helper-row edit-mode">
                          <div className="left-options">
                            <label className="holiday-toggle">
                              <input type="checkbox" checked={editExcludeHolidays} onChange={e => {
                                const isChecked = e.target.checked;
                                setEditExcludeHolidays(isChecked);
                                const next = isChecked ? ['월', '화', '수', '목', '금'] : ['월', '화', '수', '목', '금', '토', '일'];
                                setEditDays(next);
                                syncDaysToRange(next, setRangeStart, setRangeEnd);
                              }} />
                              <span>주말 제외</span>
                            </label>
                            <button type="button" className="calendar-picker-btn" title="날짜 선택" onClick={handleOpenCalendar}>📅 {rangeStart ? (rangeEnd && rangeEnd !== rangeStart ? `${rangeStart.slice(5)} ~ ${rangeEnd.slice(5)}` : rangeStart.slice(5)) : '날짜'}</button>
                          </div>
                          <button type="button" className="clear-form-btn" onClick={() => { resetEditForm(); }}>초기화</button>
                        </div>

                        <div className="time-selector-group scroll-style edit-time-picker">
                          <div className="ampm-toggle-group">
                            {['오전', '오후'].map(p => (
                              <button key={p} className={`ampm-option ${editAmpm === p ? 'selected' : ''}`} onClick={() => setEditAmpm(p)}>{p}</button>
                            ))}
                          </div>
                          <div className="scroll-picker-container">
                            <ScrollPicker options={Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'))} value={editHour} onChange={setEditHour} unit="시" />
                            <ScrollPicker options={Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'))} value={editMinute} onChange={setEditMinute} unit="분" />
                          </div>
                        </div>

                        <div className="edit-actions">
                          <button className="save-btn" onClick={() => saveEdit(todo.id)}>저장</button>
                          <button className="cancel-btn" onClick={() => setEditingId(null)}>취소</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="todo-left" onClick={(e) => {
                          if (e.target.type === 'checkbox') return;
                          startEdit(todo);
                        }} style={{ cursor: 'pointer' }}>
                          <input
                            id={`dash-chk-${todo.scheduleMode}-${todoIdStr}`}
                            type="checkbox"
                            checked={isDone}
                            onChange={(e) => {
                              e.stopPropagation();
                              toggleTodo(todo);
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="todo-checkbox"
                          />
                          <div className="content-group">
                            <div className="todo-meta">
                              {todo.scheduleMode !== 'memo' && todo.time && (
                                <span className="todo-time-display">⏰ {formatTime(todo.time)}</span>
                              )}
                              {todo.scheduleMode !== 'memo' && todo.days && (
                                <span className="todo-days-tag">{todo.days}</span>
                              )}
                              {todo.scheduleMode === 'memo' && (
                                <span className="memo-badge" style={{
                                  background: 'rgba(16, 185, 129, 0.2)',
                                  color: '#10b981',
                                  border: '1px solid rgba(16, 185, 129, 0.4)',
                                  fontSize: '0.65rem',
                                  padding: '2px 8px',
                                  borderRadius: '10px',
                                  fontWeight: 'bold'
                                }}>📝 메모</span>
                              )}
                              {!!todo.excludeHolidays && <span className="holiday-tag">🚫휴</span>}
                              {!!todo.isFailed && (
                                <span className="failed-tag" style={{
                                  background: isDone ? 'rgba(239, 68, 68, 0.1)' : 'rgba(239, 68, 68, 0.2)',
                                  color: isDone ? '#fca5a5' : '#f87171',
                                  border: `1px solid ${isDone ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.4)'}`,
                                  fontSize: '0.65rem',
                                  padding: '1px 6px',
                                  borderRadius: '10px',
                                  fontWeight: 'bold',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '3px'
                                }}>
                                  {isDone ? '✅ 밀당완료' : '🧘 쉬어감'}
                                </span>
                              )}
                              {isDone && !todo.isFailed && (
                                <span className="success-tag" style={{
                                  background: 'rgba(16, 185, 129, 0.15)',
                                  color: '#10b981',
                                  border: '1px solid rgba(16, 185, 129, 0.3)',
                                  fontSize: '0.65rem',
                                  padding: '1px 6px',
                                  borderRadius: '10px',
                                  fontWeight: 'bold',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '3px'
                                }}>
                                  ✅ 성공
                                </span>
                              )}
                            </div>
                            <span className="todo-text">
                              {todo.scheduleMode === 'schedule' ? '📅 ' :
                                todo.scheduleMode === 'memo' ? (todo.text.includes('아이디어') ? '💡 ' : '📝 ') :
                                  '🔄 '}{todo.text}
                            </span>
                          </div>
                        </div>
                        <div className="todo-item-action-hint">탭하여 수정 →</div>
                      </>
                    )}
                  </li>
                </div>
              );
            };

            return (
              <>
                {groups.schedule.length > 0 && (
                  <>
                    <div className="category-group-header schedule">📅 오늘 일정 <span>{groups.schedule.length}</span></div>
                    {groups.schedule.map(renderTodoItem)}
                  </>
                )}
                {groups.routine.length > 0 && (
                  <>
                    <div className="category-group-header routine">🔄 오늘의 루틴 <span>{groups.routine.length}</span></div>
                    {groups.routine.map(renderTodoItem)}
                  </>
                )}
                {groups.memo.length > 0 && (
                  <>
                    <div className="category-group-header memo">📝 오늘의 메모 <span>{groups.memo.length}</span></div>
                    {groups.memo.map(renderTodoItem)}
                  </>
                )}
              </>
            );
          })()
          }
        </ul>
        </div>
      </div>

      {/* [남개발 부장] 기간 선택 캘린더 모달 엔진 - 최상위 프래그먼트로 탈출! */}
      {showCalendar && (
        <div className="date-picker-overlay scroll-style" onClick={() => setShowCalendar(false)}>
          <div className="date-picker-modal" onClick={e => e.stopPropagation()}>
            <div className="calendar-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <button onClick={handlePrevMonth} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '1.2rem' }}>◀</button>
                <h3 style={{ margin: 0, minWidth: '120px', textAlign: 'center' }}>📅 {calendarYear}년 {calendarMonth + 1}월</h3>
                <button onClick={handleNextMonth} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '1.2rem' }}>▶</button>
              </div>
              <button className="close-cal-btn" onClick={() => setShowCalendar(false)}>✕</button>
            </div>

            <div className="calendar-grid">
              {(() => {
                const year = calendarYear;
                const month = calendarMonth;
                const firstDay = new Date(year, month, 1).getDay();
                const lastDate = new Date(year, month + 1, 0).getDate();
                const days = [];

                // 빈 칸
                for (let i = 0; i < firstDay; i++) days.push(null);
                // 날짜
                for (let i = 1; i <= lastDate; i++) days.push(new Date(year, month, i));



                return (
                  <>
                    {['일', '월', '화', '수', '목', '금', '토'].map(d => <div key={d} className="calendar-weekday">{d}</div>)}
                    {days.map((d, i) => {
                      if (!d) return <div key={`empty-${i}`} className="calendar-day-empty"></div>;
                      const dateStr = toStdDateStr(d);
                      const isToday = dateStr === toStdDateStr(new Date());
                      const isStart = rangeStart === dateStr;
                      const isEnd = rangeEnd === dateStr;
                      const isInRange = rangeStart && rangeEnd && dateStr > rangeStart && dateStr < rangeEnd;

                      return (
                        <div
                          key={dateStr}
                          className={`calendar-day ${isToday ? 'today' : ''} ${isStart ? 'start' : ''} ${isEnd ? 'end' : ''} ${isInRange ? 'in-range' : ''}`}
                          onClick={() => {
                            // [남개발 부장] 시작일이 고정되어 있으므로 클릭하는 즉시 종료일로 간주!
                            const currentD = new Date(d);
                            const startD = new Date(rangeStart);

                            if (currentD < startD) {
                              // 만약 시작일보다 앞쪽을 누르면 시작일을 그날로 옮김 (유연성 확보)
                              setRangeStart(dateStr);
                              setRangeEnd(null);
                            } else {
                              setRangeEnd(dateStr);
                            }
                          }}
                        >
                          {d.getDate()}
                        </div>
                      );
                    })}
                  </>
                );
              })()}
            </div>

            {rangeStart && (
              <div className="calendar-info-card">
                <div className="task-preview-row">
                  <span className="task-emoji">📌</span>
                  <div className="task-main-info">
                    <span className="task-text-preview">{(editingId ? editValue : inputValue) || '(일정 내용을 입력해주세요)'}</span>
                    <span className="task-time-preview">⏰ {(editingId ? editAmpm : ampm)} {(editingId ? editHour : hour)}:{(editingId ? editMinute : minute)}</span>
                  </div>
                </div>

                <div className="range-summary">
                  <span className="date-badge start">{rangeStart}</span>
                  <span className="arrow">➜</span>
                  <span className="date-badge end">{rangeEnd || '종료일 선택'}</span>
                </div>
                {rangeStart && rangeEnd && (
                  <button className="confirm-range-btn" onClick={() => {
                    // [남개발 부장] 기간에 해당하는 요일들을 자동으로 추출하여 UI에 즉시 반영!
                    const autoDays = getDaysInRange(rangeStart, rangeEnd);
                    if (editingId) {
                      setEditDays(autoDays);
                      setEditExcludeHolidays(false); // 수동 보정을 위해 체크 해제
                    } else {
                      setSelectedDays(autoDays);
                      setExcludeHolidays(false);
                    }

                    alert(`[설정완료] "${editingId ? editValue : inputValue}" 일정을\n${rangeStart} ~ ${rangeEnd} 기간으로 확정하며\n요일은 [${autoDays.join(', ')}]으로 자동 설정되었습니다.`);
                    setShowCalendar(false);
                  }}>이 기간으로 확정</button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export default App;
