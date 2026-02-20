import React, { useEffect, useRef, useState } from 'react';
import { LOCATION_COORDS } from '../constants';

/** Opcioni map picker – korisnik klikne da postavi tačnu lokaciju. Vraća { lat, lng } ili null. */
export const MapLocationPicker: React.FC<{
  lokacija: string;
  value: { lat: number; lng: number } | null;
  onChange: (coords: { lat: number; lng: number } | null) => void;
  height?: number;
}> = ({ lokacija, value, onChange, height = 240 }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const center = (LOCATION_COORDS[lokacija] || LOCATION_COORDS['Podgorica']) as [number, number];

  useEffect(() => {
    if (typeof window === 'undefined' || !containerRef.current) return;
    let cancelled = false;
    let cleanup: (() => void) | null = null;
    import('leaflet')
      .then((mod) => {
        const L = mod.default;
        if (cancelled || !containerRef.current) return;
        const map = L.map(containerRef.current, { zoomControl: false }).setView(
          value ? [value.lat, value.lng] : center,
          value ? 15 : 12
        );
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap',
          maxZoom: 19,
        }).addTo(map);
        L.control.zoom({ position: 'topright' }).addTo(map);
        mapRef.current = map;

        const icon = L.divIcon({
          html: '<div style="width:28px;height:28px;border-radius:50%;background:#4F6DFF;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.4);"></div>',
          className: '',
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });

        if (value) {
          const m = L.marker([value.lat, value.lng], { icon }).addTo(map);
          markerRef.current = m;
        }

        map.on('click', (e: { latlng: { lat: number; lng: number } }) => {
          const { lat, lng } = e.latlng;
          if (markerRef.current) markerRef.current.remove();
          const m = L.marker([lat, lng], { icon }).addTo(map);
          markerRef.current = m;
          onChange({ lat, lng });
        });

        setReady(true);
        cleanup = () => {
          if (markerRef.current) {
            markerRef.current.remove();
            markerRef.current = null;
          }
          map.remove();
          mapRef.current = null;
          setReady(false);
        };
      })
      .catch(() => setError('Mapa nije dostupna.'));

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [lokacija]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!ready || !mapRef.current || !markerRef.current) return;
    if (value) {
      markerRef.current.setLatLng([value.lat, value.lng]);
      mapRef.current.setView([value.lat, value.lng], 15);
    } else {
      markerRef.current.remove();
      markerRef.current = null;
      mapRef.current.setView(center, 12);
    }
  }, [value, ready, center]);

  const handleClear = () => {
    if (markerRef.current) {
      markerRef.current.remove();
      markerRef.current = null;
    }
    if (mapRef.current) mapRef.current.setView(center, 12);
    onChange(null);
  };

  if (error) {
    return (
      <div className="rounded-xl border p-4 text-center" style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-card)' }}>
        <p className="text-sm text-[#9CA3AF]">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-black uppercase text-[#9CA3AF]">Tačna lokacija (opciono)</span>
        {value && (
          <button
            type="button"
            onClick={handleClear}
            className="text-xs font-bold text-[#9CA3AF] hover:text-red-400 transition-colors"
          >
            Ukloni
          </button>
        )}
      </div>
      <p className="text-[10px] text-[#9CA3AF]">Kliknite na mapu da postavite tačnu lokaciju. Ako ne odaberete, koristit će se centar grada.</p>
      <div
        ref={containerRef}
        className="w-full rounded-xl overflow-hidden border cursor-crosshair"
        style={{ height, minHeight: 180, borderColor: 'var(--border-subtle)' }}
        aria-label="Odabir lokacije na mapi"
      />
    </div>
  );
};
