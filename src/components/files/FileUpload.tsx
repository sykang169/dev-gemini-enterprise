'use client';

import { useCallback, useRef, useState, type DragEvent } from 'react';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import FileList from './FileList';
import { SUPPORTED_FILE_EXTENSIONS } from '@/lib/constants';
import type { FileUploadResponse } from '@/types/gemini';

interface FileUploadProps {
  uploadedFiles: FileUploadResponse[];
  isUploading: boolean;
  onUpload: (file: File) => Promise<FileUploadResponse | null>;
  onRemove: (fileId: string) => void;
  onClose: () => void;
}

export default function FileUpload({
  uploadedFiles,
  isUploading,
  onUpload,
  onRemove,
  onClose,
}: FileUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback(
    async (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragOver(false);
      const files = Array.from(e.dataTransfer.files);
      for (const file of files) {
        await onUpload(file);
      }
    },
    [onUpload],
  );

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      for (const file of files) {
        await onUpload(file);
      }
      if (inputRef.current) inputRef.current.value = '';
    },
    [onUpload],
  );

  return (
    <div className="border-t border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Attach Files</h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors ${
          isDragOver
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
            : 'border-gray-300 dark:border-gray-600'
        }`}
      >
        {isUploading ? (
          <Spinner size="md" />
        ) : (
          <>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="mb-2 h-8 w-8 text-gray-400">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
            </svg>
            <p className="text-sm text-gray-500">
              Drag & drop or{' '}
              <button
                onClick={() => inputRef.current?.click()}
                className="font-medium text-blue-600 hover:underline"
              >
                browse
              </button>
            </p>
            <p className="mt-1 text-xs text-gray-400">
              {SUPPORTED_FILE_EXTENSIONS.join(', ')}
            </p>
          </>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        onChange={handleFileSelect}
        accept={SUPPORTED_FILE_EXTENSIONS.join(',')}
        className="hidden"
        multiple
      />

      {uploadedFiles.length > 0 && (
        <div className="mt-3">
          <FileList files={uploadedFiles} onRemove={onRemove} />
        </div>
      )}
    </div>
  );
}
