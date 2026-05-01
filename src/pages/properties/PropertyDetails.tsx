import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import AuthLoader from '../../components/common/AuthLoader';
import { propertyService } from '../../services/propertyService';
import { useAuth } from '../../contexts/AuthContext';
import { useProperties } from '../../hooks/useProperties';
import { resolveOwnerId } from '../../types';
import type { MediaItem, Property, PropertyOwner } from '../../types';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(value);

/* ------------------------------------------------------------------ */
/* Gallery                                                              */
/* ------------------------------------------------------------------ */
const Gallery = ({ media }: { media: MediaItem[] }) => {
  const [active, setActive] = useState(0);
  const current = media[active];

  if (!media.length) {
    return (
      <div className="aspect-video bg-surface-container-low rounded-2xl flex items-center justify-center">
        <span className="material-symbols-outlined text-5xl text-on-surface-variant/30">apartment</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Main */}
      <div className="aspect-video rounded-2xl overflow-hidden bg-slate-900 relative">
        {current?.type === 'video' ? (
          <video
            key={current.url}
            src={current.url}
            controls
            className="w-full h-full object-contain"
          />
        ) : (
          <img
            src={current?.url}
            alt="Property"
            className="w-full h-full object-cover"
          />
        )}
        <span className="absolute top-3 right-3 px-2 py-1 rounded-full bg-black/50 text-white text-[10px] font-bold uppercase tracking-wide">
          {active + 1} / {media.length}
        </span>
      </div>

      {/* Thumbnails */}
      {media.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {media.map((item, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setActive(i)}
              className={`shrink-0 w-20 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                i === active ? 'border-primary shadow-md' : 'border-transparent opacity-60 hover:opacity-90'
              }`}
            >
              {item.type === 'video' ? (
                <div className="w-full h-full bg-slate-800 flex items-center justify-center">
                  <span className="material-symbols-outlined text-white text-base">play_circle</span>
                </div>
              ) : (
                <img src={item.url} alt={`thumb ${i}`} className="w-full h-full object-cover" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Featured Toggle (admin)                                              */
/* ------------------------------------------------------------------ */
const FeaturedToggle = ({
  propertyId,
  featured,
  onChange,
}: {
  propertyId: string;
  featured: boolean;
  onChange: (next: boolean) => void;
}) => {
  const [busy, setBusy] = useState(false);

  const toggle = async () => {
    setBusy(true);
    const next = !featured;
    onChange(next); // optimistic
    try {
      await propertyService.toggleFeatured(propertyId, next);
      toast.success(next ? 'Property marked as featured' : 'Property removed from featured');
    } catch (err) {
      onChange(featured); // rollback
      toast.error(err instanceof Error ? err.message : 'Failed to update featured status.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={() => void toggle()}
      disabled={busy}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all border ${
        featured
          ? 'bg-amber-50 border-amber-300 text-amber-700 hover:bg-amber-100'
          : 'bg-surface-container-low border-outline-variant/20 text-on-surface hover:bg-surface-container'
      } disabled:opacity-60`}
    >
      <span className="material-symbols-outlined text-base">{featured ? 'star' : 'star_outline'}</span>
      {featured ? 'Remove Featured' : 'Mark Featured'}
    </button>
  );
};

/* ------------------------------------------------------------------ */
/* Main Page                                                            */
/* ------------------------------------------------------------------ */
const PropertyDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { deleteProperty, buyProperty } = useProperties();

  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [featured, setFeatured] = useState(false);
  const hasFired = useRef(false);

  useEffect(() => {
    if (!id || hasFired.current) return;
    hasFired.current = true;

    propertyService
      .getPropertyById(id)
      .then((p) => {
        setProperty(p);
        setFeatured(p.featured ?? false);
      })
      .catch((err: unknown) => {
        setFetchError(err instanceof Error ? err.message : 'Property not found.');
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <AuthLoader />;

  if (fetchError || !property) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center px-6"
        style={{ backgroundColor: '#f7f9fb', fontFamily: 'Inter, sans-serif' }}
      >
        <div className="text-center">
          <span className="material-symbols-outlined text-6xl text-slate-300 mb-4 block">search_off</span>
          <h1 className="text-2xl font-bold text-slate-700 mb-2">Property not found</h1>
          <p className="text-slate-500 mb-6">{fetchError}</p>
          <Link
            to="/properties"
            className="px-6 py-3 rounded-xl text-white text-sm font-bold hover:opacity-90 transition-opacity"
            style={{ background: 'linear-gradient(135deg, #000000 0%, #111c2d 100%)' }}
          >
            Browse Properties
          </Link>
        </div>
      </div>
    );
  }

  const ownerId = resolveOwnerId(property.ownerId);
  const ownerInfo = typeof property.ownerId === 'object' ? (property.ownerId as PropertyOwner) : null;
  const isOwner = user?.role === 'landlord' && user._id === ownerId;
  const isBuyer = user?.role === 'buyer';
  const isAdmin = user?.role === 'admin';

  const handleDelete = async () => {
    if (!id) return;
    const ok = await deleteProperty(id);
    if (ok) navigate('/properties', { replace: true });
  };

  const handleBuy = () => void buyProperty(id!);

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: '#f7f9fb', fontFamily: 'Inter, sans-serif' }}
    >
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-xl border-b border-outline-variant/10 sticky top-0 z-40">
        <div className="max-w-screen-xl mx-auto px-6 py-5 flex items-center justify-between">
          <Link
            to="/"
            className="text-2xl font-black tracking-tighter text-slate-900"
            style={{ fontFamily: 'Manrope, sans-serif' }}
          >
            RealtiQ
          </Link>
          <Link
            to="/properties"
            className="text-sm font-semibold text-secondary hover:text-primary transition-colors flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-base">arrow_back</span>
            All Properties
          </Link>
        </div>
      </header>

      <main className="max-w-screen-xl mx-auto px-6 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Left — Gallery + Details */}
          <div className="lg:col-span-2 space-y-8">
            {/* Gallery */}
            <Gallery media={property.media} />

            {/* Title + Badges */}
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span
                  className={`px-2.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wide ${
                    property.status === 'available'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-red-100 text-red-700'
                  }`}
                >
                  {property.status}
                </span>
                <span className="px-2.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wide bg-surface-container text-on-surface-variant">
                  {property.propertyType}
                </span>
                {featured && (
                  <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 text-[11px] font-black uppercase tracking-wide">
                    <span className="material-symbols-outlined text-xs">star</span>
                    Featured
                  </span>
                )}
              </div>
              <h1
                className="text-3xl md:text-4xl font-extrabold text-on-surface tracking-tight"
                style={{ fontFamily: 'Manrope, sans-serif' }}
              >
                {property.title}
              </h1>
              <p className="text-secondary flex items-center gap-1 mt-2">
                <span className="material-symbols-outlined text-base">location_on</span>
                {property.location}
              </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { icon: 'bed', label: 'Bedrooms', value: property.bedrooms },
                { icon: 'bathtub', label: 'Bathrooms', value: property.bathrooms },
                { icon: 'square_foot', label: 'Sq. Feet', value: property.squareFeet.toLocaleString() },
                { icon: 'apartment', label: 'Type', value: property.propertyType },
              ].map(({ icon, label, value }) => (
                <div key={label} className="bg-white rounded-xl p-4 border border-outline-variant/10 text-center">
                  <span className="material-symbols-outlined text-2xl text-primary mb-1 block">{icon}</span>
                  <p className="text-xs text-secondary font-medium">{label}</p>
                  <p className="text-base font-extrabold text-on-surface capitalize">{value}</p>
                </div>
              ))}
            </div>

            {/* Description */}
            <div className="bg-white rounded-2xl p-6 border border-outline-variant/10">
              <h2
                className="text-lg font-black text-on-surface mb-4"
                style={{ fontFamily: 'Manrope, sans-serif' }}
              >
                Description
              </h2>
              <p className="text-secondary text-sm leading-relaxed whitespace-pre-wrap">
                {property.description}
              </p>
            </div>

            {/* Amenities */}
            {property.amenities && property.amenities.length > 0 && (
              <div className="bg-white rounded-2xl p-6 border border-outline-variant/10">
                <h2
                  className="text-lg font-black text-on-surface mb-4"
                  style={{ fontFamily: 'Manrope, sans-serif' }}
                >
                  Amenities
                </h2>
                <div className="flex flex-wrap gap-2">
                  {property.amenities.map((a) => (
                    <span
                      key={a}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-surface-container text-on-surface text-sm font-semibold"
                    >
                      <span className="material-symbols-outlined text-sm text-primary">check_circle</span>
                      {a}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Owner Info */}
            {ownerInfo && (
              <div className="bg-white rounded-2xl p-6 border border-outline-variant/10">
                <h2
                  className="text-lg font-black text-on-surface mb-4"
                  style={{ fontFamily: 'Manrope, sans-serif' }}
                >
                  Listed By
                </h2>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="material-symbols-outlined text-primary">person</span>
                  </div>
                  <div>
                    <p className="font-bold text-on-surface">{ownerInfo.name}</p>
                    <p className="text-secondary text-sm">{ownerInfo.email}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right — Pricing + CTAs */}
          <div className="space-y-5 lg:sticky lg:top-24 self-start">
            <div className="bg-white rounded-2xl p-6 border border-outline-variant/10">
              <p className="text-secondary text-sm mb-1">Asking price</p>
              <p
                className="text-3xl font-extrabold text-on-surface mb-6"
                style={{ fontFamily: 'Manrope, sans-serif' }}
              >
                {formatCurrency(property.price)}
              </p>

              {/* Role-based CTAs */}
              <div className="space-y-3">
                {/* Buyer */}
                {isBuyer && property.status === 'available' && (
                  <button
                    type="button"
                    onClick={handleBuy}
                    className="w-full py-4 rounded-xl text-white font-bold text-sm tracking-tight hover:opacity-90 transition-opacity"
                    style={{ background: 'linear-gradient(135deg, #000000 0%, #111c2d 100%)' }}
                  >
                    Buy Property
                  </button>
                )}

                {/* Landlord (owner) */}
                {isOwner && (
                  <>
                    <Link
                      to={`/properties/${property._id}/edit`}
                      className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl bg-surface-container text-on-surface font-bold text-sm hover:bg-surface-container-high transition-colors"
                    >
                      <span className="material-symbols-outlined text-base">edit</span>
                      Edit Property
                    </Link>
                    <button
                      type="button"
                      onClick={() => void handleDelete()}
                      className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl bg-red-50 text-red-600 font-bold text-sm hover:bg-red-100 transition-colors border border-red-200"
                    >
                      <span className="material-symbols-outlined text-base">delete</span>
                      Delete Property
                    </button>
                  </>
                )}

                {/* Admin */}
                {isAdmin && (
                  <FeaturedToggle
                    propertyId={property._id}
                    featured={featured}
                    onChange={setFeatured}
                  />
                )}

                {/* Not logged in */}
                {!user && (
                  <Link
                    to="/login"
                    className="flex items-center justify-center w-full py-4 rounded-xl text-white font-bold text-sm tracking-tight hover:opacity-90 transition-opacity"
                    style={{ background: 'linear-gradient(135deg, #000000 0%, #111c2d 100%)' }}
                  >
                    Sign in to Buy
                  </Link>
                )}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="bg-white rounded-2xl p-5 border border-outline-variant/10 text-sm space-y-3">
              <div className="flex justify-between text-secondary">
                <span>Price / sqft</span>
                <span className="font-bold text-on-surface">
                  {formatCurrency(Math.round(property.price / property.squareFeet))}
                </span>
              </div>
              <div className="flex justify-between text-secondary">
                <span>Property ID</span>
                <span className="font-bold text-on-surface font-mono text-xs">
                  {property._id.slice(-8).toUpperCase()}
                </span>
              </div>
              {property.createdAt && (
                <div className="flex justify-between text-secondary">
                  <span>Listed</span>
                  <span className="font-bold text-on-surface">
                    {new Date(property.createdAt).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 mt-16">
        <div className="max-w-screen-xl mx-auto px-6 py-10 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-white font-black text-xl tracking-tighter" style={{ fontFamily: 'Manrope, sans-serif' }}>
            RealtiQ
          </div>
          <p className="text-slate-500 text-xs">© 2024 RealtiQ Architectural Curation.</p>
        </div>
      </footer>
    </div>
  );
};

export default PropertyDetails;
