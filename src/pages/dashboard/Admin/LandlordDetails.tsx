import AdminLayout from '../../../components/layout/AdminLayout';

const LandlordDetails = () => {
  return (
    <AdminLayout>
      <div className="pt-8 pb-20 px-10">
        {/* Breadcrumb & Header */}
        <div className="mb-10 flex items-end justify-between">
          <div>
            <nav className="flex items-center gap-2 text-secondary text-sm mb-3 tracking-wide">
              <span>Admin</span>
              <span className="material-symbols-outlined text-sm">chevron_right</span>
              <span>Landlords</span>
              <span className="material-symbols-outlined text-sm">chevron_right</span>
              <span className="text-on-background font-medium">Alistair Beaumont</span>
            </nav>
            <h1 className="font-headline text-5xl font-extrabold tracking-tighter">Alistair Beaumont</h1>
            <p className="text-secondary mt-2 text-lg">Premier Portfolio Partner • Since 2018</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="px-6 py-3 bg-secondary-container text-on-secondary-fixed font-semibold rounded-lg hover:brightness-95 transition-all">
              Generate Report
            </button>
            <button className="px-8 py-3 bg-primary text-on-primary font-bold rounded-lg shadow-xl shadow-primary/10 hover:translate-y-[-2px] transition-all flex items-center gap-2">
              <span className="material-symbols-outlined text-lg">mail</span>
              Contact Landlord
            </button>
          </div>
        </div>

        {/* Bento Grid Layout */}
        <div className="grid grid-cols-12 gap-6 mb-12">
          {/* Landlord Info Card */}
          <div className="col-span-12 lg:col-span-4 bg-surface-container-lowest rounded-xl p-8 transition-all">
            <div className="flex items-center gap-6 mb-8">
              <div className="h-24 w-24 rounded-full overflow-hidden ring-4 ring-surface-container-low">
                <img
                  alt="Alistair Beaumont"
                  className="w-full h-full object-cover"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuAgAUE_OAy9peAcNySVhHTuqcdHTCQOSByRgqAPsDCcA5JDq8lKsRvJavuXeERcKZ5aow3-NEA83UDIs63EXs4fKmyty6-ghkt3WdNSXGcSQZkbsOU16c0MLG8G8riE0eKVhzVjgNh8sgIJJkqXcEpJuDPz-bcylmH1-d-kbX0lrycdMIS2yEWBF02oBr9MNg1TyNgh8P0hyM-1Yc_TDPXVvgKwJJFw9kf77HbZ2CN3bW3W8FYJd1vDbnSn-DtsWpNbnbQX0NRa7A"
                />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-bold text-xl">Alistair Beaumont</h3>
                  <span
                    className="material-symbols-outlined text-blue-500 text-sm"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    verified
                  </span>
                </div>
                <p className="text-secondary text-sm">Beaumont Estates Ltd.</p>
                <span className="inline-block mt-2 px-3 py-1 bg-secondary-fixed text-on-secondary-fixed text-[10px] font-bold uppercase tracking-wider rounded-full">
                  VIP Partner
                </span>
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded bg-surface-container-low flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-secondary">alternate_email</span>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-secondary uppercase tracking-widest mb-1">Email Address</p>
                  <p className="font-medium text-on-background">alistair@beaumontestates.co.uk</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded bg-surface-container-low flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-secondary">call</span>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-secondary uppercase tracking-widest mb-1">Phone Number</p>
                  <p className="font-medium text-on-background">+44 20 7946 0123</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded bg-surface-container-low flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-secondary">location_on</span>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-secondary uppercase tracking-widest mb-1">Office Location</p>
                  <p className="font-medium text-on-background">Mayfair, London, UK</p>
                </div>
              </div>
            </div>

            <div className="mt-10 pt-8 border-t border-slate-50">
              <h4 className="text-sm font-bold mb-4">Quick Actions</h4>
              <div className="grid grid-cols-2 gap-3">
                <button className="p-3 text-xs font-semibold bg-surface-container-low hover:bg-surface-container-high rounded transition-colors text-center">
                  Update Profile
                </button>
                <button className="p-3 text-xs font-semibold bg-surface-container-low hover:bg-surface-container-high rounded transition-colors text-center">
                  View Contracts
                </button>
              </div>
            </div>
          </div>

          {/* Performance Stats */}
          <div className="col-span-12 lg:col-span-8 space-y-6">
            <div className="grid grid-cols-3 gap-6">
              <div className="bg-primary-container text-on-primary-container p-8 rounded-xl relative overflow-hidden group">
                <div className="relative z-10">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-60 mb-2">Total Managed Value</p>
                  <h2 className="text-4xl font-extrabold text-white">£42.8M</h2>
                  <div className="mt-4 flex items-center gap-2 text-xs font-medium text-green-400">
                    <span className="material-symbols-outlined text-sm">trending_up</span>
                    12.4% from last year
                  </div>
                </div>
                <span className="material-symbols-outlined absolute -bottom-4 -right-4 text-9xl opacity-5 group-hover:scale-110 transition-transform duration-700">
                  account_balance_wallet
                </span>
              </div>
              <div className="bg-surface-container-lowest p-8 rounded-xl">
                <p className="text-[10px] font-bold text-secondary uppercase tracking-[0.2em] mb-2">Active Inquiries</p>
                <h2 className="text-4xl font-extrabold">142</h2>
                <div className="mt-4 flex items-center gap-2 text-xs font-medium text-secondary">
                  <span className="material-symbols-outlined text-sm">query_stats</span>
                  8 new in last 24h
                </div>
              </div>
              <div className="bg-surface-container-lowest p-8 rounded-xl">
                <p className="text-[10px] font-bold text-secondary uppercase tracking-[0.2em] mb-2">Sales Completed</p>
                <h2 className="text-4xl font-extrabold">18</h2>
                <div className="mt-4 flex items-center gap-2 text-xs font-medium text-secondary">
                  <span className="material-symbols-outlined text-sm">handshake</span>
                  Avg. close: 22 days
                </div>
              </div>
            </div>

            {/* Recent Activity Feed */}
            <div className="bg-surface-container-low rounded-xl p-8">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-bold">Activity Summary</h3>
                <button className="text-sm font-bold text-secondary hover:text-primary transition-colors">View All</button>
              </div>
              <div className="space-y-6">
                <div className="flex items-center gap-4 bg-surface-container-lowest p-4 rounded-lg shadow-sm">
                  <div className="h-10 w-10 rounded-full bg-green-50 text-green-600 flex items-center justify-center">
                    <span className="material-symbols-outlined text-xl">check_circle</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold">Sale Finalized: 14 Belgravia Square</p>
                    <p className="text-xs text-secondary">Agreement signed by tenant. Transaction completed.</p>
                  </div>
                  <span className="text-xs font-medium text-secondary">2 hours ago</span>
                </div>
                <div className="flex items-center gap-4 bg-surface-container-lowest/60 p-4 rounded-lg">
                  <div className="h-10 w-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                    <span className="material-symbols-outlined text-xl">add_comment</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold">New Inquiry: Kensington Penthouse</p>
                    <p className="text-xs text-secondary">High-intent buyer requested a private viewing.</p>
                  </div>
                  <span className="text-xs font-medium text-secondary">5 hours ago</span>
                </div>
                <div className="flex items-center gap-4 bg-surface-container-lowest/60 p-4 rounded-lg">
                  <div className="h-10 w-10 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
                    <span className="material-symbols-outlined text-xl">update</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold">Price Adjustment: Chelsea Studio</p>
                    <p className="text-xs text-secondary">List price updated to £1.2M following market trend.</p>
                  </div>
                  <span className="text-xs font-medium text-secondary">Yesterday</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Managed Properties Section */}
        <div className="space-y-8">
          <div className="flex items-end justify-between">
            <h2 className="text-3xl font-extrabold tracking-tight">Portfolio Overview</h2>
            <div className="flex items-center gap-4">
              <div className="flex bg-surface-container rounded-lg p-1">
                <button className="px-4 py-1.5 text-xs font-bold bg-white rounded-md shadow-sm">Grid</button>
                <button className="px-4 py-1.5 text-xs font-bold text-secondary">List</button>
              </div>
              <button className="flex items-center gap-2 px-4 py-1.5 text-xs font-bold bg-surface-container-low rounded-lg hover:bg-surface-container-high transition-colors">
                <span className="material-symbols-outlined text-sm">filter_list</span>
                Filters
              </button>
            </div>
          </div>

          {/* Property Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
            {/* Property Card 1 */}
            <div className="group bg-surface-container-lowest rounded-xl overflow-hidden hover:shadow-2xl hover:shadow-primary/5 transition-all duration-500">
              <div className="relative h-64 overflow-hidden">
                <img
                  alt="Belgravia Square"
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuC6a8T20OpELxzSDNQRMnGFGEH8Ei4gzKyQXB2w2ZB_N0rUp2Mx6gK4ey7MbS5EEI0ElpJf8wGm7jrV1Uhysco_KOvcQ3Z0DFCB6yf7Hoyv6NVtbiHOjhJ8aMDpW4z0CyIG8atYNIUryF2ZthCG-H4Vy8iQirEmsRPH12bwl4LUVDrSD-oypBRS4iAj3-i_Z4GNsOGQ0fRDxQj9BdeiI4v6ozDugbjzSSSFTnuZry87f3hKmGgoI6mnUvdeKGMaQqiHCG3MEZCcAw"
                />
                <div className="absolute top-4 left-4 flex gap-2">
                  <span className="px-3 py-1 bg-white/90 backdrop-blur text-[10px] font-bold uppercase rounded-full tracking-wider">For Sale</span>
                  <span className="px-3 py-1 bg-green-500 text-white text-[10px] font-bold uppercase rounded-full tracking-wider">Active</span>
                </div>
                <div className="absolute bottom-4 right-4 h-12 w-12 rounded-full bg-white/20 backdrop-blur flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="material-symbols-outlined">visibility</span>
                </div>
              </div>
              <div className="p-6">
                <h3 className="text-xl font-bold mb-1">14 Belgravia Square</h3>
                <p className="text-secondary text-sm mb-4">Belgravia, London SW1</p>
                <div className="flex items-center justify-between pt-4 border-t border-surface-container-low">
                  <div>
                    <p className="text-[10px] font-bold text-secondary uppercase tracking-widest">Price</p>
                    <p className="font-bold text-lg">£12,500,000</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-secondary uppercase tracking-widest">Yield</p>
                    <p className="font-bold text-lg">3.2%</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Property Card 2 */}
            <div className="group bg-surface-container-lowest rounded-xl overflow-hidden hover:shadow-2xl hover:shadow-primary/5 transition-all duration-500">
              <div className="relative h-64 overflow-hidden">
                <img
                  alt="The Chelsea Penthouse"
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuDK5r_O82Eq1otKY0lrCE3uGRGzXtxke_e3ycRAYMr8sbBj-5OvLOjvicML0G45ZHi0FkXyjmCAXn0bc1bx_bc53FzhNbzbpHFhesXwEGy6ohIDw3UGrWLEAGNKZEbCLa8JMP9cFiJq4VS94vNNnTPleir-CqVZRa_HDJ_O69A5i74kohqvWiDl5am3S7OdAOnPGh2gPo3KqL-sF3VMxZCDJSkkICQ-5M8Xq3P-IvpHl8ATdmrXzUP6Hj_YpuxmMmVVHlBkUjsuOg"
                />
                <div className="absolute top-4 left-4 flex gap-2">
                  <span className="px-3 py-1 bg-white/90 backdrop-blur text-[10px] font-bold uppercase rounded-full tracking-wider">Rental</span>
                  <span className="px-3 py-1 bg-secondary text-white text-[10px] font-bold uppercase rounded-full tracking-wider">Occupied</span>
                </div>
              </div>
              <div className="p-6">
                <h3 className="text-xl font-bold mb-1">The Chelsea Penthouse</h3>
                <p className="text-secondary text-sm mb-4">Cheyne Walk, Chelsea SW3</p>
                <div className="flex items-center justify-between pt-4 border-t border-surface-container-low">
                  <div>
                    <p className="text-[10px] font-bold text-secondary uppercase tracking-widest">Monthly Rent</p>
                    <p className="font-bold text-lg">£18,000</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-secondary uppercase tracking-widest">Term</p>
                    <p className="font-bold text-lg">24 Months</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Property Card 3 */}
            <div className="group bg-surface-container-lowest rounded-xl overflow-hidden hover:shadow-2xl hover:shadow-primary/5 transition-all duration-500">
              <div className="relative h-64 overflow-hidden">
                <img
                  alt="Knightsbridge Mews"
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuAtzpfvAL5yHfKBeiNqFbGZjR8leqVxBV8Vs9XCHNW_URtrlOxhR6aXzxVe51yVdAgks_CuZkvjEQs9hLWCD9PZMMEqNYlhM0qioqn_hxKbGtD73R8L_XOpM8n3-Dl_vIJlvvVQDCCZr546Af-_1sUAtF7TwNDZ0-58UwHiiXVLf3a-zKckw6U7RTmgvCfAkmjLSYTKKv7GmagTf5O2K1bkdF0sf3IUlz6nqLLnmxzE-e24hEqNVFThrsdzfSe5iy4_0aSsNAT1IQ"
                />
                <div className="absolute top-4 left-4 flex gap-2">
                  <span className="px-3 py-1 bg-white/90 backdrop-blur text-[10px] font-bold uppercase rounded-full tracking-wider">For Sale</span>
                  <span className="px-3 py-1 bg-amber-500 text-white text-[10px] font-bold uppercase rounded-full tracking-wider">Under Offer</span>
                </div>
              </div>
              <div className="p-6">
                <h3 className="text-xl font-bold mb-1">22 Knightsbridge Mews</h3>
                <p className="text-secondary text-sm mb-4">Knightsbridge, London SW1X</p>
                <div className="flex items-center justify-between pt-4 border-t border-surface-container-low">
                  <div>
                    <p className="text-[10px] font-bold text-secondary uppercase tracking-widest">Price</p>
                    <p className="font-bold text-lg">£4,250,000</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-secondary uppercase tracking-widest">Offer Status</p>
                    <p className="font-bold text-lg text-amber-600">Final Review</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="text-center pt-6">
            <button className="px-8 py-3 text-sm font-bold border border-outline-variant/30 rounded-lg hover:bg-surface-container-low transition-colors">
              View Entire Portfolio (12 Properties)
            </button>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default LandlordDetails;
