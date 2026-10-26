import api from '../lib/axios';

export type NotificationDeliveryState = 'outcome_unknown' | 'activation_pending' | 'failed' | 'retry';
export type NotificationDeliveryReconcileOutcome = 'accepted' | 'not_accepted';

export interface AdminNotificationDelivery {
  id: string;
  channel: string;
  state: string;
  attempts: number;
  dueAt: string | null;
  acceptedAt: string | null;
  errorCode: string | null;
  receiptStatus: string | null;
  receiptAt: string | null;
  updatedAt: string;
}

export interface AdminNotificationDeliveryPage {
  deliveries: AdminNotificationDelivery[];
  nextCursor: string | null;
}

export interface NotificationDeliveryReconcileInput {
  outcome: NotificationDeliveryReconcileOutcome;
  evidenceReference: string;
  expectedUpdatedAt: string;
  providerMessageId?: string;
}

const base = '/admin/notification-deliveries';

export const adminNotificationDeliveryService = {
  async list(state?: NotificationDeliveryState, before?: string): Promise<AdminNotificationDeliveryPage> {
    const { data } = await api.get<AdminNotificationDeliveryPage>(base, {
      params: { ...(state ? { state } : {}), ...(before ? { before } : {}) },
    });
    return data;
  },

  async reconcile(id: string, payload: NotificationDeliveryReconcileInput, challengeId: string): Promise<AdminNotificationDelivery> {
    const { data } = await api.post<{ delivery: AdminNotificationDelivery }>(`${base}/${encodeURIComponent(id)}/reconcile`, payload, {
      headers: { 'X-Step-Up-Challenge': challengeId },
    });
    return data.delivery;
  },
};
