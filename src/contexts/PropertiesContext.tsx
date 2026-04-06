import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { propertyService, type CreatePropertyPayload } from '../services/propertyService';
import type { Property } from '../types';

interface PropertiesContextValue {
  properties: Property[];
  loading: boolean;
  error: string | null;
  refreshProperties: () => Promise<void>;
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

  const refreshProperties = async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await propertyService.getProperties();
      setProperties(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch properties.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refreshProperties();
  }, []);

  const addProperty = async (ownerId: string, payload: CreatePropertyPayload) => {
    const created = await propertyService.addProperty(ownerId, payload);
    await refreshProperties();
    return created;
  };

  const updateProperty = async (propertyId: string, payload: Partial<Property>) => {
    const updated = await propertyService.updateProperty(propertyId, payload);
    await refreshProperties();
    return updated;
  };

  const deleteProperty = async (propertyId: string) => {
    await propertyService.deleteProperty(propertyId);
    await refreshProperties();
  };

  const buyProperty = async (propertyId: string, buyerId: string) => {
    await propertyService.buyProperty(propertyId, buyerId);
    await refreshProperties();
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
    [properties, loading, error],
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