import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { createPortal } from 'react-dom';
import {
  Search, X, PlusCircle, Bell, LogOut, MessageCircle, UserIcon, ShieldCheck,
  Sun, Moon, Heart, LayoutDashboard, ArrowLeft, BookmarkPlus, MessageSquare, Smartphone,
} from 'lucide-react';
import { Logo } from './Logo';
import { getInitial } from '../lib/utils';
import { TOKEN_KEY } from '../lib/auth';
import { getApiBase } from '../api';
import { usePWAInstall } from '../src/hooks/usePWAInstall';
import type { User, Notification } from '../types';

const API_BASE = getApiBase();
const SHOW_CHAT = true;

export type ThemeId = 'midnight' | 'light';

const MenuLink = ({ to, icon, label, onClick }: { to: string; icon: React.ReactNode; label: string; onClick: () => void }) => (
  <Link to={to} onClick={onClick} className="flex items-center gap-3 p-3 font-bold rounded-xl transition-all" style={{ color: 'var(--text-primary)' }}>
    <span style={{ color: 'var(--accent)' }}>{icon}</span> {label}
  </Link>
);

export const Header: React.FC<{
  user: User | null;
  notifications: Notification[];
  favoritesCount: number;
  onLogout: () => void;
  theme: ThemeId;
  onThemeChange: (t: ThemeId) => void;
  mobileSearchOpen?: boolean;
  onMobileSearchOpenChange?: (open: boolean) => void;
  pendingAdminCount?: number;
}> = ({ user, notifications, favoritesCount, onLogout, theme, onThemeChange, mobileSearchOpen = false, onMobileSearchOpenChange, pendingAdminCount = 0 }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [showIOSInstallHint, setShowIOSInstallHint] = useState(false);
  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const pwa = usePWAInstall();
  const [searchParams] = useSearchParams();
  const unreadCount = notifications.filter((n) => !n.procitano).length;
  const hasPendingAds = user?.role === 'admin' && pendingAdminCount > 0;

  useEffect(() => {
    setSearchValue(searchParams.get('q') || '');
  }, [searchParams]);
  useEffect(() => {
    if (mobileSearchOpen) searchInputRef.current?.focus();
  }, [mobileSearchOpen]);

  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    onMobileSearchOpenChange?.(false);
    if (searchValue.trim()) navigate(`/marketplace?q=${encodeURIComponent(searchValue.trim())}`);
    else navigate('/marketplace');
  };

  return (
    <nav className="povezi-header-safe fixed top-0 left-0 right-0 border-b z-[1000] flex items-center transition-colors" style={{ backgroundColor: 'var(--bg-nav)', borderColor: 'var(--border-subtle)' }}>
      <div className="max-w-7xl mx-auto px-4 w-full flex justify-between items-center">
        <Link to="/"><Logo /></Link>
        <div className={`flex-grow max-w-xl mx-4 lg:mx-8 ${mobileSearchOpen ? 'block' : 'hidden'} lg:block`}>
          <form onSubmit={handleSearch} className="relative w-full flex items-center gap-2">
            <div className="relative flex-grow">
              <Search className="absolute left-3 lg:left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 lg:w-4 h-4 opacity-60 pointer-events-none" style={{ color: 'var(--text-secondary)' }} />
              <input ref={searchInputRef} type="text" value={searchValue} onChange={(e) => setSearchValue(e.target.value)} placeholder="Pretraži..." className="w-full h-10 lg:h-12 border rounded-xl pl-10 lg:pl-12 pr-10 lg:pr-4 text-xs lg:text-sm outline-none transition-colors" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }} />
              {mobileSearchOpen && (
                <button type="button" onClick={() => onMobileSearchOpenChange?.(false)} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg lg:hidden" style={{ color: 'var(--text-secondary)' }} aria-label="Zatvori pretragu"><X className="w-4 h-4" /></button>
              )}
            </div>
            <button type="submit" className="hidden sm:block h-10 lg:h-12 px-4 lg:px-6 text-white rounded-xl font-bold text-[10px] lg:text-xs uppercase transition-colors" style={{ backgroundColor: 'var(--accent)' }}>Pretraži</button>
          </form>
        </div>
        <div className="flex items-center gap-2 lg:gap-4">
          <button type="button" onClick={() => onThemeChange(theme === 'midnight' ? 'light' : 'midnight')} className="p-2 rounded-xl transition-colors hover:opacity-80 flex items-center justify-center" style={{ color: 'var(--text-secondary)', borderColor: 'var(--border-subtle)' }} title={theme === 'midnight' ? 'Svijetla tema' : 'Tamna tema'} aria-label="Promijeni temu">
            {theme === 'midnight' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
          <Link to="/objavi" className="hidden lg:flex h-11 text-white px-5 rounded-xl items-center gap-2 font-black uppercase text-[10px] transition-colors" style={{ backgroundColor: 'var(--accent)' }}><PlusCircle className="w-4 h-4" /> Objavi Oglas</Link>
          {user?.role === 'admin' && (
            <>
              {hasPendingAds && (
                <Link to="/admin/pending" className="hidden lg:flex h-10 lg:h-11 px-3 lg:px-4 rounded-xl items-center gap-2 font-bold text-[10px] lg:text-xs uppercase border relative" style={{ borderColor: 'var(--accent)', color: 'var(--accent)', backgroundColor: 'rgba(79, 109, 255, 0.12)' }} title={`${pendingAdminCount} oglasa na čekanju`}>
                  <Bell className="w-4 h-4" /><span>Na čekanju</span>
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full text-[10px] font-black text-white" style={{ backgroundColor: '#ef4444' }}>{pendingAdminCount}</span>
                </Link>
              )}
              <Link to="/admin" className="hidden lg:flex h-10 lg:h-11 px-3 lg:px-4 rounded-xl items-center gap-2 font-bold text-[10px] lg:text-xs uppercase border transition-colors relative" style={{ borderColor: 'var(--accent)', color: 'var(--accent)' }} title="Admin panel"><ShieldCheck className="w-4 h-4" /> Admin{hasPendingAds ? <span className="ml-0.5 min-w-[18px] h-[18px] px-1 inline-flex items-center justify-center rounded-full text-[10px] font-black text-white" style={{ backgroundColor: '#ef4444' }}>{pendingAdminCount}</span> : null}</Link>
            </>
          )}
          {SHOW_CHAT && user && <Link to="/poruke" className="p-2 rounded-xl hidden lg:block transition-colors hover:opacity-80" style={{ color: 'var(--text-secondary)' }} title="Poruke"><MessageCircle className="w-5 h-5" /></Link>}
          {user && (
            <Link to="/obavjestenja" className="p-2 relative rounded-xl transition-colors hover:opacity-80 flex items-center justify-center" style={{ color: 'var(--text-secondary)' }} title="Obavještenja"><Bell className="w-5 h-5" />{unreadCount > 0 && <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />}</Link>
          )}
          {!user && (
            <Link to="/prijava" className="hidden sm:flex h-10 lg:h-11 px-4 text-white rounded-xl items-center justify-center font-bold text-[10px] lg:text-xs uppercase transition-colors" style={{ backgroundColor: 'var(--accent)' }}>Prijavi se</Link>
          )}
          <button onClick={() => setMenuOpen(!menuOpen)} className="w-8 h-8 lg:w-10 lg:h-10 flex items-center justify-center rounded-xl border overflow-hidden transition-all active:scale-95" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }} aria-label="Meni">{user ? <span className="font-bold text-[10px] lg:text-xs" style={{ color: 'var(--accent)' }}>{getInitial(user.ime)}</span> : <UserIcon className="w-4 h-4 lg:w-5 lg:h-5" style={{ color: 'var(--text-secondary)' }} />}</button>
        </div>
      </div>
      {menuOpen && createPortal(
        <div className="fixed inset-0 z-[2000]" aria-hidden="false">
          <div className="absolute inset-0 bg-black/70 z-[2001]" style={{ pointerEvents: 'none' }} aria-hidden />
          <div className="povezi-profile-menu-panel absolute right-0 top-0 bottom-0 w-72 z-[2002] border-l-2 p-6 shadow-2xl animate-slide-in-right transition-colors" style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }} onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-8">
              <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-secondary)' }}>Meni</span>
              <button type="button" onClick={() => setMenuOpen(false)} className="p-2 rounded-lg transition-colors" style={{ color: 'var(--text-secondary)' }}><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-2">
              <MenuLink to="/marketplace" icon={<ArrowLeft className="w-4 h-4" />} label="Glavna stranica" onClick={() => setMenuOpen(false)} />
              {user ? (
                <>
                  <MenuLink to="/objavi" icon={<PlusCircle className="w-4 h-4" />} label="Objavi oglas" onClick={() => setMenuOpen(false)} />
                  <MenuLink to="/moji-oglasi" icon={<LayoutDashboard className="w-4 h-4" />} label="Moji Oglasi" onClick={() => setMenuOpen(false)} />
                  <MenuLink to="/moji-favoriti" icon={<Heart className="w-4 h-4" />} label="Sačuvano" onClick={() => setMenuOpen(false)} />
                  <MenuLink to="/moje-spremljene-pretrage" icon={<BookmarkPlus className="w-4 h-4" />} label="Spremljene pretrage" onClick={() => setMenuOpen(false)} />
                  <MenuLink to="/obavjestenja" icon={<Bell className="w-4 h-4" />} label="Obavještenja" onClick={() => setMenuOpen(false)} />
                  {SHOW_CHAT && <MenuLink to="/poruke" icon={<MessageSquare className="w-4 h-4" />} label="Poruke" onClick={() => setMenuOpen(false)} />}
                  <div className="h-px bg-slate-700 my-4" style={{ backgroundColor: 'var(--border-subtle)' }} />
                  <button type="button" className="w-full flex items-center gap-3 p-3 font-bold text-red-400 hover:bg-red-500/20 rounded-xl transition-all border border-red-500/20 relative z-[2003]" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMenuOpen(false); onLogout(); navigate('/', { replace: true }); }}>
                    <LogOut className="w-4 h-4 shrink-0" /> Odjavi se
                  </button>
                </>
              ) : (
                <MenuLink to="/prijava" icon={<UserIcon className="w-4 h-4" />} label="Prijavi se" onClick={() => setMenuOpen(false)} />
              )}
              {pwa.showInstallLink && (pwa.canInstall ? (
                <button type="button" onClick={() => { pwa.promptInstall(); setMenuOpen(false); }} className="w-full flex items-center gap-3 p-3 font-bold rounded-xl transition-all text-left" style={{ color: 'var(--accent)' }}>
                  <Smartphone className="w-4 h-4 shrink-0" /> Preuzmi aplikaciju
                </button>
              ) : pwa.isIOS ? (
                <>
                  <button type="button" onClick={() => setShowIOSInstallHint(!showIOSInstallHint)} className="w-full flex items-center gap-3 p-3 font-bold rounded-xl transition-all text-left" style={{ color: 'var(--accent)' }}>
                    <Smartphone className="w-4 h-4 shrink-0" /> Dodaj na početni ekran
                  </button>
                  {showIOSInstallHint && (
                    <div className="px-3 py-2 rounded-xl text-xs" style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text-secondary)' }}>
                      Pritisni <span className="font-bold" style={{ color: 'var(--text-primary)' }}>Share</span> (ikonu deljenja) u Safari-ju, pa izaberi &quot;Dodaj na početni ekran&quot;.
                    </div>
                  )}
                </>
              ) : (
                <>
                  <button type="button" onClick={() => setShowIOSInstallHint(!showIOSInstallHint)} className="w-full flex items-center gap-3 p-3 font-bold rounded-xl transition-all text-left" style={{ color: 'var(--accent)' }}>
                    <Smartphone className="w-4 h-4 shrink-0" /> Preuzmi aplikaciju
                  </button>
                  {showIOSInstallHint && (
                    <div className="px-3 py-2 rounded-xl text-xs" style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text-secondary)' }}>
                      {pwa.isMobile ? <>U Chrome-u: pritisni meni <span className="font-bold" style={{ color: 'var(--text-primary)' }}>⋮</span> (tri tačke) pa izaberi &quot;Instaliraj aplikaciju&quot; ili &quot;Dodaj na početni ekran&quot;.</> : <>U Chrome-u: pritisni meni <span className="font-bold" style={{ color: 'var(--text-primary)' }}>⋮</span> (tri tačke) pa izaberi &quot;Instaliraj Povezi.ME&quot;. Možda će opcija biti dostupna nakon par posjeta.</>}
                    </div>
                  )}
                </>
              ))}
              {user?.role === 'admin' && (
                <Link to="/admin" onClick={() => setMenuOpen(false)} className="flex items-center justify-between gap-3 p-3 font-bold rounded-xl transition-all" style={{ color: 'var(--text-primary)' }}>
                  <span className="flex items-center gap-3"><span style={{ color: 'var(--accent)' }}><ShieldCheck className="w-4 h-4" /></span> Admin panel</span>
                  {hasPendingAds && <span className="min-w-[22px] h-6 px-2 flex items-center justify-center rounded-full text-xs font-black text-white" style={{ backgroundColor: '#ef4444' }}>{pendingAdminCount} na čekanju</span>}
                </Link>
              )}
            </div>
          </div>
          <button type="button" className="absolute inset-0 z-[2001] cursor-default" onClick={() => setMenuOpen(false)} aria-label="Zatvori meni" />
        </div>,
        document.body
      )}
    </nav>
  );
};
