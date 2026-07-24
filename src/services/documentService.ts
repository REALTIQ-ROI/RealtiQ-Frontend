import api from '../lib/axios';
import type { TitleDocumentRecord, TitleDocumentType, TitleVerification } from '../types';

export interface UploadTitleDocumentInput {
  propertyId: string;
  documentType?: TitleDocumentType;
  title?: string;
  file: File;
}

export interface ListPropertyDocumentsParams {
  propertyId?: string;
  category?: 'title_document' | 'property_document' | 'general';
}

export interface TitleAssetUploadResponse {
  titleDocumentAsset: {
    assetId: string;
    mimeType: string;
    originalFileName: string;
    fileSizeBytes: number;
    expiresAt: string;
  };
}

export interface TitleDocumentUploadResponse {
  document: TitleDocumentRecord;
  verification?: TitleVerification;
  verificationExisting?: boolean;
  riskDetected?: boolean;
}

export const documentService = {
  async uploadTitleAsset(file: File, onProgress?: (percent: number) => void): Promise<TitleAssetUploadResponse> {
    const form = new FormData();
    form.append('file', file);
    const { data } = await api.post<TitleAssetUploadResponse>('/document/title-asset-upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (event) => {
        if (event.total && onProgress) onProgress(Math.round((event.loaded * 100) / event.total));
      },
    });
    return data;
  },

  async uploadTitleDocument(input: UploadTitleDocumentInput): Promise<TitleDocumentUploadResponse> {
    const form = new FormData();
    form.append('file', input.file);
    form.append('propertyId', input.propertyId);
    if (input.documentType) form.append('documentType', input.documentType);
    if (input.title?.trim()) form.append('title', input.title.trim());

    const { data } = await api.post<TitleDocumentUploadResponse>('/document/title-upload', form);
    return data;
  },

  async listPropertyDocuments(params: ListPropertyDocumentsParams): Promise<{ documents: TitleDocumentRecord[] }> {
    const { data } = await api.get<{ documents: TitleDocumentRecord[] }>('/document', { params });
    return data;
  },

  async getDocument(id: string): Promise<{ document: TitleDocumentRecord }> {
    const { data } = await api.get<{ document: TitleDocumentRecord }>(`/document/${id}`);
    return data;
  },
};
