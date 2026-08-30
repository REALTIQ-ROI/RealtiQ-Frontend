import api from "../lib/axios";
import type {
  AppealStatus,
  Pagination,
  ResolveAppealInput,
  ResolveAppealResult,
  TrustAppeal,
  TrustDecision,
} from "../types/phase45";
import { phase45Cache } from "../features/phase45/cache";

export const trustService = {
  async mine(force = false) {
    if (!force) {
      const cached = phase45Cache.get<TrustDecision>("trust", "me");
      if (cached) return cached;
    }
    const { data } = await api.get<{ trust: TrustDecision }>("/trust/v1/me");
    return phase45Cache.set("trust", "me", data.trust);
  },
  async appeals(force = false) {
    if (!force) {
      const cached = phase45Cache.get<TrustAppeal[]>("appeals", "mine");
      if (cached) return cached;
    }
    const { data } = await api.get<{ appeals: TrustAppeal[] }>(
      "/trust/v1/appeals",
    );
    return phase45Cache.set("appeals", "mine", data.appeals);
  },
  async createAppeal(decisionReference: string, reason: string) {
    const normalized = reason.trim();
    if (!normalized || normalized.length > 2000)
      throw new Error("Appeal reason must be between 1 and 2,000 characters.");
    const { data } = await api.post<{ appeal: TrustAppeal }>(
      "/trust/v1/appeals",
      { decisionReference, reason: normalized },
    );
    phase45Cache.remove("appeals", "mine");
    phase45Cache.remove("trust", "me");
    return data.appeal;
  },
  async adminQueue(query: {
    page?: number;
    limit?: number;
    status?: AppealStatus | "";
  }) {
    const key = JSON.stringify(query);
    const { data } = await api.get<{
      appeals: TrustAppeal[];
      pagination: Pagination;
    }>("/trust/v1/admin/appeals", { params: query });
    return phase45Cache.set("admin", `queue:${key}`, data);
  },
  async resolveAppeal(id: string, input: ResolveAppealInput) {
    const normalized = { ...input, reason: input.reason.trim() };
    if (!normalized.reason || normalized.reason.length > 2000)
      throw new Error(
        "Resolution reason must be between 1 and 2,000 characters.",
      );
    if (
      normalized.score !== undefined &&
      (!Number.isInteger(normalized.score) ||
        normalized.score < 0 ||
        normalized.score > 100)
    )
      throw new Error(
        "Replacement score must be a whole number from 0 to 100.",
      );
    if (normalized.action === "adjusted") {
      const replacementDate = normalized.reviewAt ?? normalized.expiresAt;
      if (!replacementDate || new Date(replacementDate).getTime() <= Date.now())
        throw new Error(
          "An adjustment requires a future review or expiry date.",
        );
    }
    const { data } = await api.patch<ResolveAppealResult>(
      `/trust/v1/admin/appeals/${id}`,
      normalized,
    );
    phase45Cache.clear();
    return data;
  },
  async recompute(userId: string) {
    const { data } = await api.post<{ trust: TrustDecision }>(
      `/trust/v1/admin/users/${userId}/recompute`,
    );
    phase45Cache.clear();
    return data.trust;
  },
};
