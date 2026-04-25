const API_BASE = '';

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
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'API call failed');
  }
  if (response.status === 204) return null;
  return response.json();
};
