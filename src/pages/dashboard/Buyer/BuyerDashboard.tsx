import { Link } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { useProperties } from '../../../contexts/PropertiesContext';
import { useAsync } from '../../../hooks/useAsync';
import { inquiryService } from '../../../services/inquiryService';
// import { paymentService } from '../../../services/paymentService';

const BuyerDashboard = () => {
  const { user, logout } = useAuth();
  const { properties } = useProperties();
  const { data: inquiries } = useAsync(() => inquiryService.getInquiries(), true);
  // const { data: payments } = useAsync(() => paymentService.getPayments(), true);

  const myProperties = properties.filter((item) => item.buyerId === user?._id);
  const myInquiries = (inquiries ?? []).filter((item) => item.userId === user?._id);
  // const myPayments = (payments ?? []).filter((item) => item.user?._id === user?._id);

  const featuredProperty = myProperties[0] ?? properties[0];

  return (
    <div className="bg-background text-on-background min-h-screen flex">
      <aside className="fixed left-0 top-0 h-full w-64 z-50 bg-white dark:bg-slate-900 border-r border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none flex flex-col py-6 gap-y-2">
        <div className="px-6 mb-10 flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-container rounded-lg flex items-center justify-center text-white">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
              architecture
            </span>
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">RealtiQ</h1>
            <p className="font-body text-[10px] text-slate-500 uppercase tracking-widest">Premium Real Estate</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1">
          <Link className="text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 rounded-lg mx-2 px-4 py-3 font-bold flex items-center gap-3 transition-all translate-x-1 duration-150" to="/dashboard/buyer">
            <span className="material-symbols-outlined">dashboard</span>
            <span className="text-[14px] font-headline">Dashboard</span>
          </Link>
          <Link className="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 px-4 py-3 mx-2 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all" to="/dashboard/buyer/my-properties">
            <span className="material-symbols-outlined">home_work</span>
            <span className="text-[14px] font-headline">My Properties</span>
          </Link>
          <Link className="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 px-4 py-3 mx-2 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all" to="/dashboard/buyer/payment-history">
            <span className="material-symbols-outlined">payments</span>
            <span className="text-[14px] font-headline">Payment History</span>
          </Link>
          <Link className="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 px-4 py-3 mx-2 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all" to="/dashboard/buyer/inquiry-history">
            <span className="material-symbols-outlined">forum</span>
            <span className="text-[14px] font-headline">Inquiry History</span>
          </Link>
          <Link className="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 px-4 py-3 mx-2 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all" to="/tools/roi-calculator">
            <span className="material-symbols-outlined">monitoring</span>
            <span className="text-[14px] font-headline">ROI Calculator</span>
          </Link>
          <Link className="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 px-4 py-3 mx-2 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all" to="/dashboard/buyer/profile-settings">
            <span className="material-symbols-outlined">settings</span>
            <span className="text-[14px] font-headline">Settings</span>
          </Link>
        </nav>

        <div className="mt-auto px-4 space-y-4">
          <button className="w-full bg-primary text-on-primary py-3 rounded-md font-headline text-sm font-bold tracking-tight hover:opacity-90 transition-opacity">
            Schedule Viewing
          </button>
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
            <button className="w-full text-left text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 px-2 py-2 flex items-center gap-3 text-[14px] font-headline">
              <span className="material-symbols-outlined">help</span>
              Help Center
            </button>
            <button className="w-full text-left text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 px-2 py-2 flex items-center gap-3 text-[14px] font-headline" onClick={logout}>
              <span className="material-symbols-outlined">logout</span>
              Logout
            </button>
          </div>
        </div>
      </aside>

      <main className="ml-64 flex-1 flex flex-col min-h-screen">
        <header className="fixed top-0 right-0 left-64 h-20 bg-slate-50/80 dark:bg-slate-950/80 backdrop-blur-xl z-40 flex justify-between items-center px-8">
          <div className="flex items-center flex-1 max-w-md">
            <div className="relative w-full">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline">search</span>
              <input className="w-full bg-surface-container-low border-none rounded-xl pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-surface-tint/20 transition-all" placeholder="Search portfolio, locations..." type="text" />
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <button className="p-2 text-slate-500 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 rounded-full transition-colors relative">
                <span className="material-symbols-outlined">notifications</span>
                <span className="absolute top-2 right-2 w-2 h-2 bg-error rounded-full border-2 border-white"></span>
              </button>
              <button className="p-2 text-slate-500 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 rounded-full transition-colors">
                <span className="material-symbols-outlined">mail</span>
              </button>
            </div>
            <div className="h-8 w-px bg-outline-variant/20"></div>
            <button className="text-sm font-label font-medium text-slate-900 dark:text-white hover:underline">Support</button>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-xs font-bold text-slate-900 dark:text-white leading-none">{user?.name ?? 'Alexander Pierce'}</p>
                <p className="text-[10px] text-slate-500 uppercase tracking-tighter">Gold Tier Member</p>
              </div>
              <img
                alt="User profile"
                className="w-10 h-10 rounded-full object-cover ring-2 ring-primary/5"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuBNTBoqa15z9iRsuvpyNcemQ4445huNchZPKGpEAlUMmm2zg3bQ8jkuAsD2GHR4dDjc-ui528DZ5E5HrqKttwOvwI-sOYwLWk5M0Yb0CBXYs5u8HTyw-SsMzT98MGqhS1rJeJSG5FL10HyxJSzzPkn0etgKxQs45VCsyhyWvGvSLhyq7W8fzvjQI9baH1eFZMBIdjo2wdk8OUn2Lzwhpg628zMzoj21-pIBPal7L3YxVGjrlRntwfgWF2kp4DTouCZdT4y18JOP0A"
              />
            </div>
          </div>
        </header>

        <div className="mt-20 p-8 flex flex-col gap-8">
          <section className="flex flex-col md:flex-row justify-between items-end gap-6">
            <div>
              <span className="text-xs font-label uppercase tracking-[0.2em] text-secondary font-bold mb-2 block">Executive Overview</span>
              <h2 className="text-4xl font-headline font-extrabold tracking-tighter text-on-surface">Welcome back, {user?.name?.split(' ')[0] ?? 'Alexander'}.</h2>
              {/* <p className="text-on-surface-variant max-w-xl mt-2 font-body text-sm leading-relaxed">
                Your portfolio has appreciated by <span className="text-primary font-bold">1.2%</span> this month. You have <span className="font-bold">{myInquiries.filter((item) => item.status === 'open').length} active inquiries</span> awaiting your review.
              </p> */}
              <p className="text-on-surface-variant max-w-xl mt-2 font-body text-sm leading-relaxed">
                You have <span className="font-bold">{myInquiries.filter((item) => item.status === 'open').length} active inquiries</span> awaiting your review.
              </p>
            </div>
            <div className="flex gap-3">
              {/* <button className="flex items-center gap-2 px-5 py-2.5 bg-surface-container-high rounded-lg text-sm font-headline font-bold text-on-surface hover:bg-surface-dim transition-colors">
                <span className="material-symbols-outlined text-[18px]">receipt_long</span>
                Tax Reports
              </button> */}
              <Link className="flex items-center gap-2 px-5 py-2.5 bg-primary text-on-primary rounded-lg text-sm font-headline font-bold hover:opacity-90 transition-opacity" to="/properties">
                {/* <span className="material-symbols-outlined text-[18px]">add</span> */}
                View Properties
              </Link>
              <Link className="flex items-center gap-2 px-5 py-2.5 bg-surface-container-high text-on-surface rounded-lg text-sm font-headline font-bold hover:bg-surface-dim transition-colors" to="/tools/roi-calculator">
                <span className="material-symbols-outlined text-[18px]">monitoring</span>
                ROI Calculator
              </Link>
            </div>
          </section>

          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-12 md:col-span-4 bg-surface-container-lowest p-8 rounded-xl flex flex-col justify-between min-h-[180px]">
              <div className="flex justify-between items-start">
                <p className="text-xs font-label uppercase tracking-widest text-secondary font-bold">Properties Owned</p>
                <span className="material-symbols-outlined text-primary-container">apartment</span>
              </div>
              <div>
                <div className="flex items-baseline gap-3">
                  <span className="text-5xl font-headline font-black tracking-tighter text-primary">{myProperties.length}</span>
                  <span className="text-xs font-bold text-on-secondary-container bg-secondary-fixed px-2 py-1 rounded-full">+{Math.min(myProperties.length, 2)} New</span>
                </div>
              </div>
            </div>

            {/* <div className="col-span-12 md:col-span-4 bg-primary-container p-8 rounded-xl flex flex-col justify-between min-h-[180px] text-white">
              <div className="flex justify-between items-start">
                <p className="text-xs font-label uppercase tracking-widest text-on-primary-container font-bold">Total Investment</p>
                <span className="material-symbols-outlined text-secondary-fixed-dim">account_balance_wallet</span>
              </div>
              <div>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-headline font-black tracking-tighter">${myPayments.reduce((sum, item) => sum + item.amount, 0).toLocaleString()}</span>
                </div>
                <p className="text-[10px] text-on-primary-container uppercase mt-2 tracking-widest">+12.4% Annual Growth</p>
              </div>
            </div> */}

            {/* <div className="col-span-12 md:col-span-4 row-span-2 bg-surface-container-low p-8 rounded-xl flex flex-col gap-6">
              <div>
                <h3 className="font-headline font-extrabold text-xl tracking-tight mb-1">Market Insights</h3>
                <p className="text-xs text-secondary font-body">Minimalist Brutalism in 2024</p>
              </div>
              <div className="h-32 w-full flex items-end gap-1.5 pt-4">
                <div className="flex-1 bg-primary/10 h-[40%] rounded-t-sm"></div>
                <div className="flex-1 bg-primary/10 h-[60%] rounded-t-sm"></div>
                <div className="flex-1 bg-primary/10 h-[50%] rounded-t-sm"></div>
                <div className="flex-1 bg-primary/10 h-[80%] rounded-t-sm"></div>
                <div className="flex-1 bg-primary h-[95%] rounded-t-sm"></div>
                <div className="flex-1 bg-primary/20 h-[70%] rounded-t-sm"></div>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-center py-2 border-b border-outline-variant/10">
                  <span className="text-sm font-medium text-on-surface-variant">Interest Rates</span>
                  <span className="text-sm font-black font-headline">4.2%</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-outline-variant/10">
                  <span className="text-sm font-medium text-on-surface-variant">Market Velocity</span>
                  <span className="text-xs font-bold text-white bg-primary px-3 py-1 rounded-full uppercase tracking-tighter">High</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm font-medium text-on-surface-variant">Investor Sentiment</span>
                  <span className="text-sm font-black font-headline">Bullish</span>
                </div>
              </div>
              <div className="mt-auto bg-white/50 p-4 rounded-lg border border-white">
                <p className="text-[11px] leading-relaxed italic text-secondary">"The shift toward utilitarian luxury in Zurich is driving yields up by 150bps." Portfolio AI</p>
              </div>
            </div> */}

            <div className="col-span-12 md:col-span-8 bg-surface-container-lowest p-8 rounded-xl flex flex-col gap-6">
              <div className="flex justify-between items-center">
                <h3 className="font-headline font-extrabold text-2xl tracking-tight">Recent Activity</h3>
                <button className="text-xs font-bold text-primary hover:underline">View All History</button>
              </div>

              <div className="space-y-2">
                {myProperties.slice(0, 1).map((property) => (
                  <div key={property._id} className="group flex items-center gap-6 p-5 hover:bg-surface-container-low transition-colors rounded-xl border border-transparent hover:border-outline-variant/10">
                    <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
                      <img className="w-full h-full object-cover" alt={property.title} src={property.media[0]?.url} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <h4 className="font-headline font-bold text-lg text-on-surface truncate">{property.title}</h4>
                        <span className="text-xs font-medium text-secondary">2 hours ago</span>
                      </div>
                      <p className="text-sm text-on-surface-variant mt-1">Acquisition finalized</p>
                    </div>
                    <div className="text-right">
                      <p className="font-headline font-black text-lg text-primary">${property.price.toLocaleString()}</p>
                      <span className="text-[10px] font-bold text-white bg-on-tertiary-fixed-variant px-2 py-0.5 rounded-sm uppercase tracking-tighter">Completed</span>
                    </div>
                  </div>
                ))}

                <div className="group flex items-center gap-6 p-5 hover:bg-surface-container-low transition-colors rounded-xl border border-transparent hover:border-outline-variant/10">
                  <div className="w-12 h-12 bg-secondary-fixed rounded-full flex items-center justify-center flex-shrink-0 text-on-secondary-fixed">
                    <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>update</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <h4 className="font-headline font-bold text-lg text-on-surface truncate">Inquiry Activity</h4>
                      <span className="text-xs font-medium text-secondary">5 hours ago</span>
                    </div>
                    <p className="text-sm text-on-surface-variant mt-1">{myInquiries.length} inquiry records in history</p>
                  </div>
                  <div className="text-right">
                    <span className="material-symbols-outlined text-outline">arrow_forward_ios</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <section className="grid grid-cols-12 gap-8 items-start">
            <div className="col-span-12 md:col-span-7">
              <h3 className="font-headline font-extrabold text-2xl tracking-tight mb-6">High-Yield Assets</h3>
              <div className="bg-surface-container-lowest rounded-xl overflow-hidden">
                <div className="relative h-64">
                  <img
                    alt={featuredProperty?.title ?? 'Luxury Villa'}
                    className="w-full h-full object-cover"
                    src={featuredProperty?.media[0]?.url ?? 'https://lh3.googleusercontent.com/aida-public/AB6AXuDg6rgKjon3g5M9QlnJvvi5u129U-vEk-G6BvOBy8TwbTZ06a1To-Winbb7PSeYTLB30oJd2BiYLLNaQ4HPb3MLek8uTuuO-5skeDxwgQbMcwgnswPmLjBYarbctgD78Z6ZFgUPHUWOZK9yrcYxxPLy-KYY0ZazIBUpgQOtGQODopAu0ArMTnToCuf8m-OM11LzDkidhrh9Y77jEUJbHDZAvr4rZUyN7Yn0-PXO0SBuoWrqjcJLehz6qXB825aD6ihECUVT9Dcgag'}
                  />
                  <div className="absolute top-4 left-4">
                    <span className="bg-primary/90 text-white text-[10px] font-bold px-3 py-1 uppercase tracking-widest backdrop-blur-md">Portfolio Leader</span>
                  </div>
                </div>
                <div className="p-8">
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-xs font-bold text-secondary uppercase tracking-[0.2em] mb-1">{featuredProperty?.location ?? 'Copenhagen, Denmark'}</p>
                      <h4 className="font-headline font-black text-2xl tracking-tight">{featuredProperty?.title ?? 'The Nordic Glass Pavilion'}</h4>
                    </div>
                    {/* <div className="text-right">
                      <p className="text-xs text-on-surface-variant">Annual Yield</p>
                      <p className="font-headline font-black text-2xl text-primary">6.8%</p>
                    </div> */}
                  </div>
                </div>
              </div>
            </div>

            {/* <div className="col-span-12 md:col-span-5 pt-0 md:pt-16">
              <div className="bg-secondary-container p-10 rounded-xl relative overflow-hidden group">
                <div className="relative z-10">
                  <h3 className="font-headline font-black text-3xl text-on-secondary-fixed leading-tight mb-4">Expanding to <br />Lake Como?</h3>
                  <p className="text-on-secondary-fixed-variant mb-8 text-sm leading-relaxed max-w-xs">We have identified three off-market villas matching your preference for Italian Rationalism.</p>
                  <button className="bg-on-secondary-fixed text-white px-6 py-3 rounded-md text-sm font-headline font-bold flex items-center gap-2">
                    Review Matching Assets
                    <span className="material-symbols-outlined">trending_flat</span>
                  </button>
                </div>
                <span className="material-symbols-outlined absolute -bottom-8 -right-8 text-[200px] text-on-secondary-fixed-variant/5 group-hover:scale-110 transition-transform duration-700">water</span>
              </div>
            </div> */}
          </section>
        </div>
      </main>
    </div>
  );
};

export default BuyerDashboard;
