/**
 * Global runtime error guard – radi i bez Sentry.
 * - window.onerror / unhandledrejection
 * - fallback: console.error + optional POST /api/log-client-error
 * Ne smije bacati iznimke niti ovisiti o VITE_SENTRY_DSN.
 */

export type GetApiBase = () => string;

export interface RuntimeErrorGuardOptions {
  /** Funkcija koja vraća API base (npr. getApiBase). Ako nije proslijeđena, POST se ne šalje. */
  getApiBase?: GetApiBase;
}

function safeString(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (value instanceof Error) return value.message || String(value);
  try {
    return String(value);
  } catch {
    return '[unknown]';
  }
}

function safeStack(value: unknown): string | undefined {
  if (value instanceof Error && value.stack) return value.stack;
  return undefined;
}

/** Report client error to console and optionally to backend. Non-blocking, never throws. */
export function reportClientError(
  message: string,
  stack?: string,
  type: string = 'error',
  getApiBase?: GetApiBase
): void {
  try {
    console.error('[Povezi.ME client error]', type, message, stack || '');
  } catch {
    // ignore
  }
  if (!getApiBase || typeof getApiBase !== 'function') return;
  try {
    const base = getApiBase();
    if (!base || typeof base !== 'string') return;
    const url = `${base.replace(/\/+$/, '')}/log-client-error`;
    const payload = {
      message: message.slice(0, 2000),
      stack: stack ? stack.slice(0, 8000) : undefined,
      type,
      url: typeof window !== 'undefined' ? window.location.href : undefined,
      timestamp: new Date().toISOString(),
    };
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {
      // Endpoint možda ne postoji ili mreža faila – ignorišemo
    });
  } catch {
    // nikad ne bacati
  }
}

let installed = false;

/**
 * Instalira globalne handlere za error i unhandledrejection.
 * Pozvati jednom prije React mounta (npr. u main.tsx).
 */
export function installRuntimeErrorGuard(options: RuntimeErrorGuardOptions = {}): void {
  if (typeof window === 'undefined') return;
  if (installed) return;
  installed = true;
  const { getApiBase } = options;

  const handleError = (event: ErrorEvent) => {
    try {
      const message = event.message || safeString(event.error);
      const stack = event.error instanceof Error ? event.error.stack : undefined;
      reportClientError(message, stack, 'window.error', getApiBase);
    } catch {
      // ignore
    }
  };

  const handleRejection = (event: PromiseRejectionEvent) => {
    try {
      const reason = event.reason;
      const message = safeString(reason);
      const stack = safeStack(reason);
      reportClientError(message, stack, 'unhandledrejection', getApiBase);
    } catch {
      // ignore
    }
  };

  try {
    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);
  } catch {
    // ignore
  }
}
