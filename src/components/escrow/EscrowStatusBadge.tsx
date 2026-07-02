import type { EscrowStatus } from "../../types/escrow";
import { ESCROW_STATUS } from "./escrowConfig";

const EscrowStatusBadge = ({ status }: { status: EscrowStatus }) => {
  const config = ESCROW_STATUS[status];
  const icon =
    status === "refunded" || status === "released"
      ? "check_circle"
      : status === "refund_failed" || status === "disputed"
        ? "error"
        : status === "refund_processing"
          ? "progress_activity"
          : status === "refund_pending"
            ? "currency_exchange"
            : status === "cancelled"
              ? "cancel"
              : "shield_lock";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${config.classes}`}
    >
      <span className="material-symbols-outlined text-sm" aria-hidden="true">
        {icon}
      </span>
      <span className="sr-only">Escrow status: </span>
      {config.label}
    </span>
  );
};
export default EscrowStatusBadge;
