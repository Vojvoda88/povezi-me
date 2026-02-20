import React from 'react';

export const Logo = ({ variant = 'horizontal' }: { variant?: 'horizontal' | 'vertical' }) => {
  const icon = (
    <img src="/logo-icon.svg" alt="" className="h-9 sm:h-10 lg:h-11 w-9 sm:w-10 lg:w-11 object-contain shrink-0" />
  );
  const text = (
    <span className="font-bold tracking-tight whitespace-nowrap" style={{ color: 'var(--text-primary)' }}>
      Poveži<span style={{ color: 'var(--accent)' }}>.ME</span>
    </span>
  );
  if (variant === 'vertical') {
    return (
      <div className="flex flex-col items-center gap-2">
        {icon}
        {text}
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2 shrink-0">
      {icon}
      <div className="flex flex-col justify-center leading-tight">
        <span className="text-base sm:text-lg lg:text-xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
          Poveži<span style={{ color: 'var(--accent)' }}>.ME</span>
        </span>
        <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest hidden sm:block" style={{ color: 'var(--text-secondary)' }}>
          Premium Marketplace
        </span>
      </div>
    </div>
  );
};
