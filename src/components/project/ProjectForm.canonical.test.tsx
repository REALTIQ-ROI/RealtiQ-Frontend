import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { toast } from 'sonner';
import type { CanonicalFieldDictionary } from '../../services/canonicalFieldService';
import { createCanonicalFieldDictionaryFixture } from '../../test/canonicalFieldDictionaryFixture';
import type { ProjectDetail } from '../../types';
import type { CreateProjectRequest } from '../../services/projectService';
import ProjectForm from './ProjectForm';

const mocks = vi.hoisted(() => ({ dictionary: null as CanonicalFieldDictionary | null }));
vi.mock('../../hooks/useCanonicalFieldDictionary', () => ({
  useCanonicalFieldDictionary: () => ({ dictionary: mocks.dictionary, loading: false, error: null, refresh: vi.fn() }),
}));
vi.mock('../property/LocationCascadeFields', () => ({ default: () => <div data-testid="location-cascade" /> }));

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() } }));
vi.mock('../property/MediaUploader', () => ({ default: () => <div>Project media</div> }));

describe('ProjectForm canonical fields', () => {
  beforeEach(() => { mocks.dictionary = createCanonicalFieldDictionaryFixture(); });

  it('serializes supported project enums and explicit false values', async () => {
    const onSubmit = vi.fn(async (_payload: CreateProjectRequest) => undefined);
    render(<ProjectForm onSubmit={onSubmit} />);
    await userEvent.type(screen.getByLabelText('Project name'), 'Lekki Gardens');
    await userEvent.selectOptions(screen.getByLabelText('Project type'), 'estate');
    await userEvent.selectOptions(screen.getByLabelText('Serviced status'), 'Not Serviced');
    await userEvent.click(screen.getByRole('checkbox', { name: 'Outright Purchase' }));
    await userEvent.selectOptions(screen.getByLabelText('Transaction fee payer'), 'seller');
    await userEvent.selectOptions(screen.getByLabelText('Private showings by appointment'), 'false');
    await userEvent.selectOptions(screen.getByLabelText('Live video tour available'), 'false');
    await userEvent.click(screen.getByRole('button', { name: 'Save Project' }));

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
      publicationAction: 'save_draft',
      canonicalFields: expect.objectContaining({
        projectName: 'Lekki Gardens',
        servicedStatus: 'Not Serviced',
        paymentOptions: ['Outright Purchase'],
        transactionFeePayer: 'seller',
        privateShowingsByAppointment: false,
        liveVideoTourAvailable: false,
      }),
    }));
    expect(onSubmit.mock.calls[0]?.[0]).not.toHaveProperty('country', 'Nigeria');
  }, 15_000);

  it('hides the configuration-gated mortgage option', () => {
    render(<ProjectForm onSubmit={vi.fn(async () => undefined)} />);
    expect(screen.queryByRole('checkbox', { name: /Mortgage Accepted/ })).not.toBeInTheDocument();
    expect(screen.getByText(/Mortgage Accepted is unavailable while backend configuration is disabled/)).toBeInTheDocument();
  });

  it('updates canonical street address without rewriting a different legacy address', async () => {
    const onSubmit = vi.fn(async () => undefined);
    const initialData = {
      _id: 'project-1', name: 'Existing project', slug: 'existing-project', projectType: 'estate', status: 'draft',
      virtualTourProviderOverride: null, location: { state: 'Lagos', city: 'Lekki', area: 'Lekki' }, totalUnits: 0,
      availableUnits: 0, isFeatured: false, address: 'Legacy street address', state: 'Lagos', area: 'Lekki',
      canonicalFields: {
        projectName: 'Existing project', developmentStructure: 'estate_gated_community', shortDescription: 'Short',
        projectDescription: 'Description', unitDisplayMode: 'grouped',
        streetAddress: 'Canonical street address', gatedEstate: false, buildStage: 'Newly built',
      },
    } as ProjectDetail;
    render(<ProjectForm initialData={initialData} preserveEmptyValues onSubmit={onSubmit} />);
    const canonicalAddress = screen.getByLabelText('Canonical street address');
    await userEvent.clear(canonicalAddress);
    await userEvent.type(canonicalAddress, 'Updated canonical address');
    await userEvent.click(screen.getByRole('button', { name: 'Save Project' }));
    expect(toast.error).not.toHaveBeenCalled();

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
      address: 'Legacy street address',
      canonicalFields: { streetAddress: 'Updated canonical address' },
    }));
  });
});
