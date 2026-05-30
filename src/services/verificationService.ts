import api from '../lib/axios';
import { propertyService } from './propertyService';
import { userService } from './userService';
import type { User } from '../types';

export interface SubmitVerificationPayload {
  fullLegalName: string;
  nationalId: string;
  address: string;
  idDocumentUrl: string;
  selfieUrl: string;
}

export interface ReviewVerificationPayload {
  approved: boolean;
}

export interface VerificationSubmissionResponse {
  fullLegalName: string;
  nationalId: string;
  address: string;
  idDocumentUrl: string;
  selfieUrl: string;
  status: 'pending' | 'approved' | 'rejected' | string;
  submittedAt?: string;
  reviewedAt?: string;
  _id?: string;
}

const uploadSingleFile = async (file: File, onProgress?: (percent: number) => void) => {
  const result = await propertyService.uploadMedia([file], onProgress);
  const url = result.url ?? result.media[0]?.url;
  if (!url) {
    throw new Error('File upload failed.');
  }
  return url;
};

export const verificationService = {
  async uploadVerificationFile(file: File, onProgress?: (percent: number) => void): Promise<string> {
    return uploadSingleFile(file, onProgress);
  },

  async submitVerification(payload: SubmitVerificationPayload): Promise<VerificationSubmissionResponse> {
    const { data } = await api.post<VerificationSubmissionResponse>('/verification/submit', payload);
    return data;
  },

  async reviewVerification(landlordId: string, approved: boolean): Promise<User> {
    const { data } = await api.patch<User>(`/verification/review/${landlordId}`, { approved });
    return data;
  },

  async fetchLandlordRequests(): Promise<User[]> {
    const landlords = await userService.fetchLandlords();
    return landlords.filter((landlord) => Boolean(landlord.kyc?.status));
  },
};
