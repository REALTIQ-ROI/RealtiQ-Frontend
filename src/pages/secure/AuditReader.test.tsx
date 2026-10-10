import { fireEvent, render, screen, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import AuditReader from './AuditReader';

const mocks = vi.hoisted(() => ({ get: vi.fn(), markdown: '# REALTIQ — Audit\n\n## 1. Executive Summary\n\n**Readable report**\n\n| Rule | Status |\n|---|---|\n| Terms | Missing |\n\n## 2. Tasks\n\n- [ ] AUD-RQS01-0001 — Do the work\n\n<script>window.leaked=true</script>' }));
vi.mock('../../../needed-updates.md?raw', () => ({ default: mocks.markdown }));
vi.mock('../../../realtiq-action-summary.md?raw', () => ({ default: mocks.markdown }));
vi.mock('../../../realtiq-delivery-plan.md?raw', () => ({ default: `${mocks.markdown}\n\n## 3. Quotation\n\nQuote breakdown\n\n## 4. Timeline\n\nDelivery order` }));
vi.mock('../../../combined-current-scope.md?raw', () => ({ default: '# Combined\n\n## Joint scope\n\nCombined findings' }));
vi.mock('../../../backend-needed-updates.md?raw', () => ({ default: '# Backend\n\n## Server findings\n\nBackend findings' }));
vi.mock('../../lib/axios', () => ({ default: { get: mocks.get } }));

afterEach(() => { cleanup(); vi.clearAllMocks(); });
describe('frontend audit reader', () => {
  it('opens the delivery plan by default and provides separate improvement, quote and timeline sections', () => {
    render(<MemoryRouter><AuditReader /></MemoryRouter>);
    expect(screen.getByRole('combobox', { name: 'Choose report' })).toHaveValue('plan');
    fireEvent.click(screen.getByRole('button', { name: 'Existing features to improve' }));
    expect(screen.getByRole('checkbox')).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Quotation' }));
    expect(screen.getByText('Quote breakdown')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Explore a labour allowance' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Timeline' }));
    expect(screen.getByText('Delivery order')).toBeInTheDocument();
    expect(mocks.get).not.toHaveBeenCalled();
  });
  it('explains the combined context and directs the reader to the reconciled evidence', async () => {
    render(<MemoryRouter initialEntries={['/asdfghjkl;mnbvcxz?view=frontend']}><AuditReader /></MemoryRouter>);
    expect(screen.getByText('Earlier frontend findings need the combined corrections')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Full combined evidence' }));
    expect(await screen.findByText('Combined findings', {}, { timeout: 10000 })).toBeInTheDocument();
    expect(screen.getByText('Both repositories now inform this review')).toBeInTheDocument();
    expect(mocks.get).not.toHaveBeenCalled();
  }, 30000);
  it('switches between supplied reports and preserves the selected document during navigation', async () => {
    render(<MemoryRouter><AuditReader /></MemoryRouter>);
    fireEvent.change(screen.getByRole('combobox', { name: 'Choose report' }), { target: { value: 'combined' } });
    expect(await screen.findByText('Combined findings', {}, { timeout: 10000 })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /01\s*Joint scope/ }));
    expect(screen.getByRole('combobox', { name: 'Choose report' })).toHaveValue('combined');
    fireEvent.change(screen.getByRole('combobox', { name: 'Choose report' }), { target: { value: 'backend' } });
    expect(await screen.findByText('Backend findings', {}, { timeout: 10000 })).toBeInTheDocument();
    fireEvent.change(screen.getByRole('combobox', { name: 'Choose report' }), { target: { value: 'frontend' } });
    expect(await screen.findByText('Readable report', {}, { timeout: 10000 })).toBeInTheDocument();
    expect(mocks.get).not.toHaveBeenCalled();
  }, 30000);
  it('shows the report without authentication or a backend request', () => {
    render(<MemoryRouter><AuditReader /></MemoryRouter>);
    expect(screen.getByText('Readable report')).toBeInTheDocument();
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.queryByLabelText('Password')).not.toBeInTheDocument();
    expect(mocks.get).not.toHaveBeenCalled();
  });
  it('navigates and searches all reading parts without rendering raw HTML', async () => {
    const { container } = render(<MemoryRouter><AuditReader /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: /02\s*Tasks/ }));
    expect(screen.getByRole('checkbox')).toBeDisabled();
    expect(container.querySelector('script')).toBeNull();
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'AUD-RQS01-0001' } });
    await waitFor(() => expect(screen.getByText('1 matching reading parts')).toBeInTheDocument());
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'no-such-requirement' } });
    expect(await screen.findByText('No matching details')).toBeInTheDocument();
  });
});
