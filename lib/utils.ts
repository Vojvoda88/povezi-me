import { MAX_UPLOAD_WIDTH, UPLOAD_JPEG_QUALITY } from './marketplaceConfig';

/** Opšte utility funkcije. */

export const DEFAULT_DESCRIPTION = 'Kupuj i prodaj brzo i sigurno u Crnoj Gori. Poveži.ME Premium Marketplace.';

export function resizeImageForUpload(file: File): Promise<File | Blob> {
  if (!file.type.startsWith('image/')) return Promise.resolve(file);
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const { width, height } = img;
      if (width <= MAX_UPLOAD_WIDTH && height <= MAX_UPLOAD_WIDTH) {
        resolve(file);
        return;
      }
      const scale = Math.min(MAX_UPLOAD_WIDTH / width, MAX_UPLOAD_WIDTH / height, 1);
      const w = Math.round(width * scale);
      const h = Math.round(height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(file);
        return;
      }
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob((blob) => resolve(blob || file), 'image/jpeg', UPLOAD_JPEG_QUALITY);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file);
    };
    img.src = url;
  });
}

export function setPageMeta(title: string, description?: string, image?: string, url?: string) {
  document.title = title;
  let el = document.querySelector('meta[name="description"]');
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute('name', 'description');
    document.head.appendChild(el);
  }
  (el as HTMLMetaElement).setAttribute('content', description || DEFAULT_DESCRIPTION);
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://povezi.me';
  const setOg = (prop: string, content: string) => {
    let m = document.querySelector(`meta[property="${prop}"]`);
    if (!m) {
      m = document.createElement('meta');
      m.setAttribute('property', prop);
      document.head.appendChild(m);
    }
    (m as HTMLMetaElement).setAttribute('content', content);
  };
  setOg('og:title', title);
  setOg('og:description', description || DEFAULT_DESCRIPTION);
  setOg('og:url', url || (typeof window !== 'undefined' ? window.location.href : baseUrl));
  if (image) setOg('og:image', image);
}

export function getInitial(value: string | undefined | null, fallback: string = '?'): string {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  if (!trimmed) return fallback;
  const first = trimmed[0];
  return first || fallback;
}

export function timeAgo(date: number): string {
  const seconds = Math.floor((Date.now() - date) / 1000);
  if (seconds < 60) return 'Upravo sada';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `pre ${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `pre ${hours}h`;
  return new Date(date).toLocaleDateString();
}

export function formatRelativeTime(ts: number): string {
  const d = Date.now() - ts;
  if (d < 60000) return 'prije manje od 1 min';
  if (d < 3600000) return `prije ${Math.floor(d / 60000)} min`;
  if (d < 86400000) return `prije ${Math.floor(d / 3600000)} h`;
  if (d < 604800000) return `prije ${Math.floor(d / 86400000)} d`;
  return new Date(ts).toLocaleDateString();
}
