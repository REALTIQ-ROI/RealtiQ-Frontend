import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import Swal from 'sweetalert2';
import { propertyService, type CreatePropertyPayload, type PropertyFiltersQuery } from '../services/propertyService';
import type { Property } from '../types';

interface UsePropertiesOptions {
  autoFetch?: boolean;
  initialFilters?: PropertyFiltersQuery;
  limit?: number;
}

export const useProperties = (options: UsePropertiesOptions = {}) => {
  const { autoFetch = false, initialFilters = {}, limit = 12 } = options;
  const [properties, setProperties] = useState<Property[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<PropertyFiltersQuery>(initialFilters);

  const fetchProperties = useCallback(
    async (currentFilters: PropertyFiltersQuery = filters, currentPage = page) => {
      setLoading(true);
      setError(null);
      try {
        const res = await propertyService.getProperties({
          ...currentFilters,
          page: currentPage,
          limit,
        });
        setProperties(res.properties);
        setTotal(res.total);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load properties.';
        setError(message);
      } finally {
        setLoading(false);
      }
    },
    // intentionally broad — callers pass explicit args when they need to
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  useEffect(() => {
    if (autoFetch) void fetchProperties(initialFilters, 1);
    // only on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoFetch]);

  const applyFilters = useCallback(
    (newFilters: PropertyFiltersQuery) => {
      setFilters(newFilters);
      setPage(1);
      void fetchProperties(newFilters, 1);
    },
    [fetchProperties],
  );

  const goToPage = useCallback(
    (p: number) => {
      setPage(p);
      void fetchProperties(filters, p);
    },
    [fetchProperties, filters],
  );

  const createProperty = async (payload: CreatePropertyPayload): Promise<Property | null> => {
    try {
      const created = await propertyService.createProperty(payload);
      toast.success('Property created successfully');
      return created;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create property.');
      return null;
    }
  };

  const updateProperty = async (
    id: string,
    payload: Partial<CreatePropertyPayload & { status: string }>,
  ): Promise<boolean> => {
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
      await propertyService.updateProperty(id, payload);
      toast.success('Property updated successfully');
      return true;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update property.');
      return false;
    }
  };

  const deleteProperty = async (id: string): Promise<boolean> => {
    const result = await Swal.fire({
      title: 'Delete Property?',
      text: 'This action cannot be undone',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      reverseButtons: true,
    });
    if (!result.isConfirmed) return false;
    try {
      await propertyService.deleteProperty(id);
      setProperties((prev) => prev.filter((p) => p._id !== id));
      toast.success('Property deleted successfully');
      return true;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete property.');
      return false;
    }
  };

  const toggleFeatured = async (id: string, currentFeatured: boolean): Promise<void> => {
    const nextFeatured = !currentFeatured;
    // Optimistic update
    setProperties((prev) =>
      prev.map((p) => (p._id === id ? { ...p, featured: nextFeatured } : p)),
    );
    try {
      await propertyService.toggleFeatured(id, nextFeatured);
      toast.success(
        nextFeatured ? 'Property marked as featured' : 'Property removed from featured',
      );
    } catch (err) {
      // Rollback
      setProperties((prev) =>
        prev.map((p) => (p._id === id ? { ...p, featured: currentFeatured } : p)),
      );
      toast.error(err instanceof Error ? err.message : 'Failed to update featured status.');
    }
  };

  const buyProperty = async (id: string): Promise<void> => {
    const result = await Swal.fire({
      title: 'Proceed to Payment?',
      text: 'You will be redirected to the payment gateway.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Continue',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#000000',
      cancelButtonColor: '#6b7280',
    });
    if (!result.isConfirmed) return;
    try {
      const { redirectUrl } = await propertyService.buyProperty(id);
      window.location.href = redirectUrl;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unable to initiate payment');
    }
  };

  return {
    properties,
    total,
    page,
    loading,
    error,
    filters,
    fetchProperties,
    applyFilters,
    goToPage,
    createProperty,
    updateProperty,
    deleteProperty,
    toggleFeatured,
    buyProperty,
  };
};
