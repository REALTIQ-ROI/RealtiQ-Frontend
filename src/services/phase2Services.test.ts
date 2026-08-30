import { beforeEach, describe, expect, it, vi } from "vitest";
import api from "../lib/axios";
import { messageService } from "./messageService";
import { personalisationService } from "./personalisationService";
import { notificationService } from "./notificationService";
vi.mock("../lib/axios", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));
const mocked = vi.mocked(api);
describe("Phase 2 contract services", () => {
  beforeEach(() => vi.clearAllMocks());
  it("starts property conversations without a receiver selected by the client", async () => {
    mocked.post.mockResolvedValueOnce({
      data: { conversation: { _id: "c1" } },
    });
    await messageService.start("RTQ-PROP-ABC123", "i1");
    expect(mocked.post).toHaveBeenCalledWith("/messages/conversations", {
      propertyId: "RTQ-PROP-ABC123",
      inquiryId: "i1",
    });
    expect(mocked.post.mock.calls[0][1]).not.toHaveProperty("receiverId");
  });
  it("sends attachment asset IDs rather than delivery URLs", async () => {
    mocked.post.mockResolvedValueOnce({ data: { message: { _id: "m1" } } });
    await messageService.send("c1", { attachmentIds: ["asset-1"] });
    expect(mocked.post).toHaveBeenCalledWith(
      "/messages/conversations/c1/messages",
      { attachmentIds: ["asset-1"] },
    );
  });
  it("uses idempotent PUT and DELETE favourite commands", async () => {
    mocked.put.mockResolvedValueOnce({
      data: { propertyReference: "RTQ-PROP-1", isFavourite: true, saves: 1 },
    });
    mocked.delete.mockResolvedValueOnce({
      data: { propertyReference: "RTQ-PROP-1", isFavourite: false, saves: 0 },
    });
    await personalisationService.setFavourite("RTQ-PROP-1", true);
    await personalisationService.setFavourite("RTQ-PROP-1", false);
    expect(mocked.put).toHaveBeenCalledWith(
      "/personalisation/favourites/RTQ-PROP-1",
    );
    expect(mocked.delete).toHaveBeenCalledWith(
      "/personalisation/favourites/RTQ-PROP-1",
    );
  });
  it("uses recipient-scoped notification endpoints", async () => {
    mocked.get.mockResolvedValueOnce({ data: { unreadCount: 3 } });
    mocked.patch.mockResolvedValueOnce({
      data: { modifiedCount: 3, readAt: "now" },
    });
    expect(await notificationService.unreadCount()).toBe(3);
    await notificationService.readAll();
    expect(mocked.get).toHaveBeenCalledWith("/notifications/unread-count");
    expect(mocked.patch).toHaveBeenCalledWith("/notifications/read-all");
  });
});
