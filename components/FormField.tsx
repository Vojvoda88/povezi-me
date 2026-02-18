import React from 'react';

interface FormFieldProps {
  label: string;
  name?: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  name,
  error,
  required,
  children,
  className = '',
}) => (
  <div className={className}>
    <label
      htmlFor={name}
      className="block text-[10px] font-black uppercase tracking-widest mb-2"
      style={{ color: 'var(--text-secondary)' }}
    >
      {label}
      {required && <span className="text-red-400 ml-0.5">*</span>}
    </label>
    {children}
    {error && <p className="mt-1.5 text-xs text-red-400">{error}</p>}
  </div>
);
