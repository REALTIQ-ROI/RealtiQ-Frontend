import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { withoutUnsupportedCatalogueFilters } from '../utils/catalogueQuery';

/** Keeps legacy Featured criteria out of active buyer search state and URLs. */
export const useBuyerCatalogueSearchParams = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    if (!searchParams.has('featured') && !searchParams.has('groupByProject')) return;
    setSearchParams(withoutUnsupportedCatalogueFilters(searchParams), { replace: true });
  }, [searchParams, setSearchParams]);

  return [searchParams, setSearchParams] as const;
};
