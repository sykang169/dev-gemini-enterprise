'use client';

import { useState, useEffect, useCallback } from 'react';
import { API_ENDPOINTS } from '@/lib/constants';
import type { Agent } from '@/types/gemini';

interface UseAgentsReturn {
  agents: Agent[];
  isLoading: boolean;
  getAgent: (agentId: string) => Agent | undefined;
}

export function useAgents(): UseAgentsReturn {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchAgents() {
      try {
        const res = await fetch(API_ENDPOINTS.AGENTS);
        if (!res.ok) throw new Error('Failed to fetch agents');
        const data = await res.json();
        if (!cancelled && data.agents) {
          setAgents(data.agents);
        }
      } catch {
        // silently fail — agents list will remain empty
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    fetchAgents();
    return () => {
      cancelled = true;
    };
  }, []);

  const getAgent = useCallback(
    (agentId: string): Agent | undefined => {
      return agents.find((a) => a.agentId === agentId);
    },
    [agents],
  );

  return { agents, isLoading, getAgent };
}
