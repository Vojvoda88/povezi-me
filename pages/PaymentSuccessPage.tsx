import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { getApiBase } from '../api';
import { getAuthHeaders } from '../lib/auth';

const API_BASE = getApiBase();

export const PaymentSuccessPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const adId = searchParams.get('ad_id');
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(!!sessionId);

  useEffect(() => {
    if (!sessionId) return;
    fetch(`${API_BASE}/payments/session-status?session_id=${encodeURIComponent(sessionId)}`, { headers: getAuthHeaders() })
      .then((res) => res.json())
      .then((data: { status?: string; adSlug?: string }) => {
        setStatus(data.status ?? null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [sessionId]);

  return (
    <div className="max-w-2xl mx-auto px-4 py-24 text-center">
      {loading ? (
        <Loader2 className="w-12 h-12 animate-spin mx-auto mb-6" style={{ color: 'var(--accent)' }} />
      ) : status === 'succeeded' ? (
        <>
          <CheckCircle2 className="w-16 h-16 mx-auto mb-6" style={{ color: 'var(--accent)' }} />
          <h1 className="text-2xl font-black uppercase mb-4" style={{ color: 'var(--text-primary)' }}>Uplata uspješna</h1>
          <p className="mb-8" style={{ color: 'var(--text-secondary)' }}>Vaš oglas je sada istaknut.</p>
          <Link to={adId ? '/moji-oglasi' : '/'} className="inline-block h-14 px-8 rounded-2xl font-black uppercase text-xs" style={{ backgroundColor: 'var(--accent)', color: 'white' }}>Moji oglasi</Link>
        </>
      ) : (
        <>
          <h1 className="text-2xl font-black uppercase mb-4" style={{ color: 'var(--text-primary)' }}>Uplata</h1>
          <p className="mb-8" style={{ color: 'var(--text-secondary)' }}>{status === 'pending' ? 'Čekamo potvrdu...' : 'Nije moguće potvrditi status. Provjerite Moji oglasi.'}</p>
          <Link to="/moji-oglasi" className="inline-block h-14 px-8 rounded-2xl font-black uppercase text-xs" style={{ backgroundColor: 'var(--accent)', color: 'white' }}>Moji oglasi</Link>
        </>
      )}
    </div>
  );
};
