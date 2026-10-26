import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ProjectCard, Property } from '../../types';
import { propertyService } from '../../services/propertyService';
import { projectService } from '../../services/projectService';
import PropertyProjectAssociation from './PropertyProjectAssociation';

const mocks = vi.hoisted(() => ({
  listMyProjects: vi.fn(),
  attachPropertyToProject: vi.fn(),
  detachPropertyFromProject: vi.fn(),
  startStepUp: vi.fn(),
  verifyStepUp: vi.fn(),
}));

vi.mock('../../services/projectService', () => ({ projectService: { listMyProjects: mocks.listMyProjects } }));
vi.mock('../../services/propertyService', () => ({ propertyService: {
  attachPropertyToProject: mocks.attachPropertyToProject,
  detachPropertyFromProject: mocks.detachPropertyFromProject,
} }));
vi.mock('../../services/stepUpService', () => ({ stepUpService: { start: mocks.startStepUp, verify: mocks.verifyStepUp } }));
vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ activeProfile: { id: 'owner-profile' }, token: 'session-token' }) }));

const currentProperty = {
  _id: 'property-1', title: 'Terrace', price: 80_000_000, location: 'Ikeja', propertyType: 'house',
  bedrooms: 3, bathrooms: 3, description: 'Owner listing', squareFeet: 1900, paymentTypes: ['outright'],
  media: [], status: 'available', version: 8,
  project: { _id: 'project-1', name: 'Current project' }, projectUnit: { unitNumber: 'A-1' },
} as unknown as Property;

const project = (id: string, name: string) => ({
  _id: id, name, slug: id, projectType: 'residential', status: 'draft', totalUnits: 0,
  availableUnits: 0, isFeatured: false, virtualTourProviderOverride: null,
}) as ProjectCard;

describe('PropertyProjectAssociation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem('activeProfileId', 'owner-profile');
    localStorage.setItem('token', 'session-token');
    mocks.listMyProjects.mockResolvedValue({ projects: [project('project-1', 'Current project'), project('project-2', 'New project')], total: 2, page: 1, limit: 50 });
    mocks.startStepUp.mockResolvedValue({ challengeId: 'challenge-1', expiresAt: new Date(Date.now() + 60_000).toISOString(), method: 'totp' });
    mocks.verifyStepUp.mockResolvedValue(undefined);
    mocks.attachPropertyToProject.mockResolvedValue({
      property: { ...currentProperty, project: { _id: 'project-2', name: 'New project' }, projectUnit: undefined },
      version: 9,
    });
    mocks.detachPropertyFromProject.mockResolvedValue({ property: { ...currentProperty, project: null }, version: 9 });
  });

  it('moves a property through a versioned, profile-bound step-up request and refreshes the record', async () => {
    const user = userEvent.setup();
    const onChanged = vi.fn().mockResolvedValue(undefined);
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<PropertyProjectAssociation property={currentProperty} onChanged={onChanged} />);

    await user.selectOptions(await screen.findByRole('combobox', { name: 'Project' }), 'project-2');
    await user.click(screen.getByRole('button', { name: 'Move to selected project' }));
    await waitFor(() => expect(mocks.startStepUp).toHaveBeenCalledWith(
      'PATCH',
      '/api/properties/property-1/project',
      { projectId: 'project-2', expectedVersion: 8 },
    ));

    await user.type(await screen.findByRole('textbox', { name: 'Six-digit authenticator code' }), '123456');
    const submit = await screen.findByRole('button', { name: 'Verify and continue' });
    await waitFor(() => expect(submit).toBeEnabled());
    await user.click(submit);

    await waitFor(() => expect(propertyService.attachPropertyToProject).toHaveBeenCalledWith(
      'property-1', { projectId: 'project-2', expectedVersion: 8 }, 'challenge-1',
    ));
    expect(await screen.findByText(/property details have been refreshed from the server/i)).toBeInTheDocument();
    expect(onChanged).toHaveBeenCalledOnce();
    expect(projectService.listMyProjects).toHaveBeenCalledWith({ page: 1, limit: 50 });
  });

  it('detaches through DELETE with the current version instead of a null project ID', async () => {
    const user = userEvent.setup();
    const onChanged = vi.fn().mockResolvedValue(undefined);
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<PropertyProjectAssociation property={currentProperty} onChanged={onChanged} />);
    await user.click(await screen.findByRole('button', { name: 'Detach project' }));
    await waitFor(() => expect(mocks.startStepUp).toHaveBeenCalledWith(
      'DELETE', '/api/properties/property-1/project', { expectedVersion: 8 },
    ));
    await user.type(await screen.findByRole('textbox', { name: 'Six-digit authenticator code' }), '123456');
    const submit = await screen.findByRole('button', { name: 'Verify and continue' });
    await waitFor(() => expect(submit).toBeEnabled());
    await user.click(submit);
    await waitFor(() => expect(propertyService.detachPropertyFromProject).toHaveBeenCalledWith(
      'property-1', { expectedVersion: 8 }, 'challenge-1',
    ));
    expect(onChanged).toHaveBeenCalledOnce();
  });
});
