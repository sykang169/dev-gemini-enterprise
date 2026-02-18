'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { API_ENDPOINTS } from '@/lib/constants';
import type { QuerySuggestion } from '@/types/gemini';

interface UseAutocompleteOptions {
  dataStoreId: string | null;
  debounceMs?: number;
}

export function useAutocomplete({ dataStoreId, debounceMs = 300 }: UseAutocompleteOptions) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<QuerySuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchSuggestions = useCallback(
    async (q: string) => {
      if (!dataStoreId || !q.trim()) {
        setSuggestions([]);
        return;
      }

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setIsLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({ query: q, dataStoreId });
        const response = await fetch(`${API_ENDPOINTS.AUTOCOMPLETE}?${params}`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error('Autocomplete request failed');
        }

        const data = await response.json();
        if (!controller.signal.aborted) {
          setSuggestions(data.suggestions || []);
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        if (!controller.signal.aborted) {
          setError(err instanceof Error ? err.message : 'Unknown error');
          setSuggestions([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    },
    [dataStoreId],
  );

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);

    if (!query.trim()) {
      setSuggestions([]);
      setIsLoading(false);
      return;
    }

    timerRef.current = setTimeout(() => {
      fetchSuggestions(query);
    }, debounceMs);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [query, debounceMs, fetchSuggestions]);

  const clear = useCallback(() => {
    setSuggestions([]);
    setQuery('');
  }, []);

  return {
    query,
    setQuery,
    suggestions,
    isLoading,
    error,
    clear,
  };
}
