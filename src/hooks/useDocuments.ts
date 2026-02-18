'use client';

import { useState, useCallback } from 'react';
import { API_ENDPOINTS } from '@/lib/constants';
import type { DocumentResource, LongRunningOperation } from '@/types/gemini';

interface UseDocumentsOptions {
  dataStoreId: string | null;
  pageSize?: number;
}

export function useDocuments({ dataStoreId, pageSize = 20 }: UseDocumentsOptions) {
  const [documents, setDocuments] = useState<DocumentResource[]>([]);
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [prevPageTokens, setPrevPageTokens] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [operation, setOperation] = useState<LongRunningOperation | null>(null);

  const fetchDocuments = useCallback(
    async (pageToken?: string) => {
      if (!dataStoreId) return;

      setIsLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({ dataStoreId, pageSize: String(pageSize) });
        if (pageToken) params.set('pageToken', pageToken);

        const response = await fetch(`${API_ENDPOINTS.DOCUMENTS}?${params}`);
        if (!response.ok) throw new Error('Failed to fetch documents');

        const data = await response.json();
        setDocuments(data.documents || []);
        setNextPageToken(data.nextPageToken || null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    },
    [dataStoreId, pageSize],
  );

  const nextPage = useCallback(() => {
    if (!nextPageToken) return;
    setPrevPageTokens((prev) => [...prev, '']); // store current position marker
    fetchDocuments(nextPageToken);
  }, [nextPageToken, fetchDocuments]);

  const prevPage = useCallback(() => {
    if (prevPageTokens.length === 0) return;
    const tokens = [...prevPageTokens];
    tokens.pop();
    setPrevPageTokens(tokens);
    const token = tokens[tokens.length - 1];
    fetchDocuments(token || undefined);
  }, [prevPageTokens, fetchDocuments]);

  const createDoc = useCallback(
    async (document: DocumentResource, documentId?: string) => {
      if (!dataStoreId) return;

      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(API_ENDPOINTS.DOCUMENTS, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dataStoreId, document, documentId }),
        });

        if (!response.ok) throw new Error('Failed to create document');

        await fetchDocuments();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    },
    [dataStoreId, fetchDocuments],
  );

  const deleteDoc = useCallback(
    async (documentName: string) => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `${API_ENDPOINTS.DOCUMENTS}?name=${encodeURIComponent(documentName)}`,
          { method: 'DELETE' },
        );

        if (!response.ok) throw new Error('Failed to delete document');

        await fetchDocuments();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    },
    [fetchDocuments],
  );

  const importDocs = useCallback(
    async (source: { gcsSource?: { inputUris: string[] }; bigquerySource?: { projectId: string; datasetId: string; tableId: string } }, reconciliationMode?: string) => {
      if (!dataStoreId) return;

      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`${API_ENDPOINTS.DOCUMENTS}?action=import`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            dataStoreId,
            ...source,
            ...(reconciliationMode && { reconciliationMode }),
          }),
        });

        if (!response.ok) throw new Error('Failed to import documents');

        const result: LongRunningOperation = await response.json();
        setOperation(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    },
    [dataStoreId],
  );

  const purgeDocs = useCallback(
    async (filter: string) => {
      if (!dataStoreId) return;

      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`${API_ENDPOINTS.DOCUMENTS}?action=purge`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dataStoreId, filter }),
        });

        if (!response.ok) throw new Error('Failed to purge documents');

        const result: LongRunningOperation = await response.json();
        setOperation(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    },
    [dataStoreId],
  );

  return {
    documents,
    nextPageToken,
    hasPrevPage: prevPageTokens.length > 0,
    isLoading,
    error,
    operation,
    fetchDocuments,
    nextPage,
    prevPage,
    createDoc,
    deleteDoc,
    importDocs,
    purgeDocs,
  };
}
