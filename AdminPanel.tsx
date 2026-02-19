/**
 * Admin panel – rute i komponente. Koristi postojeće stilove (var(--bg-page), var(--accent) itd.).
 */
import React, { useState, useMemo, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import { Routes, Route, Navigate, Link, useNavigate, useParams, useSearchParams, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Users, FileText, Flag, CreditCard, LogOut, ChevronLeft,
  Loader2, SearchX, AlertTriangle, Trash2, Ban, Shield, Zap, ChevronRight,
  Menu, X, Home
} from 'lucide-react';
import type { User } from './types';
import { getApiBase } from './api';
import { getListRouteKey, saveScrollForList, loadAndClearScrollForList, restoreScroll, hardScrollToTop, isDetailRoute } from './lib/scroll';
import { mapApiAdToAd } from './features/ads/mappers';

const API_BASE = getApiBase();
const TOKEN_KEY = 'povezi_access_token';
const getAuthHeaders = (): HeadersInit => {
  const token = localStorage.getItem(TOKEN_KEY);
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const FETCH_TIMEOUT_MS = 10000;

const FALLBACK_STATS = { totalUsers: 0, totalAds: 0, activeAds: 0, premiumAds: 0, reportedAds: 0, pendingAds: 0, revenueTotal: 0, lastUsers: [] as any[], lastAds: [] as any[] };

function useAdminFetch<T>(url: string | null, options?: RequestInit): { data: T | null; loading: boolean; error: string | null; refetch: () => void } {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(!!url);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const fetchRef = useRef(0);

  const doFetch = useCallback(() => {
    if (!url) return;
    const n = ++fetchRef.current;
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setLoading(true);
    setError(null);
    const timer = setTimeout(() => abortRef.current?.abort(), FETCH_TIMEOUT_MS);
    const finish = () => { clearTimeout(timer); if (n === fetchRef.current) setLoading(false); };
    (async () => {
      try {
        const res = await fetch(url, { ...options, signal: abortRef.current!.signal, headers: { ...getAuthHeaders(), ...(options?.headers as Record<string, string>) } });
        let d: unknown;
        try {
          d = await res.json();
        } catch (parseErr) {
          if (n === fetchRef.current) {
            console.warn('[useAdminFetch] Invalid JSON:', url);
            setError('Nevalidan odgovor servera');
            setData(null);
          }
          return finish();
        }
        if (!res.ok) {
          const msg = (d && typeof d === 'object' && 'error' in d && typeof (d as { error?: unknown }).error === 'string')
            ? (d as { error: string }).error
            : (res.status === 401 ? 'Neautorizovano' : res.status === 403 ? 'Pristup zabranjen' : `Greška servera (${res.status})`);
          if (n === fetchRef.current) {
            setError(msg);
            setData(url.includes('/admin/stats') ? (FALLBACK_STATS as T) : null);
          }
          return finish();
        }
        if (d && typeof d === 'object' && !Array.isArray(d)) {
          if ('error' in d && typeof (d as { error?: unknown }).error === 'string') {
            if (n === fetchRef.current) {
              setError((d as { error: string }).error);
              setData(url.includes('/admin/stats') ? (FALLBACK_STATS as T) : null);
            }
          } else if (n === fetchRef.current) {
            setError(null);
            setData(d as T);
          }
        } else if (n === fetchRef.current) {
          console.warn('[useAdminFetch] Response not a valid object:', url);
          setData(url.includes('/admin/stats') ? (FALLBACK_STATS as T) : null);
        }
      } catch (e: unknown) {
        if (n === fetchRef.current && (e as Error)?.name !== 'AbortError') {
          setError((e as Error)?.message || 'Greška');
          setData(url?.includes('/admin/stats') ? (FALLBACK_STATS as T) : null);
        }
      } finally {
        finish();
      }
    })();
    return () => abortRef.current?.abort();
  }, [url, options?.method]);

  useEffect(() => {
    doFetch();
    return () => abortRef.current?.abort();
  }, [doFetch]);

  return { data, loading, error, refetch: doFetch };
}

// ----- Admin Guard -----
export const AdminGuard: React.FC<{ user: User | null; children: React.ReactNode }> = ({ user, children }) => {
  const location = useLocation();
  if (!user) return <Navigate to="/admin/login" state={{ from: location.pathname }} replace />;
  if (user.role !== 'admin') return <Navigate to="/" replace />;
  return <>{children}</>;
};

// ----- Admin Login -----
export const AdminLogin: React.FC<{ onLogin: (u: User) => void }> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    })
      .then(res => res.json().then((data: { accessToken?: string; user?: { id: string; role: string } }) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (!ok) throw new Error((data as { error?: string }).error || 'Greška pri prijavi');
        const u = data.user as { id: string; ime: string; email: string; telefon: string; role: string };
        if (u.role !== 'ADMIN') {
          setError('Samo administratori mogu pristupiti panelu.');
          return;
        }
        localStorage.setItem(TOKEN_KEY, data.accessToken);
        onLogin({
          id: u.id,
          ime: u.ime,
          email: u.email,
          telefon: u.telefon,
          datumRegistracije: 0,
          role: 'admin'
        });
        navigate('/admin', { replace: true });
      })
      .catch((err: Error) => setError(err.message || 'Greška'))
      .finally(() => setLoading(false));
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: 'var(--bg-page)', color: 'var(--text-primary)' }}>
      <div className="w-full max-w-md rounded-2xl border p-8" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}>
        <h1 className="text-xl font-black uppercase tracking-widest mb-6 text-center">Admin prijava</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="text-red-400 text-sm flex items-center gap-2"><AlertTriangle className="w-4 h-4" />{error}</p>}
          <div>
            <label className="text-[10px] font-black uppercase block mb-1" style={{ color: 'var(--text-secondary)' }}>Email</label>
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="w-full h-12 rounded-xl px-4 text-sm outline-none border" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }} />
          </div>
          <div>
            <label className="text-[10px] font-black uppercase block mb-1" style={{ color: 'var(--text-secondary)' }}>Lozinka</label>
            <input type="password" required value={password} onChange={e => setPassword(e.target.value)} className="w-full h-12 rounded-xl px-4 text-sm outline-none border" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }} />
          </div>
          <button type="submit" disabled={loading} className="w-full h-12 rounded-xl font-bold uppercase text-sm disabled:opacity-50" style={{ backgroundColor: 'var(--accent)', color: 'white' }}>
            {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Prijavi se'}
          </button>
        </form>
        <p className="mt-4 text-center text-sm"><Link to="/" className="underline" style={{ color: 'var(--accent)' }}>Natrag na početnu</Link></p>
      </div>
    </div>
  );
};

// ----- Layout -----
const AdminLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { data: stats } = useAdminFetch<{ pendingAds?: number }>(`${API_BASE}/admin/stats`);
  const pendingCount = stats?.pendingAds ?? 0;

  const navLinks = [
    { to: '/admin', label: 'Dashboard' },
    { to: '/admin/users', label: 'Korisnici' },
    { to: '/admin/ads', label: 'Oglasi' },
    { to: '/admin/pending', label: 'Na čekanju', badge: pendingCount },
    { to: '/admin/reports', label: 'Prijave' },
    { to: '/admin/payments', label: 'Plaćanja' },
  ];

  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden" style={{ backgroundColor: 'var(--bg-page)', color: 'var(--text-primary)' }}>
      <header className="border-b sticky top-0 z-20 flex items-center justify-between gap-2 px-3 sm:px-4 py-3" style={{ backgroundColor: 'var(--bg-nav)', borderColor: 'var(--border-subtle)' }}>
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <button type="button" onClick={() => setMobileMenuOpen((o) => !o)} className="lg:hidden p-2 rounded-lg shrink-0" style={{ color: 'var(--text-secondary)' }} aria-label="Meni"><Menu className="w-6 h-6" /></button>
          <Link to="/admin" className="font-black uppercase tracking-widest text-sm truncate">Admin</Link>
          <nav className="hidden lg:flex flex-wrap gap-1">
            {navLinks.map(({ to, label, badge }) => (
              <Link key={to} to={to} className="px-2 py-1.5 rounded-lg text-xs font-bold uppercase whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>{label}{badge != null && badge > 0 ? <span className="ml-1 inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 rounded-full text-[10px] font-black" style={{ backgroundColor: 'var(--accent)', color: 'white' }}>{badge}</span> : null}</Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Link to="/marketplace" className="p-2 rounded-lg flex items-center gap-1.5 text-xs font-bold uppercase" style={{ color: 'var(--accent)' }} title="Glavna stranica"><Home className="w-4 h-4" /> <span className="hidden sm:inline">Početna</span></Link>
          <button type="button" onClick={() => { localStorage.removeItem(TOKEN_KEY); navigate('/'); window.location.reload(); }} className="p-2 rounded-lg" style={{ color: 'var(--text-secondary)' }} title="Odjavi se"><LogOut className="w-5 h-5" /></button>
        </div>
      </header>
      {/* Mobile nav panel */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-[19] bg-black/50" aria-hidden onClick={() => setMobileMenuOpen(false)} />
      )}
      <div className={`lg:hidden fixed top-[52px] left-0 right-0 bottom-0 z-[19] overflow-y-auto border-r transition-transform duration-200 ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`} style={{ backgroundColor: 'var(--bg-nav)', borderColor: 'var(--border-subtle)', width: 'min(280px, 85vw)' }}>
        <div className="p-4 flex flex-col gap-1">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-secondary)' }}>Navigacija</span>
            <button type="button" onClick={() => setMobileMenuOpen(false)} className="p-2 rounded-lg" style={{ color: 'var(--text-secondary)' }}><X className="w-5 h-5" /></button>
          </div>
          <Link to="/marketplace" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm" style={{ color: 'var(--accent)' }}><Home className="w-5 h-5" /> Glavna stranica</Link>
          {navLinks.map(({ to, label, badge }) => (
            <Link key={to} to={to} onClick={() => setMobileMenuOpen(false)} className="flex items-center justify-between gap-2 px-4 py-3 rounded-xl font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
              <span>{label}</span>
              {badge != null && badge > 0 && <span className="inline-flex items-center justify-center min-w-[1.5rem] h-6 px-2 rounded-full text-xs font-black" style={{ backgroundColor: 'var(--accent)', color: 'white' }}>{badge}</span>}
            </Link>
          ))}
        </div>
      </div>
      <main className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-4 max-w-7xl mx-auto w-full min-w-0" data-scroll-reset>{children}</main>
    </div>
  );
};

// ----- Dashboard -----
export const AdminDashboard: React.FC = () => {
  const { data, loading, error, refetch } = useAdminFetch<{
    totalUsers: number; totalAds: number; activeAds: number; premiumAds: number; reportedAds: number; pendingAds?: number; revenueTotal: number;
    lastUsers: Array<{ id: string; ime: string; email: string; createdAt: string; role: string }>;
    lastAds: Array<{ id: string; naslov: string; slug: string; createdAt: string; vlasnik: { ime: string; email: string } }>;
  }>(`${API_BASE}/admin/stats`);

  if (loading && !data) return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--accent)' }} /></div>;
  if (error) return (
    <div className="py-8 flex flex-col items-center gap-4">
      <SearchX className="w-12 h-12" style={{ color: 'var(--text-secondary)' }} />
      <p style={{ color: 'var(--text-secondary)' }}>{error}</p>
      <button type="button" onClick={refetch} className="px-4 py-2 rounded-xl text-sm font-bold uppercase" style={{ backgroundColor: 'var(--accent)', color: 'white' }}>Pokušaj ponovo</button>
    </div>
  );
  if (!data) return (
    <div className="py-8 flex flex-col items-center gap-4">
      <SearchX className="w-12 h-12" style={{ color: 'var(--text-secondary)' }} />
      <p style={{ color: 'var(--text-secondary)' }}>Nema podataka</p>
      <button type="button" onClick={refetch} className="px-4 py-2 rounded-xl text-sm font-bold uppercase" style={{ backgroundColor: 'var(--accent)', color: 'white' }}>Pokušaj ponovo</button>
    </div>
  );
  const s = data as Record<string, unknown>;
  const lastUsers = Array.isArray(s.lastUsers) ? s.lastUsers : [];
  const lastAds = Array.isArray(s.lastAds) ? s.lastAds : [];
  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-black uppercase tracking-widest">Dashboard</h1>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3 sm:gap-4">
        {[
          { label: 'Korisnici', value: s.totalUsers ?? 0 },
          { label: 'Oglasi', value: s.totalAds ?? 0 },
          { label: 'Aktivni', value: s.activeAds ?? 0 },
          { label: 'Premium', value: s.premiumAds ?? 0 },
          { label: 'Na čekanju', value: s.pendingAds ?? 0, href: '/admin/pending' },
          { label: 'Prijave (otvorene)', value: s.reportedAds ?? 0 },
          { label: 'Prihodi (€)', value: s.revenueTotal ?? 0 }
        ].map(({ label, value, href }) => (
          href ? (
            <Link key={label} to={href} className="p-3 sm:p-4 rounded-xl border block" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}>
              <p className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: 'var(--text-secondary)' }}>{label}</p>
              <p className="text-lg sm:text-xl font-bold" style={{ color: 'var(--accent)' }}>{value}</p>
            </Link>
          ) : (
            <div key={label} className="p-3 sm:p-4 rounded-xl border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}>
              <p className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: 'var(--text-secondary)' }}>{label}</p>
              <p className="text-lg sm:text-xl font-bold">{value}</p>
            </div>
          )
        ))}
      </div>
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="rounded-xl border p-4" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}>
          <h2 className="text-sm font-black uppercase mb-3">Poslednjih 5 korisnika</h2>
          {lastUsers.length === 0 ? <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Nema</p> : (
            <ul className="space-y-2">
              {lastUsers.map((u: { id: string; ime: string; email: string }) => (
                <li key={u.id} className="flex justify-between text-sm"><span>{u.ime}</span><span style={{ color: 'var(--text-secondary)' }}>{u.email}</span></li>
              ))}
            </ul>
          )}
        </div>
        <div className="rounded-xl border p-4" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}>
          <h2 className="text-sm font-black uppercase mb-3">Poslednjih 5 oglasa</h2>
          {lastAds.length === 0 ? <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Nema</p> : (
            <ul className="space-y-2">
              {lastAds.map((a: { id: string; naslov: string; slug: string; vlasnik?: { ime?: string } }) => (
                <li key={a.id} className="flex justify-between text-sm"><Link to={`/admin/ads?slug=${a.slug}`} className="hover:underline" style={{ color: 'var(--accent)' }}>{a.naslov}</Link><span style={{ color: 'var(--text-secondary)' }}>{a.vlasnik?.ime}</span></li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

// ----- Pagination -----
const Pagination: React.FC<{ page: number; total: number; limit: number; onPage: (p: number) => void }> = ({ page, total, limit, onPage }) => {
  const pages = Math.max(1, Math.ceil(total / limit));
  if (pages <= 1) return null;
  return (
    <div className="flex items-center gap-2 mt-4">
      <button type="button" disabled={page <= 1} onClick={() => onPage(page - 1)} className="p-2 rounded-lg border disabled:opacity-40" style={{ borderColor: 'var(--border-subtle)' }}><ChevronLeft className="w-4 h-4" /></button>
      <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Strana {page} / {pages}</span>
      <button type="button" disabled={page >= pages} onClick={() => onPage(page + 1)} className="p-2 rounded-lg border disabled:opacity-40" style={{ borderColor: 'var(--border-subtle)' }}><ChevronRight className="w-4 h-4" /></button>
    </div>
  );
};

// ----- Users -----
export const AdminUsers: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const search = searchParams.get('search') || '';
  const [searchInput, setSearchInput] = useState(search);
  const debouncedSearch = useDebounce(searchInput, 300);
  useEffect(() => {
    const p = new URLSearchParams(searchParams);
    if (debouncedSearch) p.set('search', debouncedSearch); else p.delete('search');
    p.set('page', '1');
    setSearchParams(p);
  }, [debouncedSearch]);
  const q = new URLSearchParams({ page: String(page), limit: '20' });
  if (search) q.set('search', search);
  const { data, loading, error, refetch } = useAdminFetch<{ users: Array<{ id: string; ime: string; email: string; role: string; banned: boolean; bannedReason?: string; _count: { ads: number } }>; total: number }>(`${API_BASE}/admin/users?${q}`);

  const handleBan = (id: string, reason: string) => {
    fetch(`${API_BASE}/admin/users/${id}/ban`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...getAuthHeaders() }, body: JSON.stringify({ reason }) })
      .then(res => res.ok ? refetch() : res.json().then((d: { error?: string }) => alert(d.error || 'Greška')))
      .catch(() => alert('Greška'));
  };
  const handleUnban = (id: string) => {
    fetch(`${API_BASE}/admin/users/${id}/unban`, { method: 'POST', headers: getAuthHeaders() })
      .then(res => res.ok ? refetch() : res.json().then((d: { error?: string }) => alert(d.error || 'Greška')))
      .catch(() => alert('Greška'));
  };
  const handleDelete = (id: string) => {
    if (!window.confirm('Obrisati korisnika? Ovo briše i sve njegove oglase.')) return;
    fetch(`${API_BASE}/admin/users/${id}`, { method: 'DELETE', headers: getAuthHeaders() })
      .then(res => res.ok ? refetch() : res.json().then((d: { error?: string }) => alert(d.error || 'Greška')))
      .catch(() => alert('Greška'));
  };

  if (loading && !data) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--accent)' }} /></div>;
  if (error) return <div className="py-8 text-center" style={{ color: 'var(--text-secondary)' }}>{error} <button type="button" onClick={refetch} className="ml-2 underline">Pokušaj ponovo</button></div>;
  const list = data?.users ?? [];
  const total = data?.total ?? 0;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-black uppercase tracking-widest">Korisnici</h1>
      <input type="text" placeholder="Pretraga (email, ime)" value={searchInput} onChange={e => setSearchInput(e.target.value)} className="max-w-xs w-full h-10 rounded-xl px-4 text-sm border" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }} />
      <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left" style={{ borderColor: 'var(--border-subtle)' }}>
              <th className="p-3 font-black uppercase text-[10px]" style={{ color: 'var(--text-secondary)' }}>Ime</th>
              <th className="p-3 font-black uppercase text-[10px]" style={{ color: 'var(--text-secondary)' }}>Email</th>
              <th className="p-3 font-black uppercase text-[10px]" style={{ color: 'var(--text-secondary)' }}>Uloga</th>
              <th className="p-3 font-black uppercase text-[10px]" style={{ color: 'var(--text-secondary)' }}>Oglasi</th>
              <th className="p-3 font-black uppercase text-[10px]" style={{ color: 'var(--text-secondary)' }}>Status</th>
              <th className="p-3 font-black uppercase text-[10px]" style={{ color: 'var(--text-secondary)' }}>Akcije</th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 ? (
              <tr><td colSpan={6} className="p-8 text-center" style={{ color: 'var(--text-secondary)' }}>Nema korisnika</td></tr>
            ) : (
              list.map((u: { id: string; ime: string; email: string; role: string; banned: boolean; _count: { ads: number } }) => (
                <tr key={u.id} className="border-b" style={{ borderColor: 'var(--border-subtle)' }}>
                  <td className="p-3">{u.ime}</td>
                  <td className="p-3">{u.email}</td>
                  <td className="p-3">{u.role}</td>
                  <td className="p-3">{u._count?.ads ?? 0}</td>
                  <td className="p-3">{u.banned ? <span className="text-red-500 font-bold">Blokiran</span> : 'Aktivan'}</td>
                  <td className="p-3 flex gap-2">
                    {u.role !== 'ADMIN' && (
                      <>
                        {u.banned ? (
                          <button type="button" onClick={() => handleUnban(u.id)} className="p-1.5 rounded border text-xs font-bold uppercase" style={{ borderColor: 'var(--accent)', color: 'var(--accent)' }}>Odblokiraj</button>
                        ) : (
                          <button type="button" onClick={() => { const r = window.prompt('Razlog blokade (opciono):'); if (r !== null) handleBan(u.id, r); }} className="p-1.5 rounded border border-red-500/50 text-red-400 text-xs font-bold uppercase">Blokiraj</button>
                        )}
                        <button type="button" onClick={() => handleDelete(u.id)} className="p-1.5 rounded border border-red-500/50 text-red-400 text-xs font-bold uppercase flex items-center gap-1"><Trash2 className="w-3 h-3" />Obriši</button>
                      </>
                    )}
                    <Link to={`/admin/users/${u.id}`} className="p-1.5 rounded border text-xs font-bold uppercase" style={{ borderColor: 'var(--border-subtle)' }}>Detalji</Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <Pagination page={page} total={total} limit={20} onPage={(p) => setSearchParams(prev => { const n = new URLSearchParams(prev); n.set('page', String(p)); return n; })} />
    </div>
  );
};

// ----- Ads -----
export const AdminAds: React.FC = () => {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (isDetailRoute(location.pathname)) return;
    const listKey = getListRouteKey(location.pathname, location.search);
    const saved = loadAndClearScrollForList(listKey);
    if (!saved || saved.y <= 0) return;
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    const doRestore = () => restoreScroll(saved.y);
    requestAnimationFrame(() => requestAnimationFrame(doRestore));
    const t1 = setTimeout(doRestore, 100);
    const t2 = setTimeout(doRestore, 300);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [location.pathname, location.search]);
  const search = searchParams.get('search') || '';
  const status = searchParams.get('status') || '';
  const [searchInput, setSearchInput] = useState(search);
  const debouncedSearch = useDebounce(searchInput, 300);
  useEffect(() => {
    const p = new URLSearchParams(searchParams);
    if (debouncedSearch) p.set('search', debouncedSearch); else p.delete('search');
    p.set('page', '1');
    setSearchParams(p);
  }, [debouncedSearch]);
  const q = new URLSearchParams({ page: String(page), limit: '20' });
  if (search) q.set('search', search);
  if (status) q.set('status', status);
  const { data, loading, error, refetch } = useAdminFetch<{ ads: Array<{ id: string; naslov: string; slug: string; status: string; kategorija: string; cijena: number; featuredUntil: string | null; vlasnik: { ime: string; email: string }; _count: { reports: number } }>; total: number }>(`${API_BASE}/admin/ads?${q}`);

  const deactivate = (id: string) => {
    fetch(`${API_BASE}/admin/ads/${id}/deactivate`, { method: 'POST', headers: getAuthHeaders() }).then(res => res.ok && refetch());
  };
  const setStatus = (id: string, status: string) => {
    fetch(`${API_BASE}/admin/ads/${id}/status`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...getAuthHeaders() }, body: JSON.stringify({ status }) }).then(res => res.ok && refetch());
  };
  const feature = (id: string, plan: '7' | '14' | '30') => {
    fetch(`${API_BASE}/admin/ads/${id}/feature`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...getAuthHeaders() }, body: JSON.stringify({ plan }) }).then(res => res.ok && refetch());
  };
  const removeFeature = (id: string) => {
    fetch(`${API_BASE}/admin/ads/${id}/feature`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...getAuthHeaders() }, body: JSON.stringify({ removePromo: true }) }).then(res => res.ok && refetch());
  };
  const deleteAd = (id: string) => {
    if (!window.confirm('Obrisati oglas?')) return;
    fetch(`${API_BASE}/admin/ads/${id}`, { method: 'DELETE', headers: getAuthHeaders() }).then(res => res.ok && refetch());
  };

  if (loading && !data) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--accent)' }} /></div>;
  if (error) return <div className="py-8 text-center" style={{ color: 'var(--text-secondary)' }}>{error}</div>;
  const list = data?.ads ?? [];
  const total = data?.total ?? 0;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-black uppercase tracking-widest">Oglasi</h1>
      <div className="flex flex-wrap gap-2">
        <input type="text" placeholder="Pretraga (naslov, email)" value={searchInput} onChange={e => setSearchInput(e.target.value)} className="h-10 rounded-xl px-4 text-sm border w-48" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }} />
        <select value={status} onChange={e => setSearchParams(prev => { const n = new URLSearchParams(prev); if (e.target.value) n.set('status', e.target.value); else n.delete('status'); n.set('page', '1'); return n; })} className="h-10 rounded-xl px-4 text-sm border" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}>
          <option value="">Svi statusi</option>
          <option value="NA_CEKANJU">Na čekanju</option>
          <option value="AKTIVAN">Aktivni</option>
          <option value="PRODAN">Prodani</option>
          <option value="ISTEKAO">Istekli</option>
        </select>
      </div>
      <div className="rounded-xl border overflow-x-auto" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}>
        <table className="w-full text-sm min-w-[600px]">
          <thead>
            <tr className="border-b text-left" style={{ borderColor: 'var(--border-subtle)' }}>
              <th className="p-3 font-black uppercase text-[10px]" style={{ color: 'var(--text-secondary)' }}>Naslov</th>
              <th className="p-3 font-black uppercase text-[10px]" style={{ color: 'var(--text-secondary)' }}>Kategorija</th>
              <th className="p-3 font-black uppercase text-[10px]" style={{ color: 'var(--text-secondary)' }}>Cijena</th>
              <th className="p-3 font-black uppercase text-[10px]" style={{ color: 'var(--text-secondary)' }}>Status</th>
              <th className="p-3 font-black uppercase text-[10px]" style={{ color: 'var(--text-secondary)' }}>Premium</th>
              <th className="p-3 font-black uppercase text-[10px]" style={{ color: 'var(--text-secondary)' }}>Prijave</th>
              <th className="p-3 font-black uppercase text-[10px]" style={{ color: 'var(--text-secondary)' }}>Akcije</th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 ? (
              <tr><td colSpan={7} className="p-8 text-center" style={{ color: 'var(--text-secondary)' }}>Nema oglasa</td></tr>
            ) : (
              list.map((a: { id: string; naslov: string; slug: string; status: string; kategorija: string; cijena: number; featuredUntil: string | null; vlasnik: { ime: string }; _count: { reports: number } }) => (
                <tr key={a.id} className="border-b" style={{ borderColor: 'var(--border-subtle)' }}>
                  <td className="p-3 font-medium">{a.naslov}</td>
                  <td className="p-3">{a.kategorija}</td>
                  <td className="p-3">{Number(a.cijena)} €</td>
                  <td className="p-3">{a.status}</td>
                  <td className="p-3">{a.featuredUntil && new Date(a.featuredUntil) > new Date() ? 'Da' : 'Ne'}</td>
                  <td className="p-3">{a._count?.reports ?? 0}</td>
                  <td className="p-3 flex flex-wrap gap-1">
                    <button type="button" onClick={() => deactivate(a.id)} className="p-1 rounded text-[10px] font-bold uppercase border" style={{ borderColor: 'var(--border-subtle)' }}>Deaktiviraj</button>
                    <button type="button" onClick={() => feature(a.id, '7')} className="p-1 rounded text-[10px] font-bold uppercase" style={{ backgroundColor: 'var(--accent)', color: 'white' }}>7d</button>
                    <button type="button" onClick={() => feature(a.id, '14')} className="p-1 rounded text-[10px] font-bold uppercase" style={{ backgroundColor: 'var(--accent)', color: 'white' }}>14d</button>
                    <button type="button" onClick={() => feature(a.id, '30')} className="p-1 rounded text-[10px] font-bold uppercase" style={{ backgroundColor: 'var(--accent)', color: 'white' }}>30d</button>
                    <button type="button" onClick={() => removeFeature(a.id)} className="p-1 rounded text-[10px] font-bold uppercase border border-amber-500/50 text-amber-400">Ukloni promociju</button>
                    <button type="button" onClick={() => deleteAd(a.id)} className="p-1 rounded text-[10px] font-bold uppercase border border-red-500/50 text-red-400 flex items-center gap-0.5"><Trash2 className="w-3 h-3" />Obriši</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <Pagination page={page} total={total} limit={20} onPage={(p) => setSearchParams(prev => { const n = new URLSearchParams(prev); n.set('page', String(p)); return n; })} />
    </div>
  );
};

// ----- Odobri oglase (na čekanju) -----
export const AdminPendingAds: React.FC = () => {
  const location = useLocation();
  const q = new URLSearchParams({ page: '1', limit: '50', status: 'NA_CEKANJU' });
  const { data, loading, error, refetch } = useAdminFetch<{ ads: Array<{ id: string; naslov: string; slug: string; kategorija: string; cijena: number; vlasnik: { ime: string; email: string }; createdAt: string }>; total: number }>(`${API_BASE}/admin/ads?${q}`);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (isDetailRoute(location.pathname)) return;
    const listKey = getListRouteKey(location.pathname, location.search);
    const saved = loadAndClearScrollForList(listKey);
    if (!saved || saved.y <= 0) return;
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    const doRestore = () => restoreScroll(saved.y);
    requestAnimationFrame(() => requestAnimationFrame(doRestore));
    const t1 = setTimeout(doRestore, 100);
    const t2 = setTimeout(doRestore, 300);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [location.pathname, location.search]);

  const approve = (id: string) => {
    fetch(`${API_BASE}/admin/ads/${id}/status`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...getAuthHeaders() }, body: JSON.stringify({ status: 'AKTIVAN' }) }).then(res => res.ok && refetch());
  };
  const reject = (id: string) => {
    if (!window.confirm('Odbij ovaj oglas? (Oglas će biti obrisan.)')) return;
    fetch(`${API_BASE}/admin/ads/${id}`, { method: 'DELETE', headers: getAuthHeaders() }).then(res => res.ok && refetch());
  };

  if (loading && !data) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--accent)' }} /></div>;
  if (error) return <div className="py-8 text-center" style={{ color: 'var(--text-secondary)' }}>{error} <button type="button" onClick={refetch} className="ml-2 underline">Pokušaj ponovo</button></div>;
  const list = data?.ads ?? [];
  const total = data?.total ?? 0;

  return (
    <div className="space-y-4">
      <h1 className="text-xl sm:text-2xl font-black uppercase tracking-widest">Odobri oglase</h1>
      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Oglasi na čekanju: {total}. Odobri ih da postanu aktivni ili odbij (brisanje).</p>
      {list.length === 0 ? (
        <div className="rounded-xl border p-8 text-center" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)', color: 'var(--text-secondary)' }}>Nema oglasa na čekanju.</div>
      ) : (
        <>
          {/* Mobile: cards */}
          <div className="md:hidden space-y-3">
            {list.map((a: { id: string; naslov: string; slug: string; kategorija: string; cijena: number; vlasnik: { ime: string; email: string }; createdAt: string }) => (
              <div key={a.id} className="rounded-xl border p-4" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}>
                <p className="font-medium text-sm mb-1">{a.naslov}</p>
                <p className="text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>{a.kategorija} · {Number(a.cijena)} € · {a.vlasnik?.ime}</p>
                <div className="flex flex-wrap gap-2 mt-3">
                  <button type="button" onClick={() => approve(a.id)} className="min-h-[44px] px-4 py-2.5 rounded-xl text-xs font-bold uppercase flex-1" style={{ backgroundColor: 'var(--accent)', color: 'white' }}>Odobri</button>
                  <button type="button" onClick={() => reject(a.id)} className="min-h-[44px] px-4 py-2.5 rounded-xl text-xs font-bold uppercase border border-red-500/50 text-red-400">Odbij</button>
                  <Link to={`/admin/oglas-preview/${a.slug}`} onClick={() => saveScrollForList(getListRouteKey('/admin/pending', ''))} className="min-h-[44px] px-4 py-2.5 rounded-xl text-xs font-bold uppercase border flex items-center justify-center" style={{ borderColor: 'var(--border-subtle)' }}>Pogledaj</Link>
                </div>
              </div>
            ))}
          </div>
          {/* Desktop: table */}
          <div className="hidden md:block rounded-xl border overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left" style={{ borderColor: 'var(--border-subtle)' }}>
                  <th className="p-3 font-black uppercase text-[10px]" style={{ color: 'var(--text-secondary)' }}>Naslov</th>
                  <th className="p-3 font-black uppercase text-[10px]" style={{ color: 'var(--text-secondary)' }}>Kategorija</th>
                  <th className="p-3 font-black uppercase text-[10px]" style={{ color: 'var(--text-secondary)' }}>Cijena</th>
                  <th className="p-3 font-black uppercase text-[10px]" style={{ color: 'var(--text-secondary)' }}>Prodavac</th>
                  <th className="p-3 font-black uppercase text-[10px]" style={{ color: 'var(--text-secondary)' }}>Akcije</th>
                </tr>
              </thead>
              <tbody>
                {list.map((a: { id: string; naslov: string; slug: string; kategorija: string; cijena: number; vlasnik: { ime: string; email: string }; createdAt: string }) => (
                <tr key={a.id} className="border-b" style={{ borderColor: 'var(--border-subtle)' }}>
                  <td className="p-3 font-medium">{a.naslov}</td>
                  <td className="p-3">{a.kategorija}</td>
                  <td className="p-3">{Number(a.cijena)} €</td>
                  <td className="p-3">{a.vlasnik?.ime} ({a.vlasnik?.email})</td>
                  <td className="p-3 flex gap-2">
                    <button type="button" onClick={() => approve(a.id)} className="px-3 py-1.5 rounded-xl text-xs font-bold uppercase" style={{ backgroundColor: 'var(--accent)', color: 'white' }}>Odobri</button>
                    <button type="button" onClick={() => reject(a.id)} className="px-3 py-1.5 rounded-xl text-xs font-bold uppercase border border-red-500/50 text-red-400">Odbij</button>
                    <Link to={`/admin/oglas-preview/${a.slug}`} onClick={() => saveScrollForList(getListRouteKey('/admin/pending', ''))} className="px-3 py-1.5 rounded-xl text-xs font-bold uppercase border" style={{ borderColor: 'var(--border-subtle)' }}>Pogledaj</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </>
      )}
    </div>
  );
};

// ----- Pregled oglasa (admin) – ISTI layout kao public AdDetail, admin bar iznad -----
type AdminAdPreviewProps = {
  AdDetailViewComponent: React.ComponentType<any>;
  user: User | null;
  onToggleFavorite: (id: string) => void;
  favorites: string[];
  ratings: Array<{ sellerId?: string; buyerId?: string; score: number }>;
  onAddRating: (sellerId: string, score: number) => void;
  getSellerMetrics: (sellerId: string) => { avg: string; count: number };
  setPageMeta: (title: string, desc?: string, img?: string, url?: string) => void;
};

const AdminAdPreview: React.FC<AdminAdPreviewProps> = ({ AdDetailViewComponent, user, onToggleFavorite, favorites, ratings, onAddRating, getSellerMetrics, setPageMeta }) => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const url = slug ? `${API_BASE}/admin/ads/by-slug/${encodeURIComponent(slug)}` : null;

  // Detail route (admin preview): SYNC reset na vrh PRIJE prvog paint-a (bez RAF)
  useLayoutEffect(() => {
    if (typeof window === 'undefined') return;
    if (!slug) return;
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    hardScrollToTop();
  }, [slug, location.pathname, location.key]);
  const { data: rawAd, loading, error, refetch } = useAdminFetch<any>(url);

  const approve = () => {
    if (!rawAd) return;
    fetch(`${API_BASE}/admin/ads/${rawAd.id}/status`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...getAuthHeaders() }, body: JSON.stringify({ status: 'AKTIVAN' }) })
      .then(res => res.ok && navigate('/admin/pending'));
  };
  const reject = () => {
    if (!rawAd || !window.confirm('Odbij ovaj oglas? (Oglas će biti obrisan.)')) return;
    fetch(`${API_BASE}/admin/ads/${rawAd.id}`, { method: 'DELETE', headers: getAuthHeaders() })
      .then(res => res.ok && navigate('/admin/pending'));
  };

  // SYNC reset kad ad učita (layout se pomaknuo) – useLayoutEffect, bez RAF
  useLayoutEffect(() => {
    if (!rawAd?.id) return;
    hardScrollToTop();
  }, [rawAd?.id]);

  if (loading && !rawAd) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--accent)' }} /></div>;
  if (error || !rawAd) return (
    <div className="py-8" style={{ color: 'var(--text-secondary)' }}>
      {error || 'Oglas nije pronađen'}
      <button type="button" onClick={() => refetch()} className="ml-2 underline">Pokušaj ponovo</button>
      <Link to="/admin/pending" className="ml-2 underline">← Nazad na čekanju</Link>
    </div>
  );

  let ad;
  try {
    ad = mapApiAdToAd(rawAd);
  } catch (e) {
    return (
      <div className="py-8" style={{ color: 'var(--text-secondary)' }}>
        Greška pri učitavanju oglasa
        <Link to="/admin/pending" className="ml-2 underline">← Nazad na čekanju</Link>
      </div>
    );
  }

  const AdDetailView = AdDetailViewComponent;
  return (
    <AdDetailView
      ad={ad}
      isAdminPreview
      adminActions={{ onApprove: approve, onReject: reject, backHref: '/admin/pending' }}
      user={user}
      onToggleFavorite={onToggleFavorite}
      favorites={favorites}
      ratings={ratings}
      onAddRating={onAddRating}
      getSellerMetrics={getSellerMetrics}
      sellerAdsCount={1}
      similarAds={[]}
      similarLoading={false}
      navigate={navigate}
      location={location}
      API_BASE={API_BASE}
      getAuthHeaders={getAuthHeaders}
      setPageMeta={setPageMeta}
    />
  );
};

// ----- Reports -----
export const AdminReports: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const status = searchParams.get('status') || '';
  const q = new URLSearchParams({ page: String(page), limit: '20' });
  if (status) q.set('status', status);
  const { data, loading, error, refetch } = useAdminFetch<{ reports: Array<{ id: string; reason: string; details: string | null; status: string; createdAt: string; ad: { id: string; naslov: string; slug: string; vlasnik: { ime: string; email: string } }; reporter: { ime: string; email: string } | null }>; total: number }>(`${API_BASE}/admin/reports?${q}`);

  const resolve = (id: string) => {
    fetch(`${API_BASE}/admin/reports/${id}/resolve`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...getAuthHeaders() }, body: JSON.stringify({ action: 'actionTaken' }) }).then(res => res.ok && refetch());
  };

  if (loading && !data) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--accent)' }} /></div>;
  if (error) return <div className="py-8 text-center" style={{ color: 'var(--text-secondary)' }}>{error}</div>;
  const list = data?.reports ?? [];
  const total = data?.total ?? 0;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-black uppercase tracking-widest">Prijave</h1>
      <select value={status} onChange={e => setSearchParams(prev => { const n = new URLSearchParams(prev); if (e.target.value) n.set('status', e.target.value); else n.delete('status'); n.set('page', '1'); return n; })} className="h-10 rounded-xl px-4 text-sm border" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}>
        <option value="">Sve</option>
        <option value="open">Otvorene</option>
        <option value="closed">Zatvorene</option>
      </select>
      <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}>
        {list.length === 0 ? <div className="p-8 text-center" style={{ color: 'var(--text-secondary)' }}>Nema prijava</div> : (
          <ul className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
            {list.map((r: { id: string; reason: string; details: string | null; status: string; createdAt: string; ad: { naslov: string; slug: string; vlasnik: { ime: string; email: string } }; reporter: { ime: string; email: string } | null }) => (
              <li key={r.id} className="p-4 flex justify-between items-start gap-4">
                <div>
                  <p className="font-bold">{r.reason}</p>
                  {r.details && <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>{r.details}</p>}
                  <p className="text-xs mt-2" style={{ color: 'var(--text-secondary)' }}>Oglas: {r.ad?.naslov} · {r.ad?.vlasnik?.email}</p>
                  {r.reporter && <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Prijavio: {r.reporter.ime} ({r.reporter.email})</p>}
                </div>
                <div className="flex gap-2 shrink-0">
                  <span className="text-[10px] font-bold uppercase" style={{ color: 'var(--text-secondary)' }}>{r.status}</span>
                  {r.status === 'open' && <button type="button" onClick={() => resolve(r.id)} className="p-2 rounded-lg text-xs font-bold uppercase" style={{ backgroundColor: 'var(--accent)', color: 'white' }}>Riješi</button>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      <Pagination page={page} total={total} limit={20} onPage={(p) => setSearchParams(prev => { const n = new URLSearchParams(prev); n.set('page', String(p)); return n; })} />
    </div>
  );
};

// ----- Payments -----
type PaymentRow = {
  id: string;
  userId: string;
  user: { id: string; ime: string; email: string };
  adId: string | null;
  ad: { id: string; naslov: string; slug: string } | null;
  amount: number;
  currency: string;
  status: string;
  planDays: number | null;
  createdAt: string;
};
export const AdminPayments: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const status = searchParams.get('status') || '';
  const q = new URLSearchParams({ page: String(page), limit: '20' });
  if (status) q.set('status', status);
  const { data, loading, error, refetch } = useAdminFetch<{ payments: PaymentRow[]; total: number; page: number; limit: number }>(`${API_BASE}/admin/payments?${q}`);
  const { data: totalsData } = useAdminFetch<{ total: number; count: number }>(`${API_BASE}/admin/payments/totals`);
  const list = data?.payments ?? [];
  const total = data?.total ?? 0;
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-black uppercase tracking-widest">Plaćanja</h1>
      <div className="rounded-xl border p-4 mb-4" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}>
        <span className="text-[10px] font-black uppercase" style={{ color: 'var(--text-secondary)' }}>Ukupan prihod (succeeded)</span>
        <div className="text-2xl font-black mt-1" style={{ color: 'var(--accent)' }}>{totalsData ? `${totalsData.total.toFixed(2)} €` : '—'}</div>
        <span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>{totalsData?.count ?? 0} uplata</span>
      </div>
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-[10px] font-black uppercase" style={{ color: 'var(--text-secondary)' }}>Status:</span>
        {['', 'succeeded', 'pending', 'failed', 'refunded'].map((s) => (
          <button key={s || 'all'} type="button" onClick={() => setSearchParams(prev => { const n = new URLSearchParams(prev); if (s) n.set('status', s); else n.delete('status'); n.set('page', '1'); return n; })} className="px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase" style={{ backgroundColor: status === s ? 'var(--accent)' : 'var(--bg-input)', color: status === s ? 'white' : 'var(--text-secondary)' }}>{s || 'Sve'}</button>
        ))}
      </div>
      {loading && !data ? <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--accent)' }} /> : error ? <p style={{ color: 'var(--text-secondary)' }}>{error}</p> : (
        <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}>
          <table className="w-full text-left text-sm">
            <thead>
              <tr style={{ borderColor: 'var(--border-subtle)' }} className="border-b">
                <th className="p-3 font-black uppercase text-[10px]" style={{ color: 'var(--text-secondary)' }}>Datum</th>
                <th className="p-3 font-black uppercase text-[10px]" style={{ color: 'var(--text-secondary)' }}>Korisnik</th>
                <th className="p-3 font-black uppercase text-[10px]" style={{ color: 'var(--text-secondary)' }}>Oglas</th>
                <th className="p-3 font-black uppercase text-[10px]" style={{ color: 'var(--text-secondary)' }}>Iznos</th>
                <th className="p-3 font-black uppercase text-[10px]" style={{ color: 'var(--text-secondary)' }}>Status</th>
                <th className="p-3 font-black uppercase text-[10px]" style={{ color: 'var(--text-secondary)' }}>Plan</th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 ? <tr><td colSpan={6} className="p-8 text-center" style={{ color: 'var(--text-secondary)' }}>Nema plaćanja</td></tr> : list.map((p: PaymentRow) => (
                <tr key={p.id} className="border-b" style={{ borderColor: 'var(--border-subtle)' }}>
                  <td className="p-3">{new Date(p.createdAt).toLocaleDateString()}</td>
                  <td className="p-3">{p.user?.ime} ({p.user?.email})</td>
                  <td className="p-3">{p.ad ? <Link to={`/oglas/${p.ad.slug}`} target="_self" className="underline" style={{ color: 'var(--accent)' }}>{p.ad.naslov}</Link> : '—'}</td>
                  <td className="p-3">{(p.amount / 100).toFixed(2)} {p.currency.toUpperCase()}</td>
                  <td className="p-3">{p.status}</td>
                  <td className="p-3">{p.planDays ? `${p.planDays} dana` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {total > 20 && (
            <div className="p-3 flex justify-between items-center border-t" style={{ borderColor: 'var(--border-subtle)' }}>
              <button type="button" disabled={page <= 1} onClick={() => setSearchParams(prev => { const n = new URLSearchParams(prev); n.set('page', String(page - 1)); return n; })} className="px-3 py-1.5 rounded-lg text-[10px] font-bold disabled:opacity-40" style={{ backgroundColor: 'var(--bg-input)' }}>Prethodna</button>
              <span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>Strana {page} / {Math.ceil(total / 20)}</span>
              <button type="button" disabled={page >= Math.ceil(total / 20)} onClick={() => setSearchParams(prev => { const n = new URLSearchParams(prev); n.set('page', String(page + 1)); return n; })} className="px-3 py-1.5 rounded-lg text-[10px] font-bold disabled:opacity-40" style={{ backgroundColor: 'var(--bg-input)' }}>Sljedeća</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

function useDebounce<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

type AdminRoutesProps = {
  user: User | null;
  onLogin: (u: User) => void;
  AdDetailViewComponent: React.ComponentType<any>;
  onToggleFavorite?: (id: string) => void;
  favorites?: string[];
  ratings?: Array<{ adId?: string; sellerId?: string; userId?: string; buyerId?: string; score: number }>;
  onAddRating?: (sellerId: string, score: number) => void;
  getSellerMetrics?: (sellerId: string) => { avg: string; count: number };
  setPageMeta?: (title: string, desc?: string, img?: string, url?: string) => void;
};

export const AdminRoutes: React.FC<AdminRoutesProps> = ({ user, onLogin, AdDetailViewComponent, onToggleFavorite = () => {}, favorites = [], ratings = [], onAddRating = () => {}, getSellerMetrics = () => ({ avg: '0', count: 0 }), setPageMeta = () => {} }) => (
  <Routes>
    <Route path="/admin/login" element={user?.role === 'admin' ? <Navigate to="/admin" replace /> : <AdminLogin onLogin={onLogin} />} />
    <Route path="/admin" element={<AdminGuard user={user}><AdminLayout><AdminDashboard /></AdminLayout></AdminGuard>} />
    <Route path="/admin/users" element={<AdminGuard user={user}><AdminLayout><AdminUsers /></AdminLayout></AdminGuard>} />
    <Route path="/admin/users/:id" element={<AdminGuard user={user}><AdminLayout><AdminUserDetail /></AdminLayout></AdminGuard>} />
    <Route path="/admin/ads" element={<AdminGuard user={user}><AdminLayout><AdminAds /></AdminLayout></AdminGuard>} />
    <Route path="/admin/pending" element={<AdminGuard user={user}><AdminLayout><AdminPendingAds /></AdminLayout></AdminGuard>} />
    <Route path="/admin/oglas-preview/:slug" element={<AdminGuard user={user}><AdminLayout><AdminAdPreview AdDetailViewComponent={AdDetailViewComponent} user={user} onToggleFavorite={onToggleFavorite} favorites={favorites} ratings={ratings} onAddRating={onAddRating} getSellerMetrics={getSellerMetrics} setPageMeta={setPageMeta} /></AdminLayout></AdminGuard>} />
    <Route path="/admin/reports" element={<AdminGuard user={user}><AdminLayout><AdminReports /></AdminLayout></AdminGuard>} />
    <Route path="/admin/payments" element={<AdminGuard user={user}><AdminLayout><AdminPayments /></AdminLayout></AdminGuard>} />
  </Routes>
);

const AdminUserDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { data, loading, error } = useAdminFetch<{ id: string; ime: string; email: string; telefon: string; role: string; banned: boolean; bannedReason: string | null; _count: { ads: number }; ads: Array<{ id: string; naslov: string; status: string }> }>(id ? `${API_BASE}/admin/users/${id}` : null);
  const navigate = useNavigate();

  if (loading && !data) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--accent)' }} /></div>;
  if (error || !data) return <div className="py-8" style={{ color: 'var(--text-secondary)' }}>{error || 'Korisnik nije pronađen'} <Link to="/admin/users" className="ml-2 underline">Natrag</Link></div>;
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button type="button" onClick={() => navigate('/admin/users')} className="p-2 rounded-lg border" style={{ borderColor: 'var(--border-subtle)' }}><ChevronLeft className="w-5 h-5" /></button>
        <h1 className="text-2xl font-black uppercase tracking-widest">Korisnik: {data.ime}</h1>
      </div>
      <div className="rounded-xl border p-6 space-y-4" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}>
        <p><span className="font-bold uppercase text-[10px]" style={{ color: 'var(--text-secondary)' }}>Email</span> {data.email}</p>
        <p><span className="font-bold uppercase text-[10px]" style={{ color: 'var(--text-secondary)' }}>Telefon</span> {data.telefon}</p>
        <p><span className="font-bold uppercase text-[10px]" style={{ color: 'var(--text-secondary)' }}>Uloga</span> {data.role}</p>
        <p><span className="font-bold uppercase text-[10px]" style={{ color: 'var(--text-secondary)' }}>Broj oglasa</span> {data._count?.ads ?? 0}</p>
        {data.banned && <p className="text-red-500 font-bold">Blokiran {data.bannedReason ? `: ${data.bannedReason}` : ''}</p>}
        {data.ads?.length > 0 && (
          <div>
            <p className="font-black uppercase text-[10px] mb-2" style={{ color: 'var(--text-secondary)' }}>Poslednji oglasi</p>
            <ul className="space-y-1">{data.ads.map((a: { id: string; naslov: string; status: string }) => <li key={a.id}>{a.naslov} ({a.status})</li>)}</ul>
          </div>
        )}
      </div>
    </div>
  );
};
