import { useEffect, useState, type FormEvent, type KeyboardEvent } from 'react';
import { toast } from 'sonner';
import { ApiRequestError } from '../../lib/axios';
import MediaUploader from './MediaUploader';
import { documentService } from '../../services/documentService';
import { projectService } from '../../services/projectService';
import type { CreatePropertyPayload, TitleDocumentUploadMetadata } from '../../services/propertyService';
import type { ListingType, MediaItem, OffPlanDevelopmentStatus, OffPlanPaymentMilestone, ProjectCard, Property, PropertyPaymentType, TitleDocumentPolicyMode, TitleDocumentType } from '../../types';
import { documentTypeLabel, titleDocumentTypeOptions } from '../../utils/titleVerification';
import StructuredFactsFields from './StructuredFactsFields';
import { sellerStructuredFacts, validateStructuredFacts } from '../../features/phase45/structuredFacts';
import type { StructuredPropertyFacts } from '../../types/phase45';
import {
  normalizePaymentTypesForForm,
  PROPERTY_PAYMENT_TYPE_ORDER,
  propertyPaymentTypeIcons,
  propertyPaymentTypeLabels,
} from '../../utils/propertyPaymentTypes';

interface PropertyFormProps {
  initialData?: Partial<CreatePropertyPayload & Pick<Property, 'project'> & { status: string }>;
  onSubmit: (data: CreatePropertyPayload & { status?: string }) => Promise<Property | void>;
  isLoading?: boolean;
  submitLabel?: string;
  mode?: 'create' | 'edit';
}

const PROPERTY_TYPES = [
  'house',
  'apartment',
  'commercial',
  'villa',
  'penthouse',
  'estate',
];
const CATEGORY_OPTIONS = ['residential', 'commercial', 'mixed_use'];
const STAGE_OPTIONS = ['off_plan', 'unfinished', 'finished', 'renovation'];
const CURRENCY_OPTIONS = ['NGN', 'USD'];
const LISTING_TYPE_OPTIONS: Array<{ value: ListingType; label: string }> = [
  { value: 'ready', label: 'Ready' },
  { value: 'off_plan', label: 'Off-Plan' },
];
const DEVELOPMENT_STATUS_OPTIONS: OffPlanDevelopmentStatus[] = ['planned', 'pre_construction', 'foundation', 'structural', 'roofing', 'finishing', 'completed'];
const TITLE_DOCUMENT_ACCEPT = '.pdf,image/jpeg,image/png,image/webp';
const MAX_TITLE_DOCUMENT_BYTES = 50 * 1024 * 1024;

interface TitleDocumentRow {
  key: string;
  file: File | null;
  documentType: TitleDocumentType;
  title: string;
  mode: TitleDocumentPolicyMode;
  assetId?: string;
  expiresAt?: string;
  progress: number;
  status: 'idle' | 'uploading' | 'staged' | 'failed';
  error?: string;
}

const createTitleDocumentRow = (): TitleDocumentRow => ({
  key: crypto.randomUUID(),
  file: null,
  documentType: 'survey_plan',
  title: 'Survey Plan',
  mode: 'private',
  progress: 0,
  status: 'idle',
});

const inputClass =
  'w-full bg-surface-container-low rounded-lg px-4 py-3 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all';
const labelClass = 'block text-[11px] font-bold uppercase tracking-widest text-secondary mb-1.5';
const errorClass = 'text-error text-xs mt-1';

const canonicalText = (fields: Record<string, unknown> | undefined, key: string): string => {
  const value = fields?.[key];
  return typeof value === 'string' || typeof value === 'number' ? String(value) : '';
};

const canonicalBoolean = (fields: Record<string, unknown> | undefined, key: string): string => {
  const value = fields?.[key];
  return typeof value === 'boolean' ? String(value) : '';
};

const savedCanonicalFields = [
  ['gatedEstate', 'Gated estate'], ['estateName', 'Estate name'], ['streetAddress', 'Street address'],
  ['houseNumber', 'House number'], ['unitOrFlatNumber', 'Unit or flat number'],
  ['estateAccessStreet', 'Estate access street'], ['estateInternalStreet', 'Estate internal street'],
  ['estateHouseUnitNumber', 'Estate house or unit number'], ['commercialFrontage', 'Commercial frontage'],
  ['commercialFloorsOrUnits', 'Commercial floors or units'], ['loadingVehicleAccess', 'Loading vehicle access'],
  ['loadingVehicleAccessType', 'Loading access type'], ['liftCount', 'Lift count'], ['fitOut', 'Fit-out'],
] as const;

const savedCanonicalValue = (fields: Record<string, unknown>, key: string): string => {
  if (!Object.prototype.hasOwnProperty.call(fields, key)) return 'Missing from property response';
  const value = fields[key];
  if (value === null) return 'Explicit null';
  if (value === false) return 'False (explicit)';
  if (value === true) return 'True (explicit)';
  if (value === 0) return '0 (explicit)';
  if (value === '') return 'Empty string (explicit)';
  return typeof value === 'string' || typeof value === 'number' ? String(value) : 'Returned value';
};

// An empty control is unanswered. Zero and false are explicit answers, never defaults.
const changedCanonicalValue = (
  patch: Record<string, unknown>,
  original: Record<string, unknown> | undefined,
  key: string,
  value: string,
  kind: 'text' | 'number' | 'boolean' = 'text',
): void => {
  if (value.trim() === '') return;
  if (value === original?.[key]) return;
  const next = kind === 'number' ? Number(value) : kind === 'boolean' ? value === 'true' : value.trim();
  if (next !== original?.[key]) patch[key] = next;
};

const validate = (data: CreatePropertyPayload & { status?: string }, mode: 'create' | 'edit', hadPaymentTypes: boolean): Record<string, string> => {
  const errs: Record<string, string> = {};
  if (mode === 'create' && !data.title.trim()) errs.title = 'Title is required';
  if (data.price < 0) errs.price = 'Price cannot be negative';
  if (!Number.isFinite(data.price)) errs.price = 'Price must be a valid number';
  if (mode === 'create' && !data.location.trim()) errs.location = 'Location is required';
  if (!data.propertyType && mode === 'create') errs.propertyType = 'Property type is required';
  if (data.bedrooms !== undefined && (!Number.isInteger(data.bedrooms) || data.bedrooms < 0)) errs.bedrooms = 'Bedrooms must be a non-negative whole number';
  if (data.bathrooms !== undefined && (!Number.isInteger(data.bathrooms) || data.bathrooms < 0)) errs.bathrooms = 'Bathrooms must be a non-negative whole number';
  if (!data.completionStage && mode === 'create') errs.completionStage = 'Completion stage is required';
  if (mode === 'create' && data.squareFeet === undefined) errs.squareFeet = 'Enter square footage, including 0 when explicitly intended';
  else if (data.squareFeet !== undefined && (!Number.isFinite(data.squareFeet) || data.squareFeet < 0)) errs.squareFeet = 'Square footage must be non-negative';
  if (!data.description.trim() && mode === 'create') errs.description = 'Description is required';
  if ((!data.media || data.media.length === 0) && mode === 'create') errs.media = 'At least one media file is required';
  if (!data.category && mode === 'create') errs.category = 'Category is required';
  if (!data.currency && mode === 'create') errs.currency = 'Currency is required';
  if (!data.paymentTypes.length && (mode === 'create' || hadPaymentTypes)) errs.paymentTypes = 'Select at least one property payment type';
  if (data.coordinates) {
    if (!Number.isFinite(data.coordinates.lat) || data.coordinates.lat < -90 || data.coordinates.lat > 90) {
      errs.coordinatesLat = 'Latitude must be between -90 and 90';
    }
    if (!Number.isFinite(data.coordinates.lng) || data.coordinates.lng < -180 || data.coordinates.lng > 180) {
      errs.coordinatesLng = 'Longitude must be between -180 and 180';
    }
  }
  if (data.priceChangeReason && data.priceChangeReason.length > 500) {
    errs.priceChangeReason = 'Reason must be 500 characters or fewer';
  }
  if (data.offPlan) {
    const progress = Number(data.offPlan.constructionProgress ?? 0);
    if (progress < 0 || progress > 100) errs.constructionProgress = 'Progress must be between 0 and 100';
    if (mode === 'create' && !data.offPlan.expectedCompletionDate) errs.expectedCompletionDate = 'Expected completion date is required';
    if ((data.offPlan.reservationAmount ?? 0) < 0) errs.reservationAmount = 'Reservation cannot be negative';
    if ((data.offPlan.minimumInitialDeposit ?? 0) < 0) errs.minimumInitialDeposit = 'Deposit cannot be negative';
    if ((data.offPlan.reservationAmount ?? 0) > data.price) errs.reservationAmount = 'Reservation cannot exceed property price';
    if ((data.offPlan.minimumInitialDeposit ?? 0) > data.price) errs.minimumInitialDeposit = 'Deposit cannot exceed property price';
    if ((data.offPlan.unitsAvailable ?? 0) > (data.offPlan.totalUnitsPlanned ?? Number.MAX_SAFE_INTEGER)) errs.unitsAvailable = 'Available units cannot exceed planned units';
    if (mode === 'create' && !data.offPlan.riskDisclosure?.trim()) errs.riskDisclosure = 'Risk disclosure is required for off-plan listings';
    const milestones = data.offPlan.paymentMilestones ?? [];
    const sequences = new Set(milestones.map((item) => item.sequence));
    if (sequences.size !== milestones.length) errs.paymentMilestones = 'Milestone sequence values must be unique';
    const percentageMilestones = milestones.filter((item) => typeof item.percentage === 'number');
    if (percentageMilestones.length) {
      const total = percentageMilestones.reduce((sum, item) => sum + Number(item.percentage ?? 0), 0);
      if (Math.round(total) !== 100) errs.paymentMilestones = 'Milestone percentages must sum to 100';
    }
    const amountMilestones = milestones.filter((item) => typeof item.amount === 'number');
    if (amountMilestones.length) {
      const total = amountMilestones.reduce((sum, item) => sum + Number(item.amount ?? 0), 0);
      if (Math.round(total) !== Math.round(data.price)) errs.paymentMilestones = 'Milestone amounts must sum to property price';
    }
  }
  return errs;
};

const PropertyForm = ({
  initialData,
  onSubmit,
  isLoading = false,
  submitLabel = 'Save Property',
  mode = 'create',
}: PropertyFormProps) => {
  const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams();
  const initialProject = initialData?.project;
  const initialProjectId = searchParams.get('projectId') ?? initialProject?._id ?? '';
  const [title, setTitle] = useState(initialData?.title ?? '');
  const [price, setPrice] = useState(initialData?.price?.toString() ?? '');
  const [location, setLocation] = useState(initialData?.location ?? '');
  const [propertyType, setPropertyType] = useState(initialData?.propertyType ?? 'apartment');
  const [bedrooms, setBedrooms] = useState(initialData?.bedrooms?.toString() ?? '1');
  const [bathrooms, setBathrooms] = useState(initialData?.bathrooms?.toString() ?? '1');
  const [squareFeet, setSquareFeet] = useState(initialData?.squareFeet?.toString() ?? '');
  const [structuredFacts, setStructuredFacts] = useState<StructuredPropertyFacts>(() => sellerStructuredFacts(initialData?.structuredFacts ?? {}));
  const [structuredFactsTouched, setStructuredFactsTouched] = useState(false);
  const [description, setDescription] = useState(initialData?.description ?? '');
  const [category, setCategory] = useState(initialData?.category ?? (mode === 'create' ? 'residential' : ''));
  const [completionStage, setCompletionStage] = useState(initialData?.completionStage ?? (mode === 'create' ? 'finished' : ''));
  const [currency, setCurrency] = useState(initialData?.currency ?? (mode === 'create' ? 'NGN' : ''));
  const [coordinatesLat, setCoordinatesLat] = useState(initialData?.coordinates?.lat?.toString() ?? '');
  const [coordinatesLng, setCoordinatesLng] = useState(initialData?.coordinates?.lng?.toString() ?? '');
  const [priceChangeReason, setPriceChangeReason] = useState('');
  const [amenities, setAmenities] = useState<string[]>(initialData?.amenities ?? []);
  const [amenityInput, setAmenityInput] = useState('');
  const [media, setMedia] = useState<MediaItem[]>(initialData?.media ?? []);
  const initialCanonical = initialData?.canonicalFields;
  const [gatedEstate, setGatedEstate] = useState(() => canonicalBoolean(initialCanonical, 'gatedEstate'));
  const [estateName, setEstateName] = useState(() => canonicalText(initialCanonical, 'estateName'));
  const [streetAddress, setStreetAddress] = useState(() => canonicalText(initialCanonical, 'streetAddress'));
  const [houseNumber, setHouseNumber] = useState(() => canonicalText(initialCanonical, 'houseNumber'));
  const [unitOrFlatNumber, setUnitOrFlatNumber] = useState(() => canonicalText(initialCanonical, 'unitOrFlatNumber'));
  const [estateAccessStreet, setEstateAccessStreet] = useState(() => canonicalText(initialCanonical, 'estateAccessStreet'));
  const [estateInternalStreet, setEstateInternalStreet] = useState(() => canonicalText(initialCanonical, 'estateInternalStreet'));
  const [estateHouseUnitNumber, setEstateHouseUnitNumber] = useState(() => canonicalText(initialCanonical, 'estateHouseUnitNumber'));
  const [commercialFrontage, setCommercialFrontage] = useState(() => canonicalText(initialCanonical, 'commercialFrontage'));
  const [commercialFloorsOrUnits, setCommercialFloorsOrUnits] = useState(() => canonicalText(initialCanonical, 'commercialFloorsOrUnits'));
  const [loadingVehicleAccess, setLoadingVehicleAccess] = useState(() => canonicalBoolean(initialCanonical, 'loadingVehicleAccess'));
  const [loadingVehicleAccessType, setLoadingVehicleAccessType] = useState(() => canonicalText(initialCanonical, 'loadingVehicleAccessType'));
  const [liftCount, setLiftCount] = useState(() => canonicalText(initialCanonical, 'liftCount'));
  const [fitOut, setFitOut] = useState(() => canonicalText(initialCanonical, 'fitOut'));
  const [paymentTypes, setPaymentTypes] = useState<PropertyPaymentType[]>(() =>
    mode === 'edit'
      ? normalizePaymentTypesForForm(
          Number(initialData?.price ?? 0),
          initialData?.paymentTypes ?? [],
        )
      : [],
  );
  const [projects, setProjects] = useState<ProjectCard[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [projectId, setProjectId] = useState(initialProjectId);
  const [unitName, setUnitName] = useState(initialData?.projectUnit?.unitName ?? '');
  const [unitNumber, setUnitNumber] = useState(initialData?.projectUnit?.unitNumber ?? '');
  const [block, setBlock] = useState(initialData?.projectUnit?.block ?? '');
  const [phase, setPhase] = useState(initialData?.projectUnit?.phase ?? '');
  const [floor, setFloor] = useState(initialData?.projectUnit?.floor ?? '');
  const [plotNumber, setPlotNumber] = useState(initialData?.projectUnit?.plotNumber ?? '');
  const [listingType, setListingType] = useState<ListingType | ''>(initialData?.listingType ?? (mode === 'create' ? 'ready' : ''));
  const [offPlanTouched, setOffPlanTouched] = useState(false);
  const [developmentStatus, setDevelopmentStatus] = useState<OffPlanDevelopmentStatus>(initialData?.offPlan?.developmentStatus ?? 'planned');
  const [constructionProgress, setConstructionProgress] = useState(initialData?.offPlan?.constructionProgress?.toString() ?? '0');
  const [expectedCompletionDate, setExpectedCompletionDate] = useState(initialData?.offPlan?.expectedCompletionDate?.slice(0, 10) ?? '');
  const [constructionStartDate, setConstructionStartDate] = useState(initialData?.offPlan?.constructionStartDate?.slice(0, 10) ?? '');
  const [handoverDate, setHandoverDate] = useState(initialData?.offPlan?.handoverDate?.slice(0, 10) ?? '');
  const [reservationAmount, setReservationAmount] = useState(initialData?.offPlan?.reservationAmount?.toString() ?? '');
  const [minimumInitialDeposit, setMinimumInitialDeposit] = useState(initialData?.offPlan?.minimumInitialDeposit?.toString() ?? '');
  const [offPlanInstallmentAvailable, setOffPlanInstallmentAvailable] = useState(Boolean(initialData?.offPlan?.installmentAvailable));
  const [installmentDurationMonths, setInstallmentDurationMonths] = useState(initialData?.offPlan?.installmentDurationMonths?.toString() ?? '');
  const [paymentPlanDescription, setPaymentPlanDescription] = useState(initialData?.offPlan?.paymentPlanDescription ?? '');
  const [totalUnitsPlanned, setTotalUnitsPlanned] = useState(initialData?.offPlan?.totalUnitsPlanned?.toString() ?? '');
  const [unitsAvailable, setUnitsAvailable] = useState(initialData?.offPlan?.unitsAvailable?.toString() ?? '');
  const [unitType, setUnitType] = useState(initialData?.offPlan?.unitType ?? '');
  const [floorPlanAvailable, setFloorPlanAvailable] = useState(Boolean(initialData?.offPlan?.floorPlanAvailable));
  const [showUnitAvailable, setShowUnitAvailable] = useState(Boolean(initialData?.offPlan?.showUnitAvailable));
  const [developerGuaranteeInformation, setDeveloperGuaranteeInformation] = useState(initialData?.offPlan?.developerGuaranteeInformation ?? '');
  const [refundPolicy, setRefundPolicy] = useState(initialData?.offPlan?.refundPolicy ?? '');
  const [riskDisclosure, setRiskDisclosure] = useState(initialData?.offPlan?.riskDisclosure ?? '');
  const [milestones, setMilestones] = useState<OffPlanPaymentMilestone[]>(initialData?.offPlan?.paymentMilestones ?? []);
  const [titleDocumentRows, setTitleDocumentRows] = useState<TitleDocumentRow[]>([]);
  const [uploadingTitleDocument, setUploadingTitleDocument] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const saving = isLoading || uploadingTitleDocument || submitting;
  const categoryOptions = CATEGORY_OPTIONS;
  const propertyTypeOptions = PROPERTY_TYPES;
  const parsedPrice = Number(price) || 0;
  const initialPrice = Number(initialData?.price ?? 0);
  const priceChanged = mode === 'edit' && Number.isFinite(parsedPrice) && initialPrice > 0 && parsedPrice !== initialPrice;
  const isCommercial = category === 'commercial' || propertyType === 'commercial';

  useEffect(() => {
    setProjectsLoading(true);
    projectService
      .listMyProjects({ page: 1, limit: 100 })
      .then((response) => setProjects(response.projects ?? []))
      .catch(() => undefined)
      .finally(() => setProjectsLoading(false));
  }, []);

  const togglePaymentType = (type: PropertyPaymentType) => {
    setPaymentTypes((current) => {
      const selected = current.includes(type)
        ? current.filter((item) => item !== type)
        : [...current, type];
      return normalizePaymentTypesForForm(parsedPrice, selected);
    });
    setErrors((current) => ({ ...current, paymentTypes: '' }));
  };

  const addAmenity = () => {
    const trimmed = amenityInput.trim();
    if (trimmed && !amenities.includes(trimmed)) {
      setAmenities((prev) => [...prev, trimmed]);
    }
    setAmenityInput('');
  };

  const handleAmenityKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addAmenity();
    }
  };

  const removeAmenity = (item: string) => {
    setAmenities((prev) => prev.filter((a) => a !== item));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (saving) return;

    if (price.trim() === '') {
      setErrors((current) => ({ ...current, price: 'Enter an asking price, including 0 when explicitly intended.' }));
      return;
    }

    const canonicalInputs: Array<[string, string, 'text' | 'number' | 'boolean']> = [
      ['gatedEstate', gatedEstate, 'boolean'],
      ['unitOrFlatNumber', unitOrFlatNumber, 'text'],
      ...(gatedEstate === 'true' ? [
        ['estateName', estateName, 'text'],
        ['estateAccessStreet', estateAccessStreet, 'text'],
        ['estateInternalStreet', estateInternalStreet, 'text'],
        ['estateHouseUnitNumber', estateHouseUnitNumber, 'text'],
      ] : gatedEstate === 'false' ? [
        ['streetAddress', streetAddress, 'text'],
        ['houseNumber', houseNumber, 'text'],
      ] : []) as Array<[string, string, 'text' | 'number' | 'boolean']>,
      ...(isCommercial ? [
        ['commercialFrontage', commercialFrontage, 'number'],
        ['commercialFloorsOrUnits', commercialFloorsOrUnits, 'number'],
        ['loadingVehicleAccess', loadingVehicleAccess, 'boolean'],
        ...(loadingVehicleAccess === 'true' ? [['loadingVehicleAccessType', loadingVehicleAccessType, 'text']] : []),
        ['liftCount', liftCount, 'number'],
        ['fitOut', fitOut, 'text'],
      ] : []) as Array<[string, string, 'text' | 'number' | 'boolean']>,
    ];
    const canonicalErrors: Record<string, string> = {};
    const canonicalFields: Record<string, unknown> = {};
    for (const [key, value, kind] of canonicalInputs) {
      if (value.trim() === '' && initialCanonical?.[key] !== undefined && initialCanonical[key] !== null && initialCanonical[key] !== '') {
        canonicalErrors[key] = 'Clearing this saved value requires a documented reset operation.';
      } else if (kind === 'number' && value.trim() !== '' && (!Number.isFinite(Number(value)) || Number(value) < 0 ||
        ((key === 'commercialFloorsOrUnits' || key === 'liftCount') && !Number.isInteger(Number(value))))) {
        canonicalErrors[key] = 'Enter a non-negative' + (key === 'commercialFrontage' ? ' number.' : ' whole number.');
      } else {
        changedCanonicalValue(canonicalFields, initialCanonical, key, value, kind);
      }
    }
    if (Object.keys(canonicalErrors).length) {
      setErrors(canonicalErrors);
      return;
    }

    const latProvided = coordinatesLat.trim() !== '';
    const lngProvided = coordinatesLng.trim() !== '';
    const basePayload: CreatePropertyPayload & { status?: string } = {
      title: title.trim(),
      price: Number(price),
      paymentTypes: normalizePaymentTypesForForm(parsedPrice, paymentTypes),
      location: location.trim(),
      propertyType,
      ...(squareFeet.trim() === '' ? {} : { squareFeet: Number(squareFeet) }),
      ...(mode === 'create' || structuredFactsTouched ? { structuredFacts: sellerStructuredFacts(structuredFacts) } : {}),
      description: description.trim(),
      amenities,
      media,
      ...(category ? { category } : {}),
      ...(currency ? { currency } : {}),
      ...(Object.keys(canonicalFields).length ? { canonicalFields } : {}),
      coordinates:
        latProvided && lngProvided
          ? { lat: Number(coordinatesLat), lng: Number(coordinatesLng) }
          : undefined,
      bedrooms: isCommercial || bedrooms.trim() === '' ? undefined : Number(bedrooms),
      bathrooms: isCommercial || bathrooms.trim() === '' ? undefined : Number(bathrooms),
      ...(completionStage ? { completionStage } : {}),
      ...(priceChanged && priceChangeReason.trim() ? { priceChangeReason: priceChangeReason.trim().slice(0, 500) } : {}),
      ...(mode === 'create' && projectId ? {
        projectId,
        projectUnit: {
          unitName: unitName.trim() || undefined,
          unitNumber: unitNumber.trim() || undefined,
          block: block.trim() || undefined,
          phase: phase.trim() || undefined,
          floor: floor.trim() || undefined,
          plotNumber: plotNumber.trim() || undefined,
        },
      } : {}),
      ...(listingType ? { listingType } : {}),
      ...(listingType === 'off_plan' && (mode === 'create' || offPlanTouched) ? {
        offPlan: {
          developmentStatus,
          constructionProgress: Number(constructionProgress || 0),
          expectedCompletionDate: expectedCompletionDate || undefined,
          constructionStartDate: constructionStartDate || undefined,
          handoverDate: handoverDate || undefined,
          reservationAmount: reservationAmount ? Number(reservationAmount) : undefined,
          minimumInitialDeposit: minimumInitialDeposit ? Number(minimumInitialDeposit) : undefined,
          installmentAvailable: offPlanInstallmentAvailable,
          installmentDurationMonths: installmentDurationMonths ? Number(installmentDurationMonths) : undefined,
          paymentPlanDescription: paymentPlanDescription.trim() || undefined,
          paymentMilestones: milestones,
          totalUnitsPlanned: totalUnitsPlanned ? Number(totalUnitsPlanned) : undefined,
          unitsAvailable: unitsAvailable ? Number(unitsAvailable) : undefined,
          unitType: unitType.trim() || undefined,
          floorPlanAvailable,
          showUnitAvailable,
          developerGuaranteeInformation: developerGuaranteeInformation.trim() || undefined,
          refundPolicy: refundPolicy.trim() || undefined,
          riskDisclosure: riskDisclosure.trim() || undefined,
        },
      } : {}),
    };
    if (latProvided !== lngProvided) {
      setErrors({
        coordinatesLat: latProvided ? '' : 'Latitude is required when longitude is provided',
        coordinatesLng: lngProvided ? '' : 'Longitude is required when latitude is provided',
      });
      return;
    }
    const errs = { ...validate(basePayload, mode, Boolean(initialData?.paymentTypes?.length)), ...validateStructuredFacts(basePayload.structuredFacts) };
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});

    let titleDocuments: TitleDocumentUploadMetadata[] | undefined;
    if (mode === 'create' && titleDocumentRows.length > 0) {
      const duplicateTypes = titleDocumentRows.filter(
        (row, index, rows) => rows.findIndex((candidate) => candidate.documentType === row.documentType) !== index,
      );
      if (duplicateTypes.length > 0) {
        setErrors((current) => ({ ...current, titleDocuments: 'Each active title document must use a different type.' }));
        return;
      }
      if (titleDocumentRows.some((row) => !row.file)) {
        setErrors((current) => ({ ...current, titleDocuments: 'Choose a file for every title document row.' }));
        return;
      }

      setUploadingTitleDocument(true);
      try {
        const stagedRows: TitleDocumentRow[] = [];
        for (const row of titleDocumentRows) {
          if (row.assetId && row.expiresAt && new Date(row.expiresAt).getTime() > Date.now()) {
            stagedRows.push(row);
            continue;
          }
          setTitleDocumentRows((current) =>
            current.map((item) => item.key === row.key ? { ...item, status: 'uploading', progress: 0, error: undefined } : item),
          );
          try {
            const upload = await documentService.uploadTitleAsset(row.file!, (progress) => {
              setTitleDocumentRows((current) =>
                current.map((item) => item.key === row.key ? { ...item, progress } : item),
              );
            });
            const asset = upload.titleDocumentAsset;
            const staged = { ...row, assetId: asset.assetId, expiresAt: asset.expiresAt, status: 'staged' as const, progress: 100 };
            stagedRows.push(staged);
            setTitleDocumentRows((current) => current.map((item) => item.key === row.key ? staged : item));
          } catch (raw) {
            const message = raw instanceof Error ? raw.message : 'Unable to stage this title document.';
            setTitleDocumentRows((current) =>
              current.map((item) => item.key === row.key ? { ...item, status: 'failed', error: message } : item),
            );
            throw raw;
          }
        }
        titleDocuments = stagedRows.map((row) => ({
          assetId: row.assetId!,
          title: row.title.trim() || documentTypeLabel(row.documentType),
          documentType: row.documentType,
          accessPolicy: { enabled: row.mode !== 'private', mode: row.mode },
        }));
      } catch (raw) {
        const message = raw instanceof Error ? raw.message : 'Unable to upload title document.';
        toast.error(`${message} Retry the affected title document; ordinary property details have been retained.`);
        setUploadingTitleDocument(false);
        return;
      }
      setUploadingTitleDocument(false);
    }

    const payload = titleDocuments ? { ...basePayload, titleDocuments } : basePayload;
    setSubmitting(true);
    try {
      const savedProperty = await onSubmit(payload);
      if (savedProperty?.paymentTypes) {
        setPaymentTypes(normalizePaymentTypesForForm(savedProperty.price, savedProperty.paymentTypes));
      }
      setTitleDocumentRows([]);
    } catch (raw) {
      const message = raw instanceof Error ? raw.message : 'Unable to create the property.';
      if (raw instanceof ApiRequestError && raw.fieldErrors?.length) {
        const serverErrors: Record<string, string> = {};
        for (const item of raw.fieldErrors) {
          if (!item.path || !item.msg) continue;
          serverErrors[item.path.replace(/^canonicalFields\./, '')] = item.msg;
        }
        setErrors((current) => ({ ...current, ...serverErrors }));
      }
      if (
        raw instanceof ApiRequestError &&
        (
          raw.fieldErrors?.some((item) => item.path?.startsWith('paymentTypes')) ||
          /payment type/i.test(message)
        )
      ) {
        const fieldMessage = raw.fieldErrors
          ?.find((item) => item.path?.startsWith('paymentTypes'))
          ?.msg;
        setErrors((current) => ({ ...current, paymentTypes: fieldMessage || message }));
      }
      if (
        raw instanceof ApiRequestError &&
        raw.status === 409 &&
        /\b(asset|expired|consumed)\b/i.test(message)
      ) {
        setTitleDocumentRows((current) => current.map((row) => ({
          ...row,
          assetId: undefined,
          expiresAt: undefined,
          status: 'failed',
          error: 'This staged asset expired or was already consumed. Select the file again to create a fresh private asset.',
        })));
      }
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const updateMilestone = (index: number, patch: Partial<OffPlanPaymentMilestone>) => {
    setMilestones((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item));
  };

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-8" style={{ fontFamily: 'Inter, sans-serif' }}>
      <div className="bg-white rounded-2xl p-6 space-y-5 border border-outline-variant/10">
        <h2 className="text-base font-black text-on-surface tracking-tight" style={{ fontFamily: 'Manrope, sans-serif' }}>
          Property Details
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="md:col-span-2">
            <label className={labelClass}>Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. 3 Bedroom Flat in Lekki"
              className={inputClass}
            />
            {errors.title && <p className={errorClass}>{errors.title}</p>}
          </div>

          <div>
            <label className={labelClass}>Property Type</label>
            <select value={propertyType} onChange={(e) => setPropertyType(e.target.value)} className={inputClass}>
              {propertyType && !propertyTypeOptions.includes(propertyType) ? <option value={propertyType}>{propertyType}</option> : null}
              {propertyTypeOptions.map((t) => (
                <option key={t} value={t} className="capitalize">
                  {t.replace('_', ' ')}
                </option>
              ))}
            </select>
            {errors.propertyType && <p className={errorClass}>{errors.propertyType}</p>}
          </div>

          <div>
            <label className={labelClass}>Category</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputClass}>
              {mode === 'edit' ? <option value="">Unanswered</option> : null}
              {category && !categoryOptions.includes(category) ? <option value={category}>{category.replaceAll('_', ' ')}</option> : null}
              {categoryOptions.map((option) => (
                <option key={option} value={option}>
                  {option.replace('_', ' ')}
                </option>
              ))}
            </select>
            {errors.category && <p className={errorClass}>{errors.category}</p>}
          </div>

          <div>
            <label className={labelClass}>Price</label>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="e.g. 15000000"
              min={0}
              className={inputClass}
            />
            {errors.price && <p className={errorClass}>{errors.price}</p>}
          </div>

          {priceChanged ? (
            <div>
              <label className={labelClass}>Reason for price change</label>
              <textarea
                value={priceChangeReason}
                onChange={(e) => setPriceChangeReason(e.target.value.slice(0, 500))}
                rows={3}
                maxLength={500}
                placeholder="Optional note for the price-history record"
                className={`${inputClass} resize-none`}
              />
              <p className="mt-1 text-xs text-secondary">{priceChangeReason.length}/500 characters</p>
              {errors.priceChangeReason && <p className={errorClass}>{errors.priceChangeReason}</p>}
            </div>
          ) : null}

          <div>
            <label className={labelClass}>Currency</label>
            <select value={currency} onChange={(e) => setCurrency(e.target.value)} className={inputClass}>
              {mode === 'edit' ? <option value="">Unanswered</option> : null}
              {CURRENCY_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            {errors.currency && <p className={errorClass}>{errors.currency}</p>}
          </div>

          <div className="md:col-span-2">
            <label className={labelClass}>Location</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Lekki, Lagos"
              className={inputClass}
            />
            {errors.location && <p className={errorClass}>{errors.location}</p>}
          </div>

          {!isCommercial ? <>
            <div>
              <label className={labelClass}>Bedrooms</label>
              <input type="number" value={bedrooms} onChange={(e) => setBedrooms(e.target.value)} min={0} className={inputClass} />
              {errors.bedrooms && <p className={errorClass}>{errors.bedrooms}</p>}
            </div>
            <div>
              <label className={labelClass}>Bathrooms</label>
              <input type="number" value={bathrooms} onChange={(e) => setBathrooms(e.target.value)} min={0} className={inputClass} />
              {errors.bathrooms && <p className={errorClass}>{errors.bathrooms}</p>}
            </div>
          </> : null}

          <div>
            <label className={labelClass}>Square Feet</label>
            <input
              type="number"
              value={squareFeet}
              onChange={(e) => setSquareFeet(e.target.value)}
              placeholder="e.g. 1200"
              min={0}
              className={inputClass}
            />
            {errors.squareFeet && <p className={errorClass}>{errors.squareFeet}</p>}
          </div>

          <div>
            <label className={labelClass}>Completion Stage</label>
            <select value={completionStage} onChange={(e) => setCompletionStage(e.target.value)} className={inputClass}>
              {mode === 'edit' ? <option value="">Unanswered</option> : null}
              {completionStage && !STAGE_OPTIONS.includes(completionStage) ? <option value={completionStage}>{completionStage.replaceAll('_', ' ')}</option> : null}
              {STAGE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option.replace('_', ' ')}
                </option>
              ))}
            </select>
            {errors.completionStage && <p className={errorClass}>{errors.completionStage}</p>}
          </div>

          <div>
            <label className={labelClass}>Latitude</label>
            <input
              type="number"
              step="any"
              value={coordinatesLat}
              onChange={(e) => setCoordinatesLat(e.target.value)}
              placeholder="6.45"
              className={inputClass}
            />
            {errors.coordinatesLat && <p className={errorClass}>{errors.coordinatesLat}</p>}
          </div>

          <div>
            <label className={labelClass}>Longitude</label>
            <input
              type="number"
              step="any"
              value={coordinatesLng}
              onChange={(e) => setCoordinatesLng(e.target.value)}
              placeholder="3.39"
              className={inputClass}
            />
            {errors.coordinatesLng && <p className={errorClass}>{errors.coordinatesLng}</p>}
          </div>

          {mode === 'edit' && (
            <div>
              <label className={labelClass}>Current listing status</label>
              <p className="mt-1 rounded-lg bg-surface-container-low px-4 py-3 text-sm capitalize">{initialData?.status ?? 'Not returned'}</p>
              <p className="mt-1 text-xs text-secondary">Sale and publication state change through their authorized workflows.</p>
            </div>
          )}

          <div className="md:col-span-2">
            <label className={labelClass}>Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="Describe the property..."
              className={`${inputClass} resize-none`}
            />
            {errors.description && <p className={errorClass}>{errors.description}</p>}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 space-y-5 border border-outline-variant/10">
        <div>
          <h2 className="text-base font-black text-on-surface tracking-tight" style={{ fontFamily: 'Manrope, sans-serif' }}>Canonical address</h2>
          <p className="mt-1 text-xs text-secondary">An unanswered field stays unset. False and zero remain explicit values. Existing values are sent only when changed.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className={labelClass}>Gated estate</label>
            <select aria-label="Gated estate" value={gatedEstate} onChange={(e) => setGatedEstate(e.target.value)} className={inputClass}>
              <option value="">Unanswered</option><option value="true">Yes</option><option value="false">No</option>
            </select>
            {errors.gatedEstate && <p className={errorClass}>{errors.gatedEstate}</p>}
          </div>
          {gatedEstate === 'true' ? <>
            <div>
              <label className={labelClass}>Estate name</label>
              <input value={estateName} onChange={(e) => setEstateName(e.target.value)} className={inputClass} />
              {errors.estateName && <p className={errorClass}>{errors.estateName}</p>}
            </div>
            <div>
              <label className={labelClass}>Estate access street</label>
              <input value={estateAccessStreet} onChange={(e) => setEstateAccessStreet(e.target.value)} className={inputClass} />
              {errors.estateAccessStreet && <p className={errorClass}>{errors.estateAccessStreet}</p>}
            </div>
            <div>
              <label className={labelClass}>Estate internal street <span className="normal-case tracking-normal">(optional)</span></label>
              <input value={estateInternalStreet} onChange={(e) => setEstateInternalStreet(e.target.value)} className={inputClass} />
              {errors.estateInternalStreet && <p className={errorClass}>{errors.estateInternalStreet}</p>}
            </div>
            <div>
              <label className={labelClass}>Estate house or unit number</label>
              <input value={estateHouseUnitNumber} onChange={(e) => setEstateHouseUnitNumber(e.target.value)} className={inputClass} />
              {errors.estateHouseUnitNumber && <p className={errorClass}>{errors.estateHouseUnitNumber}</p>}
            </div>
          </> : gatedEstate === 'false' ? <>
            <div>
              <label className={labelClass}>Street address</label>
              <input value={streetAddress} onChange={(e) => setStreetAddress(e.target.value)} className={inputClass} />
              {errors.streetAddress && <p className={errorClass}>{errors.streetAddress}</p>}
            </div>
            <div>
              <label className={labelClass}>House number</label>
              <input value={houseNumber} onChange={(e) => setHouseNumber(e.target.value)} className={inputClass} />
              {errors.houseNumber && <p className={errorClass}>{errors.houseNumber}</p>}
            </div>
          </> : <p className="text-xs text-secondary md:col-span-2">Choose Yes or No to enter the corresponding address path.</p>}
          <div>
            <label className={labelClass}>Unit or flat number <span className="normal-case tracking-normal">(optional)</span></label>
            <input value={unitOrFlatNumber} onChange={(e) => setUnitOrFlatNumber(e.target.value)} className={inputClass} />
            {errors.unitOrFlatNumber && <p className={errorClass}>{errors.unitOrFlatNumber}</p>}
          </div>
        </div>
        {gatedEstate === 'true' && (!estateName.trim() || !estateAccessStreet.trim() || !estateHouseUnitNumber.trim()) ?
          <p className="text-xs text-amber-800">The estate address is incomplete for publication. The server decides draft acceptance and readiness.</p> : null}
        {gatedEstate === 'false' && (!streetAddress.trim() || !houseNumber.trim()) ?
          <p className="text-xs text-amber-800">The street address is incomplete for publication. The server decides draft acceptance and readiness.</p> : null}
        {mode === 'edit' ? <details className="rounded-lg bg-surface-container-low p-3 text-xs text-secondary">
          <summary className="cursor-pointer font-bold">Saved property values and source</summary>
          {initialCanonical ? <>
            <p className="mt-2">These values come from this property's canonical fields. A missing property value may inherit from its project or unit type; the owner response does not identify the effective source.</p>
            <dl className="mt-3 grid gap-2 sm:grid-cols-2">{savedCanonicalFields.map(([key, label]) => <div key={key}><dt className="font-semibold">{label}</dt><dd>{savedCanonicalValue(initialCanonical, key)}</dd></div>)}</dl>
          </> : <p className="mt-2">The owner response did not return canonical fields or effective provenance. Existing values are left unchanged unless you enter an explicit value.</p>}
        </details> : null}
      </div>

      {isCommercial ? <div className="bg-white rounded-2xl p-6 space-y-5 border border-outline-variant/10">
        <h2 className="text-base font-black text-on-surface tracking-tight" style={{ fontFamily: 'Manrope, sans-serif' }}>Commercial details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div><label className={labelClass}>Frontage (m)</label><input aria-label="Commercial frontage in metres" type="number" min={0} step="any" value={commercialFrontage} onChange={(e) => setCommercialFrontage(e.target.value)} className={inputClass} />{errors.commercialFrontage && <p className={errorClass}>{errors.commercialFrontage}</p>}</div>
          <div><label className={labelClass}>Floors or units</label><input type="number" min={0} step={1} value={commercialFloorsOrUnits} onChange={(e) => setCommercialFloorsOrUnits(e.target.value)} className={inputClass} />{errors.commercialFloorsOrUnits && <p className={errorClass}>{errors.commercialFloorsOrUnits}</p>}</div>
          <div><label className={labelClass}>Loading vehicle access</label><select value={loadingVehicleAccess} onChange={(e) => setLoadingVehicleAccess(e.target.value)} className={inputClass}><option value="">Unanswered</option><option value="true">Yes</option><option value="false">No</option></select>{errors.loadingVehicleAccess && <p className={errorClass}>{errors.loadingVehicleAccess}</p>}</div>
          {loadingVehicleAccess === 'true' ? <div><label className={labelClass}>Loading access type</label><input value={loadingVehicleAccessType} onChange={(e) => setLoadingVehicleAccessType(e.target.value)} className={inputClass} />{errors.loadingVehicleAccessType && <p className={errorClass}>{errors.loadingVehicleAccessType}</p>}</div> : null}
          <div><label className={labelClass}>Lift count</label><input type="number" min={0} step={1} value={liftCount} onChange={(e) => setLiftCount(e.target.value)} className={inputClass} />{errors.liftCount && <p className={errorClass}>{errors.liftCount}</p>}</div>
          <div><label className={labelClass}>Fit-out</label><select value={fitOut} onChange={(e) => setFitOut(e.target.value)} className={inputClass}><option value="">Unanswered</option><option value="Shell & core">Shell &amp; core</option><option value="Partly fitted">Partly fitted</option><option value="Fully fitted">Fully fitted</option></select>{errors.fitOut && <p className={errorClass}>{errors.fitOut}</p>}</div>
        </div>
      </div> : null}

      <div className="bg-white rounded-2xl p-6 space-y-5 border border-outline-variant/10">
        <h2 className="text-base font-black text-on-surface tracking-tight" style={{ fontFamily: 'Manrope, sans-serif' }}>
          Project and listing mode
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label htmlFor="property-listing-type" className={labelClass}>Listing type</label>
            <select id="property-listing-type" value={listingType} onChange={(event) => { setListingType(event.target.value as ListingType | ''); setOffPlanTouched(true); }} className={inputClass}>
              {mode === 'edit' ? <option value="">Unanswered</option> : null}
              {LISTING_TYPE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="property-project" className={labelClass}>Project</label>
            <select id="property-project" value={projectId} onChange={(event) => setProjectId(event.target.value)} className={inputClass} disabled={projectsLoading}>
              <option value="">{projectsLoading ? 'Loading projects...' : 'Standalone property'}</option>
              {projects.map((project) => (
                <option key={project._id} value={project._id}>{project.name}</option>
              ))}
            </select>
          </div>
          {projectId ? (
            <>
              <div>
                <label htmlFor="property-project-unit-name" className={labelClass}>Unit name</label>
                <input id="property-project-unit-name" value={unitName} onChange={(event) => setUnitName(event.target.value)} placeholder="e.g. 3 Bedroom Terrace" className={inputClass} />
              </div>
              <div>
                <label htmlFor="property-project-unit-number" className={labelClass}>Unit number</label>
                <input id="property-project-unit-number" value={unitNumber} onChange={(event) => setUnitNumber(event.target.value)} placeholder="e.g. B12" className={inputClass} />
              </div>
              <div>
                <label htmlFor="property-project-phase" className={labelClass}>Phase</label>
                <input id="property-project-phase" value={phase} onChange={(event) => setPhase(event.target.value)} placeholder="e.g. Phase 1" className={inputClass} />
              </div>
              <div>
                <label htmlFor="property-project-block" className={labelClass}>Block</label>
                <input id="property-project-block" value={block} onChange={(event) => setBlock(event.target.value)} placeholder="e.g. Block B" className={inputClass} />
              </div>
              <div>
                <label htmlFor="property-project-floor" className={labelClass}>Floor</label>
                <input id="property-project-floor" value={floor} onChange={(event) => setFloor(event.target.value)} placeholder="e.g. 2" className={inputClass} />
              </div>
              <div>
                <label htmlFor="property-project-plot-number" className={labelClass}>Plot number</label>
                <input id="property-project-plot-number" value={plotNumber} onChange={(event) => setPlotNumber(event.target.value)} placeholder="e.g. Plot 14" className={inputClass} />
              </div>
            </>
          ) : null}
        </div>
      </div>

      {listingType === 'off_plan' ? (
        <div onChange={() => setOffPlanTouched(true)} className="bg-white rounded-2xl p-6 space-y-5 border border-outline-variant/10">
          <h2 className="text-base font-black text-on-surface tracking-tight" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Off-plan terms
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div>
              <label className={labelClass}>Development status</label>
              <select value={developmentStatus} onChange={(event) => setDevelopmentStatus(event.target.value as OffPlanDevelopmentStatus)} className={inputClass}>
                {DEVELOPMENT_STATUS_OPTIONS.map((option) => <option key={option} value={option}>{option.replaceAll('_', ' ')}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Progress %</label>
              <input type="number" min={0} max={100} value={constructionProgress} onChange={(event) => setConstructionProgress(event.target.value)} className={inputClass} />
              {errors.constructionProgress ? <p className={errorClass}>{errors.constructionProgress}</p> : null}
            </div>
            <div>
              <label className={labelClass}>Expected completion</label>
              <input type="date" value={expectedCompletionDate} onChange={(event) => setExpectedCompletionDate(event.target.value)} className={inputClass} />
              {errors.expectedCompletionDate ? <p className={errorClass}>{errors.expectedCompletionDate}</p> : null}
            </div>
            <div>
              <label className={labelClass}>Construction start</label>
              <input type="date" value={constructionStartDate} onChange={(event) => setConstructionStartDate(event.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Handover date</label>
              <input type="date" value={handoverDate} onChange={(event) => setHandoverDate(event.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Unit type</label>
              <input value={unitType} onChange={(event) => setUnitType(event.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Reservation amount</label>
              <input type="number" min={0} value={reservationAmount} onChange={(event) => setReservationAmount(event.target.value)} className={inputClass} />
              {errors.reservationAmount ? <p className={errorClass}>{errors.reservationAmount}</p> : null}
            </div>
            <div>
              <label className={labelClass}>Minimum deposit</label>
              <input type="number" min={0} value={minimumInitialDeposit} onChange={(event) => setMinimumInitialDeposit(event.target.value)} className={inputClass} />
              {errors.minimumInitialDeposit ? <p className={errorClass}>{errors.minimumInitialDeposit}</p> : null}
            </div>
            <div>
              <label className={labelClass}>Installment duration months</label>
              <input type="number" min={0} value={installmentDurationMonths} onChange={(event) => setInstallmentDurationMonths(event.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Total units planned</label>
              <input type="number" min={0} value={totalUnitsPlanned} onChange={(event) => setTotalUnitsPlanned(event.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Units available</label>
              <input type="number" min={0} value={unitsAvailable} onChange={(event) => setUnitsAvailable(event.target.value)} className={inputClass} />
              {errors.unitsAvailable ? <p className={errorClass}>{errors.unitsAvailable}</p> : null}
            </div>
            <label className="flex items-center gap-2 rounded-lg bg-surface-container-low px-4 py-3 text-sm font-bold">
              <input type="checkbox" checked={offPlanInstallmentAvailable} onChange={(event) => setOffPlanInstallmentAvailable(event.target.checked)} />
              Installment available
            </label>
            <label className="flex items-center gap-2 rounded-lg bg-surface-container-low px-4 py-3 text-sm font-bold">
              <input type="checkbox" checked={floorPlanAvailable} onChange={(event) => setFloorPlanAvailable(event.target.checked)} />
              Floor plan available
            </label>
            <label className="flex items-center gap-2 rounded-lg bg-surface-container-low px-4 py-3 text-sm font-bold">
              <input type="checkbox" checked={showUnitAvailable} onChange={(event) => setShowUnitAvailable(event.target.checked)} />
              Show unit availability
            </label>
            <textarea value={paymentPlanDescription} onChange={(event) => setPaymentPlanDescription(event.target.value)} rows={3} placeholder="Payment plan description" className={`${inputClass} md:col-span-3 resize-none`} />
            <textarea value={developerGuaranteeInformation} onChange={(event) => setDeveloperGuaranteeInformation(event.target.value)} rows={3} placeholder="Developer guarantee information" className={`${inputClass} md:col-span-3 resize-none`} />
            <textarea value={refundPolicy} onChange={(event) => setRefundPolicy(event.target.value)} rows={3} placeholder="Refund policy" className={`${inputClass} md:col-span-3 resize-none`} />
            <div className="md:col-span-3">
              <textarea value={riskDisclosure} onChange={(event) => setRiskDisclosure(event.target.value)} rows={4} placeholder="Risk disclosure (required)" className={`${inputClass} resize-none`} />
              {errors.riskDisclosure ? <p className={errorClass}>{errors.riskDisclosure}</p> : null}
            </div>
          </div>
          <div className="rounded-xl border border-outline-variant/10 p-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-black">Payment milestones</h3>
              <button type="button" onClick={() => { setOffPlanTouched(true); setMilestones((current) => [...current, { sequence: current.length + 1, title: '' }]); }} className="rounded-lg bg-surface-container-low px-3 py-2 text-xs font-bold">
                Add milestone
              </button>
            </div>
            <div className="mt-4 space-y-3">
              {milestones.map((milestone, index) => (
                <div key={index} className="grid gap-2 rounded-lg bg-surface-container-low p-3 md:grid-cols-5">
                  <input type="number" value={milestone.sequence} onChange={(event) => updateMilestone(index, { sequence: Number(event.target.value) })} className={inputClass} />
                  <input value={milestone.title ?? ''} onChange={(event) => updateMilestone(index, { title: event.target.value })} placeholder="Title" className={inputClass} />
                  <input type="number" value={milestone.percentage ?? ''} onChange={(event) => updateMilestone(index, { percentage: event.target.value ? Number(event.target.value) : undefined })} placeholder="%" className={inputClass} />
                  <input type="number" value={milestone.amount ?? ''} onChange={(event) => updateMilestone(index, { amount: event.target.value ? Number(event.target.value) : undefined })} placeholder="Amount" className={inputClass} />
                  <button type="button" onClick={() => { setOffPlanTouched(true); setMilestones((current) => current.filter((_, itemIndex) => itemIndex !== index)); }} className="rounded-lg bg-white px-3 py-2 text-xs font-bold text-error">
                    Remove
                  </button>
                </div>
              ))}
            </div>
            {errors.paymentMilestones ? <p className={errorClass}>{errors.paymentMilestones}</p> : null}
          </div>
        </div>
      ) : null}

      <StructuredFactsFields value={structuredFacts} onChange={(facts) => { setStructuredFacts(facts); setStructuredFactsTouched(true); }} errors={errors} sellerMode />

      <fieldset
        aria-describedby={errors.paymentTypes ? 'payment-types-error' : 'payment-types-help'}
        className="rounded-2xl border border-outline-variant/10 bg-white p-6"
      >
        <legend className="px-1 text-base font-black text-on-surface">Payment options</legend>
        <p id="payment-types-help" className="mt-1 text-xs text-secondary">
          Select every payment method buyers may use. Offering a method does not create or approve a payment plan.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {PROPERTY_PAYMENT_TYPE_ORDER.map((type) => {
            const checked = paymentTypes.includes(type);
            return (
              <label
                key={type}
                className={`flex items-start gap-3 rounded-xl border p-4 ${
                  checked ? 'border-primary bg-primary/5' : 'border-outline-variant/20'
                } cursor-pointer`}
              >
                <input
                  type="checkbox"
                  name="paymentTypes"
                  value={type}
                  checked={checked}
                  onChange={() => togglePaymentType(type)}
                  className="mt-1"
                />
                <span>
                  <span className="flex items-center gap-1.5 text-sm font-bold">
                    <span aria-hidden="true" className="material-symbols-outlined text-lg">{propertyPaymentTypeIcons[type]}</span>
                    {type === 'installment' ? 'Installment plan' : propertyPaymentTypeLabels[type]}
                  </span>
                  <span className="mt-1 block text-xs text-secondary">
                    {type === 'outright'
                      ? 'Buyer can use the approved outright checkout when available'
                      : type === 'installment'
                        ? 'Buyer can create an installment plan'
                        : 'Buyer can create a protected escrow'}
                  </span>
                </span>
              </label>
            );
          })}
        </div>
        {errors.paymentTypes ? <p id="payment-types-error" role="alert" className={errorClass}>{errors.paymentTypes}</p> : null}
      </fieldset>

      <div className="bg-white rounded-2xl p-6 space-y-4 border border-outline-variant/10">
        <h2 className="text-base font-black text-on-surface tracking-tight" style={{ fontFamily: 'Manrope, sans-serif' }}>
          Amenities
        </h2>

        <div className="flex gap-2">
          <input
            type="text"
            value={amenityInput}
            onChange={(e) => setAmenityInput(e.target.value)}
            onKeyDown={handleAmenityKey}
            placeholder="Type amenity and press Enter"
            className={`${inputClass} flex-1`}
          />
          <button
            type="button"
            onClick={addAmenity}
            className="px-4 py-3 rounded-lg bg-surface-container text-on-surface text-sm font-bold hover:bg-surface-container-high transition-colors"
          >
            Add
          </button>
        </div>

        {amenities.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {amenities.map((a) => (
              <span
                key={a}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container text-on-surface text-xs font-semibold"
              >
                {a}
                <button
                  type="button"
                  onClick={() => removeAmenity(a)}
                  className="text-on-surface-variant hover:text-error transition-colors"
                >
                  <span className="material-symbols-outlined text-xs">close</span>
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl p-6 space-y-4 border border-outline-variant/10">
        <h2 className="text-base font-black text-on-surface tracking-tight" style={{ fontFamily: 'Manrope, sans-serif' }}>
          Media
        </h2>
        <MediaUploader value={media} onChange={setMedia} error={errors.media} />
      </div>

      {mode === 'create' ? (
        <div className="bg-white rounded-2xl p-6 space-y-4 border border-outline-variant/10">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
            <h2 className="text-base font-black text-on-surface tracking-tight" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Private title documents
            </h2>
            <p className="mt-1 text-xs text-secondary">
              Add different document types to the private vault. They never become public property media.
            </p>
            </div>
            <button
              type="button"
              disabled
              title="Title asset upload requires an undocumented step-up challenge"
              onClick={() => setTitleDocumentRows((current) => [...current, createTitleDocumentRow()])}
              className="rounded-lg bg-primary px-4 py-2 text-xs font-bold text-on-primary disabled:cursor-not-allowed disabled:opacity-50"
            >
              Add document
            </button>
          </div>
          <p className="text-xs text-amber-800">Title-file upload requires a server step-up challenge that is not yet documented. You can save the ordinary listing details now.</p>
          {titleDocumentRows.length === 0 ? (
            <p className="rounded-xl border border-dashed border-outline-variant/20 p-5 text-sm text-secondary">
              Title documents are optional. You can add or resubmit them later from the property vault.
            </p>
          ) : null}
          {titleDocumentRows.map((row, index) => (
            <div key={row.key} className="rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-4">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm font-bold">Document {index + 1}</p>
                <button
                  type="button"
                  onClick={() => setTitleDocumentRows((current) => current.filter((item) => item.key !== row.key))}
                  className="text-xs font-bold text-error"
                >
                  Remove
                </button>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className={labelClass}>Document type</label>
                  <select
                    value={row.documentType}
                    onChange={(event) => {
                      const documentType = event.target.value as TitleDocumentType;
                      setTitleDocumentRows((current) => current.map((item) =>
                        item.key === row.key ? { ...item, documentType, title: documentTypeLabel(documentType) } : item,
                      ));
                    }}
                    className={inputClass}
                  >
                    {titleDocumentTypeOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Document title</label>
                  <input
                    value={row.title}
                    onChange={(event) => setTitleDocumentRows((current) => current.map((item) =>
                      item.key === row.key ? { ...item, title: event.target.value } : item,
                    ))}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Access</label>
                  <select
                    value={row.mode}
                    onChange={(event) => setTitleDocumentRows((current) => current.map((item) =>
                      item.key === row.key ? { ...item, mode: event.target.value as TitleDocumentPolicyMode } : item,
                    ))}
                    className={inputClass}
                  >
                    <option value="private">Private</option>
                    <option value="paid_view_once">Paid — one view</option>
                    <option value="paid_view_multiple">Paid — multiple views</option>
                  </select>
                  {row.mode !== 'private' ? <p className="mt-2 text-xs text-secondary">The server controls the current document-view price.</p> : null}
                </div>
                <div>
                  <label className={labelClass}>Restricted file</label>
                  <input
                    type="file"
                    accept={TITLE_DOCUMENT_ACCEPT}
                    onChange={(event) => {
                      const file = event.target.files?.[0] ?? null;
                      const fileError = file && file.size > MAX_TITLE_DOCUMENT_BYTES ? 'Maximum file size is 50 MB.' : undefined;
                      setTitleDocumentRows((current) => current.map((item) =>
                        item.key === row.key
                          ? { ...item, file: fileError ? null : file, assetId: undefined, expiresAt: undefined, status: fileError ? 'failed' : 'idle', progress: 0, error: fileError }
                          : item,
                      ));
                    }}
                    className={inputClass}
                  />
                </div>
              </div>
              {row.status === 'uploading' ? <p className="mt-3 text-xs text-secondary">Staging securely… {row.progress}%</p> : null}
              {row.status === 'staged' ? <p className="mt-3 text-xs font-semibold text-emerald-700">Securely staged until {new Date(row.expiresAt!).toLocaleString()}.</p> : null}
              {row.error ? <p className="mt-3 text-xs text-error">{row.error} Select the file again or submit to retry.</p> : null}
            </div>
          ))}
          {errors.titleDocuments ? <p className={errorClass}>{errors.titleDocuments}</p> : null}
          <p className="text-xs text-secondary">Accepted: PDF, JPEG, PNG, and WebP, up to 50 MB. A rejected document is resubmitted as a new version; verified history is retained.</p>
        </div>
      ) : null}

      <button
        type="submit"
        disabled={saving}
        className="w-full py-4 rounded-xl text-white font-bold text-sm tracking-tight hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed"
        style={{ background: 'linear-gradient(135deg, #000000 0%, #111c2d 100%)' }}
      >
        {saving ? 'Saving...' : submitLabel}
      </button>
    </form>
  );
};

export default PropertyForm;
