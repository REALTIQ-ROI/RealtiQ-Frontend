import { useEffect, useMemo, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import L from 'leaflet';
import { toast } from 'sonner';
import PublicLayout from '../../components/layout/PublicLayout';
import SimpleLineChart from '../../components/analytics/SimpleLineChart';
import LoadingState from '../../components/ui/LoadingState';
import ErrorState from '../../components/ui/ErrorState';
import { useCart } from '../../contexts/CartContext';
import { ApiRequestError } from '../../lib/axios';
import {
  propertyAnalyticsService,
  type AnalyticsAccessStatus,
  type AnalyticsMetric,
  type PropertyHeatmapResponse,
  type PropertyMarketSummaryResponse,
  type PropertyPriceTrendsResponse,
} from '../../services/propertyAnalyticsService';
import { propertyService } from '../../services/propertyService';
import type { Property } from '../../types';
import { configureMapbox, fitCoordinates, MAPBOX_STYLE } from '../../lib/mapbox';
import { MAP_PROVIDER } from '../../config/maps';

const formatCurrency = (value: number, currency = 'NGN') =>
  new Intl.NumberFormat('en-NG', { style: 'currency', currency, maximumFractionDigits: 0 }).format(value || 0);

const formatNumber = (value: number) => new Intl.NumberFormat('en-NG').format(value || 0);

const inputClass = 'w-full rounded-lg bg-surface-container-low px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20';

const isMappable = (property: Property) => {
  const lat = property.coordinates?.lat;
  const lng = property.coordinates?.lng;
  return typeof lat === 'number' && Number.isFinite(lat) && typeof lng === 'number' && Number.isFinite(lng);
};

const distanceScore = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) =>
  Math.abs(a.lat - b.lat) + Math.abs(a.lng - b.lng);

const drawHeatmapCanvas = (map: mapboxgl.Map | L.Map, canvas: HTMLCanvasElement, points: PropertyHeatmapResponse['points']) => {
  const size = map instanceof L.Map ? map.getSize() : { x: map.getCanvas().clientWidth, y: map.getCanvas().clientHeight };
  const ratio = window.devicePixelRatio || 1;
  canvas.width = size.x * ratio;
  canvas.height = size.y * ratio;
  canvas.style.width = `${size.x}px`;
  canvas.style.height = `${size.y}px`;
  const context = canvas.getContext('2d');
  if (!context) return;
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.clearRect(0, 0, size.x, size.y);
  if (!points.length) return;

  const maxWeight = Math.max(...points.map((point) => point.weight), 1);
  points.forEach((point) => {
    const pixel = map instanceof L.Map ? map.latLngToContainerPoint([point.lat, point.lng]) : map.project([point.lng, point.lat]);
    const intensity = Math.max(0.12, Math.min(1, point.weight / maxWeight));
    const radius = 34 + intensity * 58;
    const gradient = context.createRadialGradient(pixel.x, pixel.y, 0, pixel.x, pixel.y, radius);
    gradient.addColorStop(0, `rgba(127, 29, 29, ${0.68 * intensity})`);
    gradient.addColorStop(0.28, `rgba(239, 68, 68, ${0.5 * intensity})`);
    gradient.addColorStop(0.5, `rgba(245, 158, 11, ${0.34 * intensity})`);
    gradient.addColorStop(0.72, `rgba(34, 197, 94, ${0.22 * intensity})`);
    gradient.addColorStop(1, 'rgba(14, 165, 233, 0)');
    context.fillStyle = gradient;
    context.beginPath();
    context.arc(pixel.x, pixel.y, radius, 0, Math.PI * 2);
    context.fill();
  });
};

const MarketHeatmap = ({
  data,
  matchingProperties,
}: {
  data: PropertyHeatmapResponse | null;
  matchingProperties: Property[];
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const leafletMapRef = useRef<L.Map | null>(null);
  const leafletLayerRef = useRef<L.LayerGroup | null>(null);
  const heatCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (MAP_PROVIDER !== 'mapbox' || !containerRef.current || mapRef.current || !configureMapbox()) return;
    const map = new mapboxgl.Map({ container: containerRef.current, style: MAPBOX_STYLE, center: [3.3792, 6.5244], zoom: 10 });
    map.addControl(new mapboxgl.NavigationControl(), 'top-right');
    mapRef.current = map;
    const heatCanvas = document.createElement('canvas');
    heatCanvas.className = 'pointer-events-none absolute inset-0 z-[450] mix-blend-multiply';
    containerRef.current.appendChild(heatCanvas);
    heatCanvasRef.current = heatCanvas;
    const resize = new ResizeObserver(() => map.resize());
    resize.observe(containerRef.current);
    return () => {
      resize.disconnect();
      heatCanvas.remove();
      heatCanvasRef.current = null;
      map.remove();
      mapRef.current = null;
      markersRef.current = [];
    };
  }, []);

  useEffect(() => {
    if (MAP_PROVIDER !== 'leaflet' || !containerRef.current || leafletMapRef.current) return;
    const map = L.map(containerRef.current, { zoomControl: true }).setView([6.5244, 3.3792], 11);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap contributors', maxZoom: 19 }).addTo(map);
    leafletLayerRef.current = L.layerGroup().addTo(map); leafletMapRef.current = map;
    const heatCanvas = document.createElement('canvas'); heatCanvas.className = 'pointer-events-none absolute inset-0 z-[450] mix-blend-multiply'; containerRef.current.appendChild(heatCanvas); heatCanvasRef.current = heatCanvas;
    const resize = new ResizeObserver(() => map.invalidateSize()); resize.observe(containerRef.current);
    return () => { resize.disconnect(); heatCanvas.remove(); heatCanvasRef.current = null; map.remove(); leafletMapRef.current = null; leafletLayerRef.current = null; };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const heatCanvas = heatCanvasRef.current;
    if (MAP_PROVIDER !== 'mapbox' || !map || !heatCanvas) return;
    markersRef.current.forEach((marker) => marker.remove());
    const propertyPoints = matchingProperties.filter(isMappable);
    const points = data?.points ?? [];
    markersRef.current = propertyPoints.map((property) => {
      const element = document.createElement('button'); element.type = 'button'; element.className = 'h-4 w-4 rounded-full border-2 border-white bg-gray-900 shadow'; element.title = property.title;
      const popup = new mapboxgl.Popup({ offset: 12 }).setText(`${property.title} · ${property.location} · ${formatCurrency(property.price, property.currency)}`);
      return new mapboxgl.Marker({ element }).setLngLat([property.coordinates!.lng, property.coordinates!.lat]).setPopup(popup).addTo(map);
    });
    const coordinates: Array<[number, number]> = [...propertyPoints.map((property) => [property.coordinates!.lng, property.coordinates!.lat] as [number, number]), ...points.map((point) => [point.lng, point.lat] as [number, number])];
    fitCoordinates(map, coordinates, { padding: 30, maxZoom: propertyPoints.length ? 15 : 13 });
    const redraw = () => drawHeatmapCanvas(map, heatCanvas, points);
    window.setTimeout(redraw, 0);
    map.on('moveend', redraw); map.on('resize', redraw);
    return () => {
      map.off('moveend', redraw); map.off('resize', redraw);
    };
  }, [data, matchingProperties]);

  useEffect(() => {
    const map = leafletMapRef.current; const layer = leafletLayerRef.current; const heatCanvas = heatCanvasRef.current;
    if (MAP_PROVIDER !== 'leaflet' || !map || !layer || !heatCanvas) return;
    layer.clearLayers(); const propertyPoints = matchingProperties.filter(isMappable); const points = data?.points ?? []; const bounds = L.latLngBounds([]);
    propertyPoints.forEach((property) => {
      L.circleMarker([property.coordinates!.lat, property.coordinates!.lng], { radius: 6, fillColor: '#111827', fillOpacity: 0.95, color: '#ffffff', weight: 2 })
        .bindPopup(`<strong>${property.title}</strong><br/>${property.location}<br/>${formatCurrency(property.price, property.currency)}`).addTo(layer);
      bounds.extend([property.coordinates!.lat, property.coordinates!.lng]);
    });
    points.forEach((point) => bounds.extend([point.lat, point.lng]));
    if (bounds.isValid()) map.fitBounds(bounds, { padding: [30, 30], maxZoom: propertyPoints.length ? 15 : 13 });
    const redraw = () => drawHeatmapCanvas(map, heatCanvas, points); window.setTimeout(redraw, 0); map.on('moveend zoomend resize', redraw);
    return () => { map.off('moveend zoomend resize', redraw); };
  }, [data, matchingProperties]);

  return (
    <div className="relative min-h-[420px] overflow-hidden rounded-xl border border-outline-variant/10 bg-surface-container-low">
      <div ref={containerRef} className="absolute inset-0" />
      {data && data.points.length === 0 && matchingProperties.filter(isMappable).length === 0 ? (
        <div className="absolute inset-0 z-[500] flex items-center justify-center bg-white/85 p-8 text-center text-sm text-secondary">
          Not enough aggregate activity is available for this area and date range.
        </div>
      ) : null}
      {data && data.points.length > 0 ? (
        <div className="absolute bottom-3 left-3 z-[700] rounded-lg bg-white/95 px-3 py-2 text-xs font-bold text-secondary shadow">
          <div className="mb-1 flex items-center justify-between gap-8"><span>Low activity</span><span>High</span></div>
          <div className="h-2 w-40 rounded-full bg-gradient-to-r from-sky-300 via-emerald-400 via-amber-400 to-red-700" />
        </div>
      ) : null}
    </div>
  );
};

type ActiveArea = PropertyMarketSummaryResponse['mostActiveAreas'][number];

const activeAreaLabel = (area: ActiveArea, index: number, matchingProperties: Property[]) => {
  const named = area.areaName || area.name || area.location || area.place || area.label;
  if (named) return named;
  const nearby = matchingProperties
    .filter(isMappable)
    .sort((a, b) =>
      distanceScore({ lat: area.lat, lng: area.lng }, a.coordinates!) -
      distanceScore({ lat: area.lat, lng: area.lng }, b.coordinates!),
    )[0];
  return nearby?.location || `Activity area ${index + 1}`;
};

const Paywall = ({
  access,
  onUnlock,
  onAddToCart,
  initializing,
  addingToCart,
  message,
}: {
  access: AnalyticsAccessStatus | null;
  onUnlock: () => void;
  onAddToCart: () => void;
  initializing: boolean;
  addingToCart: boolean;
  message?: string | null;
}) => (
  <section className="mx-auto max-w-3xl rounded-xl border border-outline-variant/10 bg-white p-8 text-center shadow-sm">
    <span className="material-symbols-outlined text-5xl text-primary">query_stats</span>
    <h1 className="mt-4 text-3xl font-black tracking-tight text-primary">Unlock Property Market Analytics</h1>
    <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-secondary">
      Access aggregate heatmaps, market summary, and price trends for the RealtiQ property market. Access is verified from the backend every time.
    </p>
    {message ? <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm font-semibold text-amber-800">{message}</p> : null}
    <div className="mt-6 flex flex-wrap justify-center gap-3">
      <button
        type="button"
        disabled={initializing}
        onClick={onUnlock}
        className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-bold text-on-primary disabled:opacity-60"
      >
        <span className="material-symbols-outlined text-base">lock_open</span>
        {initializing ? 'Starting checkout...' : access?.access ? 'Renew access' : 'Pay Now'}
      </button>
      <button
        type="button"
        disabled={addingToCart}
        onClick={onAddToCart}
        className="inline-flex items-center justify-center gap-2 rounded-lg bg-surface-container-high px-6 py-3 text-sm font-bold text-on-surface disabled:opacity-60"
      >
        <span className="material-symbols-outlined text-base">shopping_cart</span>
        {addingToCart ? 'Adding...' : 'Add to Cart'}
      </button>
    </div>
  </section>
);

const PropertyMarketAnalytics = () => {
  const { addItem } = useCart();
  const [access, setAccess] = useState<AnalyticsAccessStatus | null>(null);
  const [summary, setSummary] = useState<PropertyMarketSummaryResponse | null>(null);
  const [heatmap, setHeatmap] = useState<PropertyHeatmapResponse | null>(null);
  const [trends, setTrends] = useState<PropertyPriceTrendsResponse | null>(null);
  const [matchingProperties, setMatchingProperties] = useState<Property[]>([]);
  const [loadingAccess, setLoadingAccess] = useState(true);
  const [loadingData, setLoadingData] = useState(false);
  const [initializing, setInitializing] = useState(false);
  const [addingToCart, setAddingToCart] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paywallMessage, setPaywallMessage] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    metric: 'market_interest' as AnalyticsMetric,
    period: 'day',
    startDate: '',
    endDate: '',
    propertyType: '',
    location: '',
  });

  const loadAccess = async () => {
    setLoadingAccess(true);
    setError(null);
    try {
      const next = await propertyAnalyticsService.getAccessStatus();
      setAccess(next);
      return next;
    } catch (raw) {
      setError(raw instanceof Error ? raw.message : 'Unable to check analytics access.');
      return null;
    } finally {
      setLoadingAccess(false);
    }
  };

  const loadAnalytics = async () => {
    setLoadingData(true);
    setError(null);
    try {
      const params = {
        metric: filters.metric,
        period: filters.period as 'hour' | 'day' | 'week' | 'month',
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined,
        propertyType: filters.propertyType || undefined,
        location: filters.location.trim() || undefined,
        limit: 300,
      };
      const [summaryResponse, heatmapResponse, trendsResponse, propertyResponse] = await Promise.all([
        propertyAnalyticsService.getMarketSummary(params),
        propertyAnalyticsService.getHeatmap(params),
        propertyAnalyticsService.getPriceTrends(params),
        propertyService.getProperties({
          propertyType: filters.propertyType || undefined,
          search: filters.location.trim() || undefined,
          limit: 100,
        }),
      ]);
      setSummary(summaryResponse);
      setHeatmap(heatmapResponse);
      setTrends(trendsResponse);
      setMatchingProperties(propertyResponse.properties);
      setPaywallMessage(null);
    } catch (raw) {
      if (raw instanceof ApiRequestError && raw.status === 402) {
        setAccess((current) => current ? { ...current, hasAccess: false } : null);
        setPaywallMessage(raw.message);
        return;
      }
      setError(raw instanceof Error ? raw.message : 'Unable to load analytics.');
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    void loadAccess();
  }, []);

  useEffect(() => {
    if (access?.hasAccess) void loadAnalytics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [access?.hasAccess, filters]);

  const startCheckout = async () => {
    setInitializing(true);
    try {
      const response = await propertyAnalyticsService.initializePayment('one_time');
      if (response.alreadyActive) {
        toast.success('Analytics access is already active.');
        await loadAccess();
        return;
      }
      const redirect = response.redirectUrl || response.authorizationUrl;
      if (!redirect) {
        toast.error('No checkout URL was returned.');
        return;
      }
      if (response.reference) sessionStorage.setItem('realtiq.analyticsPaymentReference', response.reference);
      window.location.href = redirect;
    } catch (raw) {
      toast.error(raw instanceof Error ? raw.message : 'Unable to initialize analytics payment.');
    } finally {
      setInitializing(false);
    }
  };

  const addAnalyticsToCart = async () => {
    setAddingToCart(true);
    try {
      await addItem({ itemType: 'property_market_analytics', accessType: 'one_time' });
      toast.success('Analytics access added to cart.');
    } catch (raw) {
      toast.error(raw instanceof Error ? raw.message : 'Unable to add analytics to cart.');
      await loadAccess();
    } finally {
      setAddingToCart(false);
    }
  };

  const trendModeData = useMemo(
    () => (trends?.series ?? []).map((point) => ({ label: point.period, value: point.averageListedPrice })),
    [trends],
  );

  return (
    <PublicLayout>
      <section className="mx-auto max-w-screen-2xl px-4 py-8 sm:px-8">
        {loadingAccess ? <LoadingState label="Checking analytics access..." /> : null}
        {!loadingAccess && !access?.hasAccess ? (
          <Paywall access={access} onUnlock={startCheckout} onAddToCart={addAnalyticsToCart} initializing={initializing} addingToCart={addingToCart} message={paywallMessage} />
        ) : null}
        {!loadingAccess && access?.hasAccess ? (
          <div className="space-y-6">
            <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-secondary">Paid analytics</span>
                <h1 className="mt-2 text-4xl font-extrabold tracking-tight text-primary">Property Market Analytics</h1>
                {access.adminBypass ? <p className="mt-2 text-sm font-semibold text-emerald-700">Admin access enabled.</p> : access.access?.expiresAt ? <p className="mt-2 text-sm text-secondary">Access expires {new Date(access.access.expiresAt).toLocaleString('en-NG')}.</p> : null}
              </div>
              <button type="button" onClick={() => void loadAccess()} className="rounded-lg bg-surface-container-high px-4 py-3 text-sm font-bold">
                Refresh access
              </button>
            </header>

            <div className="grid gap-3 rounded-xl border border-outline-variant/10 bg-white p-4 sm:grid-cols-2 lg:grid-cols-6">
              <label className="space-y-1 text-xs font-bold uppercase tracking-widest text-secondary">
                Metric
                <select className={inputClass} value={filters.metric} onChange={(event) => setFilters((old) => ({ ...old, metric: event.target.value as AnalyticsMetric }))}>
                  <option value="market_interest">Market interest</option>
                  <option value="searches">Searches</option>
                  <option value="views">Views</option>
                  <option value="saves">Saves</option>
                  <option value="inquiries">Inquiries</option>
                  <option value="purchases">Purchases</option>
                  <option value="transaction_value">Transaction value</option>
                </select>
              </label>
              <label className="space-y-1 text-xs font-bold uppercase tracking-widest text-secondary">
                Period
                <select className={inputClass} value={filters.period} onChange={(event) => setFilters((old) => ({ ...old, period: event.target.value }))}>
                  <option value="day">Day</option>
                  <option value="week">Week</option>
                  <option value="month">Month</option>
                </select>
              </label>
              <label className="space-y-1 text-xs font-bold uppercase tracking-widest text-secondary">
                Start date
                <input className={inputClass} type="date" value={filters.startDate} onChange={(event) => setFilters((old) => ({ ...old, startDate: event.target.value }))} />
              </label>
              <label className="space-y-1 text-xs font-bold uppercase tracking-widest text-secondary">
                End date
                <input className={inputClass} type="date" value={filters.endDate} onChange={(event) => setFilters((old) => ({ ...old, endDate: event.target.value }))} />
              </label>
              <label className="space-y-1 text-xs font-bold uppercase tracking-widest text-secondary">
                Type
                <select className={inputClass} value={filters.propertyType} onChange={(event) => setFilters((old) => ({ ...old, propertyType: event.target.value }))}>
                  <option value="">All</option>
                  <option value="house">House</option>
                  <option value="apartment">Apartment</option>
                  <option value="commercial">Commercial</option>
                </select>
              </label>
              <label className="space-y-1 text-xs font-bold uppercase tracking-widest text-secondary">
                Location
                <input className={inputClass} value={filters.location} onChange={(event) => setFilters((old) => ({ ...old, location: event.target.value }))} />
              </label>
            </div>

            {error ? <ErrorState message={error} onRetry={() => void loadAnalytics()} /> : null}
            {loadingData ? <LoadingState label="Loading market analytics..." /> : null}

            {summary && !loadingData ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
                {[
                  ['Searches', formatNumber(summary.totalSearches)],
                  ['Views', formatNumber(summary.totalPropertyViews)],
                  ['Saves', formatNumber(summary.totalSaves)],
                  ['Inquiries', formatNumber(summary.totalInquiries)],
                  ['Purchases', formatNumber(summary.totalSuccessfulPurchases)],
                  ['Transaction value', formatCurrency(summary.totalTransactionValue)],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-xl border border-outline-variant/10 bg-white p-4">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-secondary">{label}</p>
                    <p className="mt-2 text-xl font-black text-primary">{value}</p>
                  </div>
                ))}
              </div>
            ) : null}

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,.65fr)]">
              <div className="space-y-3">
                <h2 className="text-xl font-black text-primary">Activity heatmap</h2>
                <MarketHeatmap data={heatmap} matchingProperties={matchingProperties} />
                {heatmap?.weights && filters.metric === 'market_interest' ? (
                  <details className="rounded-xl border border-outline-variant/10 bg-white p-4 text-sm text-secondary">
                    <summary className="cursor-pointer font-bold text-primary">Market interest weighting</summary>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      {Object.entries(heatmap.weights).map(([key, value]) => (
                        <p key={key} className="flex justify-between gap-3"><span>{key.replaceAll('_', ' ')}</span><strong>{value}</strong></p>
                      ))}
                    </div>
                  </details>
                ) : null}
              </div>

              <div className="space-y-4">
                <section className="rounded-xl border border-outline-variant/10 bg-white p-5">
                  <h2 className="text-lg font-black text-primary">Price trends</h2>
                  <p className="mt-1 text-xs text-secondary">{trends ? `${formatNumber(trends.totalPropertiesSampled)} properties sampled` : 'Trend data'}</p>
                  <SimpleLineChart data={trendModeData} formatValue={(value) => formatCurrency(value, trends?.currency)} height={230} emptyLabel="No price trend data for these filters." />
                </section>
                <section className="rounded-xl border border-outline-variant/10 bg-white p-5">
                  <h2 className="text-lg font-black text-primary">Most active areas</h2>
                  <div className="mt-3 space-y-2">
                    {summary?.mostActiveAreas.length ? summary.mostActiveAreas.map((area, index) => (
                      <div key={area.cellId} className="flex items-center justify-between rounded-lg bg-surface-container-low p-3 text-sm">
                        <span>{activeAreaLabel(area, index, matchingProperties)}</span>
                        <strong>{area.score}</strong>
                      </div>
                    )) : <p className="text-sm text-secondary">No active areas returned.</p>}
                  </div>
                </section>
                <section className="rounded-xl border border-outline-variant/10 bg-white p-5">
                  <h2 className="text-lg font-black text-primary">Property types</h2>
                  <div className="mt-3 space-y-2">
                    {(summary?.mostViewedPropertyTypes ?? []).map((type) => (
                      <div key={type.propertyType} className="flex items-center justify-between rounded-lg bg-surface-container-low p-3 text-sm">
                        <span className="capitalize">{type.propertyType}</span>
                        <span>{formatNumber(type.views)} views / {formatNumber(type.purchases)} purchases</span>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            </div>
          </div>
        ) : null}
      </section>
    </PublicLayout>
  );
};

export default PropertyMarketAnalytics;
