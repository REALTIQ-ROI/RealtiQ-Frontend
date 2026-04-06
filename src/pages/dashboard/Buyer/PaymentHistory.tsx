import { Link } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { useProperties } from '../../../contexts/PropertiesContext';
import { useAsync } from '../../../hooks/useAsync';
import { paymentService } from '../../../services/paymentService';

const PaymentHistory = () => {
  const { logout } = useAuth();
  const { properties } = useProperties();
  const { data: payments } = useAsync(() => paymentService.getPayments(), true);

  const myPayments = (payments ?? []).slice(0, 4);
  const totalInvested = myPayments.reduce((sum, item) => sum + item.amount, 0);
  const pendingCount = myPayments.filter((item) => item.status === 'pending').length;

  return (
    <div className="bg-surface text-on-background antialiased min-h-screen">
      <aside className="fixed left-0 top-0 h-screen w-64 z-50 bg-white dark:bg-slate-950 flex flex-col p-6 gap-y-2 shadow-2xl shadow-slate-200/50 dark:shadow-none">
        <div className="mb-8">
          <h1 className="text-2xl font-black text-slate-900">Curator</h1>
          <p className="text-xs font-semibold tracking-widest text-secondary uppercase opacity-60">Premium Real Estate</p>
        </div>
        <nav className="flex-1 space-y-1">
          <Link className="flex items-center gap-3 px-4 py-3 text-slate-500 hover:bg-slate-50 hover:translate-x-1 transition-transform duration-200 rounded-md text-sm font-semibold" to="/dashboard/buyer">
            <span className="material-symbols-outlined">dashboard</span><span>Overview</span>
          </Link>
          <Link className="flex items-center gap-3 px-4 py-3 text-slate-500 hover:bg-slate-50 hover:translate-x-1 transition-transform duration-200 rounded-md text-sm font-semibold" to="/dashboard/buyer/my-properties">
            <span className="material-symbols-outlined">domain</span><span>My Properties</span>
          </Link>
          <Link className="flex items-center gap-3 px-4 py-3 text-slate-900 bg-slate-100 rounded-md font-bold scale-98 transition-all text-sm" to="/dashboard/buyer/payment-history">
            <span className="material-symbols-outlined">payments</span><span>Payment History</span>
          </Link>
          <Link className="flex items-center gap-3 px-4 py-3 text-slate-500 hover:bg-slate-50 hover:translate-x-1 transition-transform duration-200 rounded-md text-sm font-semibold" to="/dashboard/buyer/inquiry-history">
            <span className="material-symbols-outlined">chat_bubble</span><span>Inquiry History</span>
          </Link>
          <Link className="flex items-center gap-3 px-4 py-3 text-slate-500 hover:bg-slate-50 hover:translate-x-1 transition-transform duration-200 rounded-md text-sm font-semibold" to="/dashboard/buyer/profile-settings">
            <span className="material-symbols-outlined">settings</span><span>Settings</span>
          </Link>
        </nav>
        <div className="mt-auto pt-6 border-t border-slate-100 space-y-1">
          <button className="w-full text-left flex items-center gap-3 px-4 py-3 text-slate-500 hover:bg-slate-50 hover:translate-x-1 transition-transform duration-200 text-sm font-semibold"><span className="material-symbols-outlined">help</span><span>Help Center</span></button>
          <button className="w-full text-left flex items-center gap-3 px-4 py-3 text-slate-500 hover:bg-slate-50 hover:translate-x-1 transition-transform duration-200 text-sm font-semibold" onClick={logout}><span className="material-symbols-outlined">logout</span><span>Logout</span></button>
        </div>
      </aside>

      <header className="fixed top-0 w-full z-40 bg-slate-50/80 backdrop-blur-xl flex justify-between items-center px-8 h-16 ml-64 max-w-[calc(100%-16rem)]">
        <div className="flex items-center gap-4 flex-1">
          <div className="relative w-full max-w-md">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</span>
            <input className="w-full bg-surface-container-low border-none rounded-lg pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-surface-tint/20" placeholder="Search transactions..." type="text" />
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex gap-4">
            <button className="text-slate-500 hover:text-slate-900 transition-colors relative"><span className="material-symbols-outlined">notifications</span><span className="absolute top-0 right-0 w-2 h-2 bg-error rounded-full border-2 border-white"></span></button>
            <button className="text-slate-500 hover:text-slate-900 transition-colors"><span className="material-symbols-outlined">mail</span></button>
          </div>
          <div className="h-8 w-px bg-slate-200"></div>
          <div className="flex items-center gap-3 cursor-pointer">
            <img alt="User profile avatar" className="w-8 h-8 rounded-full border border-slate-200" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCA_TYCmhZ79PYpIDN4vLYfhWrBKA2Zn43mvi-h27WlLwHKmD-CcG_YLOa22ETOfZSSK_TSs9FJ8Q4CYr5XBz4oH2b71EqRKJX-ekbABttWbcqVpOnfy3A7h-C-ZD-NTkTqcnwmFFkubgJ52R9_8eQO_FFYEdmRQQIgl3O6Qq15ZNEyfpQYi0TerezvVFhkevjnjbntXY3IXkPB1CCcvbig0qYzu0WVmSNRio57tZbxdwdPDOdb6trk7vYweLgHA6RRv7RFfjJeRA" />
            <span className="text-sm font-bold text-slate-900">Alex Sterling</span>
          </div>
        </div>
      </header>

      <main className="ml-64 pt-24 pb-12 px-12 min-h-screen">
        <div className="max-w-6xl mx-auto">
          <header className="mb-12">
            <div className="flex items-end justify-between mb-2">
              <h2 className="text-4xl font-extrabold tracking-tight text-primary">Payment History</h2>
              <p className="text-sm font-medium text-secondary tracking-widest uppercase">Transaction Records</p>
            </div>
            <div className="h-1 w-24 bg-primary"></div>
          </header>

          <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <div className="bg-surface-container-low p-8 rounded-xl">
              <p className="font-semibold text-secondary uppercase tracking-widest mb-2 text-xs">Total Invested</p>
              <h3 className="text-3xl font-bold text-primary">${totalInvested.toLocaleString()}</h3>
              <div className="mt-4 flex items-center gap-2 text-green-600 text-sm font-medium"><span className="material-symbols-outlined text-sm">trending_up</span><span>12.5% increase from last year</span></div>
            </div>
            <div className="bg-surface-container-low p-8 rounded-xl">
              <p className="font-semibold text-secondary uppercase tracking-widest mb-2 text-xs">Active Escrows</p>
              <h3 className="text-3xl font-bold text-primary">{pendingCount}</h3>
              <div className="mt-4 flex items-center gap-2 text-secondary text-sm font-medium"><span className="material-symbols-outlined text-sm">pending_actions</span><span>Totaling ${myPayments.filter((i) => i.status === 'pending').reduce((s, i) => s + i.amount, 0).toLocaleString()}</span></div>
            </div>
            <div className="bg-surface-container-low p-8 rounded-xl border border-dashed border-outline-variant/30">
              <p className="font-semibold text-secondary uppercase tracking-widest mb-2 text-xs">Pending Invoices</p>
              <h3 className="text-3xl font-bold text-primary">${myPayments.filter((i) => i.status !== 'paid').reduce((s, i) => s + i.amount, 0).toLocaleString()}</h3>
              <button className="mt-4 text-sm font-bold text-primary flex items-center gap-1 hover:gap-2 transition-all">Pay Now <span className="material-symbols-outlined text-sm">arrow_forward</span></button>
            </div>
          </section>

          <div className="bg-surface-container-lowest rounded-xl overflow-hidden">
            <div className="px-8 py-6 flex flex-col md:flex-row justify-between items-center gap-4 bg-surface-container-low/50">
              <div className="flex gap-2">
                <span className="px-4 py-2 bg-secondary-fixed text-on-secondary-fixed rounded-full text-xs font-bold cursor-pointer">All</span>
                <span className="px-4 py-2 bg-surface-container-high text-secondary rounded-full text-xs font-bold">Successful</span>
                <span className="px-4 py-2 bg-surface-container-high text-secondary rounded-full text-xs font-bold">Pending</span>
              </div>
              <button className="flex items-center gap-2 text-sm font-bold text-primary"><span className="material-symbols-outlined text-lg">filter_list</span>Advanced Filters</button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container-low/30">
                    <th className="px-8 py-5 text-xs font-bold text-secondary uppercase tracking-widest">Property Name</th>
                    <th className="px-8 py-5 text-xs font-bold text-secondary uppercase tracking-widest">Amount</th>
                    <th className="px-8 py-5 text-xs font-bold text-secondary uppercase tracking-widest">Date</th>
                    <th className="px-8 py-5 text-xs font-bold text-secondary uppercase tracking-widest">Status</th>
                    <th className="px-8 py-5 text-xs font-bold text-secondary uppercase tracking-widest"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-container">
                  {myPayments.map((item) => {
                    const property = properties.find((p) => p._id === item.propertyId);
                    const statusClass = item.status === 'paid' ? 'bg-green-100 text-green-700' : item.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700';
                    return (
                      <tr key={item.id} className="hover:bg-surface-container-low/20 transition-colors group">
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-4">
                            <div className="w-16 h-12 rounded bg-surface-container overflow-hidden flex-shrink-0">
                              <img className="w-full h-full object-cover" src={property?.media[0]?.url} alt={property?.title ?? 'Property'} />
                            </div>
                            <div>
                              <p className="font-bold text-primary">{property?.title ?? 'Property'}</p>
                              <p className="text-xs text-secondary">{property?.location ?? '-'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-6"><p className="font-bold text-primary">${item.amount.toLocaleString()}.00</p><p className="text-xs text-secondary">Settlement</p></td>
                        <td className="px-8 py-6"><p className="text-sm font-medium text-on-surface">{new Date(item.createdAt).toLocaleDateString()}</p><p className="text-xs text-secondary">{new Date(item.createdAt).toLocaleTimeString()}</p></td>
                        <td className="px-8 py-6"><span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${statusClass}`}>{item.status}</span></td>
                        <td className="px-8 py-6 text-right"><Link className="p-2 rounded hover:bg-surface-container transition-colors opacity-0 group-hover:opacity-100 inline-block" to="/dashboard/buyer/payment-details"><span className="material-symbols-outlined text-secondary">visibility</span></Link></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="px-8 py-6 flex justify-between items-center bg-surface-container-low/30">
              <p className="text-sm text-secondary font-medium">Showing {myPayments.length} of {(payments ?? []).length} transactions</p>
              <div className="flex gap-4">
                <button className="p-2 rounded bg-white border border-outline-variant/20 text-secondary hover:text-primary transition-colors"><span className="material-symbols-outlined">chevron_left</span></button>
                <button className="p-2 rounded bg-white border border-outline-variant/20 text-secondary hover:text-primary transition-colors"><span className="material-symbols-outlined">chevron_right</span></button>
              </div>
            </div>
          </div>

          <section className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div className="order-2 md:order-1">
              <span className="font-bold text-secondary tracking-widest uppercase block mb-4 text-xs">Security First</span>
              <h3 className="text-3xl font-black text-primary mb-6 leading-tight">Your financial data is protected by bank-grade encryption.</h3>
              <p className="text-on-surface-variant leading-relaxed mb-8">Every transaction through the Architectural Curator platform is monitored and verified.</p>
              <div className="flex items-center gap-4"><span className="material-symbols-outlined text-4xl text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>verified_user</span><div><p className="font-bold text-primary">PCI-DSS Compliant</p><p className="text-sm text-secondary">Secure payment processing standards</p></div></div>
            </div>
            <div className="order-1 md:order-2 bg-primary-container h-80 rounded-2xl flex items-center justify-center p-8 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-primary to-primary-container opacity-50"></div>
              <div className="relative z-10 text-center">
                <span className="material-symbols-outlined text-6xl text-surface mb-4" style={{ fontVariationSettings: "'FILL' 1" }}>account_balance_wallet</span>
                <h4 className="text-white text-xl font-bold mb-2">Architectural Credit</h4>
                <p className="text-on-primary-container text-sm max-w-xs mx-auto">Available balance for immediate viewings and deposits.</p>
                <button className="mt-6 px-6 py-3 bg-white text-primary font-bold rounded-lg text-sm hover:scale-105 transition-transform">Add Funds</button>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

export default PaymentHistory;