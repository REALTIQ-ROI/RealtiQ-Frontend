import { beforeEach, describe, expect, it, vi } from "vitest";
import api from "../lib/axios";
import { messageService } from "./messageService";
import { personalisationService } from "./personalisationService";
import { notificationService } from "./notificationService";
import { dataProtectionService } from './dataProtectionService';
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
  it('passes documented notification filters and persists only supported category/channel preferences', async () => {
    mocked.get.mockResolvedValueOnce({ data: { notifications: [], pagination: { page: 2, limit: 20, total: 21, pages: 2 } } });
    mocked.patch.mockResolvedValueOnce({ data: { preferences: { profileId: 'p1', categories: {} }, mandatoryCategories: ['security', 'payments', 'legal'] } });
    await notificationService.list({ page: 2, limit: 20, category: 'messages', read: false });
    await notificationService.updatePreferences({ messages: { inApp: true, email: false } });
    expect(mocked.get).toHaveBeenCalledWith('/notifications', { params: { page: 2, limit: 20, category: 'messages', read: false } });
    expect(mocked.patch).toHaveBeenCalledWith('/notifications/preferences', { messages: { inApp: true, email: false } });
  });
  it('creates profile-scoped access or deletion requests using the exact bound body and challenge header', async () => {
    const payload = { requestType: 'access' as const, scopes: ['profile_data' as const, 'documents' as const], operationKey: 'privacy-operation-123', expectedProfileVersion: 4 };
    mocked.post.mockResolvedValueOnce({ data: { request: { id: 'request-1', profileId: 'p1', requestType: 'access', state: 'submitted', version: 1, submittedAt: 'now', reviewedAt: null, completedAt: null, resultCodes: [], scopes: payload.scopes } } });
    const request = await dataProtectionService.create(payload, 'challenge-1');
    expect(request.id).toBe('request-1');
    expect(mocked.post).toHaveBeenCalledWith('/profiles/current/data-protection-requests', payload, { headers: { 'X-Step-Up-Challenge': 'challenge-1' } });
  });
  it('opens message attachments through the authenticated conversation attachment endpoint', async () => {
    const blob = new Blob(['authorized'], { type: 'application/pdf' });
    mocked.get.mockResolvedValueOnce({ data: blob });
    expect(await messageService.previewAttachment('conversation/1', 'message/2', 0)).toBe(blob);
    expect(mocked.get).toHaveBeenCalledWith('/messages/conversations/conversation%2F1/messages/message%2F2/attachments/0', { responseType: 'blob' });
  });
  it('uses documented staff moderation filters and decision fields', async () => {
    mocked.get.mockResolvedValueOnce({ data: { reports: [], pagination: { page: 2, limit: 50, total: 60, pages: 2 } } });
    mocked.patch.mockResolvedValueOnce({ data: { report: { _id: 'report-1', status: 'actioned' } } });
    await messageService.moderationQueue({ page: 2, limit: 50, status: 'open', reason: 'fraud' });
    await messageService.moderate('report-1', 'hide_message', 'Evidence reviewed');
    expect(mocked.get).toHaveBeenCalledWith('/messages/moderation/reports', { params: { page: 2, limit: 50, status: 'open', reason: 'fraud' } });
    expect(mocked.patch).toHaveBeenCalledWith('/messages/moderation/reports/report-1', { action: 'hide_message', reason: 'Evidence reviewed' });
  });
});
