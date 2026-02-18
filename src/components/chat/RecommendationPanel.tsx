'use client';

import { useState, useEffect } from 'react';
import { useRecommendations } from '@/hooks/useRecommendations';
import Spinner from '@/components/ui/Spinner';

interface RecommendationPanelProps {
  dataStoreId: string | null;
  userPseudoId?: string;
  onDocumentClick?: (documentId: string, uri?: string) => void;
}

export default function RecommendationPanel({
  dataStoreId,
  userPseudoId,
  onDocumentClick,
}: RecommendationPanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { results, isLoading, error, fetchRecommendations } = useRecommendations({
    dataStoreId,
    userPseudoId,
  });

  // Fetch recommendations on mount when dataStoreId is available
  useEffect(() => {
    if (dataStoreId && userPseudoId) {
      fetchRecommendations('view-home-page');
    }
  }, [dataStoreId, userPseudoId, fetchRecommendations]);

  if (!dataStoreId || !userPseudoId) return null;
  if (!isLoading && results.length === 0 && !error) return null;

  return (
    <div className="border-l border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900">
      {/* Header */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
      >
        <div className="flex items-center gap-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="h-4 w-4"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z"
            />
          </svg>
          관련 문서
        </div>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
          className={`h-4 w-4 transition-transform ${isCollapsed ? '' : 'rotate-180'}`}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {/* Content */}
      {!isCollapsed && (
        <div className="px-4 pb-4">
          {isLoading && (
            <div className="flex justify-center py-4">
              <Spinner size="sm" />
            </div>
          )}

          {error && (
            <p className="py-2 text-xs text-red-500">{error}</p>
          )}

          <div className="space-y-2">
            {results.map((result, index) => {
              const doc = result.document;
              const title =
                doc?.derivedStructData?.title as string ||
                doc?.id ||
                `문서 ${index + 1}`;
              const snippet =
                doc?.derivedStructData?.snippet as string ||
                doc?.content?.uri ||
                '';
              const uri = doc?.content?.uri;

              return (
                <button
                  key={result.id || index}
                  onClick={() => {
                    if (doc?.id) {
                      onDocumentClick?.(doc.id, uri);
                    }
                  }}
                  className="w-full rounded-lg border border-gray-200 bg-white p-3 text-left transition-colors hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-gray-600 dark:hover:bg-gray-750"
                >
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200 line-clamp-1">
                    {title}
                  </p>
                  {snippet && (
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                      {snippet}
                    </p>
                  )}
                  {uri && (
                    <p className="mt-1 text-xs text-blue-500 truncate">{uri}</p>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
