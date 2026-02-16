'use client';

import { useState, useEffect } from 'react';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { API_ENDPOINTS } from '@/lib/constants';
import type { Agent } from '@/types/gemini';

interface AgentSelectorProps {
  selectedAgents: string[];
  onSelectionChange: (agents: string[]) => void;
}

export default function AgentSelector({ selectedAgents, onSelectionChange }: AgentSelectorProps) {
  const [customAgentId, setCustomAgentId] = useState('');
  const [availableAgents, setAvailableAgents] = useState<Agent[]>([]);

  useEffect(() => {
    fetch(API_ENDPOINTS.AGENTS)
      .then((res) => res.json())
      .then((data) => {
        if (data.agents) setAvailableAgents(data.agents);
      })
      .catch(() => {});
  }, []);

  const handleToggle = (agentId: string) => {
    if (selectedAgents.includes(agentId)) {
      onSelectionChange(selectedAgents.filter((a) => a !== agentId));
    } else {
      onSelectionChange([...selectedAgents, agentId]);
    }
  };

  const handleAddCustom = () => {
    if (!customAgentId.trim() || selectedAgents.includes(customAgentId)) return;
    onSelectionChange([...selectedAgents, customAgentId]);
    setCustomAgentId('');
  };

  const handleRemoveCustom = (agentId: string) => {
    onSelectionChange(selectedAgents.filter((a) => a !== agentId));
  };

  const knownAgentIds = availableAgents.map((a) => a.agentId || '');
  const customAgents = selectedAgents.filter(
    (a) => !knownAgentIds.includes(a),
  );

  return (
    <div className="space-y-4">
      <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">Agents</h3>

      {availableAgents.length > 0 ? (
        <div className="space-y-2">
          {availableAgents.map((agent) => (
            <label
              key={agent.name}
              className="flex items-center gap-3 rounded-lg border border-gray-200 p-3 cursor-pointer hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
            >
              <input
                type="checkbox"
                checked={selectedAgents.includes(agent.agentId || '')}
                onChange={() => handleToggle(agent.agentId || '')}
                className="h-4 w-4 rounded border-gray-300 text-blue-600"
              />
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{agent.displayName}</p>
                <p className="text-xs text-gray-400">{agent.agentId}</p>
              </div>
            </label>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-400">No agents available from the API. You can add custom agent IDs below.</p>
      )}

      {customAgents.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-gray-500">Custom Agents</p>
          {customAgents.map((id) => (
            <div key={id} className="flex items-center justify-between rounded bg-gray-100 px-3 py-1.5 dark:bg-gray-800">
              <span className="text-sm text-gray-700 dark:text-gray-300">{id}</span>
              <button onClick={() => handleRemoveCustom(id)} className="text-gray-400 hover:text-red-500">
                &times;
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <Input
          value={customAgentId}
          onChange={(e) => setCustomAgentId(e.target.value)}
          placeholder="Custom agent ID"
          className="flex-1"
        />
        <Button onClick={handleAddCustom} variant="secondary" disabled={!customAgentId.trim()}>
          Add
        </Button>
      </div>
    </div>
  );
}
