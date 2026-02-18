'use client';

import { useEffect, useRef } from 'react';
import { SUPPORTED_LANGUAGES } from '@/lib/constants';
import type { AdvancedChatSettings, ConditionBoostSpec, QueryClassificationType } from '@/types/gemini';

interface AdvancedSettingsPanelProps {
  isOpen: boolean;
  settings: AdvancedChatSettings;
  onClose: () => void;
  onUpdateSetting: <K extends keyof AdvancedChatSettings>(key: K, value: AdvancedChatSettings[K]) => void;
  onToggleQueryClassificationType: (type: QueryClassificationType) => void;
  onAddBoostSpec: () => void;
  onUpdateBoostSpec: (index: number, spec: ConditionBoostSpec) => void;
  onRemoveBoostSpec: (index: number) => void;
  onReset: () => void;
}

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (val: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
        checked ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
      }`}
      role="switch"
      aria-checked={checked}
    >
      <span
        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
          checked ? 'translate-x-4' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

export default function AdvancedSettingsPanel({
  isOpen,
  settings,
  onClose,
  onUpdateSetting,
  onToggleQueryClassificationType,
  onAddBoostSpec,
  onUpdateBoostSpec,
  onRemoveBoostSpec,
  onReset,
}: AdvancedSettingsPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/20 dark:bg-black/40">
      <div
        ref={panelRef}
        className="flex h-full w-full max-w-md flex-col overflow-y-auto bg-white shadow-xl dark:bg-gray-900"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-700">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">고급 설정</h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onReset}
              className="rounded px-2 py-1 text-xs text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
            >
              초기화
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex h-7 w-7 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-4 w-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto p-4">
          {/* ─── Feature 1: System Prompt ─── */}
          <section>
            <label className="mb-1.5 block text-xs font-medium text-gray-700 dark:text-gray-300">
              시스템 프롬프트
            </label>
            <p className="mb-2 text-[11px] text-gray-400 dark:text-gray-500">
              답변 생성 시 참고할 사전 지시문(Preamble)을 설정합니다.
            </p>
            <textarea
              value={settings.preamble || ''}
              onChange={(e) => onUpdateSetting('preamble', e.target.value)}
              placeholder="예: 항상 한국어로 답변하고, 3줄 이내로 요약해주세요."
              rows={3}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500"
            />
          </section>

          {/* ─── Feature 2: Answer Language ─── */}
          <section>
            <label className="mb-1.5 block text-xs font-medium text-gray-700 dark:text-gray-300">
              답변 언어
            </label>
            <p className="mb-2 text-[11px] text-gray-400 dark:text-gray-500">
              답변이 반환될 언어를 지정합니다.
            </p>
            <select
              value={settings.answerLanguageCode || ''}
              onChange={(e) => onUpdateSetting('answerLanguageCode', e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            >
              {SUPPORTED_LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.label}
                </option>
              ))}
            </select>
          </section>

          <div className="border-t border-gray-100 dark:border-gray-800" />

          {/* ─── Feature 3: Query Classification / Filtering ─── */}
          <section>
            <h3 className="mb-2 text-xs font-medium text-gray-700 dark:text-gray-300">
              쿼리 필터링
            </h3>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-700 dark:text-gray-300">악성 쿼리 무시</p>
                  <p className="text-[11px] text-gray-400 dark:text-gray-500">적대적 질문을 필터링합니다.</p>
                </div>
                <Toggle
                  checked={settings.ignoreAdversarialQuery || false}
                  onChange={(val) => onUpdateSetting('ignoreAdversarialQuery', val)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-700 dark:text-gray-300">비답변 쿼리 무시</p>
                  <p className="text-[11px] text-gray-400 dark:text-gray-500">답변을 구하지 않는 질문을 필터링합니다.</p>
                </div>
                <Toggle
                  checked={settings.ignoreNonAnswerSeekingQuery || false}
                  onChange={(val) => onUpdateSetting('ignoreNonAnswerSeekingQuery', val)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-700 dark:text-gray-300">저관련성 콘텐츠 무시</p>
                  <p className="text-[11px] text-gray-400 dark:text-gray-500">관련성이 낮은 검색 결과를 제외합니다.</p>
                </div>
                <Toggle
                  checked={settings.ignoreLowRelevantContent || false}
                  onChange={(val) => onUpdateSetting('ignoreLowRelevantContent', val)}
                />
              </div>
            </div>

            {/* Query Classification Types */}
            <div className="mt-3">
              <p className="mb-1.5 text-xs text-gray-700 dark:text-gray-300">쿼리 분류 유형</p>
              <div className="flex flex-wrap gap-2">
                {(['ADVERSARIAL_QUERY', 'NON_ANSWER_SEEKING_QUERY'] as QueryClassificationType[]).map((type) => {
                  const isActive = settings.queryClassificationTypes?.includes(type);
                  const label = type === 'ADVERSARIAL_QUERY' ? '악성 쿼리' : '비답변 쿼리';
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => onToggleQueryClassificationType(type)}
                      className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                        isActive
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Query Rephraser */}
            <div className="mt-3 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-700 dark:text-gray-300">쿼리 재작성 비활성화</p>
                  <p className="text-[11px] text-gray-400 dark:text-gray-500">자동 쿼리 재구성을 끕니다.</p>
                </div>
                <Toggle
                  checked={settings.queryRephraserDisabled || false}
                  onChange={(val) => onUpdateSetting('queryRephraserDisabled', val)}
                />
              </div>

              {!settings.queryRephraserDisabled && (
                <div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-700 dark:text-gray-300">최대 재작성 단계</p>
                    <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                      {settings.maxRephraseSteps || 3}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={5}
                    step={1}
                    value={settings.maxRephraseSteps || 3}
                    onChange={(e) => onUpdateSetting('maxRephraseSteps', parseInt(e.target.value, 10))}
                    className="mt-1 w-full accent-blue-600"
                  />
                  <div className="flex justify-between text-[10px] text-gray-400">
                    <span>1</span>
                    <span>5</span>
                  </div>
                </div>
              )}
            </div>
          </section>

          <div className="border-t border-gray-100 dark:border-gray-800" />

          {/* ─── Feature 4: Search Filter ─── */}
          <section>
            <label className="mb-1.5 block text-xs font-medium text-gray-700 dark:text-gray-300">
              검색 필터
            </label>
            <p className="mb-2 text-[11px] text-gray-400 dark:text-gray-500">
              검색 결과를 필터링하는 표현식을 입력합니다.
            </p>
            <input
              type="text"
              value={settings.searchFilter || ''}
              onChange={(e) => onUpdateSetting('searchFilter', e.target.value)}
              placeholder='예: category: ANY("tech", "science")'
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500"
            />
          </section>

          {/* Search Result Settings */}
          <section>
            <h3 className="mb-2 text-xs font-medium text-gray-700 dark:text-gray-300">
              검색 결과 설정
            </h3>
            <div className="space-y-3">
              <div>
                <p className="mb-1 text-xs text-gray-700 dark:text-gray-300">최대 검색 결과 수</p>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={settings.maxReturnResults ?? ''}
                  onChange={(e) => {
                    const val = e.target.value ? parseInt(e.target.value, 10) : undefined;
                    onUpdateSetting('maxReturnResults', val);
                  }}
                  placeholder="기본값 사용"
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500"
                />
              </div>

              <div>
                <p className="mb-1 text-xs text-gray-700 dark:text-gray-300">검색 결과 모드</p>
                <select
                  value={settings.searchResultMode || ''}
                  onChange={(e) => {
                    const val = e.target.value as 'DOCUMENTS' | 'CHUNKS' | '';
                    onUpdateSetting('searchResultMode', val || undefined);
                  }}
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                >
                  <option value="">기본값</option>
                  <option value="DOCUMENTS">DOCUMENTS</option>
                  <option value="CHUNKS">CHUNKS</option>
                </select>
              </div>
            </div>
          </section>

          <div className="border-t border-gray-100 dark:border-gray-800" />

          {/* ─── Feature 5: Boost Specs ─── */}
          <section>
            <div className="mb-2 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-medium text-gray-700 dark:text-gray-300">검색 부스팅</h3>
                <p className="text-[11px] text-gray-400 dark:text-gray-500">조건에 따라 검색 결과의 순위를 조정합니다.</p>
              </div>
              <button
                type="button"
                onClick={onAddBoostSpec}
                className="flex items-center gap-1 rounded-lg border border-gray-200 px-2 py-1 text-xs text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-3 w-3">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                추가
              </button>
            </div>

            {(settings.boostSpecs || []).length === 0 ? (
              <p className="text-xs text-gray-400 dark:text-gray-500">부스팅 규칙이 없습니다.</p>
            ) : (
              <div className="space-y-2">
                {(settings.boostSpecs || []).map((spec, index) => (
                  <div
                    key={index}
                    className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800/50"
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400">
                        규칙 #{index + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => onRemoveBoostSpec(index)}
                        className="text-gray-400 transition-colors hover:text-red-500"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-3.5 w-3.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                        </svg>
                      </button>
                    </div>
                    <input
                      type="text"
                      value={spec.condition || ''}
                      onChange={(e) =>
                        onUpdateBoostSpec(index, { ...spec, condition: e.target.value })
                      }
                      placeholder='조건 (예: category: "tech")'
                      className="mb-2 w-full rounded border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder:text-gray-500"
                    />
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-gray-500 dark:text-gray-400">부스트:</span>
                      <input
                        type="range"
                        min={-1}
                        max={1}
                        step={0.1}
                        value={spec.boost ?? 0}
                        onChange={(e) =>
                          onUpdateBoostSpec(index, { ...spec, boost: parseFloat(e.target.value) })
                        }
                        className="flex-1 accent-blue-600"
                      />
                      <span className="w-10 text-right text-xs font-medium text-blue-600 dark:text-blue-400">
                        {(spec.boost ?? 0).toFixed(1)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
