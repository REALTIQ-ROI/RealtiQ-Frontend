import { useState } from 'react';
import AdminLayout from '../../../components/layout/AdminLayout';

const properties = [
  {
    id: 1,
    img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCDZ7s5bkSYp2_39AWAnd-TjWdnD29_nP1WAYIXUO8mjIMCZfLHHF65TieIu4Cg3TGolfg8zRYV_XrIAcOQ5lkwywJSZy97xXE1kbUg9ppDbPmmTbpBHhUyDrVIhsBmLtSwPl3yjY8e74PyUrTm9uJ5FfWDPAAOoIL5BBg4JhjOwrtopS75PB1Iir7v65TR1JgdC6mOI8hw5FPVvcRulFI-lE12ie_toJgbauYqsWibNe7CRDI691bhal_nx5XxiskJRns9-gPkXg',
    name: 'The Obsidian Glasshouse',
    address: '1022 Skyway Dr, Hollywood Hills',
    beds: 4,
    baths: 3,
    price: '$4.2M',
    defaultActive: true,
  },
  {
    id: 2,
    img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBMCJnbxGxBnrFJJbOV-i9xEhovb2JFZ1ElQWEq9bMPp4OOZ0nJotpYz9daV0pL5NtFHZ3EenZK2T7TfhkNOW2xOBkSoN9ekH_fYRhhE3ktmdRd_hLQ7JSywDFwZMXOnJQSi-x_eM2p1BRvBx96zP93o1iDLBCp9nIZ4VA_CisJbYzJtHN5IqrhkhBWAwO2BYiFbtjd4jkHHk-2D62JjZWOKrcVFd2mSKTvigtFI3Wzdq0Bh8sf8VH3nC9McWdu4qdLKR3YOI7fhg',
    name: 'The White Arches',
    address: '44 Desert Palm Estate, Scottsdale',
    beds: 5,
    baths: 5,
    price: '$2.8M',
    defaultActive: false,
  },
  {
    id: 3,
    img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD2d0Fp0BeebJVw6Osm3wQeyAeVxBYAqJCQKOOfVn2eBACnFfyGKbggUaB7pT0QqgnCbhWvJCEiaXat8YyunZAfF0m0XD1BoayewI5PPuc4UCXXiAV4fxTXfT_FFK6fqkP0nEMCWm3Von7CGOLHarN9H30PHTOcJETkhYpF3BIN_GvBX6b8iJQpn_WRl723dzBLg8QRutD3GBnmlcVDzDn6b5f8JCa_A4b6C02TuTcPQBSbevs3rgu7FMorKEDYSlWOO-7jjgxkmw',
    name: 'Iron & Silk Penthouse',
    address: 'Penthouse B, Tribeca, NYC',
    beds: 3,
    baths: 2,
    price: '$6.5M',
    defaultActive: true,
  },
  {
    id: 4,
    img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDkgKCPGKewVTC16GkyH0h3N2SFLAYasy-4cuHCNp-sbITHeksIqK-8Gei17HTmG8E0rfsUVJUHK-7v8uBBQ7yQkZ-A3-_EBy3s-USJkScdTNQVq707fxAP-Wq5YI8pYrNjaBNTk-_PwgIKaeeI6GweVujH0aFTtrrOe_gbQhKZg4oJWRui8HaM9Ybs3w7sjFEPWtxqSjoGKGXB4SJqbb8QT6hHDKfaNl-O_l-tSXvDnyF38EiGjBoGEG-th5vTJmhBGv4i5fIzxw',
    name: 'The Azure Coast Villa',
    address: '12 Cliffside Dr, Malibu',
    beds: 6,
    baths: 6,
    price: '$12.0M',
    defaultActive: false,
  },
];

const previewImgs = [
  'https://lh3.googleusercontent.com/aida-public/AB6AXuAPU9CSK-WYdoBSfkDFiEGye88Z5qmuBkIhMu8r60RKJDxqoNPNxLT8eT3x4u7lCs9NK3bfxaKWuqyMoVxSv6sSIparfcna3Dg3U4qQZ2gw-bUalb-GeeyTkIIKexv0p3sTvPKwFuJbDUgDJxIh1RCLrWfgUcUISZg-pmt12e-5-fg3GsJDsh_IDetnS8AYrEopumIsmDT2SKWLAhHwd1K0QFS81ZDuF-9T7PZfAJKswMAH_haXyqks0kEYSRPY-FbOFaTdN28YAg',
  'https://lh3.googleusercontent.com/aida-public/AB6AXuDbsnU81waV_gtdZPkniJlUgDuBugZ8wleQ7N6yUu5TGqufbigJtkNxFWjyK1bqmjTjCEehoICQPMwMtF39bTrM9N0zD6CJxpftr5l8gY-_yzorDB_ah4HDfKrtOYYGPFsIubPYGcZwk06J5dY1g955GZiA-f7BMREHZHdZeMK0vrRYcQEFJq4AxBjM4fY8pgsS0yFnD1aB0EJeVMgVQcRbjaYwP43wHyMRUCaaT-_19GOgBdJRg-dGGQTZzEwsD3Hx5kgL-uoFQQ',
];

const teamImgs = [
  'https://lh3.googleusercontent.com/aida-public/AB6AXuAOq_CttJPHAJ1m5-xjkdUPUoi9_xglgfmmT1pD2jpENYzj4s200xw0LowyCAi5NFZdELkR6wwybO456fR3rEit5Npl8WyTW3SHxD9oYskNiy1jyvFjHhKfA487EfopzaYocHA73P-PmNkkC0dvQmWOTHNh8BZLp8AlQ63kph4dlIdktoofiQSR4MC4SVKF6G5ZFvQP0ZtM8JH1YlhafdX3SiJV8ZQiL29VF8NcjDYKA8oLu79KRe4nwHRQ7r-Ai1WDQCZdPOTOfQ',
  'https://lh3.googleusercontent.com/aida-public/AB6AXuD55gPWbtuLC-He9GGWrq3JlpyfNFYSDlW3NmSALU9SBF97DLuT_osQIuGQm7VhRJmqTfIv6wnH2acOQWf7YMR_5hrDY89kqU1BkZzSmz_MotCqm1TLhiM8_1t-8u7Huc76a6OxjYJn45bWLU106ZtDpeVMmQ9vBBUQhsfNBwEC021-NcAj2UConiOq7uAV_Zp7AjxZESLSozBWeuGnK4Oz77D-owuXw6ka_QsG4bs3Xw54jDCbrkVSZnYIV1K7YCiCUVHExWakhg',
  'https://lh3.googleusercontent.com/aida-public/AB6AXuDZ0PjASixys-V0uPH6Wa2i3fNFlbGaMxlGJslTvb5GY2_zvA5xGMPfI2joqbcJ4xcpXjB3ARY1zHGYRe1fXo59KIQ0gcNh0LXdWgX91poJZXPrG0cBo7arhLHIMTlaIWUKYY3XT8Ef8gpSV_rZ4Ri_bLyo_wknGoeH9FdRfnAWSyOE1DpZwiIhqkGtva9wFcesxSADDGXV5B_3TSmUgyTHguQ69NNzE6X54A64mbPh57Jhrgap_Wna1JqOV9n8EVZx0ojgzbLcow',
];

const FeaturedListings = () => {
  const [activeStates, setActiveStates] = useState<Record<number, boolean>>(
    Object.fromEntries(properties.map((p) => [p.id, p.defaultActive]))
  );
  const [autoRotate, setAutoRotate] = useState(true);

  const toggleProperty = (id: number) => {
    setActiveStates((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <AdminLayout>
      <div className="min-h-screen">
        <div className="p-8 max-w-7xl mx-auto space-y-12">
          {/* Page Header */}
          <div className="flex flex-col gap-2">
            <span className="text-[10px] font-bold tracking-[0.2em] text-secondary uppercase">Management Portal</span>
            <div className="flex items-end justify-between">
              <h2 className="font-headline text-4xl font-extrabold tracking-tighter">Featured Listings Control</h2>
              <div className="flex items-center gap-3 bg-surface-container-low p-1.5 rounded-xl">
                <button className="px-4 py-2 bg-surface-container-lowest rounded-lg shadow-sm text-sm font-bold">
                  Manage Candidates
                </button>
                <button className="px-4 py-2 text-secondary text-sm font-medium hover:bg-white/50 rounded-lg transition-colors">
                  Global Settings
                </button>
              </div>
            </div>
          </div>

          {/* Dashboard Layout (Asymmetric Bento) */}
          <div className="grid grid-cols-12 gap-8">
            {/* Left Column: Featured Candidates List */}
            <div className="col-span-12 lg:col-span-7 space-y-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-headline text-xl font-bold">Featured Candidates</h3>
                <span className="text-xs text-secondary font-medium">Showing 14 available properties</span>
              </div>

              <div className="space-y-4">
                {properties.map((property) => {
                  const isActive = activeStates[property.id] ?? false;
                  return (
                    <div
                      key={property.id}
                      className={`bg-surface-container-lowest rounded-xl p-5 flex items-center gap-5 group transition-all ${
                        isActive ? 'hover:bg-white' : 'opacity-70 hover:opacity-100'
                      }`}
                    >
                      <div className="relative w-32 h-24 rounded-lg overflow-hidden flex-shrink-0">
                        <img className="w-full h-full object-cover" src={property.img} alt={property.name} />
                        {isActive && (
                          <div className="absolute top-2 left-2 bg-primary/80 backdrop-blur text-[8px] text-white px-2 py-0.5 rounded-full font-bold uppercase tracking-widest">
                            Active
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className={`font-headline font-bold text-lg truncate ${isActive ? '' : 'text-secondary'}`}>
                          {property.name}
                        </h4>
                        <p className="text-sm text-secondary truncate mb-2">{property.address}</p>
                        <div className="flex items-center gap-4">
                          <span className={`flex items-center gap-1 text-[11px] font-bold ${isActive ? 'text-primary' : 'text-secondary'}`}>
                            <span className="material-symbols-outlined text-sm">bed</span> {property.beds} Beds
                          </span>
                          <span className={`flex items-center gap-1 text-[11px] font-bold ${isActive ? 'text-primary' : 'text-secondary'}`}>
                            <span className="material-symbols-outlined text-sm">bathtub</span> {property.baths} Baths
                          </span>
                          <span
                            className={`text-[11px] font-bold text-secondary-fixed-variant px-2 py-0.5 rounded-full ${
                              isActive ? 'bg-secondary-fixed/30' : 'bg-surface-container-high'
                            }`}
                          >
                            {property.price}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-3">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={isActive}
                            onChange={() => toggleProperty(property.id)}
                          />
                          <div className="w-11 h-6 bg-surface-container-high peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary" />
                        </label>
                        <button className="text-slate-300 hover:text-primary transition-colors">
                          <span className="material-symbols-outlined">drag_indicator</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Column: Homepage Preview & Order */}
            <div className="col-span-12 lg:col-span-5 space-y-8">
              {/* Analytics Quick Look */}
              <div className="bg-primary-container text-on-primary rounded-xl p-8 flex items-center justify-between overflow-hidden relative">
                <div className="z-10">
                  <p className="text-[10px] uppercase tracking-widest font-bold text-primary-fixed-dim/70 mb-1">
                    Current Reach
                  </p>
                  <h4 className="font-headline text-3xl font-extrabold">+12.4%</h4>
                  <p className="text-xs text-on-primary-container">Engagement on featured listings this week</p>
                </div>
                <div className="material-symbols-outlined text-6xl opacity-10 absolute -right-4 -bottom-4 rotate-12">
                  trending_up
                </div>
              </div>

              {/* Preview Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-headline text-xl font-bold">Homepage Preview</h3>
                  <button className="text-[10px] font-bold text-primary flex items-center gap-1 group">
                    OPEN LIVE PREVIEW
                    <span className="material-symbols-outlined text-[14px] transition-transform group-hover:translate-x-1">
                      north_east
                    </span>
                  </button>
                </div>

                {/* Mock "Public" UI */}
                <div className="bg-surface-container-low rounded-xl p-1 border border-outline-variant/20 shadow-xl">
                  <div className="bg-white rounded-lg p-6 space-y-8">
                    {/* Header Mock */}
                    <div className="flex items-center justify-between border-b border-slate-50 pb-4">
                      <div className="w-16 h-4 bg-slate-100 rounded" />
                      <div className="flex gap-4">
                        <div className="w-8 h-2 bg-slate-50 rounded" />
                        <div className="w-8 h-2 bg-slate-50 rounded" />
                        <div className="w-8 h-2 bg-slate-50 rounded" />
                      </div>
                    </div>
                    {/* Featured Header Mock */}
                    <div className="space-y-2 text-center">
                      <p className="text-[8px] font-bold text-secondary uppercase tracking-[0.2em]">Curated Properties</p>
                      <h5 className="font-headline text-lg font-bold">Featured Selections</h5>
                    </div>
                    {/* The List Mock */}
                    <div className="grid grid-cols-2 gap-4">
                      {previewImgs.map((src, i) => (
                        <div key={i} className="space-y-2">
                          <div className="aspect-[4/5] bg-slate-100 rounded-lg overflow-hidden">
                            <img className="w-full h-full object-cover" src={src} alt="Property preview" />
                          </div>
                          <div className="w-3/4 h-2 bg-slate-200 rounded" />
                          <div className="w-1/2 h-1.5 bg-slate-100 rounded" />
                        </div>
                      ))}
                    </div>
                    {/* CTAs Mock */}
                    <div className="w-full h-10 bg-primary rounded-lg" />
                  </div>
                </div>
              </div>

              {/* Config Card */}
              <div className="bg-surface-container-high/40 rounded-xl p-6 border border-white/50 backdrop-blur-sm">
                <h4 className="font-headline font-bold mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">auto_awesome</span>
                  Smart Shuffle
                </h4>
                <p className="text-sm text-secondary mb-6 leading-relaxed">
                  Enable AI-driven reordering to prioritize listings based on visitor regional trends and recent views.
                </p>
                <div className="flex items-center justify-between p-3 bg-white/60 rounded-lg">
                  <span className="text-xs font-bold text-slate-700">Auto-Rotate Enabled</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={autoRotate}
                      onChange={() => setAutoRotate((v) => !v)}
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-secondary" />
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Section Controls */}
          <div className="mt-8 pt-8 border-t border-slate-200/50 flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="flex -space-x-3">
                {teamImgs.map((src, i) => (
                  <img
                    key={i}
                    alt="Team Member"
                    className="w-10 h-10 rounded-full border-4 border-background bg-slate-100"
                    src={src}
                  />
                ))}
                <div className="w-10 h-10 rounded-full border-4 border-background bg-surface-container flex items-center justify-center text-[10px] font-bold text-secondary">
                  +4
                </div>
              </div>
              <p className="text-sm text-secondary">
                Last modified by <span className="font-bold text-primary">Alex M.</span> 2 hours ago
              </p>
            </div>
            <div className="flex items-center gap-4">
              <button className="px-8 py-3 text-sm font-bold text-secondary hover:text-primary transition-colors">
                Discard Changes
              </button>
              <button className="px-10 py-3 bg-primary text-on-primary rounded-lg font-bold shadow-lg shadow-primary/10 hover:shadow-primary/20 transition-all active:scale-95">
                Publish Changes
              </button>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default FeaturedListings;
