import { useState, useEffect, useRef } from 'react';
import { API_URLS, fetchAPI } from '../services/api';

export const useTodos = (currentUser, isAuthenticated) => {
  const [todos, setTodos] = useState([]);
  const [completions, setCompletions] = useState([]);
  const [heatmapData, setHeatmapData] = useState([]);
  const [affirmations, setAffirmations] = useState([]);
  const [lastAddedId, setLastAddedId] = useState(null);
  const togglingIdsRef = useRef(new Set());
  const [togglingIds, setTogglingIds] = useState(new Set());

  const updateTogglingIds = (updater) => {
    setTogglingIds(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      togglingIdsRef.current = next;
      return next;
    });
  };

  const fetchTodos = async () => {
    if (!currentUser) return;
    const sanitizedUser = currentUser;
    try {
      const data = await fetchAPI(`${API_URLS.TODOS}`);
      console.log("Fetched todos count:", data.length);
      const compData = await fetchAPI(`${API_URLS.COMPLETIONS}`);
      setCompletions(compData);

      setTodos(prev => {
        return data.map(item => {
          if (togglingIdsRef.current.has(String(item.id))) {
            const existing = prev.find(p => String(p.id) === String(item.id));
            return existing ? existing : item;
          }
          return item;
        });
      });
    } catch (e) { console.error("Fetch failed", e); }
  };

  const fetchAffirmations = async () => {
    if (!currentUser) return;
    try {
      const data = await fetchAPI(`${API_URLS.AFFIRMATIONS}?username=${currentUser}`);
      setAffirmations(data);
    } catch (e) { console.error("Affirmations fetch failed", e); }
  };

  const fetchHeatmapData = async () => {
    if (!currentUser) return;
    try {
      const data = await fetchAPI(`${API_URLS.STATS_HEATMAP}?username=${currentUser}`);
      setHeatmapData(data);
    } catch (e) { console.error("Heatmap fetch failed", e); }
  };

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchTodos();
    fetchHeatmapData();
    fetchAffirmations();
    const interval = setInterval(() => {
      fetchTodos();
    }, 3000);
    return () => clearInterval(interval);
  }, [isAuthenticated, currentUser]);

  return { 
    todos, 
    setTodos, 
    completions, 
    setCompletions, 
    heatmapData, 
    affirmations,
    setAffirmations,
    fetchTodos, 
    fetchHeatmapData,
    fetchAffirmations,
    lastAddedId,
    setLastAddedId,
    togglingIds,
    updateTogglingIds
  };
};
