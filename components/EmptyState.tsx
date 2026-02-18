import React from 'react';
import { Link } from 'react-router-dom';
import { SearchX, ImageIcon, Heart, MessageCircle, Bell, PlusCircle } from 'lucide-react';

type EmptyVariant = 'no-results' | 'no-ads' | 'no-favorites' | 'no-messages' | 'no-notifications' | 'generic';

interface EmptyStateProps {
  variant: EmptyVariant;
  title?: string;
  description?: string;
  actionLabel?: string;
  actionTo?: string;
  onAction?: () => void;
}

const VARIANTS: Record<EmptyVariant, { icon: React.ReactNode; defaultTitle: string; defaultDescription: string; defaultActionLabel?: string; defaultActionTo?: string }> = {
  'no-results': {
    icon: <SearchX className="w-12 h-12" style={{ color: 'var(--text-secondary)' }} />,
    defaultTitle: 'Nema rezultata',
    defaultDescription: 'Nijedan oglas ne odgovara filterima. Pokušajte druge kriterije ili očistite filtere.',
    defaultActionLabel: 'Očisti filtere',
    defaultActionTo: '/marketplace',
  },
  'no-ads': {
    icon: <ImageIcon className="w-12 h-12" style={{ color: 'var(--text-secondary)' }} />,
    defaultTitle: 'Nema oglasa',
    defaultDescription: 'Nemate objavljenih oglasa. Objavite prvi oglas i dosegnite kupce.',
    defaultActionLabel: 'Objavi oglas',
    defaultActionTo: '/objavi',
  },
  'no-favorites': {
    icon: <Heart className="w-12 h-12" style={{ color: 'var(--text-secondary)' }} />,
    defaultTitle: 'Nema sačuvanih',
    defaultDescription: 'Još niste sačuvali nijedan oglas. Pregledajte oglase i dodajte ih u favoriti.',
    defaultActionLabel: 'Pregledaj oglase',
    defaultActionTo: '/marketplace',
  },
  'no-messages': {
    icon: <MessageCircle className="w-12 h-12" style={{ color: 'var(--text-secondary)' }} />,
    defaultTitle: 'Nema poruka',
    defaultDescription: 'Nemate razgovora. Kada neko pošalje poruku na vaš oglas, ovdje će se pojaviti.',
    defaultActionLabel: 'Moji oglasi',
    defaultActionTo: '/moji-oglasi',
  },
  'no-notifications': {
    icon: <Bell className="w-12 h-12" style={{ color: 'var(--text-secondary)' }} />,
    defaultTitle: 'Nema obavještenja',
    defaultDescription: 'Nemate novih obavještenja.',
  },
  generic: {
    icon: <ImageIcon className="w-12 h-12" style={{ color: 'var(--text-secondary)' }} />,
    defaultTitle: 'Nema podataka',
    defaultDescription: 'Trenutno nema sadržaja za prikaz.',
  },
};

export const EmptyState: React.FC<EmptyStateProps> = ({
  variant,
  title,
  description,
  actionLabel,
  actionTo,
  onAction,
}) => {
  const v = VARIANTS[variant];
  const finalTitle = title ?? v.defaultTitle;
  const finalDescription = description ?? v.defaultDescription;
  const finalActionLabel = actionLabel ?? v.defaultActionLabel;
  const finalActionTo = actionTo ?? v.defaultActionTo;

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="mb-6 opacity-80">{v.icon}</div>
      <h3 className="text-lg font-black uppercase tracking-tight mb-2" style={{ color: 'var(--text-primary)' }}>{finalTitle}</h3>
      <p className="text-sm mb-8 max-w-sm" style={{ color: 'var(--text-secondary)' }}>{finalDescription}</p>
      {(finalActionLabel && (finalActionTo || onAction)) && (
        finalActionTo ? (
          <Link
            to={finalActionTo}
            className="inline-flex items-center gap-2 h-12 px-6 rounded-2xl font-black uppercase text-xs text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: 'var(--accent)' }}
          >
            <PlusCircle className="w-4 h-4" /> {finalActionLabel}
          </Link>
        ) : (
          <button
            type="button"
            onClick={onAction}
            className="inline-flex items-center gap-2 h-12 px-6 rounded-2xl font-black uppercase text-xs text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: 'var(--accent)' }}
          >
            {finalActionLabel}
          </button>
        )
      )}
    </div>
  );
};
