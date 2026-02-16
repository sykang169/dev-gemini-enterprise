'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { API_ENDPOINTS } from '@/lib/constants';
import type { Message, StreamAssistResponse, Turn, GeminiModel } from '@/types/gemini';

interface UseStreamAssistOptions {
  sessionId: string | null;
  sessionTurns?: Turn[];
  fileIds?: string[];
  dataStores?: string[];
  activeAgent?: string | null;
  enableWebGrounding?: boolean;
  selectedModel?: GeminiModel;
  userPseudoId?: string;
  onSessionUpdate?: (newSessionName?: string) => void;
}

interface UseStreamAssistReturn {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  sendMessage: (query: string) => Promise<void>;
  clearMessages: () => void;
  stopStreaming: () => void;
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
}

const STORAGE_KEY_PREFIX = 'gemini-chat-messages-';

function saveMessages(sessionId: string, messages: Message[]) {
  try {
    localStorage.setItem(
      `${STORAGE_KEY_PREFIX}${sessionId}`,
      JSON.stringify(messages),
    );
  } catch {
    // localStorage full or unavailable
  }
}

function loadMessages(sessionId: string): Message[] {
  try {
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}${sessionId}`);
    if (saved) return JSON.parse(saved);
  } catch {
    // ignore
  }
  return [];
}

export function useStreamAssist({
  sessionId,
  sessionTurns,
  fileIds,
  dataStores,
  activeAgent,
  enableWebGrounding,
  selectedModel,
  userPseudoId,
  onSessionUpdate,
}: UseStreamAssistOptions): UseStreamAssistReturn {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  // Track the current session to save messages against (may be set by API response)
  const currentSessionRef = useRef<string | null>(sessionId);

  // Load messages from localStorage when sessionId changes, fallback to session turns
  useEffect(() => {
    currentSessionRef.current = sessionId;
    if (sessionId) {
      // Check if turns include answer texts
      const turnsHaveAnswers =
        sessionTurns &&
        sessionTurns.length > 0 &&
        sessionTurns.some((t) => !!t.answer && !t.answer.includes('/answers/'));

      const saved = loadMessages(sessionId);
      const savedHasRealAnswers =
        saved.length > 0 &&
        saved.some(
          (m) => m.role === 'assistant' && m.id !== 'system-note-no-answers',
        );

      if (turnsHaveAnswers) {
        // Turns have full answer text from the API — build messages from turns
        const turnMessages: Message[] = sessionTurns!.flatMap((turn) => {
          const msgs: Message[] = [];
          if (turn.query?.text) {
            msgs.push({
              id: turn.query.queryId || crypto.randomUUID(),
              role: 'user',
              content: turn.query.text,
              timestamp: Date.now(),
            });
          }
          if (turn.answer && !turn.answer.includes('/answers/')) {
            msgs.push({
              id: crypto.randomUUID(),
              role: 'assistant',
              content: turn.answer,
              timestamp: Date.now(),
            });
          }
          return msgs;
        });
        setMessages(turnMessages);
        // Update localStorage with complete data
        saveMessages(sessionId, turnMessages);
      } else if (saved.length > 0 && savedHasRealAnswers) {
        // localStorage has messages with real answers — use them
        setMessages(saved);
      } else if (sessionTurns && sessionTurns.length > 0) {
        // Turns without answers — show questions with a note
        const turnMessages: Message[] = sessionTurns.flatMap((turn) => {
          const msgs: Message[] = [];
          if (turn.query?.text) {
            msgs.push({
              id: turn.query.queryId || crypto.randomUUID(),
              role: 'user',
              content: turn.query.text,
              timestamp: Date.now(),
            });
          }
          if (turn.answer && !turn.answer.includes('/answers/')) {
            msgs.push({
              id: crypto.randomUUID(),
              role: 'assistant',
              content: turn.answer,
              timestamp: Date.now(),
            });
          }
          return msgs;
        });
        const hasAnswers = turnMessages.some((m) => m.role === 'assistant');
        if (!hasAnswers && turnMessages.length > 0) {
          turnMessages.push({
            id: 'system-note-no-answers',
            role: 'assistant',
            content:
              '이전 대화의 답변을 불러오는 중입니다...',
            timestamp: Date.now(),
          });
        }
        setMessages(turnMessages);
      } else {
        setMessages([]);
      }
    } else {
      setMessages([]);
    }
    setError(null);
  }, [sessionId, sessionTurns]);

  // Save messages to localStorage whenever they change
  useEffect(() => {
    const sid = currentSessionRef.current;
    if (sid && messages.length > 0 && !messages.some((m) => m.isStreaming)) {
      saveMessages(sid, messages);
    }
  }, [messages]);

  const sendMessage = useCallback(
    async (query: string) => {
      setError(null);
      setIsLoading(true);

      const userMessage: Message = {
        id: crypto.randomUUID(),
        role: 'user',
        content: query,
        timestamp: Date.now(),
      };

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
        isStreaming: true,
        ...(activeAgent ? { agentId: activeAgent } : {}),
      };

      setMessages((prev) => [...prev, userMessage, assistantMessage]);

      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        // Use currentSessionRef (updated after first message creates a session)
        // to avoid creating duplicate sessions in agent mode.
        const effectiveSessionId = currentSessionRef.current || sessionId;

        const response = await fetch(API_ENDPOINTS.CHAT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query,
            sessionId: effectiveSessionId,
            fileIds,
            dataStores,
            agents: activeAgent ? [activeAgent] : undefined,
            enableWebGrounding,
            model: selectedModel,
            userPseudoId,
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          const errorData = await response.json();
          if (errorData.error === 'sensitive_data_detected') {
            setMessages((prev) =>
              prev.filter((m) => m.id !== assistantMessage.id),
            );
            setError('sensitive_data_detected');
            setIsLoading(false);
            return;
          }
          throw new Error(errorData.error || 'Chat request failed');
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error('No response body');

        const decoder = new TextDecoder();
        let rawText = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          rawText += decoder.decode(value, { stream: true });
        }

        // Parse the full JSON array response
        let items: StreamAssistResponse[] = [];
        try {
          items = JSON.parse(rawText);
        } catch {
          console.error('Failed to parse stream response:', rawText.substring(0, 200));
        }

        let fullContent = '';
        let lastResponse: StreamAssistResponse | null = null;
        let wasSkipped = false;

        for (const parsed of items) {
          lastResponse = parsed;

          // Check if the query was skipped
          if (parsed.answer?.state === 'SKIPPED') {
            wasSkipped = true;
          }

          // Extract text from replies[].groundedContent.content.text
          if (parsed.answer?.replies) {
            for (const reply of parsed.answer.replies) {
              const content = reply.groundedContent?.content;
              if (content?.text && !content?.thought) {
                fullContent += content.text;
              }
            }
          }

          // Also support answerText (legacy format)
          if (parsed.answer?.answerText) {
            fullContent = parsed.answer.answerText;
          }
        }

        // Handle skipped/empty responses
        if (!fullContent && wasSkipped) {
          fullContent = '죄송합니다. 이 질문에 대해 답변을 드리기 어렵습니다. 다른 질문을 해주시겠어요?';
        }

        // Update session ref if a new session was created
        if (lastResponse?.sessionInfo?.session) {
          currentSessionRef.current = lastResponse.sessionInfo.session;
        }

        // Finalize the message (preserve agentId from the initial assistantMessage)
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMessage.id
              ? {
                  ...m,
                  content: fullContent || '(응답 없음)',
                  isStreaming: false,
                  citations: lastResponse?.answer?.citations,
                  steps: lastResponse?.answer?.steps,
                  references: lastResponse?.answer?.references,
                  agentId: m.agentId,
                }
              : m,
          ),
        );

        // Refresh session list and auto-select if a new session was created
        if (lastResponse?.sessionInfo?.session) {
          onSessionUpdate?.(lastResponse.sessionInfo.session);
        }
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMessage.id
                ? { ...m, isStreaming: false, content: m.content || '(취소됨)' }
                : m,
            ),
          );
        } else {
          const errorMessage = err instanceof Error ? err.message : 'Unknown error';
          setError(errorMessage);
          setMessages((prev) =>
            prev.filter((m) => m.id !== assistantMessage.id),
          );
        }
      } finally {
        setIsLoading(false);
        abortControllerRef.current = null;
      }
    },
    [sessionId, fileIds, dataStores, activeAgent, enableWebGrounding, selectedModel, userPseudoId, onSessionUpdate],
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  const stopStreaming = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    clearMessages,
    stopStreaming,
    setMessages,
  };
}
