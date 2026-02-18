import { useCallback, useRef, useState } from 'react';
import { DEMO_ADS as INITIAL_ADS } from '../constants';
import type { Ad } from '../types';
import type { AdsQuery } from '../features/ads/types';
import { fetchAdsApi } from '../features/ads/api';
import { mapApiAdToAd } from '../features/ads/mappers';

const ADS_LIMIT = 24;

export interface UseAdsState {
  ads: Ad[];
  adsLoading: boolean;
  adsLoadingMore: boolean;
  adsError: string | null;
  adsAreFallback: boolean;
  adsPage: number;
  adsTotal: number;
  hasMore: boolean;
}

export interface UseAdsController extends UseAdsState {
  fetchFirstPage: (baseQuery: AdsQuery) => void;
  loadMore: () => void;
  refresh: () => void;
  prependAd: (ad: Ad) => void;
}

export const useAds = (): UseAdsController => {
  const [ads, setAds] = useState<Ad[]>(INITIAL_ADS);
  const [adsLoading, setAdsLoading] = useState(true);
  const [adsLoadingMore, setAdsLoadingMore] = useState(false);
  const [adsError, setAdsError] = useState<string | null>(null);
  const [adsAreFallback, setAdsAreFallback] = useState(true); // true when showing INITIAL_ADS (empty or error)
  const [adsPage, setAdsPage] = useState(1);
  const [adsTotal, setAdsTotal] = useState(0);

  const lastAdsQueryRef = useRef<string | null>(null);
  const baseQueryRef = useRef<AdsQuery | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const runFetch = useCallback(
    async (page: number, append: boolean, query: AdsQuery) => {
      const key = JSON.stringify(query);
      if (!append && lastAdsQueryRef.current === key && page === 1) {
        // Isti osnovni query i prva strana već učitana – nema potrebe za novim pozivom
        return;
      }
      lastAdsQueryRef.current = key;
      baseQueryRef.current = query;

      if (!append && abortRef.current) {
        abortRef.current.abort();
        abortRef.current = null;
      }
      const controller = new AbortController();
      abortRef.current = controller;

      if (append) setAdsLoadingMore(true);
      else {
        setAdsError(null);
        setAdsLoading(true);
      }

      try {
        const q: AdsQuery = {
          ...query,
          page: String(page),
          limit: String(ADS_LIMIT),
        };
        const { ads: rawAds, total } = await fetchAdsApi(q, controller.signal);
        const mapped = (rawAds as any[])
          .map((raw, index) => {
            try {
              return mapApiAdToAd(raw);
            } catch (e) {
              console.error('[useAds] mapApiAdToAd failed for item', index, e, raw);
              return null;
            }
          })
          .filter((ad): ad is Ad => ad != null);

        if (mapped.length === 0 && !append) {
          setAds([]);
          setAdsAreFallback(false);
        } else {
          setAdsAreFallback(false);
          if (append) {
            setAds(prev => [...prev, ...mapped]);
          } else {
            setAds(mapped);
          }
        }
        setAdsPage(page);
        setAdsTotal(total);
      } catch (error) {
        if ((error as any)?.name === 'AbortError') {
          return;
        }
        console.error('[useAds] failed to load ads', error);
        if (!append) {
          setAds(prev => (prev.length === 0 ? INITIAL_ADS : prev));
          setAdsAreFallback(true);
          setAdsError('Oglasi se trenutno ne mogu učitati. Prikazujemo primjer oglasa.');
        }
      } finally {
        if (abortRef.current === controller) {
          abortRef.current = null;
        }
        setAdsLoading(false);
        setAdsLoadingMore(false);
      }
    },
    [],
  );

  const fetchFirstPage = useCallback(
    (baseQuery: AdsQuery) => {
      runFetch(1, false, baseQuery);
    },
    [runFetch],
  );

  const loadMore = useCallback(() => {
    if (adsLoadingMore) return;
    if (ads.length >= adsTotal) return;
    const base = baseQueryRef.current;
    if (!base) return;
    runFetch(adsPage + 1, true, base);
  }, [adsLoadingMore, ads.length, adsTotal, adsPage, runFetch]);

  const refresh = useCallback(() => {
    const base = baseQueryRef.current;
    if (!base) return;
    runFetch(1, false, base);
  }, [runFetch]);

  const prependAd = useCallback((ad: Ad) => {
    setAds(prev => [ad, ...prev]);
    setAdsAreFallback(false);
    setAdsTotal(prev => prev + 1);
  }, []);

  const hasMore = !adsError && !adsAreFallback && adsTotal > 0 && ads.length < adsTotal;

  return {
    ads,
    adsLoading,
    adsLoadingMore,
    adsError,
    adsAreFallback,
    adsPage,
    adsTotal,
    hasMore,
    fetchFirstPage,
    loadMore,
    refresh,
    prependAd,
  };
};

