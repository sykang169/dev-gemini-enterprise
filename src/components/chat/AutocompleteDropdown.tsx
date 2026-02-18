'use client';

import { useState, useEffect, useRef, useCallback, type KeyboardEvent } from 'react';
import { useAutocomplete } from '@/hooks/useAutocomplete';

interface AutocompleteDropdownProps {
  dataStoreId: string | null;
  inputValue: string;
  onSelect: (suggestion: string) => void;
  visible?: boolean;
}

export default function AutocompleteDropdown({
  dataStoreId,
  inputValue,
  onSelect,
  visible = true,
}: AutocompleteDropdownProps) {
  const { suggestions, setQuery, isLoading, clear } = useAutocomplete({
    dataStoreId,
  });
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const listRef = useRef<HTMLUListElement>(null);

  // Sync input value to autocomplete query
  useEffect(() => {
    if (visible && dataStoreId) {
      setQuery(inputValue);
    } else {
      clear();
    }
  }, [inputValue, visible, dataStoreId, setQuery, clear]);

  // Reset selection when suggestions change
  useEffect(() => {
    setSelectedIndex(-1);
  }, [suggestions]);

  const handleSelect = useCallback(
    (suggestion: string) => {
      onSelect(suggestion);
      clear();
    },
    [onSelect, clear],
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (suggestions.length === 0) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev < suggestions.length - 1 ? prev + 1 : 0,
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev > 0 ? prev - 1 : suggestions.length - 1,
          );
          break;
        case 'Enter':
          if (selectedIndex >= 0 && suggestions[selectedIndex]?.suggestion) {
            e.preventDefault();
            handleSelect(suggestions[selectedIndex].suggestion!);
          }
          break;
        case 'Escape':
          clear();
          break;
      }
    },
    [suggestions, selectedIndex, handleSelect, clear],
  );

  if (!visible || !dataStoreId || suggestions.length === 0) {
    return null;
  }

  return (
    <div
      className="absolute bottom-full left-0 right-0 z-50 mb-1"
      onKeyDown={handleKeyDown}
    >
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <ul
          ref={listRef}
          className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800"
          role="listbox"
        >
          {isLoading && suggestions.length === 0 && (
            <li className="px-4 py-2 text-sm text-gray-400">
              <span className="inline-block h-3 w-3 animate-spin rounded-full border border-gray-300 border-t-blue-600" />
              <span className="ml-2">검색 중...</span>
            </li>
          )}
          {suggestions.map((s, index) => (
            <li
              key={`${s.suggestion}-${index}`}
              role="option"
              aria-selected={index === selectedIndex}
              className={`flex cursor-pointer items-center gap-2 px-4 py-2.5 text-sm transition-colors ${
                index === selectedIndex
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                  : 'text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-750'
              }`}
              onClick={() => s.suggestion && handleSelect(s.suggestion)}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="h-4 w-4 shrink-0 text-gray-400"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
                />
              </svg>
              <span>{s.suggestion}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
