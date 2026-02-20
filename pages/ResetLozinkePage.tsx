import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { getApiBase } from '../api';

const API_BASE = getApiBase();

export const ResetLozinkePage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirm) {
      setError('Lozinke se ne podudaraju.');
      return;
    }
    if (password.length < 6) {
      setError('Lozinka min 6 znakova.');
      return;
    }
    setLoading(true);
    fetch(`${API_BASE}/auth/reset-password`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, newPassword: password }) })
      .then((res) => res.json())
      .then((data: { message?: string; error?: string }) => {
        setLoading(false);
        if (data.error) setError(data.error);
        else setDone(true);
      })
      .catch(() => {
        setLoading(false);
        setError('Greška u mreži.');
      });
  };

  if (!token) {
    return (
      <div className="max-w-md mx-auto px-4 py-24 text-center">
        <p style={{ color: 'var(--text-secondary)' }}>Link za reset nije ispravan.</p>
        <Link to="/zaboravljena-lozinka" style={{ color: 'var(--accent)' }}>Zatražite novi</Link>.
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 py-24">
      <h1 className="text-2xl font-black uppercase mb-6" style={{ color: 'var(--text-primary)' }}>Nova lozinka</h1>
      {done ? (
        <p className="mb-6" style={{ color: 'var(--text-secondary)' }}>Lozinka je promijenjena. Možete se prijaviti.</p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Nova lozinka (min 6)" required minLength={6} className="w-full h-14 rounded-2xl px-4 border outline-none" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }} />
          <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Ponovi lozinku" required className="w-full h-14 rounded-2xl px-4 border outline-none" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }} />
          <button type="submit" disabled={loading} className="w-full h-14 rounded-2xl font-black uppercase text-xs" style={{ backgroundColor: 'var(--accent)', color: 'white' }}>{loading ? 'Spremam...' : 'Spremi lozinku'}</button>
        </form>
      )}
      <Link to="/prijava" className="inline-block mt-6 text-[10px] font-black uppercase" style={{ color: 'var(--accent)' }}>← Prijava</Link>
    </div>
  );
};
