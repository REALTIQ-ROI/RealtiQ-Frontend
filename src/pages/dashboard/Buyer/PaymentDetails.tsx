import { Link } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { useProperties } from '../../../contexts/PropertiesContext';
import { useAsync } from '../../../hooks/useAsync';
import { paymentService } from '../../../services/paymentService';

const PaymentDetails = () => {
  const { user, logout } = useAuth();
  const { properties } = useProperties();
  const { data: payments } = useAsync(() => paymentService.getPayments(), true);

  const payment = (payments ?? []).find((item) => item.buyerId === user?._id) ?? (payments ?? [])[0];
  const property = properties.find((item) => item._id === payment?.propertyId);

  return (
    <div className="text-on-surface bg-[#f7f9fb]">
      <aside className="fixed left-0 top-0 h-screen w-64 z-50 bg-white flex flex-col p-6 gap-y-2 shadow-2xl shadow-slate-200/50">
        <div className="mb-8">
          <h2 className="text-2xl font-black text-slate-900">Curator</h2>
          <p className="text-xs tracking-widest uppercase text-slate-500 font-semibold">Premium Real Estate</p>
        </div>
        <nav className="flex-1 flex flex-col gap-y-1">
          <Link className="flex items-center gap-3 px-4 py-3 text-slate-500 hover:bg-slate-50 text-sm font-semibold" to="/dashboard/buyer"><span className="material-symbols-outlined">dashboard</span> Overview</Link>
          <Link className="flex items-center gap-3 px-4 py-3 text-slate-500 hover:bg-slate-50 text-sm font-semibold" to="/dashboard/buyer/my-properties"><span className="material-symbols-outlined">domain</span> My Properties</Link>
          <Link className="flex items-center gap-3 px-4 py-3 text-slate-900 bg-slate-100 rounded-md font-bold scale-98 transition-all text-sm" to="/dashboard/buyer/payment-history"><span className="material-symbols-outlined">payments</span> Payment History</Link>
          <Link className="flex items-center gap-3 px-4 py-3 text-slate-500 hover:bg-slate-50 text-sm font-semibold" to="/dashboard/buyer/inquiry-history"><span className="material-symbols-outlined">chat_bubble</span> Inquiry History</Link>
          <Link className="flex items-center gap-3 px-4 py-3 text-slate-500 hover:bg-slate-50 text-sm font-semibold" to="/dashboard/buyer/profile-settings"><span className="material-symbols-outlined">settings</span> Settings</Link>
        </nav>
        <div className="mt-auto flex flex-col gap-y-1">
          <button className="text-left flex items-center gap-3 px-4 py-2 text-slate-500 hover:text-slate-900 text-xs font-semibold uppercase tracking-wider"><span className="material-symbols-outlined text-sm">help</span> Help Center</button>
          <button className="text-left flex items-center gap-3 px-4 py-2 text-slate-500 hover:text-slate-900 text-xs font-semibold uppercase tracking-wider" onClick={logout}><span className="material-symbols-outlined text-sm">logout</span> Logout</button>
        </div>
      </aside>

      <header className="fixed top-0 w-full z-40 bg-slate-50/80 backdrop-blur-xl flex justify-between items-center px-8 h-16 ml-64">
        <div className="flex items-center gap-4"><span className="text-xl font-bold tracking-tighter text-slate-900">Architectural Curator</span></div>
        <div className="flex items-center gap-6">
          <div className="relative flex items-center bg-surface-container-low px-4 py-2 rounded-full w-64">
            <span className="material-symbols-outlined text-slate-400 mr-2 text-sm">search</span>
            <input className="bg-transparent border-none text-sm focus:ring-0 p-0 w-full" placeholder="Search transactions..." type="text" />
          </div>
          <div className="flex items-center gap-4 text-slate-500">
            <span className="material-symbols-outlined cursor-pointer hover:text-slate-900 transition-colors">notifications</span>
            <span className="material-symbols-outlined cursor-pointer hover:text-slate-900 transition-colors">mail</span>
            <div className="h-8 w-8 rounded-full overflow-hidden bg-slate-200"><img alt="User profile avatar" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCEmGtZe7qZKARcW2G2y7COD79No5cOU-LvzZBNE859za-KNhahuc2W-CLBX18ef0SFpY84kjauUVeWjTW__d0_8HImX2fohboV9vpq5zwaxKwYqY06dcmN7fkR7I-XMXE77Mel8lj48F4DjbpvavTshBUn3bnWItt8gw2kbGz92SfoSe7i92WPDxylKZjzL-_xzYICLKwxaWAHP4B7sEn9QLbJmIIPuWitAcCwsfON5HfzFqB4Zm0-EBdI72Q9TeE8LAkCN_JKyA" /></div>
          </div>
        </div>
      </header>

      <main className="ml-64 pt-24 pb-20 px-12 max-w-7xl mx-auto">
        <div className="mb-10 flex justify-between items-end">
          <div>
            <nav className="flex gap-2 text-xs font-semibold text-secondary mb-2 uppercase tracking-widest"><span>Payments</span><span>/</span><span className="text-on-surface">{payment?.id ?? 'TXN-000'}</span></nav>
            <h1 className="text-4xl font-extrabold tracking-tight text-primary">Transaction Receipt</h1>
          </div>
          <button className="flex items-center gap-2 bg-primary text-on-primary px-6 py-3 rounded-lg font-bold text-sm hover:opacity-90 transition-all active:scale-95 shadow-lg shadow-primary/10"><span className="material-symbols-outlined text-sm">download</span>Download PDF</button>
        </div>

        <div className="grid grid-cols-12 gap-8 items-start">
          <div className="col-span-8 bg-surface-container-lowest p-12 rounded-xl shadow-2xl shadow-slate-200/30 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-surface-container-low -mr-16 -mt-16 rounded-full opacity-50"></div>
            <div className="flex justify-between items-start mb-16 relative">
              <div>
                <div className="text-2xl font-black mb-1">RealtiQ <span className="text-secondary font-medium">| Curator</span></div>
                <p className="text-secondary text-sm">Transaction Reference: <span className="text-on-surface font-mono font-bold tracking-tight">{payment?.id ?? 'N/A'}</span></p>
              </div>
              <div className="text-right">
                <div className="bg-secondary-fixed text-on-secondary-fixed px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest inline-block mb-2">Processed</div>
                <p className="text-sm font-semibold text-on-surface">{payment ? new Date(payment.createdAt).toLocaleDateString() : '-'}</p>
                <p className="text-xs text-secondary">{payment ? new Date(payment.createdAt).toLocaleTimeString() : '-'}</p>
              </div>
            </div>

            <div className="flex gap-8 p-6 bg-surface-container-low rounded-xl mb-12">
              <div className="w-32 h-32 rounded-lg overflow-hidden flex-shrink-0"><img alt="Property thumbnail" src={property?.media[0]?.url} /></div>
              <div className="flex flex-col justify-center">
                <span className="text-[10px] uppercase font-bold tracking-widest text-secondary mb-1">Purchased Asset</span>
                <h3 className="text-xl font-bold mb-1">{property?.title ?? 'Property'}</h3>
                <p className="text-sm text-secondary mb-3">{property?.location ?? '-'}</p>
                <div className="flex gap-4">
                  <span className="flex items-center gap-1 text-xs font-semibold text-on-surface-variant"><span className="material-symbols-outlined text-sm">bed</span>{property?.bedrooms ?? 0} Beds</span>
                  <span className="flex items-center gap-1 text-xs font-semibold text-on-surface-variant"><span className="material-symbols-outlined text-sm">bathtub</span>{property?.bathrooms ?? 0} Baths</span>
                  <span className="flex items-center gap-1 text-xs font-semibold text-on-surface-variant"><span className="material-symbols-outlined text-sm">square_foot</span>{property?.squareFeet?.toLocaleString() ?? 0} sqft</span>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-12 pb-4 border-b border-surface-container-highest text-[10px] uppercase font-bold tracking-widest text-secondary"><div className="col-span-8">Description</div><div className="col-span-4 text-right">Amount (USD)</div></div>
              <div className="grid grid-cols-12 py-2"><div className="col-span-8"><div className="font-bold text-on-surface">Property Base Price</div></div><div className="col-span-4 text-right font-semibold">${property?.price?.toLocaleString()}.00</div></div>
              <div className="grid grid-cols-12 py-2"><div className="col-span-8"><div className="font-bold text-on-surface">Curator Platform Service Fee</div></div><div className="col-span-4 text-right font-semibold">$12,075.00</div></div>
              <div className="mt-8 pt-8 border-t-2 border-primary-container/10">
                <div className="grid grid-cols-12 mb-2"><div className="col-span-8 text-right pr-12 text-secondary font-semibold">Subtotal</div><div className="col-span-4 text-right font-semibold">${payment?.amount?.toLocaleString()}.00</div></div>
                <div className="grid grid-cols-12"><div className="col-span-8 text-right pr-12 flex flex-col justify-center"><span className="text-sm font-black uppercase tracking-widest">Total Amount Paid</span></div><div className="col-span-4 text-right text-3xl font-black tracking-tighter">${payment?.amount?.toLocaleString()}.00</div></div>
              </div>
            </div>
          </div>

          <div className="col-span-4 space-y-6">
            <div className="bg-white p-8 rounded-xl shadow-sm">
              <h4 className="text-xs font-black uppercase tracking-widest text-secondary mb-6">Payment Method</h4>
              <div className="flex items-center gap-4 p-4 bg-surface-container-low rounded-lg mb-4"><div className="w-12 h-8 bg-on-background rounded flex items-center justify-center"><span className="text-[10px] font-bold text-white tracking-widest">VISA</span></div><div><p className="text-sm font-bold">Infinite Preferred</p><p className="text-xs text-secondary">Ending in 9901</p></div></div>
              <div className="space-y-3"><div className="flex justify-between text-xs"><span className="text-secondary font-medium">Authorization Code</span><span className="font-mono font-bold">AUTH-99210-XC</span></div><div className="flex justify-between text-xs"><span className="text-secondary font-medium">Cardholder</span><span className="font-bold">Jonathan Sterling</span></div></div>
            </div>
            <div className="bg-primary-container p-8 rounded-xl text-on-primary-container">
              <div className="flex items-start gap-4 mb-6"><div className="bg-on-primary-container/20 p-2 rounded-lg"><span className="material-symbols-outlined text-secondary-fixed">verified_user</span></div><div><h4 className="text-sm font-bold text-white">Verified Transaction</h4><p className="text-xs opacity-70">Secured by RealtiQ Trust Engine</p></div></div>
              <button className="w-full bg-secondary-fixed text-on-secondary-fixed py-3 rounded-lg font-bold text-xs uppercase tracking-widest hover:opacity-90 transition-all">View Digital Deed</button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default PaymentDetails;