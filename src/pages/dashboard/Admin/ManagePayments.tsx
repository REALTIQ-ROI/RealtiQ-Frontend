import AdminLayout from '../../../components/layout/AdminLayout';
import { useAsync } from '../../../hooks/useAsync';
import { paymentService } from '../../../services/paymentService';

const statusColors: Record<string, string> = {
  successful: 'bg-emerald-50 text-emerald-600',
  pending: 'bg-amber-50 text-amber-600',
  failed: 'bg-rose-50 text-rose-600',
  completed: 'bg-emerald-50 text-emerald-600',
  refunded: 'bg-amber-50 text-amber-600',
};

const ManagePayments = () => {
  const { data: payments } = useAsync(() => paymentService.getPayments(), true);

  const staticRows = [
    {
      id: '#RTQ-99201',
      img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBgrwU81heRT_lsJidXpMVTNjDnuf3rvUXWXakN9o950D3fyhEkMCj_V3DvpBv9-1_v-2tZQXUcwxIHreUXfGykc7bbtiWa0if69GOfm9Bvt0MSVae2a9xTP_UjRI89BaE-Erc9OD64SdNPz0m9af77ItnUDYYCzG0BPMcRuiO5X4CrMnHgeUwylBxa-BFJWCLAf3uU09yPtcG6inex545XTMCL6hLObDtpSsbWwPLBzAiSgdcM5yLZvFdGVCnLOOXMfbY8iUJVug',
      name: 'Elysium Heights',
      location: 'Beverly Hills, CA',
      buyer: 'Julianne Sterling',
      date: 'Jun 14, 2024',
      amount: '$1,240,000.00',
      status: 'Successful',
      statusClass: 'bg-emerald-50 text-emerald-600',
    },
    {
      id: '#RTQ-99202',
      img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuArRnglCa2sIRWhvWcZHBhU-UIrn6t8L1JWbognYVzzcXjO4g5U5DF9RNMVdnNB4gDpr0r9nz3VJq4sSVdDlQe-x0WUr3fxiQSNkoAdLcshBeWkMUSDUl4mlG2Q2_0N9SEt9h_PqdlStoiFUjMVSkbPyZSJa9ppgXEGepEKMBzyWrfLXuliVcPwxtb_CUuwMSZgBu_4aP-r2FoVH-ATRTGl-8Ok9PwWEuGb4YgZCfCopGLGLF8VRuzyXXq9DHKXf27eDOAyM8qlhA',
      name: 'The Obsidian Tower',
      location: 'Upper West Side, NY',
      buyer: 'Vanguard Equities',
      date: 'Jun 12, 2024',
      amount: '$850,000.00',
      status: 'Pending',
      statusClass: 'bg-amber-50 text-amber-600',
    },
    {
      id: '#RTQ-99188',
      img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBrr3PRzIC_3qR8B97RaaLLHVrx4uREIgM0i-LZnMJUnAZ0VmanzcmySh-VCnGepIs8hN5Tn-2MWVR45eFQx4hFklxtynPeDku2hpx9oKC_Rzz-h8F63yb6OUV6ynsqa8CQv403sYU2vscGCTyICLRZgl0uFTGVPsRPSxLqqJ9uzN_49MO99VKOOZn2mwVY0KXBPTXmB3BVFVSKq80X1tKKlUZh-aNuVKnKFRsPgJpdpqZpqj3Sjae1kGaolnEMqQKUREtYPQBu-A',
      name: 'Azure Bay Estate',
      location: 'Miami Beach, FL',
      buyer: 'Marcus Thorne',
      date: 'Jun 10, 2024',
      amount: '$412,500.00',
      status: 'Failed',
      statusClass: 'bg-rose-50 text-rose-600',
    },
    {
      id: '#RTQ-99175',
      img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDAajihJGedu1prykapuPgDwlxrGTC19z2355NjWTuJQA1OejQoQbwGvJ9SGp9z4VD-c2nWP4utasZj3DX3JB9gycKaYDB9ioWvsX3hNu9RtSNPMHvxZTVXX3WJUkn8ULXKuvmucs5AVmu_FBJ_KPjr_t4GmwaJgzGY3U65IsHsYuhcBX70yajyK25eqQTICccEqZUBNcvv5716Tcq3X_p7HmEy0F3cRLSkl15ZMIkXjhjk1mQAHlPPy6bIzOHOak8FVPzZD23DzA',
      name: 'Nordic Pine Lodge',
      location: 'Aspen, CO',
      buyer: 'Elena Rossi',
      date: 'Jun 08, 2024',
      amount: '$120,400.00',
      status: 'Successful',
      statusClass: 'bg-emerald-50 text-emerald-600',
    },
  ];

  return (
    <AdminLayout>
      <div className="min-h-screen">
        <div className="p-8 max-w-7xl mx-auto">
          {/* Hero Summary Section */}
          <section className="mb-12 grid grid-cols-1 lg:grid-cols-12 gap-8 items-end">
            <div className="lg:col-span-7">
              <span className="text-[0.65rem] uppercase tracking-[0.2em] font-bold text-secondary mb-3 block">
                Financial Ledger
              </span>
              <h2 className="text-4xl font-extrabold tracking-tighter text-primary mb-4 leading-none">
                Payments Management
              </h2>
              <p className="text-secondary max-w-md leading-relaxed text-sm">
                Comprehensive overview of platform liquidity and individual asset performance. Monitor transaction
                health and distribution metrics in real-time.
              </p>
            </div>
            <div className="lg:col-span-5">
              <div className="bg-primary-container p-8 rounded-xl relative overflow-hidden">
                <div className="relative z-10">
                  <span className="text-on-primary-container/60 text-xs font-medium uppercase tracking-widest block mb-1">
                    Monthly Volume
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-white tracking-tighter">$2,482,900.00</span>
                    <span className="text-emerald-400 text-xs font-bold">+12.4%</span>
                  </div>
                  <div className="mt-6 flex gap-4">
                    <div className="flex-1">
                      <span className="text-[10px] text-on-primary-container uppercase block opacity-50">Successful</span>
                      <div className="h-1 bg-white/10 rounded-full mt-1 overflow-hidden">
                        <div className="h-full bg-white w-[94%]" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <span className="text-[10px] text-on-primary-container uppercase block opacity-50">Growth Target</span>
                      <div className="h-1 bg-white/10 rounded-full mt-1 overflow-hidden">
                        <div className="h-full bg-secondary-fixed w-[65%]" />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="absolute -right-12 -bottom-12 w-48 h-48 bg-white/5 rounded-full blur-3xl" />
              </div>
            </div>
          </section>

          {/* Filters & Actions */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-2">
              <button className="px-5 py-2.5 bg-surface-container-lowest text-primary text-xs font-bold rounded-full shadow-sm hover:bg-white transition-all">
                All Transactions
              </button>
              <button className="px-5 py-2.5 text-secondary text-xs font-medium hover:bg-surface-container-low rounded-full transition-all">
                Successful
              </button>
              <button className="px-5 py-2.5 text-secondary text-xs font-medium hover:bg-surface-container-low rounded-full transition-all">
                Pending
              </button>
              <button className="px-5 py-2.5 text-secondary text-xs font-medium hover:bg-surface-container-low rounded-full transition-all">
                Failed
              </button>
            </div>
            <div className="flex items-center gap-3">
              <button className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-100 rounded-lg text-xs font-semibold hover:shadow-sm transition-all">
                <span className="material-symbols-outlined text-sm">calendar_today</span>
                June 2024
              </button>
              <button className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-100 rounded-lg text-xs font-semibold hover:shadow-sm transition-all">
                <span className="material-symbols-outlined text-sm">download</span>
                Export CSV
              </button>
            </div>
          </div>

          {/* Transaction Ledger */}
          <div className="bg-surface-container-low rounded-xl overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-high/50">
                  <th className="px-6 py-4 text-[10px] font-bold text-secondary uppercase tracking-widest">Transaction ID</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-secondary uppercase tracking-widest">Property Asset</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-secondary uppercase tracking-widest">Buyer/Entity</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-secondary uppercase tracking-widest">Date</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-secondary uppercase tracking-widest">Amount</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-secondary uppercase tracking-widest">Status</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-secondary uppercase tracking-widest text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container">
                {(payments ?? []).length > 0
                  ? (payments ?? []).map((payment) => {
                      const statusKey = payment.status.toLowerCase();
                      const colorClass = statusColors[statusKey] ?? 'bg-surface-container text-secondary';
                      return (
                        <tr key={payment.id} className="hover:bg-surface-container-lowest transition-colors group">
                          <td className="px-6 py-5">
                            <span className="text-xs font-mono text-slate-400">#{payment.id.slice(0, 10).toUpperCase()}</span>
                          </td>
                          <td className="px-6 py-5">
                            <div className="text-sm font-bold text-primary">{payment.propertyId}</div>
                          </td>
                          <td className="px-6 py-5 text-sm font-medium text-primary">{payment.buyerId}</td>
                          <td className="px-6 py-5 text-sm text-secondary">—</td>
                          <td className="px-6 py-5 text-sm font-bold text-primary">${payment.amount.toLocaleString()}</td>
                          <td className="px-6 py-5">
                            <span className={`px-2.5 py-1 text-[10px] font-bold rounded-full uppercase ${colorClass}`}>
                              {payment.status}
                            </span>
                          </td>
                          <td className="px-6 py-5 text-right">
                            <button className="p-2 text-slate-300 hover:text-primary transition-colors">
                              <span className="material-symbols-outlined text-sm">more_vert</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  : staticRows.map((row) => (
                      <tr key={row.id} className="hover:bg-surface-container-lowest transition-colors group">
                        <td className="px-6 py-5">
                          <span className="text-xs font-mono text-slate-400">{row.id}</span>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-slate-200">
                              <img className="w-full h-full object-cover" src={row.img} alt={row.name} />
                            </div>
                            <div>
                              <div className="text-sm font-bold text-primary tracking-tight">{row.name}</div>
                              <div className="text-[10px] text-secondary">{row.location}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5 text-sm font-medium text-primary">{row.buyer}</td>
                        <td className="px-6 py-5 text-sm text-secondary">{row.date}</td>
                        <td className="px-6 py-5 text-sm font-bold text-primary">{row.amount}</td>
                        <td className="px-6 py-5">
                          <span className={`px-2.5 py-1 text-[10px] font-bold rounded-full uppercase ${row.statusClass}`}>
                            {row.status}
                          </span>
                        </td>
                        <td className="px-6 py-5 text-right">
                          <button className="p-2 text-slate-300 hover:text-primary transition-colors">
                            <span className="material-symbols-outlined text-sm">more_vert</span>
                          </button>
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>

            {/* Pagination Footer */}
            <div className="px-6 py-4 flex items-center justify-between bg-surface-container-high/20">
              <span className="text-xs text-secondary">
                Showing {(payments ?? []).length > 0 ? (payments ?? []).length : 4} of 128 transactions
              </span>
              <div className="flex gap-2">
                <button className="p-2 rounded-lg bg-white border border-slate-100 text-slate-400 hover:text-primary transition-all">
                  <span className="material-symbols-outlined text-sm">chevron_left</span>
                </button>
                <button className="p-2 rounded-lg bg-white border border-slate-100 text-slate-400 hover:text-primary transition-all">
                  <span className="material-symbols-outlined text-sm">chevron_right</span>
                </button>
              </div>
            </div>
          </div>

          {/* Insights Section */}
          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-surface-container-low p-6 rounded-xl border-l-4 border-slate-900">
              <h4 className="text-xs font-bold text-secondary uppercase tracking-[0.1em] mb-4">Pending Payouts</h4>
              <div className="text-2xl font-bold tracking-tight">$342,010.00</div>
              <div className="text-[10px] text-secondary mt-1">Due within next 48 hours</div>
            </div>
            <div className="bg-surface-container-low p-6 rounded-xl border-l-4 border-emerald-500">
              <h4 className="text-xs font-bold text-secondary uppercase tracking-[0.1em] mb-4">Platform Fee Revenue</h4>
              <div className="text-2xl font-bold tracking-tight">$98,124.50</div>
              <div className="text-[10px] text-emerald-600 mt-1 font-semibold">4.0% effective rate</div>
            </div>
            <div className="bg-surface-container-low p-6 rounded-xl border-l-4 border-rose-500">
              <h4 className="text-xs font-bold text-secondary uppercase tracking-[0.1em] mb-4">Churn Risk</h4>
              <div className="text-2xl font-bold tracking-tight">0.8%</div>
              <div className="text-[10px] text-rose-600 mt-1 font-semibold">-0.2% from last month</div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default ManagePayments;
