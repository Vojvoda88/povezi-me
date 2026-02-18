import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Ad, User } from '../types';
import { getApiBase } from '../api';
import { apiFetch } from '../lib/api/client';

const API_BASE = getApiBase();
const TOKEN_KEY = 'povezi_access_token';

const getAuthHeaders = (): HeadersInit => {
  const token = localStorage.getItem(TOKEN_KEY);
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export interface UseFavoritesResult {
  favorites: string[];
  fetchFavorites: () => void;
  toggleFavorite: (adId: string) => void;
  clearFavorites: () => void;
}

export const useFavorites = (currentUser: User | null, _ads: Ad[]): UseFavoritesResult => {
  const [favorites, setFavorites] = useState<string[]>([]);
  const navigate = useNavigate();

  const fetchFavorites = useCallback(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return;
    const url = `${API_BASE}/favorites`;
    apiFetch<string[]>(url, { headers: getAuthHeaders() })
      .then((ids) => {
        setFavorites(Array.isArray(ids) ? ids : []);
      })
      .catch((err) => {
        console.error('[fetchFavorites] failed to load favorites', err);
      });
  }, []);

  const toggleFavorite = useCallback(
    (adId: string) => {
      if (!currentUser) {
        navigate('/prijava');
        return;
      }

      let previous: string[] = [];
      let isAdding = false;

      setFavorites(prev => {
        previous = prev;
        isAdding = !prev.includes(adId);
        return isAdding ? [...prev, adId] : prev.filter(id => id !== adId);
      });

      const url = `${API_BASE}/favorites${isAdding ? '' : `/${adId}`}`;
      const options: RequestInit = {
        method: isAdding ? 'POST' : 'DELETE',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() }
      };
      if (isAdding) (options as any).body = JSON.stringify({ adId });
      fetch(url, options).catch((err) => {
        console.error('[toggleFavorite] failed, rolling back', err);
        setFavorites(previous);
      });
    },
    [currentUser, navigate],
  );

  const clearFavorites = useCallback(() => {
    setFavorites([]);
  }, []);

  return {
    favorites,
    fetchFavorites,
    toggleFavorite,
    clearFavorites,
  };
};

