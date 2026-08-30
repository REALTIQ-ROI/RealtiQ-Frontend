import { describe, expect, it, vi } from "vitest";
import api from "../lib/axios";
import { isReviewEligible, type OwnershipRecord } from "./ownershipService";
import { reviewService } from "./reviewService";
vi.mock("../lib/axios", () => ({ default: { post: vi.fn(), get: vi.fn() } }));
const eligible = {
  status: "owned",
  property: { _id: "property-1", owner: { id: "landlord-1" } },
  payment: {
    _id: "payment-1",
    status: "paid",
    purpose: "property_purchase",
    fulfillmentStatus: "fulfilled",
  },
  escrow: null,
} as OwnershipRecord;
describe("purchase reviews", () => {
  it("requires the paid, fulfilled purchase relationship and released-or-absent escrow", () => {
    expect(isReviewEligible(eligible)).toBe(true);
    expect(
      isReviewEligible({ ...eligible, escrow: { status: "funded" } }),
    ).toBe(false);
    expect(
      isReviewEligible({
        ...eligible,
        payment: { ...eligible.payment!, status: "refunded" },
      }),
    ).toBe(false);
  });
  it("submits immutable relationship IDs with an integer rating", async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { review: { _id: "r1" } } });
    await reviewService.create({
      landlord: "landlord-1",
      property: "property-1",
      transaction: "payment-1",
      rating: 5,
    });
    expect(api.post).toHaveBeenCalledWith("/reviews", {
      landlord: "landlord-1",
      property: "property-1",
      transaction: "payment-1",
      rating: 5,
      comment: undefined,
    });
  });
  it("rejects invalid ratings locally", async () => {
    await expect(
      reviewService.create({
        landlord: "l",
        property: "p",
        transaction: "t",
        rating: 4.5,
      }),
    ).rejects.toThrow(/whole number/);
  });
});
