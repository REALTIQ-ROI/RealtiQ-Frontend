import type { PropertyPaymentType } from '../../types';
import {
  propertyPaymentTypeIcons,
  propertyPaymentTypeLabels,
} from '../../utils/propertyPaymentTypes';

const PaymentTypeBadges = ({ paymentTypes }: { paymentTypes: PropertyPaymentType[] }) => (
  <div aria-label="Payment options" className="flex flex-wrap gap-2">
    {paymentTypes.map((type) => (
      <span
        key={type}
        className="inline-flex items-center gap-1 rounded-full bg-primary/5 px-2.5 py-1 text-[10px] font-bold text-primary"
      >
        <span aria-hidden="true" className="material-symbols-outlined text-sm">{propertyPaymentTypeIcons[type]}</span>
        {propertyPaymentTypeLabels[type]}
      </span>
    ))}
  </div>
);

export default PaymentTypeBadges;
