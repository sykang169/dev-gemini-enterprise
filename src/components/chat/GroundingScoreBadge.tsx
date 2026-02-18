'use client';

import { useState } from 'react';
import type { GroundingSupport } from '@/types/gemini';

interface GroundingScoreBadgeProps {
  supports: GroundingSupport[];
}

function getScoreColor(score: number): { bg: string; text: string; border: string } {
  if (score >= 0.8) {
    return {
      bg: 'bg-green-100 dark:bg-green-900/30',
      text: 'text-green-700 dark:text-green-300',
      border: 'border-green-200 dark:border-green-800',
    };
  }
  if (score >= 0.5) {
    return {
      bg: 'bg-yellow-100 dark:bg-yellow-900/30',
      text: 'text-yellow-700 dark:text-yellow-300',
      border: 'border-yellow-200 dark:border-yellow-800',
    };
  }
  return {
    bg: 'bg-red-100 dark:bg-red-900/30',
    text: 'text-red-700 dark:text-red-300',
    border: 'border-red-200 dark:border-red-800',
  };
}

function getScoreLabel(score: number): string {
  if (score >= 0.8) return '높음';
  if (score >= 0.5) return '보통';
  return '낮음';
}

function computeAverageScore(supports: GroundingSupport[]): number | null {
  const scores: number[] = [];
  for (const support of supports) {
    if (support.groundingAttributions) {
      for (const attr of support.groundingAttributions) {
        if (attr.confidenceScore != null) {
          scores.push(attr.confidenceScore);
        }
      }
    }
  }
  if (scores.length === 0) return null;
  return scores.reduce((a, b) => a + b, 0) / scores.length;
}

export default function GroundingScoreBadge({ supports }: GroundingScoreBadgeProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  const avgScore = computeAverageScore(supports);
  if (avgScore == null) return null;

  const colors = getScoreColor(avgScore);

  const attributions = supports.flatMap(
    (s) =>
      s.groundingAttributions?.map((a) => ({
        document: a.title || a.document || '알 수 없는 문서',
        score: a.confidenceScore ?? 0,
        uri: a.uri,
      })) || [],
  );

  return (
    <div className="relative inline-flex">
      <button
        type="button"
        className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium transition-colors ${colors.bg} ${colors.text} ${colors.border}`}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onFocus={() => setShowTooltip(true)}
        onBlur={() => setShowTooltip(false)}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="h-3 w-3"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z"
          />
        </svg>
        접지 {getScoreLabel(avgScore)} ({Math.round(avgScore * 100)}%)
      </button>

      {showTooltip && attributions.length > 0 && (
        <div className="absolute bottom-full left-0 z-50 mb-2 w-64 rounded-lg border border-gray-200 bg-white p-3 shadow-lg dark:border-gray-700 dark:bg-gray-800">
          <p className="mb-2 text-xs font-semibold text-gray-900 dark:text-gray-100">
            접지 상세 정보
          </p>
          <div className="space-y-1.5">
            {attributions.map((attr, i) => {
              const attrColors = getScoreColor(attr.score);
              return (
                <div key={i} className="flex items-center justify-between gap-2">
                  <span className="truncate text-xs text-gray-600 dark:text-gray-400">
                    {attr.uri ? (
                      <a
                        href={attr.uri}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline"
                      >
                        {attr.document}
                      </a>
                    ) : (
                      attr.document
                    )}
                  </span>
                  <span
                    className={`shrink-0 rounded px-1.5 py-0.5 text-xs font-medium ${attrColors.bg} ${attrColors.text}`}
                  >
                    {Math.round(attr.score * 100)}%
                  </span>
                </div>
              );
            })}
          </div>
          <div className="mt-2 border-t border-gray-100 pt-1.5 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">평균 점수</span>
              <span className={`text-xs font-semibold ${colors.text}`}>
                {Math.round(avgScore * 100)}%
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
