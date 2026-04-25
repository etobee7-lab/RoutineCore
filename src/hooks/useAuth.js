import { useState, useEffect } from 'react';
import { API_URLS, fetchAPI } from '../services/api';

export const useAuth = () => {
  const [currentUser, setCurrentUser] = useState(() => localStorage.getItem('routine_user') || '');
  const [isAuthenticated, setIsAuthenticated] = useState(() => localStorage.getItem('routine_auth') === 'true');
  const [userAvatar, setUserAvatar] = useState(localStorage.getItem('routine_avatar') || '😊');
  const [userPoints, setUserPoints] = useState(0);
  const [ownedItems, setOwnedItems] = useState([]);

  useEffect(() => {
    localStorage.setItem('routine_user', currentUser);
    localStorage.setItem('routine_auth', isAuthenticated);
  }, [currentUser, isAuthenticated]);

  const fetchProfile = async () => {
    if (!currentUser) return;
    const sanitizedUser = currentUser.split('=')[0];
    try {
      const data = await fetchAPI(`${API_URLS.PROFILE}?username=${sanitizedUser}`);
      setUserAvatar(data.avatar || '😊');
      setUserPoints(data.points || 0);

      const items = await fetchAPI(`${API_URLS.USER_ITEMS}?username=${currentUser}`);
      setOwnedItems(items);
    } catch (e) { console.error("Profile fetch failed", e); }
  };

  useEffect(() => {
    if (isAuthenticated) fetchProfile();
  }, [isAuthenticated, currentUser]);

  const logout = () => {
    setIsAuthenticated(false);
    setCurrentUser('');
    localStorage.removeItem('routine_auth');
    localStorage.removeItem('routine_user');
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
    logout
  };
};
