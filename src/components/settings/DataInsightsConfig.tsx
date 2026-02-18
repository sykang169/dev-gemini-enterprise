'use client';

import { useState } from 'react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Spinner from '@/components/ui/Spinner';
import { API_ENDPOINTS } from '@/lib/constants';

interface DataInsightsConfigProps {
  onAgentCreated?: () => void;
}

export default function DataInsightsConfig({ onAgentCreated }: DataInsightsConfigProps) {
  const [bqProjectId, setBqProjectId] = useState('');
  const [bqDatasetId, setBqDatasetId] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [allowlistInput, setAllowlistInput] = useState('');
  const [blocklistInput, setBlocklistInput] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [deployStatus, setDeployStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!bqProjectId.trim() || !bqDatasetId.trim() || !displayName.trim()) return;

    setIsCreating(true);
    setError(null);
    setDeployStatus(null);

    try {
      const allowlistTables = allowlistInput
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      const blocklistTables = blocklistInput
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      const response = await fetch(API_ENDPOINTS.AGENTS, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: displayName.trim(),
          description: `Data Insights agent for ${bqProjectId}.${bqDatasetId}`,
          dataInsightsAgentConfig: {
            bqProjectId: bqProjectId.trim(),
            bqDatasetId: bqDatasetId.trim(),
            ...(allowlistTables.length > 0 && { allowlistTables }),
            ...(blocklistTables.length > 0 && { blocklistTables }),
          },
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || '에이전트 생성 실패');
      }

      const data = await response.json();

      // Auto-deploy
      setDeployStatus('배포 중...');
      const deployRes = await fetch(`${API_ENDPOINTS.AGENTS}?action=deploy&name=${encodeURIComponent(data.agent.name)}`, {
        method: 'POST',
      });

      if (deployRes.ok) {
        setDeployStatus('배포 요청 완료');
      } else {
        setDeployStatus('배포 요청 실패 (수동 배포 필요)');
      }

      // Reset form
      setBqProjectId('');
      setBqDatasetId('');
      setDisplayName('');
      setAllowlistInput('');
      setBlocklistInput('');
      onAgentCreated?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : '에이전트 생성 중 오류 발생');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5 text-blue-500">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0 1 18 16.5h-2.25m-7.5 0h7.5m-7.5 0-1 3m8.5-3 1 3m0 0 .5 1.5m-.5-1.5h-9.5m0 0-.5 1.5" />
        </svg>
        <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          Data Insights 에이전트 설정
        </h4>
      </div>

      <div className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
        <Input
          label="에이전트 이름"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="My Data Insights Agent"
        />

        <Input
          label="BigQuery 프로젝트 ID"
          value={bqProjectId}
          onChange={(e) => setBqProjectId(e.target.value)}
          placeholder="my-gcp-project"
        />

        <Input
          label="BigQuery 데이터셋 ID"
          value={bqDatasetId}
          onChange={(e) => setBqDatasetId(e.target.value)}
          placeholder="my_dataset"
        />

        <Input
          label="허용 테이블 목록 (쉼표 구분)"
          value={allowlistInput}
          onChange={(e) => setAllowlistInput(e.target.value)}
          placeholder="table1, table2"
        />

        <Input
          label="차단 테이블 목록 (쉼표 구분)"
          value={blocklistInput}
          onChange={(e) => setBlocklistInput(e.target.value)}
          placeholder="sensitive_table"
        />

        <Button
          onClick={handleCreate}
          disabled={isCreating || !bqProjectId.trim() || !bqDatasetId.trim() || !displayName.trim()}
          className="w-full"
        >
          {isCreating ? (
            <span className="flex items-center gap-2">
              <Spinner size="sm" />
              생성 중...
            </span>
          ) : (
            'Data Insights 에이전트 생성'
          )}
        </Button>

        {deployStatus && (
          <p className="text-xs font-medium text-blue-600 dark:text-blue-400">{deployStatus}</p>
        )}
        {error && (
          <p className="text-xs text-red-500">{error}</p>
        )}
      </div>
    </div>
  );
}
