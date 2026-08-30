import api, { ApiRequestError } from "../lib/axios";
import type { AvmPurpose, AvmValuation, Pagination } from "../types/phase45";
import { phase45Cache } from "../features/phase45/cache";

export const avmService = {
  async evaluate(
    input: { propertyReference: string; purpose: AvmPurpose; asOf?: string },
    idempotencyKey: string,
  ) {
    if (input.asOf && new Date(input.asOf).getTime() > Date.now())
      throw new Error("The valuation date cannot be in the future.");
    const { data } = await api.post<{ valuation: AvmValuation }>(
      "/avm/v1/valuations",
      input,
      { headers: { "Idempotency-Key": idempotencyKey } },
    );
    return phase45Cache.set(
      "valuations",
      data.valuation.publicReference,
      data.valuation,
    );
  },
  async detail(reference: string, force = false) {
    if (!force) {
      const cached = phase45Cache.get<AvmValuation>("valuations", reference);
      if (cached) return cached;
    }
    try {
      const { data } = await api.get<{ valuation: AvmValuation }>(
        `/avm/v1/valuations/${reference}`,
      );
      return phase45Cache.set("valuations", reference, data.valuation);
    } catch (error) {
      if (error instanceof ApiRequestError && error.status === 403)
        phase45Cache.remove("valuations", reference);
      throw error;
    }
  },
  async history(
    propertyReference: string,
    query: { page?: number; limit?: number; asOf?: string } = {},
  ) {
    const key = `${propertyReference}:${JSON.stringify(query)}`;
    const { data } = await api.get<{
      valuations: AvmValuation[];
      pagination: Pagination;
    }>(`/avm/v1/properties/${propertyReference}/valuations`, { params: query });
    return phase45Cache.set("valuations", key, data);
  },
};
