/// <reference types="vite/client" />
import React, { useState, useMemo, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import { flushSync, createPortal } from 'react-dom';
import {
  scrollToTop,
  hardScrollToTop,
  getScrollRoot,
  getScrollTop,
  restoreScroll,
  getListRouteKey,
  saveScrollForList,
  loadScrollForList,
  loadAndClearScrollForList,
  clearListScroll,
  RETURN_TO_MARKETPLACE_KEY,
  SCROLL_TO_AD_SLUG_KEY,
  isDetailRoute,
} from './lib/scroll';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useNavigate, useParams, useSearchParams, useLocation, type NavigateFunction } from 'react-router-dom';
import { 
  Search, X, PlusCircle, MapPin, Filter, Star, Eye, Phone, LayoutDashboard,
  CheckCircle2, Trash2, ImageIcon, RefreshCcw, ChevronLeft, Menu,
  Edit2, MessageSquare, ArrowUpRight, ShieldCheck, UserIcon,
  LogOut, Send, ArrowLeft, Bell, AlertTriangle, Zap, XCircle, Loader2, Rocket, Heart,
  ChevronRight as ChevronRightIcon, StarHalf, MessageCircle, SlidersHorizontal, Camera,
  Instagram, Facebook, Trash, Settings2, Info, Calendar, UserCheck, ChevronRight, Share2, Award, SearchX,
  Plus, ChevronDown, Check, Upload, Sun, Moon, BookmarkPlus, Map, Smartphone
} from 'lucide-react';

import {
  User, Ad, AdStatus, FuelType, CarDetails, MotorcycleDetails, MotorcycleType,
  TransmissionType, DriveType, BodyType, Message, Conversation,
  Notification, SecurityEvent, Rating
} from './types';
import {
  DEMO_ADS as INITIAL_ADS, CATEGORIES,
  LOCATIONS, INITIAL_NOTIFICATIONS, MOTO_CATALOG, VEHICLE_FIELDS_CONFIG, STANJE_OPTIONS,
  TIP_OGLASA_OPTIONS, TIP_OGLASA_USLUGE, NEKRETNINE_TIP_PONUDE, NEKRETNINE_BROJ_SOBA,
  NEKRETNINE_TIP, NEKRETNINE_SPRAT, NEKRETNINE_TIP_FIELDS, NEKRETNINE_AMENITIES,
  MOTORNA_VOZILA_ID, MOTORNA_VOZILA_SUBCATEGORIES,
  AUTO_DIJELOVI_TIP, ZA_DJECU_TIP, ZA_DJECU_UZRAST,
  USLUGE_NACIN_NAPLATE, BIJELA_TEHNIKA_TIP, BIJELA_TEHNIKA_ENERGIJA,
  NAMJESTAJ_TIP, NAMJESTAJ_MATERIJAL, POLJOPRIVREDA_TIP, TEHNIKA_TIP,
  KUCNI_LJUBIMCI_VRSTA, MODA_TIP, MODA_VELICINE, POSLOVI_TIP, SPORT_TIP,
  GRADJEVINA_TIP, POKLONI_TIP, POKLONI_POVOD
} from './constants';
import { AUTOMOTIVE_CATALOG } from './automotiveCatalog';
import { getFallbackMakeItems, getFallbackModelItems, hasFallbackCatalog } from './vehicleFallbackCatalogs';
import { FixedSizeList as VirtualList } from 'react-window';
import { ErrorBoundary } from './components/ErrorBoundary';
import { EmptyState } from './components/EmptyState';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { NotFound, LegalPage, PaymentSuccessPage, ForgotPasswordPage, ResetLozinkePage, PRAVILA_CONTENT, PRIVATNOST_CONTENT } from './pages';
const MarketplaceMap = React.lazy(() => import('./components/MarketplaceMap').then(m => ({ default: m.MarketplaceMap })));
const MapLocationPicker = React.lazy(() => import('./components/MapLocationPicker').then(m => ({ default: m.MapLocationPicker })));
const AdDetailMap = React.lazy(() => import('./components/AdDetailMap').then(m => ({ default: m.AdDetailMap })));
import { FormField } from './components/FormField';
import { WelcomeScreen } from './components/WelcomeScreen';

const AdminRoutes = React.lazy(() => import('./AdminPanel').then((m) => ({ default: m.AdminRoutes })));
import { getApiBase, getApiBaseForRedirect, getSocketUrl, getProxiedImageUrl, getDirectImageUrl, TRANSPARENT_1X1, isChatDebug } from './api';
import { DEFAULT_FILTERS, CATEGORIES_WITH_FILTER_PANEL, SORT_OPTIONS, VEHICLE_SUBCATEGORIES_FOR_API, MAX_UPLOAD_WIDTH, UPLOAD_JPEG_QUALITY } from './lib/marketplaceConfig';
import { setPageMeta, getInitial, timeAgo, formatRelativeTime, resizeImageForUpload, DEFAULT_DESCRIPTION } from './lib/utils';
import { getAuthHeaders, TOKEN_KEY } from './lib/auth';
import { apiFetch } from './lib/api/client';
import { useAds } from './hooks/useAds';
import { useFavorites } from './hooks/useFavorites';
import { useNotifications } from './hooks/useNotifications';
import { usePWAInstall } from './src/hooks/usePWAInstall';
import { mapApiAdToAd } from './features/ads/mappers';
import { io, type Socket } from 'socket.io-client';
const API_BASE = getApiBase();
/** Chat uključen – linkovi Poruke u headeru i "Poruka prodavcu" na stranici oglasa */
const SHOW_CHAT = true;

const THEME_KEY = 'povezi_theme';
export type ThemeId = 'midnight' | 'light';

const DROPDOWN_SCROLL_HEIGHT = 320;
const TOP_COUNT = 10;
/** Granica: kad ima više od toliko opcija za marku/model, koristi se dropdown umjesto običnog selecta */
const MAX_VISIBLE_DEFAULT = 10;

/** Prvih 10 marki u sekciji "Najpopularnije" za automobile (redoslijed kao na AutoDileru). */
const TOP_MAKES_AUTOMOBILI = ['Volkswagen', 'BMW', 'Mercedes-Benz', 'Audi', 'Skoda', 'Toyota', 'Renault', 'Ford', 'Peugeot', 'Opel'];

type VehicleItem = { id: string; name: string; slug?: string; isPrimary?: boolean };

function getMakeItemsForCategory(category: string): VehicleItem[] {
  if (category === 'automobili') {
    return AUTOMOTIVE_CATALOG
      .map(b => ({ id: b.brand, name: b.brand, slug: b.slug, isPrimary: TOP_MAKES_AUTOMOBILI.includes(b.brand), _order: TOP_MAKES_AUTOMOBILI.indexOf(b.brand) }))
      .sort((a, b) => {
        if (a.isPrimary && !b.isPrimary) return -1;
        if (!a.isPrimary && b.isPrimary) return 1;
        if (a.isPrimary && b.isPrimary) return (a._order === -1 ? 99 : a._order) - (b._order === -1 ? 99 : b._order);
        return (a.name || '').localeCompare(b.name || '', 'sr');
      })
      .map(({ _order, ...rest }) => rest);
  }
  if (category === 'motocikli') {
    const keys = Object.keys(MOTO_CATALOG);
    return keys.map((name, idx) => ({ id: name, name, slug: name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''), isPrimary: idx < 10 }));
  }
  const items = getFallbackMakeItems(category);
  return items.map((item, idx) => ({ ...item, isPrimary: idx < 10 }));
}

const VehicleMakeModelDropdown: React.FC<{
  items: VehicleItem[];
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  label?: string;
  optional?: boolean;
}> = ({ items: itemsProp, value, onChange, placeholder = 'Izaberi', label, optional }) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const items = Array.isArray(itemsProp) ? itemsProp : [];

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('click', h);
    return () => document.removeEventListener('click', h);
  }, []);

  const hasTop = items.some(i => i && i.isPrimary);
  const topItems = hasTop ? items.filter(i => i && i.isPrimary).slice(0, TOP_COUNT) : items.slice(0, TOP_COUNT);
  const restItems = hasTop
    ? [...items.filter(i => i && !i.isPrimary)].sort((a, b) => (a.name || '').localeCompare(b.name || '', 'sr'))
    : [...items.slice(TOP_COUNT)].sort((a, b) => (a.name || '').localeCompare(b.name || '', 'sr'));

  return (
    <div ref={containerRef} className="relative space-y-2">
      {label && (
        <label className="text-[10px] font-bold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
          {label}{optional ? ' (opciono)' : ''}
        </label>
      )}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full h-12 rounded-xl px-4 text-left text-sm font-medium border outline-none transition-colors flex items-center justify-between"
        style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}
      >
        <span className={value ? '' : 'opacity-60'}>{value || placeholder}</span>
        <ChevronDown className={`w-4 h-4 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} style={{ color: 'var(--text-secondary)' }} />
      </button>
      {open && (
        <div
          className="absolute z-50 left-0 right-0 mt-1 rounded-xl border shadow-2xl overflow-y-auto overscroll-contain"
          style={{
            backgroundColor: 'var(--bg-card)',
            borderColor: 'var(--border-subtle)',
            maxHeight: 420,
            overscrollBehavior: 'contain',
          }}
          onWheel={(e) => {
            e.stopPropagation();
            const el = e.currentTarget;
            const { scrollTop, scrollHeight, clientHeight } = el;
            const atTop = scrollTop <= 0 && e.deltaY < 0;
            const atBottom = scrollTop + clientHeight >= scrollHeight - 1 && e.deltaY > 0;
            if (atTop || atBottom) e.preventDefault();
          }}
        >
          {topItems.length > 0 && (
            <div className="px-3 py-2 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
              <p className="text-[9px] font-black uppercase tracking-widest mb-2" style={{ color: 'var(--text-secondary)' }}>Najpopularnije</p>
              <div className="space-y-0.5">
                {topItems.map((i) => (
                  <button
                    key={i.id}
                    type="button"
                    onClick={() => { onChange(i.name); setOpen(false); }}
                    className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors hover:bg-white/5"
                    style={{ color: value === i.name ? 'var(--accent)' : 'var(--text-primary)' }}
                  >
                    {i.name}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="py-1">
            {restItems.map((i) => (
              <button
                key={i.id}
                type="button"
                onClick={() => { onChange(i.name); setOpen(false); }}
                className="w-full text-left px-4 py-2.5 rounded-lg text-xs transition-colors hover:bg-white/5"
                style={{ color: value === i.name ? 'var(--accent)' : 'var(--text-primary)' }}
              >
                {i.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const mapApiUserToUser = (u: any): User => ({
  id: u.id,
  ime: u.ime,
  email: u.email,
  telefon: u.telefon,
  datumRegistracije: u.datumRegistracije ? new Date(u.datumRegistracije).getTime() : Date.now(),
  omiljeniOglasi: u.omiljeniOglasi || [],
  role: (u.role === 'ADMIN' ? 'admin' : 'user') as 'user' | 'admin'
});

const AppContent: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [theme, setTheme] = useState<ThemeId>(() => {
    const t = localStorage.getItem(THEME_KEY) as ThemeId | null;
    return t === 'midnight' || t === 'light' ? t : 'midnight';
  });
  const {
    ads,
    adsLoading,
    adsLoadingMore,
    adsError,
    adsAreFallback,
    adsPage,
    adsTotal,
    hasMore,
    fetchFirstPage: fetchAdsFirstPage,
    loadMore: loadMoreAds,
    refresh: refreshAds,
    prependAd,
  } = useAds();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const { favorites, fetchFavorites, toggleFavorite, clearFavorites } = useFavorites(currentUser, ads);
  const { notifications, fetchNotifications, handleMarkNotificationRead, markMessageNotificationsReadForConversation, clearNotifications, setNotifications } = useNotifications();
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [pendingAdminCount, setPendingAdminCount] = useState<number>(0);
  const [installBannerDismissed, setInstallBannerDismissed] = useState(() => {
    try { return sessionStorage.getItem('povezi_install_banner_dismissed') === '1'; } catch { return false; }
  });
  const [installBannerHint, setInstallBannerHint] = useState(false);
  const pwaBanner = usePWAInstall();

  useEffect(() => {
    if (currentUser?.role !== 'admin') {
      setPendingAdminCount(0);
      return;
    }
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return;
    let cancelled = false;
    const fetchPending = () => {
      fetch(`${API_BASE}/admin/stats`, { headers: { Authorization: `Bearer ${token}` } })
        .then(res => res.ok ? res.json() : null)
        .then((data: { pendingAds?: number } | null) => {
          if (!cancelled && data != null && typeof data.pendingAds === 'number')
            setPendingAdminCount(data.pendingAds);
        })
        .catch(() => {});
    };
    fetchPending();
    const interval = setInterval(fetchPending, 60 * 1000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [currentUser?.role]);

  useEffect(() => {
    document.body.dataset.theme = theme;
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  // fetchFavorites i fetchNotifications sada dolaze iz hookova

  useEffect(() => {
    const titles: Record<string, string> = {
      '/': 'Poveži.ME - Premium Marketplace',
      '/marketplace': 'Oglasi - Poveži.ME',
      '/prijava': 'Prijava - Poveži.ME',
      '/registracija': 'Registracija - Poveži.ME',
      '/moji-oglasi': 'Moji oglasi - Poveži.ME',
      '/moji-favoriti': 'Sačuvano - Poveži.ME',
      '/moje-spremljene-pretrage': 'Spremljene pretrage - Poveži.ME',
      '/objavi': 'Objavi oglas - Poveži.ME',
      '/poruke': 'Poruke - Poveži.ME',
      '/obavjestenja': 'Obavještenja - Poveži.ME',
      '/pravila': 'Pravila korištenja - Poveži.ME',
      '/privatnost': 'Politika privatnosti - Poveži.ME'
    };
    let title = titles[location.pathname];
    let description: string | undefined;
    if (location.pathname.startsWith('/kategorija/')) {
      const slug = location.pathname.split('/')[2];
      const cat = CATEGORIES.find(c => c.slug === slug);
      title = cat ? `${cat.name} - Poveži.ME` : 'Oglasi - Poveži.ME';
      description = cat ? `Pregledaj oglase u kategoriji ${cat.name}. Kupuj i prodaj na Poveži.ME.` : undefined;
    }
    if (!title) title = 'Poveži.ME - Premium Marketplace';
    setPageMeta(title, description);
  }, [location.pathname]);

  useEffect(() => {
    const base = getApiBase();
    const href = base.startsWith('http') ? new URL(base).origin : (typeof window !== 'undefined' ? window.location.origin : '');
    if (href && typeof document !== 'undefined') {
      const link = document.createElement('link');
      link.rel = 'preconnect';
      link.href = href;
      document.head.appendChild(link);
      return () => { link.remove(); };
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      setAuthChecked(true);
      return;
    }
    fetch(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.ok ? res.json() : Promise.reject())
      .then(data => {
        if (localStorage.getItem(TOKEN_KEY)) setCurrentUser(mapApiUserToUser(data));
      })
      .catch(() => localStorage.removeItem(TOKEN_KEY))
      .finally(() => setAuthChecked(true));
  }, []);

  useEffect(() => {
    const onAuthExpired = () => {
      localStorage.removeItem(TOKEN_KEY);
      flushSync(() => setCurrentUser(null));
    };
    window.addEventListener('auth:expired', onAuthExpired);
    return () => window.removeEventListener('auth:expired', onAuthExpired);
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchFavorites();
      fetchNotifications();
    } else {
      clearFavorites();
      clearNotifications();
    }
  }, [currentUser?.id, fetchFavorites, fetchNotifications, clearFavorites, clearNotifications]);

  const fetchRatings = useCallback(() => {
    fetch(`${API_BASE}/ratings`)
      .then(res => res.ok ? res.json() : [])
      .then((data: any[]) => {
        if (!Array.isArray(data)) return;
        const mapped: Rating[] = data.map((r: any) => ({
          id: r.id || `r-${r.sellerId}-${r.raterId}`,
          sellerId: r.sellerId || '',
          buyerId: r.raterId || '',
          score: typeof r.score === 'number' ? r.score : 5,
          comment: r.comment || undefined,
          createdAt: r.createdAt ? new Date(r.createdAt).getTime() : Date.now(),
        })).filter((r: Rating) => r.sellerId && r.buyerId);
        setRatings(mapped);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchRatings();
  }, [fetchRatings]);

  const handleLogout = () => {
    localStorage.removeItem(TOKEN_KEY);
    flushSync(() => setCurrentUser(null));
  };

  const getAdsQueryFromLocation = (loc: { pathname: string; search: string }) => {
    const params = new URLSearchParams(loc.search);
    const match = loc.pathname.match(/\/kategorija\/([^/]+)/);
    const categorySlug = match?.[1];
    const cat = CATEGORIES.find(c => c.slug === categorySlug);
    const q: Record<string, string> = { page: '1', limit: '24' };
    if (cat) q.kategorija = cat.id;
    const sub = params.get('subcategory');
    if (sub) q.subcategory = sub;
    ['q', 'lokacija', 'make', 'model', 'priceMin', 'priceMax', 'yearMin', 'yearMax', 'gorivo', 'mjenjac', 'stanje', 'sort'].forEach(k => {
      const v = params.get(k);
      if (v) q[k] = v;
    });
    return q;
  };

  useEffect(() => {
    if (isDetailRoute(location.pathname)) return;
    const hasReturnFlag = sessionStorage.getItem(RETURN_TO_MARKETPLACE_KEY) === '1';
    if (hasReturnFlag && !adsAreFallback && ads.length > 0) return;
    const q = getAdsQueryFromLocation(location);
    fetchAdsFirstPage(q);
  }, [location.pathname, location.search, adsAreFallback, ads.length]);

  const addRating = useCallback((sellerId: string, score: number) => {
    if (!currentUser) return;
    const opt: Rating = {
      id: `r-${Date.now()}`, sellerId, buyerId: currentUser.id, score, createdAt: Date.now()
    };
    setRatings(prev => [...prev.filter(r => !(r.sellerId === sellerId && r.buyerId === currentUser.id)), opt]);
    fetch(`${API_BASE}/ratings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ sellerId, score }),
    })
      .then(res => res.ok ? res.json() : null)
      .then((data: any) => {
        if (data?.id) fetchRatings();
      })
      .catch(() => {});
  }, [currentUser?.id, fetchRatings]);

  const getSellerMetrics = (sellerId: string) => {
    const sellerRatings = ratings.filter(r => r.sellerId === sellerId);
    const count = sellerRatings.length;
    if (count === 0) return { avg: '—', count: 0 };
    const avg = sellerRatings.reduce((sum, r) => sum + r.score, 0) / count;
    return { avg: avg.toFixed(1), count };
  };

  // handleMarkNotificationRead i markMessageNotificationsReadForConversation sada dolaze iz useNotifications hook-a

  const RequireAuth = ({ children }: { children: React.ReactNode }) => {
    const location = useLocation();
    if (!currentUser) return <Navigate to={`/prijava?returnTo=${encodeURIComponent(location.pathname)}`} replace />;
    return <>{children}</>;
  };

  const [searchParams] = useSearchParams();
  const isMobileView = searchParams.get('mobile') === '1';

  useEffect(() => {
    if (typeof window !== 'undefined' && 'scrollRestoration' in history) history.scrollRestoration = 'manual';
  }, []);

  useEffect(() => {
    const meta = document.querySelector('meta[name=viewport]');
    if (!meta) return;
    if (isMobileView) meta.setAttribute('content', 'width=375, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover');
    else meta.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover');
  }, [isMobileView]);

  if (location.pathname.startsWith('/admin')) {
    return (
      <ErrorBoundary>
        <React.Suspense fallback={<div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg-page)' }}><Loader2 className="w-12 h-12 animate-spin" style={{ color: 'var(--accent)' }} /></div>}>
          <AdminRoutes
          user={currentUser}
          onLogin={(u) => setCurrentUser(mapApiUserToUser(u))}
          AdDetailViewComponent={AdDetailView}
          onToggleFavorite={toggleFavorite}
          favorites={favorites}
          ratings={ratings}
          onAddRating={addRating}
          getSellerMetrics={getSellerMetrics}
          setPageMeta={setPageMeta}
        />
        </React.Suspense>
      </ErrorBoundary>
    );
  }

  return (
      <ErrorBoundary>
      <div className="min-h-[100dvh] flex flex-col overflow-x-hidden font-inter" style={{ backgroundColor: 'var(--bg-page)', color: 'var(--text-primary)' }}>
        <WelcomeScreen />
        <Header user={currentUser} notifications={notifications} favoritesCount={favorites.length} onLogout={handleLogout} theme={theme} onThemeChange={setTheme} mobileSearchOpen={mobileSearchOpen} onMobileSearchOpenChange={setMobileSearchOpen} pendingAdminCount={pendingAdminCount} />
        <main className="povezi-main-pt flex-grow flex flex-col min-h-0 pb-24 lg:pb-0">
          <div data-scroll-root className="flex-1 overflow-y-auto min-h-0">
          <Routes>
            <Route path="/mobile-preview" element={<Navigate to="/?mobile=1" replace />} />
            <Route path="/" element={<Navigate to="/marketplace" replace />} />
            <Route path="/marketplace" element={<Marketplace user={currentUser} ads={ads} favorites={favorites} onToggleFavorite={toggleFavorite} adsLoading={adsLoading} adsError={adsError} adsAreFallback={adsAreFallback} onRetryAds={refreshAds} hasMore={hasMore} onLoadMore={loadMoreAds} adsLoadingMore={adsLoadingMore} />} />
            <Route path="/kategorija/:categorySlug" element={<Marketplace user={currentUser} ads={ads} favorites={favorites} onToggleFavorite={toggleFavorite} adsLoading={adsLoading} adsError={adsError} adsAreFallback={adsAreFallback} onRetryAds={refreshAds} hasMore={hasMore} onLoadMore={loadMoreAds} adsLoadingMore={adsLoadingMore} />} />
            {/* Fix: use toggleFavorite instead of undefined onToggleFavorite */}
            <Route path="/oglas/:slug" element={<AdDetail ads={ads} user={currentUser} onToggleFavorite={toggleFavorite} favorites={favorites} ratings={ratings} onAddRating={addRating} getSellerMetrics={getSellerMetrics} />} />
            {/* Fix: use toggleFavorite instead of undefined onToggleFavorite */}
            <Route path="/prodavac/:userId" element={<RequireAuth><PublicProfile ads={ads} favorites={favorites} onToggleFavorite={toggleFavorite} adsError={adsError} adsAreFallback={adsAreFallback} onRetryAds={refreshAds} /></RequireAuth>} />
            <Route path="/obavjestenja" element={<RequireAuth><Notifications notifications={notifications} onMarkRead={handleMarkNotificationRead} onRefresh={fetchNotifications} /></RequireAuth>} />
            <Route path="/prijava" element={<Auth onLogin={(u) => setCurrentUser(mapApiUserToUser(u))} />} />
            <Route path="/registracija" element={<Navigate to="/prijava" replace />} />
            <Route path="/moji-oglasi" element={<RequireAuth><MyAds user={currentUser} onRefresh={refreshAds} /></RequireAuth>} />
            <Route path="/moji-oglasi/uredi/:id" element={<RequireAuth><EditAd user={currentUser} onSaved={refreshAds} /></RequireAuth>} />
            <Route path="/moji-favoriti" element={<RequireAuth><MyFavorites ads={ads} favorites={favorites} onToggleFavorite={toggleFavorite} adsError={adsError} adsAreFallback={adsAreFallback} onRetryAds={refreshAds} /></RequireAuth>} />
            <Route path="/moje-spremljene-pretrage" element={<RequireAuth><MySavedSearches /></RequireAuth>} />
            <Route path="/objavi" element={<RequireAuth><AddAd user={currentUser} onAddAd={prependAd} onPublishSuccess={refreshAds} /></RequireAuth>} />
            <Route path="/poruke" element={SHOW_CHAT ? <RequireAuth><Chat user={currentUser} ads={ads} conversations={conversations} setConversations={setConversations} messages={messages} setMessages={setMessages} setNotifications={setNotifications} onRefreshNotifications={fetchNotifications} onMarkMessageNotificationsRead={markMessageNotificationsReadForConversation} /></RequireAuth> : <Navigate to="/marketplace" replace />} />
            <Route path="/pravila" element={<LegalPage title="Pravila korištenja" content={PRAVILA_CONTENT} />} />
            <Route path="/privatnost" element={<LegalPage title="Politika privatnosti" content={PRIVATNOST_CONTENT} />} />
            <Route path="/payment-success" element={<PaymentSuccessPage />} />
            <Route path="/zaboravljena-lozinka" element={<ForgotPasswordPage />} />
            <Route path="/reset-lozinke" element={<ResetLozinkePage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          </div>
        </main>
        
        {pwaBanner.showInstallLink && !installBannerDismissed && (
          <div className="lg:hidden fixed bottom-[72px] left-2 right-2 z-[1099] animate-slide-up">
            <div className="rounded-xl border shadow-xl flex items-center justify-between gap-3 px-4 py-3" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}>
              <div className="flex items-center gap-2 min-w-0">
                <Smartphone className="w-5 h-5 shrink-0" style={{ color: 'var(--accent)' }} />
                <span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Preuzmi aplikaciju</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button type="button" onClick={() => {
                  if (pwaBanner.canInstall) pwaBanner.promptInstall();
                  else setInstallBannerHint(!installBannerHint);
                }} className="h-9 px-4 rounded-lg text-[10px] font-black uppercase" style={{ backgroundColor: 'var(--accent)', color: 'white' }}>Preuzmi</button>
                <button type="button" onClick={() => { setInstallBannerDismissed(true); try { sessionStorage.setItem('povezi_install_banner_dismissed', '1'); } catch {} }} className="p-1.5 rounded-lg" style={{ color: 'var(--text-secondary)' }} aria-label="Zatvori"><X className="w-4 h-4" /></button>
              </div>
            </div>
            {(pwaBanner.isIOS || !pwaBanner.canInstall || installBannerHint) && (
              <div className="mt-2 rounded-xl border px-3 py-2 text-[11px]" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-subtle)', color: 'var(--text-secondary)' }}>
                {pwaBanner.isIOS ? (
                  <>
                    <p className="font-bold mb-1" style={{ color: 'var(--text-primary)' }}>iPhone – koristi Safari:</p>
                    <ol className="list-decimal list-inside space-y-0.5 text-[10px]">
                      <li>Otvori u <strong>Safari</strong> (ne Chrome)</li>
                      <li>Pritisni <strong>Share</strong> (↑)</li>
                      <li>„Dodaj na početni ekran“</li>
                    </ol>
                  </>
                ) : pwaBanner.isMobile ? 'Chrome: meni ⋮ → Instaliraj aplikaciju' : 'Chrome: meni ⋮ → Instaliraj Povezi.ME'}
              </div>
            )}
          </div>
        )}
        {createPortal(
          <nav role="navigation" aria-label="Donji meni" className="povezi-bottom-nav lg:hidden fixed inset-x-0 bottom-0 z-[99999] px-1 py-2 pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.3)] border-t flex justify-around items-stretch" style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-nav)', minHeight: 56, touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}>
            <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMobileSearchOpen(true); navigate('/marketplace'); }} className="flex flex-col items-center justify-center gap-0.5 flex-1 min-w-0 min-h-[48px] active:opacity-80" style={{ color: (location.pathname === '/' || location.pathname === '/marketplace') ? 'var(--accent)' : 'var(--text-secondary)' }}>
              <Search className="w-5 h-5 shrink-0" />
              <span className="text-[9px] font-bold uppercase tracking-tight">Traži</span>
            </button>
            {SHOW_CHAT && (
              <Link to="/poruke" className="flex flex-col items-center justify-center gap-0.5 flex-1 min-w-0 min-h-[48px] active:opacity-80 relative no-underline" style={{ color: location.pathname === '/poruke' ? 'var(--accent)' : 'var(--text-secondary)' }}>
                <MessageCircle className="w-5 h-5 shrink-0" />
                <span className="text-[9px] font-bold uppercase tracking-tight">Poruke</span>
                {notifications.filter(n => !n.procitano && n.tip === 'message').length > 0 && <span className="absolute top-0 right-1/4 w-2 h-2 bg-red-500 rounded-full" />}
              </Link>
            )}
            <Link to="/objavi" className="flex flex-col items-center justify-center gap-0.5 flex-1 min-w-0 min-h-[48px] -translate-y-1 active:scale-95 no-underline">
              <span className="w-11 h-11 rounded-full flex items-center justify-center border-2 shadow-md" style={{ backgroundColor: 'var(--accent)', borderColor: 'var(--bg-page)' }}>
                <PlusCircle className="w-6 h-6 text-white" />
              </span>
              <span className="text-[9px] font-bold uppercase tracking-tight" style={{ color: 'var(--accent)' }}>Dodaj</span>
            </Link>
            <Link to="/moji-favoriti" className="flex flex-col items-center justify-center gap-0.5 flex-1 min-w-0 min-h-[48px] active:opacity-80 no-underline" style={{ color: location.pathname === '/moji-favoriti' ? 'var(--accent)' : 'var(--text-secondary)' }}>
              <Heart className="w-5 h-5 shrink-0" />
              <span className="text-[9px] font-bold uppercase tracking-tight">Sačuvano</span>
            </Link>
            <Link to="/moji-oglasi" className="flex flex-col items-center justify-center gap-0.5 flex-1 min-w-0 min-h-[48px] active:opacity-80 no-underline" style={{ color: location.pathname === '/moji-oglasi' ? 'var(--accent)' : 'var(--text-secondary)' }}>
              <UserIcon className="w-5 h-5 shrink-0" />
              <span className="text-[9px] font-bold uppercase tracking-tight">Profil</span>
            </Link>
          </nav>,
          document.body
        )}
        <Footer />
        {isMobileView && (() => {
          const q = new URLSearchParams(location.search);
          q.delete('mobile');
          const to = location.pathname + (q.toString() ? '?' + q.toString() : '');
          return (
            <Link to={to} replace className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[1001] px-3 py-1.5 rounded-full text-[10px] font-bold uppercase border shadow-lg" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)', color: 'var(--text-secondary)' }}>Puna verzija</Link>
          );
        })()}
      </div>
      </ErrorBoundary>
  );
};

const App: React.FC = () => (
  <Router>
    <AppContent />
  </Router>
);

/* Header in components/Header.tsx */

const Marketplace: React.FC<{
  user: User | null;
  ads: Ad[];
  favorites: string[];
  onToggleFavorite: (id: string) => void;
  adsLoading?: boolean;
  adsError?: string | null;
  adsAreFallback?: boolean;
  onRetryAds?: () => void;
  hasMore?: boolean;
  onLoadMore?: () => void;
  adsLoadingMore?: boolean;
}> = ({ user, ads, favorites, onToggleFavorite, adsLoading, adsError, adsAreFallback, onRetryAds, hasMore, onLoadMore, adsLoadingMore }) => {
  const { categorySlug } = useParams<{ categorySlug: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  
  const filtersFromURL = useMemo(() => {
    const f: any = {};
    Object.keys(DEFAULT_FILTERS).forEach(key => {
      const val = searchParams.get(key);
      f[key] = val || '';
    });
    return f;
  }, [searchParams]);

  const [filters, setFilters] = useState<any>(filtersFromURL);
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [showFiltersOpen, setShowFiltersOpen] = useState(false);
  const [isNarrowScreen, setIsNarrowScreen] = useState(typeof window !== 'undefined' ? window.innerWidth < 1024 : false);
  const [saveSearchModalOpen, setSaveSearchModalOpen] = useState(false);
  const [saveSearchNaziv, setSaveSearchNaziv] = useState('');
  const [saveSearchLoading, setSaveSearchLoading] = useState(false);
  const [saveSearchError, setSaveSearchError] = useState('');
  const [viewMode, setViewMode] = useState<'lista' | 'mapa'>('lista');
  const searchQuery = searchParams.get('q') || "";
  const pendingScrollYRef = useRef<number | null>(null);
  /** Scroll offset unutar VirtualList-a (samo kad je lista virtualizirana). */
  const pendingListScrollRef = useRef<number | null>(null);
  const virtualListRef = useRef<{ scrollTo: (offset: number) => void } | null>(null);
  const virtualListScrollRef = useRef(0);

  const listKeyRef = useRef<string>('');
  const lastRestoredYRef = useRef<number | null>(null);
  const lastRestoredListOffsetRef = useRef<number | null>(null);
  const stabilizerTimeoutsRef = useRef<number[]>([]);
  /** Dev: detekcija VirtualList onScroll(0) odmah nakon restore-a (list reset) */
  const justRestoredListOffsetRef = useRef<number | null>(null);

  // Sync read pri renderu – da VirtualList dobije initialScrollOffset na prvi render.
  const savedScrollForRestore = useMemo(() => {
    if (typeof window === 'undefined') return null;
    if (sessionStorage.getItem(RETURN_TO_MARKETPLACE_KEY) !== '1') return null;
    try {
      const listKey = getListRouteKey(location.pathname, location.search);
      return loadScrollForList(listKey);
    } catch { return null; }
  }, [location.pathname, location.search]);

  // Pri mountu / nakon back: postavi refs za restore (osim kad imamo slug – tad scrollIntoView).
  useLayoutEffect(() => {
    if (typeof window === 'undefined') return;
    if (isDetailRoute(location.pathname)) return;
    const hasFlag = sessionStorage.getItem(RETURN_TO_MARKETPLACE_KEY) === '1';
    if (!hasFlag) return;
    const hasSlug = !!sessionStorage.getItem(SCROLL_TO_AD_SLUG_KEY);
    if (hasSlug) return;
    try {
      const listKey = getListRouteKey(location.pathname, location.search);
      listKeyRef.current = listKey;
      const saved = savedScrollForRestore || loadScrollForList(listKey);
      if (!saved) return;
      if (saved.virtualOffset != null && saved.virtualOffset > 0) {
        pendingListScrollRef.current = saved.virtualOffset;
        pendingScrollYRef.current = null;
      } else if (saved.y > 0) {
        pendingScrollYRef.current = saved.y;
        pendingListScrollRef.current = null;
      } else {
        pendingScrollYRef.current = null;
        pendingListScrollRef.current = null;
      }
      if (saved.y > 0 || (saved.virtualOffset != null && saved.virtualOffset > 0)) {
        if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
      }
    } catch (_) {}
  }, [location.pathname, location.search, location.key, savedScrollForRestore]);

  // Vrati scroll nakon što se lista renderuje. SAMO kad su oglasi učitani (!adsLoading).
  // Ako restore na skeleton, render ga pregazi. clearListScroll tek nakon uspješnog restore-a.
  useLayoutEffect(() => {
    if (typeof window === 'undefined') return;
    if (adsLoading) return; // čekaj da lista bude renderovana, ne restore na skeleton
    const hasPendingWindow = pendingScrollYRef.current != null;
    const hasPendingList = pendingListScrollRef.current != null;
    if (!hasPendingWindow && !hasPendingList) return;

    let windowRestored = false;
    let listRestored = false;

    const applyWindow = (): boolean => {
      try {
        if (pendingListScrollRef.current != null || pendingScrollYRef.current == null || windowRestored) return windowRestored;
        const savedY = pendingScrollYRef.current;
        const root1 = getScrollRoot();
        const scrollEl = root1;
        const maxScroll = scrollEl && scrollEl !== window
          ? (scrollEl as HTMLElement).scrollHeight - (scrollEl as HTMLElement).clientHeight
          : document.documentElement.scrollHeight - window.innerHeight;
        const y = Math.min(savedY, Math.max(0, maxScroll));
        if (y <= 0) return false;
        restoreScroll(y);
        const currentTop = scrollEl && scrollEl !== window
          ? (scrollEl as HTMLElement).scrollTop
          : (typeof window !== 'undefined' ? window.scrollY : 0);
        if (Math.abs(currentTop - y) <= 5) {
          lastRestoredYRef.current = y;
          windowRestored = true;
          pendingScrollYRef.current = null;
          return true;
        }
      } catch (_) {}
      return false;
    };

    const applyList = (): boolean => {
      try {
        if (pendingListScrollRef.current == null || listRestored) return listRestored;
        const list = virtualListRef.current;
        if (!list || typeof list.scrollTo !== 'function') return false;
        const offset = Math.max(0, pendingListScrollRef.current);
        if (import.meta.env?.DEV) console.log('[Marketplace] restore list savedVirtualOffset=', offset, 'appliedOffset=', offset);
        lastRestoredListOffsetRef.current = offset;
        justRestoredListOffsetRef.current = offset;
        list.scrollTo(offset);
        listRestored = true;
        pendingListScrollRef.current = null;
        if (import.meta.env?.DEV) setTimeout(() => { justRestoredListOffsetRef.current = null; }, 500);
        return true;
      } catch (_) {}
      return false;
    };

    const stabilizer = (savedY: number | null, listOffset: number | null) => {
      if (typeof window === 'undefined') return;
      try {
        if (savedY != null) {
          const scrollEl = getScrollRoot();
          const currentTop = scrollEl && scrollEl !== window ? (scrollEl as HTMLElement).scrollTop : window.scrollY;
          if (currentTop < savedY - 50) {
            restoreScroll(savedY);
            if (import.meta.env?.DEV) console.log('[Marketplace] stabilizer re-applied y=', savedY);
          }
        }
        if (listOffset != null) {
          const list = virtualListRef.current;
          if (list?.scrollTo) list.scrollTo(listOffset);
        }
      } catch (_) {}
    };

    const run = () => {
      const okW = applyWindow();
      const okL = applyList();
      const key = listKeyRef.current;
      const bothDone = pendingScrollYRef.current == null && pendingListScrollRef.current == null;
      if (bothDone && key && (okW || okL)) {
        if (import.meta.env?.DEV) console.log('[Marketplace] restore applied', { okW, okL, key });
        try { sessionStorage.removeItem(RETURN_TO_MARKETPLACE_KEY); } catch {}
        clearListScroll(key);
        listKeyRef.current = '';
        const sy = lastRestoredYRef.current;
        const lo = lastRestoredListOffsetRef.current;
        stabilizerTimeoutsRef.current.push(
          window.setTimeout(() => stabilizer(sy, lo), 300),
          window.setTimeout(() => {
            stabilizer(sy, lo);
            lastRestoredYRef.current = null;
            lastRestoredListOffsetRef.current = null;
          }, 900)
        );
      }
    };

    const savedYForWarn = pendingScrollYRef.current ?? lastRestoredYRef.current ?? 0;
    if (savedYForWarn > 0) {
      stabilizerTimeoutsRef.current.push(window.setTimeout(() => {
        const flag = sessionStorage.getItem(RETURN_TO_MARKETPLACE_KEY);
        const root = getScrollRoot();
        const rootTop = root && root !== window ? (root as HTMLElement).scrollTop : window.scrollY;
        if (flag === '1' || (Math.abs(rootTop) < 5 && savedYForWarn > 50)) {
          console.warn('RESTORE FAILED: root replaced or list reset', { savedY: savedYForWarn, rootScrollTop: rootTop });
        }
      }, 1200));
    }

    const raf = requestAnimationFrame(() => requestAnimationFrame(run));
    const delays = [0, 50, 100, 150, 250, 400, 600, 1000, 1500, 2500];
    const timeouts = delays.map((d) => setTimeout(run, d));
    return () => {
      cancelAnimationFrame(raf);
      timeouts.forEach(clearTimeout);
      stabilizerTimeoutsRef.current.forEach(clearTimeout);
      stabilizerTimeoutsRef.current = [];
    };
  }, [adsLoading, ads.length, location.key]);

  // Kad VirtualList koristi initialScrollOffset, odmah clear refs i storage.
  useEffect(() => {
    if (!savedScrollForRestore?.virtualOffset) return;
    pendingListScrollRef.current = null;
    pendingScrollYRef.current = null;
    const listKey = listKeyRef.current || getListRouteKey(location.pathname, location.search);
    const t = setTimeout(() => {
      try {
        sessionStorage.removeItem(RETURN_TO_MARKETPLACE_KEY);
        clearListScroll(listKey);
      } catch {}
    }, 300);
    return () => clearTimeout(t);
  }, [savedScrollForRestore?.virtualOffset, location.pathname, location.search]);

  // scrollIntoView: na povratak sa oglasa, skroluj do kliknutog oglasa (pouzdano)
  useEffect(() => {
    if (adsLoading) return;
    if (sessionStorage.getItem(RETURN_TO_MARKETPLACE_KEY) !== '1') return;
    const slug = sessionStorage.getItem(SCROLL_TO_AD_SLUG_KEY);
    if (!slug) return;
    let cleared = false;
    const scrollToEl = () => {
      const el = document.querySelector(`[data-ad-slug="${CSS.escape(slug)}"]`);
      if (el instanceof HTMLElement) {
        el.scrollIntoView({ block: 'center', behavior: 'auto' });
        if (!cleared) {
          cleared = true;
          try {
            sessionStorage.removeItem(SCROLL_TO_AD_SLUG_KEY);
            sessionStorage.removeItem(RETURN_TO_MARKETPLACE_KEY);
            clearListScroll(getListRouteKey(location.pathname, location.search));
          } catch {}
        }
      }
    };
    const t1 = setTimeout(scrollToEl, 50);
    const t2 = setTimeout(scrollToEl, 200);
    const t3 = setTimeout(scrollToEl, 500);
    const t4 = setTimeout(() => {
      if (!cleared) {
        cleared = true;
        try {
          sessionStorage.removeItem(SCROLL_TO_AD_SLUG_KEY);
          sessionStorage.removeItem(RETURN_TO_MARKETPLACE_KEY);
          clearListScroll(getListRouteKey(location.pathname, location.search));
        } catch {}
      }
    }, 800);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, [adsLoading, location.pathname, location.search]);

  // Spremi scroll poziciju na scroll event (scroll root ili window + VirtualList)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const save = () => {
      try {
        const wy = getScrollTop();
        const ly = virtualListScrollRef.current;
        const listKey = getListRouteKey(location.pathname, location.search);
        if (wy >= 0 || ly > 0)
          saveScrollForList(listKey, ly);
      } catch (_) {}
    };
    const scrollEl = getScrollRoot();
    if (scrollEl) {
      if (scrollEl === window) {
        window.addEventListener('scroll', save, { passive: true });
        return () => window.removeEventListener('scroll', save);
      }
      scrollEl.addEventListener('scroll', save, { passive: true });
      return () => scrollEl.removeEventListener('scroll', save);
    }
    return () => {};
  }, []);

  // Pri unmountu: backup spremanje scroll pozicije
  useEffect(() => {
    if (typeof window === 'undefined') return;
    return () => {
      try {
        const wy = getScrollTop();
        const ly = virtualListScrollRef.current;
        const listKey = getListRouteKey(location.pathname, location.search);
        if (wy >= 0 || ly >= 0)
          saveScrollForList(listKey, ly);
      } catch (_) {}
    };
  }, []);

  useEffect(() => {
    const m = window.matchMedia('(max-width: 1023px)');
    const handler = (e: MediaQueryListEvent) => setIsNarrowScreen(e.matches);
    setIsNarrowScreen(m.matches);
    m.addEventListener('change', handler);
    return () => m.removeEventListener('change', handler);
  }, []);

  const activeCategory = useMemo(() => CATEGORIES.find(c => c.slug === categorySlug) || null, [categorySlug]);
  const selectedVehicleSubcategory = searchParams.get('subcategory') || '';
  const INITIAL_CATEGORIES_COUNT = isNarrowScreen ? 5 : 8;
  const categoriesForBar = CATEGORIES;
  const visibleCategories = showAllCategories ? categoriesForBar : categoriesForBar.slice(0, INITIAL_CATEGORIES_COUNT);
  const hasMoreCategories = categoriesForBar.length > INITIAL_CATEGORIES_COUNT;
  const isMotornaVozila = activeCategory?.id === MOTORNA_VOZILA_ID;
  const effectiveVehicleSubcategory = isMotornaVozila && selectedVehicleSubcategory && (VEHICLE_FIELDS_CONFIG as any)[selectedVehicleSubcategory] ? selectedVehicleSubcategory : null;
  const isVehicleCategory = isMotornaVozila && !!effectiveVehicleSubcategory;
  const filterPanelCategory = isMotornaVozila && effectiveVehicleSubcategory ? effectiveVehicleSubcategory : (activeCategory?.id ?? '');
  const activeFiltersCount = useMemo(() => {
    const common = [filters.tipOglasa, filters.lokacija, filters.priceMin, filters.priceMax].filter(Boolean).length;
    if (isMotornaVozila && effectiveVehicleSubcategory) {
      const cfg = (VEHICLE_FIELDS_CONFIG as any)[effectiveVehicleSubcategory];
      const keys = cfg ? Object.keys(cfg).flatMap((k: string) => (cfg as any)[k].type === 'number' ? [k + 'Min', k + 'Max'] : [k]) : [];
      const vehicleCount = keys.filter((k: string) => filters[k]).length;
      return common + vehicleCount;
    }
    const cat = activeCategory?.id;
    const catFilterKeys: Record<string, string[]> = {
      nekretnine: ['tip_nekretnine', 'tip_ponude', 'kvadraturaMin', 'broj_soba', 'sprat', 'amenities'],
      auto_dijelovi: ['tipDijela', 'stanje'],
      usluge: ['nacinNaplate'],
      bijela_tehnika: ['tipBijela', 'energetskaKlasa', 'stanje'],
      namjestaj: ['tipNamjestaj', 'materijal', 'stanje'],
      za_djecu: ['tipZaDjecu', 'uzrast', 'stanje'],
      poljoprivreda: ['tipPoljoprivreda'],
      tehnika: ['tipTehnika', 'stanje'],
      kucni_ljubimci: ['vrstaKucni'],
      moda: ['tipModa', 'velicinaModa', 'stanje'],
      poslovi: ['tipPoslovi'],
      sport: ['tipSport', 'stanje'],
      gradjevina: ['tipGradjevina', 'stanje'],
      pokloni_cvijece: ['tipPokloni', 'povodPokloni'],
    };
    const extra = (cat && catFilterKeys[cat]) ? catFilterKeys[cat].filter(k => filters[k]).length : 0;
    return common + extra;
  }, [isMotornaVozila, effectiveVehicleSubcategory, activeCategory?.id, filters]);

  const hasActiveSearch = useMemo(() => {
    if (searchQuery.trim()) return true;
    return Object.entries(filters).some(([, v]) => v != null && String(v).trim() !== '');
  }, [searchQuery, filters]);

  const buildQueryForSave = useCallback(() => {
    const q: Record<string, string> = {};
    searchParams.forEach((v, k) => q[k] = v);
    if (categorySlug) {
      q.category = categorySlug;
      q.kategorija = activeCategory?.id ?? categorySlug;
    }
    return q;
  }, [searchParams, categorySlug, activeCategory?.id]);

  useEffect(() => {
    setFilters(filtersFromURL);
  }, [filtersFromURL]);

  const prevVehicleSubRef = useRef(selectedVehicleSubcategory);
  useEffect(() => {
    if (!isMotornaVozila || !selectedVehicleSubcategory) {
      prevVehicleSubRef.current = selectedVehicleSubcategory;
      return;
    }
    if (prevVehicleSubRef.current !== selectedVehicleSubcategory) {
      prevVehicleSubRef.current = selectedVehicleSubcategory;
      const commonKeys = ['lokacija', 'priceMin', 'priceMax', 'tipOglasa', 'godisteMin', 'godisteMax', 'kilometrazaMin', 'kilometrazaMax'];
      const cfg = (VEHICLE_FIELDS_CONFIG as any)[selectedVehicleSubcategory];
      const specKeys = cfg ? Object.keys(cfg) : [];
      const allowedKeys = new Set([...commonKeys, ...specKeys, 'stanje', 'tip', 'klasaNosivosti', 'nosivostKg', 'brojOsovina', 'pogon', 'radniSati', 'brojCilindara', 'kabina', 'emisioniStandard', 'kubikazaMin', 'kubikazaMax', 'snagaMin', 'snagaMax']);
      const next = new URLSearchParams();
      next.set('subcategory', selectedVehicleSubcategory);
      if (searchQuery) next.set('q', searchQuery);
      searchParams.forEach((val, key) => {
        if (key !== 'marka' && key !== 'model' && allowedKeys.has(key) && val) next.set(key, val);
      });
      setSearchParams(next);
    }
  }, [selectedVehicleSubcategory, isMotornaVozila, searchQuery]);

  const filtered = useMemo(() => {
    let result = activeCategory
      ? ads.filter(ad => {
          if (ad.kategorija !== activeCategory.id) return false;
          if (activeCategory.id === MOTORNA_VOZILA_ID && selectedVehicleSubcategory) return ad.potkategorija === selectedVehicleSubcategory;
          return true;
        })
      : ads;
    
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(ad => {
        const naslov = (ad.naslov != null ? String(ad.naslov) : '').toLowerCase();
        const opis = (ad.opis != null ? String(ad.opis) : '').toLowerCase();
        return naslov.includes(q) || opis.includes(q);
      });
    }
    
    if (filters.lokacija) result = result.filter(ad => ad.lokacija === filters.lokacija);
    if (filters.priceMin) result = result.filter(ad => ad.cijena >= Number(filters.priceMin));
    if (filters.priceMax) result = result.filter(ad => ad.cijena <= Number(filters.priceMax));
    
    if (isMotornaVozila && selectedVehicleSubcategory === 'automobili') {
      if (filters.marka) result = result.filter(ad => ad.carDetails?.marka === filters.marka || (ad as any).make === filters.marka);
      if (filters.model) result = result.filter(ad => ad.carDetails?.model === filters.model || (ad as any).model === filters.model);
      if (filters.godisteMin) result = result.filter(ad => (ad.carDetails?.godiste || 0) >= Number(filters.godisteMin));
      if (filters.godisteMax) result = result.filter(ad => (ad.carDetails?.godiste || 0) <= Number(filters.godisteMax));
      if (filters.kilometrazaMin) result = result.filter(ad => (ad.carDetails?.kilometraza || 0) >= Number(filters.kilometrazaMin));
      if (filters.kilometrazaMax) result = result.filter(ad => (ad.carDetails?.kilometraza || 0) <= Number(filters.kilometrazaMax));
      if (filters.gorivo) result = result.filter(ad => ad.carDetails?.gorivo === filters.gorivo);
      if (filters.mjenjac) result = result.filter(ad => ad.carDetails?.mjenjac === filters.mjenjac);
      if (filters.karoserija) result = result.filter(ad => ad.carDetails?.karoserija === filters.karoserija);
      if (filters.pogon) result = result.filter(ad => ad.carDetails?.pogon === filters.pogon);
      if (filters.stanje) result = result.filter(ad => ad.carDetails?.stanje === filters.stanje);
      if (filters.kubikazaMin) result = result.filter(ad => (ad.carDetails?.kubikaza || 0) >= Number(filters.kubikazaMin));
      if (filters.kubikazaMax) result = result.filter(ad => (ad.carDetails?.kubikaza || 0) <= Number(filters.kubikazaMax));
      if (filters.snagaMin) result = result.filter(ad => (ad.carDetails?.snaga || 0) >= Number(filters.snagaMin));
      if (filters.snagaMax) result = result.filter(ad => (ad.carDetails?.snaga || 0) <= Number(filters.snagaMax));
    }

    if (isMotornaVozila && selectedVehicleSubcategory === 'motocikli') {
      if (filters.marka) result = result.filter(ad => ad.motorcycleDetails?.marka === filters.marka);
      if (filters.model) result = result.filter(ad => ad.motorcycleDetails?.model === filters.model);
      if (filters.yearMin) result = result.filter(ad => (ad.motorcycleDetails?.godiste || 0) >= Number(filters.yearMin));
      if (filters.yearMax) result = result.filter(ad => (ad.motorcycleDetails?.godiste || 0) <= Number(filters.yearMax));
      if (filters.mileageMin) result = result.filter(ad => (ad.motorcycleDetails?.kilometraza || 0) >= Number(filters.mileageMin));
      if (filters.mileageMax) result = result.filter(ad => (ad.motorcycleDetails?.kilometraza || 0) <= Number(filters.mileageMax));
      if (filters.gorivo) result = result.filter(ad => ad.motorcycleDetails?.gorivo === filters.gorivo);
      if (filters.mjenjac) result = result.filter(ad => ad.motorcycleDetails?.mjenjac === filters.mjenjac);
      if (filters.tip) result = result.filter(ad => ad.motorcycleDetails?.tip === filters.tip);
      if (filters.stanje) result = result.filter(ad => ad.motorcycleDetails?.stanje === filters.stanje);
      if (filters.kubikazaMin) result = result.filter(ad => (ad.motorcycleDetails?.kubikaza || 0) >= Number(filters.kubikazaMin));
      if (filters.kubikazaMax) result = result.filter(ad => (ad.motorcycleDetails?.kubikaza || 0) <= Number(filters.kubikazaMax));
      if (filters.snagaMin) result = result.filter(ad => (ad.motorcycleDetails?.snagaKW || 0) >= Number(filters.snagaMin));
      if (filters.snagaMax) result = result.filter(ad => (ad.motorcycleDetails?.snagaKW || 0) <= Number(filters.snagaMax));
    }

    if (filters.tipOglasa) result = result.filter(ad => (ad as any).tipOglasa === filters.tipOglasa);

    if (activeCategory?.id === 'nekretnine') {
      if (filters.tip_nekretnine) result = result.filter(ad => (ad as any).realEstateDetails?.tipNekretnine === filters.tip_nekretnine);
      if (filters.tip_ponude) result = result.filter(ad => (ad as any).realEstateDetails?.tipPonude === (filters.tip_ponude || '').toLowerCase());
      if (filters.kvadraturaMin) result = result.filter(ad => ((ad as any).realEstateDetails?.kvadratura || 0) >= Number(filters.kvadraturaMin));
      if (filters.broj_soba) result = result.filter(ad => (ad as any).realEstateDetails?.brojSoba === filters.broj_soba);
      if (filters.sprat) result = result.filter(ad => (ad as any).realEstateDetails?.sprat === filters.sprat);
      if (filters.amenities) {
        const wanted = (filters.amenities || '').split(',').map((s: string) => s.trim()).filter(Boolean);
        if (wanted.length > 0) {
          result = result.filter(ad => {
            const adAmenities = (ad as any).realEstateDetails?.amenities;
            if (!Array.isArray(adAmenities)) return false;
            const set = new Set(adAmenities);
            return wanted.every((w: string) => set.has(w));
          });
        }
      }
    }

    if (activeCategory?.id === 'auto_dijelovi') {
      if (filters.stanje) result = result.filter(ad => (ad as any).details?.stanje === filters.stanje);
      if (filters.tipDijela) result = result.filter(ad => (ad as any).details?.tipDijela === filters.tipDijela);
    }
    if (activeCategory?.id === 'usluge' && filters.nacinNaplate) {
      result = result.filter(ad => (ad as any).details?.nacinNaplate === filters.nacinNaplate);
    }
    if (activeCategory?.id === 'bijela_tehnika') {
      if (filters.stanje) result = result.filter(ad => (ad as any).details?.stanje === filters.stanje);
      if (filters.tipBijela) result = result.filter(ad => (ad as any).details?.tip === filters.tipBijela);
      if (filters.energetskaKlasa) result = result.filter(ad => (ad as any).details?.energetskaKlasa === filters.energetskaKlasa);
    }
    if (activeCategory?.id === 'namjestaj') {
      if (filters.stanje) result = result.filter(ad => (ad as any).details?.stanje === filters.stanje);
      if (filters.tipNamjestaj) result = result.filter(ad => (ad as any).details?.tip === filters.tipNamjestaj);
      if (filters.materijal) result = result.filter(ad => (ad as any).details?.materijal === filters.materijal);
    }
    if (activeCategory?.id === 'za_djecu') {
      if (filters.stanje) result = result.filter(ad => (ad as any).details?.stanje === filters.stanje);
      if (filters.tipZaDjecu) result = result.filter(ad => (ad as any).details?.tip === filters.tipZaDjecu);
      if (filters.uzrast) result = result.filter(ad => (ad as any).details?.uzrast === filters.uzrast);
    }
    if (activeCategory?.id === 'poljoprivreda' && filters.tipPoljoprivreda) {
      result = result.filter(ad => (ad as any).details?.tip === filters.tipPoljoprivreda);
    }
    if (activeCategory?.id === 'tehnika') {
      if (filters.tipTehnika) result = result.filter(ad => (ad as any).details?.tip === filters.tipTehnika);
      if (filters.stanje) result = result.filter(ad => (ad as any).details?.stanje === filters.stanje);
    }
    if (activeCategory?.id === 'kucni_ljubimci') {
      if (filters.vrstaKucni) result = result.filter(ad => (ad as any).details?.vrsta === filters.vrstaKucni);
    }
    if (activeCategory?.id === 'moda') {
      if (filters.tipModa) result = result.filter(ad => (ad as any).details?.tip === filters.tipModa);
      if (filters.velicinaModa) result = result.filter(ad => (ad as any).details?.velicina === filters.velicinaModa);
      if (filters.stanje) result = result.filter(ad => (ad as any).details?.stanje === filters.stanje);
    }
    if (activeCategory?.id === 'poslovi' && filters.tipPoslovi) {
      result = result.filter(ad => (ad as any).details?.tip === filters.tipPoslovi);
    }
    if (activeCategory?.id === 'sport') {
      if (filters.tipSport) result = result.filter(ad => (ad as any).details?.tip === filters.tipSport);
      if (filters.stanje) result = result.filter(ad => (ad as any).details?.stanje === filters.stanje);
    }
    if (activeCategory?.id === 'gradjevina') {
      if (filters.tipGradjevina) result = result.filter(ad => (ad as any).details?.tip === filters.tipGradjevina);
      if (filters.stanje) result = result.filter(ad => (ad as any).details?.stanje === filters.stanje);
    }
    if (activeCategory?.id === 'pokloni_cvijece') {
      if (filters.tipPokloni) result = result.filter(ad => (ad as any).details?.tip === filters.tipPokloni);
      if (filters.povodPokloni) result = result.filter(ad => (ad as any).details?.povod === filters.povodPokloni);
    }

    const sortOrder = searchParams.get('sort') || '';
    const now = Date.now();
    return [...result].sort((a, b) => {
      const aIsPremium = a.isPaid && a.promotionStatus === "active" && a.promotedUntil !== null && a.promotedUntil > now;
      const bIsPremium = b.isPaid && b.promotionStatus === "active" && b.promotedUntil !== null && b.promotedUntil > now;

      if (aIsPremium && !bIsPremium) return -1;
      if (!aIsPremium && bIsPremium) return 1;

      if (sortOrder === 'price_asc') return a.cijena - b.cijena;
      if (sortOrder === 'price_desc') return b.cijena - a.cijena;
      return b.createdAt - a.createdAt;
    });
  }, [ads, activeCategory, searchQuery, filters, searchParams]);

  const VIRTUAL_LIST_THRESHOLD = 80;
  const useVirtualList = filtered.length > VIRTUAL_LIST_THRESHOLD;
  const virtualListContainerRef = useRef<HTMLDivElement>(null);
  const [virtualListSize, setVirtualListSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    if (!useVirtualList) return;
    const el = virtualListContainerRef.current;
    if (!el) return;
    let rafId: number | null = null;
    const update = () => {
      if (!el) return;
      if (rafId != null) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        rafId = null;
        setVirtualListSize({ width: el.clientWidth, height: el.clientHeight });
      });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      if (rafId != null) cancelAnimationFrame(rafId);
      ro.disconnect();
    };
  }, [useVirtualList, filtered.length]);

  const virtualColumnCount = virtualListSize.width < 1024 ? 2 : virtualListSize.width < 1280 ? 3 : 4;
  const virtualRowCount = virtualListSize.width > 0 ? Math.ceil(filtered.length / virtualColumnCount) : 0;
  const VIRTUAL_OVERSCAN = 5;

  const VIRTUAL_ROW_PADDING = 16 * 2;
  const VIRTUAL_ROW_GAP = 12;
  const VIRTUAL_META_HEIGHT = 160;
  const contentWidth = Math.max(0, virtualListSize.width - VIRTUAL_ROW_PADDING - (virtualColumnCount - 1) * VIRTUAL_ROW_GAP);
  const cardWidth = virtualColumnCount > 0 ? contentWidth / virtualColumnCount : 0;
  const dynamicRowHeight = virtualListSize.width > 0 ? Math.max(280, Math.ceil(cardWidth + VIRTUAL_META_HEIGHT)) : 300;

  const favoritesSet = useMemo(() => new Set(favorites), [favorites]);

  const handleApplyFilters = (newFilters: any) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(newFilters).forEach(([key, val]) => {
      if (val) next.set(key, String(val));
      else next.delete(key);
    });
    setSearchParams(next);
    setFilters(newFilters);
  };

  const handleResetFilters = () => {
    const next = new URLSearchParams();
    if (searchQuery) next.set('q', searchQuery);
    setSearchParams(next);
    setFilters(DEFAULT_FILTERS);
  };

  const saveScrollBeforeNavigate = useCallback((adSlug?: string) => {
    try {
      const listKey = getListRouteKey(location.pathname, location.search);
      saveScrollForList(listKey, Math.round(virtualListScrollRef.current));
      sessionStorage.setItem(RETURN_TO_MARKETPLACE_KEY, '1');
      if (adSlug) sessionStorage.setItem(SCROLL_TO_AD_SLUG_KEY, adSlug);
    } catch (_) {}
  }, [location.pathname, location.search]);

  const searchParamsRef = useRef(searchParams);
  const filtersRef = useRef(filters);
  useEffect(() => { searchParamsRef.current = searchParams; }, [searchParams]);
  useEffect(() => { filtersRef.current = filters; }, [filters]);
  const syncFiltersToUrlRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const syncFiltersToUrl = useCallback(() => {
    if (syncFiltersToUrlRef.current) clearTimeout(syncFiltersToUrlRef.current);
    syncFiltersToUrlRef.current = setTimeout(() => {
      syncFiltersToUrlRef.current = null;
      const prev = searchParamsRef.current;
      const currentFilters = filtersRef.current;
      const next = new URLSearchParams(prev);
      Object.keys(DEFAULT_FILTERS).forEach(key => {
        const v = currentFilters[key];
        if (v) next.set(key, String(v)); else next.delete(key);
      });
      setSearchParams(next);
    }, 600);
  }, []);

  useEffect(() => {
    return () => { if (syncFiltersToUrlRef.current) clearTimeout(syncFiltersToUrlRef.current); };
  }, []);

  if (adsLoading) {
    return (
      <div className="max-w-7xl mx-auto space-y-6 py-4 px-4">
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="flex-shrink-0 w-24 h-10 bg-[#131C2B] rounded-full animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 lg:gap-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-[#131C2B] border border-white/5 rounded-[18px] overflow-hidden aspect-square animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 py-4">
      {(adsError || adsAreFallback) && (
        <div className="mx-4 mb-2 p-3 rounded-xl border flex flex-wrap items-center justify-center gap-2 text-center text-sm" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)', color: 'var(--text-secondary)' }}>
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{adsError || 'Prikazujemo primjer oglasa. Kliknite Osvježi za učitavanje pravih oglasa.'}</span>
          {onRetryAds && (
            <button onClick={onRetryAds} className="px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-colors" style={{ backgroundColor: 'var(--accent)', color: 'white' }}>
              Osvježi
            </button>
          )}
        </div>
      )}
      {/* Mobil: padajući meni "Kategorije"; desktop: pill linkovi */}
        <div className="flex flex-wrap gap-2 px-4 pb-2 items-center">
          {isNarrowScreen ? (
            <div className="w-full flex flex-col gap-2">
              <label className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-secondary)' }}>Kategorije</label>
              <select
                value={activeCategory?.slug ?? ''}
                onChange={(e) => {
                  const slug = e.target.value;
                  navigate(slug ? `/kategorija/${slug}` : '/marketplace');
                }}
                className="w-full h-12 rounded-xl px-4 text-sm font-medium border appearance-none bg-no-repeat bg-right pr-10"
                style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='%239CA3AF' viewBox='0 0 16 16'%3E%3Cpath d='M8 11L3 6h10l-5 5z'/%3E%3C/svg%3E")`, backgroundPosition: 'right 12px center' }}
              >
                <option value="">Sve kategorije</option>
                {CATEGORIES.map(cat => (
                  <option key={cat.id} value={cat.slug}>{cat.name}</option>
                ))}
              </select>
            </div>
          ) : (
            <>
              <Link to="/marketplace" className="flex-shrink-0 px-4 py-2 rounded-xl font-bold uppercase text-[10px] border transition-all" style={!activeCategory ? { background: 'var(--accent)', borderColor: 'transparent', color: 'white' } : { backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)', color: 'var(--text-secondary)' }}>Sve</Link>
              {visibleCategories.map(cat => (
                <Link key={cat.id} to={`/kategorija/${cat.slug}`} className="flex-shrink-0 px-4 py-2 rounded-xl font-bold uppercase text-[10px] border transition-all" style={activeCategory?.id === cat.id ? { background: 'var(--accent)', borderColor: 'transparent', color: 'white' } : { backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)', color: 'var(--text-secondary)' }}>{cat.name}</Link>
              ))}
              {hasMoreCategories && (
                <button type="button" onClick={() => setShowAllCategories(!showAllCategories)} className="flex-shrink-0 px-4 py-2 rounded-xl font-bold uppercase text-[10px] border border-dashed transition-all" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--accent)', color: 'var(--accent)' }}>
                  {showAllCategories ? 'Manje' : 'Još kategorija'}
                </button>
              )}
            </>
          )}
        </div>

      {/* Podkategorije za Motorna vozila – padajući meni (kompaktno na mobilu) */}
      {isMotornaVozila && (
        <div className="px-4 pb-2">
          <select
            value={selectedVehicleSubcategory || ''}
            onChange={(e) => {
              const next = new URLSearchParams(searchParams);
              const v = e.target.value;
              if (v) next.set('subcategory', v); else next.delete('subcategory');
              next.set('page', '1');
              setSearchParams(next);
            }}
            className="w-full max-w-[280px] h-10 px-4 rounded-xl text-sm font-medium border outline-none focus:ring-2 focus:ring-[#4F6DFF]/50 transition-all cursor-pointer"
            style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}
          >
            <option value="">Sve podkategorije</option>
            {MOTORNA_VOZILA_SUBCATEGORIES.map(sub => (
              <option key={sub.id} value={sub.id}>{sub.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Na mobilnom: dugme "Filteri" otvara/zatvara panel; na desktopu filteri uvijek vidljivi. Sortiraj je u istoj liniji kao Tip, Lokacija, Cijena. */}
      <div className="px-4">
        <div className="flex flex-wrap items-center gap-2 pb-3">
          <div className="lg:hidden flex flex-wrap items-center gap-2 flex-1 min-w-0">
            <button
              type="button"
              onClick={() => setShowFiltersOpen(!showFiltersOpen)}
              className="flex items-center gap-2.5 h-12 px-5 rounded-xl font-bold uppercase text-[10px] tracking-wide border transition-all shadow-sm flex-shrink-0"
              style={{
                backgroundColor: showFiltersOpen ? 'var(--bg-input)' : 'var(--bg-card)',
                borderColor: showFiltersOpen ? 'var(--accent)' : 'var(--border-subtle)',
                color: 'var(--text-primary)',
                boxShadow: showFiltersOpen ? '0 0 0 1px var(--accent)' : undefined
              }}
            >
              <SlidersHorizontal className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
              Filteri
              {activeFiltersCount > 0 && (
                <span className="min-w-[20px] h-5 rounded-md flex items-center justify-center text-[10px] font-bold text-white" style={{ backgroundColor: 'var(--accent)' }}>{activeFiltersCount}</span>
              )}
              <ChevronDown className={`w-4 h-4 transition-transform ${showFiltersOpen ? 'rotate-180' : ''}`} style={{ color: 'var(--text-secondary)' }} />
            </button>
            {user && hasActiveSearch && (
              <button type="button" onClick={() => { setSaveSearchError(''); setSaveSearchNaziv(''); setSaveSearchModalOpen(true); }} className="flex items-center gap-2 h-12 px-4 rounded-xl font-bold uppercase text-[10px] tracking-wide border flex-shrink-0" style={{ borderColor: 'var(--accent)', color: 'var(--accent)' }}>
                <BookmarkPlus className="w-4 h-4" /> Spremi
              </button>
            )}
          </div>
        </div>
        <div className={`rounded-xl border overflow-hidden transition-all overflow-y-auto ${showFiltersOpen ? 'max-h-[85vh] opacity-100' : 'max-h-0 opacity-0'} lg:max-h-none lg:opacity-100`} style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          {((isVehicleCategory && filterPanelCategory && (VEHICLE_FIELDS_CONFIG as any)[filterPanelCategory]) || (activeCategory && CATEGORIES_WITH_FILTER_PANEL.includes(activeCategory.id))) ? (
            <div className="p-4 lg:p-5 border-l-4 flex flex-col lg:flex-row lg:items-end lg:gap-6 gap-4" style={{ borderLeftColor: 'var(--accent)' }}>
              <div className="flex-1 min-w-0">
                <FilterPanel
                  category={filterPanelCategory || activeCategory?.id || ''}
                  initialFilters={filters}
                  apiBase={API_BASE}
                  onApply={(f) => {
                    const merged = { ...filters, ...f };
                    const next = new URLSearchParams(searchParams);
                    Object.keys(DEFAULT_FILTERS).forEach(key => {
                      const v = merged[key];
                      if (v) next.set(key, String(v)); else next.delete(key);
                    });
                    setSearchParams(next);
                    setFilters(merged);
                    setShowFiltersOpen(false);
                  }}
                  onReset={handleResetFilters}
                />
              </div>
              <div className="flex flex-col gap-2 flex-shrink-0">
                <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Sortiraj</span>
                <select
                  value={searchParams.get('sort') || ''}
                  onChange={(e) => {
                    const next = new URLSearchParams(searchParams);
                    const v = e.target.value;
                    if (v) next.set('sort', v); else next.delete('sort');
                    next.set('page', '1');
                    setSearchParams(next);
                  }}
                  className="h-11 min-w-[160px] px-4 rounded-xl text-sm font-medium border outline-none focus:ring-2 transition-all"
                  style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}
                >
                  {SORT_OPTIONS.map((opt) => (
                    <option key={opt.value || 'default'} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              {user && hasActiveSearch && (
                <div className="hidden lg:flex flex-col gap-2 flex-shrink-0">
                  <span className="text-[10px] font-bold uppercase tracking-wide opacity-0">.</span>
                  <button type="button" onClick={() => { setSaveSearchError(''); setSaveSearchNaziv(''); setSaveSearchModalOpen(true); }} className="h-11 px-4 rounded-xl text-sm font-bold uppercase border flex items-center gap-2 whitespace-nowrap" style={{ borderColor: 'var(--accent)', color: 'var(--accent)' }}>
                    <BookmarkPlus className="w-4 h-4" /> Spremi pretragu
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="p-4 lg:p-5 grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-row lg:flex-wrap gap-4 lg:gap-6 lg:items-end">
              <div className="flex flex-col gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Tip</span>
                <div className="flex items-center gap-2">
                  {[
                    { value: 'prodajem', label: 'Ponuda' },
                    { value: 'trazim', label: 'Potražnja' },
                  ].map(({ value, label }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => {
                        const next = new URLSearchParams(searchParams);
                        const newVal = filters.tipOglasa === value ? '' : value;
                        if (newVal) next.set('tipOglasa', newVal); else next.delete('tipOglasa');
                        setSearchParams(next);
                        setFilters((f: any) => ({ ...f, tipOglasa: newVal }));
                      }}
                      className="flex-shrink-0 h-11 px-4 rounded-xl font-bold uppercase text-[10px] border transition-all"
                      style={filters.tipOglasa === value ? { background: 'var(--accent)', borderColor: 'transparent', color: 'white' } : { backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-subtle)', color: 'var(--text-secondary)' }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Sortiraj</span>
                <select
                  value={searchParams.get('sort') || ''}
                  onChange={(e) => {
                    const next = new URLSearchParams(searchParams);
                    const v = e.target.value;
                    if (v) next.set('sort', v); else next.delete('sort');
                    next.set('page', '1');
                    setSearchParams(next);
                  }}
                  className="h-11 min-w-[160px] px-4 rounded-xl text-sm font-medium border outline-none focus:ring-2 transition-all"
                  style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}
                >
                  {SORT_OPTIONS.map((opt) => (
                    <option key={opt.value || 'default'} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Cijena (€)</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    step="any"
                    placeholder="Od"
                    value={filters.priceMin || ''}
                    onChange={e => setFilters((f: any) => ({ ...f, priceMin: e.target.value }))}
                    onBlur={syncFiltersToUrl}
                    className="h-11 w-24 flex-1 min-w-0 rounded-xl px-4 text-sm font-medium border outline-none focus:ring-2 transition-all"
                    style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}
                  />
                  <span className="text-xs shrink-0 font-medium" style={{ color: 'var(--text-secondary)' }}>–</span>
                  <input
                    type="number"
                    min={0}
                    step="any"
                    placeholder="Do"
                    value={filters.priceMax || ''}
                    onChange={e => setFilters((f: any) => ({ ...f, priceMax: e.target.value }))}
                    onBlur={syncFiltersToUrl}
                    className="h-11 w-24 flex-1 min-w-0 rounded-xl px-4 text-sm font-medium border outline-none focus:ring-2 transition-all"
                    style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}
                  />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-bold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Lokacija</label>
                <select
                  value={filters.lokacija || ''}
                  onChange={e => {
                    const v = e.target.value;
                    const next = new URLSearchParams(searchParams);
                    if (v) next.set('lokacija', v); else next.delete('lokacija');
                    setSearchParams(next);
                    setFilters((f: any) => ({ ...f, lokacija: v }));
                  }}
                  className="h-11 w-full sm:min-w-[140px] px-4 rounded-xl text-sm font-medium border outline-none focus:ring-2 transition-all"
                  style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}
                >
                  <option value="">Svi gradovi</option>
                  {LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-2 lg:ml-auto">
                {user && hasActiveSearch && (
                  <button type="button" onClick={() => { setSaveSearchError(''); setSaveSearchNaziv(''); setSaveSearchModalOpen(true); }} className="hidden lg:flex h-11 items-center gap-2 text-[10px] font-bold uppercase tracking-wide rounded-xl px-4 border transition-colors" style={{ borderColor: 'var(--accent)', color: 'var(--accent)' }}>
                    <BookmarkPlus className="w-4 h-4" /> Spremi pretragu
                  </button>
                )}
                <button type="button" onClick={handleResetFilters} className="h-11 flex items-center text-[10px] font-bold uppercase tracking-wide rounded-xl px-4 border transition-colors" style={{ color: 'var(--accent)', borderColor: 'var(--accent)' }}>Poništi filtere</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {saveSearchModalOpen && (
        <div className="fixed inset-0 z-[2000] flex items-end sm:items-center justify-center p-4 pt-8 pb-[env(safe-area-inset-bottom,1rem)] sm:pb-4 bg-black/60" onClick={() => !saveSearchLoading && setSaveSearchModalOpen(false)}>
          <div className="w-full max-w-md max-h-[85vh] overflow-y-auto p-6 rounded-2xl border shadow-xl" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }} onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-black uppercase text-white mb-2">Spremi pretragu</h3>
            <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>Naziv je opcionalan. Obavijestićemo vas kad se pojavi novi oglas koji odgovara.</p>
            <input type="text" value={saveSearchNaziv} onChange={e => setSaveSearchNaziv(e.target.value)} placeholder="npr. Stanovi Podgorica do 500€" className="w-full h-14 bg-[#0B1220] border border-white/10 rounded-xl px-4 text-white placeholder-[#6B7280] mb-4 text-base" />
            {saveSearchError && <p className="text-red-400 text-sm mb-4">{saveSearchError}</p>}
            <div className="flex gap-3">
              <button type="button" disabled={saveSearchLoading} onClick={() => setSaveSearchModalOpen(false)} className="flex-1 min-h-[44px] rounded-xl border font-bold uppercase text-sm" style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-secondary)' }}>Odustani</button>
              <button type="button" disabled={saveSearchLoading} onClick={async () => {
                setSaveSearchError('');
                setSaveSearchLoading(true);
                try {
                  const res = await fetch(`${API_BASE}/saved-searches`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
                    body: JSON.stringify({ naziv: saveSearchNaziv.trim() || null, query: buildQueryForSave() }),
                  });
                  const data = await res.json().catch(() => ({}));
                  if (!res.ok) { setSaveSearchError(data?.error || 'Greška pri spremanju.'); return; }
                  setSaveSearchModalOpen(false);
                  setSaveSearchNaziv('');
                  navigate('/moje-spremljene-pretrage');
                } catch { setSaveSearchError('Greška u mreži.'); } finally { setSaveSearchLoading(false); }
              }} className="flex-1 min-h-[44px] rounded-xl font-bold uppercase text-sm flex items-center justify-center gap-2" style={{ backgroundColor: 'var(--accent)', color: 'white' }}>
                {saveSearchLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Spremi'}
              </button>
            </div>
          </div>
        </div>
      )}

      {filtered.length > 0 && (
        <div className="px-4 flex items-center gap-2 pb-3">
          <button type="button" onClick={() => setViewMode('lista')} className={`flex items-center gap-2 h-10 px-4 rounded-xl text-xs font-bold uppercase ${viewMode === 'lista' ? 'bg-[#4F6DFF] text-white' : 'bg-white/5 text-[#9CA3AF] border border-white/10'}`}>
            <SlidersHorizontal className="w-4 h-4" /> Lista
          </button>
          <button type="button" onClick={() => setViewMode('mapa')} className={`flex items-center gap-2 h-10 px-4 rounded-xl text-xs font-bold uppercase ${viewMode === 'mapa' ? 'bg-[#4F6DFF] text-white' : 'bg-white/5 text-[#9CA3AF] border border-white/10'}`}>
            <Map className="w-4 h-4" /> Mapa
          </button>
        </div>
      )}

      {viewMode === 'mapa' && filtered.length > 0 ? (
        <div className="px-4">
          <React.Suspense fallback={<div className="h-[400px] rounded-2xl bg-[#131C2B] animate-pulse" />}>
            <MarketplaceMap ads={filtered} getAdLink={(ad) => `/oglas/${ad.slug || ad.id}`} />
          </React.Suspense>
        </div>
      ) : filtered.length > 0 ? (
        <>
          {useVirtualList && virtualListSize.width > 0 ? (
            <div
              ref={virtualListContainerRef}
              style={{ height: '70vh', minHeight: 400 }}
              className="w-full"
            >
              <VirtualList
                ref={virtualListRef as any}
                height={virtualListSize.height}
                width={virtualListSize.width}
                itemCount={virtualRowCount}
                itemSize={dynamicRowHeight}
                overscanCount={VIRTUAL_OVERSCAN}
                initialScrollOffset={savedScrollForRestore?.virtualOffset ?? 0}
                style={{ overflowX: 'hidden' }}
                onScroll={({ scrollOffset }) => {
                  virtualListScrollRef.current = scrollOffset;
                  if (import.meta.env?.DEV && justRestoredListOffsetRef.current != null && scrollOffset < 5 && justRestoredListOffsetRef.current > 50) {
                    console.warn('[VirtualList] onScroll(0) odmah nakon restore-a – list reset? savedOffset=', justRestoredListOffsetRef.current);
                  }
                }}
              >
                {({ index, style }) => {
                  const t0 = typeof performance !== 'undefined' && (import.meta as any).env?.DEV ? performance.now() : 0;
                  const start = index * virtualColumnCount;
                  const rowAds = filtered.slice(start, start + virtualColumnCount);
                  if ((import.meta as any).env?.DEV && index === 0) {
                    const visibleRows = Math.ceil(virtualListSize.height / dynamicRowHeight);
                    const approxItemsInDom = (visibleRows + VIRTUAL_OVERSCAN) * virtualColumnCount;
                    const renderMs = typeof performance !== 'undefined' ? performance.now() - t0 : 0;
                    console.log('[VirtualList] active', { totalRows: virtualRowCount, columns: virtualColumnCount, approxItemsInDom, rowHeight: dynamicRowHeight, renderMsFirstRow: renderMs.toFixed(2) + 'ms' });
                  }
                  return (
                    <div style={{ ...style, display: 'grid', gridTemplateColumns: `repeat(${virtualColumnCount}, 1fr)`, gap: 12, paddingLeft: 16, paddingRight: 16, boxSizing: 'border-box' }}>
                      {rowAds.map((ad, colIndex) => {
                        const now = Date.now();
                        const isPremium = ad.isPaid && ad.promotionStatus === 'active' && ad.promotedUntil != null && ad.promotedUntil > now;
                        const isFirstCard = index === 0 && colIndex === 0;
                        return (
                          <div
                            key={ad.id}
                            className=""
                            ref={
                              isFirstCard && (import.meta as any).env?.DEV
                                ? (el: HTMLDivElement | null) => {
                                    if (!el) return;
                                    requestAnimationFrame(() => {
                                      const actual = el.getBoundingClientRect().height;
                                      if (dynamicRowHeight < actual) {
                                        console.warn('[VirtualList] itemSize', dynamicRowHeight, '< actual card height', Math.round(actual));
                                      }
                                    });
                                  }
                                : undefined
                            }
                          >
                            <AdCard
                              ad={ad}
                              isFavorite={favoritesSet.has(ad.id)}
                              onToggleFavorite={onToggleFavorite}
                              linksDisabled={!!adsError || !!adsAreFallback}
                              onFallbackClick={onRetryAds}
                              debugAdsError={adsError}
                              debugAdsAreFallback={adsAreFallback}
                              imgWidth={400}
                              fetchPriority={start + colIndex < 6 ? 'high' : 'low'}
                              onBeforeNavigate={saveScrollBeforeNavigate}
                            />
                          </div>
                        );
                      })}
                    </div>
                  );
                }}
              </VirtualList>
            </div>
          ) : useVirtualList ? (
            <div ref={virtualListContainerRef} style={{ height: '70vh', minHeight: 400 }} className="w-full" />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 px-4 lg:gap-6">
              {filtered.map((ad, i) => {
                const now = Date.now();
                const isPremium = ad.isPaid && ad.promotionStatus === 'active' && ad.promotedUntil != null && ad.promotedUntil > now;
                return (
                  <div key={ad.id}>
                    <AdCard
                      ad={ad}
                      isFavorite={favoritesSet.has(ad.id)}
                      onToggleFavorite={onToggleFavorite}
                      linksDisabled={!!adsError || !!adsAreFallback}
                      onFallbackClick={onRetryAds}
                      debugAdsError={adsError}
                      debugAdsAreFallback={adsAreFallback}
                      imgWidth={400}
                      fetchPriority={i < 6 ? 'high' : 'low'}
                      onBeforeNavigate={saveScrollBeforeNavigate}
                    />
                  </div>
                );
              })}
            </div>
          )}
          {hasMore && onLoadMore && (
            <div className="px-4 py-8 flex justify-center">
              <button type="button" onClick={onLoadMore} disabled={adsLoadingMore} className="h-14 px-8 rounded-2xl border font-black uppercase text-[10px] transition-all disabled:opacity-60" style={{ borderColor: 'var(--accent)', color: 'var(--accent)' }}>
                {adsLoadingMore ? <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Učitavanje...</span> : 'Učitaj još'}
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="px-4 py-20">
          <EmptyState variant="no-results" title="Nema rezultata za zadate filtere" onAction={handleResetFilters} actionLabel="Poništi sve filtere" />
        </div>
      )}
    </div>
  );
};

const FilterPanel: React.FC<{ category: string, initialFilters: any, onApply: (f: any) => void, onReset: () => void, apiBase: string }> = ({ category, initialFilters, onApply, onReset, apiBase }) => {
  const [localFilters, setLocalFilters] = useState<any>(initialFilters);
  const [makesFromApi, setMakesFromApi] = useState<{ id: string; name: string; slug: string }[]>([]);
  const [modelsFromApi, setModelsFromApi] = useState<{ id: string; name: string; slug: string }[]>([]);

  useEffect(() => {
    setLocalFilters(initialFilters);
  }, [initialFilters]);

  useEffect(() => {
    if (!VEHICLE_SUBCATEGORIES_FOR_API.includes(category)) {
      setMakesFromApi([]);
      setModelsFromApi([]);
      return;
    }
    setModelsFromApi([]);
    const ac = new AbortController();
    fetch(`${apiBase}/vehicles/makes?subcategory=${encodeURIComponent(category)}`, { signal: ac.signal })
      .then(res => res.ok ? res.json() : { makes: [] })
      .then(data => setMakesFromApi(data.makes || []))
      .catch(() => { if (!ac.signal.aborted) setMakesFromApi([]); });
    return () => ac.abort();
  }, [category, apiBase]);

  useEffect(() => {
    if (!localFilters.marka || makesFromApi.length === 0) {
      setModelsFromApi([]);
      return;
    }
    const make = makesFromApi.find(m => m.name === localFilters.marka);
    if (!make) {
      setModelsFromApi([]);
      return;
    }
    const ac = new AbortController();
    fetch(`${apiBase}/vehicles/models?makeId=${encodeURIComponent(make.id)}`, { signal: ac.signal })
      .then(res => res.ok ? res.json() : { models: [] })
      .then(data => setModelsFromApi(data.models || []))
      .catch(() => { if (!ac.signal.aborted) setModelsFromApi([]); });
    return () => ac.abort();
  }, [localFilters.marka, makesFromApi, apiBase]);

  const renderField = (key: string, config: any) => {
    if (config.type === 'select') {
      let options = config.options || [];
      if (key === 'marka' && VEHICLE_SUBCATEGORIES_FOR_API.includes(category)) {
        const makeItems = getMakeItemsForCategory(category);
        if (makeItems.length > 0) {
          return (
            <div key={key}>
              <VehicleMakeModelDropdown
                items={makeItems}
                value={localFilters.marka || ''}
                onChange={v => setLocalFilters({...localFilters, marka: v, model: ''})}
                placeholder="Sve"
                label={config.label}
              />
            </div>
          );
        }
        options = [];
      } else if (key === 'model' && VEHICLE_SUBCATEGORIES_FOR_API.includes(category)) {
        if (!localFilters.marka) return null;
        const modelItems: VehicleItem[] = category === 'automobili'
          ? (AUTOMOTIVE_CATALOG.find(b => b.brand === localFilters.marka)?.models.map(m => ({ id: m.name, name: m.name, slug: m.slug })) ?? [])
          : category === 'motocikli'
            ? (MOTO_CATALOG[localFilters.marka] || []).map(name => ({ id: name, name, slug: name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') }))
            : getFallbackModelItems(category, localFilters.marka);
        if (modelItems.length > 0) {
          return (
            <div key={key}>
              <VehicleMakeModelDropdown
                items={modelItems}
                value={localFilters.model || ''}
                onChange={v => setLocalFilters({...localFilters, model: v})}
                placeholder="Sve"
                label={config.label}
              />
            </div>
          );
        }
        options = [];
      } else if (key === 'marka') {
        options = category === 'automobili' ? AUTOMOTIVE_CATALOG.map(b => b.brand) : (category === 'motocikli' ? Object.keys(MOTO_CATALOG) : []);
      } else if (key === 'model') {
        if (!localFilters.marka) return null;
        if (category === 'automobili') {
          options = AUTOMOTIVE_CATALOG.find(b => b.brand === localFilters.marka)?.models.map(m => m.name) || [];
        } else if (category === 'motocikli') {
          options = MOTO_CATALOG[localFilters.marka] || [];
        }
      }

      if (options.length > MAX_VISIBLE_DEFAULT && (key === 'marka' || key === 'model')) {
        const items = options.map((o: string) => ({ id: o, name: o, isPrimary: false }));
        return (
          <div key={key}>
            <VehicleMakeModelDropdown
              items={items}
              value={localFilters[key] || ''}
              onChange={v => setLocalFilters({...localFilters, [key]: v, ...(key === 'marka' ? { model: '' } : {})})}
              placeholder="Sve"
              label={config.label}
            />
          </div>
        );
      }

      return (
        <div key={key} className="space-y-2">
          <label className="text-[10px] font-bold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>{config.label}</label>
          <select
            value={localFilters[key] || ""}
            onChange={e => setLocalFilters({...localFilters, [key]: e.target.value, ...(key === 'marka' ? {model: ''} : {})})}
            className="w-full h-12 rounded-xl px-4 text-sm font-medium border outline-none transition-colors povezi-filter-select"
            style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}
          >
            <option value="">Sve</option>
            {options.map((o: any) => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
      );
    }

    if (config.type === 'number') {
      const numMin = typeof config.min === 'number' ? config.min : 0;
      const numMax = typeof config.max === 'number' ? config.max : undefined;
      return (
        <div key={key} className="space-y-2">
          <label className="text-[10px] font-bold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>{config.label}</label>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              min={numMin}
              max={numMax}
              step="any"
              placeholder="Od"
              value={localFilters[key + 'Min'] || ""}
              onChange={e => setLocalFilters({...localFilters, [key + 'Min']: e.target.value})}
              className="w-full h-12 rounded-xl px-4 text-sm font-medium border outline-none transition-colors povezi-filter-input"
              style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}
            />
            <input
              type="number"
              min={numMin}
              max={numMax}
              step="any"
              placeholder="Do"
              value={localFilters[key + 'Max'] || ""}
              onChange={e => setLocalFilters({...localFilters, [key + 'Max']: e.target.value})}
              className="w-full h-12 rounded-xl px-4 text-sm font-medium border outline-none transition-colors povezi-filter-input"
              style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}
            />
          </div>
        </div>
      );
    }

    if (config.type === 'range') {
      const rMin = typeof config.min === 'number' ? config.min : 0;
      const rMax = typeof config.max === 'number' ? config.max : 1000;
      const storeKeyMin = key + 'Min';
      const storeKeyMax = key + 'Max';
      return (
        <div key={key} className="space-y-2">
          <label className="text-[10px] font-bold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>{config.label}</label>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              min={rMin}
              max={rMax}
              step="any"
              placeholder="Od"
              value={localFilters[storeKeyMin] ?? ""}
              onChange={e => setLocalFilters({...localFilters, [storeKeyMin]: e.target.value})}
              className="w-full h-12 rounded-xl px-4 text-sm font-medium border outline-none transition-colors povezi-filter-input"
              style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}
            />
            <input
              type="number"
              min={rMin}
              max={rMax}
              step="any"
              placeholder="Do"
              value={localFilters[storeKeyMax] ?? ""}
              onChange={e => setLocalFilters({...localFilters, [storeKeyMax]: e.target.value})}
              className="w-full h-12 rounded-xl px-4 text-sm font-medium border outline-none transition-colors povezi-filter-input"
              style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}
            />
          </div>
        </div>
      );
    }
    return null;
  };

  const fields = VEHICLE_FIELDS_CONFIG[category as keyof typeof VEHICLE_FIELDS_CONFIG];

  return (
    <div className="rounded-xl p-6 lg:p-8 space-y-6 border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
      <div className="pb-2 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
        <h3 className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-secondary)' }}>Preciziraj pretragu</h3>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* TIP OGLASA */}
        <div className="space-y-2">
          <label className="text-[10px] font-bold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Tip oglasa</label>
          <select value={localFilters.tipOglasa || ""} onChange={e => setLocalFilters({...localFilters, tipOglasa: e.target.value})} className="w-full h-12 border rounded-xl px-4 text-sm font-medium outline-none transition-colors povezi-filter-select" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}>
            <option value="">Sve</option>
            <option value="prodajem">Prodajem</option>
            <option value="trazim">Tražim</option>
          </select>
        </div>
        {/* GLOBAL LOKACIJA & CIJENA */}
        <div className="space-y-2">
          <label className="text-[10px] font-bold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Lokacija</label>
          <select value={localFilters.lokacija || ""} onChange={e => setLocalFilters({...localFilters, lokacija: e.target.value})} className="w-full h-12 border rounded-xl px-4 text-sm font-medium outline-none transition-colors povezi-filter-select" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}>
            <option value="">Svi gradovi</option>
            {LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-bold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Cijena (€)</label>
          <div className="grid grid-cols-2 gap-2">
            <input type="number" min={0} step="any" placeholder="Min" value={localFilters.priceMin || ""} onChange={e => setLocalFilters({...localFilters, priceMin: e.target.value})} className="w-full h-12 border rounded-xl px-4 text-sm font-medium outline-none transition-colors povezi-filter-input" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }} />
            <input type="number" min={0} step="any" placeholder="Max" value={localFilters.priceMax || ""} onChange={e => setLocalFilters({...localFilters, priceMax: e.target.value})} className="w-full h-12 border rounded-xl px-4 text-sm font-medium outline-none transition-colors povezi-filter-input" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }} />
          </div>
        </div>

        {/* NEKRETNINE */}
        {category === 'nekretnine' && (
          <>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Tip nekretnine</label>
              <select value={localFilters.tip_nekretnine || ''} onChange={e => setLocalFilters({...localFilters, tip_nekretnine: e.target.value})} className="w-full h-12 border rounded-xl px-4 text-sm font-medium outline-none transition-colors" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}>
                <option value="">Sve</option>
                {NEKRETNINE_TIP.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Tip ponude</label>
              <select value={localFilters.tip_ponude || ''} onChange={e => setLocalFilters({...localFilters, tip_ponude: e.target.value})} className="w-full h-12 border rounded-xl px-4 text-sm font-medium outline-none transition-colors" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}>
                <option value="">Sve</option>
                <option value="prodaja">Prodaja</option>
                <option value="izdavanje">Izdavanje</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Kvadratura (m²)</label>
              <input type="number" min={0} step="any" placeholder="npr. 50" value={localFilters.kvadraturaMin || ''} onChange={e => setLocalFilters({...localFilters, kvadraturaMin: e.target.value})} className="w-full h-12 border rounded-xl px-4 text-sm font-medium outline-none transition-colors" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }} />
            </div>
            {(!localFilters.tip_nekretnine || NEKRETNINE_TIP_FIELDS[localFilters.tip_nekretnine]?.brojSoba) && (
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Broj soba</label>
                <select value={localFilters.broj_soba || ''} onChange={e => setLocalFilters({...localFilters, broj_soba: e.target.value})} className="w-full h-12 border rounded-xl px-4 text-sm font-medium outline-none transition-colors" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}>
                  <option value="">Sve</option>
                  {NEKRETNINE_BROJ_SOBA.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            )}
            {(!localFilters.tip_nekretnine || NEKRETNINE_TIP_FIELDS[localFilters.tip_nekretnine]?.sprat) && (
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Spratnost</label>
                <select value={localFilters.sprat || ''} onChange={e => setLocalFilters({...localFilters, sprat: e.target.value})} className="w-full h-12 border rounded-xl px-4 text-sm font-medium outline-none transition-colors" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}>
                  <option value="">Sve</option>
                  {NEKRETNINE_SPRAT.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            )}
            <div className="space-y-2 sm:col-span-2">
              <label className="text-[10px] font-bold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Sadržaji</label>
              <div className="flex flex-wrap gap-2">
                {NEKRETNINE_AMENITIES.map(a => {
                  const selected = (localFilters.amenities || '').split(',').map((s: string) => s.trim()).includes(a.id);
                  return (
                    <button key={a.id} type="button" onClick={() => {
                      const arr = (localFilters.amenities || '').split(',').map((s: string) => s.trim()).filter(Boolean);
                      const next = selected ? arr.filter((x: string) => x !== a.id) : [...arr, a.id];
                      setLocalFilters({...localFilters, amenities: next.join(',')});
                    }} className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${selected ? 'border-[var(--accent)] bg-[var(--accent)]/20' : ''}`} style={selected ? { color: 'var(--accent)' } : { borderColor: 'var(--border-subtle)', color: 'var(--text-secondary)' }}>
                      {a.name}
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* AUTO DIJELOVI */}
        {category === 'auto_dijelovi' && (
          <>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Tip dijela</label>
              <select value={localFilters.tipDijela || ''} onChange={e => setLocalFilters({...localFilters, tipDijela: e.target.value})} className="w-full h-12 border rounded-xl px-4 text-sm font-medium outline-none transition-colors" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}>
                <option value="">Sve</option>
                {AUTO_DIJELOVI_TIP.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Stanje</label>
              <select value={localFilters.stanje || ''} onChange={e => setLocalFilters({...localFilters, stanje: e.target.value})} className="w-full h-12 border rounded-xl px-4 text-sm font-medium outline-none transition-colors" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}>
                <option value="">Sve</option>
                {STANJE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </>
        )}

        {/* USLUGE */}
        {category === 'usluge' && (
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Način naplate</label>
            <select value={localFilters.nacinNaplate || ''} onChange={e => setLocalFilters({...localFilters, nacinNaplate: e.target.value})} className="w-full h-12 border rounded-xl px-4 text-sm font-medium outline-none transition-colors" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}>
              <option value="">Sve</option>
              {USLUGE_NACIN_NAPLATE.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
        )}

        {/* BIJELA TEHNIKA */}
        {category === 'bijela_tehnika' && (
          <>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Tip</label>
              <select value={localFilters.tipBijela || ''} onChange={e => setLocalFilters({...localFilters, tipBijela: e.target.value})} className="w-full h-12 border rounded-xl px-4 text-sm font-medium outline-none transition-colors" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}>
                <option value="">Sve</option>
                {BIJELA_TEHNIKA_TIP.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Energetska klasa</label>
              <select value={localFilters.energetskaKlasa || ''} onChange={e => setLocalFilters({...localFilters, energetskaKlasa: e.target.value})} className="w-full h-12 border rounded-xl px-4 text-sm font-medium outline-none transition-colors" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}>
                <option value="">Sve</option>
                {BIJELA_TEHNIKA_ENERGIJA.map(k => <option key={k} value={k}>{k}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Stanje</label>
              <select value={localFilters.stanje || ''} onChange={e => setLocalFilters({...localFilters, stanje: e.target.value})} className="w-full h-12 border rounded-xl px-4 text-sm font-medium outline-none transition-colors" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}>
                <option value="">Sve</option>
                {STANJE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </>
        )}

        {/* NAMJEŠTAJ */}
        {category === 'namjestaj' && (
          <>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Tip</label>
              <select value={localFilters.tipNamjestaj || ''} onChange={e => setLocalFilters({...localFilters, tipNamjestaj: e.target.value})} className="w-full h-12 border rounded-xl px-4 text-sm font-medium outline-none transition-colors" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}>
                <option value="">Sve</option>
                {NAMJESTAJ_TIP.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Materijal</label>
              <select value={localFilters.materijal || ''} onChange={e => setLocalFilters({...localFilters, materijal: e.target.value})} className="w-full h-12 border rounded-xl px-4 text-sm font-medium outline-none transition-colors" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}>
                <option value="">Sve</option>
                {NAMJESTAJ_MATERIJAL.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Stanje</label>
              <select value={localFilters.stanje || ''} onChange={e => setLocalFilters({...localFilters, stanje: e.target.value})} className="w-full h-12 border rounded-xl px-4 text-sm font-medium outline-none transition-colors" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}>
                <option value="">Sve</option>
                {STANJE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </>
        )}

        {/* ZA DJECU */}
        {category === 'za_djecu' && (
          <>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Tip</label>
              <select value={localFilters.tipZaDjecu || ''} onChange={e => setLocalFilters({...localFilters, tipZaDjecu: e.target.value})} className="w-full h-12 border rounded-xl px-4 text-sm font-medium outline-none transition-colors" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}>
                <option value="">Sve</option>
                {ZA_DJECU_TIP.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Uzrast</label>
              <select value={localFilters.uzrast || ''} onChange={e => setLocalFilters({...localFilters, uzrast: e.target.value})} className="w-full h-12 border rounded-xl px-4 text-sm font-medium outline-none transition-colors" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}>
                <option value="">Sve</option>
                {ZA_DJECU_UZRAST.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Stanje</label>
              <select value={localFilters.stanje || ''} onChange={e => setLocalFilters({...localFilters, stanje: e.target.value})} className="w-full h-12 border rounded-xl px-4 text-sm font-medium outline-none transition-colors" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}>
                <option value="">Sve</option>
                {STANJE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </>
        )}

        {/* POLJOPRIVREDA */}
        {category === 'poljoprivreda' && (
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Tip</label>
            <select value={localFilters.tipPoljoprivreda || ''} onChange={e => setLocalFilters({...localFilters, tipPoljoprivreda: e.target.value})} className="w-full h-12 border rounded-xl px-4 text-sm font-medium outline-none transition-colors" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}>
              <option value="">Sve</option>
              {POLJOPRIVREDA_TIP.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
        )}

        {/* TEHNIKA */}
        {category === 'tehnika' && (
          <>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Tip</label>
              <select value={localFilters.tipTehnika || ''} onChange={e => setLocalFilters({...localFilters, tipTehnika: e.target.value})} className="w-full h-12 border rounded-xl px-4 text-sm font-medium outline-none transition-colors" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}>
                <option value="">Sve</option>
                {TEHNIKA_TIP.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Stanje</label>
              <select value={localFilters.stanje || ''} onChange={e => setLocalFilters({...localFilters, stanje: e.target.value})} className="w-full h-12 border rounded-xl px-4 text-sm font-medium outline-none transition-colors" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}>
                <option value="">Sve</option>
                {STANJE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </>
        )}

        {/* KUĆNI LJUBIMCI */}
        {category === 'kucni_ljubimci' && (
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Vrsta</label>
            <select value={localFilters.vrstaKucni || ''} onChange={e => setLocalFilters({...localFilters, vrstaKucni: e.target.value})} className="w-full h-12 border rounded-xl px-4 text-sm font-medium outline-none transition-colors" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}>
              <option value="">Sve</option>
              {KUCNI_LJUBIMCI_VRSTA.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
        )}

        {/* MODA */}
        {category === 'moda' && (
          <>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Tip</label>
              <select value={localFilters.tipModa || ''} onChange={e => setLocalFilters({...localFilters, tipModa: e.target.value})} className="w-full h-12 border rounded-xl px-4 text-sm font-medium outline-none transition-colors" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}>
                <option value="">Sve</option>
                {MODA_TIP.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Veličina</label>
              <select value={localFilters.velicinaModa || ''} onChange={e => setLocalFilters({...localFilters, velicinaModa: e.target.value})} className="w-full h-12 border rounded-xl px-4 text-sm font-medium outline-none transition-colors" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}>
                <option value="">Sve</option>
                {MODA_VELICINE.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Stanje</label>
              <select value={localFilters.stanje || ''} onChange={e => setLocalFilters({...localFilters, stanje: e.target.value})} className="w-full h-12 border rounded-xl px-4 text-sm font-medium outline-none transition-colors" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}>
                <option value="">Sve</option>
                {STANJE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </>
        )}

        {/* POSLOVI */}
        {category === 'poslovi' && (
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Tip posla</label>
            <select value={localFilters.tipPoslovi || ''} onChange={e => setLocalFilters({...localFilters, tipPoslovi: e.target.value})} className="w-full h-12 border rounded-xl px-4 text-sm font-medium outline-none transition-colors" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}>
              <option value="">Sve</option>
              {POSLOVI_TIP.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
        )}

        {/* SPORT */}
        {category === 'sport' && (
          <>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Tip</label>
              <select value={localFilters.tipSport || ''} onChange={e => setLocalFilters({...localFilters, tipSport: e.target.value})} className="w-full h-12 border rounded-xl px-4 text-sm font-medium outline-none transition-colors" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}>
                <option value="">Sve</option>
                {SPORT_TIP.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Stanje</label>
              <select value={localFilters.stanje || ''} onChange={e => setLocalFilters({...localFilters, stanje: e.target.value})} className="w-full h-12 border rounded-xl px-4 text-sm font-medium outline-none transition-colors" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}>
                <option value="">Sve</option>
                {STANJE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </>
        )}

        {/* GRAĐEVINA */}
        {category === 'gradjevina' && (
          <>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Tip</label>
              <select value={localFilters.tipGradjevina || ''} onChange={e => setLocalFilters({...localFilters, tipGradjevina: e.target.value})} className="w-full h-12 border rounded-xl px-4 text-sm font-medium outline-none transition-colors" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}>
                <option value="">Sve</option>
                {GRADJEVINA_TIP.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Stanje</label>
              <select value={localFilters.stanje || ''} onChange={e => setLocalFilters({...localFilters, stanje: e.target.value})} className="w-full h-12 border rounded-xl px-4 text-sm font-medium outline-none transition-colors" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}>
                <option value="">Sve</option>
                {STANJE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </>
        )}

        {/* POKLONI I CVIJEĆE */}
        {category === 'pokloni_cvijece' && (
          <>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Tip</label>
              <select value={localFilters.tipPokloni || ''} onChange={e => setLocalFilters({...localFilters, tipPokloni: e.target.value})} className="w-full h-12 border rounded-xl px-4 text-sm font-medium outline-none transition-colors" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}>
                <option value="">Sve</option>
                {POKLONI_TIP.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Povod</label>
              <select value={localFilters.povodPokloni || ''} onChange={e => setLocalFilters({...localFilters, povodPokloni: e.target.value})} className="w-full h-12 border rounded-xl px-4 text-sm font-medium outline-none transition-colors" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}>
                <option value="">Sve</option>
                {POKLONI_POVOD.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          </>
        )}

        {/* DINAMIČKA POLJA (vozila i ostalo) */}
        {fields && category !== 'nekretnine' && !CATEGORIES_WITH_FILTER_PANEL.includes(category) && Object.entries(fields).map(([key, config]) => renderField(key, config))}
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-3 pt-5 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
        <button onClick={() => { setLocalFilters(DEFAULT_FILTERS); onReset(); }} className="w-full sm:w-auto h-12 px-6 rounded-xl border text-[10px] font-bold uppercase tracking-wide transition-colors" style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-secondary)' }}>Poništi</button>
        <button onClick={() => onApply(localFilters)} className="w-full sm:flex-grow h-12 rounded-xl text-[10px] font-bold uppercase tracking-wide text-white transition-all hover:opacity-95 active:scale-[0.98]" style={{ backgroundColor: 'var(--accent)' }}>Primijeni filter</button>
      </div>
    </div>
  );
};

let adCardDebugCount = 0;

const AdCardInner: React.FC<{
  ad: Ad;
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
  linksDisabled?: boolean;
  onFallbackClick?: () => void;
  debugAdsError?: string | null;
  debugAdsAreFallback?: boolean;
  /** Za listu: traži sliku 400px (brže učitavanje). */
  imgWidth?: number;
  /** Prvih nekoliko karata: high za brži LCP. */
  fetchPriority?: 'high' | 'low';
  /** Poziva se prije navigacije na oglas (npr. da se spremi scroll pozicija liste). Prima ad slug. */
  onBeforeNavigate?: (adSlug: string) => void;
}> = ({ ad, isFavorite, onToggleFavorite, linksDisabled, onFallbackClick, debugAdsError, debugAdsAreFallback, imgWidth = 400, fetchPriority = 'low', onBeforeNavigate }) => {
  const location = useLocation();
  const now = Date.now();
  const isPremium = ad.isPaid && ad.promotionStatus === "active" && ad.promotedUntil !== null && ad.promotedUntil > now;
  const hasSlug = !!ad.slug && typeof ad.slug === 'string';
  const linkTo = hasSlug ? `/oglas/${ad.slug}` : '#';
  const effectiveLinksDisabled = !!linksDisabled && !hasSlug;
  const handleCardClick = effectiveLinksDisabled && onFallbackClick ? () => onFallbackClick() : undefined;

  if (import.meta.env?.DEV && adCardDebugCount < 5) {
    console.log('[AdCard debug]', {
      id: ad.id,
      slug: ad.slug,
      hasSlug,
      linksDisabledProp: !!linksDisabled,
      effectiveLinksDisabled,
      adsError: debugAdsError ?? null,
      adsAreFallback: !!debugAdsAreFallback,
      linkTo,
    });
    adCardDebugCount++;
  }

  const coverUrl = useMemo(() => {
    const thumb = Array.isArray(ad.slikeThumbs) && ad.slikeThumbs[0];
    const full = Array.isArray(ad.slike) && ad.slike[0];
    const url = (typeof thumb === 'string' && thumb.trim()) ? thumb : (typeof full === 'string' && full.trim()) ? full : null;
    return url;
  }, [ad.id, ad.slikeThumbs?.[0], ad.slike?.[0]]);

  const [coverLoadState, setCoverLoadState] = useState<'proxy' | 'raw' | 'failed'>('proxy');
  useEffect(() => setCoverLoadState('proxy'), [coverUrl]);

  const LIST_PLACEHOLDER = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400"%3E%3Crect fill=\"%23182235\" width=\"400\" height=\"400\"/%3E%3Ctext fill=\"%239CA3AF\" x=\"50%25\" y=\"50%25\" text-anchor=\"middle\" dy=\".3em\" font-size=\"12\"%3ENema slike%3C/text%3E%3C/svg%3E';
  const coverSrc = !coverUrl
    ? LIST_PLACEHOLDER
    : coverLoadState === 'failed'
      ? TRANSPARENT_1X1
      : coverLoadState === 'raw'
        ? (coverUrl.startsWith('http://') ? 'https://' + coverUrl.slice(7) : coverUrl)
        : (imgWidth ? getProxiedImageUrl(coverUrl, imgWidth, imgWidth) : getProxiedImageUrl(coverUrl));
  const handleCoverError = () => {
    if (coverLoadState === 'proxy') setCoverLoadState('raw');
    else if (coverLoadState === 'raw') setCoverLoadState('failed');
  };

  const LinkOrSpan = ({ to, children, className, style }: { to: string; children: React.ReactNode; className?: string; style?: React.CSSProperties }) => {
    const useSpan = effectiveLinksDisabled || to === '#';
    if (useSpan) {
      if (import.meta.env?.DEV) {
        console.log('[LinkOrSpan]', 'render span', { to, id: ad.id, slug: ad.slug });
      }
      return (
        <span role="button" tabIndex={0} onClick={handleCardClick} onKeyDown={e => e.key === 'Enter' && handleCardClick?.()} className={className} style={{ cursor: to === '#' ? 'default' : 'pointer', ...style }}>
          {children}
        </span>
      );
    }
    if (import.meta.env?.DEV) {
      console.log('[LinkOrSpan]', 'render Link', { to, id: ad.id, slug: ad.slug });
    }
    return (
      <Link
        to={to}
        target="_self"
        rel="noopener"
        className={className}
        style={style}
        onClick={() => {
          onBeforeNavigate?.(ad.slug);
          if (typeof window !== 'undefined' && !onBeforeNavigate) {
            try {
              saveScrollForList(getListRouteKey(location.pathname, location.search));
            } catch (_) {}
          }
          if (import.meta.env?.DEV) {
            console.log('[AdCard]', 'link clicked', { id: ad.id, slug: ad.slug, to });
          }
        }}
      >
        {children}
      </Link>
    );
  };

  return (
    <div
      data-ad-slug={ad.slug}
      className="group rounded-[18px] overflow-hidden flex flex-col relative transition-all duration-300 tap-scale min-h-[280px] sm:min-h-[260px]"
      style={{
        backgroundColor: 'var(--bg-card)',
        borderWidth: isPremium ? 2 : 1,
        borderStyle: 'solid',
        borderColor: isPremium ? 'var(--accent)' : 'var(--border-subtle)',
        boxShadow: isPremium ? 'var(--premium-glow)' : undefined,
      }}
    >
      <LinkOrSpan to={linkTo} className="aspect-square overflow-hidden relative block">
        <img
          src={coverSrc}
          onError={handleCoverError}
          alt={ad.naslov}
          width={400}
          height={400}
          decoding="async"
          fetchPriority={fetchPriority}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
        />
        {isPremium && <div className="absolute inset-0 pointer-events-none rounded-[18px]" style={{ boxShadow: 'var(--premium-inset)' }} />}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60" />
        {ad.tipOglasa === 'trazim' && <div className="absolute top-2 left-2"><span className="inline-flex items-center gap-1 bg-amber-500/90 text-white text-[10px] font-bold uppercase px-2.5 py-1 rounded-full shadow-lg border border-white/10">Tražim</span></div>}
        {isPremium && <div className="absolute top-2 left-2 flex gap-2" style={ad.tipOglasa === 'trazim' ? { top: '2.5rem' } : {}}><span className="inline-flex items-center gap-1 text-white text-[10px] font-bold uppercase px-2.5 py-1 rounded-full shadow-lg border border-white/20" style={{ background: 'var(--accent)', boxShadow: 'var(--premium-badge-glow)' }}><Zap className="w-2.5 h-2.5 fill-current" /> ISTAKNUTO</span></div>}
      </LinkOrSpan>
      <button onClick={(e) => { e.preventDefault(); onToggleFavorite(ad.id); }} className={`absolute top-2 right-2 p-2 rounded-full transition-all active:scale-150 ${isFavorite ? 'text-red-500 scale-110' : 'text-white/60 hover:text-white'}`}><Heart className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} /></button>
      <div className="p-3 flex flex-col flex-grow">
        <LinkOrSpan to={linkTo} className="font-medium text-sm line-clamp-2 leading-tight mb-2 h-9 block" style={{ color: 'var(--text-primary)' }}>{ad.naslov}</LinkOrSpan>
        {ad.kategorija === 'nekretnine' && ad.realEstateDetails && (
          <>
            <p className="text-[10px] font-bold uppercase tracking-wide mb-1 flex flex-wrap gap-x-2 gap-y-0" style={{ color: 'var(--text-secondary)' }}>
              {ad.realEstateDetails.tipNekretnine && <span>{NEKRETNINE_TIP.find(t => t.id === ad.realEstateDetails!.tipNekretnine)?.name || ad.realEstateDetails.tipNekretnine}</span>}
              {ad.realEstateDetails.kvadratura != null && <span>{ad.realEstateDetails.kvadratura} m²</span>}
              {ad.realEstateDetails.brojSoba && <span>{ad.realEstateDetails.brojSoba} sobe</span>}
              {ad.realEstateDetails.sprat && <span>Sprat {NEKRETNINE_SPRAT.find(s => s.id === ad.realEstateDetails!.sprat)?.name || ad.realEstateDetails.sprat}</span>}
            </p>
            {Array.isArray(ad.realEstateDetails.amenities) && ad.realEstateDetails.amenities.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-1">
                {ad.realEstateDetails.amenities.slice(0, 4).map(aid => {
                  const a = NEKRETNINE_AMENITIES.find(x => x.id === aid);
                  return a ? <span key={aid} className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-white/10 text-[#9CA3AF]">{a.name}</span> : null;
                })}
                {ad.realEstateDetails.amenities.length > 4 && <span className="text-[9px] text-[#9CA3AF]">+{ad.realEstateDetails.amenities.length - 4}</span>}
              </div>
            )}
          </>
        )}
        <p className="text-[18px] font-semibold mb-2" style={{ color: 'var(--accent)' }}>{ad.cijena.toLocaleString()} €</p>
        <div className="mt-auto flex justify-between items-center border-t pt-2" style={{ borderColor: 'var(--border-subtle)' }}>
          <span className="text-[10px] flex items-center gap-1 truncate max-w-[65px]" style={{ color: 'var(--text-secondary)' }}><MapPin className="w-2.5 h-2.5" /> {ad.lokacija}</span>
          <span className="text-[10px] shrink-0" style={{ color: 'var(--text-secondary)' }}>{timeAgo(ad.createdAt)}</span>
        </div>
      </div>
    </div>
  );
};

const AdCard = React.memo(AdCardInner);

const SpecGrid = ({ details }: { details: any }) => {
  if (!details || typeof details !== 'object') return null;
  const specs: { label: string; value: string }[] = [];
  if (details.marka) specs.push({ label: 'Marka', value: details.marka });
  if (details.model) specs.push({ label: 'Model', value: details.model });
  if (details.godiste) specs.push({ label: 'Godište', value: `${details.godiste}. god` });
  if (details.kilometraza != null) specs.push({ label: 'Kilometraža', value: `${(Number(details.kilometraza) || 0).toLocaleString()} km` });
  if (details.gorivo) specs.push({ label: 'Gorivo', value: details.gorivo });
  if (details.mjenjac) specs.push({ label: 'Mjenjač', value: details.mjenjac });
  if (details.snaga) specs.push({ label: 'Snaga', value: `${details.snaga} KS` });
  if (details.snagaKW) specs.push({ label: 'Snaga', value: `${details.snagaKW} kW` });
  if (details.snagaKS != null && !details.snaga) specs.push({ label: 'Snaga', value: `${details.snagaKS} KS` });
  if (details.kubikaza) specs.push({ label: 'Kubikaža', value: `${details.kubikaza} cm3` });
  if (details.karoserija) specs.push({ label: 'Karoserija', value: details.karoserija });
  if (details.pogon) specs.push({ label: 'Pogon', value: details.pogon });
  if (details.stanje) specs.push({ label: 'Stanje', value: details.stanje });
  if (details.tip) {
    const tipLabel = BIJELA_TEHNIKA_TIP.find(t => t.id === details.tip)?.name || NAMJESTAJ_TIP.find(t => t.id === details.tip)?.name || ZA_DJECU_TIP.find(t => t.id === details.tip)?.name
      || POLJOPRIVREDA_TIP.find(t => t.id === details.tip)?.name || TEHNIKA_TIP.find(t => t.id === details.tip)?.name || MODA_TIP.find(t => t.id === details.tip)?.name
      || POSLOVI_TIP.find(t => t.id === details.tip)?.name || SPORT_TIP.find(t => t.id === details.tip)?.name || GRADJEVINA_TIP.find(t => t.id === details.tip)?.name
      || POKLONI_TIP.find(t => t.id === details.tip)?.name || details.tip;
    specs.push({ label: 'Tip', value: tipLabel });
  }
  if (details.vrsta) {
    const vrstaLabel = KUCNI_LJUBIMCI_VRSTA.find(t => t.id === details.vrsta)?.name || details.vrsta;
    specs.push({ label: 'Vrsta', value: vrstaLabel });
  }
  if (details.povod) {
    const povodLabel = POKLONI_POVOD.find(p => p.id === details.povod)?.name || details.povod;
    specs.push({ label: 'Povod', value: povodLabel });
  }
  if (details.tipDijela) specs.push({ label: 'Tip dijela', value: AUTO_DIJELOVI_TIP.find(t => t.id === details.tipDijela)?.name || details.tipDijela });
  if (details.nacinNaplate) specs.push({ label: 'Način naplate', value: USLUGE_NACIN_NAPLATE.find(t => t.id === details.nacinNaplate)?.name || details.nacinNaplate });
  if (details.energetskaKlasa) specs.push({ label: 'Energetska klasa', value: details.energetskaKlasa });
  if (details.materijal) specs.push({ label: 'Materijal', value: details.materijal });
  if (details.uzrast) specs.push({ label: 'Uzrast', value: ZA_DJECU_UZRAST.find(u => u.id === details.uzrast)?.name || details.uzrast });
  if (details.velicina) specs.push({ label: 'Veličina', value: details.velicina });
  return (<>{specs.map((s, i) => (<div key={i} className="bg-[#131C2B] border border-white/5 p-4 rounded-2xl flex flex-col gap-1 hover:border-[#4F6DFF]/30 group transition-all"><span className="text-[8px] font-black uppercase text-[#9CA3AF] tracking-widest group-hover:text-[#4F6DFF]">{s.label}</span><span className="text-xs font-bold text-[#F3F4F6] truncate">{s.value}</span></div>))}</>);
};

const RatingSection = ({ sellerId, user, onAddRating, metrics }: { sellerId: string, user: User | null, onAddRating: (sid: string, s: number) => void, metrics: { avg: string, count: number } }) => {
  const [hoverRating, setHoverRating] = useState(0);
  const isSelf = user?.id === sellerId;
  return (
    <div className="space-y-4 pt-8 border-t border-white/5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div><h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#9CA3AF] mb-1">⭐ Ocijeni prodavca</h3></div>
        {!isSelf && user && (<div className="flex items-center gap-1.5 bg-white/5 p-3 rounded-2xl border border-white/5 shadow-inner">{[1, 2, 3, 4, 5].map((s) => (<button key={s} onMouseEnter={() => setHoverRating(s)} onMouseLeave={() => setHoverRating(0)} onClick={() => onAddRating(sellerId, s)} className="transition-all active:scale-125 p-1"><Star className={`w-6 h-6 ${s <= (hoverRating || 0) ? 'fill-amber-400 text-amber-400' : 'text-white/20'}`} /></button>))}</div>)}
      </div>
      <div className="flex items-center gap-4 bg-white/5 p-6 rounded-xl border border-white/5"><div className="text-4xl font-black text-white">{metrics.avg}</div><div><div className="flex text-amber-400 gap-0.5 mb-1">{[...Array(5)].map((_, i) => <Star key={i} className={`w-3.5 h-3.5 ${metrics.count > 0 && i < Math.round(Number(metrics.avg)) ? 'fill-current' : 'opacity-10'}`} />)}</div><div className="text-[9px] text-[#9CA3AF] font-black uppercase tracking-widest">{metrics.count === 0 ? 'Nema recenzija' : `Bazirano na ${metrics.count} recenzij${metrics.count === 1 ? 'a' : metrics.count >= 2 && metrics.count <= 4 ? 'e' : 'a'}`}</div></div></div>
    </div>
  );
};

export type AdDetailViewAdminActions = { onApprove: () => void; onReject: () => void; backHref: string };

export type AdDetailViewOwnerActions = {
  promoteError?: string;
  onPromoteClick?: (planDays: number) => void;
  onStatusChange?: (status: 'AKTIVAN' | 'PRODAN' | 'ISTEKAO') => void;
  onDelete?: () => void;
  onAdUpdated?: (ad: Ad) => void;
};

export const AdDetailView: React.FC<{
  ad: Ad;
  isAdminPreview?: boolean;
  adminActions?: AdDetailViewAdminActions;
  ownerActions?: AdDetailViewOwnerActions;
  user: User | null;
  onToggleFavorite: (id: string) => void;
  favorites: string[];
  ratings: Rating[];
  onAddRating: (sellerId: string, score: number) => void;
  getSellerMetrics: (sellerId: string) => { avg: string; count: number };
  sellerAdsCount: number;
  similarAds: Ad[];
  similarLoading: boolean;
  navigate: NavigateFunction;
  location: { pathname: string; search: string };
  API_BASE: string;
  getAuthHeaders: () => HeadersInit;
  setPageMeta: (title: string, desc?: string, img?: string, url?: string) => void;
}> = (props) => {
  const { ad, isAdminPreview, adminActions, ownerActions, user, onToggleFavorite, favorites, ratings, onAddRating, getSellerMetrics, sellerAdsCount, similarAds, similarLoading, navigate, location, API_BASE, getAuthHeaders, setPageMeta } = props;
  const [activeImg, setActiveImg] = useState(0);
  const [proxyFailedUrls, setProxyFailedUrls] = useState<Set<string>>(new Set());
  const [fullyFailedUrls, setFullyFailedUrls] = useState<Set<string>>(new Set());
  const [showPhoneNumber, setShowPhoneNumber] = useState(false);
  const [viberCopied, setViberCopied] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportDetails, setReportDetails] = useState('');
  const [reportLoading, setReportLoading] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);
  const [reportError, setReportError] = useState('');

  useEffect(() => {
    if (!ad) return;
    const opis = ad.opis != null ? String(ad.opis) : '';
    const desc = opis.slice(0, 160).replace(/\s+/g, ' ').trim() + (opis.length > 160 ? '…' : '');
    const img = Array.isArray(ad.slike) && ad.slike.length > 0 ? ad.slike[0] : undefined;
    setPageMeta(`${ad.naslov} - Poveži.ME`, desc, img ? getProxiedImageUrl(img) : undefined, typeof window !== 'undefined' ? window.location.href : undefined);
    return () => setPageMeta('Poveži.ME - Premium Marketplace', DEFAULT_DESCRIPTION);
  }, [ad?.id, ad?.naslov, ad?.opis, ad?.slike, setPageMeta]);

  const getImageSrc = (url: string): string => {
    if (fullyFailedUrls.has(url)) return TRANSPARENT_1X1;
    if (proxyFailedUrls.has(url)) return url.startsWith('http://') ? 'https://' + url.slice(7) : url;
    return getProxiedImageUrl(url);
  };
  const handleImageError = (rawUrl: string) => {
    if (proxyFailedUrls.has(rawUrl)) setFullyFailedUrls(prev => new Set(prev).add(rawUrl));
    else setProxyFailedUrls(prev => new Set(prev).add(rawUrl));
  };
  const handleReportSubmit = () => {
    if (!user) { navigate(`/prijava?returnTo=${encodeURIComponent(location.pathname)}`); return; }
    if (!reportReason.trim() || reportReason.trim().length < 3) { setReportError('Unesite razlog (min 3 znaka).'); return; }
    setReportError('');
    setReportLoading(true);
    if (!ad) return;
    fetch(`${API_BASE}/ads/${ad.id}/report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ reason: reportReason.trim(), details: reportDetails.trim() || undefined })
    })
      .then((res) => res.json().then((data: { error?: string; message?: string }) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        setReportLoading(false);
        if (ok) { setReportSuccess(true); setReportReason(''); setReportDetails(''); setTimeout(() => { setReportOpen(false); setReportSuccess(false); }, 1500); }
        else setReportError(data?.error || 'Greška pri prijavi.');
      })
      .catch(() => { setReportLoading(false); setReportError('Greška u mreži.'); });
  };

  const safeVlasnikId = ad?.vlasnikId != null ? String(ad.vlasnikId) : '';
  const metrics = useMemo(() => ad ? getSellerMetrics(safeVlasnikId || '') : { avg: '5.0', count: 0 }, [ad, safeVlasnikId, getSellerMetrics]);
  const hasImages = Array.isArray(ad.slike) && ad.slike.length > 0;
  const safeActiveIndex = hasImages ? Math.min(Math.max(activeImg, 0), ad.slike.length - 1) : 0;
  const heroImage = hasImages ? ad.slike[safeActiveIndex] : undefined;
  const isOwner = user && ad.vlasnikId === user.id;

  const reportModal = reportOpen
    ? createPortal(
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/70" onClick={() => !reportLoading && setReportOpen(false)}>
          <div className="rounded-2xl border p-6 w-full max-w-md shadow-2xl" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }} onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-black uppercase mb-4" style={{ color: 'var(--text-primary)' }}>Prijavi oglas</h3>
            {reportSuccess ? <p className="text-sm mb-4" style={{ color: 'var(--accent)' }}>Prijava je zabilježena. Hvala.</p> : (
              <>
                {reportError && <p className="text-red-400 text-sm mb-2">{reportError}</p>}
                <input type="text" value={reportReason} onChange={(e) => setReportReason(e.target.value)} placeholder="Razlog prijave *" className="w-full h-12 rounded-xl px-4 border mb-3 outline-none text-sm" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }} />
                <textarea value={reportDetails} onChange={(e) => setReportDetails(e.target.value)} placeholder="Dodatne informacije (opciono)" rows={3} className="w-full rounded-xl px-4 py-3 border mb-4 outline-none text-sm resize-none" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }} />
                <div className="flex gap-3">
                  <button type="button" onClick={() => setReportOpen(false)} disabled={reportLoading} className="flex-1 h-12 rounded-xl border font-bold uppercase text-[10px]" style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-secondary)' }}>Odustani</button>
                  <button type="button" onClick={handleReportSubmit} disabled={reportLoading} className="flex-1 h-12 rounded-xl font-black uppercase text-[10px] text-white" style={{ backgroundColor: 'var(--accent)' }}>{reportLoading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Pošalji'}</button>
                </div>
              </>
            )}
          </div>
        </div>,
        document.body
      )
    : null;

  const handleBack = useCallback(() => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      if (import.meta.env?.DEV) console.log('[AdDetailView] back: navigate(-1)');
      navigate(-1);
    } else {
      const fallback = isAdminPreview && adminActions ? adminActions.backHref : '/marketplace';
      if (import.meta.env?.DEV) console.log('[AdDetailView] back: fallback navigate(', fallback, ')');
      navigate(fallback);
    }
  }, [navigate, isAdminPreview, adminActions]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 lg:py-12 animate-slide-up">
      {isAdminPreview && adminActions ? (
        <div className="flex flex-wrap items-center gap-4 mb-6 p-4 rounded-xl border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}>
          <button type="button" onClick={handleBack} className="p-2 rounded-lg border flex items-center gap-2 font-bold uppercase text-[10px]" style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-secondary)' }}><ChevronLeft className="w-5 h-5" /> Nazad</button>
          <span className="px-2 py-1 rounded text-xs font-bold uppercase" style={{ backgroundColor: ad.status === 'NA_CEKANJU' ? 'rgba(59, 130, 246, 0.2)' : 'var(--bg-card)', color: 'var(--text-primary)' }}>Pregled oglasa (admin){ad.status !== 'AKTIVAN' ? ` · ${ad.status}` : ''}</span>
          {ad.status === 'NA_CEKANJU' && (
            <>
              <button type="button" onClick={adminActions.onApprove} className="px-4 py-2.5 rounded-xl text-xs font-black uppercase text-white" style={{ backgroundColor: 'var(--accent)' }}>Odobri oglas</button>
              <button type="button" onClick={adminActions.onReject} className="px-4 py-2.5 rounded-xl text-xs font-bold uppercase border border-red-500/50 text-red-400">Odbij (obriši)</button>
            </>
          )}
        </div>
      ) : (
        <div className="mb-6">
          <button type="button" onClick={handleBack} className="p-2 rounded-lg border flex items-center gap-2 font-bold uppercase text-[10px] w-fit" style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-secondary)' }}><ChevronLeft className="w-5 h-5" /> Nazad na oglase</button>
        </div>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
        <div className="lg:col-span-8 space-y-8">
          <div className="space-y-4">
             <div className="aspect-[4/3] sm:aspect-video bg-[#0B1220] rounded-xl overflow-hidden border border-white/5 relative group shadow-2xl">
                {hasImages && heroImage ? <img src={getImageSrc(heroImage)} onError={() => handleImageError(heroImage)} className="w-full h-full object-contain" alt={ad.naslov} width={800} height={600} decoding="async" fetchPriority="high" loading="lazy" /> : <div className="w-full h-full flex items-center justify-center text-[#9CA3AF] text-sm uppercase">Nema slike</div>}
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
                {hasImages && <div className="absolute top-6 right-6 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-black text-white border border-white/10 z-10 shadow-lg">{safeActiveIndex + 1} / {ad.slike.length}</div>}
                {hasImages && ad.slike.length > 1 && (
                  <>
                    <button type="button" onClick={() => setActiveImg(safeActiveIndex <= 0 ? ad.slike.length - 1 : safeActiveIndex - 1)} className="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-12 h-12 rounded-full bg-black/60 hover:bg-black/80 border border-white/10 flex items-center justify-center text-white shadow-xl transition-all active:scale-95" aria-label="Prethodna slika">
                      <ChevronLeft className="w-6 h-6" />
                    </button>
                    <button type="button" onClick={() => setActiveImg(safeActiveIndex >= ad.slike.length - 1 ? 0 : safeActiveIndex + 1)} className="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-12 h-12 rounded-full bg-black/60 hover:bg-black/80 border border-white/10 flex items-center justify-center text-white shadow-xl transition-all active:scale-95" aria-label="Sljedeća slika">
                      <ChevronRight className="w-6 h-6" />
                    </button>
                  </>
                )}
             </div>
             {hasImages && ad.slike.length > 1 && (<div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">{ad.slike.map((img, i) => <button key={i} onClick={() => setActiveImg(i)} className={`w-20 h-20 flex-shrink-0 rounded-2xl overflow-hidden border-2 transition-all ${i === activeImg ? 'border-[#4F6DFF] scale-95 shadow-lg shadow-[#4F6DFF]/20' : 'border-white/5 opacity-60 hover:opacity-100'}`}><img src={getImageSrc(img)} onError={() => handleImageError(img)} className="w-full h-full object-cover" alt="" width={80} height={80} decoding="async" fetchPriority="low" loading="lazy" /></button>)}</div>)}
          </div>
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3"><span className="px-3 py-1 bg-[#4F6DFF]/10 text-[#7C8CFF] text-[10px] font-black uppercase rounded-lg border border-[#4F6DFF]/20">{ad.kategorija}</span><span className="text-[10px] text-[#9CA3AF] font-bold uppercase flex items-center gap-1"><Calendar className="w-3 h-3" /> Objavljeno {timeAgo(typeof ad.createdAt === 'number' ? ad.createdAt : (ad.createdAt ? new Date(ad.createdAt).getTime() : Date.now()))}</span></div>
            <h1 className="text-3xl lg:text-4xl font-black text-white uppercase tracking-tight leading-tight">{ad.naslov}</h1>
            <div className="text-4xl font-black text-[#7C8CFF] tracking-tighter">{(Number(ad.cijena) || 0).toLocaleString()} €</div>
          </div>
          {(ad.kategorija === 'nekretnine' && ad.realEstateDetails) ? (
          <div className="space-y-4 pt-4 border-t border-white/5">
             <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#9CA3AF] flex items-center gap-2"><Settings2 className="w-3 h-3 text-[#4F6DFF]" /> Specifikacije nekretnine</h3>
             <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
               {ad.realEstateDetails.tipNekretnine && <div className="p-3 rounded-xl border bg-white/5 border-white/5"><span className="text-[9px] font-black uppercase text-[#9CA3AF] block mb-1">Tip</span><span className="text-white font-bold">{NEKRETNINE_TIP.find(t => t.id === ad.realEstateDetails!.tipNekretnine)?.name || ad.realEstateDetails.tipNekretnine}</span></div>}
               {ad.realEstateDetails.tipPonude && <div className="p-3 rounded-xl border bg-white/5 border-white/5"><span className="text-[9px] font-black uppercase text-[#9CA3AF] block mb-1">Tip ponude</span><span className="text-white font-bold">{ad.realEstateDetails.tipPonude === 'izdavanje' ? 'Izdavanje' : 'Prodaja'}</span></div>}
               {ad.realEstateDetails.kvadratura != null && <div className="p-3 rounded-xl border bg-white/5 border-white/5"><span className="text-[9px] font-black uppercase text-[#9CA3AF] block mb-1">Kvadratura</span><span className="text-white font-bold">{ad.realEstateDetails.kvadratura} m²</span></div>}
               {ad.realEstateDetails.brojSoba && <div className="p-3 rounded-xl border bg-white/5 border-white/5"><span className="text-[9px] font-black uppercase text-[#9CA3AF] block mb-1">Broj soba</span><span className="text-white font-bold">{ad.realEstateDetails.brojSoba}</span></div>}
               {ad.realEstateDetails.sprat != null && <div className="p-3 rounded-xl border bg-white/5 border-white/5"><span className="text-[9px] font-black uppercase text-[#9CA3AF] block mb-1">Sprat</span><span className="text-white font-bold">{NEKRETNINE_SPRAT.find(s => s.id === ad.realEstateDetails!.sprat)?.name ?? ad.realEstateDetails.sprat}</span></div>}
             </div>
             {Array.isArray(ad.realEstateDetails.amenities) && ad.realEstateDetails.amenities.length > 0 && (
               <div className="flex flex-wrap gap-2">
                 {ad.realEstateDetails.amenities.map(aid => {
                   const a = NEKRETNINE_AMENITIES.find(x => x.id === aid);
                   return a ? <span key={aid} className="px-3 py-1.5 rounded-xl text-xs font-bold bg-[#4F6DFF]/20 text-[#7C8CFF] border border-[#4F6DFF]/30">{a.name}</span> : null;
                 })}
               </div>
             )}
             {(ad.realEstateDetails.floorplanUrl && String(ad.realEstateDetails.floorplanUrl).trim()) && (
               <div className="pt-2">
                 <h4 className="text-[9px] font-black uppercase tracking-widest text-[#9CA3AF] mb-2">Tlocrt</h4>
                 <a href={ad.realEstateDetails.floorplanUrl} target="_blank" rel="noopener noreferrer" className="block rounded-2xl overflow-hidden border border-white/10 hover:border-[#4F6DFF]/50 transition-all">
                   <img src={ad.realEstateDetails.floorplanUrl} alt="Tlocrt" className="w-full max-h-80 object-contain bg-[#0B1220]" loading="lazy" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                 </a>
               </div>
             )}
             {(ad.realEstateDetails.virtualTourUrl && String(ad.realEstateDetails.virtualTourUrl).trim()) && (
               <div className="pt-2">
                 <h4 className="text-[9px] font-black uppercase tracking-widest text-[#9CA3AF] mb-2">Virtualna tura</h4>
                 <a href={ad.realEstateDetails.virtualTourUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-3 rounded-2xl bg-[#4F6DFF]/20 text-[#7C8CFF] border border-[#4F6DFF]/30 font-bold text-sm hover:bg-[#4F6DFF]/30 transition-all">
                   Otvori 360° / Matterport turu →
                 </a>
               </div>
             )}
          </div>
          ) : (ad.carDetails || ad.motorcycleDetails || (ad.details && typeof ad.details === 'object')) ? (
          <div className="space-y-4 pt-4 border-t border-white/5">
             <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#9CA3AF] flex items-center gap-2"><Settings2 className="w-3 h-3 text-[#4F6DFF]" /> Specifikacije</h3>
             <div className="grid grid-cols-2 sm:grid-cols-3 gap-3"><SpecGrid details={ad.carDetails || ad.motorcycleDetails || ad.details} /></div>
             {((ad.details as any)?.oporama?.length > 0 || (ad.details as any)?.sigurnost?.length > 0) && (
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                 {(ad.details as any)?.sigurnost?.length > 0 && (
                   <div className="p-4 rounded-2xl border border-white/5 bg-white/5">
                     <h4 className="text-[9px] font-black uppercase tracking-widest text-[#9CA3AF] mb-2">Sigurnost</h4>
                     <div className="flex flex-wrap gap-2">{(ad.details as any).sigurnost.map((s: string, i: number) => <span key={i} className="px-2.5 py-1 rounded-lg text-[10px] font-bold text-white bg-white/10">{s}</span>)}</div>
                   </div>
                 )}
                 {(ad.details as any)?.oporama?.length > 0 && (
                   <div className="p-4 rounded-2xl border border-white/5 bg-white/5">
                     <h4 className="text-[9px] font-black uppercase tracking-widest text-[#9CA3AF] mb-2">Dodatna oprema</h4>
                     <div className="flex flex-wrap gap-2">{(ad.details as any).oporama.map((o: string, i: number) => <span key={i} className="px-2.5 py-1 rounded-lg text-[10px] font-bold text-white bg-white/10">{o}</span>)}</div>
                   </div>
                 )}
               </div>
             )}
          </div>
          ) : null}
          <div className="pt-4 border-t border-white/5 space-y-4">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#9CA3AF]">Opis</h3>
            <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--text-primary)' }}>{ad.opis || '—'}</p>
            {ad.lokacija && <p className="text-[10px] font-bold uppercase flex items-center gap-1" style={{ color: 'var(--text-secondary)' }}><MapPin className="w-3 h-3" /> {ad.lokacija}</p>}
            {typeof ad.lat === 'number' && typeof ad.lng === 'number' && Number.isFinite(ad.lat) && Number.isFinite(ad.lng) && (
              <div>
                <p className="text-[10px] font-black uppercase text-[#9CA3AF] mb-2">Lokacija na mapi</p>
                <React.Suspense fallback={<div className="h-[200px] rounded-xl bg-[#0B1220] animate-pulse" />}>
                  <AdDetailMap lat={ad.lat} lng={ad.lng} height={200} />
                </React.Suspense>
              </div>
            )}
          </div>
        </div>
        <div className="lg:col-span-4">
          <div className="lg:sticky lg:top-24 space-y-6 rounded-2xl border p-6 shadow-xl" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}>
            {isOwner && ownerActions ? (
              <div className="space-y-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-[#9CA3AF] mb-2">Ovo je vaš oglas</p>
                <p className="text-white font-bold mb-4">Kontakt podaci se prikazuju samo posjetiocima.</p>
                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-[#9CA3AF] bg-white/5 p-3 rounded-xl border border-white/5"><span className="flex items-center gap-2"><MapPin className="w-3 h-3 text-[#4F6DFF]" /> Lokacija</span><span className="text-white">{ad.lokacija}</span></div>
                </div>
                {ownerActions.onPromoteClick && (
                  <div className="space-y-4">
                    <p className="text-[10px] font-black uppercase text-[#9CA3AF]">Istakni oglas (plaćanje)</p>
                    {ownerActions.promoteError && <p className="text-red-400 text-[10px]">{ownerActions.promoteError}</p>}
                    <div className="grid grid-cols-3 gap-2">
                      {([{ d: 7, price: 10 }, { d: 14, price: 16 }, { d: 30, price: 28 }] as const).map(({ d, price }) => (
                        <button key={d} type="button" onClick={() => ownerActions.onPromoteClick?.(d)} className="p-3 rounded-xl border text-center transition-all hover:border-[#4F6DFF]" style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}>
                          <span className="block font-black text-white">{price} €</span>
                          <span className="text-[9px] uppercase" style={{ color: 'var(--text-secondary)' }}>{d} dana</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {ownerActions.onStatusChange && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-[#9CA3AF]">Status</label>
                    <select value={ad.status} disabled={ad.status === 'NA_CEKANJU'} onChange={(e) => ownerActions.onStatusChange?.(e.target.value as 'AKTIVAN' | 'PRODAN' | 'ISTEKAO')} className="w-full h-12 bg-[#0B1220] border border-white/10 rounded-xl px-4 text-sm text-white font-bold disabled:opacity-70">
                      <option value="NA_CEKANJU">Na čekanju</option>
                      <option value="AKTIVAN">Aktivan</option>
                      <option value="PRODAN">Prodano</option>
                      <option value="ISTEKAO">Istekao</option>
                    </select>
                    {ad.status === 'NA_CEKANJU' && <p className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>Oglas čeka odobrenje administratora.</p>}
                  </div>
                )}
                {ownerActions.onDelete && (
                  <button type="button" onClick={ownerActions.onDelete} className="w-full h-12 border border-red-500/50 text-red-400 rounded-2xl flex items-center justify-center gap-2 font-black uppercase text-xs hover:bg-red-500/10 transition-all"><Trash2 className="w-4 h-4" /> Obriši oglas</button>
                )}
                <Link to={`/moji-oglasi/uredi/${ad.id}`} className="w-full h-14 bg-gradient-to-r from-[#4F6DFF] to-[#7C8CFF] text-white rounded-2xl flex items-center justify-center gap-3 font-black uppercase text-xs shadow-lg active:scale-95 transition-all">
                  <Edit2 className="w-4 h-4" /> Uredi oglas
                </Link>
                <Link to="/moji-oglasi" className="block w-full h-14 border border-white/10 text-white rounded-2xl flex items-center justify-center gap-3 font-black uppercase text-xs hover:bg-white/5 transition-all">
                  ← Moji oglasi
                </Link>
              </div>
            ) : (
              <>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    {!isOwner && (
                      <button type="button" onClick={() => onToggleFavorite(ad.id)} className="p-2.5 rounded-xl border transition-all active:scale-95" style={{ borderColor: 'var(--border-subtle)', color: favorites.includes(ad.id) ? 'var(--accent)' : 'var(--text-secondary)' }} aria-label={favorites.includes(ad.id) ? 'Ukloni iz favorita' : 'Dodaj u favorite'}>
                        <Heart className={`w-5 h-5 ${favorites.includes(ad.id) ? 'fill-current' : ''}`} />
                      </button>
                    )}
                    <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-secondary)' }}>{sellerAdsCount} oglasa od prodavca</span>
                  </div>
                  {user && !isOwner && (
                    <Link
                      to={`/prodavac/${ad.vlasnikId}`}
                      className="text-[10px] font-black uppercase tracking-widest px-3 py-2 rounded-full border"
                      style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-secondary)', backgroundColor: 'var(--bg-card)' }}
                    >
                      Svi oglasi prodavca
                    </Link>
                  )}
                </div>
                {(() => {
                  const telefon = (ad.details as any)?.telefon ?? (ad.details as any)?.telefonProdavca ?? ad.kontaktTelefon;
                  const hasTelefon = telefon != null && String(telefon).trim() !== '';
                  const telefonNorm = hasTelefon ? String(telefon).replace(/\s/g, '').replace(/^\+/, '') : '';
                  const digitsOnly = (s: string) => s.replace(/\D/g, '');
                  const viberDigits = ((ad.details as any)?.viber != null && (ad.details as any)?.viber !== '') ? digitsOnly(String((ad.details as any).viber)) : digitsOnly(telefonNorm);
                  const viberNum = viberDigits ? (viberDigits.startsWith('382') ? viberDigits : '382' + viberDigits.replace(/^0/, '')) : '';
                  const adLink = typeof window !== 'undefined' ? window.location.href : '';
                  const pratecaPoruka = `Zdravo! Zanima me ovaj oglas: ${ad.naslov || 'Oglas'} - ${adLink}`;
                  const viberHref = viberNum ? `viber://chat?number=${viberNum}&text=${encodeURIComponent(pratecaPoruka)}` : '';
                  const handleViberClick = async (e: React.MouseEvent) => {
                    if (!viberHref) return;
                    e.preventDefault();
                    try {
                      if (navigator.clipboard?.writeText) {
                        await navigator.clipboard.writeText(pratecaPoruka);
                        setViberCopied(true);
                        setTimeout(() => setViberCopied(false), 2500);
                      }
                    } catch {}
                    window.location.href = viberHref;
                  };
                  const whatsappRaw = (ad.details as any)?.whatsapp ?? (telefonNorm ? digitsOnly(telefonNorm) : null);
                  const whatsapp = whatsappRaw != null && digitsOnly(String(whatsappRaw)) !== '' ? (() => { const d = digitsOnly(String(whatsappRaw)); return d.startsWith('382') ? d : '382' + d.replace(/^0/, ''); })() : null;
                  return (
                    <>
                      {hasTelefon && (
                        <>
                          {showPhoneNumber && (
                            <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest bg-white/5 p-3 rounded-xl border border-white/5" style={{ color: 'var(--text-secondary)' }}>
                              <span className="flex items-center gap-2"><Phone className="w-3 h-3" style={{ color: 'var(--accent)' }} /> Telefon</span>
                              <span className="font-mono text-sm select-all" style={{ color: 'var(--text-primary)' }}>{telefon}</span>
                            </div>
                          )}
                          <a href={`tel:${String(telefon).replace(/\s/g, '')}`} onClick={() => setShowPhoneNumber(true)} className="w-full h-14 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl flex items-center justify-center gap-3 font-black uppercase text-xs shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"><Phone className="w-4 h-4 fill-current" /> Pozovi prodavca</a>
                        </>
                      )}
                      {viberHref && (
                        <>
                          <a href={viberHref} onClick={handleViberClick} className="w-full h-14 bg-[#7360F2] hover:bg-[#6B56E8] text-white rounded-2xl flex items-center justify-center gap-3 font-black uppercase text-xs shadow-lg shadow-[#7360F2]/25 active:scale-95 transition-all">
                            <MessageCircle className="w-5 h-5" /> Pošalji poruku na Viber
                          </a>
                          {viberCopied && (
                            <div className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest text-center">
                              Poruka kopirana – nalijepi u Viberu
                            </div>
                          )}
                        </>
                      )}
                      {whatsapp && (
                        <a href={`https://wa.me/${whatsapp.startsWith('382') ? whatsapp : '382' + whatsapp.replace(/^0/, '')}?text=${encodeURIComponent(pratecaPoruka)}`} target="_blank" rel="noopener noreferrer" className="w-full h-14 bg-[#25D366] hover:bg-[#22C55E] text-white rounded-2xl flex items-center justify-center gap-3 font-black uppercase text-xs shadow-lg shadow-[#25D366]/25 active:scale-95 transition-all">
                          <MessageCircle className="w-5 h-5" /> Pošalji poruku na WhatsApp
                        </a>
                      )}
                    </>
                  );
                })()}
                {SHOW_CHAT && user && !isOwner && (
                  <Link to={`/poruke?adId=${ad.id}`} className="w-full h-14 border border-white/10 text-white rounded-2xl flex items-center justify-center gap-3 font-black uppercase text-xs hover:bg-white/5 transition-all">
                    <MessageCircle className="w-4 h-4" /> Poruka prodavcu
                  </Link>
                )}
                <button type="button" onClick={() => setReportOpen(true)} className="w-full h-12 border border-white/10 rounded-2xl flex items-center justify-center gap-2 font-bold uppercase text-[10px] transition-colors" style={{ color: 'var(--text-secondary)' }}><AlertTriangle className="w-4 h-4" /> Prijavi oglas</button>
              </>
            )}
           </div>
            {!isOwner && (
            <div className="mt-6 rounded-2xl border p-6 shadow-xl" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}>
              <div className="flex items-center gap-5"><div className="w-20 h-20 bg-gradient-to-br from-[#4F6DFF] to-[#7C8CFF] rounded-full flex items-center justify-center font-black text-white text-3xl shadow-xl border-4 border-[#0B1220]">{getInitial((ad.details as any)?.imeProdavca ?? ad.kontaktIme)}</div><div><div className="text-white font-black text-xl flex items-center gap-2 mb-1">{(ad.details as any)?.imeProdavca ?? ad.kontaktIme}<ShieldCheck className="w-5 h-5 text-emerald-400" /></div><div className="flex items-center gap-1.5"><div className="flex text-amber-400">{[...Array(5)].map((_, i) => <Star key={i} className={`w-3.5 h-3.5 ${i < Math.round(Number(metrics.avg)) ? 'fill-current' : 'opacity-20'}`} />)}</div><span className="text-[10px] text-white/50 font-black uppercase tracking-widest">{metrics.avg} ({metrics.count})</span></div></div></div>
              <RatingSection sellerId={ad.vlasnikId} user={user} onAddRating={onAddRating} metrics={metrics} />
            </div>
            )}
          </div>
        {(similarLoading || similarAds.length > 0) && (
          <div className="lg:col-span-12 mt-12">
            {similarLoading ? (
              <div className="max-w-6xl mx-auto px-4">
                <div className="h-8 w-48 rounded-lg bg-[#131C2B] animate-pulse mb-4" />
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 lg:gap-6">
                  {[1, 2, 3, 4].map((i) => <div key={i} className="rounded-[18px] overflow-hidden aspect-square bg-[#131C2B] animate-pulse" />)}
                </div>
              </div>
            ) : (
              <div className="max-w-6xl mx-auto px-4">
                <h2 className="text-lg font-black uppercase tracking-wide mb-4" style={{ color: 'var(--text-primary)' }}>Slični oglasi</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 lg:gap-6">
                  {similarAds.map((similar) => (
                    <AdCard key={similar.id} ad={similar} isFavorite={favorites.includes(similar.id)} onToggleFavorite={onToggleFavorite} imgWidth={400} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      {reportModal}
    </div>
  );
};

const AdDetail: React.FC<{ 
  ads: Ad[], user: User | null, onToggleFavorite: (id: string) => void, favorites: string[], ratings: Rating[], onAddRating: (sellerId: string, score: number) => void, getSellerMetrics: (sellerId: string) => { avg: string, count: number }
}> = ({ ads, user, onToggleFavorite, favorites, ratings, onAddRating, getSellerMetrics }) => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [adFromApi, setAdFromApi] = useState<Ad | null | undefined>(undefined);

  // Detail route: SYNC reset na vrh PRIJE prvog paint-a (bez RAF/timeout – inače vidiš skok)
  useLayoutEffect(() => {
    if (typeof window === 'undefined') return;
    if (!slug) return;
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    hardScrollToTop();
  }, [slug, location.pathname, location.key]);
  const [fetchError, setFetchError] = useState<boolean>(false);
  const abortRef = useRef<AbortController | null>(null);
  const loadAd = useCallback(() => {
    if (!slug) { setAdFromApi(null); setFetchError(false); return; }
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();
    const ctrl = abortRef.current;
    setAdFromApi(undefined);
    setFetchError(false);
    const base = (API_BASE || '').replace(/\/+$/, '');
    const url = `${base}/ads/${encodeURIComponent(slug)}`;
    fetch(url, { signal: ctrl.signal, headers: getAuthHeaders() })
      .then(res => res.ok ? res.json() : null)
      .then((data: any) => {
        if (ctrl.signal.aborted) return;
        if (!data) { setAdFromApi(null); return; }
        try {
          setAdFromApi(mapApiAdToAd(data));
        } catch (e) {
          console.error('[AdDetail] mapApiAdToAd error:', e);
          if (!ctrl.signal.aborted) { setAdFromApi(null); setFetchError(true); }
        }
      })
      .catch((err) => {
        if (err?.name === 'AbortError') return;
        console.error('[AdDetail] fetch error:', err);
        if (!ctrl.signal.aborted) {
          setAdFromApi(null);
          setFetchError(true);
        }
      });
  }, [slug]);
  useEffect(() => {
    loadAd();
    return () => { if (abortRef.current) { abortRef.current.abort(); abortRef.current = null; } };
  }, [loadAd]);

  const ad = adFromApi !== undefined ? adFromApi : ads.find(a => a.slug === slug);
  const sellerAdsCount = useMemo(() => ad ? (adFromApi ? 1 : ads.filter(a => a.vlasnikId === ad.vlasnikId).length) : 0, [ad?.vlasnikId, ads, adFromApi]);

  // SYNC reset kad ad učita (layout se pomaknuo) – useLayoutEffect, bez RAF
  useLayoutEffect(() => {
    if (!ad?.id) return;
    hardScrollToTop();
  }, [ad?.id]);

  const [similarAds, setSimilarAds] = useState<Ad[]>([]);
  const [similarLoading, setSimilarLoading] = useState(false);
  const similarAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!ad?.slug) { setSimilarAds([]); return; }
    if (similarAbortRef.current) similarAbortRef.current.abort();
    similarAbortRef.current = new AbortController();
    const ctrl = similarAbortRef.current;
    setSimilarLoading(true);
    const base = (API_BASE || '').replace(/\/+$/, '');
    fetch(`${base}/ads/similar/${encodeURIComponent(ad.slug)}`, { signal: ctrl.signal })
      .then(res => res.ok ? res.json() : null)
      .then((data: { ads?: any[] } | null) => {
        if (ctrl.signal.aborted) return;
        const list = Array.isArray(data?.ads) ? data.ads : [];
        setSimilarAds(list.map((raw: any) => {
          try { return mapApiAdToAd(raw); } catch { return null; }
        }).filter((a): a is Ad => a != null));
      })
      .catch(() => { if (!ctrl.signal.aborted) setSimilarAds([]); })
      .finally(() => { if (!ctrl.signal.aborted) setSimilarLoading(false); });
    return () => { ctrl.abort(); similarAbortRef.current = null; };
  }, [ad?.slug]);

  const [promoteError, setPromoteError] = useState('');
  const safeVlasnikId = ad?.vlasnikId != null ? String(ad.vlasnikId) : '';

  if (adFromApi === undefined && !ad) return <div className="max-w-6xl mx-auto px-4 py-20"><div className="aspect-video bg-[#131C2B] rounded-xl animate-pulse" /><div className="h-8 bg-[#131C2B] rounded-lg w-3/4 mt-6 animate-pulse" /></div>;
  const handleBackFromDetail = useCallback(() => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      if (import.meta.env?.DEV) console.log('[AdDetail] back: navigate(-1)');
      navigate(-1);
    } else {
      if (import.meta.env?.DEV) console.log('[AdDetail] back: fallback navigate(/marketplace)');
      navigate('/marketplace');
    }
  }, [navigate]);

  if (!ad) return (
    <div className="max-w-6xl mx-auto px-4 py-20 text-center">
      <p className="font-bold uppercase tracking-widest mb-4" style={{ color: 'var(--text-secondary)' }}>Oglas nije pronađen</p>
      {fetchError && <button type="button" onClick={loadAd} className="px-4 py-2 rounded-xl text-sm font-bold uppercase" style={{ backgroundColor: 'var(--accent)', color: 'white' }}>Pokušaj ponovo</button>}
      <p className="mt-4"><button type="button" onClick={handleBackFromDetail} className="text-sm font-bold" style={{ color: 'var(--accent)' }}>← Nazad na oglase</button></p>
    </div>
  );

  const isOwner = user && ad.vlasnikId === user.id;
  return (
    <AdDetailView
      ad={ad}
      user={user}
      onToggleFavorite={onToggleFavorite}
      favorites={favorites}
      ratings={ratings}
      onAddRating={onAddRating}
      getSellerMetrics={getSellerMetrics}
      sellerAdsCount={sellerAdsCount}
      similarAds={similarAds}
      similarLoading={similarLoading}
      navigate={navigate}
      location={location}
      API_BASE={API_BASE}
      getAuthHeaders={getAuthHeaders}
      setPageMeta={setPageMeta}
      ownerActions={isOwner ? {
        promoteError,
        onPromoteClick: (planDays) => {
          setPromoteError('');
          if (!user) { navigate(`/prijava?returnTo=${encodeURIComponent(location.pathname)}`); return; }
          fetch(`${API_BASE}/payments/checkout`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...getAuthHeaders() }, body: JSON.stringify({ adId: ad.id, planDays }) })
            .then((res) => res.json().then((data: { url?: string; error?: string }) => ({ status: res.status, data })))
            .then(({ status, data }) => { if (status === 401) navigate(`/prijava?returnTo=${encodeURIComponent(location.pathname)}`); else if (data?.url) window.location.href = data.url; else if (data?.error) setPromoteError(data.error); });
        },
        onStatusChange: (status) => {
          if (status === 'PRODAN' && !window.confirm('Označiti kao prodan? Oglas će biti trajno uklonjen.')) return;
          fetch(`${API_BASE}/ads/my/${ad.id}`, status === 'PRODAN'
            ? { method: 'DELETE', headers: getAuthHeaders() }
            : { method: 'PATCH', headers: { 'Content-Type': 'application/json', ...getAuthHeaders() }, body: JSON.stringify({ status }) })
            .then(res => {
              if (res.ok && status === 'PRODAN') navigate('/moji-oglasi');
              if (res.ok && status !== 'PRODAN') res.json().then((data: any) => setAdFromApi(mapApiAdToAd(data)));
            });
        },
        onDelete: () => {
          if (!window.confirm('Obrisati ovaj oglas?')) return;
          fetch(`${API_BASE}/ads/my/${ad.id}`, { method: 'DELETE', headers: getAuthHeaders() })
            .then(res => { if (res.ok) navigate('/moji-oglasi'); });
        },
      } : undefined}
    />
  );
};

const PublicProfile: React.FC<{ ads: Ad[], favorites: string[], onToggleFavorite: (id: string) => void, adsError?: string | null, adsAreFallback?: boolean, onRetryAds?: () => void }> = ({ ads: _ads, favorites, onToggleFavorite }) => {
  const location = useLocation();
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [sellerAds, setSellerAds] = useState<Ad[]>([]);
  const [sellerLoading, setSellerLoading] = useState(false);
  const [sellerError, setSellerError] = useState<string | null>(null);
  const sellerName = sellerAds.length > 0 ? sellerAds[0].kontaktIme : "Nepoznat prodavac";
  const linksDisabled = false;

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

  useEffect(() => {
    if (!userId) return;
    const ctrl = new AbortController();
    setSellerLoading(true);
    setSellerError(null);
    fetch(`${API_BASE}/ads/user/${encodeURIComponent(userId)}`, { headers: getAuthHeaders(), signal: ctrl.signal })
      .then(res => res.ok ? res.json() : res.json().then((d: { error?: string }) => Promise.reject(d.error || 'Greška servera')))
      .then((data: any[]) => setSellerAds((data || []).map(mapApiAdToAd)))
      .catch((err) => { if (err?.name !== 'AbortError') setSellerError(String(err || 'Greška')); })
      .finally(() => setSellerLoading(false));
    return () => ctrl.abort();
  }, [userId]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8 animate-slide-up">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 bg-white/5 rounded-full text-white"><ChevronLeft className="w-6 h-6" /></button>
        <div>
          <h1 className="text-2xl font-black text-white uppercase tracking-widest">{sellerName}</h1>
          <p className="text-[10px] text-[#9CA3AF] font-bold uppercase tracking-wider">{sellerAds.length} Aktivnih oglasa</p>
        </div>
      </div>
      {sellerLoading && <div className="py-10 text-center text-[#9CA3AF]">Učitavanje oglasa...</div>}
      {sellerError && <div className="py-6 text-center text-red-400">{sellerError}</div>}
      {!sellerLoading && !sellerError && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {sellerAds.length === 0 ? (
            <div className="col-span-full text-center text-[#9CA3AF]">Nema aktivnih oglasa.</div>
          ) : (
            sellerAds.map(ad => (
              <AdCard key={ad.id} ad={ad} isFavorite={favorites.includes(ad.id)} onToggleFavorite={onToggleFavorite} linksDisabled={linksDisabled} imgWidth={400} />
            ))
          )}
        </div>
      )}
    </div>
  );
};

type ApiConversation = {
  id: string;
  adId: string | null;
  ad: { id: string; naslov: string; slug: string } | null;
  lastMessage: { id: string; content: string; createdAt: string; senderId: string } | null;
  participants: Array<{ id: string; ime: string }>;
  unreadCount: number;
  createdAt: string;
};
type ApiMessage = { id: string; content: string; createdAt: string; senderId: string; sender: { id: string; ime: string } };

/* Smoke test: 1) Otvori chat → poruke bez "Prekinuto"  2) StrictMode dev bez lažnih grešaka  3) Pošalji → vidi se + newMessage  4) Refresh → poruke ostaju  5) Token istekao → auth error */
const Chat = ({ user, ads, conversations: _conversations, setConversations: _setConversations, messages: _messages, setMessages: _setMessages, setNotifications: _setNotifications, onRefreshNotifications, onMarkMessageNotificationsRead }: any) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const adIdParam = searchParams.get('adId');
  const conversationIdParam = searchParams.get('conversationId');
  const [conversationsList, setConversationsList] = useState<ApiConversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(conversationIdParam || null);
  const [messagesList, setMessagesList] = useState<ApiMessage[]>([]);
  const [loadedConvDetails, setLoadedConvDetails] = useState<{ participants?: Array<{ id: string; ime: string }>; ad?: { naslov?: string; slike?: string[] } } | null>(null);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [conversationsLoading, setConversationsLoading] = useState(true);
  const [inputText, setInputText] = useState('');
  const [sendLoading, setSendLoading] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [messagesError, setMessagesError] = useState<string | null>(null);
  const [messagesRetry, setMessagesRetry] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const activeConvRef = useRef(activeConversationId);
  const fetchSeqRef = useRef(0);
  activeConvRef.current = activeConversationId;

  const fetchConversations = useCallback(() => {
    if (!user) return;
    fetch(`${API_BASE}/chat/conversations`, { headers: getAuthHeaders() })
      .then((res) => (res.ok ? res.json() : { conversations: [] }))
      .then((data: { conversations?: ApiConversation[] }) => setConversationsList(data.conversations ?? []));
  }, [user]);

  useEffect(() => {
    if (!user) return;
    setConversationsLoading(true);
    fetch(`${API_BASE}/chat/conversations`, { headers: getAuthHeaders() })
      .then((res) => (res.ok ? res.json() : { conversations: [] }))
      .then((data: { conversations?: ApiConversation[] }) => { setConversationsList(data.conversations ?? []); setConversationsLoading(false); })
      .catch(() => setConversationsLoading(false));
  }, [user]);

  useEffect(() => {
    if (conversationsList.length > 0 && !activeConversationId && !adIdParam && !conversationIdParam) {
      setActiveConversationId(conversationsList[0].id);
      setSearchParams((prev) => { const n = new URLSearchParams(prev); n.set('conversationId', conversationsList[0].id); return n; });
    }
  }, [conversationsList, activeConversationId, adIdParam, conversationIdParam]);

  useEffect(() => {
    if (adIdParam && user && !conversationIdParam) {
      fetch(`${API_BASE}/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...getAuthHeaders() }, body: JSON.stringify({ adId: adIdParam }) })
        .then((res) => (res.ok ? res.json() : null))
        .then((data: { conversationId?: string } | null) => {
          if (data?.conversationId) {
            setActiveConversationId(data.conversationId);
            fetchConversations();
            setSearchParams((prev) => { const n = new URLSearchParams(prev); n.set('conversationId', data!.conversationId!); n.delete('sellerId'); n.delete('adId'); return n; });
          }
        });
    } else if (conversationIdParam) setActiveConversationId(conversationIdParam);
  }, [adIdParam, conversationIdParam, user, fetchConversations]);

  useEffect(() => {
    if (!activeConversationId || !user) {
      setMessagesList([]);
      setLoadedConvDetails(null);
      setMessagesLoading(false);
      setMessagesError(null);
      return;
    }
    setMessagesError(null);
    setMessagesLoading(true);
    const seq = ++fetchSeqRef.current;
    const ctrl = new AbortController();
    let timeoutFired = false;
    const to = setTimeout(() => {
      timeoutFired = true;
      ctrl.abort();
    }, 15000);
    fetch(`${API_BASE}/chat/${activeConversationId}`, { headers: getAuthHeaders(), signal: ctrl.signal })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (seq !== fetchSeqRef.current) return;
        if (!res.ok) {
          if (res.status === 401 || res.status === 403)
            setMessagesError('Morate biti prijavljeni');
          else if (res.status >= 500)
            setMessagesError('Greška servera. Pokušajte kasnije.');
          else
            setMessagesError('Greška pri učitavanju.');
          setMessagesList([]);
          setLoadedConvDetails(null);
          return;
        }
        setMessagesList(Array.isArray((data as any)?.messages) ? (data as any).messages : []);
        const conv = (data as any)?.conversation;
        if (conv?.participants) {
          const ad = conv.ad;
          const adForDisplay = ad
            ? {
                ...ad,
                slike: (ad as any).images?.map((i: { url: string }) => i.url) || (ad as any).slike || [],
                slikeThumbs:
                  (ad as any).images?.map((i: { thumbUrl?: string; url: string }) => i.thumbUrl || i.url) ||
                  (ad as any).slike ||
                  [],
              }
            : ad;
          setLoadedConvDetails({
            participants: conv.participants.map((p: { user: { id: string; ime: string } }) => p.user),
            ad: adForDisplay
          });
        } else setLoadedConvDetails(null);
        onMarkMessageNotificationsRead?.(activeConversationId);
      })
      .catch((err) => {
        if (seq !== fetchSeqRef.current) return;
        if (err?.name === 'AbortError') {
          if (timeoutFired) setMessagesError('Timeout. Pokušajte ponovo.');
          return;
        }
        setMessagesList([]);
        setLoadedConvDetails(null);
        setMessagesError('Greška pri učitavanju. Provjeri da li backend radi (npm run dev).');
      })
      .finally(() => {
        clearTimeout(to);
        if (seq === fetchSeqRef.current) setMessagesLoading(false);
      });
    return () => {
      clearTimeout(to);
      ctrl.abort();
    };
  }, [activeConversationId, user, messagesRetry]);

  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [messagesList]);

  useEffect(() => {
    if (!user) return;
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return;
    const debug = isChatDebug();
    const socket = io(getSocketUrl(), {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 500
    });
    socketRef.current = socket;
    if (debug) {
      socket.on('connect', () => console.log('[chat] socket connect', socket.id));
      socket.on('connect_error', (err) => console.warn('[chat] socket connect_error', err.message));
      socket.on('disconnect', (reason) => console.log('[chat] socket disconnect', reason));
      socket.on('reconnect_attempt', (n) => console.log('[chat] socket reconnect_attempt', n));
    }
    socket.on('newMessage', (payload: { conversationId: string; message: ApiMessage }) => {
      const msg = payload.message as ApiMessage;
      if (payload.conversationId === activeConvRef.current) {
        setMessagesList((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      } else {
        setConversationsList((prev) =>
          prev.map((c) =>
            c.id === payload.conversationId
              ? {
                  ...c,
                  lastMessage: { id: msg.id, content: msg.content, createdAt: msg.createdAt, senderId: msg.senderId },
                  unreadCount: (c.unreadCount ?? 0) + 1
                }
              : c
          )
        );
        onRefreshNotifications?.();
      }
    });
    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user]);

  const activeConv = conversationsList.find((c) => c.id === activeConversationId) || null;
  const convForDisplay = activeConv ?? (loadedConvDetails ? { participants: loadedConvDetails.participants ?? [], ad: loadedConvDetails.ad } : null);
  const contextAd = convForDisplay?.ad ?? (adIdParam ? ads.find((a: Ad) => a.id === adIdParam) : null);
  const otherParticipant = convForDisplay?.participants?.find((p) => p.id !== user?.id);
  const displayName = otherParticipant?.ime ?? (contextAd as Ad)?.kontaktIme ?? (contextAd as { naslov?: string })?.naslov ?? 'Razgovor';

  const contextAdTyped = contextAd as Ad | null;
  const hasContextImages =
    !!contextAdTyped &&
    Array.isArray(contextAdTyped.slike) &&
    contextAdTyped.slike.length > 0;

  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || !user || !activeConversationId) return;
    setSendError(null);
    setSendLoading(true);
    const content = inputText.trim();
    fetch(`${API_BASE}/chat/${activeConversationId}/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ content })
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setSendError((data?.error as string) || `Greška ${res.status}`);
          setSendLoading(false);
          return;
        }
        setInputText('');
        const msg = data as ApiMessage;
        if (msg?.id) setMessagesList((prev) => [...prev, msg]);
        setSendLoading(false);
      })
      .catch((err) => {
        setSendError('Mreža nije dostupna. Provjeri da li backend radi.');
        setSendLoading(false);
        console.error('[chat send]', err);
      });
  };

  if (!conversationsLoading && conversationsList.length === 0 && !adIdParam) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <EmptyState variant="no-messages" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto h-[calc(100dvh-120px)] lg:h-[calc(100dvh-200px)] flex flex-col px-4 py-6 animate-slide-up">
      <div className="bg-[#131C2B] border border-white/5 rounded-xl flex-grow flex flex-col shadow-2xl overflow-hidden">
        <div className="p-4 bg-white/5 border-b border-white/5 flex items-center gap-4">
          <div className="w-12 h-12 bg-[#4F6DFF] rounded-full flex items-center justify-center font-bold text-white uppercase">
            {getInitial(displayName, '?')}
          </div>
          <div>
            <div className="text-white font-black uppercase text-xs tracking-widest">{displayName}</div>
            <div className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest">Online</div>
          </div>
        </div>
        {conversationsList.length > 1 && (
          <div className="p-2 border-b border-white/5 overflow-x-auto flex gap-2 no-scrollbar">
            {conversationsList.map((c) => (
              <button key={c.id} type="button" onClick={() => { setActiveConversationId(c.id); setSearchParams((prev) => { const n = new URLSearchParams(prev); n.set('conversationId', c.id); n.delete('sellerId'); n.delete('adId'); return n; }); }} className="flex-shrink-0 p-2 rounded-xl text-left border min-w-[140px]" style={{ borderColor: activeConversationId === c.id ? 'var(--accent)' : 'var(--border-subtle)', backgroundColor: 'var(--bg-input)' }}>
                <div className="text-[10px] font-bold truncate" style={{ color: 'var(--text-primary)' }}>{c.ad?.naslov ?? 'Razgovor'}</div>
                <div className="text-[9px]" style={{ color: 'var(--text-secondary)' }}>{c.lastMessage?.content?.slice(0, 30) ?? '—'}…</div>
              </button>
            ))}
          </div>
        )}
        {hasContextImages && contextAdTyped && (
          <div className="p-3 bg-white/5 border-b border-white/5 flex items-center gap-3">
            <img
              src={getProxiedImageUrl(
                (Array.isArray(contextAdTyped.slikeThumbs) && contextAdTyped.slikeThumbs.length > 0
                  ? contextAdTyped.slikeThumbs[0]
                  : contextAdTyped.slike[0])
              )}
              className="w-10 h-10 rounded-lg object-cover"
              alt=""
              width={40}
              height={40}
              decoding="async"
              fetchPriority="low"
              loading="lazy"
            />
            <div className="flex-grow">
              <div className="text-[10px] text-white font-bold line-clamp-1">{(contextAd as Ad).naslov}</div>
              <div className="text-[10px] text-[#7C8CFF] font-black">{(contextAd as Ad).cijena?.toLocaleString?.() ?? ''} €</div>
            </div>
          </div>
        )}
        <div ref={scrollRef} className="flex-grow min-h-0 p-6 overflow-y-auto space-y-4 no-scrollbar">
          {messagesError ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <p className="text-red-400 text-sm mb-2">{messagesError}</p>
              <button type="button" onClick={() => { setMessagesError(null); setMessagesRetry((r) => r + 1); }} className="text-xs underline">Pokušaj ponovo</button>
            </div>
          ) : messagesLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--accent)' }} /></div>
          ) : messagesList.length > 0 ? (
            messagesList.map((msg: ApiMessage) => (
              <div key={msg.id} className={`flex ${msg.senderId === user?.id ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] p-4 rounded-2xl text-sm ${msg.senderId === user?.id ? 'bg-[#4F6DFF] text-white rounded-tr-none' : 'bg-white/10 text-white rounded-tl-none'}`}>
                  {msg.content}
                  <div className="text-[8px] opacity-50 mt-1 text-right">{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                </div>
              </div>
            ))
          ) : (
            <div className="h-full flex flex-col items-center justify-center space-y-4 text-center opacity-30">
              <MessageSquare className="w-16 h-16" />
              <p className="text-[10px] uppercase font-bold tracking-widest">Započnite razgovor</p>
            </div>
          )}
        </div>
        {(activeConversationId || conversationsList.length > 0) && (
          <div className="flex-shrink-0 p-4 bg-white/5 border-t border-white/5">
            {sendError && <p className="text-red-400 text-xs mb-2">{sendError}</p>}
            <form onSubmit={handleSendMessage} className="relative flex items-center gap-2">
              <input type="text" value={inputText} onChange={(e) => setInputText(e.target.value)} enterKeyHint="send" placeholder={activeConversationId ? 'Unesite poruku...' : 'Odaberite razgovor'} disabled={!activeConversationId} className="flex-1 min-w-0 h-14 bg-[#0B1220] border border-white/10 rounded-2xl px-6 pr-4 sm:pr-16 text-sm text-white outline-none focus:border-[#4F6DFF] disabled:opacity-60 disabled:cursor-not-allowed" />
              <button type="submit" disabled={sendLoading || !activeConversationId} className="flex-shrink-0 h-12 sm:h-10 w-auto sm:w-10 px-4 sm:px-0 sm:absolute sm:right-2 sm:top-2 bg-[#4F6DFF] rounded-xl flex items-center justify-center gap-2 text-white hover:bg-[#3D56D6] transition-colors disabled:opacity-50 text-xs font-bold uppercase">
                {sendLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><span className="sm:hidden">Pošalji</span><Send className="hidden sm:block w-4 h-4" /></>}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

const Notifications = ({ notifications, onMarkRead, onRefresh }: { notifications: Notification[]; onMarkRead: (id: string) => void; onRefresh?: () => void }) => {
  const navigate = useNavigate();
  const [extendingId, setExtendingId] = useState<string | null>(null);
  const handleNotificationClick = (n: Notification) => {
    const isDeletion = n.tip === 'AD_DELETION_7D' || n.tip === 'AD_DELETION_3D';
    if (!isDeletion && !n.procitano) onMarkRead(n.id);
    const target = n.link || '/obavjestenja';
    if (!isDeletion) navigate(target);
  };
  const handleExtend = async (e: React.MouseEvent, adId: string, notifId: string) => {
    e.stopPropagation();
    if (extendingId) return;
    setExtendingId(adId);
    try {
      const res = await fetch(`${API_BASE}/ads/${adId}/extend`, { method: 'POST', headers: getAuthHeaders() });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        onMarkRead(notifId);
        onRefresh?.();
      } else {
        console.error(data?.error || 'Greška pri produženju');
      }
    } catch {
      console.error('Greška u mreži');
    } finally {
      setExtendingId(null);
    }
  };
  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6 animate-slide-up">
      <h1 className="text-2xl font-black text-white uppercase tracking-widest">Obavještenja</h1>
      <div className="space-y-3">
        {notifications.length === 0 ? (
          <EmptyState variant="no-notifications" />
        ) : (
          notifications.map((n: Notification) => {
            const isDeletion = n.tip === 'AD_DELETION_7D' || n.tip === 'AD_DELETION_3D';
            return (
              <div key={n.id} onClick={() => handleNotificationClick(n)} className={`p-5 rounded-xl border flex gap-4 items-start cursor-pointer transition-all ${n.procitano ? 'bg-[#131C2B] border-white/5 opacity-60' : 'bg-[#162235] border-[#4F6DFF]/30 hover:scale-[1.01]'}`}>
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 bg-[#4F6DFF]/20 text-[#4F6DFF]">
                  <Bell className="w-5 h-5" />
                </div>
                <div className="flex-grow min-w-0 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-white font-bold text-sm">{n.naslov}</span>
                      <span className="text-[10px] text-[#9CA3AF] shrink-0 ml-2">{n.createdAt ? formatRelativeTime(n.createdAt) : ''}</span>
                    </div>
                  </div>
                  <div className="text-xs text-[#9CA3AF] leading-relaxed">{n.poruka}</div>
                  {isDeletion && n.entityId && (
                    <button
                      type="button"
                      onClick={(e) => handleExtend(e, n.entityId!, n.id)}
                      disabled={!!extendingId}
                      className="mt-2 px-4 py-2 rounded-xl text-[10px] font-bold uppercase bg-[#4F6DFF] text-white hover:opacity-90 disabled:opacity-60"
                    >
                      {extendingId === n.entityId ? 'Produžujem...' : 'Produži oglas'}
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

const Auth: React.FC<{ onLogin: (user: any) => void }> = ({ onLogin }) => {
  const [error, setError] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    const token = searchParams.get('token');
    const err = searchParams.get('error');
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
      setSearchParams({});
      fetch(`${API_BASE}/auth/me`, { headers: getAuthHeaders() })
        .then(res => res.json())
        .then(userData => {
          if (userData?.id) {
            onLogin(userData);
            const returnTo = searchParams.get('returnTo') || '/';
            navigate(returnTo.startsWith('/') ? returnTo : '/', { replace: true });
          } else setError('Greška pri učitavanju profila.');
        })
        .catch(() => setError('Greška pri učitavanju profila.'));
      return;
    }
    if (err) {
      const msg = err === 'google_missing' ? 'Google prijava nije podešena.' : err === 'google_token' ? 'Nije moguće dobiti pristup od Google-a.' : err === 'google_email' ? 'Google nije vratio email.' : err === 'account_banned' ? 'Nalog je blokiran. Kontaktirajte podršku.' : err === 'facebook_coming_soon' ? 'Facebook prijava će biti dostupna uskoro.' : 'Google prijava nije uspjela.';
      setError(msg);
      setSearchParams({});
    }
  }, [searchParams, onLogin, navigate, setSearchParams]);

  const handleGoogleLogin = () => {
    setGoogleLoading(true);
    setError('');
    window.location.href = `${getApiBaseForRedirect()}/auth/google`;
  };

  const apiBaseForHint = typeof window !== 'undefined' ? getApiBase() : '';

  return (
    <div className="max-w-md mx-auto px-4 py-20">
      <h1 className="text-2xl font-black text-white uppercase tracking-widest mb-2 text-center">Prijava</h1>
      <p className="text-center text-[#9CA3AF] text-sm mb-8">Jedan klik – bez lozinke na ovom sajtu.</p>
      <div className="bg-[#131C2B] border border-white/5 rounded-xl p-8 space-y-6">
        {error && <p className="text-red-400 text-sm break-all">{error}</p>}
        {(import.meta as unknown as { env?: { DEV?: boolean } }).env?.DEV && apiBaseForHint && (
          <p className="text-[10px] text-[#6B7280] break-all">API: {apiBaseForHint}</p>
        )}
        <button type="button" disabled={googleLoading} onClick={handleGoogleLogin} className="w-full h-14 bg-white text-[#1a1a1a] rounded-2xl font-bold text-sm flex items-center justify-center gap-3 hover:bg-white/95 disabled:opacity-50 shadow-lg">
          {googleLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
            <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
          )}
          Nastavi sa Google-om
        </button>
        <p className="text-center text-[#9CA3AF] text-xs">Prijava nije obavezna za pregled oglasa.</p>
      </div>
    </div>
  );
};

const Register: React.FC<{ onSuccess: (user: any) => void }> = ({ onSuccess }) => {
  const [ime, setIme] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [telefon, setTelefon] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ime, email, password, telefon })
    })
      .then(res => res.json().then(data => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (!ok) throw new Error(data?.error || 'Greška pri registraciji');
        localStorage.setItem(TOKEN_KEY, data.accessToken);
        onSuccess(data.user);
        navigate('/');
      })
      .catch(err => setError(err.message || 'Greška pri registraciji'))
      .finally(() => setLoading(false));
  };

  return (
    <div className="max-w-md mx-auto px-4 py-20">
      <h1 className="text-2xl font-black text-white uppercase tracking-widest mb-8 text-center">Registracija</h1>
      <form onSubmit={handleSubmit} className="bg-[#131C2B] border border-white/5 rounded-xl p-8 space-y-6">
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <FormField label="Ime i prezime" name="ime" required>
          <input type="text" required minLength={2} value={ime} onChange={e => setIme(e.target.value)} className="w-full h-12 bg-[#0B1220] border border-white/5 rounded-xl px-4 text-white outline-none focus:border-[#4F6DFF]" placeholder="Marko Marković" />
        </FormField>
        <FormField label="Email" name="email" required>
          <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="w-full h-12 bg-[#0B1220] border border-white/5 rounded-xl px-4 text-white outline-none focus:border-[#4F6DFF]" placeholder="vas@email.me" />
        </FormField>
        <FormField label="Lozinka (min. 6 znakova)" name="password" required>
          <input type="password" required minLength={6} value={password} onChange={e => setPassword(e.target.value)} className="w-full h-12 bg-[#0B1220] border border-white/5 rounded-xl px-4 text-white outline-none focus:border-[#4F6DFF]" placeholder="••••••••" />
        </FormField>
        <FormField label="Telefon" name="telefon" required>
          <input type="tel" required minLength={6} value={telefon} onChange={e => setTelefon(e.target.value)} className="w-full h-12 bg-[#0B1220] border border-white/5 rounded-xl px-4 text-white outline-none focus:border-[#4F6DFF]" placeholder="+382 67 123 456" />
        </FormField>
        <button type="submit" disabled={loading} className="w-full h-14 bg-gradient-to-r from-[#4F6DFF] to-[#7C8CFF] text-white rounded-2xl font-black uppercase text-xs disabled:opacity-50">Registruj se</button>
        <p className="text-center text-[#9CA3AF] text-sm">Već imate račun? <Link to="/prijava" className="text-[#4F6DFF] font-bold">Prijavite se</Link></p>
      </form>
    </div>
  );
};

const AddAd: React.FC<{ user: User | null, onAddAd: (ad: Ad) => void, onPublishSuccess?: () => void }> = ({ user, onAddAd, onPublishSuccess }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState(1);
  const [images, setImages] = useState<{file: File, preview: string}[]>([]);
  const [category, setCategory] = useState<string>('');
  const [vehicleSubcategory, setVehicleSubcategory] = useState<string>('');
  const [makesFromApi, setMakesFromApi] = useState<{ id: string; name: string; slug: string }[]>([]);
  const [modelsFromApi, setModelsFromApi] = useState<{ id: string; name: string; slug: string }[]>([]);
  const [submitError, setSubmitError] = useState<string>('');
  const [duplicateSlug, setDuplicateSlug] = useState<string | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const submitErrorRef = useRef<HTMLDivElement>(null);
  const [latLng, setLatLng] = useState<{ lat: number; lng: number } | null>(null);
  const [formData, setFormData] = useState<any>({
    naslov: '', cijena: '', opis: '', lokacija: 'Podgorica', telefon: user?.telefon || '',
    imePrezime: user?.ime || '',
    premium: false, instagram: '', facebook: '', viber: '', whatsapp: '',
    tipOglasa: 'prodajem',
    realEstateDetails: { tipNekretnine: '', tipPonude: 'prodaja', kvadratura: '', brojSoba: '', sprat: '' },
    details: { stanje: 'Polovno', tipDijela: '', nacinNaplate: '', tipBijela: '', energetskaKlasa: '', tipNamjestaj: '', materijal: '', tipZaDjecu: '', uzrast: '', velicina: '', tipPoljoprivreda: '', tipTehnika: '', vrstaKucni: '', tipModa: '', velicinaModa: '', tipPoslovi: '', tipSport: '', tipGradjevina: '', tipPokloni: '', povodPokloni: '' },
    vehicleDetails: {},
    carDetails: { marka: '', model: '', godiste: '', kilometraza: '', gorivo: '', mjenjac: '', karoserija: '', pogon: '', snaga: '', kubikaza: '', stanje: 'Polovno' },
    motoDetails: { marka: '', model: '', godiste: '', kilometraza: '', kubikaza: '', gorivo: '', mjenjac: '', tip: '', snagaKW: '', stanje: 'Polovno' }
  });

  useEffect(() => { scrollToTop(); }, []);

  useEffect(() => {
    if (category !== MOTORNA_VOZILA_ID || !vehicleSubcategory || !VEHICLE_SUBCATEGORIES_FOR_API.includes(vehicleSubcategory)) {
      setMakesFromApi([]);
      setModelsFromApi([]);
      return;
    }
    setModelsFromApi([]);
    const ac = new AbortController();
    fetch(`${API_BASE}/vehicles/makes?subcategory=${encodeURIComponent(vehicleSubcategory)}`, { signal: ac.signal })
      .then(res => res.ok ? res.json() : { makes: [] })
      .then(data => setMakesFromApi(data.makes || []))
      .catch(() => { if (!ac.signal.aborted) setMakesFromApi([]); });
    return () => ac.abort();
  }, [category, vehicleSubcategory]);

  useEffect(() => {
    const marka = formData.vehicleDetails?.marka;
    if (!marka || makesFromApi.length === 0) {
      setModelsFromApi([]);
      return;
    }
    const make = makesFromApi.find(m => m.name === marka);
    if (!make) {
      setModelsFromApi([]);
      return;
    }
    const ac = new AbortController();
    fetch(`${API_BASE}/vehicles/models?makeId=${encodeURIComponent(make.id)}`, { signal: ac.signal })
      .then(res => res.ok ? res.json() : { models: [] })
      .then(data => setModelsFromApi(data.models || []))
      .catch(() => { if (!ac.signal.aborted) setModelsFromApi([]); });
    return () => ac.abort();
  }, [formData.vehicleDetails?.marka, makesFromApi]);

  const renderFormField = (key: string, config: any, subcategory: string, vDetails: Record<string, unknown>) => {
    const currentVal = vDetails[key];

    if (config.type === 'select') {
      let options = config.options || [];
      if (key === 'marka' && VEHICLE_SUBCATEGORIES_FOR_API.includes(subcategory)) {
        const makeItems = getMakeItemsForCategory(subcategory);
        if (makeItems.length > 0) {
          return (
            <div key={key}>
              <VehicleMakeModelDropdown
                items={makeItems}
                value={String(currentVal || '')}
                onChange={v => setFormData({...formData, vehicleDetails: {...formData.vehicleDetails, marka: v, model: ''}})}
                placeholder="Izaberi"
                label={config.label as string}
                optional={subcategory === 'prikolice'}
              />
            </div>
          );
        }
        options = [];
      } else if (key === 'model' && VEHICLE_SUBCATEGORIES_FOR_API.includes(subcategory)) {
        const brand = String(vDetails.marka || '');
        if (!brand) return null;
        const modelItems: VehicleItem[] = subcategory === 'automobili'
          ? (AUTOMOTIVE_CATALOG.find(b => b.brand === brand)?.models.map(m => ({ id: m.name, name: m.name, slug: m.slug })) ?? [])
          : subcategory === 'motocikli'
            ? ((MOTO_CATALOG as Record<string, string[]>)[brand] || []).map(name => ({ id: name, name, slug: name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') }))
            : getFallbackModelItems(subcategory, brand);
        if (modelItems.length > 0) {
          return (
            <div key={key}>
              <VehicleMakeModelDropdown
                items={modelItems}
                value={String(currentVal || '')}
                onChange={v => setFormData({...formData, vehicleDetails: {...formData.vehicleDetails, model: v}})}
                placeholder="Izaberi"
                label={config.label as string}
                optional={subcategory === 'prikolice'}
              />
            </div>
          );
        }
        options = [];
      } else if (key === 'marka') {
        options = subcategory === 'automobili' ? AUTOMOTIVE_CATALOG.map((b: { brand: string }) => b.brand) : (subcategory === 'motocikli' ? Object.keys(MOTO_CATALOG) : []);
      } else if (key === 'model') {
        const brand = vDetails.marka;
        if (!brand) return null;
        if (subcategory === 'automobili') {
          options = AUTOMOTIVE_CATALOG.find((b: { brand: string }) => b.brand === brand)?.models.map((m: { name: string }) => m.name) || [];
        } else if (subcategory === 'motocikli') {
          options = (MOTO_CATALOG as Record<string, string[]>)[String(brand)] || [];
        }
      }

      if (options.length > MAX_VISIBLE_DEFAULT && (key === 'marka' || key === 'model')) {
        const items = options.map((o: string) => ({ id: o, name: o, isPrimary: false }));
        return (
          <div key={key}>
            <VehicleMakeModelDropdown
              items={items}
              value={String(currentVal || '')}
              onChange={v => setFormData({...formData, vehicleDetails: {...formData.vehicleDetails, [key]: v, ...(key === 'marka' ? { model: '' } : {})}})}
              placeholder="Izaberi"
              label={config.label as string}
              optional={subcategory === 'prikolice' && (key === 'marka' || key === 'model')}
            />
          </div>
        );
      }

      return (
        <div key={key} className="space-y-2">
          <label className="text-[10px] font-black uppercase text-[#9CA3AF]">{config.label}{(subcategory === 'prikolice' && (key === 'marka' || key === 'model')) ? ' (opciono)' : ''}</label>
          <select
            value={String(currentVal || '')}
            onChange={e => setFormData({...formData, vehicleDetails: {...formData.vehicleDetails, [key]: e.target.value, ...(key === 'marka' ? { model: '' } : {})}})}
            className="w-full h-12 bg-[#0B1220] border border-white/5 rounded-xl px-4 text-xs text-white outline-none focus:border-[#4F6DFF]"
          >
            <option value="">Izaberi</option>
            {options.map((o: string) => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
      );
    }

    if (config.type === 'number') {
      const numMin = typeof config.min === 'number' ? config.min : undefined;
      const numMax = typeof config.max === 'number' ? config.max : undefined;
      return (
        <div key={key} className="space-y-2">
          <label className="text-[10px] font-black uppercase text-[#9CA3AF]">{config.label}</label>
          <input
            type="number"
            min={numMin}
            max={numMax}
            value={String(currentVal || '')}
            onChange={e => setFormData({...formData, vehicleDetails: {...formData.vehicleDetails, [key]: e.target.value}})}
            className="w-full h-12 bg-[#0B1220] border border-white/5 rounded-xl px-4 text-xs text-white outline-none focus:border-[#4F6DFF]"
          />
        </div>
      );
    }
    return null;
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files).slice(0, 10 - images.length);
      const newImages = newFiles.map((file: any) => ({ file, preview: URL.createObjectURL(file as Blob) }));
      setImages([...images, ...newImages]);
    }
  };

  const removeImage = (index: number) => {
    const newImages = [...images];
    URL.revokeObjectURL(newImages[index].preview);
    newImages.splice(index, 1);
    setImages(newImages);
  };

  const moveImage = (index: number, direction: 'left' | 'right') => {
    const next = direction === 'left' ? index - 1 : index + 1;
    if (next < 0 || next >= images.length) return;
    const newImages = [...images];
    [newImages[index], newImages[next]] = [newImages[next], newImages[index]];
    setImages(newImages);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');
    if (!user) { navigate(`/prijava?returnTo=${encodeURIComponent(location.pathname || '/objavi')}`); return; }

    const naslov = (formData.naslov || '').trim();
    const opis = (formData.opis || '').trim();
    const cijenaRaw = parseFloat(String(formData.cijena).replace(',', '.'));
    const cijena = Number.isNaN(cijenaRaw) ? NaN : Math.round(cijenaRaw * 100) / 100;
    const telefon = (formData.telefon || '').trim();

    if (naslov.length < 3) { setSubmitError('Naslov mora imati najmanje 3 znaka.'); return; }
    if (opis.length < 10) { setSubmitError('Opis mora imati najmanje 10 znakova.'); return; }
    if (cijena === undefined || cijena === null || Number.isNaN(cijena) || cijena < 0) { setSubmitError('Unesite ispravnu cijenu (0 ili više).'); return; }
    if (!formData.lokacija) { setSubmitError('Odaberite lokaciju.'); return; }
    const imePrezime = (formData.imePrezime || '').trim();
    if (imePrezime.length < 2) { setSubmitError('Unesite ime i prezime za kontakt.'); return; }
    if (!telefon) { setSubmitError('Unesite kontakt telefon.'); return; }
    if (category === 'nekretnine' && !formData.realEstateDetails?.tipNekretnine) {
      setSubmitError('Za nekretnine odaberite tip nekretnine.'); return;
    }
    if (category === MOTORNA_VOZILA_ID && !vehicleSubcategory) {
      setSubmitError('Odaberite tip vozila (npr. Automobili, Motocikli...).'); return;
    }

    const red = formData.realEstateDetails;
    const hasNekretninaData = red?.tipNekretnine || red?.kvadratura || red?.tipPonude || (Array.isArray(red?.amenities) && red.amenities.length > 0) || (red?.floorplanUrl && String(red.floorplanUrl).trim()) || (red?.virtualTourUrl && String(red.virtualTourUrl).trim());
    const realEstateDetails = category === 'nekretnine' && hasNekretninaData ? {
      tipNekretnine: red?.tipNekretnine || undefined,
      tipPonude: (red?.tipPonude || 'prodaja') as 'prodaja' | 'izdavanje',
      kvadratura: red?.kvadratura ? Number(red.kvadratura) : undefined,
      brojSoba: red?.brojSoba || undefined,
      sprat: red?.sprat || undefined,
      amenities: Array.isArray(red?.amenities) && red.amenities.length > 0 ? red.amenities : undefined,
      floorplanUrl: (red?.floorplanUrl && String(red.floorplanUrl).trim()) || undefined,
      virtualTourUrl: (red?.virtualTourUrl && String(red.virtualTourUrl).trim()) || undefined,
    } : undefined;
    let baseDetails: Record<string, unknown> | undefined = realEstateDetails as Record<string, unknown> | undefined;
    if (category === 'auto_dijelovi') {
      baseDetails = { stanje: formData.details?.stanje || 'Polovno' };
      if (formData.details?.tipDijela) baseDetails.tipDijela = formData.details.tipDijela;
    } else if (category === 'usluge' && formData.details?.nacinNaplate) {
      baseDetails = { nacinNaplate: formData.details.nacinNaplate };
    } else if (category === 'bijela_tehnika') {
      baseDetails = { stanje: formData.details?.stanje || 'Polovno' };
      if (formData.details?.tipBijela) baseDetails.tip = formData.details.tipBijela;
      if (formData.details?.energetskaKlasa) baseDetails.energetskaKlasa = formData.details.energetskaKlasa;
    } else if (category === 'namjestaj') {
      baseDetails = { stanje: formData.details?.stanje || 'Polovno' };
      if (formData.details?.tipNamjestaj) baseDetails.tip = formData.details.tipNamjestaj;
      if (formData.details?.materijal) baseDetails.materijal = formData.details.materijal;
    } else if (category === 'za_djecu') {
      baseDetails = { stanje: formData.details?.stanje || 'Polovno' };
      if (formData.details?.tipZaDjecu) baseDetails.tip = formData.details.tipZaDjecu;
      if (formData.details?.uzrast) baseDetails.uzrast = formData.details.uzrast;
      if (formData.details?.velicina) baseDetails.velicina = formData.details.velicina;
    } else if (category === 'poljoprivreda' && formData.details?.tipPoljoprivreda) {
      baseDetails = { tip: formData.details.tipPoljoprivreda };
    } else if (category === 'tehnika') {
      baseDetails = { stanje: formData.details?.stanje || 'Polovno' };
      if (formData.details?.tipTehnika) baseDetails.tip = formData.details.tipTehnika;
    } else if (category === 'kucni_ljubimci' && formData.details?.vrstaKucni) {
      baseDetails = { vrsta: formData.details.vrstaKucni };
    } else if (category === 'moda') {
      baseDetails = { stanje: formData.details?.stanje || 'Polovno' };
      if (formData.details?.tipModa) baseDetails.tip = formData.details.tipModa;
      if (formData.details?.velicinaModa) baseDetails.velicina = formData.details.velicinaModa;
    } else if (category === 'poslovi' && formData.details?.tipPoslovi) {
      baseDetails = { tip: formData.details.tipPoslovi };
    } else if (category === 'sport') {
      baseDetails = { stanje: formData.details?.stanje || 'Polovno' };
      if (formData.details?.tipSport) baseDetails.tip = formData.details.tipSport;
    } else if (category === 'gradjevina') {
      baseDetails = { stanje: formData.details?.stanje || 'Polovno' };
      if (formData.details?.tipGradjevina) baseDetails.tip = formData.details.tipGradjevina;
    } else if (category === 'pokloni_cvijece') {
      baseDetails = {};
      if (formData.details?.tipPokloni) baseDetails.tip = formData.details.tipPokloni;
      if (formData.details?.povodPokloni) baseDetails.povod = formData.details.povodPokloni;
    }
    const contactDetails: Record<string, unknown> = { ...(baseDetails || {}) };
    contactDetails.imeProdavca = imePrezime;
    contactDetails.telefonProdavca = telefon;
    if ((formData.viber || '').trim()) contactDetails.viber = (formData.viber || '').trim();
    if ((formData.whatsapp || '').trim()) contactDetails.whatsapp = (formData.whatsapp || '').trim();
    const details = Object.keys(contactDetails).length ? contactDetails : baseDetails;

    const imagePayloads: { url: string; thumbUrl?: string; width?: number; height?: number }[] = [];
    if (images.length > 0) {
      setSubmitError('');
      setSubmitLoading(true);
      try {
        for (let i = 0; i < images.length; i++) {
          const fileToUpload = await resizeImageForUpload(images[i].file);
          const fd = new FormData();
          fd.append('image', fileToUpload, fileToUpload instanceof File ? fileToUpload.name : `image-${i}.jpg`);
          const upRes = await fetch(`${API_BASE}/ads/upload`, {
            method: 'POST',
            headers: getAuthHeaders() as HeadersInit,
            body: fd,
          });
          const upData = await upRes.json().catch(() => ({}));
          if (!upRes.ok) {
            setSubmitError(upData?.error || `Greška pri uploadu slike ${i + 1}. Pokušajte ponovo.`);
            setSubmitLoading(false);
            return;
          }
          if (upData?.url) {
            imagePayloads.push({
              url: upData.url,
              ...(upData.thumbUrl && { thumbUrl: upData.thumbUrl }),
              ...(typeof upData.width === 'number' && { width: upData.width }),
              ...(typeof upData.height === 'number' && { height: upData.height }),
            });
          }
        }
      } catch {
        setSubmitError('Greška u mreži pri uploadu slika.');
        setSubmitLoading(false);
        return;
      }
    }

    const tipOglasa = formData.tipOglasa === 'nudim' ? 'prodajem' : (formData.tipOglasa === 'trazim' ? 'trazim' : 'prodajem');
    const isMotornaVozila = category === MOTORNA_VOZILA_ID;
    const vDetails = formData.vehicleDetails || {};
    const body: Record<string, unknown> = {
      naslov,
      opis,
      cijena: Number(cijena),
      kategorija: category,
      lokacija: formData.lokacija,
      ...(latLng && { lat: latLng.lat, lng: latLng.lng }),
      potkategorija: isMotornaVozila && vehicleSubcategory ? vehicleSubcategory : undefined,
      tipOglasa,
      details: details || undefined,
      images: imagePayloads.length > 0 ? imagePayloads : undefined,
    };
    if (isMotornaVozila && vehicleSubcategory && Object.keys(vDetails).length > 0) {
      const specs: Record<string, unknown> = {};
      Object.entries(vDetails).forEach(([k, v]) => { if (v !== '' && v !== undefined && v !== null) specs[k] = v; });
      if (Object.keys(specs).length > 0) body.vehicleSpecs = specs;
      if (vDetails.marka) body.make = vDetails.marka;
      if (vDetails.model) body.model = vDetails.model;
    }

    setDuplicateSlug(null);
    setSubmitLoading(true);
    setSubmitError('');
    try {
      const res = await fetch(`${API_BASE}/ads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify(body as Record<string, unknown>),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 401) {
          setSubmitError('Sesija je istekla. Prijavite se ponovo.');
          return;
        }
        if (res.status === 409 && data?.code === 'DUPLICATE_AD') {
          setSubmitError(data?.message || 'Izgleda da već imate isti oglas. Koristite Uredi ili Produži.');
          setDuplicateSlug(data?.existingSlug ?? null);
          return;
        }
        const msg = Array.isArray(data?.error) ? data.error.map((e: { message?: string }) => e?.message || e).join(' ') : (data?.error || 'Nije moguće objaviti oglas. Pokušajte ponovo.');
        setSubmitError(typeof msg === 'string' ? msg : 'Greška pri objavi.');
        return;
      }
      try {
        const mapped = mapApiAdToAd(data);
        onAddAd(mapped);
        onPublishSuccess?.();
        navigate('/moji-oglasi?pending=1');
      } catch (mapErr) {
        console.error('[AddAd] mapApiAdToAd', mapErr);
        setSubmitError('Oglas je sačuvan, ali prikaz može biti nepotpun. Provjerite Moji oglasi.');
        navigate('/moji-oglasi?pending=1');
      }
    } catch (err) {
      console.error('[AddAd] submit error', err);
      setSubmitError('Greška u mreži. Provjerite internet i pokušajte ponovo. Ako problem traje, backend može biti privremeno nedostupan.');
    } finally {
      setSubmitLoading(false);
    }
  };

  const vehicleFieldsConfig = useMemo(() => {
    if (category !== MOTORNA_VOZILA_ID || !vehicleSubcategory) return null;
    const cfg = (VEHICLE_FIELDS_CONFIG as Record<string, Record<string, unknown>>)[vehicleSubcategory];
    return cfg ?? null;
  }, [category, vehicleSubcategory]);

  useEffect(() => {
    if (submitError && submitErrorRef.current) {
      submitErrorRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [submitError]);

  if (step === 1 || !category) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 animate-slide-up">
        <h1 className="text-3xl font-black uppercase tracking-widest mb-2 text-center" style={{ color: 'var(--text-primary)' }}>Odaberite kategoriju</h1>
        <p className="text-sm text-center mb-10 font-medium" style={{ color: 'var(--text-secondary)' }}>Prodajete ili tražite – prvo odaberite oblast</p>
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {CATEGORIES.map(cat => (
            <button key={cat.id} onClick={() => { setCategory(cat.id); setVehicleSubcategory(''); setFormData((prev: any) => ({ ...prev, vehicleDetails: {} })); setStep(2); }} className="h-28 bg-[#131C2B] border border-white/10 rounded-xl flex flex-col items-center justify-center group hover:border-[#4F6DFF] transition-all" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}>
              <span className="font-bold uppercase text-sm tracking-wide text-center px-3" style={{ color: 'var(--text-primary)' }}>{cat.name}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 animate-slide-up">
      <div className="flex items-center gap-4 mb-10">
        <button onClick={() => setStep(1)} className="p-3 bg-[#131C2B] rounded-full text-[#9CA3AF] hover:text-white transition-colors"><ArrowLeft className="w-5 h-5" /></button>
        <h1 className="text-2xl font-black uppercase text-white tracking-widest">Nova Objava: {category ? (CATEGORIES.find(c => c.id === category)?.name || 'Nepoznata kategorija') : 'Odaberite kategoriju'}</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {submitError && (
          <div ref={submitErrorRef} className="p-4 rounded-2xl border border-red-500/50 bg-red-500/10 text-red-200 text-sm space-y-3" role="alert">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <span>{submitError}</span>
            </div>
            {duplicateSlug && (
              <div className="flex flex-wrap gap-2 pl-8">
                <Link to={`/oglas/${duplicateSlug}`} target="_self" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-colors">
                  Otvori postojeći oglas
                </Link>
                <Link to="/moji-oglasi" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-colors">
                  Moji oglasi
                </Link>
              </div>
            )}
          </div>
        )}
        <section className="bg-[#131C2B] border border-white/5 p-8 rounded-xl shadow-2xl">
          <h3 className="text-xs font-black uppercase text-[#9CA3AF] tracking-[0.2em] mb-2">Slike ({images.length}/10)</h3>
          <p className="text-[10px] text-[#9CA3AF] mb-6">Prva slika je glavna. Maks. 5 MB po slici (JPEG, PNG, WebP).</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
            {images.map((img, i) => (
              <div key={i} className="aspect-square relative rounded-2xl overflow-hidden border border-white/10 group" style={i === 0 ? { borderColor: 'var(--accent)', borderWidth: 2 } : undefined}>
                <img src={getProxiedImageUrl(img.preview)} className="w-full h-full object-cover" alt="" width={400} height={400} decoding="async" fetchPriority="low" loading="lazy" />
                {i === 0 && <span className="absolute bottom-0 left-0 right-0 bg-black/70 text-[9px] font-black uppercase text-center py-1 text-white">Glavna</span>}
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button type="button" onClick={() => moveImage(i, 'left')} disabled={i === 0} className="p-1.5 bg-white/90 text-black rounded-lg disabled:opacity-30" title="Pomjeri lijevo"><ChevronLeft className="w-3 h-3" /></button>
                  <button type="button" onClick={() => moveImage(i, 'right')} disabled={i === images.length - 1} className="p-1.5 bg-white/90 text-black rounded-lg disabled:opacity-30" title="Pomjeri desno"><ChevronRight className="w-3 h-3" /></button>
                  <button type="button" onClick={() => removeImage(i)} className="p-1.5 bg-red-500 text-white rounded-lg"><X className="w-3 h-3" /></button>
                </div>
              </div>
            ))}
            {images.length < 10 && (
              <button type="button" onClick={() => fileInputRef.current?.click()} className="aspect-square bg-[#0B1220] border border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center gap-2 text-[#9CA3AF] hover:border-[#4F6DFF] hover:text-white transition-all">
                <Plus className="w-6 h-6" />
                <span className="text-[9px] font-black uppercase tracking-widest">Dodaj</span>
              </button>
            )}
          </div>
          <input type="file" ref={fileInputRef} className="hidden" accept="image/jpeg,image/png,image/webp" multiple onChange={handleImageChange} />
        </section>

        <section className="bg-[#131C2B] border border-white/5 p-8 rounded-xl shadow-2xl space-y-6">
          <h3 className="text-xs font-black uppercase text-[#9CA3AF] tracking-[0.2em]">Osnovne informacije</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2 space-y-2">
              <label className="text-[10px] font-black uppercase text-[#9CA3AF]">Tip oglasa *</label>
              <select value={formData.tipOglasa} onChange={e => setFormData({...formData, tipOglasa: e.target.value})} className="w-full h-14 bg-[#0B1220] border border-white/5 rounded-2xl px-6 text-sm text-white outline-none focus:border-[#4F6DFF]">
                {(category === 'usluge' ? TIP_OGLASA_USLUGE : TIP_OGLASA_OPTIONS).map(opt => (
                  <option key={opt.id} value={opt.id}>{opt.name}</option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2 space-y-2">
              <label className="text-[10px] font-black uppercase text-[#9CA3AF]">Naslov Oglasa *</label>
              <input required type="text" placeholder={category === 'usluge' ? 'npr. Molerske usluge, Servis klima uređaja' : category === MOTORNA_VOZILA_ID ? 'npr. Audi A4 2.0 TDI' : category === 'nekretnine' ? 'npr. Dvosoban stan Centar' : category === 'tehnika' ? 'npr. iPhone 15 Pro, MacBook Air' : 'npr. Naslov oglasa'} value={formData.naslov} onChange={e => setFormData({...formData, naslov: e.target.value})} className="w-full h-14 bg-[#0B1220] border border-white/5 rounded-2xl px-6 text-sm text-white outline-none focus:border-[#4F6DFF]" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-[#9CA3AF]">Cijena (€) *</label>
              <input required type="number" min={0} step="0.01" value={formData.cijena} onChange={e => setFormData({...formData, cijena: e.target.value})} placeholder="npr. 1500" className="w-full h-14 bg-[#0B1220] border border-white/5 rounded-2xl px-6 text-sm text-white outline-none focus:border-[#4F6DFF]" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-[#9CA3AF]">Lokacija</label>
              <select value={formData.lokacija} onChange={e => { setFormData({...formData, lokacija: e.target.value}); setLatLng(null); }} className="w-full h-14 bg-[#0B1220] border border-white/5 rounded-2xl px-6 text-sm text-white outline-none focus:border-[#4F6DFF]">
                {LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
          </div>
          <div className="md:col-span-2">
            <React.Suspense fallback={<div className="h-[200px] rounded-xl bg-[#0B1220] animate-pulse" />}>
              <MapLocationPicker lokacija={formData.lokacija} value={latLng} onChange={setLatLng} height={220} />
            </React.Suspense>
          </div>
          <div className="space-y-2 md:col-span-2">
            <label className="text-[10px] font-black uppercase text-[#9CA3AF]">Opis</label>
            <textarea placeholder="Opis oglasa..." rows={5} value={formData.opis} onChange={e => setFormData({...formData, opis: e.target.value})} className="w-full bg-[#0B1220] border border-white/5 rounded-2xl p-6 text-sm text-white outline-none focus:border-[#4F6DFF]" />
          </div>
        </section>

        {category === MOTORNA_VOZILA_ID && (
          <section className="bg-[#131C2B] border border-white/5 p-8 rounded-xl shadow-2xl space-y-6">
            <h3 className="text-xs font-black uppercase text-[#9CA3AF] tracking-[0.2em]">Tip vozila</h3>
            <div className="flex flex-wrap gap-2">
              {MOTORNA_VOZILA_SUBCATEGORIES.map(sub => (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => {
                    setVehicleSubcategory(sub.id);
                    setFormData((prev: any) => ({ ...prev, vehicleDetails: {} }));
                  }}
                  className="px-4 py-2 rounded-xl font-bold text-[10px] uppercase border transition-all"
                  style={vehicleSubcategory === sub.id ? { background: 'var(--accent)', borderColor: 'transparent', color: 'white' } : { backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-subtle)', color: 'var(--text-secondary)' }}
                >
                  {sub.name}
                </button>
              ))}
            </div>
          </section>
        )}

        {vehicleFieldsConfig && category === MOTORNA_VOZILA_ID && vehicleSubcategory && (
          <section className="bg-[#131C2B] border border-white/5 p-8 rounded-xl shadow-2xl space-y-6">
            <h3 className="text-xs font-black uppercase text-[#9CA3AF] tracking-[0.2em]">Specifikacije vozila</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {Object.entries(vehicleFieldsConfig).map(([key, config]) => renderFormField(key, config as Record<string, unknown>, vehicleSubcategory, formData.vehicleDetails || {}))}
            </div>
          </section>
        )}

        {category === 'nekretnine' && (
          <section className="bg-[#131C2B] border border-white/5 p-8 rounded-xl shadow-2xl space-y-6">
            <h3 className="text-xs font-black uppercase text-[#9CA3AF] tracking-[0.2em]">Nekretnina</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-[#9CA3AF]">Tip nekretnine *</label>
                <select value={formData.realEstateDetails?.tipNekretnine || ''} onChange={e => setFormData({...formData, realEstateDetails: {...formData.realEstateDetails, tipNekretnine: e.target.value, brojSoba: undefined, sprat: undefined}})} className="w-full h-14 bg-[#0B1220] border border-white/5 rounded-2xl px-6 text-sm text-white outline-none focus:border-[#4F6DFF]" required>
                  <option value="">— Odaberite —</option>
                  {NEKRETNINE_TIP.map(t => (<option key={t.id} value={t.id}>{t.name}</option>))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-[#9CA3AF]">Tip ponude</label>
                <select value={formData.realEstateDetails?.tipPonude} onChange={e => setFormData({...formData, realEstateDetails: {...formData.realEstateDetails, tipPonude: e.target.value}})} className="w-full h-14 bg-[#0B1220] border border-white/5 rounded-2xl px-6 text-sm text-white outline-none focus:border-[#4F6DFF]">
                  {NEKRETNINE_TIP_PONUDE.map(opt => (<option key={opt.id} value={opt.id}>{opt.name}</option>))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-[#9CA3AF]">{formData.realEstateDetails?.tipNekretnine === 'plac' ? 'Površina (m²)' : 'Kvadratura (m²)'}</label>
                <input type="number" min={0} step="any" value={formData.realEstateDetails?.kvadratura || ''} onChange={e => setFormData({...formData, realEstateDetails: {...formData.realEstateDetails, kvadratura: e.target.value}})} className="w-full h-14 bg-[#0B1220] border border-white/5 rounded-2xl px-6 text-sm text-white outline-none focus:border-[#4F6DFF]" placeholder="npr. 65" />
              </div>
              {formData.realEstateDetails?.tipNekretnine && NEKRETNINE_TIP_FIELDS[formData.realEstateDetails.tipNekretnine]?.brojSoba && (
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-[#9CA3AF]">Broj soba</label>
                  <select value={formData.realEstateDetails?.brojSoba || ''} onChange={e => setFormData({...formData, realEstateDetails: {...formData.realEstateDetails, brojSoba: e.target.value}})} className="w-full h-14 bg-[#0B1220] border border-white/5 rounded-2xl px-6 text-sm text-white outline-none focus:border-[#4F6DFF]">
                    <option value="">—</option>
                    {NEKRETNINE_BROJ_SOBA.map(s => (<option key={s} value={s}>{s}</option>))}
                  </select>
                </div>
              )}
              {formData.realEstateDetails?.tipNekretnine && NEKRETNINE_TIP_FIELDS[formData.realEstateDetails.tipNekretnine]?.sprat && (
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-[#9CA3AF]">Spratnost</label>
                  <select value={formData.realEstateDetails?.sprat || ''} onChange={e => setFormData({...formData, realEstateDetails: {...formData.realEstateDetails, sprat: e.target.value}})} className="w-full h-14 bg-[#0B1220] border border-white/5 rounded-2xl px-6 text-sm text-white outline-none focus:border-[#4F6DFF]">
                    <option value="">—</option>
                    {NEKRETNINE_SPRAT.map(s => (<option key={s.id} value={s.id}>{s.name}</option>))}
                  </select>
                </div>
              )}
              <div className="space-y-2 sm:col-span-2">
                <label className="text-[10px] font-black uppercase text-[#9CA3AF]">Sadržaji (opciono)</label>
                <div className="flex flex-wrap gap-2">
                  {NEKRETNINE_AMENITIES.map(a => {
                    const arr = Array.isArray(formData.realEstateDetails?.amenities) ? formData.realEstateDetails.amenities : [];
                    const selected = arr.includes(a.id);
                    return (
                      <button key={a.id} type="button" onClick={() => {
                        const next = selected ? arr.filter((x: string) => x !== a.id) : [...arr, a.id];
                        setFormData({...formData, realEstateDetails: {...formData.realEstateDetails, amenities: next}});
                      }} className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${selected ? 'border-[var(--accent)] bg-[var(--accent)]/20' : ''}`} style={selected ? { color: 'var(--accent)' } : { borderColor: 'rgba(255,255,255,0.2)', color: '#9CA3AF' }}>
                        {a.name}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <label className="text-[10px] font-black uppercase text-[#9CA3AF]">URL tlocrtа (opciono)</label>
                <input type="url" value={formData.realEstateDetails?.floorplanUrl || ''} onChange={e => setFormData({...formData, realEstateDetails: {...formData.realEstateDetails, floorplanUrl: e.target.value}})} className="w-full h-14 bg-[#0B1220] border border-white/5 rounded-2xl px-6 text-sm text-white outline-none focus:border-[#4F6DFF]" placeholder="https://..." />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <label className="text-[10px] font-black uppercase text-[#9CA3AF]">Virtualna tura – URL (Matterport, 360°, opciono)</label>
                <input type="url" value={formData.realEstateDetails?.virtualTourUrl || ''} onChange={e => setFormData({...formData, realEstateDetails: {...formData.realEstateDetails, virtualTourUrl: e.target.value}})} className="w-full h-14 bg-[#0B1220] border border-white/5 rounded-2xl px-6 text-sm text-white outline-none focus:border-[#4F6DFF]" placeholder="https://my.matterport.com/..." />
              </div>
            </div>
          </section>
        )}

        {category === 'auto_dijelovi' && (
          <section className="bg-[#131C2B] border border-white/5 p-8 rounded-xl shadow-2xl space-y-6">
            <h3 className="text-xs font-black uppercase text-[#9CA3AF] tracking-[0.2em]">Auto dijelovi</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-[#9CA3AF]">Tip dijela</label>
                <select value={formData.details?.tipDijela || ''} onChange={e => setFormData({...formData, details: {...formData.details, tipDijela: e.target.value}})} className="w-full h-14 bg-[#0B1220] border border-white/5 rounded-2xl px-6 text-sm text-white outline-none focus:border-[#4F6DFF]">
                  <option value="">—</option>
                  {AUTO_DIJELOVI_TIP.map(t => (<option key={t.id} value={t.id}>{t.name}</option>))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-[#9CA3AF]">Stanje</label>
                <select value={formData.details?.stanje || 'Polovno'} onChange={e => setFormData({...formData, details: {...formData.details, stanje: e.target.value}})} className="w-full h-14 bg-[#0B1220] border border-white/5 rounded-2xl px-6 text-sm text-white outline-none focus:border-[#4F6DFF]">
                  {STANJE_OPTIONS.map(s => (<option key={s} value={s}>{s}</option>))}
                </select>
              </div>
            </div>
          </section>
        )}

        {category === 'usluge' && (
          <section className="bg-[#131C2B] border border-white/5 p-8 rounded-xl shadow-2xl space-y-6">
            <h3 className="text-xs font-black uppercase text-[#9CA3AF] tracking-[0.2em]">Usluge</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-[#9CA3AF]">Način naplate</label>
                <select value={formData.details?.nacinNaplate || ''} onChange={e => setFormData({...formData, details: {...formData.details, nacinNaplate: e.target.value}})} className="w-full h-14 bg-[#0B1220] border border-white/5 rounded-2xl px-6 text-sm text-white outline-none focus:border-[#4F6DFF]">
                  <option value="">—</option>
                  {USLUGE_NACIN_NAPLATE.map(t => (<option key={t.id} value={t.id}>{t.name}</option>))}
                </select>
              </div>
            </div>
          </section>
        )}

        {category === 'bijela_tehnika' && (
          <section className="bg-[#131C2B] border border-white/5 p-8 rounded-xl shadow-2xl space-y-6">
            <h3 className="text-xs font-black uppercase text-[#9CA3AF] tracking-[0.2em]">Bijela tehnika</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-[#9CA3AF]">Tip</label>
                <select value={formData.details?.tipBijela || ''} onChange={e => setFormData({...formData, details: {...formData.details, tipBijela: e.target.value}})} className="w-full h-14 bg-[#0B1220] border border-white/5 rounded-2xl px-6 text-sm text-white outline-none focus:border-[#4F6DFF]">
                  <option value="">—</option>
                  {BIJELA_TEHNIKA_TIP.map(t => (<option key={t.id} value={t.id}>{t.name}</option>))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-[#9CA3AF]">Energetska klasa</label>
                <select value={formData.details?.energetskaKlasa || ''} onChange={e => setFormData({...formData, details: {...formData.details, energetskaKlasa: e.target.value}})} className="w-full h-14 bg-[#0B1220] border border-white/5 rounded-2xl px-6 text-sm text-white outline-none focus:border-[#4F6DFF]">
                  <option value="">—</option>
                  {BIJELA_TEHNIKA_ENERGIJA.map(klasa => (<option key={klasa} value={klasa}>{klasa}</option>))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-[#9CA3AF]">Stanje</label>
                <select value={formData.details?.stanje || 'Polovno'} onChange={e => setFormData({...formData, details: {...formData.details, stanje: e.target.value}})} className="w-full h-14 bg-[#0B1220] border border-white/5 rounded-2xl px-6 text-sm text-white outline-none focus:border-[#4F6DFF]">
                  {STANJE_OPTIONS.map(s => (<option key={s} value={s}>{s}</option>))}
                </select>
              </div>
            </div>
          </section>
        )}

        {category === 'namjestaj' && (
          <section className="bg-[#131C2B] border border-white/5 p-8 rounded-xl shadow-2xl space-y-6">
            <h3 className="text-xs font-black uppercase text-[#9CA3AF] tracking-[0.2em]">Namještaj</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-[#9CA3AF]">Tip</label>
                <select value={formData.details?.tipNamjestaj || ''} onChange={e => setFormData({...formData, details: {...formData.details, tipNamjestaj: e.target.value}})} className="w-full h-14 bg-[#0B1220] border border-white/5 rounded-2xl px-6 text-sm text-white outline-none focus:border-[#4F6DFF]">
                  <option value="">—</option>
                  {NAMJESTAJ_TIP.map(t => (<option key={t.id} value={t.id}>{t.name}</option>))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-[#9CA3AF]">Materijal</label>
                <select value={formData.details?.materijal || ''} onChange={e => setFormData({...formData, details: {...formData.details, materijal: e.target.value}})} className="w-full h-14 bg-[#0B1220] border border-white/5 rounded-2xl px-6 text-sm text-white outline-none focus:border-[#4F6DFF]">
                  <option value="">—</option>
                  {NAMJESTAJ_MATERIJAL.map(m => (<option key={m} value={m}>{m}</option>))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-[#9CA3AF]">Stanje</label>
                <select value={formData.details?.stanje || 'Polovno'} onChange={e => setFormData({...formData, details: {...formData.details, stanje: e.target.value}})} className="w-full h-14 bg-[#0B1220] border border-white/5 rounded-2xl px-6 text-sm text-white outline-none focus:border-[#4F6DFF]">
                  {STANJE_OPTIONS.map(s => (<option key={s} value={s}>{s}</option>))}
                </select>
              </div>
            </div>
          </section>
        )}

        {category === 'za_djecu' && (
          <section className="bg-[#131C2B] border border-white/5 p-8 rounded-xl shadow-2xl space-y-6">
            <h3 className="text-xs font-black uppercase text-[#9CA3AF] tracking-[0.2em]">Za djecu</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-[#9CA3AF]">Tip</label>
                <select value={formData.details?.tipZaDjecu || ''} onChange={e => setFormData({...formData, details: {...formData.details, tipZaDjecu: e.target.value}})} className="w-full h-14 bg-[#0B1220] border border-white/5 rounded-2xl px-6 text-sm text-white outline-none focus:border-[#4F6DFF]">
                  <option value="">—</option>
                  {ZA_DJECU_TIP.map(t => (<option key={t.id} value={t.id}>{t.name}</option>))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-[#9CA3AF]">Uzrast</label>
                <select value={formData.details?.uzrast || ''} onChange={e => setFormData({...formData, details: {...formData.details, uzrast: e.target.value}})} className="w-full h-14 bg-[#0B1220] border border-white/5 rounded-2xl px-6 text-sm text-white outline-none focus:border-[#4F6DFF]">
                  <option value="">—</option>
                  {ZA_DJECU_UZRAST.map(u => (<option key={u.id} value={u.id}>{u.name}</option>))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-[#9CA3AF]">Veličina (opciono)</label>
                <input type="text" value={formData.details?.velicina || ''} onChange={e => setFormData({...formData, details: {...formData.details, velicina: e.target.value}})} placeholder="npr. 86, S, M" className="w-full h-14 bg-[#0B1220] border border-white/5 rounded-2xl px-6 text-sm text-white outline-none focus:border-[#4F6DFF]" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-[#9CA3AF]">Stanje</label>
                <select value={formData.details?.stanje || 'Polovno'} onChange={e => setFormData({...formData, details: {...formData.details, stanje: e.target.value}})} className="w-full h-14 bg-[#0B1220] border border-white/5 rounded-2xl px-6 text-sm text-white outline-none focus:border-[#4F6DFF]">
                  {STANJE_OPTIONS.map(s => (<option key={s} value={s}>{s}</option>))}
                </select>
              </div>
            </div>
          </section>
        )}

        {category === 'poljoprivreda' && (
          <section className="bg-[#131C2B] border border-white/5 p-8 rounded-xl shadow-2xl space-y-6">
            <h3 className="text-xs font-black uppercase text-[#9CA3AF] tracking-[0.2em]">Poljoprivreda</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-[#9CA3AF]">Tip</label>
                <select value={formData.details?.tipPoljoprivreda || ''} onChange={e => setFormData({...formData, details: {...formData.details, tipPoljoprivreda: e.target.value}})} className="w-full h-14 bg-[#0B1220] border border-white/5 rounded-2xl px-6 text-sm text-white outline-none focus:border-[#4F6DFF]">
                  <option value="">—</option>
                  {POLJOPRIVREDA_TIP.map(t => (<option key={t.id} value={t.id}>{t.name}</option>))}
                </select>
              </div>
            </div>
          </section>
        )}

        {category === 'tehnika' && (
          <section className="bg-[#131C2B] border border-white/5 p-8 rounded-xl shadow-2xl space-y-6">
            <h3 className="text-xs font-black uppercase text-[#9CA3AF] tracking-[0.2em]">Tehnika</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-[#9CA3AF]">Tip</label>
                <select value={formData.details?.tipTehnika || ''} onChange={e => setFormData({...formData, details: {...formData.details, tipTehnika: e.target.value}})} className="w-full h-14 bg-[#0B1220] border border-white/5 rounded-2xl px-6 text-sm text-white outline-none focus:border-[#4F6DFF]">
                  <option value="">—</option>
                  {TEHNIKA_TIP.map(t => (<option key={t.id} value={t.id}>{t.name}</option>))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-[#9CA3AF]">Stanje</label>
                <select value={formData.details?.stanje || 'Polovno'} onChange={e => setFormData({...formData, details: {...formData.details, stanje: e.target.value}})} className="w-full h-14 bg-[#0B1220] border border-white/5 rounded-2xl px-6 text-sm text-white outline-none focus:border-[#4F6DFF]">
                  {STANJE_OPTIONS.map(s => (<option key={s} value={s}>{s}</option>))}
                </select>
              </div>
            </div>
          </section>
        )}

        {category === 'kucni_ljubimci' && (
          <section className="bg-[#131C2B] border border-white/5 p-8 rounded-xl shadow-2xl space-y-6">
            <h3 className="text-xs font-black uppercase text-[#9CA3AF] tracking-[0.2em]">Kućni ljubimci</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-[#9CA3AF]">Vrsta</label>
                <select value={formData.details?.vrstaKucni || ''} onChange={e => setFormData({...formData, details: {...formData.details, vrstaKucni: e.target.value}})} className="w-full h-14 bg-[#0B1220] border border-white/5 rounded-2xl px-6 text-sm text-white outline-none focus:border-[#4F6DFF]">
                  <option value="">—</option>
                  {KUCNI_LJUBIMCI_VRSTA.map(t => (<option key={t.id} value={t.id}>{t.name}</option>))}
                </select>
              </div>
            </div>
          </section>
        )}

        {category === 'moda' && (
          <section className="bg-[#131C2B] border border-white/5 p-8 rounded-xl shadow-2xl space-y-6">
            <h3 className="text-xs font-black uppercase text-[#9CA3AF] tracking-[0.2em]">Moda</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-[#9CA3AF]">Tip</label>
                <select value={formData.details?.tipModa || ''} onChange={e => setFormData({...formData, details: {...formData.details, tipModa: e.target.value}})} className="w-full h-14 bg-[#0B1220] border border-white/5 rounded-2xl px-6 text-sm text-white outline-none focus:border-[#4F6DFF]">
                  <option value="">—</option>
                  {MODA_TIP.map(t => (<option key={t.id} value={t.id}>{t.name}</option>))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-[#9CA3AF]">Veličina</label>
                <select value={formData.details?.velicinaModa || ''} onChange={e => setFormData({...formData, details: {...formData.details, velicinaModa: e.target.value}})} className="w-full h-14 bg-[#0B1220] border border-white/5 rounded-2xl px-6 text-sm text-white outline-none focus:border-[#4F6DFF]">
                  <option value="">—</option>
                  {MODA_VELICINE.map(v => (<option key={v} value={v}>{v}</option>))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-[#9CA3AF]">Stanje</label>
                <select value={formData.details?.stanje || 'Polovno'} onChange={e => setFormData({...formData, details: {...formData.details, stanje: e.target.value}})} className="w-full h-14 bg-[#0B1220] border border-white/5 rounded-2xl px-6 text-sm text-white outline-none focus:border-[#4F6DFF]">
                  {STANJE_OPTIONS.map(s => (<option key={s} value={s}>{s}</option>))}
                </select>
              </div>
            </div>
          </section>
        )}

        {category === 'poslovi' && (
          <section className="bg-[#131C2B] border border-white/5 p-8 rounded-xl shadow-2xl space-y-6">
            <h3 className="text-xs font-black uppercase text-[#9CA3AF] tracking-[0.2em]">Poslovi</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-[#9CA3AF]">Tip</label>
                <select value={formData.details?.tipPoslovi || ''} onChange={e => setFormData({...formData, details: {...formData.details, tipPoslovi: e.target.value}})} className="w-full h-14 bg-[#0B1220] border border-white/5 rounded-2xl px-6 text-sm text-white outline-none focus:border-[#4F6DFF]">
                  <option value="">—</option>
                  {POSLOVI_TIP.map(t => (<option key={t.id} value={t.id}>{t.name}</option>))}
                </select>
              </div>
            </div>
          </section>
        )}

        {category === 'sport' && (
          <section className="bg-[#131C2B] border border-white/5 p-8 rounded-xl shadow-2xl space-y-6">
            <h3 className="text-xs font-black uppercase text-[#9CA3AF] tracking-[0.2em]">Sport i rekreacija</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-[#9CA3AF]">Tip</label>
                <select value={formData.details?.tipSport || ''} onChange={e => setFormData({...formData, details: {...formData.details, tipSport: e.target.value}})} className="w-full h-14 bg-[#0B1220] border border-white/5 rounded-2xl px-6 text-sm text-white outline-none focus:border-[#4F6DFF]">
                  <option value="">—</option>
                  {SPORT_TIP.map(t => (<option key={t.id} value={t.id}>{t.name}</option>))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-[#9CA3AF]">Stanje</label>
                <select value={formData.details?.stanje || 'Polovno'} onChange={e => setFormData({...formData, details: {...formData.details, stanje: e.target.value}})} className="w-full h-14 bg-[#0B1220] border border-white/5 rounded-2xl px-6 text-sm text-white outline-none focus:border-[#4F6DFF]">
                  {STANJE_OPTIONS.map(s => (<option key={s} value={s}>{s}</option>))}
                </select>
              </div>
            </div>
          </section>
        )}

        {category === 'gradjevina' && (
          <section className="bg-[#131C2B] border border-white/5 p-8 rounded-xl shadow-2xl space-y-6">
            <h3 className="text-xs font-black uppercase text-[#9CA3AF] tracking-[0.2em]">Građevina i alati</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-[#9CA3AF]">Tip</label>
                <select value={formData.details?.tipGradjevina || ''} onChange={e => setFormData({...formData, details: {...formData.details, tipGradjevina: e.target.value}})} className="w-full h-14 bg-[#0B1220] border border-white/5 rounded-2xl px-6 text-sm text-white outline-none focus:border-[#4F6DFF]">
                  <option value="">—</option>
                  {GRADJEVINA_TIP.map(t => (<option key={t.id} value={t.id}>{t.name}</option>))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-[#9CA3AF]">Stanje</label>
                <select value={formData.details?.stanje || 'Polovno'} onChange={e => setFormData({...formData, details: {...formData.details, stanje: e.target.value}})} className="w-full h-14 bg-[#0B1220] border border-white/5 rounded-2xl px-6 text-sm text-white outline-none focus:border-[#4F6DFF]">
                  {STANJE_OPTIONS.map(s => (<option key={s} value={s}>{s}</option>))}
                </select>
              </div>
            </div>
          </section>
        )}

        {category === 'pokloni_cvijece' && (
          <section className="bg-[#131C2B] border border-white/5 p-8 rounded-xl shadow-2xl space-y-6">
            <h3 className="text-xs font-black uppercase text-[#9CA3AF] tracking-[0.2em]">Pokloni i cvijeće</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-[#9CA3AF]">Tip</label>
                <select value={formData.details?.tipPokloni || ''} onChange={e => setFormData({...formData, details: {...formData.details, tipPokloni: e.target.value}})} className="w-full h-14 bg-[#0B1220] border border-white/5 rounded-2xl px-6 text-sm text-white outline-none focus:border-[#4F6DFF]">
                  <option value="">—</option>
                  {POKLONI_TIP.map(t => (<option key={t.id} value={t.id}>{t.name}</option>))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-[#9CA3AF]">Povod</label>
                <select value={formData.details?.povodPokloni || ''} onChange={e => setFormData({...formData, details: {...formData.details, povodPokloni: e.target.value}})} className="w-full h-14 bg-[#0B1220] border border-white/5 rounded-2xl px-6 text-sm text-white outline-none focus:border-[#4F6DFF]">
                  <option value="">—</option>
                  {POKLONI_POVOD.map(p => (<option key={p.id} value={p.id}>{p.name}</option>))}
                </select>
              </div>
            </div>
          </section>
        )}

        <section className="bg-[#131C2B] border-2 rounded-xl shadow-2xl space-y-4 p-8" style={{ borderColor: 'rgba(79, 109, 255, 0.5)', boxShadow: '0 0 28px rgba(79, 109, 255, 0.2), 0 0 56px rgba(79, 109, 255, 0.1)' }}>
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-black uppercase tracking-[0.2em] flex items-center gap-2" style={{ color: 'var(--accent)' }}><Zap className="w-4 h-4" style={{ color: 'var(--accent)' }} /> Istaknite oglas</h3>
            <span className="px-2.5 py-1 rounded text-[9px] font-black uppercase text-white shadow-lg" style={{ backgroundColor: 'var(--accent)', boxShadow: '0 0 12px rgba(79, 109, 255, 0.5)' }}>PREMIUM</span>
          </div>
          <p className="text-[10px] font-semibold" style={{ color: 'rgba(156, 163, 175, 0.95)' }}>Istaknuti oglasi se prikazuju na vrhu liste. Nakon objave možete u „Moji oglasi” odabrati oglas i platiti promociju.</p>
          <ul className="text-[10px] font-semibold space-y-1 list-disc list-inside" style={{ color: 'rgba(156, 163, 175, 0.95)' }}>
            <li>Veći prikaz u listingu</li>
            <li>Prioritet na vrhu liste</li>
            <li>Više pregleda i interakcija</li>
          </ul>
          <div className="grid grid-cols-3 gap-3 pt-2 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
            {([{ days: 7, price: 10 }, { days: 14, price: 16 }, { days: 30, price: 28 }] as const).map(({ days, price }) => (
              <div key={days} className="text-center py-2 px-2 rounded-xl" style={{ backgroundColor: 'rgba(79, 109, 255, 0.08)' }}>
                <span className="block text-sm font-black text-white">{price} €</span>
                <span className="text-[10px] font-bold uppercase" style={{ color: 'var(--accent)' }}>{days} dana</span>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-[#131C2B] border border-white/5 p-8 rounded-xl shadow-2xl space-y-6">
          <h3 className="text-xs font-black uppercase text-[#9CA3AF] tracking-[0.2em]">Kontakt i Linkovi</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-[#9CA3AF]">Ime i prezime *</label>
              <input required type="text" placeholder="npr. Marko Marković" value={formData.imePrezime} onChange={e => setFormData({...formData, imePrezime: e.target.value})} className="w-full h-14 bg-[#0B1220] border border-white/5 rounded-2xl px-6 text-sm text-white outline-none focus:border-[#4F6DFF]" minLength={2} />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-[#9CA3AF]">Telefon *</label>
              <input required type="tel" value={formData.telefon} onChange={e => setFormData({...formData, telefon: e.target.value})} className="w-full h-14 bg-[#0B1220] border border-white/5 rounded-2xl px-6 text-sm text-white outline-none focus:border-[#4F6DFF]" placeholder="+382 67 123 456" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-[#9CA3AF]">Instagram (@korisnik)</label>
              <input type="text" value={formData.instagram} onChange={e => setFormData({...formData, instagram: e.target.value})} className="w-full h-14 bg-[#0B1220] border border-white/5 rounded-2xl px-6 text-sm text-white outline-none focus:border-[#4F6DFF]" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-[#9CA3AF]">Viber (broj ili link)</label>
              <input type="text" value={formData.viber} onChange={e => setFormData({...formData, viber: e.target.value})} placeholder="+382 67 123 456" className="w-full h-14 bg-[#0B1220] border border-white/5 rounded-2xl px-6 text-sm text-white outline-none focus:border-[#4F6DFF]" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-[#9CA3AF]">WhatsApp (broj)</label>
              <input type="text" value={formData.whatsapp} onChange={e => setFormData({...formData, whatsapp: e.target.value})} placeholder="+382 67 123 456" className="w-full h-14 bg-[#0B1220] border border-white/5 rounded-2xl px-6 text-sm text-white outline-none focus:border-[#4F6DFF]" />
            </div>
          </div>
        </section>

        <button type="submit" disabled={submitLoading} className="w-full h-20 bg-gradient-to-r from-[#4F6DFF] to-[#7C8CFF] text-white rounded-xl font-black uppercase text-xs tracking-widest shadow-xl active:scale-95 transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2">
          {submitLoading ? <><Loader2 className="w-5 h-5 animate-spin" /> Objavljujem...</> : 'Objavi Oglas'}
        </button>
      </form>
    </div>
  );
};

const FEATURED_PACKAGES = [
  { id: '7', days: 7, price: 10 }, { id: '14', days: 14, price: 16 }, { id: '30', days: 30, price: 28 }
];

type EditImageItem = { type: 'url'; url: string } | { type: 'file'; file: File; preview: string };

const EditAd = ({ user, onSaved }: { user: User | null; onSaved?: () => void }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [ad, setAd] = useState<Ad | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitError, setSubmitError] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);
  const [latLng, setLatLng] = useState<{ lat: number; lng: number } | null>(null);
  const [formData, setFormData] = useState<any>({ naslov: '', opis: '', cijena: '', lokacija: 'Podgorica', tipOglasa: 'prodajem', realEstateDetails: {}, details: {} });
  const [images, setImages] = useState<EditImageItem[]>([]);
  const [failedImageUrls, setFailedImageUrls] = useState<Set<string>>(new Set());

  useEffect(() => {
    setFailedImageUrls(new Set());
  }, [id]);

  useEffect(() => {
    if (!user || !id) { setLoading(false); return; }
    setLoading(true);
    fetch(`${API_BASE}/ads/my/${id}`, { headers: getAuthHeaders() })
      .then(res => res.ok ? res.json() : null)
      .then((raw: any) => {
        if (!raw) { setAd(null); return; }
        const mapped = mapApiAdToAd(raw);
        setAd(mapped);
        const d = (mapped.details || {}) as Record<string, unknown>;
        const detailsForForm = {
          stanje: d.stanje || 'Polovno',
          tipDijela: d.tipDijela || '',
          nacinNaplate: d.nacinNaplate || '',
          tipBijela: d.tip || '',
          energetskaKlasa: d.energetskaKlasa || '',
          tipNamjestaj: d.tip || '',
          materijal: d.materijal || '',
          tipZaDjecu: d.tip || '',
          uzrast: d.uzrast || '',
          velicina: d.velicina || '',
          tipPoljoprivreda: d.tip || '',
          tipTehnika: d.tip || '',
          vrstaKucni: d.vrsta || '',
          tipModa: d.tip || '',
          velicinaModa: d.velicina || '',
          tipPoslovi: d.tip || '',
          tipSport: d.tip || '',
          tipGradjevina: d.tip || '',
          tipPokloni: d.tip || '',
          povodPokloni: d.povod || ''
        };
        setFormData({
          naslov: mapped.naslov,
          opis: mapped.opis,
          cijena: String(mapped.cijena),
          lokacija: mapped.lokacija || 'Podgorica',
          tipOglasa: mapped.tipOglasa || 'prodajem',
          realEstateDetails: mapped.realEstateDetails || { tipNekretnine: '', tipPonude: 'prodaja', kvadratura: '', brojSoba: '', sprat: '' },
          details: detailsForForm
        });
        const hasCoords = typeof raw?.lat === 'number' && typeof raw?.lng === 'number' && Number.isFinite(raw.lat) && Number.isFinite(raw.lng);
        setLatLng(hasCoords ? { lat: raw.lat, lng: raw.lng } : null);
        setImages((mapped.slike || []).map((url: string) => ({ type: 'url' as const, url })));
      })
      .catch(() => setAd(null))
      .finally(() => setLoading(false));
  }, [user?.id, id]);

  const handleImageAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const newItems: EditImageItem[] = Array.from(files).slice(0, 10 - images.length).map(file => ({
      type: 'file' as const,
      file,
      preview: URL.createObjectURL(file)
    }));
    setImages(prev => [...prev, ...newItems]);
    e.target.value = '';
  };

  const removeImage = (index: number) => {
    setImages(prev => {
      const next = [...prev];
      if (next[index].type === 'file') URL.revokeObjectURL(next[index].preview);
      next.splice(index, 1);
      return next;
    });
  };

  const getEditImageSrc = (item: EditImageItem): string => {
    if (item.type === 'file') return item.preview;
    if (failedImageUrls.has(item.url)) return '';
    return getDirectImageUrl(item.url);
  };
  const handleEditImageError = (item: EditImageItem) => {
    if (item.type === 'url') setFailedImageUrls(prev => new Set(prev).add(item.url));
  };

  const moveImage = (index: number, dir: 'left' | 'right') => {
    const next = dir === 'left' ? index - 1 : index + 1;
    if (next < 0 || next >= images.length) return;
    setImages(prev => {
      const arr = [...prev];
      [arr[index], arr[next]] = [arr[next], arr[index]];
      return arr;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');
    if (!user || !id || !ad) return;
    const naslov = (formData.naslov || '').trim();
    const opis = (formData.opis || '').trim();
    const cijenaRaw = parseFloat(String(formData.cijena).replace(',', '.'));
    const cijena = Number.isNaN(cijenaRaw) ? NaN : Math.round(cijenaRaw * 100) / 100;
    if (naslov.length < 3) { setSubmitError('Naslov mora imati najmanje 3 znaka.'); return; }
    if (opis.length < 10) { setSubmitError('Opis mora imati najmanje 10 znakova.'); return; }
    if (cijena === undefined || cijena === null || Number.isNaN(cijena) || cijena < 0) { setSubmitError('Unesite ispravnu cijenu (0 ili više).'); return; }

    const imagePayloads: { url: string; thumbUrl?: string; width?: number; height?: number }[] = [];
    for (let i = 0; i < images.length; i++) {
      const item = images[i];
      if (item.type === 'url') {
        imagePayloads.push({ url: item.url });
        continue;
      }
      try {
        const fileToUpload = await resizeImageForUpload(item.file);
        const fd = new FormData();
        fd.append('image', fileToUpload, fileToUpload instanceof File ? fileToUpload.name : `image-${i}.jpg`);
        const upRes = await fetch(`${API_BASE}/ads/upload`, { method: 'POST', headers: getAuthHeaders() as HeadersInit, body: fd });
        const upData = await upRes.json().catch(() => ({}));
        if (!upRes.ok) { setSubmitError(upData?.error || 'Greška pri uploadu slike.'); return; }
        if (upData?.url) {
          imagePayloads.push({
            url: upData.url,
            ...(upData.thumbUrl && { thumbUrl: upData.thumbUrl }),
            ...(typeof upData.width === 'number' && { width: upData.width }),
            ...(typeof upData.height === 'number' && { height: upData.height }),
          });
        }
      } catch {
        setSubmitError('Greška u mreži pri uploadu slika.'); return;
      }
    }

    setSubmitLoading(true);
    try {
      let detailsPayload: Record<string, unknown> | undefined;
      if (ad.kategorija === 'nekretnine' && formData.realEstateDetails && Object.keys(formData.realEstateDetails).length) {
        detailsPayload = formData.realEstateDetails;
      } else if (ad.kategorija === 'auto_dijelovi') {
        detailsPayload = { stanje: formData.details?.stanje || 'Polovno' };
        if (formData.details?.tipDijela) detailsPayload.tipDijela = formData.details.tipDijela;
      } else if (ad.kategorija === 'usluge' && formData.details?.nacinNaplate) {
        detailsPayload = { nacinNaplate: formData.details.nacinNaplate };
      } else if (ad.kategorija === 'bijela_tehnika') {
        detailsPayload = { stanje: formData.details?.stanje || 'Polovno' };
        if (formData.details?.tipBijela) detailsPayload.tip = formData.details.tipBijela;
        if (formData.details?.energetskaKlasa) detailsPayload.energetskaKlasa = formData.details.energetskaKlasa;
      } else if (ad.kategorija === 'namjestaj') {
        detailsPayload = { stanje: formData.details?.stanje || 'Polovno' };
        if (formData.details?.tipNamjestaj) detailsPayload.tip = formData.details.tipNamjestaj;
        if (formData.details?.materijal) detailsPayload.materijal = formData.details.materijal;
      } else if (ad.kategorija === 'za_djecu') {
        detailsPayload = { stanje: formData.details?.stanje || 'Polovno' };
        if (formData.details?.tipZaDjecu) detailsPayload.tip = formData.details.tipZaDjecu;
        if (formData.details?.uzrast) detailsPayload.uzrast = formData.details.uzrast;
        if (formData.details?.velicina) detailsPayload.velicina = formData.details.velicina;
      } else if (ad.kategorija === 'poljoprivreda' && formData.details?.tipPoljoprivreda) {
        detailsPayload = { tip: formData.details.tipPoljoprivreda };
      } else if (ad.kategorija === 'tehnika') {
        detailsPayload = { stanje: formData.details?.stanje || 'Polovno' };
        if (formData.details?.tipTehnika) detailsPayload.tip = formData.details.tipTehnika;
      } else if (ad.kategorija === 'kucni_ljubimci' && formData.details?.vrstaKucni) {
        detailsPayload = { vrsta: formData.details.vrstaKucni };
      } else if (ad.kategorija === 'moda') {
        detailsPayload = { stanje: formData.details?.stanje || 'Polovno' };
        if (formData.details?.tipModa) detailsPayload.tip = formData.details.tipModa;
        if (formData.details?.velicinaModa) detailsPayload.velicina = formData.details.velicinaModa;
      } else if (ad.kategorija === 'poslovi' && formData.details?.tipPoslovi) {
        detailsPayload = { tip: formData.details.tipPoslovi };
      } else if (ad.kategorija === 'sport') {
        detailsPayload = { stanje: formData.details?.stanje || 'Polovno' };
        if (formData.details?.tipSport) detailsPayload.tip = formData.details.tipSport;
      } else if (ad.kategorija === 'gradjevina') {
        detailsPayload = { stanje: formData.details?.stanje || 'Polovno' };
        if (formData.details?.tipGradjevina) detailsPayload.tip = formData.details.tipGradjevina;
      } else if (ad.kategorija === 'pokloni_cvijece') {
        detailsPayload = {};
        if (formData.details?.tipPokloni) detailsPayload.tip = formData.details.tipPokloni;
        if (formData.details?.povodPokloni) detailsPayload.povod = formData.details.povodPokloni;
      }
      const body: Record<string, unknown> = {
        naslov,
        opis,
        cijena: Number(cijena),
        lokacija: formData.lokacija,
        tipOglasa: formData.tipOglasa === 'trazim' ? 'trazim' : 'prodajem',
        details: detailsPayload,
        images: imagePayloads,
      };
      const hadCoords = typeof ad.lat === 'number' && typeof ad.lng === 'number';
      if (latLng) { body.lat = latLng.lat; body.lng = latLng.lng; } else if (hadCoords) { body.lat = null; body.lng = null; }
      const res = await fetch(`${API_BASE}/ads/my/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify(body)
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSubmitError(Array.isArray(data?.error) ? data.error.map((x: any) => x?.message || x).join(' ') : (data?.error || 'Greška pri snimanju.'));
        return;
      }
      onSaved?.();
      const needsReview = data?.status === 'NA_CEKANJU';
      navigate(needsReview ? '/moji-oglasi?pending=1' : '/moji-oglasi');
    } catch {
      setSubmitError('Greška u mreži.');
    } finally {
      setSubmitLoading(false);
    }
  };

  if (loading) return <div className="max-w-4xl mx-auto px-4 py-12"><div className="h-10 w-48 bg-[#131C2B] rounded-xl animate-pulse" /></div>;
  if (!ad) return <div className="max-w-4xl mx-auto px-4 py-12"><p className="text-red-400">Oglas nije pronađen.</p><Link to="/moji-oglasi" className="text-[#4F6DFF]">← Nazad na moje oglase</Link></div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center gap-4 mb-8">
        <button type="button" onClick={() => navigate('/moji-oglasi')} className="p-3 bg-[#131C2B] rounded-full text-[#9CA3AF] hover:text-white"><ArrowLeft className="w-5 h-5" /></button>
        <h1 className="text-2xl font-black uppercase text-white tracking-widest">Uredi oglas</h1>
      </div>
      <form onSubmit={handleSubmit} className="space-y-8">
        {submitError && <div className="p-4 rounded-2xl border border-red-500/50 bg-red-500/10 text-red-200 text-sm">{submitError}</div>}
        <section className="bg-[#131C2B] border border-white/5 p-8 rounded-xl">
          <h3 className="text-xs font-black uppercase text-[#9CA3AF] mb-4">Slike ({images.length}/10)</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
            {images.map((img, i) => {
              const src = getEditImageSrc(img);
              const isFailed = img.type === 'url' && failedImageUrls.has(img.url);
              return (
              <div key={i} className="aspect-square relative rounded-2xl overflow-hidden border border-white/10 group">
                {isFailed || !src ? (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-1 bg-[#0B1220] text-[#9CA3AF]" style={{ minHeight: 120 }}>
                    <span className="text-[10px] font-bold uppercase">Slika {i + 1}</span>
                    <span className="text-[9px] opacity-80">{isFailed ? 'Nije učitana' : ''}</span>
                  </div>
                ) : (
                  <img src={src} alt={`Slika ${i + 1}`} className="w-full h-full object-cover" width={400} height={400} decoding="async" fetchPriority="low" loading="lazy" onError={() => handleEditImageError(img)} />
                )}
                {i === 0 && <span className="absolute bottom-0 left-0 right-0 bg-black/70 text-[9px] font-bold uppercase text-center py-1 text-white">Glavna</span>}
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100">
                  <button type="button" onClick={() => moveImage(i, 'left')} disabled={i === 0} className="p-1.5 bg-white/90 text-black rounded-lg disabled:opacity-30"><ChevronLeft className="w-3 h-3" /></button>
                  <button type="button" onClick={() => moveImage(i, 'right')} disabled={i === images.length - 1} className="p-1.5 bg-white/90 text-black rounded-lg disabled:opacity-30"><ChevronRight className="w-3 h-3" /></button>
                  <button type="button" onClick={() => removeImage(i)} className="p-1.5 bg-red-500 text-white rounded-lg"><X className="w-3 h-3" /></button>
                </div>
              </div>
            );
            })}
            {images.length < 10 && <button type="button" onClick={() => fileInputRef.current?.click()} className="aspect-square bg-[#0B1220] border border-dashed border-white/10 rounded-2xl flex items-center justify-center gap-2 text-[#9CA3AF] hover:border-[#4F6DFF]"><Plus className="w-6 h-6" /><span className="text-[9px] font-black uppercase">Dodaj</span></button>}
          </div>
          <input ref={fileInputRef} type="file" className="hidden" accept="image/jpeg,image/png,image/webp" multiple onChange={handleImageAdd} />
        </section>
        <section className="bg-[#131C2B] border border-white/5 p-8 rounded-xl space-y-6">
          <h3 className="text-xs font-black uppercase text-[#9CA3AF]">Osnovno</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2"><label className="text-[10px] font-black uppercase text-[#9CA3AF]">Naslov *</label><input required value={formData.naslov} onChange={e => setFormData({ ...formData, naslov: e.target.value })} className="w-full h-14 bg-[#0B1220] border border-white/5 rounded-2xl px-6 text-sm text-white mt-2" /></div>
            <div><label className="text-[10px] font-black uppercase text-[#9CA3AF]">Cijena (€) *</label><input required type="number" min={0} step="0.01" value={formData.cijena} onChange={e => setFormData({ ...formData, cijena: e.target.value })} placeholder="npr. 1500" className="w-full h-14 bg-[#0B1220] border border-white/5 rounded-2xl px-6 text-sm text-white mt-2" /></div>
            <div><label className="text-[10px] font-black uppercase text-[#9CA3AF]">Lokacija</label><select value={formData.lokacija} onChange={e => { setFormData({ ...formData, lokacija: e.target.value }); setLatLng(null); }} className="w-full h-14 bg-[#0B1220] border border-white/5 rounded-2xl px-6 text-sm text-white mt-2">{LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}</select></div>
          </div>
          <div>
            <React.Suspense fallback={<div className="h-[200px] rounded-xl bg-[#0B1220] animate-pulse" />}>
              <MapLocationPicker lokacija={formData.lokacija} value={latLng} onChange={setLatLng} height={200} />
            </React.Suspense>
          </div>
          <div><label className="text-[10px] font-black uppercase text-[#9CA3AF]">Opis *</label><textarea required rows={5} value={formData.opis} onChange={e => setFormData({ ...formData, opis: e.target.value })} className="w-full bg-[#0B1220] border border-white/5 rounded-2xl p-6 text-sm text-white mt-2" /></div>
        </section>
        {ad.kategorija === 'nekretnine' && (
          <section className="bg-[#131C2B] border border-white/5 p-8 rounded-xl space-y-4">
            <h3 className="text-xs font-black uppercase text-[#9CA3AF]">Nekretnina</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div><label className="text-[10px] font-black uppercase text-[#9CA3AF]">Tip</label><select value={formData.realEstateDetails?.tipNekretnine || ''} onChange={e => setFormData({ ...formData, realEstateDetails: { ...formData.realEstateDetails, tipNekretnine: e.target.value } })} className="w-full h-12 bg-[#0B1220] border border-white/5 rounded-xl px-4 text-sm text-white mt-1">{NEKRETNINE_TIP.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div>
              <div><label className="text-[10px] font-black uppercase text-[#9CA3AF]">Tip ponude</label><select value={formData.realEstateDetails?.tipPonude || 'prodaja'} onChange={e => setFormData({ ...formData, realEstateDetails: { ...formData.realEstateDetails, tipPonude: e.target.value } })} className="w-full h-12 bg-[#0B1220] border border-white/5 rounded-xl px-4 text-sm text-white mt-1">{NEKRETNINE_TIP_PONUDE.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}</select></div>
              <div><label className="text-[10px] font-black uppercase text-[#9CA3AF]">Kvadratura (m²)</label><input type="number" min={0} step="any" value={formData.realEstateDetails?.kvadratura || ''} onChange={e => setFormData({ ...formData, realEstateDetails: { ...formData.realEstateDetails, kvadratura: e.target.value } })} className="w-full h-12 bg-[#0B1220] border border-white/5 rounded-xl px-4 text-sm text-white mt-1" /></div>
            </div>
            <div>
              <label className="text-[10px] font-black uppercase text-[#9CA3AF] block mb-2">Sadržaji (amenities)</label>
              <div className="flex flex-wrap gap-2">
                {NEKRETNINE_AMENITIES.map(a => {
                  const arr = Array.isArray(formData.realEstateDetails?.amenities) ? formData.realEstateDetails.amenities : [];
                  const checked = arr.includes(a.id);
                  return (
                    <label key={a.id} className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border cursor-pointer ${checked ? 'border-[#4F6DFF] bg-[#4F6DFF]/20 text-white' : 'border-white/10 bg-[#0B1220] text-[#9CA3AF]'}`}>
                      <input type="checkbox" checked={checked} onChange={() => {
                        const next = checked ? arr.filter((x: string) => x !== a.id) : [...arr, a.id];
                        setFormData({ ...formData, realEstateDetails: { ...formData.realEstateDetails, amenities: next } });
                      }} className="sr-only" />
                      <span className="text-xs font-bold">{a.name}</span>
                    </label>
                  );
                })}
              </div>
            </div>
            <div><label className="text-[10px] font-black uppercase text-[#9CA3AF]">URL tlocrtа</label><input type="url" value={formData.realEstateDetails?.floorplanUrl || ''} onChange={e => setFormData({ ...formData, realEstateDetails: { ...formData.realEstateDetails, floorplanUrl: e.target.value } })} className="w-full h-12 bg-[#0B1220] border border-white/5 rounded-xl px-4 text-sm text-white mt-1" placeholder="https://..." /></div>
            <div><label className="text-[10px] font-black uppercase text-[#9CA3AF]">URL virtualne ture (Matterport, 360°)</label><input type="url" value={formData.realEstateDetails?.virtualTourUrl || ''} onChange={e => setFormData({ ...formData, realEstateDetails: { ...formData.realEstateDetails, virtualTourUrl: e.target.value } })} className="w-full h-12 bg-[#0B1220] border border-white/5 rounded-xl px-4 text-sm text-white mt-1" placeholder="https://my.matterport.com/..." /></div>
          </section>
        )}
        {ad.kategorija === 'auto_dijelovi' && (
          <section className="bg-[#131C2B] border border-white/5 p-8 rounded-xl space-y-4">
            <h3 className="text-xs font-black uppercase text-[#9CA3AF]">Auto dijelovi</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><label className="text-[10px] font-black uppercase text-[#9CA3AF]">Tip dijela</label><select value={formData.details?.tipDijela || ''} onChange={e => setFormData({ ...formData, details: { ...formData.details, tipDijela: e.target.value } })} className="w-full h-12 bg-[#0B1220] border border-white/5 rounded-xl px-4 text-sm text-white mt-1">{AUTO_DIJELOVI_TIP.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div>
              <div><label className="text-[10px] font-black uppercase text-[#9CA3AF]">Stanje</label><select value={formData.details?.stanje || 'Polovno'} onChange={e => setFormData({ ...formData, details: { ...formData.details, stanje: e.target.value } })} className="w-full h-12 bg-[#0B1220] border border-white/5 rounded-xl px-4 text-sm text-white mt-1">{STANJE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
            </div>
          </section>
        )}
        {ad.kategorija === 'usluge' && (
          <section className="bg-[#131C2B] border border-white/5 p-8 rounded-xl space-y-4">
            <h3 className="text-xs font-black uppercase text-[#9CA3AF]">Usluge</h3>
            <div><label className="text-[10px] font-black uppercase text-[#9CA3AF]">Način naplate</label><select value={formData.details?.nacinNaplate || ''} onChange={e => setFormData({ ...formData, details: { ...formData.details, nacinNaplate: e.target.value } })} className="w-full h-12 bg-[#0B1220] border border-white/5 rounded-xl px-4 text-sm text-white mt-1">{USLUGE_NACIN_NAPLATE.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div>
          </section>
        )}
        {ad.kategorija === 'bijela_tehnika' && (
          <section className="bg-[#131C2B] border border-white/5 p-8 rounded-xl space-y-4">
            <h3 className="text-xs font-black uppercase text-[#9CA3AF]">Bijela tehnika</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div><label className="text-[10px] font-black uppercase text-[#9CA3AF]">Tip</label><select value={formData.details?.tipBijela || ''} onChange={e => setFormData({ ...formData, details: { ...formData.details, tipBijela: e.target.value } })} className="w-full h-12 bg-[#0B1220] border border-white/5 rounded-xl px-4 text-sm text-white mt-1">{BIJELA_TEHNIKA_TIP.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div>
              <div><label className="text-[10px] font-black uppercase text-[#9CA3AF]">Energetska klasa</label><select value={formData.details?.energetskaKlasa || ''} onChange={e => setFormData({ ...formData, details: { ...formData.details, energetskaKlasa: e.target.value } })} className="w-full h-12 bg-[#0B1220] border border-white/5 rounded-xl px-4 text-sm text-white mt-1">{BIJELA_TEHNIKA_ENERGIJA.map(klasa => <option key={klasa} value={klasa}>{klasa}</option>)}</select></div>
              <div><label className="text-[10px] font-black uppercase text-[#9CA3AF]">Stanje</label><select value={formData.details?.stanje || 'Polovno'} onChange={e => setFormData({ ...formData, details: { ...formData.details, stanje: e.target.value } })} className="w-full h-12 bg-[#0B1220] border border-white/5 rounded-xl px-4 text-sm text-white mt-1">{STANJE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
            </div>
          </section>
        )}
        {ad.kategorija === 'namjestaj' && (
          <section className="bg-[#131C2B] border border-white/5 p-8 rounded-xl space-y-4">
            <h3 className="text-xs font-black uppercase text-[#9CA3AF]">Namještaj</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div><label className="text-[10px] font-black uppercase text-[#9CA3AF]">Tip</label><select value={formData.details?.tipNamjestaj || ''} onChange={e => setFormData({ ...formData, details: { ...formData.details, tipNamjestaj: e.target.value } })} className="w-full h-12 bg-[#0B1220] border border-white/5 rounded-xl px-4 text-sm text-white mt-1">{NAMJESTAJ_TIP.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div>
              <div><label className="text-[10px] font-black uppercase text-[#9CA3AF]">Materijal</label><select value={formData.details?.materijal || ''} onChange={e => setFormData({ ...formData, details: { ...formData.details, materijal: e.target.value } })} className="w-full h-12 bg-[#0B1220] border border-white/5 rounded-xl px-4 text-sm text-white mt-1">{NAMJESTAJ_MATERIJAL.map(m => <option key={m} value={m}>{m}</option>)}</select></div>
              <div><label className="text-[10px] font-black uppercase text-[#9CA3AF]">Stanje</label><select value={formData.details?.stanje || 'Polovno'} onChange={e => setFormData({ ...formData, details: { ...formData.details, stanje: e.target.value } })} className="w-full h-12 bg-[#0B1220] border border-white/5 rounded-xl px-4 text-sm text-white mt-1">{STANJE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
            </div>
          </section>
        )}
        {ad.kategorija === 'za_djecu' && (
          <section className="bg-[#131C2B] border border-white/5 p-8 rounded-xl space-y-4">
            <h3 className="text-xs font-black uppercase text-[#9CA3AF]">Za djecu</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div><label className="text-[10px] font-black uppercase text-[#9CA3AF]">Tip</label><select value={formData.details?.tipZaDjecu || ''} onChange={e => setFormData({ ...formData, details: { ...formData.details, tipZaDjecu: e.target.value } })} className="w-full h-12 bg-[#0B1220] border border-white/5 rounded-xl px-4 text-sm text-white mt-1">{ZA_DJECU_TIP.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div>
              <div><label className="text-[10px] font-black uppercase text-[#9CA3AF]">Uzrast</label><select value={formData.details?.uzrast || ''} onChange={e => setFormData({ ...formData, details: { ...formData.details, uzrast: e.target.value } })} className="w-full h-12 bg-[#0B1220] border border-white/5 rounded-xl px-4 text-sm text-white mt-1">{ZA_DJECU_UZRAST.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}</select></div>
              <div><label className="text-[10px] font-black uppercase text-[#9CA3AF]">Veličina</label><input type="text" value={formData.details?.velicina || ''} onChange={e => setFormData({ ...formData, details: { ...formData.details, velicina: e.target.value } })} className="w-full h-12 bg-[#0B1220] border border-white/5 rounded-xl px-4 text-sm text-white mt-1" placeholder="npr. 86, S" /></div>
              <div><label className="text-[10px] font-black uppercase text-[#9CA3AF]">Stanje</label><select value={formData.details?.stanje || 'Polovno'} onChange={e => setFormData({ ...formData, details: { ...formData.details, stanje: e.target.value } })} className="w-full h-12 bg-[#0B1220] border border-white/5 rounded-xl px-4 text-sm text-white mt-1">{STANJE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
            </div>
          </section>
        )}
        {ad.kategorija === 'poljoprivreda' && (
          <section className="bg-[#131C2B] border border-white/5 p-8 rounded-xl space-y-4">
            <h3 className="text-xs font-black uppercase text-[#9CA3AF]">Poljoprivreda</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><label className="text-[10px] font-black uppercase text-[#9CA3AF]">Tip</label><select value={formData.details?.tipPoljoprivreda || ''} onChange={e => setFormData({ ...formData, details: { ...formData.details, tipPoljoprivreda: e.target.value } })} className="w-full h-12 bg-[#0B1220] border border-white/5 rounded-xl px-4 text-sm text-white mt-1">{POLJOPRIVREDA_TIP.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div>
            </div>
          </section>
        )}
        {ad.kategorija === 'tehnika' && (
          <section className="bg-[#131C2B] border border-white/5 p-8 rounded-xl space-y-4">
            <h3 className="text-xs font-black uppercase text-[#9CA3AF]">Tehnika</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><label className="text-[10px] font-black uppercase text-[#9CA3AF]">Tip</label><select value={formData.details?.tipTehnika || ''} onChange={e => setFormData({ ...formData, details: { ...formData.details, tipTehnika: e.target.value } })} className="w-full h-12 bg-[#0B1220] border border-white/5 rounded-xl px-4 text-sm text-white mt-1">{TEHNIKA_TIP.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div>
              <div><label className="text-[10px] font-black uppercase text-[#9CA3AF]">Stanje</label><select value={formData.details?.stanje || 'Polovno'} onChange={e => setFormData({ ...formData, details: { ...formData.details, stanje: e.target.value } })} className="w-full h-12 bg-[#0B1220] border border-white/5 rounded-xl px-4 text-sm text-white mt-1">{STANJE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
            </div>
          </section>
        )}
        {ad.kategorija === 'kucni_ljubimci' && (
          <section className="bg-[#131C2B] border border-white/5 p-8 rounded-xl space-y-4">
            <h3 className="text-xs font-black uppercase text-[#9CA3AF]">Kućni ljubimci</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><label className="text-[10px] font-black uppercase text-[#9CA3AF]">Vrsta</label><select value={formData.details?.vrstaKucni || ''} onChange={e => setFormData({ ...formData, details: { ...formData.details, vrstaKucni: e.target.value } })} className="w-full h-12 bg-[#0B1220] border border-white/5 rounded-xl px-4 text-sm text-white mt-1">{KUCNI_LJUBIMCI_VRSTA.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div>
            </div>
          </section>
        )}
        {ad.kategorija === 'moda' && (
          <section className="bg-[#131C2B] border border-white/5 p-8 rounded-xl space-y-4">
            <h3 className="text-xs font-black uppercase text-[#9CA3AF]">Moda</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div><label className="text-[10px] font-black uppercase text-[#9CA3AF]">Tip</label><select value={formData.details?.tipModa || ''} onChange={e => setFormData({ ...formData, details: { ...formData.details, tipModa: e.target.value } })} className="w-full h-12 bg-[#0B1220] border border-white/5 rounded-xl px-4 text-sm text-white mt-1">{MODA_TIP.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div>
              <div><label className="text-[10px] font-black uppercase text-[#9CA3AF]">Veličina</label><select value={formData.details?.velicinaModa || ''} onChange={e => setFormData({ ...formData, details: { ...formData.details, velicinaModa: e.target.value } })} className="w-full h-12 bg-[#0B1220] border border-white/5 rounded-xl px-4 text-sm text-white mt-1">{MODA_VELICINE.map(v => <option key={v} value={v}>{v}</option>)}</select></div>
              <div><label className="text-[10px] font-black uppercase text-[#9CA3AF]">Stanje</label><select value={formData.details?.stanje || 'Polovno'} onChange={e => setFormData({ ...formData, details: { ...formData.details, stanje: e.target.value } })} className="w-full h-12 bg-[#0B1220] border border-white/5 rounded-xl px-4 text-sm text-white mt-1">{STANJE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
            </div>
          </section>
        )}
        {ad.kategorija === 'poslovi' && (
          <section className="bg-[#131C2B] border border-white/5 p-8 rounded-xl space-y-4">
            <h3 className="text-xs font-black uppercase text-[#9CA3AF]">Poslovi</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><label className="text-[10px] font-black uppercase text-[#9CA3AF]">Tip</label><select value={formData.details?.tipPoslovi || ''} onChange={e => setFormData({ ...formData, details: { ...formData.details, tipPoslovi: e.target.value } })} className="w-full h-12 bg-[#0B1220] border border-white/5 rounded-xl px-4 text-sm text-white mt-1">{POSLOVI_TIP.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div>
            </div>
          </section>
        )}
        {ad.kategorija === 'sport' && (
          <section className="bg-[#131C2B] border border-white/5 p-8 rounded-xl space-y-4">
            <h3 className="text-xs font-black uppercase text-[#9CA3AF]">Sport i rekreacija</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><label className="text-[10px] font-black uppercase text-[#9CA3AF]">Tip</label><select value={formData.details?.tipSport || ''} onChange={e => setFormData({ ...formData, details: { ...formData.details, tipSport: e.target.value } })} className="w-full h-12 bg-[#0B1220] border border-white/5 rounded-xl px-4 text-sm text-white mt-1">{SPORT_TIP.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div>
              <div><label className="text-[10px] font-black uppercase text-[#9CA3AF]">Stanje</label><select value={formData.details?.stanje || 'Polovno'} onChange={e => setFormData({ ...formData, details: { ...formData.details, stanje: e.target.value } })} className="w-full h-12 bg-[#0B1220] border border-white/5 rounded-xl px-4 text-sm text-white mt-1">{STANJE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
            </div>
          </section>
        )}
        {ad.kategorija === 'gradjevina' && (
          <section className="bg-[#131C2B] border border-white/5 p-8 rounded-xl space-y-4">
            <h3 className="text-xs font-black uppercase text-[#9CA3AF]">Građevina i alati</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><label className="text-[10px] font-black uppercase text-[#9CA3AF]">Tip</label><select value={formData.details?.tipGradjevina || ''} onChange={e => setFormData({ ...formData, details: { ...formData.details, tipGradjevina: e.target.value } })} className="w-full h-12 bg-[#0B1220] border border-white/5 rounded-xl px-4 text-sm text-white mt-1">{GRADJEVINA_TIP.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div>
              <div><label className="text-[10px] font-black uppercase text-[#9CA3AF]">Stanje</label><select value={formData.details?.stanje || 'Polovno'} onChange={e => setFormData({ ...formData, details: { ...formData.details, stanje: e.target.value } })} className="w-full h-12 bg-[#0B1220] border border-white/5 rounded-xl px-4 text-sm text-white mt-1">{STANJE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
            </div>
          </section>
        )}
        {ad.kategorija === 'pokloni_cvijece' && (
          <section className="bg-[#131C2B] border border-white/5 p-8 rounded-xl space-y-4">
            <h3 className="text-xs font-black uppercase text-[#9CA3AF]">Pokloni i cvijeće</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><label className="text-[10px] font-black uppercase text-[#9CA3AF]">Tip</label><select value={formData.details?.tipPokloni || ''} onChange={e => setFormData({ ...formData, details: { ...formData.details, tipPokloni: e.target.value } })} className="w-full h-12 bg-[#0B1220] border border-white/5 rounded-xl px-4 text-sm text-white mt-1">{POKLONI_TIP.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div>
              <div><label className="text-[10px] font-black uppercase text-[#9CA3AF]">Povod</label><select value={formData.details?.povodPokloni || ''} onChange={e => setFormData({ ...formData, details: { ...formData.details, povodPokloni: e.target.value } })} className="w-full h-12 bg-[#0B1220] border border-white/5 rounded-xl px-4 text-sm text-white mt-1">{POKLONI_POVOD.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
            </div>
          </section>
        )}
        <p className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>Izmjene će biti pregledane od administratora prije nego oglas ponovo postane aktivan na sajtu.</p>
        <button type="submit" disabled={submitLoading} className="w-full h-14 bg-[#4F6DFF] text-white rounded-2xl font-black uppercase text-xs tracking-widest disabled:opacity-70 flex items-center justify-center gap-2">
          {submitLoading ? <><Loader2 className="w-5 h-5 animate-spin" /> Snimanje...</> : 'Sačuvaj izmjene'}
        </button>
      </form>
    </div>
  );
};

const MyAds = ({ user, onRefresh }: { user: User | null; onRefresh?: () => void }) => {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [myAds, setMyAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const showPendingBanner = searchParams.get('pending') === '1';
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [bumpingId, setBumpingId] = useState<string | null>(null);

  // Restore scroll pri povratku sa detail stranice
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

  const fetchMyAds = () => {
    if (!user) return;
    setLoading(true);
    fetch(`${API_BASE}/ads/mine`, { headers: getAuthHeaders() })
      .then(res => res.ok ? res.json() : [])
      .then((list: any[]) => setMyAds((list || []).map(mapApiAdToAd)))
      .catch(() => setMyAds([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!user) { setMyAds([]); setLoading(false); return; }
    fetchMyAds();
  }, [user?.id]);

  const handleStatusChange = (adId: string, status: 'AKTIVAN' | 'PRODAN' | 'ISTEKAO' | 'NA_CEKANJU') => {
    if (status === 'NA_CEKANJU') return;
    if (status === 'PRODAN') {
      if (!window.confirm('Označiti oglas kao prodan? Oglas će biti trajno uklonjen sa sajta.')) return;
    }
    setUpdatingId(adId);
    if (status === 'PRODAN') {
      fetch(`${API_BASE}/ads/my/${adId}`, { method: 'DELETE', headers: getAuthHeaders() })
        .then(res => { if (res.ok) fetchMyAds(); onRefresh?.(); })
        .finally(() => setUpdatingId(null));
      return;
    }
    fetch(`${API_BASE}/ads/my/${adId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ status })
    })
      .then(res => { if (res.ok) fetchMyAds(); onRefresh?.(); })
      .finally(() => setUpdatingId(null));
  };

  const handleBump = (adId: string) => {
    setBumpingId(adId);
    fetch(`${API_BASE}/ads/${adId}/extend`, { method: 'POST', headers: getAuthHeaders() })
      .then(res => { if (res.ok) fetchMyAds(); onRefresh?.(); })
      .catch(() => {})
      .finally(() => setBumpingId(null));
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-black text-white uppercase mb-8 tracking-widest">Moji oglasi</h1>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="aspect-square bg-[#131C2B] rounded-[18px] animate-pulse" />)}
        </div>
      </div>
    );
  }
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-black text-white uppercase mb-8 tracking-widest">Moji oglasi</h1>
      {showPendingBanner && (
        <div className="mb-6 p-4 rounded-2xl border flex items-start gap-3" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--accent)' }}>
          <CheckCircle2 className="w-6 h-6 flex-shrink-0 mt-0.5" style={{ color: 'var(--accent)' }} />
          <div>
            <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Oglas je poslan na pregled</p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>Administrator će pregledati oglas u roku od nekoliko sati. Oglas neće biti vidljiv na sajtu dok ga administrator ne odobri.</p>
            <button type="button" onClick={() => setSearchParams({})} className="text-[10px] font-bold uppercase mt-2" style={{ color: 'var(--accent)' }}>U redu</button>
          </div>
        </div>
      )}
      {myAds.length === 0 ? (
        <EmptyState variant="no-ads" />
      ) : (
        <>
          <div className="mb-6 p-4 rounded-xl border flex flex-wrap items-center gap-4" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}>
            <div className="flex items-center gap-2">
              <Eye className="w-5 h-5" style={{ color: 'var(--accent)' }} />
              <span className="text-sm font-bold text-white">{myAds.reduce((s, a) => s + (a.pogledi ?? 0), 0).toLocaleString()}</span>
              <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>ukupno pregleda</span>
            </div>
            <div className="h-4 w-px bg-white/10" />
            <div>
              <span className="text-sm font-bold text-white">{myAds.length}</span>
              <span className="text-xs font-medium ml-1" style={{ color: 'var(--text-secondary)' }}>oglasa</span>
            </div>
          </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {myAds.map(ad => (
            <div key={ad.id} className="relative group">
              <AdCard ad={ad} isFavorite={false} onToggleFavorite={() => {}} />
              <span className={`absolute top-2 left-2 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${ad.status === 'NA_CEKANJU' ? 'bg-sky-500/90' : ad.status === 'AKTIVAN' ? 'bg-emerald-500/90' : ad.status === 'PRODAN' ? 'bg-slate-500/90' : 'bg-amber-600/90'}`}>
                {ad.status === 'NA_CEKANJU' ? 'Na čekanju' : ad.status}
              </span>
              {(ad.pogledi ?? 0) > 0 && (
                <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md text-[9px] font-bold bg-black/70 text-white/90 flex items-center gap-1">
                  <Eye className="w-3 h-3" /> {(ad.pogledi ?? 0).toLocaleString()}
                </span>
              )}
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/80 rounded-xl p-2 z-10 flex flex-col gap-2">
                {ad.status === 'AKTIVAN' && (
                  <button type="button" onClick={() => handleBump(ad.id)} disabled={bumpingId === ad.id} className="flex items-center gap-1 text-[9px] font-bold text-[#4F6DFF] hover:text-white">
                    {bumpingId === ad.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <ArrowUpRight className="w-3 h-3" />}
                    Podigni na vrh
                  </button>
                )}
                <div>
                  <label className="text-[9px] font-bold text-[#9CA3AF] block mb-1">Status</label>
                  <select
                    value={ad.status}
                    onChange={e => handleStatusChange(ad.id, e.target.value as 'AKTIVAN' | 'PRODAN' | 'ISTEKAO' | 'NA_CEKANJU')}
                    disabled={updatingId === ad.id || ad.status === 'NA_CEKANJU'}
                    className="text-[9px] font-bold bg-[#131C2B] border border-white/20 rounded-lg px-2 py-1 text-white w-full"
                  >
                    <option value="NA_CEKANJU">Na čekanju</option>
                    <option value="AKTIVAN">Aktivan</option>
                    <option value="PRODAN">Prodano</option>
                    <option value="ISTEKAO">Istekao</option>
                  </select>
                </div>
              </div>
            </div>
          ))}
        </div>
        </>
      )}
    </div>
  );
};

type SavedSearchItem = { id: string; naziv: string | null; query: Record<string, string>; createdAt: string };

const MySavedSearches: React.FC = () => {
  const navigate = useNavigate();
  const [list, setList] = useState<SavedSearchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchList = useCallback(() => {
    fetch(`${API_BASE}/saved-searches`, { headers: getAuthHeaders() })
      .then(res => res.ok ? res.json() : [])
      .then((data: SavedSearchItem[]) => setList(Array.isArray(data) ? data : []))
      .catch(() => setList([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchList();
  }, [fetchList]);

  const applySearch = (item: SavedSearchItem) => {
    const q = item.query || {};
    const category = q.category || q.kategorija || '';
    const rest = { ...q };
    delete rest.category;
    delete rest.kategorija;
    const params = new URLSearchParams();
    Object.entries(rest).forEach(([k, v]) => { if (v != null && String(v).trim()) params.set(k, String(v)); });
    const path = category ? `/kategorija/${category}` : '/marketplace';
    const search = params.toString();
    navigate(search ? `${path}?${search}` : path);
  };

  const handleDelete = (id: string) => {
    if (!window.confirm('Obrisati ovu spremljenu pretragu?')) return;
    setDeletingId(id);
    fetch(`${API_BASE}/saved-searches/${id}`, { method: 'DELETE', headers: getAuthHeaders() })
      .then(res => { if (res.ok) setList(prev => prev.filter(x => x.id !== id)); })
      .finally(() => setDeletingId(null));
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <h1 className="text-2xl font-black text-white uppercase mb-8 tracking-widest">Moje spremljene pretrage</h1>
        <div className="space-y-3"><div className="h-16 bg-[#131C2B] rounded-xl animate-pulse" /><div className="h-16 bg-[#131C2B] rounded-xl animate-pulse" /><div className="h-16 bg-[#131C2B] rounded-xl animate-pulse" /></div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 pb-[max(2rem,env(safe-area-inset-bottom))]">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <h1 className="text-xl sm:text-2xl font-black text-white uppercase tracking-widest">Spremljene pretrage</h1>
        <Link to="/marketplace" className="text-[10px] font-bold uppercase text-[#4F6DFF] self-start sm:self-auto">← Nazad na pretragu</Link>
      </div>
      {list.length === 0 ? (
        <div className="p-6 sm:p-8 rounded-2xl border text-center" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}>
          <BookmarkPlus className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--text-secondary)' }} />
          <p className="font-bold text-white mb-2">Nema spremljenih pretraga</p>
          <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>Na stranici za pretragu postavite filtere i kliknite „Spremi“ da dobijate obavijesti za nove oglase.</p>
          <Link to="/marketplace" className="inline-flex items-center gap-2 min-h-[44px] px-5 py-3 rounded-xl font-bold text-sm" style={{ backgroundColor: 'var(--accent)', color: 'white' }}>Idi na pretragu →</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {list.map(item => (
            <div key={item.id} className="p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}>
              <button type="button" onClick={() => applySearch(item)} className="flex-1 min-w-0 text-left">
                <p className="font-bold text-white truncate">{item.naziv || 'Pretraga bez naziva'}</p>
                <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-secondary)' }}>{new Date(item.createdAt).toLocaleDateString('sr-Latn-ME')}</p>
              </button>
              <div className="flex items-center gap-2 flex-shrink-0 self-end sm:self-auto">
                <button type="button" onClick={() => applySearch(item)} className="min-h-[44px] min-w-[44px] px-4 py-2 rounded-xl text-sm font-bold flex items-center justify-center" style={{ backgroundColor: 'var(--accent)', color: 'white' }}>Otvori</button>
                <button type="button" onClick={() => handleDelete(item.id)} disabled={deletingId === item.id} className="min-h-[44px] min-w-[44px] p-2 rounded-xl flex items-center justify-center text-red-400 hover:bg-red-500/10 disabled:opacity-50">
                  {deletingId === item.id ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const MyFavorites: React.FC<{ ads: Ad[], favorites: string[], onToggleFavorite: (id: string) => void, adsError?: string | null, adsAreFallback?: boolean, onRetryAds?: () => void }> = ({ ads, favorites, onToggleFavorite, adsError, adsAreFallback, onRetryAds }) => {
  const location = useLocation();
  const linksDisabled = !!adsError || !!adsAreFallback;
  const favoritedAds = ads.filter(a => favorites.includes(a.id));

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

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-black text-white uppercase mb-8 tracking-widest">Sačuvano</h1>
      {favoritedAds.length === 0 ? (
        <EmptyState variant="no-favorites" />
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {favoritedAds.map(ad => (<AdCard key={ad.id} ad={ad} isFavorite={true} onToggleFavorite={onToggleFavorite} linksDisabled={linksDisabled} onFallbackClick={onRetryAds} debugAdsError={adsError} debugAdsAreFallback={adsAreFallback} imgWidth={400} />))}
        </div>
      )}
    </div>
  );
};

export default App;
