'use client';

import { useState } from 'react';
import SessionList from './SessionList';
import type { Session, Agent } from '@/types/gemini';

interface SidebarProps {
  sessions: Session[];
  activeSession: Session | null;
  isLoading: boolean;
  isOpen: boolean;
  activeAgent: string | null;
  agents: Agent[];
  onToggle: () => void;
  onSelectSession: (session: Session) => void;
  onDeleteSession: (sessionName: string) => void;
  onNewSession: () => void;
  onSelectAgent: (agentId: string | null) => void;
}

/** Return a per-agent icon (SVG) based on agentId. */
function AgentIcon({ agentId, className }: { agentId: string; className?: string }) {
  if (agentId === 'deep_research') {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
      </svg>
    );
  }
  // Default sparkle icon for all other agents
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456Z" />
    </svg>
  );
}

/** Return the icon background gradient class per agent. */
function getAgentIconBg(agentId: string): string {
  if (agentId === 'deep_research') {
    return 'bg-gradient-to-br from-blue-500 to-purple-600';
  }
  return 'bg-gradient-to-br from-purple-400 to-pink-500';
}

// Pin / bookmark icon (outline)
function PinIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z" />
    </svg>
  );
}

export default function Sidebar({
  sessions,
  activeSession,
  isLoading,
  isOpen,
  activeAgent,
  agents,
  onToggle,
  onSelectSession,
  onDeleteSession,
  onNewSession,
  onSelectAgent,
}: SidebarProps) {
  const [agentsExpanded, setAgentsExpanded] = useState(true);
  const [showMore, setShowMore] = useState(false);

  // Split agents: first 2 always visible, rest behind "Show more"
  const visibleAgents = showMore ? agents : agents.slice(0, 2);
  const hasMoreAgents = agents.length > 2;

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={onToggle}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`sidebar-transition fixed left-0 top-0 z-30 flex h-full w-[280px] flex-col bg-[#1a1a2e] lg:relative lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header - Hamburger + Branding */}
        <div className="flex items-center gap-3 px-4 py-4">
          <button
            onClick={onToggle}
            className="flex h-9 w-9 items-center justify-center rounded-full text-gray-400 hover:bg-white/10 lg:hover:bg-white/10"
            aria-label="Toggle sidebar"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </button>
          <div className="flex items-center gap-2">
            {/* Gemini star icon */}
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z" fill="url(#gemini-star)" />
              <defs>
                <linearGradient id="gemini-star" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#4285f4" />
                  <stop offset="0.5" stopColor="#a855f7" />
                  <stop offset="1" stopColor="#ec4899" />
                </linearGradient>
              </defs>
            </svg>
            <span className="text-lg font-semibold text-white">Gemini</span>
            <span className="rounded-md bg-blue-600/20 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-blue-400">
              Enterprise
            </span>
          </div>
        </div>

        {/* Navigation Actions */}
        <div className="px-3 pb-2">
          {/* New Chat button */}
          <button
            onClick={onNewSession}
            className="flex w-full items-center gap-3 rounded-full border border-white/10 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/10"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            New chat
          </button>
        </div>

        {/* Agents Section */}
        <div className="px-3 py-2">
          {/* Agents header - clickable to expand/collapse */}
          <button
            onClick={() => setAgentsExpanded(!agentsExpanded)}
            className="flex w-full items-center justify-between rounded-lg px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-gray-500 transition-colors hover:bg-white/5"
          >
            <span>Agents</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className={`h-4 w-4 transition-transform duration-200 ${agentsExpanded ? 'rotate-90' : ''}`}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
            </svg>
          </button>

          {/* Agents list - collapsible */}
          {agentsExpanded && (
            <nav className="mt-1 space-y-0.5">
              {visibleAgents.map((agent) => {
                const isActive = activeAgent === agent.agentId;
                return (
                  <button
                    key={agent.agentId}
                    onClick={() => onSelectAgent(agent.agentId)}
                    className={`group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                      isActive
                        ? 'bg-white/15 text-white'
                        : 'text-gray-300 hover:bg-white/8'
                    }`}
                  >
                    {/* Agent icon - green checkmark when active, otherwise colored icon */}
                    {isActive ? (
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-green-500/20">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="h-4 w-4 text-green-400">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                        </svg>
                      </span>
                    ) : (
                      <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${getAgentIconBg(agent.agentId)}`}>
                        <AgentIcon agentId={agent.agentId} className="h-3.5 w-3.5 text-white" />
                      </span>
                    )}

                    {/* Agent name */}
                    <span className="flex flex-1 items-center gap-1.5 text-left">
                      <span className="truncate">{agent.displayName}</span>
                    </span>

                    {/* Pin icon (visible on hover or when active) */}
                    <span className={`shrink-0 transition-opacity ${isActive ? 'opacity-60' : 'opacity-0 group-hover:opacity-40'}`}>
                      <PinIcon className="h-4 w-4 text-gray-400" />
                    </span>
                  </button>
                );
              })}

              {/* Show more / Show less toggle */}
              {hasMoreAgents && (
                <button
                  onClick={() => setShowMore(!showMore)}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-xs text-gray-500 transition-colors hover:bg-white/5 hover:text-gray-400"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className={`h-3.5 w-3.5 transition-transform duration-200 ${showMore ? 'rotate-180' : ''}`}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                  </svg>
                  {showMore ? 'Show less' : 'Show more'}
                </button>
              )}

              {/* New agent button */}
              <button
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-gray-400 transition-colors hover:bg-white/5 hover:text-gray-300"
                onClick={() => {
                  // Placeholder: future "New agent" flow
                }}
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-dashed border-gray-600">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-3.5 w-3.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                </span>
                New agent
              </button>
            </nav>
          )}
        </div>

        {/* Divider */}
        <div className="mx-4 border-t border-white/10" />

        {/* Chats Section */}
        <div className="flex min-h-0 flex-1 flex-col px-3 py-2">
          <div className="px-3 py-1.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Chats</span>
          </div>
          <div className="sidebar-scroll flex-1 overflow-y-auto">
            <SessionList
              sessions={sessions}
              activeSession={activeSession}
              isLoading={isLoading}
              onSelect={onSelectSession}
              onDelete={onDeleteSession}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-white/10 px-3 py-3">
          <a
            href="/settings"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-gray-400 transition-colors hover:bg-white/8 hover:text-gray-200"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
            </svg>
            Settings
          </a>
        </div>
      </aside>
    </>
  );
}
