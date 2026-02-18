'use client';

import { useState, useCallback } from 'react';
import { API_ENDPOINTS } from '@/lib/constants';
import type { RecommendResult } from '@/types/gemini';

interface UseRecommendationsOptions {
  dataStoreId: string | null;
  userPseudoId?: string;
}

export function useRecommendations({ dataStoreId, userPseudoId }: UseRecommendationsOptions) {
  const [results, setResults] = useState<RecommendResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRecommendations = useCallback(
    async (eventType: string, documentIds?: string[], pageSize?: number) => {
      if (!dataStoreId || !userPseudoId) return;

      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(API_ENDPOINTS.RECOMMEND, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            dataStoreId,
            eventType,
            userPseudoId,
            documentIds,
            pageSize: pageSize || 5,
          }),
        });

        if (!response.ok) {
          throw new Error('Recommendation request failed');
        }

        const data = await response.json();
        setResults(data.results || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    },
    [dataStoreId, userPseudoId],
  );

  const clear = useCallback(() => {
    setResults([]);
    setError(null);
  }, []);

  return {
    results,
    isLoading,
    error,
    fetchRecommendations,
    clear,
  };
}
