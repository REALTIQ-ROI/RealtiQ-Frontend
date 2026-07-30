import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '../../contexts/AuthContext';
import InspectorRegistration from './InspectorRegistration';

const renderRegistration = () => render(
  <MemoryRouter>
    <AuthProvider>
      <InspectorRegistration />
    </AuthProvider>
  </MemoryRouter>,
);

describe('Verified Property Agent registration fields', () => {
  it('toggles password visibility and uses cascading Nigerian locations', async () => {
    const user = userEvent.setup();
    renderRegistration();

    const password = screen.getByLabelText('Password');
    expect(password).toHaveAttribute('type', 'password');
    await user.click(screen.getByRole('button', { name: 'Show password' }));
    expect(password).toHaveAttribute('type', 'text');

    const state = screen.getByLabelText('State');
    expect(within(state).getAllByRole('option')).toHaveLength(38);
    expect(within(state).getByRole('option', { name: 'Federal Capital Territory (FCT)' })).toBeInTheDocument();
    await user.selectOptions(state, 'Lagos');
    const city = screen.getByLabelText('City / Local Government Area');
    expect(city).not.toBeDisabled();
    expect(within(city).getByRole('option', { name: 'Ikeja' })).toBeInTheDocument();
  });

  it('adds one service-area or specialty value as removable chips', async () => {
    const user = userEvent.setup();
    renderRegistration();

    const serviceArea = screen.getByLabelText('Service areas');
    await user.type(serviceArea, 'Lekki{Enter}');
    expect(screen.getByText('Lekki')).toBeInTheDocument();
    expect(serviceArea).toHaveValue('');
    await user.type(serviceArea, 'lekki{Enter}');
    expect(screen.getAllByText(/lekki/i)).toHaveLength(1);
    await user.click(screen.getByRole('button', { name: 'Remove Lekki from service areas' }));
    expect(screen.queryByText('Lekki')).not.toBeInTheDocument();

    const specialty = screen.getByLabelText('Specialties');
    await user.type(specialty, 'Building condition');
    await user.click(screen.getAllByRole('button', { name: 'Add' })[1]);
    expect(screen.getByText('Building condition')).toBeInTheDocument();
  });

  it('fills latitude and longitude from browser geolocation', async () => {
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: {
        getCurrentPosition: vi.fn((success: PositionCallback) => success({
          coords: { latitude: 6.4698, longitude: 3.5852 } as GeolocationCoordinates,
        } as GeolocationPosition)),
      },
    });
    const user = userEvent.setup();
    renderRegistration();

    await user.click(screen.getByRole('button', { name: /use my current location/i }));
    expect(screen.getByLabelText('Latitude (optional)')).toHaveValue(6.4698);
    expect(screen.getByLabelText('Longitude (optional)')).toHaveValue(3.5852);
    expect(screen.getByText('Your current device coordinates were added.')).toBeInTheDocument();
  });
});
