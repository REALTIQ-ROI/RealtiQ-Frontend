const LoadingState = ({ label = 'Loading...' }: { label?: string }) => {
  return (
    <div className="py-12 text-center text-secondary font-label">
      <LoaderCircle className="mr-2 inline-block h-5 w-5 animate-spin align-middle" aria-hidden="true" />
      {label}
    </div>
  );
};

export default LoadingState;
import { LoaderCircle } from 'lucide-react';
