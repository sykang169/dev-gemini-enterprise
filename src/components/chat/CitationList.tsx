'use client';

import type { Citation, Reference } from '@/types/gemini';

interface CitationListProps {
  citations: Citation[];
  references?: Reference[];
  onSourceClick?: (documentId: string, uri?: string) => void;
}

export default function CitationList({ citations, references, onSourceClick }: CitationListProps) {
  if (!citations || citations.length === 0) return null;

  const uniqueSources = new Map<string, { uri: string; title: string }>();

  for (const citation of citations) {
    if (citation.sources) {
      for (const source of citation.sources) {
        const uri = source.uri || '';
        if (uri && !uniqueSources.has(uri)) {
          uniqueSources.set(uri, {
            uri,
            title: source.title || uri,
          });
        }
      }
    }
  }

  // Also include references
  if (references) {
    for (const ref of references) {
      const uri = ref.uri || '';
      if (uri && !uniqueSources.has(uri)) {
        uniqueSources.set(uri, {
          uri,
          title: ref.title || uri,
        });
      }
    }
  }

  if (uniqueSources.size === 0) return null;

  const sources = Array.from(uniqueSources.values());

  return (
    <div className="mt-3 border-t border-gray-200 pt-2 dark:border-gray-700">
      <p className="mb-1 text-xs font-medium text-gray-500 dark:text-gray-400">Sources</p>
      <div className="flex flex-wrap gap-2">
        {sources.map((source, i) => (
          <a
            key={i}
            href={source.uri}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => onSourceClick?.(source.uri, source.uri)}
            className="inline-flex items-center gap-1 rounded-full bg-gray-200 px-2.5 py-1 text-xs text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-3 w-3">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
            </svg>
            <span className="max-w-[150px] truncate">{source.title}</span>
          </a>
        ))}
      </div>
    </div>
  );
}
