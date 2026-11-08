import type { Property } from '../../types';
import { useCanonicalFieldDictionary } from '../../hooks/useCanonicalFieldDictionary';
import { effectiveCanonicalValue, fieldVocabularyLabel, formatCanonicalArea, vocabularyLabel } from '../../utils/propertyVocabulary';

const PropertyMeta = ({ property }: { property: Property }) => {
  const { dictionary } = useCanonicalFieldDictionary();
  const area = effectiveCanonicalValue(property, 'internalFloorArea');
  const fieldDisplay = (key: string, value: unknown): string => {
    if (value === undefined) return 'Not provided';
    if (value === null) return dictionary?.fields.find((field) => field.key === key)?.nullMeaning ?? 'Not applicable';
    if (typeof value === 'number' && Number.isFinite(value)) return value.toLocaleString();
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    return typeof value === 'string' ? value : 'Not provided';
  };
  const typeLabel = fieldVocabularyLabel(dictionary, 'propertyType', property.propertyType)
    ?? vocabularyLabel(dictionary, 'propertyTypes', property.propertyType)
    ?? property.propertyType;
  const categoryLabel = property.category
    ? vocabularyLabel(dictionary, 'categories', property.category) ?? property.category
    : 'Not provided';
  const stage = property.completionStage ?? effectiveCanonicalValue(property, 'buildStage');
  const stageLabel = fieldVocabularyLabel(dictionary, 'buildStage', stage)
    ?? (typeof stage === 'string' ? stage : 'Not provided');
  const currency = property.currency ?? effectiveCanonicalValue(property, 'currency');
  const currencyLabel = fieldVocabularyLabel(dictionary, 'currency', currency)
    ?? (typeof currency === 'string' ? currency : 'Not provided');

  return (
    <div className="flex flex-wrap gap-8 py-6 border-y border-outline-variant/20">
      <div>
        <p className="text-xs uppercase tracking-wider text-secondary">Bedrooms</p>
        <p className="font-bold">{fieldDisplay('bedrooms', property.bedrooms)}</p>
      </div>
      <div>
        <p className="text-xs uppercase tracking-wider text-secondary">Bathrooms</p>
        <p className="font-bold">{fieldDisplay('fullBathrooms', property.bathrooms)}</p>
      </div>
      <div>
        <p className="text-xs uppercase tracking-wider text-secondary">Internal floor area</p>
        <p className="font-bold">{formatCanonicalArea(area)}</p>
      </div>
      <div>
        <p className="text-xs uppercase tracking-wider text-secondary">Type</p>
        <p className="font-bold">{typeLabel}</p>
      </div>
      <div>
        <p className="text-xs uppercase tracking-wider text-secondary">Category</p>
        <p className="font-bold">{categoryLabel}</p>
      </div>
      <div>
        <p className="text-xs uppercase tracking-wider text-secondary">Stage</p>
        <p className="font-bold">{stageLabel}</p>
      </div>
      <div>
        <p className="text-xs uppercase tracking-wider text-secondary">Currency</p>
        <p className="font-bold">{currencyLabel}</p>
      </div>
      <div>
        <p className="text-xs uppercase tracking-wider text-secondary">Views</p>
        <p className="font-bold">{property.views ?? 'Not provided'}</p>
      </div>
      <div>
        <p className="text-xs uppercase tracking-wider text-secondary">Saves</p>
        <p className="font-bold">{property.saves ?? 'Not provided'}</p>
      </div>
    </div>
  );
};

export default PropertyMeta;
