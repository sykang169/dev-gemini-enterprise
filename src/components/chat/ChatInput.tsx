'use client';

import { useState, useRef, useCallback, useEffect, type KeyboardEvent, type FormEvent } from 'react';
import { MAX_MESSAGE_LENGTH, GEMINI_MODELS, API_ENDPOINTS } from '@/lib/constants';
import type { DataStore, GeminiModel, Agent } from '@/types/gemini';

interface ChatInputProps {
  onSend: (message: string) => void;
  onFileClick: () => void;
  disabled?: boolean;
  isLoading?: boolean;
  dataStores?: string[];
  activeAgent?: string | null;
  agents?: Agent[];
  enableWebGrounding?: boolean;
  selectedModel?: GeminiModel;
  onDataStoresChange?: (stores: string[]) => void;
  onSelectAgent?: (agentId: string | null) => void;
  onWebGroundingChange?: (enabled: boolean) => void;
  onModelChange?: (model: GeminiModel) => void;
}

export default function ChatInput({
  onSend,
  onFileClick,
  disabled,
  isLoading,
  dataStores = [],
  activeAgent = null,
  agents = [],
  enableWebGrounding = false,
  selectedModel = 'auto',
  onDataStoresChange,
  onSelectAgent,
  onWebGroundingChange,
  onModelChange,
}: ChatInputProps) {
  const [input, setInput] = useState('');
  const [showToolsDropdown, setShowToolsDropdown] = useState(false);
  const [showConnectorDropdown, setShowConnectorDropdown] = useState(false);
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [availableDataStores, setAvailableDataStores] = useState<DataStore[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const toolsDropdownRef = useRef<HTMLDivElement>(null);
  const connectorDropdownRef = useRef<HTMLDivElement>(null);
  const modelDropdownRef = useRef<HTMLDivElement>(null);

  // Fetch available data stores from API
  useEffect(() => {
    fetch(API_ENDPOINTS.DATASTORES)
      .then((res) => res.json())
      .then((data) => {
        if (data.dataStores) setAvailableDataStores(data.dataStores);
      })
      .catch(() => {});
  }, []);

  // Outside click detection for dropdowns
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        toolsDropdownRef.current &&
        !toolsDropdownRef.current.contains(event.target as Node)
      ) {
        setShowToolsDropdown(false);
      }
      if (
        connectorDropdownRef.current &&
        !connectorDropdownRef.current.contains(event.target as Node)
      ) {
        setShowConnectorDropdown(false);
      }
      if (
        modelDropdownRef.current &&
        !modelDropdownRef.current.contains(event.target as Node)
      ) {
        setShowModelDropdown(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSubmit = useCallback(
    (e?: FormEvent) => {
      e?.preventDefault();
      const trimmed = input.trim();
      if (!trimmed || disabled) return;
      onSend(trimmed);
      setInput('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    },
    [input, disabled, onSend],
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit],
  );

  const handleInput = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  }, []);

  // Tool toggles
  const isDataStoresActive = dataStores.length > 0;

  const toggleSingleDataStore = useCallback((storeName: string) => {
    if (!onDataStoresChange) return;
    if (dataStores.includes(storeName)) {
      onDataStoresChange(dataStores.filter((s) => s !== storeName));
    } else {
      onDataStoresChange([...dataStores, storeName]);
    }
  }, [dataStores, onDataStoresChange]);

  const toggleAllDataStores = useCallback(() => {
    if (!onDataStoresChange) return;
    if (isDataStoresActive) {
      onDataStoresChange([]);
    } else {
      onDataStoresChange(availableDataStores.map((s) => s.name));
    }
  }, [isDataStoresActive, availableDataStores, onDataStoresChange]);

  const toggleWebGrounding = useCallback(() => {
    onWebGroundingChange?.(!enableWebGrounding);
  }, [enableWebGrounding, onWebGroundingChange]);

  const toggleAllConnectors = useCallback(() => {
    const allStoreNames = availableDataStores.map((s) => s.name);
    const allStoresActive = allStoreNames.length > 0 && allStoreNames.every((n) => dataStores.includes(n));
    const allActive = allStoresActive && enableWebGrounding;
    if (allActive) {
      onDataStoresChange?.([]);
      onWebGroundingChange?.(false);
    } else {
      if (!enableWebGrounding) onWebGroundingChange?.(true);
      if (!allStoresActive) onDataStoresChange?.(allStoreNames);
    }
  }, [dataStores, availableDataStores, enableWebGrounding, onDataStoresChange, onWebGroundingChange]);

  // Active feature count for indicators
  const activeToolCount = [isDataStoresActive, enableWebGrounding].filter(Boolean).length;

  return (
    <div className="px-4 pb-4 pt-2 sm:px-6 lg:px-8">
      <form
        onSubmit={handleSubmit}
        className="input-container-glow mx-auto flex max-w-3xl items-end gap-2 rounded-2xl border border-gray-200 bg-white px-3 py-2 shadow-lg transition-all dark:border-gray-700 dark:bg-gray-800"
      >
        {/* Attach file button */}
        <button
          type="button"
          onClick={onFileClick}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
          title="Attach file"
          disabled={disabled}
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
        </button>

        {/* Tools dropdown button (only in non-agent mode) */}
        {!activeAgent && (
          <div className="relative" ref={toolsDropdownRef}>
            <button
              type="button"
              onClick={() => {
                setShowToolsDropdown(!showToolsDropdown);
                setShowConnectorDropdown(false);
              }}
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors ${
                activeToolCount > 0
                  ? 'text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/30'
                  : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300'
              }`}
              title="Tools & features"
              disabled={disabled}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75" />
              </svg>
            </button>

            {/* Tools dropdown menu */}
            {showToolsDropdown && (
              <div className="absolute bottom-full left-0 z-50 mb-2 w-64 rounded-xl border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-800">
                <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                  Tools & Features
                </div>

                {/* Search company data */}
                <button
                  type="button"
                  onClick={toggleAllDataStores}
                  className="flex w-full items-center gap-3 px-3 py-2.5 text-sm text-gray-700 transition-colors hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-750"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
                    </svg>
                  </span>
                  <span className="flex-1 text-left">Search company data</span>
                  {isDataStoresActive && (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-4 w-4 text-blue-600 dark:text-blue-400">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                    </svg>
                  )}
                </button>

                {/* Search Google */}
                <button
                  type="button"
                  onClick={toggleWebGrounding}
                  className="flex w-full items-center gap-3 px-3 py-2.5 text-sm text-gray-700 transition-colors hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-750"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-500 dark:bg-red-900/30 dark:text-red-400">
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                  </span>
                  <span className="flex-1 text-left">Search Google</span>
                  {enableWebGrounding && (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-4 w-4 text-blue-600 dark:text-blue-400">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                    </svg>
                  )}
                </button>

                {/* Agents - selecting one opens agent mode */}
                <div className="mx-3 my-1 border-t border-gray-100 dark:border-gray-700" />
                <div className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                  Agents
                </div>
                {agents.map((agent) => {
                  const agentIconBg =
                    agent.agentId === 'deep_research'
                      ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                      : 'bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400';

                  const agentIcon =
                    agent.agentId === 'deep_research' ? (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
                      </svg>
                    );

                  return (
                    <button
                      key={agent.agentId}
                      type="button"
                      onClick={() => {
                        onSelectAgent?.(agent.agentId);
                        setShowToolsDropdown(false);
                      }}
                      className="flex w-full items-center gap-3 px-3 py-2.5 text-sm text-gray-700 transition-colors hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-750"
                    >
                      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${agentIconBg}`}>
                        {agentIcon}
                      </span>
                      <div className="flex-1 text-left">
                        <span>{agent.displayName}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Connector dropdown button */}
        <div className="relative" ref={connectorDropdownRef}>
          <button
            type="button"
            onClick={() => {
              setShowConnectorDropdown(!showConnectorDropdown);
              setShowToolsDropdown(false);
            }}
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors ${
              isDataStoresActive || enableWebGrounding
                ? 'text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/30'
                : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300'
            }`}
            title="Connectors"
            disabled={disabled}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
            </svg>
          </button>

          {/* Connector dropdown menu */}
          {showConnectorDropdown && (
            <div className="absolute bottom-full left-0 z-50 mb-2 w-72 rounded-xl border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-800">
              <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                Connectors
              </div>

              {/* Enable all connectors */}
              {(() => {
                const allStoreNames = availableDataStores.map((s) => s.name);
                const allStoresOn = allStoreNames.length > 0 && allStoreNames.every((n) => dataStores.includes(n));
                const allOn = allStoresOn && enableWebGrounding;
                return (
                  <div className="flex items-center justify-between px-3 py-2.5">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Enable all connectors</span>
                    <button
                      type="button"
                      onClick={toggleAllConnectors}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        allOn ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
                      }`}
                      role="switch"
                      aria-checked={allOn}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          allOn ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                );
              })()}

              <div className="mx-3 border-t border-gray-100 dark:border-gray-700" />

              {/* Google Search connector */}
              <div className="flex items-center justify-between px-3 py-2.5">
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-500 dark:bg-red-900/30 dark:text-red-400">
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                  </span>
                  <span className="text-sm text-gray-700 dark:text-gray-300">Google Search</span>
                </div>
                <button
                  type="button"
                  onClick={toggleWebGrounding}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    enableWebGrounding ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                  role="switch"
                  aria-checked={enableWebGrounding}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      enableWebGrounding ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Data Store connectors */}
              {availableDataStores.map((store) => {
                const isActive = dataStores.includes(store.name);
                return (
                  <div key={store.name} className="flex items-center justify-between px-3 py-2.5">
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
                        </svg>
                      </span>
                      <span className="text-sm text-gray-700 dark:text-gray-300">{store.displayName}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleSingleDataStore(store.name)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        isActive ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
                      }`}
                      role="switch"
                      aria-checked={isActive}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          isActive ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Text input */}
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onInput={handleInput}
          placeholder={activeAgent ? `Ask ${agents.find((a) => a.agentId === activeAgent)?.displayName || 'agent'} anything...` : 'Ask anything, search your data, @mention or /tools'}
          maxLength={MAX_MESSAGE_LENGTH}
          disabled={disabled}
          rows={1}
          className="flex-1 resize-none bg-transparent py-2 text-sm outline-none placeholder:text-gray-400 disabled:opacity-50 dark:text-gray-100 dark:placeholder:text-gray-500"
        />

        {/* Model selector */}
        <div className="relative" ref={modelDropdownRef}>
          <button
            type="button"
            onClick={() => {
              setShowModelDropdown(!showModelDropdown);
              setShowToolsDropdown(false);
              setShowConnectorDropdown(false);
            }}
            className="flex h-9 shrink-0 items-center gap-1 rounded-full border border-gray-200 px-3 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
            disabled={disabled}
          >
            {GEMINI_MODELS.find((m) => m.id === selectedModel)?.label.replace(' (default)', '') || 'Auto'}
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-3 w-3">
              <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
            </svg>
          </button>

          {showModelDropdown && (
            <div className="absolute bottom-full right-0 z-50 mb-2 w-72 rounded-xl border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-800">
              <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                Model
              </div>
              {GEMINI_MODELS.map((model) => (
                <button
                  key={model.id}
                  type="button"
                  onClick={() => {
                    onModelChange?.(model.id as GeminiModel);
                    setShowModelDropdown(false);
                  }}
                  className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm text-gray-700 transition-colors hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-750"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium">{model.label}</span>
                      {model.preview && (
                        <span className="rounded bg-purple-100 px-1.5 py-0.5 text-[10px] font-medium text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">
                          Preview
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{model.description}</p>
                  </div>
                  {selectedModel === model.id && (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Send button */}
        <button
          type="submit"
          disabled={!input.trim() || disabled}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white transition-all hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400 dark:disabled:bg-gray-700 dark:disabled:text-gray-500"
        >
          {isLoading ? (
            <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-4 w-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5 12 3m0 0 7.5 7.5M12 3v18" />
            </svg>
          )}
        </button>
      </form>

      {/* Active features indicator */}
      {activeToolCount > 0 && (
        <div className="mx-auto mt-1.5 flex max-w-3xl flex-wrap items-center gap-1.5 px-1">
          {dataStores.map((storeName) => {
            const store = availableDataStores.find((s) => s.name === storeName);
            return (
              <span key={storeName} className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[11px] text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-3 w-3">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375" />
                </svg>
                {store?.displayName || storeName.split('/').pop()}
              </span>
            );
          })}
          {enableWebGrounding && (
            <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-[11px] text-green-700 dark:bg-green-900/30 dark:text-green-300">
              <svg viewBox="0 0 24 24" className="h-3 w-3" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              </svg>
              Google Search
            </span>
          )}
        </div>
      )}

      {/* Disclaimer */}
      <p className="mx-auto mt-2 max-w-3xl text-center text-[11px] text-gray-400 dark:text-gray-500">
        Generative AI may display inaccurate information, including about people, so double-check its responses.
      </p>
    </div>
  );
}
