export type CanonicalMapMarker =
  | { kind: 'property'; id: string; reference: string; title: string; lat: number; lng: number; label: string }
  | { kind: 'cluster'; id: string; lat: number; lng: number; count: number; sponsoredCount?: number };
