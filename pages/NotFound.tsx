import React from 'react';
import { Link } from 'react-router-dom';

export const NotFound: React.FC = () => (
  <div className="max-w-2xl mx-auto px-4 py-24 text-center">
    <h1 className="text-4xl font-black uppercase tracking-tight mb-4" style={{ color: 'var(--text-primary)' }}>404</h1>
    <p className="text-lg font-bold mb-8" style={{ color: 'var(--text-secondary)' }}>Stranica nije pronađena</p>
    <Link to="/" className="inline-block h-14 px-8 rounded-2xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-2" style={{ backgroundColor: 'var(--accent)', color: 'white' }}>← Nazad na početnu</Link>
  </div>
);
