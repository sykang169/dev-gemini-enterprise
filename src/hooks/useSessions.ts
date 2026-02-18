'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { API_ENDPOINTS } from '@/lib/constants';
import type { Session } from '@/types/gemini';

interface UseSessionsOptions {
  userPseudoId?: string;
}

interface UseSessionsReturn {
  sessions: Session[];
  activeSession: Session | null;
  isLoading: boolean;
  error: string | null;
  createSession: (displayName?: string) => Promise<Session | null>;
  selectSession: (session: Session | null) => void;
  deleteSession: (sessionName: string) => Promise<void>;
  refreshSessions: (autoSelectName?: string) => Promise<void>;
}

export function useSessions({ userPseudoId }: UseSessionsOptions = {}): UseSessionsReturn {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const userPseudoIdRef = useRef(userPseudoId);
  userPseudoIdRef.current = userPseudoId;

  const refreshSessions = useCallback(async (autoSelectName?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(API_ENDPOINTS.SESSIONS);
      if (!response.ok) throw new Error('Failed to fetch sessions');
      const data = await response.json();
      const fetched: Session[] = data.sessions || [];
      setSessions(fetched);
      if (autoSelectName) {
        const found = fetched.find((s) => s.name === autoSelectName);
        if (found) setActiveSession(found);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sessions');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createSession = useCallback(
    async (displayName?: string): Promise<Session | null> => {
      setError(null);
      try {
        const response = await fetch(API_ENDPOINTS.SESSIONS, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            displayName,
            userPseudoId: userPseudoIdRef.current,
          }),
        });

        if (!response.ok) throw new Error('Failed to create session');

        const session: Session = await response.json();
        setSessions((prev) => [session, ...prev]);
        setActiveSession(session);
        return session;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create session');
        return null;
      }
    },
    [],
  );

  const selectSession = useCallback((session: Session | null) => {
    setActiveSession(session);

    // Fetch full session data with answer texts in the background
    // Check that turns have actual answer text (not just /answers/ resource names)
    const hasRealAnswers = session?.turns?.some(
      (t) => !!t.answer && !t.answer.includes('/answers/'),
    );
    if (session && !hasRealAnswers) {
      fetch(
        `${API_ENDPOINTS.SESSIONS}?name=${encodeURIComponent(session.name)}`,
      )
        .then((res) => {
          if (!res.ok) throw new Error('fetch failed');
          return res.json();
        })
        .then((fullSession: Session) => {
          // Preserve agentId from original session if not in full response
          if (!fullSession.agentId && session.agentId) {
            fullSession.agentId = session.agentId;
          }
          if (
            fullSession.turns &&
            fullSession.turns.some(
              (t) => !!t.answer && !t.answer.includes('/answers/'),
            )
          ) {
            setActiveSession(fullSession);
          }
        })
        .catch(() => {
          // Keep the original session data if fetch fails
        });
    }
  }, []);

  const deleteSession = useCallback(
    async (sessionName: string) => {
      setError(null);
      try {
        const response = await fetch(
          `${API_ENDPOINTS.SESSIONS}?name=${encodeURIComponent(sessionName)}`,
          { method: 'DELETE' },
        );
        if (!response.ok) throw new Error('Failed to delete session');
        setSessions((prev) => prev.filter((s) => s.name !== sessionName));
        if (activeSession?.name === sessionName) {
          setActiveSession(null);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete session');
      }
    },
    [activeSession],
  );

  // Refresh sessions on mount and when userPseudoId changes
  useEffect(() => {
    refreshSessions();
  }, [refreshSessions, userPseudoId]);

  return {
    sessions,
    activeSession,
    isLoading,
    error,
    createSession,
    selectSession,
    deleteSession,
    refreshSessions,
  };
}
