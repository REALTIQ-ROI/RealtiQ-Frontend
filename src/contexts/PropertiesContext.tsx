/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { propertyService, type CreatePropertyPayload } from '../services/propertyService';
import { paymentService } from '../services/paymentService';
import type { Property } from '../types';
import { requiresInstallments } from '../utils/installment';

interface PropertiesContextValue {
  properties: Property[];
  loading: boolean;
  error: string | null;
  refreshProperties: (limitOverride?: number) => Promise<void>;
  addProperty: (ownerId: string, payload: CreatePropertyPayload) => Promise<Property>;
  updateProperty: (propertyId: string, payload: Partial<Property>) => Promise<Property>;
  deleteProperty: (propertyId: string) => Promise<void>;
  buyProperty: (propertyId: string, buyerId: string) => Promise<void>;
}

const PropertiesContext = createContext<PropertiesContextValue | undefined>(undefined);

export const PropertiesProvider = ({ children }: { children: ReactNode }) => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshProperties = useCallback(async (limitOverride = 500) => {
    setLoading(true);
    setError(null);
    try {
      const res = await propertyService.getProperties({ limit: limitOverride });
      const nextProperties = Array.isArray(res)
        ? res
        : 'properties' in res && Array.isArray(res.properties)
          ? res.properties
          : [];
      setProperties(nextProperties);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch properties.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshProperties();
  }, [refreshProperties]);

  const addProperty = async (_ownerId: string, payload: CreatePropertyPayload): Promise<Property> => {
    const created = await propertyService.createProperty(payload);
    await refreshProperties();
    return created;
  };

  const updateProperty = async (propertyId: string, payload: Partial<Property>): Promise<Property> => {
    const updated = await propertyService.updateProperty(propertyId, payload);
    await refreshProperties();
    return updated;
  };

  const deleteProperty = async (propertyId: string): Promise<void> => {
    await propertyService.deleteProperty(propertyId);
    await refreshProperties();
  };

  const buyProperty = async (propertyId: string): Promise<void> => {
    if (!propertyId) {
      throw new Error('Missing property ID.');
    }

    const property = await propertyService.getPropertyById(propertyId);
    if (requiresInstallments(property.price)) {
      throw new Error('This property is available through installments only.');
    }

    try {
      const result = await propertyService.buyProperty(propertyId);
      paymentService.redirectToCheckout(result, propertyId);
    } catch {
      const result = await paymentService.initializePayment(propertyId);
      paymentService.redirectToCheckout(result, propertyId);
    }
  };

  const value = useMemo<PropertiesContextValue>(
    () => ({
      properties,
      loading,
      error,
      refreshProperties,
      addProperty,
      updateProperty,
      deleteProperty,
      buyProperty,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [properties, loading, error, refreshProperties],
  );

  return <PropertiesContext.Provider value={value}>{children}</PropertiesContext.Provider>;
};

export const useProperties = () => {
  const context = useContext(PropertiesContext);
  if (!context) {
    throw new Error('useProperties must be used within PropertiesProvider');
  }
  return context;
};
