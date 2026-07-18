import api from '../lib/axios';
import type { Property } from '../types';

export interface OwnershipRecord {
  _id?: string;
  id?: string;
  property?: Property | string;
  propertyId?: Property | string;
  buyer?: string;
  buyerId?: string;
  createdAt?: string;
  updatedAt?: string;
}

type OwnershipEnvelope =
  | OwnershipRecord[]
  | {
      ownerships?: OwnershipRecord[];
      records?: OwnershipRecord[];
      data?: OwnershipRecord[] | { ownerships?: OwnershipRecord[]; records?: OwnershipRecord[] };
    };

const extractOwnerships = (response: OwnershipEnvelope): OwnershipRecord[] => {
  if (Array.isArray(response)) {
    return response;
  }

  if (Array.isArray(response.ownerships)) {
    return response.ownerships;
  }

  if (Array.isArray(response.records)) {
    return response.records;
  }

  if (Array.isArray(response.data)) {
    return response.data;
  }

  if (response.data && !Array.isArray(response.data)) {
    return response.data.ownerships ?? response.data.records ?? [];
  }

  return [];
};

export const ownershipService = {
  async getMyOwnerships(): Promise<OwnershipRecord[]> {
    const { data } = await api.get<OwnershipEnvelope>('/ownerships/my');
    return extractOwnerships(data);
  },

  async getMyOwnedProperties(): Promise<Property[]> {
    const ownerships = await ownershipService.getMyOwnerships();
    return ownerships
      .map((ownership) => ownership.property ?? ownership.propertyId)
      .filter((property): property is Property => typeof property === 'object' && property !== null);
  },
};
