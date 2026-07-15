import { describe, expect, it } from 'vitest';
import { externalAnchorLabel, titleStatusLabel } from './titleVerification';

describe('title verification helpers', () => {
  it('maps verification statuses to trust-boundary-safe labels', () => {
    expect(titleStatusLabel('pending')).toBe('Title Review Pending');
    expect(titleStatusLabel('under_review')).toBe('Title Review Pending');
    expect(titleStatusLabel('approved')).toBe('Title Legally Reviewed');
    expect(titleStatusLabel('published')).toBe('Title Published in RealtiQ Registry');
    expect(titleStatusLabel('revoked')).toBe('Title Verification Revoked');
    expect(titleStatusLabel('superseded')).toBe('Title Verification Superseded');
    expect(titleStatusLabel('not_submitted')).toBe('Title Not Submitted');
  });

  it('labels optional external anchoring without treating it as publication', () => {
    expect(externalAnchorLabel('anchored')).toBe('External Anchor Completed');
    expect(externalAnchorLabel('not_requested')).toBe('External Anchor Not Requested');
    expect(externalAnchorLabel('not_configured')).toBe('External Anchor Not Configured');
  });
});
