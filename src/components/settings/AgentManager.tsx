'use client';

import { useState } from 'react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Spinner from '@/components/ui/Spinner';
import DataInsightsConfig from './DataInsightsConfig';
import { useAgentManagement } from '@/hooks/useAgentManagement';

type AgentType = 'general' | 'data_insights';

export default function AgentManager() {
  const {
    agents,
    isLoading,
    error,
    fetchAgents,
    createAgent,
    updateAgent,
    deleteAgent,
    deployAgent,
  } = useAgentManagement();

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [agentType, setAgentType] = useState<AgentType>('general');
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [editingAgent, setEditingAgent] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [deployingAgent, setDeployingAgent] = useState<string | null>(null);
  const [deployStatus, setDeployStatus] = useState<Record<string, string>>({});

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setIsCreating(true);
    const result = await createAgent({
      displayName: newName.trim(),
      description: newDescription.trim() || undefined,
    });
    setIsCreating(false);
    if (result) {
      setNewName('');
      setNewDescription('');
      setShowCreateForm(false);
    }
  };

  const handleUpdate = async (agentName: string) => {
    const fields: { displayName?: string; description?: string } = {};
    if (editName.trim()) fields.displayName = editName.trim();
    if (editDescription.trim()) fields.description = editDescription.trim();
    await updateAgent(agentName, fields);
    setEditingAgent(null);
  };

  const handleDelete = async (agentName: string) => {
    await deleteAgent(agentName);
  };

  const handleDeploy = async (agentName: string) => {
    setDeployingAgent(agentName);
    setDeployStatus((prev) => ({ ...prev, [agentName]: '배포 요청 중...' }));
    const op = await deployAgent(agentName);
    if (op) {
      setDeployStatus((prev) => ({
        ...prev,
        [agentName]: op.done ? '배포 완료' : '배포 진행 중',
      }));
    } else {
      setDeployStatus((prev) => ({ ...prev, [agentName]: '배포 실패' }));
    }
    setDeployingAgent(null);
  };

  const startEdit = (agent: { name: string; displayName: string; description?: string }) => {
    setEditingAgent(agent.name);
    setEditName(agent.displayName);
    setEditDescription(agent.description || '');
  };

  const getStateBadge = (state?: string) => {
    switch (state) {
      case 'ENABLED':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-300">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
            활성
          </span>
        );
      case 'DISABLED':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400">
            <span className="h-1.5 w-1.5 rounded-full bg-gray-400" />
            비활성
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300">
            <span className="h-1.5 w-1.5 rounded-full bg-yellow-500" />
            {state || '알 수 없음'}
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">에이전트 관리</h3>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchAgents}
            disabled={isLoading}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182" />
            </svg>
          </Button>
          <Button
            size="sm"
            onClick={() => setShowCreateForm(!showCreateForm)}
          >
            {showCreateForm ? '취소' : '새 에이전트'}
          </Button>
        </div>
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </p>
      )}

      {/* Create form */}
      {showCreateForm && (
        <div className="space-y-4 rounded-lg border border-blue-200 bg-blue-50/50 p-4 dark:border-blue-800 dark:bg-blue-900/10">
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="agentType"
                value="general"
                checked={agentType === 'general'}
                onChange={() => setAgentType('general')}
                className="h-4 w-4 text-blue-600"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">일반 에이전트</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="agentType"
                value="data_insights"
                checked={agentType === 'data_insights'}
                onChange={() => setAgentType('data_insights')}
                className="h-4 w-4 text-blue-600"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Data Insights</span>
            </label>
          </div>

          {agentType === 'general' ? (
            <div className="space-y-3">
              <Input
                label="에이전트 이름"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="에이전트 이름을 입력하세요"
              />
              <Input
                label="설명 (선택)"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="에이전트 설명"
              />
              <Button
                onClick={handleCreate}
                disabled={isCreating || !newName.trim()}
                className="w-full"
              >
                {isCreating ? (
                  <span className="flex items-center gap-2">
                    <Spinner size="sm" />
                    생성 중...
                  </span>
                ) : (
                  '에이전트 생성'
                )}
              </Button>
            </div>
          ) : (
            <DataInsightsConfig onAgentCreated={() => { fetchAgents(); setShowCreateForm(false); }} />
          )}
        </div>
      )}

      {/* Agent list */}
      {isLoading ? (
        <div className="flex justify-center py-4">
          <Spinner />
        </div>
      ) : (
        <div className="space-y-2">
          {agents.map((agent) => (
            <div
              key={agent.name}
              className="rounded-lg border border-gray-200 p-3 dark:border-gray-700"
            >
              {editingAgent === agent.name ? (
                <div className="space-y-2">
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="에이전트 이름"
                  />
                  <Input
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    placeholder="설명"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => handleUpdate(agent.name)}>
                      저장
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingAgent(null)}>
                      취소
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {agent.displayName}
                      </p>
                      {getStateBadge(agent.state)}
                    </div>
                    {agent.description && (
                      <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                        {agent.description}
                      </p>
                    )}
                    <p className="mt-0.5 text-xs text-gray-400 truncate">{agent.agentId}</p>
                    {deployStatus[agent.name] && (
                      <p className="mt-1 text-xs font-medium text-blue-600 dark:text-blue-400">
                        {deployStatus[agent.name]}
                      </p>
                    )}
                  </div>
                  <div className="ml-2 flex shrink-0 items-center gap-1">
                    {/* Deploy button */}
                    <button
                      onClick={() => handleDeploy(agent.name)}
                      disabled={deployingAgent === agent.name}
                      className="rounded p-1.5 text-gray-400 hover:bg-blue-50 hover:text-blue-600 disabled:opacity-50 dark:hover:bg-blue-900/20 dark:hover:text-blue-400"
                      title="배포"
                    >
                      {deployingAgent === agent.name ? (
                        <Spinner size="sm" />
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 0 1-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 0 0 6.16-12.12A14.98 14.98 0 0 0 9.631 8.41m5.96 5.96a14.926 14.926 0 0 1-5.841 2.58m-.119-8.54a6 6 0 0 0-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 0 0-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 0 1-2.448-2.448 14.9 14.9 0 0 1 .06-.312m-2.24 2.39a4.493 4.493 0 0 0-1.757 4.306 4.493 4.493 0 0 0 4.306-1.758M16.5 9a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z" />
                        </svg>
                      )}
                    </button>
                    {/* Edit button */}
                    <button
                      onClick={() => startEdit(agent)}
                      className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
                      title="수정"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                      </svg>
                    </button>
                    {/* Delete button */}
                    <button
                      onClick={() => handleDelete(agent.name)}
                      className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                      title="삭제"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}

          {agents.length === 0 && !isLoading && (
            <p className="py-4 text-center text-sm text-gray-400">
              등록된 에이전트가 없습니다
            </p>
          )}
        </div>
      )}
    </div>
  );
}
