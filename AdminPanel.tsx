/**
 * Admin panel – rute i komponente. Koristi postojeće stilove (var(--bg-page), var(--accent) itd.).
 */
import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Routes, Route, Navigate, Link, useNavigate, useParams, useSearchParams, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Users, FileText, Flag, CreditCard, LogOut, ChevronLeft,
  Loader2, SearchX, AlertTriangle, Trash2, Ban, Shield, Zap, ChevronRight
} from 'lucide-react';
import type { User } from './types';
import { getApiBase } from './api';

const API_BASE = getApiBase();
const TOKEN_KEY = 'povezi_access_token';
const getAuthHeaders = (): HeadersInit => {
  const token = localStorage.getItem(TOKEN_KEY);
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const FETCH_TIMEOUT_MS = 10000;

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
    fetch(url, { ...options, signal: abortRef.current.signal, headers: { ...getAuthHeaders(), ...options?.headers } })
      .then(res => {
        if (!res.ok) throw new Error(res.status === 401 ? 'Neautorizovano' : res.status === 403 ? 'Pristup zabranjen' : 'Greška servera');
        return res.json();
      })
      .then((d: T) => {
        if (n === fetchRef.current) setData(d);
      })
      .catch((e: Error) => {
        if (n === fetchRef.current && e.name !== 'AbortError') setError(e.message || 'Greška');
      })
      .finally(() => {
        clearTimeout(timer);
        if (n === fetchRef.current) setLoading(false);
      });
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
  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--bg-page)', color: 'var(--text-primary)' }}>
      <header className="border-b sticky top-0 z-10 flex items-center justify-between px-4 py-3" style={{ backgroundColor: 'var(--bg-nav)', borderColor: 'var(--border-subtle)' }}>
        <div className="flex items-center gap-4">
          <Link to="/admin" className="font-black uppercase tracking-widest text-sm">Admin</Link>
          <nav className="flex gap-2">
            <Link to="/admin" className="px-3 py-2 rounded-lg text-xs font-bold uppercase" style={{ color: 'var(--text-secondary)' }}>Dashboard</Link>
            <Link to="/admin/users" className="px-3 py-2 rounded-lg text-xs font-bold uppercase" style={{ color: 'var(--text-secondary)' }}>Korisnici</Link>
            <Link to="/admin/ads" className="px-3 py-2 rounded-lg text-xs font-bold uppercase" style={{ color: 'var(--text-secondary)' }}>Oglasi</Link>
            <Link to="/admin/pending" className="px-3 py-2 rounded-lg text-xs font-bold uppercase" style={{ color: 'var(--text-secondary)' }}>Na čekanju</Link>
            <Link to="/admin/reports" className="px-3 py-2 rounded-lg text-xs font-bold uppercase" style={{ color: 'var(--text-secondary)' }}>Prijave</Link>
            <Link to="/admin/payments" className="px-3 py-2 rounded-lg text-xs font-bold uppercase" style={{ color: 'var(--text-secondary)' }}>Plaćanja</Link>
          </nav>
        </div>
        <button type="button" onClick={() => { localStorage.removeItem(TOKEN_KEY); navigate('/'); window.location.reload(); }} className="p-2 rounded-lg" style={{ color: 'var(--text-secondary)' }} title="Odjavi se"><LogOut className="w-5 h-5" /></button>
      </header>
      <main className="flex-1 p-4 max-w-7xl mx-auto w-full">{children}</main>
    </div>
  );
};

// ----- Dashboard -----
export const AdminDashboard: React.FC = () => {
  const { data, loading, error, refetch } = useAdminFetch<{
    totalUsers: number; totalAds: number; activeAds: number; premiumAds: number; reportedAds: number; revenueTotal: number;
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
  const s = data!;
  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-black uppercase tracking-widest">Dashboard</h1>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: 'Korisnici', value: s.totalUsers },
          { label: 'Oglasi', value: s.totalAds },
          { label: 'Aktivni', value: s.activeAds },
          { label: 'Premium', value: s.premiumAds },
          { label: 'Prijave (otvorene)', value: s.reportedAds },
          { label: 'Prihodi (€)', value: s.revenueTotal }
        ].map(({ label, value }) => (
          <div key={label} className="p-4 rounded-xl border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}>
            <p className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: 'var(--text-secondary)' }}>{label}</p>
            <p className="text-xl font-bold">{value}</p>
          </div>
        ))}
      </div>
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="rounded-xl border p-4" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}>
          <h2 className="text-sm font-black uppercase mb-3">Poslednjih 5 korisnika</h2>
          {s.lastUsers.length === 0 ? <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Nema</p> : (
            <ul className="space-y-2">
              {s.lastUsers.map((u: { id: string; ime: string; email: string }) => (
                <li key={u.id} className="flex justify-between text-sm"><span>{u.ime}</span><span style={{ color: 'var(--text-secondary)' }}>{u.email}</span></li>
              ))}
            </ul>
          )}
        </div>
        <div className="rounded-xl border p-4" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}>
          <h2 className="text-sm font-black uppercase mb-3">Poslednjih 5 oglasa</h2>
          {s.lastAds.length === 0 ? <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Nema</p> : (
            <ul className="space-y-2">
              {s.lastAds.map((a: { id: string; naslov: string; slug: string; vlasnik: { ime: string } }) => (
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
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
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
  const q = new URLSearchParams({ page: '1', limit: '50', status: 'NA_CEKANJU' });
  const { data, loading, error, refetch } = useAdminFetch<{ ads: Array<{ id: string; naslov: string; slug: string; kategorija: string; cijena: number; vlasnik: { ime: string; email: string }; createdAt: string }>; total: number }>(`${API_BASE}/admin/ads?${q}`);

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
      <h1 className="text-2xl font-black uppercase tracking-widest">Odobri oglase</h1>
      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Oglasi na čekanju: {total}. Odobri ih da postanu aktivni ili odbij (brisanje).</p>
      {list.length === 0 ? (
        <div className="rounded-xl border p-8 text-center" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)', color: 'var(--text-secondary)' }}>Nema oglasa na čekanju.</div>
      ) : (
        <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}>
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
                    <a href={`/oglas/${a.slug}`} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 rounded-xl text-xs font-bold uppercase border" style={{ borderColor: 'var(--border-subtle)' }}>Pogledaj</a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
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
                  <td className="p-3">{p.ad ? <Link to={`/oglas/${p.ad.slug}`} className="underline" style={{ color: 'var(--accent)' }}>{p.ad.naslov}</Link> : '—'}</td>
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

export const AdminRoutes: React.FC<{ user: User | null; onLogin: (u: User) => void }> = ({ user, onLogin }) => (
  <Routes>
    <Route path="/admin/login" element={user?.role === 'admin' ? <Navigate to="/admin" replace /> : <AdminLogin onLogin={onLogin} />} />
    <Route path="/admin" element={<AdminGuard user={user}><AdminLayout><AdminDashboard /></AdminLayout></AdminGuard>} />
    <Route path="/admin/users" element={<AdminGuard user={user}><AdminLayout><AdminUsers /></AdminLayout></AdminGuard>} />
    <Route path="/admin/users/:id" element={<AdminGuard user={user}><AdminLayout><AdminUserDetail /></AdminLayout></AdminGuard>} />
    <Route path="/admin/ads" element={<AdminGuard user={user}><AdminLayout><AdminAds /></AdminLayout></AdminGuard>} />
    <Route path="/admin/pending" element={<AdminGuard user={user}><AdminLayout><AdminPendingAds /></AdminLayout></AdminGuard>} />
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
