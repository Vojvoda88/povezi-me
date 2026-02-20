import React from 'react';
import { Link } from 'react-router-dom';
import { Logo } from './Logo';

export const Footer = () => (
  <footer className="flex-shrink-0 pt-3 pb-14 px-3 lg:py-6 lg:px-4 lg:pb-6 text-center flex flex-col items-center border-t transition-colors" style={{ backgroundColor: 'var(--bg-page)', borderColor: 'var(--border-subtle)' }}>
    <div className="flex flex-col items-center gap-2">
      <Logo variant="vertical" />
    </div>
    <nav className="flex flex-wrap justify-center gap-2 lg:gap-3 mt-2 lg:mt-3">
      <Link to="/pravila" className="text-[9px] lg:text-[10px] font-bold uppercase tracking-widest hover:underline" style={{ color: 'var(--text-secondary)' }}>Pravila korištenja</Link>
      <Link to="/privatnost" className="text-[9px] lg:text-[10px] font-bold uppercase tracking-widest hover:underline" style={{ color: 'var(--text-secondary)' }}>Politika privatnosti</Link>
    </nav>
    <p className="text-[8px] lg:text-[9px] mt-2 lg:mt-4 uppercase tracking-[0.1em] lg:tracking-[0.15em] font-bold opacity-60" style={{ color: 'var(--text-secondary)' }}>© 2024 Poveži.ME Premium Marketplace</p>
  </footer>
);
