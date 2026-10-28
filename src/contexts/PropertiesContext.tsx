/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
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

const PROPERTY_PAGE_LIMIT = 100;
const MAX_PROPERTY_PAGES = 10_000;

const getPropertyIdentity = (property: Property): string | undefined =>
  property._id || property.id || property.publicReference || undefined;

const appendUniqueProperties = (target: Property[], seen: Set<string>, incoming: Property[]) => {
  for (const property of incoming) {
    const identity = getPropertyIdentity(property);
    if (identity && seen.has(identity)) continue;
    if (identity) seen.add(identity);
    target.push(property);
  }
};

export const PropertiesProvider = ({ children }: { children: ReactNode }) => {
  const { user, token, activeProfile } = useAuth();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestSequence = useRef(0);
  const selectedProfileId = activeProfile?.id ?? null;
  const userId = user?._id ?? null;
  const role = user?.role ?? null;
  const scopeKey = JSON.stringify([userId, selectedProfileId, role]);
  const sessionToken = token;
  const currentScope = { userId, profileId: selectedProfileId, role, token: sessionToken };
  const scopeRef = useRef(currentScope);
  const loadedScope = useRef<string | null>(null);
  const [renderScopeKey, setRenderScopeKey] = useState(scopeKey);
  const visibleProperties = renderScopeKey === scopeKey ? properties : [];
  const visibleLoading = loading || renderScopeKey !== scopeKey;
  const visibleError = renderScopeKey === scopeKey ? error : null;

  useLayoutEffect(() => {
    const nextScope = { userId, profileId: selectedProfileId, role, token: sessionToken };
    const previous = scopeRef.current;
    if (
      previous.userId !== userId ||
      previous.profileId !== selectedProfileId ||
      previous.role !== role ||
      previous.token !== sessionToken
    ) {
      scopeRef.current = nextScope;
      requestSequence.current += 1;
      loadedScope.current = null;
      setProperties([]);
      setError(null);
      setLoading(true);
    }
  }, [userId, selectedProfileId, role, sessionToken]);

  const refreshProperties = useCallback(async (limitOverride = 500) => {
    if (scopeRef.current.userId !== userId ||
      scopeRef.current.profileId !== selectedProfileId ||
      scopeRef.current.role !== role ||
      scopeRef.current.token !== sessionToken) return;

    const requestId = ++requestSequence.current;
    const requestScopeKey = scopeKey;
    const isCurrentRequest = () => requestId === requestSequence.current &&
      scopeRef.current.userId === userId &&
      scopeRef.current.profileId === selectedProfileId &&
      scopeRef.current.role === role &&
      scopeRef.current.token === sessionToken;

    if (loadedScope.current !== requestScopeKey) {
      loadedScope.current = requestScopeKey;
      setRenderScopeKey(requestScopeKey);
      setProperties([]);
    }
    setLoading(true);
    setError(null);
    try {
      const requestedTotal = Number.isFinite(limitOverride)
        ? Math.min(MAX_PROPERTY_PAGES * PROPERTY_PAGE_LIMIT, Math.max(0, Math.floor(limitOverride)))
        : 0;
      let nextProperties: Property[] = [];

      if (requestedTotal > 0 && role === 'landlord') {
        const pageSize = 20;
        const first = await propertyService.getMyProperties(1, pageSize);
        const seen = new Set<string>();
        nextProperties = [];
        appendUniqueProperties(nextProperties, seen, first.properties);
        const targetTotal = Math.min(first.total, requestedTotal);
        const totalPages = Math.min(MAX_PROPERTY_PAGES, Math.ceil(first.total / pageSize));
        let page = 1;
        while (nextProperties.length < targetTotal && page < totalPages && isCurrentRequest()) {
          page += 1;
          const next = await propertyService.getMyProperties(page, pageSize);
          if (!isCurrentRequest() || !next.properties.length) break;
          appendUniqueProperties(nextProperties, seen, next.properties);
        }
        nextProperties = nextProperties.slice(0, requestedTotal);
      } else if (requestedTotal > 0) {
        const pageSize = Math.min(PROPERTY_PAGE_LIMIT, requestedTotal);
        const seen = new Set<string>();
        let page = 1;
        while (page <= MAX_PROPERTY_PAGES && nextProperties.length < requestedTotal && isCurrentRequest()) {
          const response = await propertyService.getProperties({ page, limit: pageSize });
          if (!isCurrentRequest()) break;
          if (!response.properties.length) break;

          appendUniqueProperties(nextProperties, seen, response.properties);
          if (nextProperties.length >= requestedTotal) break;

          const hasReachedReportedEnd = Number.isFinite(response.total) &&
            (nextProperties.length >= response.total || page * pageSize >= response.total);
          if (hasReachedReportedEnd || response.properties.length < pageSize) break;
          page += 1;
        }
        nextProperties = nextProperties.slice(0, requestedTotal);
      }

      if (isCurrentRequest()) {
        setProperties(role ? nextProperties : nextProperties.filter(isPublicPropertyVisible));
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch properties.';
      if (isCurrentRequest()) setError(message);
    } finally {
      if (isCurrentRequest()) setLoading(false);
    }
  }, [role, scopeKey, selectedProfileId, sessionToken, userId]);

  useEffect(() => {
    void refreshProperties();
    return () => { requestSequence.current += 1; };
  }, [refreshProperties]);

  const addProperty = async (_ownerId: string, payload: CreatePropertyPayload, challengeId?: string): Promise<CreatePropertyResponse> => {
    const mutationScope = scopeKey;
    const created = await propertyService.createPropertyWithResponse(payload, challengeId);
    if (scopeRef.current.userId === userId &&
      scopeRef.current.profileId === selectedProfileId &&
      scopeRef.current.role === role &&
      scopeRef.current.token === sessionToken && mutationScope === scopeKey) {
      setProperties((current) => [created.property, ...current]);
    }
    await refreshProperties();
    return created;
  };

  const updateProperty = async (propertyId: string, payload: UpdatePropertyPayload, challengeId?: string): Promise<Property> => {
    const mutationScope = scopeKey;
    const updated = await propertyService.updateProperty(propertyId, payload, challengeId);
    if (scopeRef.current.userId === userId &&
      scopeRef.current.profileId === selectedProfileId &&
      scopeRef.current.role === role &&
      scopeRef.current.token === sessionToken && mutationScope === scopeKey) {
      setProperties((current) =>
        current.map((property) =>
          (Boolean(updated._id) && property._id === updated._id) ||
          (Boolean(updated.id) && property.id === updated.id) ||
          (Boolean(updated.publicReference) && property.publicReference === updated.publicReference)
            ? updated
            : property,
        ),
      );
    }
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
