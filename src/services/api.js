const API_BASE = window.location.port === '5173' ? `http://${window.location.hostname}:3000` : '';

export const API_URLS = {
  TODOS: `${API_BASE}/api/todos`,
  COMPLETIONS: `${API_BASE}/api/daily-completions`,
  AFFIRMATIONS: `${API_BASE}/api/affirmations`,
  LOGIN: `${API_BASE}/api/login`,
  REGISTER: `${API_BASE}/api/register`,
  CHANGE_PW: `${API_BASE}/api/change-password`,
  PROFILE: `${API_BASE}/api/profile`,
  UPDATE_PROFILE: `${API_BASE}/api/update-profile`,
  ADMIN_EXPORT: `${API_BASE}/api/admin/export`,
  ADMIN_IMPORT: `${API_BASE}/api/admin/import`,
  PUSH_SUBSCRIBE: `${API_BASE}/api/push-subscribe`,
  PURCHASE_ITEM: `${API_BASE}/api/purchase-item`,
  USER_ITEMS: `${API_BASE}/api/user-items`,
  USER_ITEMS_RESET: `${API_BASE}/api/user-items/reset`,
  STATS_HEATMAP: `${API_BASE}/api/stats/heatmap`,
  ACTIVATE_WEEKLY: `${API_BASE}/api/todos/activate-weekly`,
};

export const fetchAPI = async (url, options = {}) => {
  const token = localStorage.getItem('routine_token');
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (response.status === 401 || response.status === 403) {
    // [남개발 부장] 토큰 만료 또는 권한 없음: 자동 로그아웃 처리
    localStorage.removeItem('routine_token');
    localStorage.removeItem('routine_user');
    localStorage.removeItem('routine_auth');
    if (window.location.pathname !== '/') {
        window.location.href = '/';
    }
    throw new Error('인증이 만료되었습니다. 다시 로그인해 주세요.');
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'API call failed');
  }
  
  if (response.status === 204) return null;
  return response.json();
};
