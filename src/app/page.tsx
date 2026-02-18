'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Sidebar from '@/components/sidebar/Sidebar';
import ChatContainer from '@/components/chat/ChatContainer';
import UserProfileMenu from '@/components/user/UserProfileMenu';
import { useSessions } from '@/hooks/useSessions';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useAgents } from '@/hooks/useAgents';
import { useEventTracking } from '@/hooks/useEventTracking';
import { isMicrosoftConfigured } from '@/lib/msal-config';
import { API_ENDPOINTS } from '@/lib/constants';
import type { GeminiModel, Session } from '@/types/gemini';

export default function Home() {
  const { user, isLoaded, signIn, signInWithGoogle, signInWithMicrosoft, signOut } = useUserProfile();
  const showGoogleButton = !!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || !isMicrosoftConfigured();
  const showMicrosoftButton = isMicrosoftConfigured();

  // Use user email as userPseudoId to match Gemini Enterprise's session scoping
  const userPseudoId = user?.email || undefined;

  const {
    sessions,
    activeSession,
    isLoading: sessionsLoading,
    selectSession,
    deleteSession,
    refreshSessions,
  } = useSessions({ userPseudoId });

  const { agents, isLoading: agentsLoading } = useAgents();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dataStores, setDataStores] = useState<string[]>([]);
  const [activeAgent, setActiveAgent] = useState<string | null>(null);
  const [enableWebGrounding, setEnableWebGrounding] = useState(false);
  const [selectedModel, setSelectedModel] = useState<GeminiModel>('auto');
  const activeAgentRef = useRef<string | null>(null);
  activeAgentRef.current = activeAgent;

  // Event tracking for search quality improvement
  const firstDataStoreId = dataStores.length > 0
    ? (dataStores[0]?.split('/').pop() || null)
    : null;
  const { trackSearch, trackViewItem } = useEventTracking({
    dataStoreId: firstDataStoreId,
    userPseudoId,
    enabled: dataStores.length > 0,
  });

  // Load settings from localStorage after hydration
  useEffect(() => {
    try {
      const saved = localStorage.getItem('gemini-chat-settings');
      if (saved) {
        const settings = JSON.parse(saved);
        if (settings.dataStores) setDataStores(settings.dataStores);
        if (settings.enableWebGrounding !== undefined)
          setEnableWebGrounding(settings.enableWebGrounding);
        if (settings.selectedModel) setSelectedModel(settings.selectedModel);
        // Note: activeAgent is not persisted — always start in regular chat mode
      }
    } catch {
      // ignore
    }
  }, []);

  // Sync settings to localStorage whenever they change (skip initial empty state)
  const settingsLoaded = useRef(false);
  useEffect(() => {
    if (!settingsLoaded.current) {
      settingsLoaded.current = true;
      return;
    }
    const settings = { dataStores, enableWebGrounding, selectedModel };
    localStorage.setItem('gemini-chat-settings', JSON.stringify(settings));
  }, [dataStores, enableWebGrounding, selectedModel]);

  const handleNewSession = useCallback(() => {
    setActiveAgent(null); // Exit agent mode
    selectSession(null); // Clear active session — a new session is created on first message
  }, [selectSession]);

  const handleSelectSession = useCallback((session: Parameters<typeof selectSession>[0]) => {
    // Restore the agent from server-side metadata (encoded in displayName)
    setActiveAgent(session?.agentId ?? null);
    selectSession(session);
  }, [selectSession]);

  // Keep a ref to the session that was active before entering agent mode, so we
  // can restore it if the user leaves agent mode without selecting a different chat.
  const previousSessionRef = useRef<Session | null>(null);

  const handleSelectAgent = useCallback((agentId: string | null) => {
    if (agentId) {
      // Preserve the current session before switching to agent mode
      if (!activeAgent && activeSession) {
        previousSessionRef.current = activeSession;
      }
      setActiveAgent(agentId);
      selectSession(null); // Show agent welcome screen, session created on first message
    } else {
      // Leaving agent mode -- restore the previously active session if available
      setActiveAgent(null);
      if (previousSessionRef.current) {
        selectSession(previousSessionRef.current);
        previousSessionRef.current = null;
      }
    }
  }, [activeAgent, activeSession, selectSession]);

  // Show loading spinner while checking auth state
  if (!isLoaded) {
    return (
      <div className="flex h-screen items-center justify-center bg-white dark:bg-gray-950">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
      </div>
    );
  }

  // Show login screen when not authenticated
  if (!user) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-white dark:bg-gray-950">
        <div className="flex flex-col items-center gap-6">
          {/* Gemini logo */}
          <div className="flex items-center gap-3">
            <svg width="40" height="40" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M14 28C14 21.75 9.54 16.53 3.72 15.41C2.55 15.19 1.36 15.05 0.14 15L0 15C0 15 0 14 0 14C0.05 14 0.09 14 0.14 14C1.36 13.95 2.55 13.81 3.72 13.59C9.54 12.47 14 7.25 14 1V0C14 0 14 0 14 0C14 6.25 18.46 11.47 24.28 12.59C25.45 12.81 26.64 12.95 27.86 13L28 13V14C28 14 28 15 28 15L27.86 15C26.64 15.05 25.45 15.19 24.28 15.41C18.46 16.53 14 21.75 14 28Z" fill="url(#gemini-gradient)" />
              <defs>
                <linearGradient id="gemini-gradient" x1="0" y1="0" x2="28" y2="28" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#4285F4" />
                  <stop offset="1" stopColor="#A855F7" />
                </linearGradient>
              </defs>
            </svg>
            <h1 className="text-3xl font-semibold text-gray-900 dark:text-white">Gemini Enterprise</h1>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Sign in to continue</p>
          <div className="flex flex-col gap-3">
            {showGoogleButton && (
              <button
                onClick={signInWithGoogle}
                className="flex items-center gap-3 rounded-full border border-gray-300 bg-white px-6 py-3 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
              >
                <svg width="18" height="18" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                </svg>
                Sign in with Google
              </button>
            )}
            {showMicrosoftButton && (
              <button
                onClick={signInWithMicrosoft}
                className="flex items-center gap-3 rounded-full border border-gray-300 bg-white px-6 py-3 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
              >
                <svg width="18" height="18" viewBox="0 0 21 21">
                  <rect x="1" y="1" width="9" height="9" fill="#F25022" />
                  <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
                  <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
                  <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
                </svg>
                Sign in with Microsoft
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Resolve active agent metadata for header display
  const agentMeta = activeAgent
    ? agents.find((a) => a.agentId === activeAgent)
    : null;

  return (
    <div className="flex h-screen bg-white dark:bg-gray-950">
      {/* Sidebar toggle button (mobile) */}
      <button
        onClick={() => setSidebarOpen(true)}
        className="fixed left-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-md transition-colors hover:bg-gray-50 lg:hidden dark:bg-gray-800 dark:hover:bg-gray-700"
        aria-label="Open sidebar"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5 text-gray-600 dark:text-gray-300">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
        </svg>
      </button>

      {/* Sidebar */}
      <Sidebar
        sessions={sessions}
        activeSession={activeSession}
        isLoading={sessionsLoading}
        isOpen={sidebarOpen}
        activeAgent={activeAgent}
        agents={agents}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        onSelectSession={handleSelectSession}
        onDeleteSession={deleteSession}
        onNewSession={handleNewSession}
        onSelectAgent={handleSelectAgent}
      />

      {/* Main Chat Area */}
      <main className="flex flex-1 flex-col overflow-hidden bg-white dark:bg-gray-950">
        {/* Thin top bar */}
        <header className="flex h-12 items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2">
            {activeAgent && agentMeta ? (
              <h2 className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-400">
                <span className={`flex h-5 w-5 items-center justify-center rounded-full ${
                  activeAgent === 'deep_research' ? 'bg-gradient-to-br from-blue-500 to-purple-600'
                    : 'bg-gradient-to-br from-purple-400 to-pink-500'
                }`}>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="white" className="h-3 w-3">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
                  </svg>
                </span>
                {agentMeta.displayName}
              </h2>
            ) : activeSession ? (
              <h2 className="text-sm font-medium text-gray-600 dark:text-gray-400">
                {activeSession.displayName || 'New Chat'}
              </h2>
            ) : null}
          </div>
          <div className="flex items-center gap-3">
            {dataStores.length > 0 && (
              <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                {dataStores.length} data store{dataStores.length > 1 ? 's' : ''}
              </span>
            )}
            {enableWebGrounding && (
              <span className="rounded-full bg-green-50 px-2.5 py-0.5 text-xs text-green-600 dark:bg-green-900/20 dark:text-green-400">
                Web
              </span>
            )}
            {/* Settings icon */}
            <a
              href="/settings"
              className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
              </svg>
            </a>
            {/* User profile menu */}
            <UserProfileMenu
              user={user}
              onSignIn={signIn}
              onSignOut={signOut}
            />
          </div>
        </header>

        {/* Chat Container */}
        <ChatContainer
          activeSession={activeSession}
          dataStores={dataStores}
          activeAgent={activeAgent}
          agents={agents}
          enableWebGrounding={enableWebGrounding}
          selectedModel={selectedModel}
          userPseudoId={userPseudoId}
          onSessionUpdate={(newSessionName?: string) => {
            // Save agent metadata to session displayName via API
            if (newSessionName && activeAgentRef.current) {
              fetch(
                `${API_ENDPOINTS.SESSIONS}?name=${encodeURIComponent(newSessionName)}`,
                {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ agentId: activeAgentRef.current }),
                },
              ).catch(() => {
                // Non-critical: agent tag may be missing on reload
              });
            }
            refreshSessions(newSessionName);
          }}
          onDataStoresChange={setDataStores}
          onSelectAgent={handleSelectAgent}
          onWebGroundingChange={setEnableWebGrounding}
          onModelChange={setSelectedModel}
          onTrackSearch={trackSearch}
          onTrackViewItem={trackViewItem}
        />
      </main>
    </div>
  );
}
