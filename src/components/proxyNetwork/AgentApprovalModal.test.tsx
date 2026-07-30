import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import AgentApprovalModal from './AgentApprovalModal';

describe('Property Agent approval modal', () => {
  it('requires notes and submits a trimmed approval record', async () => {
    const onSubmit = vi.fn().mockResolvedValue(null);
    render(<AgentApprovalModal agentName="Ada Agent" pending={false} onClose={() => undefined} onSubmit={onSubmit} />);
    const user = userEvent.setup();

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/Ada Agent/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Approve Property Agent' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Approval notes are required.');
    expect(onSubmit).not.toHaveBeenCalled();

    await user.type(screen.getByLabelText('Approval notes'), '  Identity and professional details verified.  ');
    await user.click(screen.getByRole('button', { name: 'Approve Property Agent' }));
    expect(onSubmit).toHaveBeenCalledWith('Identity and professional details verified.');
  });

  it('renders backend errors inside the modal and disables actions while pending', async () => {
    const onSubmit = vi.fn().mockResolvedValue('This profile was already reviewed.');
    const { rerender } = render(<AgentApprovalModal agentName="Ada Agent" pending={false} onClose={() => undefined} onSubmit={onSubmit} />);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText('Approval notes'), 'Verified.');
    await user.click(screen.getByRole('button', { name: 'Approve Property Agent' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('This profile was already reviewed.');

    rerender(<AgentApprovalModal agentName="Ada Agent" pending onClose={() => undefined} onSubmit={onSubmit} />);
    expect(screen.getByRole('button', { name: 'Approving…' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Close approval modal' })).toBeDisabled();
  });
});
