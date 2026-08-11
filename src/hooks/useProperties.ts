import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import Swal from 'sweetalert2';
import {
  propertyService,
  type CreatePropertyPayload,
  type PropertyFiltersQuery,
  type UpdatePropertyPayload,
} from '../services/propertyService';
import { paymentService } from '../services/paymentService';
import type { Property } from '../types';
import { normalizePropertyPaymentTypes } from '../utils/propertyPaymentTypes';
import { isPublicPropertyVisible } from '../utils/projectPublication';

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
  const requestSequence = useRef(0);

  const fetchProperties = useCallback(
    async (currentFilters: PropertyFiltersQuery = filters, currentPage = page) => {
      const requestId = ++requestSequence.current;
      setLoading(true);
      setError(null);
      try {
        const res = await propertyService.getProperties({
          ...currentFilters,
          page: currentPage,
          limit,
        });
        if (requestId === requestSequence.current) {
          const visibleProperties = res.properties.filter(isPublicPropertyVisible);
          setProperties(visibleProperties);
          setTotal(visibleProperties.length === res.properties.length ? res.total : visibleProperties.length);
        }
      } catch (err) {
        if (requestId === requestSequence.current) {
          const message = err instanceof Error ? err.message : 'Failed to load properties.';
          setError(message);
        }
      } finally {
        if (requestId === requestSequence.current) setLoading(false);
      }
    },
    [filters, page, limit],
  );

  useEffect(() => {
    if (autoFetch) void fetchProperties(initialFilters, 1);
    // run only on mount for the initial catalog load
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applyFilters = useCallback(
    (newFilters: PropertyFiltersQuery) => {
      setFilters(newFilters);
      setPage(1);
      void fetchProperties(newFilters, 1);
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
    if (!id) {
      toast.error('Unable to initialize payment. Please try again.');
      return;
    }

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
      const property = await propertyService.getPropertyById(id);
      if (!normalizePropertyPaymentTypes(property.paymentTypes, property.price).includes('outright')) {
        toast.error('Outright payment is not offered for this property.');
        return;
      }

      const checkout = await propertyService.buyProperty(id);
      paymentService.redirectToCheckout(checkout, id);
    } catch {
      try {
        const checkout = await paymentService.initializePayment(id);
        paymentService.redirectToCheckout(checkout, id);
      } catch {
        toast.error('Unable to initialize payment. Please try again.');
      }
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
