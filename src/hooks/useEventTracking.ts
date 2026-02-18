'use client';

import { useRef, useCallback, useEffect } from 'react';
import { API_ENDPOINTS } from '@/lib/constants';
import type { UserEventInput } from '@/types/gemini';

interface UseEventTrackingOptions {
  dataStoreId: string | null;
  userPseudoId?: string;
  batchIntervalMs?: number;
  enabled?: boolean;
}

export function useEventTracking({
  dataStoreId,
  userPseudoId,
  batchIntervalMs = 5000,
  enabled = true,
}: UseEventTrackingOptions) {
  const queueRef = useRef<UserEventInput[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const flush = useCallback(async () => {
    if (!dataStoreId || !userPseudoId || queueRef.current.length === 0) return;

    const events = [...queueRef.current];
    queueRef.current = [];

    for (const event of events) {
      try {
        await fetch(API_ENDPOINTS.USER_EVENTS, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dataStoreId, event }),
        });
      } catch {
        // Non-critical: silently ignore tracking failures
      }
    }
  }, [dataStoreId, userPseudoId]);

  // Set up periodic flush
  useEffect(() => {
    if (!enabled || !dataStoreId || !userPseudoId) return;

    timerRef.current = setInterval(flush, batchIntervalMs);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      // Flush remaining events on unmount
      flush();
    };
  }, [enabled, dataStoreId, userPseudoId, batchIntervalMs, flush]);

  const trackSearch = useCallback(
    (searchQuery: string) => {
      if (!enabled || !dataStoreId || !userPseudoId) return;

      queueRef.current.push({
        eventType: 'search',
        userPseudoId,
        eventTime: new Date().toISOString(),
        searchInfo: { searchQuery },
      });
    },
    [enabled, dataStoreId, userPseudoId],
  );

  const trackViewItem = useCallback(
    (documentId: string, uri?: string) => {
      if (!enabled || !dataStoreId || !userPseudoId) return;

      queueRef.current.push({
        eventType: 'view-item',
        userPseudoId,
        eventTime: new Date().toISOString(),
        documents: [{ id: documentId, ...(uri && { uri }) }],
      });
    },
    [enabled, dataStoreId, userPseudoId],
  );

  const trackMediaPlay = useCallback(
    (documentId: string, uri?: string) => {
      if (!enabled || !dataStoreId || !userPseudoId) return;

      queueRef.current.push({
        eventType: 'media-play',
        userPseudoId,
        eventTime: new Date().toISOString(),
        documents: [{ id: documentId, ...(uri && { uri }) }],
      });
    },
    [enabled, dataStoreId, userPseudoId],
  );

  return {
    trackSearch,
    trackViewItem,
    trackMediaPlay,
    flush,
  };
}
