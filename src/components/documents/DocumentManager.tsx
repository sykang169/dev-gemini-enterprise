'use client';

import { useState, useEffect, useCallback } from 'react';
import { useDocuments } from '@/hooks/useDocuments';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import Spinner from '@/components/ui/Spinner';
import { API_ENDPOINTS } from '@/lib/constants';
import type { DataStore } from '@/types/gemini';

export default function DocumentManager() {
  const [dataStores, setDataStores] = useState<DataStore[]>([]);
  const [selectedStore, setSelectedStore] = useState<string>('');
  const [isLoadingStores, setIsLoadingStores] = useState(false);

  // Create document form
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newDocJsonData, setNewDocJsonData] = useState('');
  const [newDocUri, setNewDocUri] = useState('');
  const [newDocId, setNewDocId] = useState('');

  // Import form
  const [showImportForm, setShowImportForm] = useState(false);
  const [importType, setImportType] = useState<'gcs' | 'bigquery'>('gcs');
  const [gcsUri, setGcsUri] = useState('');
  const [bqProject, setBqProject] = useState('');
  const [bqDataset, setBqDataset] = useState('');
  const [bqTable, setBqTable] = useState('');

  // Purge form
  const [showPurgeConfirm, setShowPurgeConfirm] = useState(false);
  const [purgeFilter, setPurgeFilter] = useState('*');

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const {
    documents,
    nextPageToken,
    hasPrevPage,
    isLoading,
    error,
    operation,
    fetchDocuments,
    nextPage,
    prevPage,
    createDoc,
    deleteDoc,
    importDocs,
    purgeDocs,
  } = useDocuments({ dataStoreId: selectedStore || null });

  // Fetch data stores on mount
  useEffect(() => {
    setIsLoadingStores(true);
    fetch(API_ENDPOINTS.DATASTORES)
      .then((res) => res.json())
      .then((data) => {
        setDataStores(data.dataStores || []);
      })
      .catch(() => {})
      .finally(() => setIsLoadingStores(false));
  }, []);

  // Fetch documents when store changes
  useEffect(() => {
    if (selectedStore) {
      fetchDocuments();
    }
  }, [selectedStore, fetchDocuments]);

  const handleCreate = useCallback(async () => {
    const doc: Record<string, unknown> = {};
    if (newDocJsonData.trim()) {
      try {
        doc.jsonData = newDocJsonData;
      } catch {
        return;
      }
    }
    if (newDocUri.trim()) {
      doc.content = { uri: newDocUri };
    }

    await createDoc(doc, newDocId || undefined);
    setShowCreateForm(false);
    setNewDocJsonData('');
    setNewDocUri('');
    setNewDocId('');
  }, [newDocJsonData, newDocUri, newDocId, createDoc]);

  const handleImport = useCallback(async () => {
    if (importType === 'gcs' && gcsUri.trim()) {
      await importDocs({ gcsSource: { inputUris: gcsUri.split(',').map((s) => s.trim()) } });
    } else if (importType === 'bigquery' && bqProject && bqDataset && bqTable) {
      await importDocs({
        bigquerySource: { projectId: bqProject, datasetId: bqDataset, tableId: bqTable },
      });
    }
    setShowImportForm(false);
    setGcsUri('');
    setBqProject('');
    setBqDataset('');
    setBqTable('');
  }, [importType, gcsUri, bqProject, bqDataset, bqTable, importDocs]);

  const handlePurge = useCallback(async () => {
    await purgeDocs(purgeFilter || '*');
    setShowPurgeConfirm(false);
    setPurgeFilter('*');
  }, [purgeFilter, purgeDocs]);

  const handleDelete = useCallback(async () => {
    if (deleteTarget) {
      await deleteDoc(deleteTarget);
      setDeleteTarget(null);
    }
  }, [deleteTarget, deleteDoc]);

  const extractStoreId = (storeName: string) => storeName.split('/').pop() || storeName;

  return (
    <div className="space-y-4">
      <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">문서 관리</h3>

      {/* Data Store selector */}
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
          데이터 스토어 선택
        </label>
        {isLoadingStores ? (
          <div className="flex justify-center py-2">
            <Spinner size="sm" />
          </div>
        ) : (
          <select
            value={selectedStore}
            onChange={(e) => setSelectedStore(e.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
          >
            <option value="">선택하세요</option>
            {dataStores.map((store) => (
              <option key={store.name} value={extractStoreId(store.name)}>
                {store.displayName}
              </option>
            ))}
          </select>
        )}
      </div>

      {selectedStore && (
        <>
          {/* Action buttons */}
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => setShowCreateForm(true)}>
              문서 추가
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setShowImportForm(true)}>
              Import
            </Button>
            <Button size="sm" variant="danger" onClick={() => setShowPurgeConfirm(true)}>
              Purge
            </Button>
            <Button size="sm" variant="ghost" onClick={() => fetchDocuments()}>
              새로고침
            </Button>
          </div>

          {/* Operation status */}
          {operation && (
            <div className={`rounded-lg border p-3 text-sm ${
              operation.done
                ? operation.error
                  ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300'
                  : 'border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-300'
                : 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-300'
            }`}>
              {operation.done
                ? operation.error
                  ? `오류: ${operation.error.message}`
                  : '작업이 완료되었습니다.'
                : '작업 진행 중...'}
            </div>
          )}

          {/* Error */}
          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}

          {/* Documents table */}
          {isLoading && documents.length === 0 ? (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          ) : documents.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400">문서가 없습니다</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
                    <th className="px-4 py-2 text-left font-medium text-gray-600 dark:text-gray-400">ID</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-600 dark:text-gray-400">이름</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-600 dark:text-gray-400">타입</th>
                    <th className="px-4 py-2 text-right font-medium text-gray-600 dark:text-gray-400">작업</th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map((doc) => (
                    <tr
                      key={doc.name || doc.id}
                      className="border-b border-gray-100 last:border-0 dark:border-gray-700"
                    >
                      <td className="px-4 py-2 text-gray-700 dark:text-gray-300">
                        <span className="max-w-[120px] truncate block">{doc.id || '-'}</span>
                      </td>
                      <td className="px-4 py-2 text-gray-700 dark:text-gray-300">
                        <span className="max-w-[200px] truncate block">{doc.name?.split('/').pop() || '-'}</span>
                      </td>
                      <td className="px-4 py-2 text-gray-500 dark:text-gray-400">
                        {doc.content?.mimeType || doc.content?.uri ? 'URI' : doc.jsonData ? 'JSON' : '-'}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <button
                          onClick={() => setDeleteTarget(doc.name || null)}
                          className="rounded p-1 text-gray-400 transition-colors hover:text-red-500"
                          title="삭제"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {(hasPrevPage || nextPageToken) && (
            <div className="flex justify-between">
              <Button
                size="sm"
                variant="ghost"
                disabled={!hasPrevPage || isLoading}
                onClick={prevPage}
              >
                이전
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={!nextPageToken || isLoading}
                onClick={nextPage}
              >
                다음
              </Button>
            </div>
          )}
        </>
      )}

      {/* Create Document Modal */}
      <Modal
        isOpen={showCreateForm}
        onClose={() => setShowCreateForm(false)}
        title="문서 추가"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowCreateForm(false)}>
              취소
            </Button>
            <Button onClick={handleCreate} disabled={!newDocJsonData.trim() && !newDocUri.trim()}>
              생성
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="문서 ID (선택)"
            value={newDocId}
            onChange={(e) => setNewDocId(e.target.value)}
            placeholder="auto-generated if empty"
          />
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              JSON 데이터
            </label>
            <textarea
              value={newDocJsonData}
              onChange={(e) => setNewDocJsonData(e.target.value)}
              placeholder='{"title": "...", "content": "..."}'
              rows={4}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
            />
          </div>
          <Input
            label="또는 콘텐츠 URI"
            value={newDocUri}
            onChange={(e) => setNewDocUri(e.target.value)}
            placeholder="gs://bucket/path/file.pdf"
          />
        </div>
      </Modal>

      {/* Import Modal */}
      <Modal
        isOpen={showImportForm}
        onClose={() => setShowImportForm(false)}
        title="문서 Import"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowImportForm(false)}>
              취소
            </Button>
            <Button onClick={handleImport}>
              Import
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="flex gap-2">
            <button
              onClick={() => setImportType('gcs')}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                importType === 'gcs'
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                  : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
              }`}
            >
              GCS
            </button>
            <button
              onClick={() => setImportType('bigquery')}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                importType === 'bigquery'
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                  : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
              }`}
            >
              BigQuery
            </button>
          </div>

          {importType === 'gcs' ? (
            <Input
              label="GCS URI (쉼표로 구분)"
              value={gcsUri}
              onChange={(e) => setGcsUri(e.target.value)}
              placeholder="gs://bucket/path/*.json"
            />
          ) : (
            <>
              <Input
                label="프로젝트 ID"
                value={bqProject}
                onChange={(e) => setBqProject(e.target.value)}
                placeholder="my-project"
              />
              <Input
                label="데이터셋 ID"
                value={bqDataset}
                onChange={(e) => setBqDataset(e.target.value)}
                placeholder="my_dataset"
              />
              <Input
                label="테이블 ID"
                value={bqTable}
                onChange={(e) => setBqTable(e.target.value)}
                placeholder="my_table"
              />
            </>
          )}
        </div>
      </Modal>

      {/* Purge Confirm Modal */}
      <Modal
        isOpen={showPurgeConfirm}
        onClose={() => setShowPurgeConfirm(false)}
        title="문서 Purge"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowPurgeConfirm(false)}>
              취소
            </Button>
            <Button variant="danger" onClick={handlePurge}>
              Purge 실행
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            필터 조건에 맞는 문서를 모두 삭제합니다. 이 작업은 되돌릴 수 없습니다.
          </p>
          <Input
            label="필터 조건"
            value={purgeFilter}
            onChange={(e) => setPurgeFilter(e.target.value)}
            placeholder="* (모든 문서)"
          />
        </div>
      </Modal>

      {/* Delete Confirm Modal */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="문서 삭제"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteTarget(null)}>
              취소
            </Button>
            <Button variant="danger" onClick={handleDelete}>
              삭제
            </Button>
          </>
        }
      >
        <p className="text-sm text-gray-600 dark:text-gray-400">
          이 문서를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
        </p>
      </Modal>
    </div>
  );
}
