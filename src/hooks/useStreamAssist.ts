'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { API_ENDPOINTS } from '@/lib/constants';
import type { Message, StreamAssistResponse, StreamReply, Turn, GeminiModel, GroundingSupport, AdvancedChatSettings, TextGroundingReference } from '@/types/gemini';

interface UseStreamAssistOptions {
  sessionId: string | null;
  sessionTurns?: Turn[];
  fileIds?: string[];
  dataStores?: string[];
  activeAgent?: string | null;
  enableWebGrounding?: boolean;
  selectedModel?: GeminiModel;
  userPseudoId?: string;
  advancedSettings?: AdvancedChatSettings;
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
  advancedSettings,
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
            advancedSettings,
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

        // ── Progressive streaming: parse JSON objects as they arrive ──
        const reader = response.body?.getReader();
        if (!reader) throw new Error('No response body');
        const decoder = new TextDecoder();
        let buffer = '';
        let fullContent = '';
        const state = { last: null as StreamAssistResponse | null, skipped: false, hasResearchPlan: false };
        const allGroundingSupports: GroundingSupport[] = [];
        const allGroundingRefs: TextGroundingReference[] = [];

        /** Try to extract complete JSON objects from the buffer. */
        function extractObjects(): StreamAssistResponse[] {
          const results: StreamAssistResponse[] = [];
          while (true) {
            buffer = buffer.replace(/^[\s,[\]]+/, '');
            if (!buffer.startsWith('{')) break;
            // Find the matching closing brace
            let depth = 0;
            let inStr = false;
            let esc = false;
            let end = -1;
            for (let i = 0; i < buffer.length; i++) {
              const ch = buffer[i];
              if (esc) { esc = false; continue; }
              if (ch === '\\' && inStr) { esc = true; continue; }
              if (ch === '"') { inStr = !inStr; continue; }
              if (inStr) continue;
              if (ch === '{') depth++;
              else if (ch === '}') { depth--; if (depth === 0) { end = i; break; } }
            }
            if (end === -1) break; // incomplete object
            const objStr = buffer.substring(0, end + 1);
            buffer = buffer.substring(end + 1);
            try { results.push(JSON.parse(objStr)); } catch { /* skip malformed */ }
          }
          return results;
        }

        /** Process a single parsed response item and update running state. */
        function processItem(item: StreamAssistResponse) {
          state.last = item;
          if (item.answer?.state === 'SKIPPED') state.skipped = true;

          if (item.answer?.replies) {
            for (const reply of item.answer.replies) {
              const rc = reply.groundedContent?.content;
              const kind = reply.groundedContent?.contentMetadata?.contentKind;
              if (kind === 'RESEARCH_PLAN') state.hasResearchPlan = true;

              if (rc?.text && rc?.thought) {
                // Thinking/research step — update streaming indicator
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMessage.id
                      ? { ...m, thinkingStep: rc!.text!.replace(/\*+/g, '').trim(), isStreaming: true, agentId: m.agentId }
                      : m,
                  ),
                );
              } else if (rc?.text && !rc?.thought) {
                // Content text — append and show progressively
                fullContent += rc.text;
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMessage.id
                      ? { ...m, content: fullContent, thinkingStep: undefined, isStreaming: true, agentId: m.agentId }
                      : m,
                  ),
                );
              }

              // Extract textGroundingMetadata (web grounding references)
              const tgm = reply.groundedContent?.textGroundingMetadata;
              if (tgm?.references) {
                for (const ref of tgm.references) {
                  if (ref.documentMetadata?.uri || ref.documentMetadata?.title) {
                    allGroundingRefs.push(ref);
                  }
                }
              }
            }
          }

          if (item.answer?.answerText) {
            fullContent = item.answer.answerText;
          }

          if (item.answer?.steps) {
            for (const step of item.answer.steps) {
              if (step.actions) {
                for (const action of step.actions) {
                  const gsi = action.observation?.groundingInfo?.groundingSupport;
                  if (gsi) allGroundingSupports.push(...gsi);
                }
              }
            }
          }

          // Update session ref as soon as we get it
          const sess = item.sessionInfo?.session;
          if (sess) currentSessionRef.current = sess;
        }

        // Read stream chunks and process progressively
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          for (const obj of extractObjects()) processItem(obj);
        }
        // Process any remaining buffer
        for (const obj of extractObjects()) processItem(obj);

        if (!fullContent && state.skipped) {
          fullContent = '죄송합니다. 이 질문에 대해 답변을 드리기 어렵습니다. 다른 질문을 해주시겠어요?';
        }

        // ── Finalize assistant message ──
        const finalResp = state.last;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMessage.id
              ? {
                  ...m,
                  content: fullContent || '(응답 없음)',
                  isStreaming: false,
                  thinkingStep: undefined,
                  citations: finalResp?.answer?.citations,
                  steps: finalResp?.answer?.steps,
                  references: finalResp?.answer?.references,
                  groundingSupports: allGroundingSupports.length > 0 ? allGroundingSupports : undefined,
                  groundingReferences: allGroundingRefs.length > 0 ? allGroundingRefs : undefined,
                  hasResearchPlan: state.hasResearchPlan || undefined,
                  agentId: m.agentId,
                }
              : m,
          ),
        );

        // Refresh session list and auto-select if a new session was created
        const finalSession = finalResp?.sessionInfo?.session;
        if (finalSession) {
          onSessionUpdate?.(finalSession);
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
    [sessionId, fileIds, dataStores, activeAgent, enableWebGrounding, selectedModel, userPseudoId, advancedSettings, onSessionUpdate],
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
