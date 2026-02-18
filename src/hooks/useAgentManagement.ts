'use client';

import { useState, useCallback, useEffect } from 'react';
import { API_ENDPOINTS } from '@/lib/constants';
import type { Agent, AgentCreateRequest, LongRunningOperation } from '@/types/gemini';

interface UseAgentManagementReturn {
  agents: Agent[];
  isLoading: boolean;
  error: string | null;
  fetchAgents: () => Promise<void>;
  createAgent: (data: AgentCreateRequest) => Promise<Agent | null>;
  updateAgent: (name: string, fields: { displayName?: string; description?: string }) => Promise<Agent | null>;
  deleteAgent: (name: string) => Promise<boolean>;
  deployAgent: (name: string) => Promise<LongRunningOperation | null>;
}

export function useAgentManagement(): UseAgentManagementReturn {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAgents = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(API_ENDPOINTS.AGENTS);
      if (!response.ok) throw new Error('에이전트 목록 조회 실패');
      const data = await response.json();
      setAgents(data.agents || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : '에이전트 목록 조회 실패');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  const createAgentFn = useCallback(async (data: AgentCreateRequest): Promise<Agent | null> => {
    setError(null);
    try {
      const response = await fetch(API_ENDPOINTS.AGENTS, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || '에이전트 생성 실패');
      }
      const result = await response.json();
      await fetchAgents();
      return result.agent;
    } catch (err) {
      setError(err instanceof Error ? err.message : '에이전트 생성 실패');
      return null;
    }
  }, [fetchAgents]);

  const updateAgentFn = useCallback(async (
    name: string,
    fields: { displayName?: string; description?: string },
  ): Promise<Agent | null> => {
    setError(null);
    try {
      const response = await fetch(API_ENDPOINTS.AGENTS, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, ...fields }),
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || '에이전트 수정 실패');
      }
      const result = await response.json();
      await fetchAgents();
      return result.agent;
    } catch (err) {
      setError(err instanceof Error ? err.message : '에이전트 수정 실패');
      return null;
    }
  }, [fetchAgents]);

  const deleteAgentFn = useCallback(async (name: string): Promise<boolean> => {
    setError(null);
    try {
      const response = await fetch(
        `${API_ENDPOINTS.AGENTS}?name=${encodeURIComponent(name)}`,
        { method: 'DELETE' },
      );
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || '에이전트 삭제 실패');
      }
      await fetchAgents();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : '에이전트 삭제 실패');
      return false;
    }
  }, [fetchAgents]);

  const deployAgentFn = useCallback(async (name: string): Promise<LongRunningOperation | null> => {
    setError(null);
    try {
      const response = await fetch(
        `${API_ENDPOINTS.AGENTS}?action=deploy&name=${encodeURIComponent(name)}`,
        { method: 'POST' },
      );
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || '에이전트 배포 실패');
      }
      const result = await response.json();
      return result.operation;
    } catch (err) {
      setError(err instanceof Error ? err.message : '에이전트 배포 실패');
      return null;
    }
  }, []);

  return {
    agents,
    isLoading,
    error,
    fetchAgents,
    createAgent: createAgentFn,
    updateAgent: updateAgentFn,
    deleteAgent: deleteAgentFn,
    deployAgent: deployAgentFn,
  };
}
