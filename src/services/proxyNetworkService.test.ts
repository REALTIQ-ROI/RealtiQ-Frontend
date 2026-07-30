import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../lib/axios';
import { proxyNetworkService } from './proxyNetworkService';

vi.mock('../lib/axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn() },
}));

describe('proxyNetworkService contracts', () => {
  beforeEach(() => vi.clearAllMocks());

  it('maps every public directory filter and omits empty values', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { inspectors: [], total: 0, page: 2, limit: 20 } });
    await proxyNetworkService.listPublicInspectors({
      state: 'Lagos', city: 'Lekki', serviceArea: 'Victoria Island',
      professionalType: 'civil_engineer', specialty: 'water damage', minimumRating: 4,
      availability: 'available', search: 'building', latitude: 6.4, longitude: 3.5,
      radius: 50, page: 2, limit: 20,
    });
    expect(api.get).toHaveBeenCalledWith('/proxy-inspectors', {
      params: {
        state: 'Lagos', city: 'Lekki', serviceArea: 'Victoria Island',
        professionalType: 'civil_engineer', specialty: 'water damage', minimumRating: 4,
        availability: 'available', search: 'building', latitude: 6.4, longitude: 3.5,
        radius: 50, page: 2, limit: 20,
      },
      signal: undefined,
    });
  });

  it('loads every discoverable page used to build existing-value dropdowns', async () => {
    vi.mocked(api.get)
      .mockResolvedValueOnce({ data: { inspectors: [{ _id: 'p1' }], total: 3, page: 1, limit: 2 } })
      .mockResolvedValueOnce({ data: { inspectors: [{ _id: 'p2' }, { _id: 'p3' }], total: 3, page: 2, limit: 2 } });

    const profiles = await proxyNetworkService.listPublicInspectorFacetProfiles();

    expect(profiles.map((profile) => profile._id)).toEqual(['p1', 'p2', 'p3']);
    expect(api.get).toHaveBeenNthCalledWith(1, '/proxy-inspectors', {
      params: { page: 1, limit: 100 },
      signal: undefined,
    });
    expect(api.get).toHaveBeenNthCalledWith(2, '/proxy-inspectors', {
      params: { page: 2, limit: 2 },
      signal: undefined,
    });
  });

  it('maps Admin property-agent dropdown filters and loads all facet pages', async () => {
    vi.mocked(api.get)
      .mockResolvedValueOnce({ data: { inspectors: [], total: 0, page: 1, limit: 25 } })
      .mockResolvedValueOnce({ data: { inspectors: [{ _id: 'admin-p1' }], total: 2, page: 1, limit: 1 } })
      .mockResolvedValueOnce({ data: { inspectors: [{ _id: 'admin-p2' }], total: 2, page: 2, limit: 1 } });

    await proxyNetworkService.listAdminInspectors({
      state: 'Lagos',
      city: 'Lekki',
      serviceArea: 'Victoria Island',
      specialty: 'building condition',
      page: 1,
      limit: 25,
    });
    const facetProfiles = await proxyNetworkService.listAdminInspectorFacetProfiles();

    expect(api.get).toHaveBeenNthCalledWith(1, '/admin/proxy-inspectors', {
      params: {
        state: 'Lagos',
        city: 'Lekki',
        serviceArea: 'Victoria Island',
        specialty: 'building condition',
        page: 1,
        limit: 25,
      },
      signal: undefined,
    });
    expect(facetProfiles.map((profile) => profile._id)).toEqual(['admin-p1', 'admin-p2']);
  });

  it('constructs exact registration multipart fields without a content-type header', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { message: 'ok' } });
    const photo = new File(['image'], 'profile.webp', { type: 'image/webp' });
    await proxyNetworkService.register({
      name: 'Ada Okafor', email: 'ada@example.com', password: 'StrongPass1', phone: '+2348012345678',
      professionalType: 'civil_engineer', professionalTitle: 'Civil Engineer', yearsOfExperience: 8,
      bio: 'Independent professional.', location: { country: 'Nigeria', state: 'Lagos', city: 'Lekki' },
      serviceAreas: ['Lekki'], specialties: ['building condition'], profileImage: photo,
    });
    const body = vi.mocked(api.post).mock.calls[0][1] as FormData;
    expect([...body.keys()]).toEqual(['name','email','password','phone','professionalType','professionalTitle','yearsOfExperience','bio','location','serviceAreas','specialties','profileImage']);
    expect(body.get('location')).toBe(JSON.stringify({ country: 'Nigeria', state: 'Lagos', city: 'Lekki' }));
    expect(vi.mocked(api.post).mock.calls[0][2]).toEqual({ signal: undefined });
  });

  it('repeats KYC professional documents and uses the required JSON labels field', () => {
    const form = proxyNetworkService.kycForm({
      fullLegalName: 'Adaeze Okafor', phone: '+2348', address: '12 Road', nationalId: 'ID-123',
      idDocument: new File(['id'], 'id.png', { type: 'image/png' }),
      selfie: new File(['selfie'], 'selfie.png', { type: 'image/png' }),
      professionalDocuments: [new File(['a'], 'certificate.pdf'), new File(['b'], 'cv.docx')],
      professionalDocumentLabels: ['COREN certificate', 'Professional CV'],
    });
    expect(form.getAll('professionalDocuments')).toHaveLength(2);
    expect(form.get('professionalDocumentLabels')).toBe(JSON.stringify(['COREN certificate','Professional CV']));
  });

  it('creates requests with property and inspector user IDs and exact service fields', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { _id: 'request-1' } });
    await proxyNetworkService.createRequest({ propertyId: 'property-1', inspectorId: 'inspector-user-1', requestedServices: ['photos'], preferredDate: '2026-08-20T09:00:00.000Z' });
    expect(api.post).toHaveBeenCalledWith('/proxy-inspections', { propertyId: 'property-1', inspectorId: 'inspector-user-1', requestedServices: ['photos'], preferredDate: '2026-08-20T09:00:00.000Z' });
  });

  it('returns payment initialization pricing from the backend unchanged', async () => {
    vi.mocked(api.post).mockResolvedValue({
      data: {
        redirectUrl: 'https://checkout.paystack.com/example',
        reference: 'PAYSTACK_REFERENCE',
        pricing: {
          agreedPrice: 40_000,
          buyerFeePercentage: 10,
          buyerFeeAmount: 4_000,
          buyerTotalAmount: 44_000,
          inspectorCommissionPercentage: 10,
          inspectorCommissionAmount: 4_000,
          inspectorPayoutAmount: 36_000,
          totalPlatformRevenue: 8_000,
        },
      },
    });

    const response = await proxyNetworkService.initializePayment('request-1');

    expect(api.post).toHaveBeenCalledWith('/proxy-inspections/request-1/initialize-payment');
    expect(response.pricing?.buyerTotalAmount).toBe(44_000);
    expect(response.pricing?.inspectorPayoutAmount).toBe(36_000);
  });

  it('verifies a payout account separately before saving', async () => {
    vi.mocked(api.post).mockResolvedValue({
      data: {
        bankName: 'Guaranty Trust Bank',
        verifiedAccountName: 'ADA AGENT',
      },
    });

    const response = await proxyNetworkService.verifyPayoutAccount('0123456789', '058');

    expect(api.post).toHaveBeenCalledWith('/proxy-inspectors/payout-account/verify', {
      accountNumber: '0123456789',
      bankCode: '058',
    });
    expect(response.verifiedAccountName).toBe('ADA AGENT');
  });

  it('aligns repeated evidence fields and captions', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: [] });
    await proxyNetworkService.uploadEvidence('request-1', [new File(['a'],'front.jpg'),new File(['b'],'walkthrough.mp4')], ['Front elevation','Recorded walkthrough']);
    const body = vi.mocked(api.post).mock.calls[0][1] as FormData;
    expect(body.getAll('evidence')).toHaveLength(2);
    expect(body.getAll('captions')).toEqual(['Front elevation','Recorded walkthrough']);
    expect(vi.mocked(api.post).mock.calls[0][0]).toBe('/proxy-inspections/request-1/evidence');
  });

  it('sends exact admin resolution and profile decision bodies', async () => {
    vi.mocked(api.patch).mockResolvedValue({ data: {} });
    await proxyNetworkService.resolveDispute('request-1', 'cancel_and_refund', 'Confirmed cancellation.');
    await proxyNetworkService.reviewInspector('profile-1', { decision: 'approve', notes: 'Verified.' });
    expect(api.patch).toHaveBeenNthCalledWith(1, '/admin/proxy-inspections/request-1/resolve-dispute', { resolution: 'cancel_and_refund', notes: 'Confirmed cancellation.' });
    expect(api.patch).toHaveBeenNthCalledWith(2, '/admin/proxy-inspectors/profile-1/review', { decision: 'approve', notes: 'Verified.' });
  });
});
