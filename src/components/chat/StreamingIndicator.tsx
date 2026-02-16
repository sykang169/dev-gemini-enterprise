'use client';

import type { PlanningStep } from '@/types/gemini';

interface StreamingIndicatorProps {
  isStreaming: boolean;
  steps?: PlanningStep[];
}

export default function StreamingIndicator({ isStreaming, steps }: StreamingIndicatorProps) {
  if (!isStreaming) return null;

  return (
    <div className="flex items-start gap-3">
      {/* Gemini avatar */}
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z" fill="white" />
        </svg>
      </div>

      <div className="flex flex-col gap-2 pt-1">
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <div className="flex gap-1">
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-blue-500 [animation-delay:0ms]" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-purple-500 [animation-delay:150ms]" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-pink-500 [animation-delay:300ms]" />
          </div>
          <span className="text-xs">Thinking...</span>
        </div>

        {steps && steps.length > 0 && (
          <div className="ml-1 space-y-1 border-l-2 border-blue-200 pl-3 dark:border-blue-800">
            {steps.map((step, i) => (
              <div key={i} className="text-xs text-gray-500 dark:text-gray-400">
                {step.description && <p>{step.description}</p>}
                {step.actions?.map((action, j) => (
                  action.searchAction?.query && (
                    <p key={j} className="flex items-center gap-1 italic text-gray-400">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-3 w-3">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                      </svg>
                      {action.searchAction.query}
                    </p>
                  )
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
