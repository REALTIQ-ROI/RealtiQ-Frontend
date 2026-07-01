export type MapListView = 'map' | 'list';

const MobileMapListToggle = ({ value, onChange }: { value: MapListView; onChange: (value: MapListView) => void }) => (
  <div className="grid grid-cols-2 rounded-xl bg-surface-container-low p-1 lg:hidden" aria-label="Choose results view">
    {(['map', 'list'] as const).map((view) => (
      <button key={view} type="button" onClick={() => onChange(view)} className={`flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold capitalize ${value === view ? 'bg-white text-primary shadow-sm' : 'text-secondary'}`} aria-pressed={value === view}>
        <span className="material-symbols-outlined text-lg">{view === 'map' ? 'map' : 'view_list'}</span>{view} View
      </button>
    ))}
  </div>
);

export default MobileMapListToggle;
