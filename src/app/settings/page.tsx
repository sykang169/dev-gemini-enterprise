'use client';

import { useState, useEffect, useCallback } from 'react';
import DataStoreManager from '@/components/settings/DataStoreManager';
import ToolsConfig from '@/components/settings/ToolsConfig';
import Toast from '@/components/ui/Toast';
import Button from '@/components/ui/Button';

interface Settings {
  projectId: string;
  location: string;
  appId: string;
  dataStores: string[];
  enableWebGrounding: boolean;
}

const DEFAULT_SETTINGS: Settings = {
  projectId: '',
  location: 'global',
  appId: '',
  dataStores: [],
  enableWebGrounding: false,
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [authStatus, setAuthStatus] = useState<boolean | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('gemini-chat-settings');
      if (saved) {
        setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(saved) });
      }
    } catch {
      // ignore
    }

    fetch('/api/auth')
      .then((r) => r.json())
      .then((d) => setAuthStatus(d.authenticated))
      .catch(() => setAuthStatus(false));
  }, []);

  const saveSettings = useCallback(() => {
    try {
      localStorage.setItem('gemini-chat-settings', JSON.stringify(settings));
      setToast({ message: 'Settings saved successfully', type: 'success' });
    } catch {
      setToast({ message: 'Failed to save settings', type: 'error' });
    }
  }, [settings]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white px-6 py-4 dark:border-gray-800 dark:bg-gray-900">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <div className="flex items-center gap-3">
            <a
              href="/"
              className="rounded-lg p-1 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
              </svg>
            </a>
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Settings</h1>
          </div>

          <div className="flex items-center gap-3">
            {authStatus !== null && (
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                  authStatus
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                    : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${authStatus ? 'bg-green-500' : 'bg-red-500'}`} />
                {authStatus ? 'Authenticated' : 'Not Authenticated'}
              </span>
            )}
            <Button onClick={saveSettings}>Save All</Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="mx-auto max-w-3xl space-y-8 px-6 py-8">
        {/* Data Stores */}
        <section className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
          <DataStoreManager
            selectedStores={settings.dataStores}
            onSelectionChange={(stores) =>
              setSettings((prev) => ({ ...prev, dataStores: stores }))
            }
          />
        </section>

        {/* Tools */}
        <section className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
          <ToolsConfig
            enableWebGrounding={settings.enableWebGrounding}
            onWebGroundingChange={(enabled) =>
              setSettings((prev) => ({ ...prev, enableWebGrounding: enabled }))
            }
          />
        </section>
      </div>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
