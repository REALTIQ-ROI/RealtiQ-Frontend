import { fireEvent, render, screen, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import AuditReader from './AuditReader';

const mocks = vi.hoisted(() => ({ get: vi.fn(), markdown: '# REALTIQ — Audit\n\n## 1. Executive Summary\n\n**Readable report**\n\n| Rule | Status |\n|---|---|\n| Terms | Missing |\n\n## 2. Tasks\n\n- [ ] AUD-RQS01-0001 — Do the work\n\n<script>window.leaked=true</script>' }));
vi.mock('../../../needed-updates.md?raw', () => ({ default: mocks.markdown }));
vi.mock('../../lib/axios', () => ({ default: { get: mocks.get } }));

afterEach(() => { cleanup(); vi.clearAllMocks(); });
describe('frontend audit reader', () => {
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
