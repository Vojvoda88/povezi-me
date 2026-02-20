import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { getApiBase } from '../api';

const API_BASE = getApiBase();

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    fetch(`${API_BASE}/auth/forgot-password`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) })
      .then((res) => res.json())
      .then((data: { message?: string; error?: string }) => {
        setLoading(false);
        if (data.error) setError(data.error);
        else setSent(true);
      })
      .catch(() => {
        setLoading(false);
        setError('Greška u mreži.');
      });
  };

  return (
    <div className="max-w-md mx-auto px-4 py-24">
      <h1 className="text-2xl font-black uppercase mb-6" style={{ color: 'var(--text-primary)' }}>Zaboravljena lozinka</h1>
      {sent ? (
        <p className="mb-6" style={{ color: 'var(--text-secondary)' }}>Ako postoji nalog s tim emailom, poslat ćemo link za reset.</p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" required className="w-full h-14 rounded-2xl px-4 border outline-none" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }} />
          <button type="submit" disabled={loading} className="w-full h-14 rounded-2xl font-black uppercase text-xs" style={{ backgroundColor: 'var(--accent)', color: 'white' }}>{loading ? 'Šaljem...' : 'Pošalji link'}</button>
        </form>
      )}
      <Link to="/prijava" className="inline-block mt-6 text-[10px] font-black uppercase" style={{ color: 'var(--accent)' }}>← Nazad na prijavu</Link>
    </div>
  );
};
