const LoadingState = ({ label = 'Loading...' }: { label?: string }) => {
  return (
    <div className="py-12 text-center text-secondary font-label">
      <span className="material-symbols-outlined animate-spin mr-2 align-middle">progress_activity</span>
      {label}
    </div>
  );
};

export default LoadingState;