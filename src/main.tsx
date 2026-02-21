import './index.css';
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import * as Sentry from '@sentry/react';
import App from '../App';
import { getApiBase } from '../api';
import { installRuntimeErrorGuard, reportClientError } from './lib/runtimeErrorGuard';

// Global error guard – radi i bez Sentry (console + optional POST /api/log-client-error).
if (typeof window !== 'undefined') {
  installRuntimeErrorGuard({ getApiBase });
}

// Keep-alive ping (production) to reduce cold starts.
if (typeof window !== 'undefined' && (import.meta as any).env?.MODE === 'production') {
  const ping = () => {
    const base = getApiBase();
    if (!base) return;
    fetch(`${base.replace(/\/+$/, '')}/health`).catch(() => {});
  };
  ping();
  window.setInterval(ping, 5 * 60 * 1000);
}

const dsn = typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SENTRY_DSN;
let sentryEnabled = false;

if (dsn && typeof dsn === 'string' && dsn.trim()) {
  try {
    Sentry.init({
      dsn: dsn.trim(),
      integrations: [Sentry.browserTracingIntegration()],
      tracesSampleRate: 0.1,
      environment: (import.meta as any).env?.MODE || 'development',
      release: (import.meta as any).env?.VITE_APP_VERSION || 'dev',
    });
    sentryEnabled = true;
  } catch (err) {
    console.error('[Sentry] Frontend init failed:', err);
  }
}

// Sentry capture za globalne greške (ako je Sentry aktivan). Guard već loguje + POST.
if (typeof window !== 'undefined' && sentryEnabled) {
  window.addEventListener('error', (event) => {
    try {
      Sentry.captureException(event.error || event.message || 'window.onerror');
    } catch {
      // ignorisati
    }
  });
  window.addEventListener('unhandledrejection', (event) => {
    try {
      Sentry.captureException((event as PromiseRejectionEvent).reason || 'unhandledrejection');
    } catch {
      // ignorisati
    }
  });
}

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary:', error, errorInfo);
    if (sentryEnabled) {
      try {
        Sentry.captureException(error, { extra: errorInfo });
      } catch {
        // Sentry nikad ne smije srušiti UI
      }
    }
    // Fallback kad Sentry nije aktivan – log + optional POST
    try {
      reportClientError(
        error.message || String(error),
        error.stack,
        'ErrorBoundary',
        getApiBase
      );
    } catch {
      // ignorisati
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-[#0B1220] text-slate-200 p-6 text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h1 className="text-xl font-black uppercase tracking-widest text-white mb-2">Nešto nije u redu</h1>
          <p className="text-sm text-[#9CA3AF] mb-6 max-w-sm">Došlo je do greške. Osvježite stranicu ili pokušajte ponovo kasnije.</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="h-12 px-6 bg-[#4F6DFF] text-white rounded-xl font-bold text-xs uppercase hover:bg-[#3D56D6] transition-colors"
          >
            Osvježi stranicu
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const container = document.getElementById('root');
if (!container) throw new Error('Root element #root not found');
createRoot(container).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
