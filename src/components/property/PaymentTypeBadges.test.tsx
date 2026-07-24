import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import PaymentTypeBadges from './PaymentTypeBadges';

describe('PaymentTypeBadges', () => {
  it('renders only the payment methods offered by the property', () => {
    render(<PaymentTypeBadges paymentTypes={['outright', 'escrow']} />);

    expect(screen.getByText('Outright payment')).toBeInTheDocument();
    expect(screen.getByText('Escrow available')).toBeInTheDocument();
    expect(screen.queryByText('Installment available')).not.toBeInTheDocument();
  });

  it('renders all supported payment methods without inventing alternate values', () => {
    render(<PaymentTypeBadges paymentTypes={['outright', 'installment', 'escrow']} />);

    expect(screen.getByLabelText('Payment options')).toBeInTheDocument();
    expect(screen.getByText('Outright payment')).toBeInTheDocument();
    expect(screen.getByText('Installment available')).toBeInTheDocument();
    expect(screen.getByText('Escrow available')).toBeInTheDocument();
  });
});
