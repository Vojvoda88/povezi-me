import { getApiBase } from '../../api';
import { apiFetch } from '../../lib/api/client';
import type { AdsQuery, AdsResponse } from './types';

const API_BASE = getApiBase();

// Niskonivojski API wrapper za /api/ads endpoint.
// Ne mapira na Ad tip – to radi mappers sloj.
export const fetchAdsApi = async (query: AdsQuery, signal?: AbortSignal): Promise<AdsResponse> => {
  const q = { ...query };
  const queryString = new URLSearchParams(q).toString();
  const url = `${API_BASE}/ads?${queryString}`;

  const data = await apiFetch<any>(url, { signal });

  const list = Array.isArray(data) ? data : (data?.ads ?? []);
  const total = typeof data?.total === 'number' ? data.total : list.length;

  return {
    ads: list || [],
    total,
  };
};

