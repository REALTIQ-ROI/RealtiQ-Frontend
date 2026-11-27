import { useFxDisplay } from '../../contexts/FxDisplayContext';
import { getPricePresentation } from '../../utils/fxDisplay';

interface Props {
  amount?: number | null;
  currency?: string | null;
  priceOnApplication?: boolean;
  className?: string;
  amountClassName?: string;
  detailClassName?: string;
}

const FxPriceDisplay = ({ amount, currency, priceOnApplication = false, className = '', amountClassName = '', detailClassName = '' }: Props) => {
  const { displayCurrency, officialRate } = useFxDisplay();
  if (priceOnApplication) return <span className={className}>Price on application</span>;
  if (typeof amount !== 'number' || !Number.isFinite(amount) || !currency) return <span className={className}>Price unavailable</span>;
  const price = getPricePresentation(amount, currency, displayCurrency, officialRate);
  return <span className={className}>
    <span className={amountClassName}>{price.displayText}</span>
    {price.converted ? <span className={`block text-xs font-medium text-secondary ${detailClassName}`}>Original listing price: {price.originalText}</span> : null}
    {price.conversionUnavailable ? <span className={`block text-xs font-medium text-secondary ${detailClassName}`}>Currency conversion is unavailable; showing the original listing price.</span> : null}
    {price.unsupportedCurrency ? <span className={`block text-xs font-medium text-secondary ${detailClassName}`}>Conversion is unavailable for {currency} prices.</span> : null}
  </span>;
};

export default FxPriceDisplay;
