import { useCallback, useState, type Dispatch, type SetStateAction } from 'react';
import type { Notification } from '../types';
import { getApiBase } from '../api';
import { apiFetch } from '../lib/api/client';

const API_BASE = getApiBase();
const TOKEN_KEY = 'povezi_access_token';

const getAuthHeaders = (): HeadersInit => {
  const token = localStorage.getItem(TOKEN_KEY);
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export interface UseNotificationsResult {
  notifications: Notification[];
  fetchNotifications: () => void;
  handleMarkNotificationRead: (id: string) => void;
  markMessageNotificationsReadForConversation: (conversationId: string) => void;
  clearNotifications: () => void;
  setNotifications: Dispatch<SetStateAction<Notification[]>>;
}

export const useNotifications = (): UseNotificationsResult => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const fetchNotifications = useCallback(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return;
    const url = `${API_BASE}/notifications`;
    apiFetch<any[]>(url, { headers: getAuthHeaders() })
      .then((list) => {
        const mapped: Notification[] = (list || []).map((n: any) => ({
          id: n.id,
          korisnikId: n.korisnikId || n.userId,
          tip: n.tip || '',
          naslov: n.naslov || '',
          poruka: n.poruka || '',
          link: n.link || '',
          entityId: n.entityId || '',
          procitano: !!n.procitano,
          createdAt: typeof n.createdAt === 'number'
            ? n.createdAt
            : new Date(n.createdAt).getTime()
        }));
        setNotifications(mapped);
      })
      .catch((err) => {
        console.error('[fetchNotifications] failed to load notifications', err);
      });
  }, []);

  const handleMarkNotificationRead = useCallback((id: string) => {
    let snapshot: Notification[] = [];
    setNotifications(prev => {
      snapshot = prev;
      return prev.map(n => n.id === id ? { ...n, procitano: true } : n);
    });
    fetch(`${API_BASE}/notifications/mark-read`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ id }),
    })
      .then((res) => {
        if (!res.ok) throw new Error(`mark-read ${res.status}`);
      })
      .catch((err) => {
        console.error('[handleMarkNotificationRead] failed, rolling back', err);
        setNotifications(snapshot);
      });
  }, []);

  const markMessageNotificationsReadForConversation = useCallback((conversationId: string) => {
    const toMark = notifications.filter(n => n.tip === 'message' && !n.procitano && n.link?.includes(conversationId));
    toMark.forEach(n => handleMarkNotificationRead(n.id));
  }, [notifications, handleMarkNotificationRead]);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  return {
    notifications,
    fetchNotifications,
    handleMarkNotificationRead,
    markMessageNotificationsReadForConversation,
    clearNotifications,
    setNotifications,
  };
};

