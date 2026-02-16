'use client';

import { useState, useEffect, useCallback } from 'react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Spinner from '@/components/ui/Spinner';
import { API_ENDPOINTS } from '@/lib/constants';
import type { DataStore } from '@/types/gemini';

interface DataStoreManagerProps {
  selectedStores: string[];
  onSelectionChange: (stores: string[]) => void;
}

export default function DataStoreManager({ selectedStores, onSelectionChange }: DataStoreManagerProps) {
  const [dataStores, setDataStores] = useState<DataStore[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [newStoreName, setNewStoreName] = useState('');

  const fetchDataStores = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(API_ENDPOINTS.DATASTORES);
      if (response.ok) {
        const data = await response.json();
        setDataStores(data.dataStores || []);
      }
    } catch (error) {
      console.error('Failed to fetch datastores:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDataStores();
  }, [fetchDataStores]);

  const handleToggle = (storeName: string) => {
    if (selectedStores.includes(storeName)) {
      onSelectionChange(selectedStores.filter((s) => s !== storeName));
    } else {
      onSelectionChange([...selectedStores, storeName]);
    }
  };

  const handleCreate = async () => {
    if (!newStoreName.trim()) return;
    try {
      const response = await fetch(API_ENDPOINTS.DATASTORES, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName: newStoreName }),
      });
      if (response.ok) {
        setNewStoreName('');
        fetchDataStores();
      }
    } catch (error) {
      console.error('Failed to create datastore:', error);
    }
  };

  const handleDelete = async (name: string) => {
    try {
      const response = await fetch(
        `${API_ENDPOINTS.DATASTORES}?name=${encodeURIComponent(name)}`,
        { method: 'DELETE' },
      );
      if (response.ok) {
        onSelectionChange(selectedStores.filter((s) => s !== name));
        fetchDataStores();
      }
    } catch (error) {
      console.error('Failed to delete datastore:', error);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">Data Stores</h3>

      {isLoading ? (
        <div className="flex justify-center py-4">
          <Spinner />
        </div>
      ) : (
        <div className="space-y-2">
          {dataStores.map((store) => (
            <div
              key={store.name}
              className="flex items-center justify-between rounded-lg border border-gray-200 p-3 dark:border-gray-700"
            >
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedStores.includes(store.name)}
                  onChange={() => handleToggle(store.name)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600"
                />
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {store.displayName}
                  </p>
                  <p className="text-xs text-gray-400 truncate max-w-xs">{store.name}</p>
                </div>
              </label>
              <button
                onClick={() => handleDelete(store.name)}
                className="rounded p-1 text-gray-400 hover:text-red-500"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                </svg>
              </button>
            </div>
          ))}

          {dataStores.length === 0 && (
            <p className="py-4 text-center text-sm text-gray-400">No data stores configured</p>
          )}
        </div>
      )}

      <div className="flex gap-2">
        <Input
          value={newStoreName}
          onChange={(e) => setNewStoreName(e.target.value)}
          placeholder="New data store name"
          className="flex-1"
        />
        <Button onClick={handleCreate} disabled={!newStoreName.trim()}>
          Add
        </Button>
      </div>
    </div>
  );
}
