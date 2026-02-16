'use client';

import SessionItem from './SessionItem';
import Spinner from '@/components/ui/Spinner';
import type { Session } from '@/types/gemini';

interface SessionListProps {
  sessions: Session[];
  activeSession: Session | null;
  isLoading: boolean;
  onSelect: (session: Session) => void;
  onDelete: (sessionName: string) => void;
}

export default function SessionList({
  sessions,
  activeSession,
  isLoading,
  onSelect,
  onDelete,
}: SessionListProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Spinner size="sm" />
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="px-3 py-6 text-center text-sm text-gray-600">
        No conversations yet
      </div>
    );
  }

  return (
    <div className="space-y-0.5">
      {sessions.map((session) => (
        <SessionItem
          key={session.name}
          session={session}
          isActive={activeSession?.name === session.name}
          onSelect={onSelect}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
