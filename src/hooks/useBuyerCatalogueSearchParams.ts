import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { withoutFeaturedSearchFilter } from '../utils/catalogueQuery';

/** Keeps legacy Featured criteria out of active buyer search state and URLs. */
export const useBuyerCatalogueSearchParams = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    if (!searchParams.has('featured')) return;
    setSearchParams(withoutFeaturedSearchFilter(searchParams), { replace: true });
  }, [searchParams, setSearchParams]);

  return [searchParams, setSearchParams] as const;
};
