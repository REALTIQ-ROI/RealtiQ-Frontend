import { getLGAsByState, getStates, type LGA, type State } from '@some19ice/nigeria-geo-core';

export const NIGERIA_STATES: State[] = getStates().sort((left, right) => left.name.localeCompare(right.name));

export const getNigeriaCities = (stateName: string): LGA[] => {
  const state = NIGERIA_STATES.find((item) => item.name === stateName);
  return state
    ? getLGAsByState(state.id).sort((left, right) => left.name.localeCompare(right.name))
    : [];
};
