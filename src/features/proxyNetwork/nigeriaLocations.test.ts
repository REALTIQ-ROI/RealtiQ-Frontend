import { describe, expect, it } from 'vitest';
import { getNigeriaCities, NIGERIA_STATES } from './nigeriaLocations';

describe('Nigeria registration locations', () => {
  it('contains all 36 states and the FCT', () => {
    expect(NIGERIA_STATES).toHaveLength(37);
    expect(NIGERIA_STATES.some((state) => state.id === 'fct')).toBe(true);
  });

  it('returns only locations belonging to the selected state', () => {
    const lagos = getNigeriaCities('Lagos');
    const kano = getNigeriaCities('Kano');
    expect(lagos.length).toBeGreaterThan(0);
    expect(kano.length).toBeGreaterThan(0);
    expect(lagos.every((city) => city.stateId === 'lagos')).toBe(true);
    expect(kano.every((city) => city.stateId === 'kano')).toBe(true);
  });
});
