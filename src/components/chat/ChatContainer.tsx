'use client';

import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import StreamingIndicator from './StreamingIndicator';
import FollowUpSuggestions from './FollowUpSuggestions';
import FileUpload from '@/components/files/FileUpload';
import DlpWarningModal from '@/components/dlp/DlpWarningModal';
import AdvancedSettingsPanel from './AdvancedSettingsPanel';
import AutocompleteDropdown from './AutocompleteDropdown';
import { useStreamAssist } from '@/hooks/useStreamAssist';
import { useFileUpload } from '@/hooks/useFileUpload';
import { useAdvancedSettings } from '@/hooks/useAdvancedSettings';
import type { Session, GeminiModel, Agent } from '@/types/gemini';

interface ChatContainerProps {
  activeSession: Session | null;
  dataStores: string[];
  activeAgent: string | null;
  agents: Agent[];
  enableWebGrounding: boolean;
  selectedModel: GeminiModel;
  userPseudoId?: string;
  onSessionUpdate?: (newSessionName?: string) => void;
  onDataStoresChange?: (stores: string[]) => void;
  onSelectAgent?: (agentId: string | null) => void;
  onWebGroundingChange?: (enabled: boolean) => void;
  onModelChange?: (model: GeminiModel) => void;
  onTrackSearch?: (query: string) => void;
  onTrackViewItem?: (documentId: string, uri?: string) => void;
}

const QUICK_ACTIONS = [
  {
    label: 'Discover what Gemini can do',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4">
        <path strokeLinecap="round" strokeLinejoin="round" d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" />
      </svg>
    ),
    query: 'What can you help me with?',
  },
  {
    label: 'Spark a breakthrough idea',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 0 0 1.5-.189m-1.5.189a6.01 6.01 0 0 1-1.5-.189m3.75 7.478a12.06 12.06 0 0 1-4.5 0m3.75 2.383a14.406 14.406 0 0 1-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 1 0-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
      </svg>
    ),
    query: 'Help me brainstorm creative ideas for my project',
  },
  {
    label: 'Start my day productively',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" />
      </svg>
    ),
    query: 'Help me plan a productive day',
  },
];

// Generate contextual follow-up suggestions based on conversation
function generateFollowUpSuggestions(
  lastUserMessage: string,
  lastAssistantContent: string,
): string[] {
  const suggestions: string[] = [];
  const content = lastAssistantContent.toLowerCase();
  const userQuery = lastUserMessage.toLowerCase();

  if (content.includes('죄송') || content.includes('sorry') || content.includes('cannot') || content.includes('어렵')) {
    suggestions.push('어떤 종류의 질문에 답변할 수 있나요?');
    suggestions.push('다른 어떤 작업을 할 수 있나요?');
    suggestions.push('제미니 엔터프라이즈에 대해 더 자세히 알려주세요.');
    return suggestions;
  }

  if (content.length > 200) {
    suggestions.push('이 내용을 더 자세히 설명해주세요.');
    suggestions.push('이것을 요약해서 정리해주세요.');
    if (content.includes('example') || content.includes('예시') || content.includes('예를')) {
      suggestions.push('다른 예시를 보여주세요.');
    } else {
      suggestions.push('실제 사용 예시를 보여주세요.');
    }
    return suggestions;
  }

  if (userQuery.includes('할 수') || userQuery.includes('can you') || userQuery.includes('help')) {
    suggestions.push('회사 데이터를 검색할 수 있나요?');
    suggestions.push('문서를 분석해 주세요.');
    suggestions.push('보고서를 작성해 주세요.');
    return suggestions;
  }

  suggestions.push('더 자세히 알려주세요.');
  suggestions.push('다른 관점에서 설명해 주세요.');
  suggestions.push('관련 주제를 추천해 주세요.');

  return suggestions;
}

export default function ChatContainer({
  activeSession,
  dataStores,
  activeAgent,
  agents,
  enableWebGrounding,
  selectedModel,
  userPseudoId,
  onSessionUpdate,
  onDataStoresChange,
  onSelectAgent,
  onWebGroundingChange,
  onModelChange,
  onTrackSearch,
  onTrackViewItem,
}: ChatContainerProps) {
  const { uploadedFiles, isUploading, uploadFile, removeFile } = useFileUpload();
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [showDlpWarning, setShowDlpWarning] = useState(false);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [autocompleteInput, setAutocompleteInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    settings: advancedSettings,
    hasActiveSettings: hasAdvancedSettings,
    updateSetting,
    toggleQueryClassificationType,
    addBoostSpec,
    updateBoostSpec,
    removeBoostSpec,
    resetSettings,
  } = useAdvancedSettings();

  const {
    messages,
    isLoading,
    error,
    sendMessage,
    stopStreaming,
  } = useStreamAssist({
    sessionId: activeSession?.name || null,
    sessionTurns: activeSession?.turns,
    fileIds: uploadedFiles.map((f) => f.fileId),
    dataStores,
    activeAgent,
    enableWebGrounding,
    selectedModel,
    userPseudoId,
    advancedSettings: hasAdvancedSettings ? advancedSettings : undefined,
    onSessionUpdate,
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (error === 'sensitive_data_detected') {
      setShowDlpWarning(true);
    }
  }, [error]);

  const handleSend = useCallback(
    (query: string) => {
      sendMessage(query);
      setAutocompleteInput('');
      onTrackSearch?.(query);
    },
    [sendMessage, onTrackSearch],
  );

  const handleAutocompleteSelect = useCallback(
    (suggestion: string) => {
      setAutocompleteInput(suggestion);
    },
    [],
  );

  // Determine first active dataStoreId for autocomplete
  const firstDataStoreId = dataStores.length > 0
    ? dataStores[0].split('/').pop() || null
    : null;

  const handleQuickAction = useCallback(
    (query: string) => {
      sendMessage(query);
    },
    [sendMessage],
  );

  const isStreaming = messages.some((m) => m.isStreaming);
  const streamingMessage = messages.find((m) => m.isStreaming);

  const followUpSuggestions = useMemo(() => {
    if (messages.length < 2 || isStreaming) return [];

    const lastMessage = messages[messages.length - 1];
    if (lastMessage.role !== 'assistant' || !lastMessage.content) return [];

    // Suppress follow-ups when a Deep Research plan is awaiting user confirmation
    if (lastMessage.hasResearchPlan) return [];

    if (lastMessage.followUpSuggestions && lastMessage.followUpSuggestions.length > 0) {
      return lastMessage.followUpSuggestions;
    }

    const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user');
    if (!lastUserMessage) return [];

    return generateFollowUpSuggestions(lastUserMessage.content, lastMessage.content);
  }, [messages, isStreaming]);

  // Resolve agent metadata for welcome screen
  const agentMeta = activeAgent
    ? agents.find((a) => a.agentId === activeAgent)
    : null;

  /** Return gradient class for the welcome icon circle per agent. */
  const getAgentGradient = (agentId: string) => {
    if (agentId === 'deep_research') return 'from-blue-500 to-purple-600';
    return 'from-purple-400 to-pink-500';
  };

  /** Return a per-agent SVG icon for the welcome screen. */
  const renderAgentWelcomeIcon = (agentId: string) => {
    if (agentId === 'deep_research') {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="white" className="h-8 w-8">
          <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
        </svg>
      );
    }
    // Default sparkle icon for all other agents
    return (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="white" className="h-8 w-8">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456Z" />
      </svg>
    );
  };

  return (
    <div className="flex h-full flex-col">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          activeAgent && agentMeta ? (
            /* Agent Welcome Screen */
            <div className="flex h-full flex-col items-center justify-center px-4">
              <div className="flex max-w-3xl flex-col items-center text-center">
                {/* Agent icon */}
                <div className="mb-6">
                  <div className={`flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br ${getAgentGradient(activeAgent)}`}>
                    {renderAgentWelcomeIcon(activeAgent)}
                  </div>
                </div>

                {/* Agent title */}
                <h1 className="mb-2 text-3xl font-semibold text-gray-900 dark:text-white sm:text-4xl">
                  {agentMeta.displayName}
                </h1>
                <p className="mb-10 text-base text-gray-500 dark:text-gray-400 sm:text-lg">
                  {agentMeta.description}
                </p>

                {/* Suggestion cards */}
                <div className="grid w-full max-w-2xl grid-cols-1 gap-3 sm:grid-cols-2">
                  {[
                    `${agentMeta.displayName}에 대해 알려주세요.`,
                    `${agentMeta.displayName}으로 무엇을 할 수 있나요?`,
                    `How can ${agentMeta.displayName} help me?`,
                    `Get started with ${agentMeta.displayName}`,
                  ].map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => handleQuickAction(suggestion)}
                      disabled={isLoading}
                      className="rounded-xl border border-gray-200 bg-white p-4 text-left text-sm text-gray-700 transition-colors hover:border-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:border-gray-600 dark:hover:bg-gray-750"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* Regular Welcome Screen */
            <div className="flex h-full flex-col items-center justify-center px-4">
              <div className="flex max-w-2xl flex-col items-center text-center">
                <div className="mb-6">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z" fill="url(#welcome-star)" />
                    <defs>
                      <linearGradient id="welcome-star" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#4285f4" />
                        <stop offset="0.5" stopColor="#a855f7" />
                        <stop offset="1" stopColor="#ec4899" />
                      </linearGradient>
                    </defs>
                  </svg>
                </div>

                <h1 className="gemini-gradient-text mb-2 text-4xl font-semibold tracking-tight sm:text-5xl">
                  Hello there
                </h1>
                <p className="mb-10 text-xl text-gray-500 dark:text-gray-400 sm:text-2xl">
                  Where should we start?
                </p>

                <div className="flex flex-wrap justify-center gap-3">
                  {QUICK_ACTIONS.map((action) => (
                    <button
                      key={action.label}
                      onClick={() => handleQuickAction(action.query)}
                      disabled={isLoading}
                      className="action-chip flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-600 transition-colors hover:border-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:border-gray-600 dark:hover:bg-gray-750"
                    >
                      <span className="text-gray-400">{action.icon}</span>
                      {action.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )
        ) : (
          /* Chat messages */
          <div className="mx-auto max-w-3xl space-y-4 px-4 py-6 sm:px-6 lg:px-8">
            {messages.map((message) =>
              /* Hide empty streaming bubbles – the StreamingIndicator covers this state */
              message.isStreaming && !message.content ? null : (
                <ChatMessage
                  key={message.id}
                  message={message}
                  agentDisplayName={
                    message.agentId
                      ? agents.find((a) => a.agentId === message.agentId)?.displayName
                      : undefined
                  }
                  onCitationClick={onTrackViewItem}
                />
              ),
            )}
            <StreamingIndicator isStreaming={isStreaming} steps={streamingMessage?.steps} thinkingStep={streamingMessage?.thinkingStep} />

            {/* Deep Research: show "Start Research" button when plan is ready */}
            {!isStreaming &&
              messages.length > 0 &&
              messages[messages.length - 1].hasResearchPlan && (
                <div className="flex justify-center">
                  <button
                    onClick={() => handleSend('Start Research')}
                    disabled={isLoading}
                    className="flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 px-6 py-2.5 text-sm font-medium text-white shadow-md transition-all hover:from-blue-600 hover:to-purple-700 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                    </svg>
                    연구 시작 (Start Research)
                  </button>
                </div>
              )}

            {followUpSuggestions.length > 0 && !isStreaming && (
              <FollowUpSuggestions
                suggestions={followUpSuggestions}
                onSelect={handleSend}
                disabled={isLoading}
              />
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* File upload panel */}
      {showFileUpload && (
        <FileUpload
          uploadedFiles={uploadedFiles}
          isUploading={isUploading}
          onUpload={uploadFile}
          onRemove={removeFile}
          onClose={() => setShowFileUpload(false)}
        />
      )}

      {/* Upload file badges */}
      {uploadedFiles.length > 0 && !showFileUpload && (
        <div className="flex flex-wrap gap-1.5 px-4 py-2 sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-3xl flex-wrap gap-1.5">
            {uploadedFiles.map((f) => (
              <span key={f.fileId} className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-3 w-3">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                </svg>
                {f.name}
                <button onClick={() => removeFile(f.fileId)} className="ml-0.5 hover:text-red-500">&times;</button>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Stop streaming button */}
      {isStreaming && (
        <div className="flex justify-center pb-2">
          <button
            onClick={stopStreaming}
            className="flex items-center gap-2 rounded-full border border-gray-300 bg-white px-4 py-1.5 text-xs font-medium text-gray-600 shadow-sm transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-750"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" className="h-3 w-3">
              <rect x="6" y="6" width="12" height="12" rx="2" />
            </svg>
            Stop generating
          </button>
        </div>
      )}

      {/* Chat input with autocomplete */}
      <div className="relative">
        <AutocompleteDropdown
          dataStoreId={firstDataStoreId}
          inputValue={autocompleteInput}
          onSelect={handleAutocompleteSelect}
          visible={!activeAgent && dataStores.length > 0 && autocompleteInput.length > 1}
        />
        <ChatInput
          onSend={handleSend}
          onFileClick={() => setShowFileUpload(!showFileUpload)}
          disabled={isLoading}
          isLoading={isLoading}
          dataStores={dataStores}
          activeAgent={activeAgent}
          agents={agents}
          enableWebGrounding={enableWebGrounding}
          selectedModel={selectedModel}
          hasAdvancedSettings={hasAdvancedSettings}
          onDataStoresChange={onDataStoresChange}
          onSelectAgent={onSelectAgent}
          onWebGroundingChange={onWebGroundingChange}
          onModelChange={onModelChange}
          onToggleAdvancedSettings={() => setShowAdvancedSettings(!showAdvancedSettings)}
          onInputChange={setAutocompleteInput}
          externalInputValue={autocompleteInput}
        />
      </div>

      {/* Advanced Settings Panel */}
      <AdvancedSettingsPanel
        isOpen={showAdvancedSettings}
        settings={advancedSettings}
        onClose={() => setShowAdvancedSettings(false)}
        onUpdateSetting={updateSetting}
        onToggleQueryClassificationType={toggleQueryClassificationType}
        onAddBoostSpec={addBoostSpec}
        onUpdateBoostSpec={updateBoostSpec}
        onRemoveBoostSpec={removeBoostSpec}
        onReset={resetSettings}
      />

      {/* DLP Warning Modal */}
      <DlpWarningModal
        isOpen={showDlpWarning}
        onClose={() => setShowDlpWarning(false)}
      />
    </div>
  );
}
