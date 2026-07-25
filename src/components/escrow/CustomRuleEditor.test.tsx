import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import CustomRuleEditor from './CustomRuleEditor';
import type { EditableRule } from './ruleValidation';

const initialRules: EditableRule[] = [
  {
    clientId: 'one',
    type: 'inspection_completed',
    description: 'First milestone',
    required: true,
    amount: undefined,
    metadata: {},
  },
  {
    clientId: 'two',
    type: 'document_verified',
    description: 'Second milestone',
    required: true,
    amount: 75_000_000,
    metadata: {},
  },
];

const Harness = () => {
  const [rules, setRules] = useState(initialRules);
  return (
    <>
      <CustomRuleEditor
        rules={rules}
        errors={{}}
        escrowAmount={100_000_000}
        onChange={setRules}
      />
      <output data-testid="first-amount">
        {typeof rules[0]?.amount}:{String(rules[0]?.amount)}
      </output>
    </>
  );
};

describe('CustomRuleEditor', () => {
  it('adds, removes, and reorders numbered milestone rows', async () => {
    render(<Harness />);

    expect(screen.getByText('Milestone 1')).toBeInTheDocument();
    expect(screen.getByText('Milestone 2')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Move milestone 2 up' }));
    expect(screen.getAllByRole('textbox')[0]).toHaveValue('Second milestone');

    await userEvent.click(screen.getByRole('button', { name: 'Add milestone' }));
    expect(screen.getByText('Milestone 3')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Remove milestone 3' }));
    expect(screen.queryByText('Milestone 3')).not.toBeInTheDocument();
  });

  it('retains an NGN amount as a numeric value while showing formatted currency', async () => {
    render(<Harness />);

    const amount = screen.getAllByLabelText('Milestone amount (NGN)')[0];
    await userEvent.type(amount, '25000000');

    expect(screen.getByTestId('first-amount')).toHaveTextContent('number:25000000');
    expect(screen.getAllByText(/25,000,000/).length).toBeGreaterThan(0);
  });

  it('caps a milestone at the unallocated escrow balance', async () => {
    render(<Harness />);

    const amount = screen.getAllByLabelText('Milestone amount (NGN)')[0];
    expect(amount).toHaveAttribute('max', '25000000');
    await userEvent.type(amount, '40000000');

    expect(amount).toHaveValue(25_000_000);
    expect(screen.getByTestId('first-amount')).toHaveTextContent('number:25000000');
  });
});
