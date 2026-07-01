import { useState, type ReactNode } from 'react';
import type { Property } from '../../../types';
import MobileMapListToggle, { type MapListView } from './MobileMapListToggle';
import PropertyMap from './PropertyMap';

interface Props {
  properties: Property[];
  detailsPath: (property: Property) => string;
  actions?: (property: Property) => ReactNode;
  children: ReactNode;
  mapClassName?: string;
}

const MapListLayout = ({ properties, detailsPath, actions, children, mapClassName = '' }: Props) => {
  const [mobileView, setMobileView] = useState<MapListView>('list');
  return (
    <div className="space-y-4">
      <MobileMapListToggle value={mobileView} onChange={setMobileView} />
      <div className="lg:grid lg:grid-cols-[minmax(360px,1fr)_minmax(0,1.15fr)] lg:gap-6 lg:items-start">
        <div className={`${mobileView === 'map' ? 'block' : 'hidden'} lg:block lg:sticky lg:top-4`}>
          <PropertyMap properties={properties} detailsPath={detailsPath} actions={actions} className={`lg:h-[calc(100vh-8rem)] ${mapClassName}`} />
        </div>
        <div className={`${mobileView === 'list' ? 'block' : 'hidden'} min-w-0 lg:block`}>{children}</div>
      </div>
    </div>
  );
};

export default MapListLayout;
