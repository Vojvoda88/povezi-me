import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Ad } from '../types';
import { LOCATION_COORDS } from '../constants';

/** Mapa Crne Gore sa pinovima oglasa. Koristi centar grada iz LOCATION_COORDS. */
export const MarketplaceMap: React.FC<{
  ads: Ad[];
  getAdLink: (ad: Ad) => string;
}> = ({ ads, getAdLink }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !containerRef.current) return;
    let cancelled = false;
    let cleanup: (() => void) | null = null;
    import('leaflet')
      .then((mod) => {
        const L = mod.default;
        if (cancelled || !containerRef.current) return;
    const map = L.map(containerRef.current, { zoomControl: false }).setView([42.5, 19.2], 8);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
      maxZoom: 19,
    }).addTo(map);
    L.control.zoom({ position: 'topright' }).addTo(map);
    mapRef.current = map;

    const icon = L.divIcon({
      html: '<div style="width:24px;height:24px;border-radius:50%;background:#4F6DFF;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);"></div>',
      className: '',
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });

    const indexByLoc: Record<string, number> = {};
    const markers: any[] = [];
    ads.forEach((ad) => {
      const hasExactCoords = typeof ad.lat === 'number' && typeof ad.lng === 'number' && Number.isFinite(ad.lat) && Number.isFinite(ad.lng);
      const loc = ad.lokacija || 'Podgorica';
      const cityCoords = LOCATION_COORDS[loc] || LOCATION_COORDS['Podgorica'];
      if (!cityCoords && !hasExactCoords) return;
      let lat: number;
      let lng: number;
      if (hasExactCoords) {
        lat = ad.lat as number;
        lng = ad.lng as number;
      } else {
        const idx = (indexByLoc[loc] ?? 0);
        indexByLoc[loc] = idx + 1;
        const offset = idx * 0.008;
        lat = cityCoords[0] + (idx % 2 === 0 ? offset : -offset * 0.5);
        lng = cityCoords[1] + (idx % 2 === 0 ? offset * 0.5 : -offset);
      }
      const m = L.marker([lat, lng], { icon })
        .addTo(map)
        .on('click', () => {
          try {
            navigate(getAdLink(ad));
          } catch {
            window.location.href = getAdLink(ad);
          }
        });
      m.bindTooltip(ad.naslov || 'Oglas', {
        direction: 'top',
        offset: [0, -12],
        className: 'leaflet-tooltip-dark',
      });
      markers.push(m);
    });
    markersRef.current = markers;

        cleanup = () => {
          markers.forEach((m) => m.remove());
          markersRef.current = [];
          map.remove();
          mapRef.current = null;
        };
      })
      .catch(() => setError('Mapa nije dostupna.'));

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [ads, navigate, getAdLink]);

  if (error) {
    return (
      <div className="h-[400px] flex items-center justify-center rounded-2xl border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}>
        <p className="text-[#9CA3AF] font-bold">{error}</p>
      </div>
    );
  }

  if (ads.length === 0) {
    return (
      <div className="h-[400px] flex items-center justify-center rounded-2xl border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}>
        <p className="text-[#9CA3AF] font-bold">Nema oglasa za prikaz na mapi</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="w-full rounded-2xl overflow-hidden border"
      style={{ height: 400, minHeight: 300, borderColor: 'var(--border-subtle)' }}
      aria-label="Mapa oglasa"
    />
  );
};
