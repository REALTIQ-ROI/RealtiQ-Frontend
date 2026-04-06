import type { Property } from '../../types';

const PropertyGallery = ({ property }: { property: Property }) => {
  const [main, ...rest] = property.media;

  return (
    <div className="grid grid-cols-12 gap-4 h-[420px] md:h-[620px]">
      <div className="col-span-12 md:col-span-8 overflow-hidden rounded-xl bg-surface-container-low">
        <img src={main?.url} alt={property.title} className="w-full h-full object-cover" />
      </div>
      <div className="hidden md:flex md:col-span-4 flex-col gap-4">
        {rest.slice(0, 2).map((item) => (
          <div key={item.public_id} className="h-1/2 overflow-hidden rounded-xl bg-surface-container-low">
            <img src={item.url} alt={`${property.title} view`} className="w-full h-full object-cover" />
          </div>
        ))}
      </div>
    </div>
  );
};

export default PropertyGallery;