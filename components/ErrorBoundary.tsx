import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('[ErrorBoundary]', error, errorInfo);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="min-h-[60vh] flex items-center justify-center px-4" style={{ backgroundColor: 'var(--bg-page)' }}>
          <div className="max-w-md w-full text-center py-12">
            <AlertTriangle className="w-16 h-16 mx-auto mb-6" style={{ color: 'var(--accent)' }} />
            <h1 className="text-xl font-black uppercase mb-2" style={{ color: 'var(--text-primary)' }}>Nešto nije u redu</h1>
            <p className="text-sm mb-8" style={{ color: 'var(--text-secondary)' }}>Došlo je do neočekivane greške. Osvježite stranicu ili pokušajte ponovo kasnije.</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="h-14 px-8 rounded-2xl font-black uppercase text-xs text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: 'var(--accent)' }}
            >
              Osvježi stranicu
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
