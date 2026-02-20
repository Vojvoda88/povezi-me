import React from 'react';
import { Link } from 'react-router-dom';

export const LegalPage: React.FC<{ title: string; content: React.ReactNode }> = ({ title, content }) => (
  <div className="max-w-3xl mx-auto px-4 py-12">
    <h1 className="text-2xl font-black uppercase tracking-tight mb-8" style={{ color: 'var(--text-primary)' }}>{title}</h1>
    <div className="prose prose-invert max-w-none text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{content}</div>
    <Link to="/" className="inline-block mt-8 text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--accent)' }}>← Nazad na početnu</Link>
  </div>
);
