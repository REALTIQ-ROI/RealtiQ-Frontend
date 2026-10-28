import { describe, expect, it } from 'vitest';
import { adminInspectorProfileId } from './config';

describe('admin inspector profile identity', () => {
  it('uses the profile identifier and never substitutes a nested account identifier', () => {
    expect(adminInspectorProfileId({ _id: 'profile-1', user: { _id: 'account-1' } })).toBe('profile-1');
    expect(adminInspectorProfileId({ profileId: 'profile-2', user: { _id: 'account-2' } })).toBe('profile-2');
    expect(adminInspectorProfileId({ id: 'profile-3', user: { _id: 'account-3' } })).toBe('profile-3');
    expect(adminInspectorProfileId({ user: { _id: 'account-only' } })).toBeNull();
  });

  it('rejects missing and placeholder identifiers instead of generating an invalid detail URL', () => {
    expect(adminInspectorProfileId(null)).toBeNull();
    expect(adminInspectorProfileId({ _id: 'undefined', id: '  ' })).toBeNull();
    expect(adminInspectorProfileId({ profileId: ' null ' })).toBeNull();
  });
});
