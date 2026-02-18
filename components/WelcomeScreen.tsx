import React, { useState, useEffect } from 'react';
import { X, Search, ImageIcon, MessageCircle } from 'lucide-react';

const WELCOME_KEY = 'povezi_welcome_seen';

export const WelcomeScreen: React.FC = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(WELCOME_KEY) !== '1') setVisible(true);
    } catch {
      setVisible(false);
    }
  }, []);

  const close = () => {
    try {
      localStorage.setItem(WELCOME_KEY, '1');
    } catch {}
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[3000] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.75)' }}
      role="dialog"
      aria-label="Dobrodošli"
    >
      <div
        className="max-w-md w-full rounded-[24px] border p-8 shadow-2xl animate-slide-up"
        style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-start mb-6">
          <h2 className="text-lg font-black uppercase tracking-tight" style={{ color: 'var(--text-primary)' }}>
            Dobrodošli na Poveži.ME
          </h2>
          <button
            type="button"
            onClick={close}
            className="p-2 rounded-xl transition-colors hover:opacity-80"
            style={{ color: 'var(--text-secondary)' }}
            aria-label="Zatvori"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
          Kupujte i prodajte brzo i sigurno. Evo kako:
        </p>
        <ul className="space-y-4 mb-8">
          <li className="flex items-start gap-3">
            <span className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'var(--accent)', color: 'white' }}>
              <Search className="w-5 h-5" />
            </span>
            <div>
              <span className="font-bold text-sm block mb-0.5" style={{ color: 'var(--text-primary)' }}>Traži oglase</span>
              <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Pretražuj po kategorijama, cijeni, lokaciji i mnogo drugih filtera (marka, model, godište, gorivo, itd.).</span>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <span className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'var(--accent)', color: 'white' }}>
              <ImageIcon className="w-5 h-5" />
            </span>
            <div>
              <span className="font-bold text-sm block mb-0.5" style={{ color: 'var(--text-primary)' }}>Klikni na oglas</span>
              <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Pogledaj detalje i kontaktiraj prodavca (telefon, poruka, Viber, WhatsApp).</span>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <span className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'var(--accent)', color: 'white' }}>
              <MessageCircle className="w-5 h-5" />
            </span>
            <div>
              <span className="font-bold text-sm block mb-0.5" style={{ color: 'var(--text-primary)' }}>Objavi oglas</span>
              <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Objavi oglas u par koraka. Prijava nije obavezna. Oglas će biti vidljiv nakon odobrenja administratora (zbog provjere sadržaja).</span>
            </div>
          </li>
        </ul>
        <button
          type="button"
          onClick={close}
          className="w-full h-14 rounded-2xl font-black uppercase text-xs text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: 'var(--accent)' }}
        >
          Razumijem
        </button>
      </div>
    </div>
  );
};
