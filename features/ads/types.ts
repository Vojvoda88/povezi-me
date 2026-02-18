import type { Ad } from '../../types';

// Re-export glavnog Ad tipa za ads feature modul
export type { Ad };

// Minimalni opis query parametara za /api/ads.
// Backend prihvata dinamične string parametre (filtri, paginacija),
// pa ovdje koristimo fleksibilan tip sa string ključevima.
export interface AdsQuery {
  [key: string]: string;
}

export interface AdsResponse {
  ads: any[];
  total: number;
}

