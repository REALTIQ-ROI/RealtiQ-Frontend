import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Property } from '../../types';
import PropertyGallery from './PropertyGallery';

vi.mock('./map/LocationMap', () => ({
  default: ({ coordinates, title }: { coordinates: { lat: number; lng: number }; title: string }) => (
    <div role="region" aria-label={`${title} map`}>
      <button type="button" aria-label="Pan map">{coordinates.lat}, {coordinates.lng}</button>
    </div>
  ),
}));

const property = {
  _id: 'property-1', title: 'Lekki Home',
  coordinates: { lat: 6.447, lng: 3.473 },
  media: [{ type: 'image', url: '/home.jpg' }, { type: 'video', url: '/tour.mp4' }],
} as Property;

afterEach(() => vi.useRealTimers());

describe('property gallery map slide', () => {
  it('appends the current property map after photos and videos and wraps in both directions', async () => {
    render(<PropertyGallery property={property} />);
    const tabs = screen.getAllByRole('tab');
    expect(tabs.map((tab) => tab.getAttribute('aria-label'))).toEqual(['View property image 1', 'View property video 2', 'View property map']);
    expect(screen.getByText('1 / 3')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Next property media' }));
    expect(tabs[1]).toHaveAttribute('aria-selected', 'true');
    await userEvent.click(screen.getByRole('button', { name: 'Next property media' }));
    expect(screen.getByRole('region', { name: 'Lekki Home map' })).toHaveTextContent('6.447, 3.473');
    expect(screen.getByText('3 / 3 · Map')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Next property media' }));
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
    await userEvent.click(screen.getByRole('button', { name: 'Previous property media' }));
    expect(tabs[2]).toHaveAttribute('aria-selected', 'true');
  });

  it('supports the expanded map without interpreting map controls as gallery navigation', async () => {
    render(<PropertyGallery property={property} />);
    await userEvent.click(screen.getByRole('tab', { name: 'View property map' }));
    await userEvent.click(screen.getByRole('button', { name: 'Expand property map' }));
    const dialog = screen.getByRole('dialog');
    expect(screen.getAllByRole('region', { name: 'Lekki Home map' })).toHaveLength(1);
    const pan = within(dialog).getByRole('button', { name: 'Pan map' });
    await userEvent.click(pan);
    await userEvent.keyboard('{ArrowRight}');
    expect(within(dialog).getByRole('region', { name: 'Lekki Home map' })).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Previous property media' }));
    expect(within(dialog).queryByRole('region')).not.toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Next property media' }));
    expect(within(dialog).getByRole('region')).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Lekki Home map' })).toBeInTheDocument();
  });

  it('does not automatically advance away from the map', () => {
    vi.useFakeTimers();
    render(<PropertyGallery property={property} />);
    act(() => vi.advanceTimersByTime(3000));
    act(() => vi.advanceTimersByTime(3000));
    expect(screen.getByRole('tab', { name: 'View property map' })).toHaveAttribute('aria-selected', 'true');
    fireEvent.mouseLeave(screen.getByLabelText('Property media carousel'));
    act(() => vi.advanceTimersByTime(12000));
    expect(screen.getByRole('region', { name: 'Lekki Home map' })).toBeInTheDocument();
  });

  it('shows a map when a property has coordinates but no media', () => {
    render(<PropertyGallery property={{ ...property, media: [], coordinates: { lat: 0, lng: 0 } }} />);
    expect(screen.getByText('1 / 1 · Map')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Next property media' })).not.toBeInTheDocument();
    expect(screen.getByRole('region')).toHaveTextContent('0, 0');
  });

  it.each([null, { lat: NaN, lng: 3 }, { lat: 91, lng: 3 }, { lat: 6, lng: 181 }])('omits the map when coordinates are unavailable or invalid: %j', (coordinates) => {
    render(<PropertyGallery property={{ ...property, coordinates }} />);
    expect(screen.queryByRole('tab', { name: 'View property map' })).not.toBeInTheDocument();
    expect(screen.getByText('1 / 2')).toBeInTheDocument();
  });

  it('keeps the empty state when neither media nor a location is available', () => {
    render(<PropertyGallery property={{ ...property, media: [], coordinates: null }} />);
    expect(screen.getByText('No media uploaded for this property yet.')).toBeInTheDocument();
  });
});
