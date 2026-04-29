import { useState, useEffect } from 'react';
import { API_URLS, fetchAPI } from '../services/api';

export const useAuth = () => {
  const [currentUser, setCurrentUser] = useState(() => {
    const stored = localStorage.getItem('routine_user') || '';
    // 잘못된 값이 저장된 경우 무시
    if (!stored || stored === '--choose--' || stored.startsWith('-')) return '';
    return stored;
  });
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    const user = localStorage.getItem('routine_user') || '';
    const token = localStorage.getItem('routine_token') || '';
    const auth = localStorage.getItem('routine_auth') || '';
    // 세 가지 모두 유효해야 인증된 것으로 처리
    const isValidUser = user && user !== '--choose--' && !user.startsWith('-') && !user.includes('=');
    if (!isValidUser || !token || auth !== 'true') return false;
    return true;
  });
  const [userAvatar, setUserAvatar] = useState(localStorage.getItem('routine_avatar') || '😊');
  const [userPoints, setUserPoints] = useState(0);
  const [ownedItems, setOwnedItems] = useState([]);

  useEffect(() => {
    const token = localStorage.getItem('routine_token');
    const user = localStorage.getItem('routine_user');
    // 유효하지 않은 값이면 localStorage 정리 후 로그인 화면으로 (reload 없이)
    const isInvalidUser = !user || user === '--choose--' || user.startsWith('-') || user.includes('=');
    if (!token || isInvalidUser) {
      // 잘못된 값만 선택적으로 제거 (전체 clear + reload는 무한 깜빡임 유발)
      localStorage.removeItem('routine_auth');
      localStorage.removeItem('routine_user');
      localStorage.removeItem('routine_token');
      setIsAuthenticated(false);
      setCurrentUser('');
      return;
    }
    setIsAuthenticated(true);
    setCurrentUser(user);
  }, []);

  const fetchProfile = async () => {
    if (!currentUser || !isAuthenticated) return;
    try {
      const data = await fetchAPI(API_URLS.PROFILE);
      setUserAvatar(data.avatar || '😊');
      setUserPoints(data.points || 0);

      const items = await fetchAPI(API_URLS.USER_ITEMS);
      setOwnedItems(items);
    } catch (e) { console.error("Profile fetch failed", e); }
  };

  useEffect(() => {
    if (isAuthenticated) fetchProfile();
  }, [isAuthenticated, currentUser]);

  const login = async (username, password) => {
    try {
      const data = await fetchAPI(API_URLS.LOGIN, {
        method: 'POST',
        body: JSON.stringify({ username, password })
      });
      if (data.success) {
        localStorage.setItem('routine_token', data.token);
        localStorage.setItem('routine_user', data.username);
        localStorage.setItem('routine_auth', 'true');
        setCurrentUser(data.username);
        setIsAuthenticated(true);
        return { success: true };
      }
    } catch (e) {
      return { success: false, error: e.message };
    }
    return { success: false, error: '로그인 실패' };
  };

  const register = async (username, password, name) => {
    try {
      const data = await fetchAPI(API_URLS.REGISTER, {
        method: 'POST',
        body: JSON.stringify({ username, password, name })
      });
      return { success: data.success, message: data.message };
    } catch (e) {
      return { success: false, error: e.message };
    }
  };

  const logout = () => {
    setIsAuthenticated(false);
    setCurrentUser('');
    localStorage.removeItem('routine_auth');
    localStorage.removeItem('routine_user');
    localStorage.removeItem('routine_token');
  };

  return {
    currentUser,
    setCurrentUser,
    isAuthenticated,
    setIsAuthenticated,
    userAvatar,
    setUserAvatar,
    userPoints,
    setUserPoints,
    ownedItems,
    setOwnedItems,
    fetchProfile,
    login,
    register,
    logout
  };
};
