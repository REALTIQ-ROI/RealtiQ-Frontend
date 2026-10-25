import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { ProjectDetail } from '../../types';
import ProjectForm from './ProjectForm';

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() } }));
vi.mock('../property/MediaUploader', () => ({ default: () => <div>Project media</div> }));

describe('ProjectForm canonical fields', () => {
  it('serializes supported project enums and explicit false values', async () => {
    const onSubmit = vi.fn(async () => undefined);
    render(<ProjectForm onSubmit={onSubmit} />);
    await userEvent.type(screen.getByLabelText('Project name'), 'Lekki Gardens');
    await userEvent.selectOptions(screen.getByLabelText('Serviced status'), 'Not Serviced');
    await userEvent.click(screen.getByRole('checkbox', { name: 'Outright Purchase' }));
    await userEvent.selectOptions(screen.getByLabelText('Transaction fee payer'), 'seller');
    await userEvent.selectOptions(screen.getByLabelText('Private showings by appointment'), 'false');
    await userEvent.selectOptions(screen.getByLabelText('Live video tour available'), 'false');
    await userEvent.click(screen.getByRole('button', { name: 'Save Project' }));

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
      canonicalFields: expect.objectContaining({
        projectName: 'Lekki Gardens',
        servicedStatus: 'Not Serviced',
        paymentOptions: ['Outright Purchase'],
        transactionFeePayer: 'seller',
        privateShowingsByAppointment: false,
        liveVideoTourAvailable: false,
      }),
    }));
  });

  it('withholds the configuration-gated mortgage option', () => {
    render(<ProjectForm onSubmit={vi.fn(async () => undefined)} />);
    expect(screen.getByRole('checkbox', { name: /Mortgage Accepted/ })).toBeDisabled();
  });

  it('updates canonical street address without rewriting a different legacy address', async () => {
    const onSubmit = vi.fn(async () => undefined);
    const initialData = {
      _id: 'project-1', name: 'Existing project', slug: 'existing-project', projectType: 'estate', status: 'draft',
      virtualTourProviderOverride: null, location: { state: 'Lagos', city: 'Lekki', area: 'Lekki' }, totalUnits: 0,
      availableUnits: 0, isFeatured: false, address: 'Legacy street address', state: 'Lagos', area: 'Lekki',
      canonicalFields: {
        projectName: 'Existing project', developmentStructure: 'Estate / gated community', shortDescription: 'Short',
        projectDescription: 'Description', unitDisplayMode: 'Grouped by unit type', state: 'Lagos', area: 'Lekki',
        streetAddress: 'Canonical street address', gatedEstate: false, buildStage: 'Newly built',
      },
    } as ProjectDetail;
    render(<ProjectForm initialData={initialData} preserveEmptyValues onSubmit={onSubmit} />);
    const canonicalAddress = screen.getByLabelText('Canonical street address');
    await userEvent.clear(canonicalAddress);
    await userEvent.type(canonicalAddress, 'Updated canonical address');
    await userEvent.click(screen.getByRole('button', { name: 'Save Project' }));

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
      address: 'Legacy street address',
      canonicalFields: { streetAddress: 'Updated canonical address' },
    }));
  });
});
