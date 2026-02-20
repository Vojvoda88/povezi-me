import React, { useEffect, useRef } from 'react';

/** Mala mapa sa jednim pinom za stranicu oglasa – prikazuje se samo kad oglas ima lat/lng. */
export const AdDetailMap: React.FC<{
  lat: number;
  lng: number;
  height?: number;
}> = ({ lat, lng, height = 200 }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !containerRef.current) return;
    let cancelled = false;
    let cleanup: (() => void) | null = null;
    import('leaflet')
      .then((mod) => {
        const L = mod.default;
        if (cancelled || !containerRef.current) return;
        const map = L.map(containerRef.current, { zoomControl: false }).setView([lat, lng], 15);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap',
          maxZoom: 19,
        }).addTo(map);
        L.control.zoom({ position: 'topright' }).addTo(map);
        const icon = L.divIcon({
          html: '<div style="width:28px;height:28px;border-radius:50%;background:#4F6DFF;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.4);"></div>',
          className: '',
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });
        L.marker([lat, lng], { icon }).addTo(map);
        mapRef.current = map;
        cleanup = () => {
          map.remove();
          mapRef.current = null;
        };
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [lat, lng]);

  return (
    <div
      ref={containerRef}
      className="w-full rounded-xl overflow-hidden border"
      style={{ height, minHeight: 160, borderColor: 'var(--border-subtle)' }}
      aria-label="Lokacija oglasa na mapi"
    />
  );
};
