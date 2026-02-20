import React, { useEffect, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import { LOCATION_COORDS } from '../constants';

/** Geocoding pomoću OpenStreetMap Nominatim (besplatno, bez API ključa). */
async function geocodeAddress(address: string, city?: string): Promise<{ lat: number; lng: number } | null> {
  const base = address.trim();
  const suffix = city ? `, ${city}, Crna Gora` : ', Crna Gora';
  const q = encodeURIComponent(base + suffix);
  const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1`, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'PoveziME-Marketplace/1.0',
    },
  });
  const data = await res.json().catch(() => []);
  if (Array.isArray(data) && data.length > 0 && data[0].lat && data[0].lon) {
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  }
  return null;
}

/** Opcioni map picker – korisnik unosi adresu ili klikne da postavi tačnu lokaciju. Vraća { lat, lng } ili null. */
export const MapLocationPicker: React.FC<{
  lokacija: string;
  value: { lat: number; lng: number } | null;
  onChange: (coords: { lat: number; lng: number } | null) => void;
  height?: number;
}> = ({ lokacija, value, onChange, height = 240 }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const iconRef = useRef<any>(null);
  const LRef = useRef<any>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addressQuery, setAddressQuery] = useState('');
  const [geocodeLoading, setGeocodeLoading] = useState(false);
  const [geocodeError, setGeocodeError] = useState<string | null>(null);

  const center = (LOCATION_COORDS[lokacija] || LOCATION_COORDS['Podgorica']) as [number, number];

  const handleSearchAddress = async () => {
    const q = addressQuery.trim();
    if (!q) return;
    setGeocodeError(null);
    setGeocodeLoading(true);
    try {
      const coords = await geocodeAddress(q, lokacija);
      if (coords) {
        onChange(coords);
        if (mapRef.current) {
          mapRef.current.setView([coords.lat, coords.lng], 16);
        }
      } else {
        setGeocodeError('Adresa nije pronađena. Pokušajte drugačiji unos ili kliknite na mapu.');
      }
    } catch {
      setGeocodeError('Greška pri pretrazi. Pokušajte ponovo.');
    } finally {
      setGeocodeLoading(false);
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined' || !containerRef.current) return;
    let cancelled = false;
    let cleanup: (() => void) | null = null;
    import('leaflet')
      .then((mod) => {
        const L = mod.default;
        LRef.current = L;
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
        iconRef.current = icon;

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
    if (!ready || !mapRef.current) return;
    const L = LRef.current;
    const icon = iconRef.current;
    if (value) {
      if (markerRef.current) {
        markerRef.current.setLatLng([value.lat, value.lng]);
      } else if (L && icon) {
        const m = L.marker([value.lat, value.lng], { icon }).addTo(mapRef.current);
        markerRef.current = m;
      }
      mapRef.current.setView([value.lat, value.lng], 15);
    } else {
      if (markerRef.current) {
        markerRef.current.remove();
        markerRef.current = null;
      }
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
      <div className="flex gap-2">
        <input
          type="text"
          placeholder={`Unesite adresu u ${lokacija} (npr. Njegoševa 12)...`}
          value={addressQuery}
          onChange={(e) => {
            setAddressQuery(e.target.value);
            setGeocodeError(null);
          }}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleSearchAddress())}
          className="flex-1 rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4F6DFF]/50"
          style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-card)' }}
          disabled={geocodeLoading}
        />
        <button
          type="button"
          onClick={handleSearchAddress}
          disabled={geocodeLoading || !addressQuery.trim()}
          className="flex items-center gap-2 rounded-lg bg-[#4F6DFF] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#3d5ae0] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Search size={16} />
          {geocodeLoading ? 'Tražim...' : 'Pronađi'}
        </button>
      </div>
      {geocodeError && <p className="text-xs text-amber-500">{geocodeError}</p>}
      <p className="text-[10px] text-[#9CA3AF]">Pretraga ulica u {lokacija}. Unesite adresu da vam mapu prebaci na to mjesto, ili kliknite na mapu.</p>
      <div
        ref={containerRef}
        className="w-full rounded-xl overflow-hidden border cursor-crosshair"
        style={{ height, minHeight: 180, borderColor: 'var(--border-subtle)' }}
        aria-label="Odabir lokacije na mapi"
      />
    </div>
  );
};
