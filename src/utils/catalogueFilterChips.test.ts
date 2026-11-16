import { describe, expect, it } from 'vitest';
import { catalogueFilterChips } from './catalogueFilterChips';

describe('catalogue filter chips', () => {
  it('hides canonical defaults while retaining active non-default criteria', () => {
    const params = new URLSearchParams('queryVersion=canonical-v1&sort=recommended&status=available&includeUnpriced=true&withPhotosOnly=true&includeUnderOffer=false&includeSold=false&minPrice=0&includeSold=true');
    expect(catalogueFilterChips(params).map((chip) => chip.label)).toEqual(['Min Price: 0', 'Include Sold: Yes']);
  });
});
