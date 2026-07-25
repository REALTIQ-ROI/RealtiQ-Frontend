import { describe, expect, it } from 'vitest';
import { maskAccountNumber, trimRefundDetails, validateRefundDetails } from './refundUtils';

describe('refund detail safety utilities', () => {
  it('validates every field and preserves a leading-zero account number', () => {
    expect(Object.keys(validateRefundDetails({ accountNumber: '', bankName: '', bankCode: '' }))).toHaveLength(3);
    expect(trimRefundDetails({ accountNumber: ' 0123456789 ', bankName: ' Bank ', bankCode: ' 001 ' })).toEqual({ accountNumber: '0123456789', bankName: 'Bank', bankCode: '001' });
  });
  it('masks all but the final four account-number characters', () => {
    expect(maskAccountNumber('0123456789')).toBe('••••••6789');
  });
});
