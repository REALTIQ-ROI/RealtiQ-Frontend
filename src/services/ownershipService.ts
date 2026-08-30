import api from "../lib/axios";
import type { Property } from "../types";

export interface OwnershipPayment {
  _id: string;
  status: string;
  purpose?: string;
  paymentType?: string;
  fulfilled?: boolean;
  fulfillmentStatus?: string;
}
export interface OwnershipEscrow {
  status: string;
}
export interface OwnershipRecord {
  _id?: string;
  id?: string;
  property?:
    | (Property & { owner?: { id?: string; _id?: string; name?: string } })
    | string;
  propertyId?: Property | string;
  payment?: OwnershipPayment;
  escrow?: OwnershipEscrow | null;
  status?: string;
  buyer?: string;
  buyerId?: string;
  review?: { _id?: string } | null;
  createdAt?: string;
  updatedAt?: string;
}
type OwnershipEnvelope =
  | OwnershipRecord[]
  | {
      ownerships?: OwnershipRecord[];
      records?: OwnershipRecord[];
      data?:
        | OwnershipRecord[]
        | { ownerships?: OwnershipRecord[]; records?: OwnershipRecord[] };
    };
const extractOwnerships = (response: OwnershipEnvelope): OwnershipRecord[] => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response.ownerships)) return response.ownerships;
  if (Array.isArray(response.records)) return response.records;
  if (Array.isArray(response.data)) return response.data;
  return response.data?.ownerships ?? response.data?.records ?? [];
};
export const isReviewEligible = (ownership: OwnershipRecord) => {
  const property =
    typeof ownership.property === "object" ? ownership.property : undefined;
  const payment = ownership.payment;
  const fulfilled =
    payment?.fulfilled === true || payment?.fulfillmentStatus === "fulfilled";
  const propertyPurchase =
    payment?.purpose === "property_purchase" ||
    payment?.paymentType === "property_purchase";
  return (
    ownership.status === "owned" &&
    payment?.status === "paid" &&
    fulfilled &&
    propertyPurchase &&
    Boolean(property?.owner?.id) &&
    (!ownership.escrow || ownership.escrow.status === "released") &&
    !ownership.review
  );
};
export const ownershipService = {
  async getMyOwnerships(): Promise<OwnershipRecord[]> {
    const { data } = await api.get<OwnershipEnvelope>("/ownerships/my");
    return extractOwnerships(data);
  },
  async getMyOwnedProperties(): Promise<Property[]> {
    const ownerships = await ownershipService.getMyOwnerships();
    return ownerships
      .map((item) => item.property ?? item.propertyId)
      .filter(
        (property): property is Property =>
          typeof property === "object" && property !== null,
      );
  },
};
