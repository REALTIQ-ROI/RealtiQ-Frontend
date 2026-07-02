import type { EscrowStatus } from '../../types/escrow';
import { ESCROW_STATUS } from './escrowConfig';

const EscrowStatusBadge = ({ status }: { status: EscrowStatus }) => {
  const config = ESCROW_STATUS[status];
  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${config.classes}`}><span className="sr-only">Escrow status: </span>{config.label}</span>;
};
export default EscrowStatusBadge;
