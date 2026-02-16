'use client';

import { useState, useCallback } from 'react';
import { API_ENDPOINTS } from '@/lib/constants';
import type { DlpInspectResponse, DlpFinding } from '@/types/dlp';

interface UseDlpInspectReturn {
  inspect: (text: string) => Promise<DlpInspectResponse>;
  findings: DlpFinding[];
  isSafe: boolean | null;
  isInspecting: boolean;
  error: string | null;
  clearFindings: () => void;
}

export function useDlpInspect(): UseDlpInspectReturn {
  const [findings, setFindings] = useState<DlpFinding[]>([]);
  const [isSafe, setIsSafe] = useState<boolean | null>(null);
  const [isInspecting, setIsInspecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inspect = useCallback(async (text: string): Promise<DlpInspectResponse> => {
    setIsInspecting(true);
    setError(null);

    try {
      const response = await fetch(API_ENDPOINTS.DLP, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        throw new Error('DLP inspection failed');
      }

      const result: DlpInspectResponse = await response.json();
      setFindings(result.findings);
      setIsSafe(result.safe);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'DLP inspection error';
      setError(message);
      return { safe: true, findings: [] };
    } finally {
      setIsInspecting(false);
    }
  }, []);

  const clearFindings = useCallback(() => {
    setFindings([]);
    setIsSafe(null);
    setError(null);
  }, []);

  return { inspect, findings, isSafe, isInspecting, error, clearFindings };
}
