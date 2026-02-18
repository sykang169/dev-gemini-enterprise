'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import type { AdvancedChatSettings, ConditionBoostSpec, QueryClassificationType } from '@/types/gemini';

const STORAGE_KEY = 'gemini-advanced-settings';

const DEFAULT_SETTINGS: AdvancedChatSettings = {
  preamble: '',
  answerLanguageCode: '',
  ignoreAdversarialQuery: false,
  ignoreNonAnswerSeekingQuery: false,
  ignoreLowRelevantContent: false,
  queryRephraserDisabled: false,
  maxRephraseSteps: 3,
  queryClassificationTypes: [],
  searchFilter: '',
  boostSpecs: [],
  maxReturnResults: undefined,
  searchResultMode: undefined,
};

function loadSettings(): AdvancedChatSettings {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
    }
  } catch {
    // ignore
  }
  return { ...DEFAULT_SETTINGS };
}

function saveSettings(settings: AdvancedChatSettings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // localStorage full or unavailable
  }
}

export function useAdvancedSettings() {
  const [settings, setSettings] = useState<AdvancedChatSettings>(DEFAULT_SETTINGS);
  const loaded = useRef(false);

  // Load from localStorage after hydration
  useEffect(() => {
    setSettings(loadSettings());
    loaded.current = true;
  }, []);

  // Persist whenever settings change (skip initial load)
  useEffect(() => {
    if (loaded.current) {
      saveSettings(settings);
    }
  }, [settings]);

  const updateSetting = useCallback(<K extends keyof AdvancedChatSettings>(
    key: K,
    value: AdvancedChatSettings[K],
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }, []);

  const toggleQueryClassificationType = useCallback((type: QueryClassificationType) => {
    setSettings((prev) => {
      const types = prev.queryClassificationTypes || [];
      const next = types.includes(type)
        ? types.filter((t) => t !== type)
        : [...types, type];
      return { ...prev, queryClassificationTypes: next };
    });
  }, []);

  const addBoostSpec = useCallback(() => {
    setSettings((prev) => ({
      ...prev,
      boostSpecs: [...(prev.boostSpecs || []), { condition: '', boost: 0 }],
    }));
  }, []);

  const updateBoostSpec = useCallback((index: number, spec: ConditionBoostSpec) => {
    setSettings((prev) => {
      const specs = [...(prev.boostSpecs || [])];
      specs[index] = spec;
      return { ...prev, boostSpecs: specs };
    });
  }, []);

  const removeBoostSpec = useCallback((index: number) => {
    setSettings((prev) => ({
      ...prev,
      boostSpecs: (prev.boostSpecs || []).filter((_, i) => i !== index),
    }));
  }, []);

  const resetSettings = useCallback(() => {
    setSettings({ ...DEFAULT_SETTINGS });
  }, []);

  // Check if any settings are active (non-default)
  const hasActiveSettings =
    !!settings.preamble ||
    !!settings.answerLanguageCode ||
    settings.ignoreAdversarialQuery ||
    settings.ignoreNonAnswerSeekingQuery ||
    settings.ignoreLowRelevantContent ||
    settings.queryRephraserDisabled ||
    (settings.queryClassificationTypes && settings.queryClassificationTypes.length > 0) ||
    !!settings.searchFilter ||
    (settings.boostSpecs && settings.boostSpecs.length > 0) ||
    settings.maxReturnResults !== undefined ||
    settings.searchResultMode !== undefined;

  return {
    settings,
    hasActiveSettings,
    updateSetting,
    toggleQueryClassificationType,
    addBoostSpec,
    updateBoostSpec,
    removeBoostSpec,
    resetSettings,
  };
}
