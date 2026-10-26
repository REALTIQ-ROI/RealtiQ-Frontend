import api from '../lib/axios';
import { buildBoundTitleUploadFormData, type TitleUploadStepUpBody } from '../utils/titleUploadStepUp';
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
    const { data } = await api.post<TitleAssetUploadResponse>('/documents/title-asset-upload', form, {
      onUploadProgress: (event) => {
        if (event.total && onProgress) onProgress(Math.round((event.loaded * 100) / event.total));
      },
    });
    return data;
  },

  async uploadTitleDocument(input: UploadTitleDocumentInput, challengeId: string, boundBody: TitleUploadStepUpBody): Promise<TitleDocumentUploadResponse> {
    const form = buildBoundTitleUploadFormData(input.file, boundBody);
    const { data } = await api.post<TitleDocumentUploadResponse>(
      `/documents/properties/${encodeURIComponent(input.propertyId)}/title-upload`,
      form,
      { headers: { 'X-Step-Up-Challenge': challengeId } },
    );
    return data;
  },

  async listPropertyDocuments(params: ListPropertyDocumentsParams): Promise<{ documents: TitleDocumentRecord[] }> {
    const { data } = await api.get<{ documents: TitleDocumentRecord[] }>('/documents', { params });
    return data;
  },

  async getDocument(id: string): Promise<{ document: TitleDocumentRecord }> {
    const { data } = await api.get<{ document: TitleDocumentRecord }>(`/documents/${encodeURIComponent(id)}`);
    return data;
  },
};
