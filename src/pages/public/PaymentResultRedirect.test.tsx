import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import PaymentFailed from './PaymentFailed';
import PaymentSucess from './PaymentSucess';

const ReturnLocation = () => {
  const location = useLocation();
  return <p>Verification route: {location.pathname}{location.search}</p>;
};

describe('legacy payment return routes', () => {
  it.each([
    ['/payment-success', PaymentSucess],
    ['/payment-failed', PaymentFailed],
  ])('routes %s through backend verification and preserves the provider reference', (path, Page) => {
    render(
      <MemoryRouter initialEntries={[`${path}?reference=provider-ref-1`]}>
        <Routes>
          <Route path={path} element={<Page />} />
          <Route path="/post-payment-redirect" element={<ReturnLocation />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('Verification route: /post-payment-redirect?reference=provider-ref-1')).toBeInTheDocument();
  });
});
