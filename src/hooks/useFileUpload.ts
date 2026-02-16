'use client';

import { useState, useCallback } from 'react';
import { API_ENDPOINTS, SUPPORTED_FILE_FORMATS, MAX_FILE_SIZE } from '@/lib/constants';
import type { FileUploadResponse } from '@/types/gemini';

interface UseFileUploadReturn {
  uploadedFiles: FileUploadResponse[];
  isUploading: boolean;
  error: string | null;
  uploadFile: (file: File) => Promise<FileUploadResponse | null>;
  removeFile: (fileId: string) => void;
  clearFiles: () => void;
}

export function useFileUpload(): UseFileUploadReturn {
  const [uploadedFiles, setUploadedFiles] = useState<FileUploadResponse[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uploadFile = useCallback(async (file: File): Promise<FileUploadResponse | null> => {
    setError(null);

    if (!SUPPORTED_FILE_FORMATS.includes(file.type as typeof SUPPORTED_FILE_FORMATS[number])) {
      setError(`Unsupported file format: ${file.type}`);
      return null;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError(`File size exceeds maximum of ${MAX_FILE_SIZE / 1024 / 1024}MB`);
      return null;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(API_ENDPOINTS.FILES, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'File upload failed');
      }

      const result: FileUploadResponse = await response.json();
      setUploadedFiles((prev) => [...prev, result]);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'File upload failed');
      return null;
    } finally {
      setIsUploading(false);
    }
  }, []);

  const removeFile = useCallback((fileId: string) => {
    setUploadedFiles((prev) => prev.filter((f) => f.fileId !== fileId));
  }, []);

  const clearFiles = useCallback(() => {
    setUploadedFiles([]);
    setError(null);
  }, []);

  return { uploadedFiles, isUploading, error, uploadFile, removeFile, clearFiles };
}
