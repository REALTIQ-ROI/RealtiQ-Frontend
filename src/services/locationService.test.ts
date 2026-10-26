import { describe, expect, it } from 'vitest';
import { ApiRequestError } from '../lib/axios';
import { locationSuggestionFailureMessage } from './locationService';

describe('locationSuggestionFailureMessage', () => {
  it('explains an unconfigured gazetteer without inventing a location identifier', () => {
    const error = new ApiRequestError('Service unavailable.', { status: 503, code: 'FEATURE_SEARCH_GAZETTEER_UNCONFIGURED' });
    expect(locationSuggestionFailureMessage(error)).toMatch(/approved gazetteer is not active.*No canonical location ID was selected/i);
  });

  it('preserves other server-provided error messages', () => {
    expect(locationSuggestionFailureMessage(new Error('Select a parent location first.'))).toBe('Select a parent location first.');
  });
});
