import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import Swal from 'sweetalert2';
import {
  propertyService,
  type CreatePropertyPayload,
  type PropertyFiltersQuery,
  type UpdatePropertyPayload,
} from '../services/propertyService';
import { ApiRequestError } from '../lib/axios';
import type { Property } from '../types';

interface UsePropertiesOptions {
  autoFetch?: boolean;
  initialFilters?: PropertyFiltersQuery | URLSearchParams;
  initialPage?: number;
  limit?: number;
}

export const useProperties = (options: UsePropertiesOptions = {}) => {
  const { autoFetch = false, initialFilters = {}, initialPage = 1, limit = 10 } = options;
  const [properties, setProperties] = useState<Property[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(initialPage);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notices, setNotices] = useState<unknown[]>([]);
  const [diagnostics, setDiagnostics] = useState<unknown>(null);
  const [facets, setFacets] = useState<unknown>(null);
  const [filters, setFilters] = useState<PropertyFiltersQuery | URLSearchParams>(initialFilters);
  const requestSequence = useRef(0);

  const fetchProperties = useCallback(
    async (currentFilters: PropertyFiltersQuery | URLSearchParams = filters, currentPage = page) => {
      const requestId = ++requestSequence.current;
      setLoading(true);
      setError(null);
      setNotices([]);
      setDiagnostics(null);
      setFacets(null);
      try {
        const requestFilters = currentFilters instanceof URLSearchParams
          ? new URLSearchParams(currentFilters)
          : { ...currentFilters, page: currentPage, limit };
        if (requestFilters instanceof URLSearchParams) {
          requestFilters.set('page', String(currentPage));
          requestFilters.set('limit', String(limit));
        }
        const res = await propertyService.getProperties(requestFilters);
        if (requestId === requestSequence.current) {
          setProperties(res.properties);
          setTotal(res.total);
          setNotices(res.normalization?.notices ?? []);
          setDiagnostics(res.diagnostics ?? null);
          setFacets(res.facets ?? null);
        }
      } catch (err) {
        if (requestId === requestSequence.current) {
          const message = err instanceof ApiRequestError && err.code ? `${err.message} (${err.code})` : err instanceof Error ? err.message : 'Failed to load properties.';
          setProperties([]);
          setTotal(0);
          setDiagnostics(null);
          setFacets(null);
          setError(message);
        }
      } finally {
        if (requestId === requestSequence.current) setLoading(false);
      }
    },
    [filters, page, limit],
  );

  useEffect(() => {
    if (autoFetch) void fetchProperties(initialFilters, initialPage);
    // run only on mount for the initial catalog load
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applyFilters = useCallback(
    (newFilters: PropertyFiltersQuery | URLSearchParams, nextPage = 1) => {
      setFilters(newFilters);
      setPage(nextPage);
      void fetchProperties(newFilters, nextPage);
    },
    [fetchProperties],
  );

  const goToPage = useCallback(
    (nextPage: number) => {
      setPage(nextPage);
      void fetchProperties(filters, nextPage);
    },
    [fetchProperties, filters],
  );

  const createProperty = async (payload: CreatePropertyPayload): Promise<Property | null> => {
    try {
      const created = await propertyService.createProperty(payload);
      setProperties((current) => [created, ...current]);
      toast.success('Property created successfully');
      return created;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create property.');
      return null;
    }
  };

  const updateProperty = async (id: string, payload: UpdatePropertyPayload): Promise<boolean> => {
    const result = await Swal.fire({
      title: 'Update Property?',
      text: 'This will save your changes',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Save',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#000000',
      cancelButtonColor: '#6b7280',
      reverseButtons: true,
    });
    if (!result.isConfirmed) return false;

    try {
      const updated = await propertyService.updateProperty(id, payload);
      setProperties((current) =>
        current.map((property) =>
          (Boolean(updated._id) && property._id === updated._id) ||
          (Boolean(updated.id) && property.id === updated.id) ||
          (Boolean(updated.publicReference) && property.publicReference === updated.publicReference)
            ? updated
            : property,
        ),
      );
      toast.success('Property updated successfully');
      return true;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update property.');
      return false;
    }
  };

  const toggleFeatured = async (id: string, currentFeatured: boolean): Promise<void> => {
    const nextFeatured = !currentFeatured;
    setProperties((prev) => prev.map((p) => (p._id === id ? { ...p, featured: nextFeatured } : p)));

    try {
      await propertyService.toggleFeatured(id, nextFeatured);
      toast.success(nextFeatured ? 'Property marked as featured' : 'Property removed from featured');
    } catch (err) {
      setProperties((prev) => prev.map((p) => (p._id === id ? { ...p, featured: currentFeatured } : p)));
      toast.error(err instanceof Error ? err.message : 'Failed to update featured status.');
    }
  };

  const buyProperty = async (id: string): Promise<void> => {
    if (!id) throw new Error('Missing property ID.');
    throw new Error('Outright purchase requires the documented cart checkout and step-up challenge contract.');
  };

  return {
    properties,
    total,
    page,
    loading,
    error,
    notices,
    diagnostics,
    facets,
    filters,
    fetchProperties,
    applyFilters,
    goToPage,
    createProperty,
    updateProperty,
    toggleFeatured,
    buyProperty,
  };
};
