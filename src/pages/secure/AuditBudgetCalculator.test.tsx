import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import AuditBudgetCalculator from './AuditBudgetCalculator';

afterEach(cleanup);
describe('audit planning allowance', () => {
  it('calculates the chosen increment while keeping the original balance separate', () => {
    render(<AuditBudgetCalculator />);
    fireEvent.change(screen.getByRole('spinbutton', { name: /Daily labour rate/ }), { target: { value: '20000' } });
    fireEvent.click(screen.getByRole('checkbox', { name: 'Compare' }));
    expect(screen.getByText(/620,000.*1,080,000/)).toBeInTheDocument();
    expect(screen.getByText(/Original outstanding balance:.*1,020,000/)).toBeInTheDocument();
  });
  it('requires a mixed package boundary and rejects an invalid percentage', () => {
    render(<AuditBudgetCalculator />);
    fireEvent.change(screen.getByRole('spinbutton', { name: /Daily labour rate/ }), { target: { value: '20000' } });
    fireEvent.click(screen.getByRole('checkbox', { name: 'Profiles, agencies and partners' }));
    expect(screen.queryByText('Illustrative additional labour allowance')).not.toBeInTheDocument();
    const share = screen.getByRole('spinbutton', { name: 'Additional percentage for Profiles, agencies and partners' });
    fireEvent.change(share, { target: { value: '50' } });
    expect(screen.getByText(/490,000.*880,000/)).toBeInTheDocument();
    fireEvent.change(share, { target: { value: '101' } });
    expect(screen.queryByText('Illustrative additional labour allowance')).not.toBeInTheDocument();
  });
});
