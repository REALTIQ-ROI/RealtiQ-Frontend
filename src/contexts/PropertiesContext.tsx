/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { propertyService, type ArchivePropertyRequest, type CreatePropertyPayload, type CreatePropertyResponse, type UpdatePropertyPayload } from '../services/propertyService';
import type { Property } from '../types';
import { isPublicPropertyVisible } from '../utils/projectPublication';
import { useAuth } from './AuthContext';

interface PropertiesContextValue {
  properties: Property[];
  loading: boolean;
  error: string | null;
  refreshProperties: (limitOverride?: number) => Promise<void>;
  addProperty: (ownerId: string, payload: CreatePropertyPayload, challengeId?: string) => Promise<CreatePropertyResponse>;
  updateProperty: (propertyId: string, payload: UpdatePropertyPayload, challengeId?: string) => Promise<Property>;
  deleteProperty: (propertyId: string, body: ArchivePropertyRequest, challengeId: string) => Promise<void>;
  buyProperty: (propertyId: string, buyerId: string) => Promise<void>;
}

const PropertiesContext = createContext<PropertiesContextValue | undefined>(undefined);

export const PropertiesProvider = ({ children }: { children: ReactNode }) => {
  const { user, activeProfile } = useAuth();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestSequence = useRef(0);
  const loadedProfileId = useRef<string | null>(null);
  const selectedProfileId = activeProfile?.id ?? null;
  const [renderProfileId, setRenderProfileId] = useState<string | null>(selectedProfileId);
  const visibleProperties = renderProfileId === selectedProfileId ? properties : [];
  const visibleLoading = loading || renderProfileId !== selectedProfileId;
  const visibleError = renderProfileId === selectedProfileId ? error : null;

  const refreshProperties = useCallback(async (limitOverride = 500) => {
    const requestId = ++requestSequence.current;
    if (loadedProfileId.current !== selectedProfileId) {
      loadedProfileId.current = selectedProfileId;
      setRenderProfileId(selectedProfileId);
      setProperties([]);
    }
    setLoading(true);
    setError(null);
    try {
      const res = user?.role === 'landlord'
        ? await (async () => {
            const pageSize = 20;
            const first = await propertyService.getMyProperties(1, pageSize);
            const properties = [...first.properties];
            let page = 1;
            while (properties.length < Math.min(first.total, limitOverride) && page < first.page + Math.ceil(first.total / pageSize)) {
              page += 1;
              const next = await propertyService.getMyProperties(page, pageSize);
              if (!next.properties.length) break;
              properties.push(...next.properties);
            }
            return { ...first, properties: properties.slice(0, limitOverride) };
          })()
        : await propertyService.getProperties({ limit: limitOverride });
      const nextProperties = Array.isArray(res)
        ? res
        : 'properties' in res && Array.isArray(res.properties)
          ? res.properties
          : [];
      if (requestId === requestSequence.current) setProperties(user?.role ? nextProperties : nextProperties.filter(isPublicPropertyVisible));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch properties.';
      if (requestId === requestSequence.current) setError(message);
    } finally {
      if (requestId === requestSequence.current) setLoading(false);
    }
  }, [selectedProfileId, user?.role]);

  useEffect(() => {
    void refreshProperties();
  }, [refreshProperties]);

  const addProperty = async (_ownerId: string, payload: CreatePropertyPayload, challengeId?: string): Promise<CreatePropertyResponse> => {
    const created = await propertyService.createPropertyWithResponse(payload, challengeId);
    setProperties((current) => [created.property, ...current]);
    await refreshProperties();
    return created;
  };

  const updateProperty = async (propertyId: string, payload: UpdatePropertyPayload, challengeId?: string): Promise<Property> => {
    const updated = await propertyService.updateProperty(propertyId, payload, challengeId);
    setProperties((current) =>
      current.map((property) =>
        (Boolean(updated._id) && property._id === updated._id) ||
        (Boolean(updated.id) && property.id === updated.id) ||
        (Boolean(updated.publicReference) && property.publicReference === updated.publicReference)
          ? updated
          : property,
      ),
    );
    await refreshProperties();
    return updated;
  };

  const deleteProperty = async (propertyId: string, body: ArchivePropertyRequest, challengeId: string): Promise<void> => {
    await propertyService.deleteProperty(propertyId, body, challengeId);
    await refreshProperties();
  };

  const buyProperty = async (propertyId: string): Promise<void> => {
    if (!propertyId) {
      throw new Error('Missing property ID.');
    }
    throw new Error('Outright purchase requires the documented cart checkout and step-up challenge contract.');
  };

  const value = useMemo<PropertiesContextValue>(
    () => ({
      properties: visibleProperties,
      loading: visibleLoading,
      error: visibleError,
      refreshProperties,
      addProperty,
      updateProperty,
      deleteProperty,
      buyProperty,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [visibleProperties, visibleLoading, visibleError, refreshProperties],
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
