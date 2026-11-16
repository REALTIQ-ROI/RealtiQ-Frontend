import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import SavedSearchAlertsFields, { defaultSavedSearchAlerts } from './SavedSearchAlertsFields';

describe('SavedSearchAlertsFields', () => {
  it('provides labelled accessible alert controls and preserves nested choices', () => {
    const onChange = vi.fn();
    render(<SavedSearchAlertsFields value={defaultSavedSearchAlerts} onChange={onChange} idPrefix="test-alerts" />);

    fireEvent.click(screen.getByLabelText('Enable alerts for this search'));
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ enabled: true }));

    fireEvent.click(screen.getByLabelText('Asking-price reductions'));
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({
      triggers: { newListings: true, priceReductions: true },
    }));

    fireEvent.click(screen.getByLabelText('Push notifications'));
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({
      channels: { inApp: true, email: true, sms: false, whatsapp: false, push: true },
    }));

    expect(screen.getByLabelText('Cadence')).toBeVisible();
    expect(screen.getByLabelText('Time zone (optional)')).toBeVisible();
  });
});
