type ApiFetchOptions = RequestInit & { timeoutMs?: number };

export class ApiError extends Error {
  status?: number;
  url?: string;

  constructor(message: string, status?: number, url?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.url = url;
  }
}

export const apiFetch = async <T = unknown>(url: string, options: ApiFetchOptions = {}): Promise<T> => {
  const { timeoutMs = 10000, ...init } = options;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    if (!res.ok) {
      if (res.status === 401 && typeof window !== 'undefined') {
        try {
          window.dispatchEvent(new CustomEvent('auth:expired', { detail: { url } }));
        } catch {
          // ignore
        }
      }
      const err = new ApiError(`Request failed with status ${res.status}`, res.status, url);
      throw err;
    }
    if (res.status === 204) {
      return undefined as T;
    }
    try {
      return (await res.json()) as T;
    } catch (jsonError) {
      const err = new ApiError('Failed to parse JSON response', res.status, url);
      (err as any).cause = jsonError;
      throw err;
    }
  } catch (error: any) {
    if (error?.name === 'AbortError') {
      const err = new ApiError('Request aborted or timed out', undefined, url);
      throw err;
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
};

