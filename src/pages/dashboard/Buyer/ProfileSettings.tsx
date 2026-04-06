import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { userService } from '../../../services/userService';

const ProfileSettings = () => {
  const { user, logout } = useAuth();
  const [name, setName] = useState(user?.name ?? 'Alexander Sterling');
  const [email] = useState(user?.email ?? 'a.sterling@curator.com');
  const [phone, setPhone] = useState('+1 (555) 902-1240');
  const [saved, setSaved] = useState(false);

  const onSave = async () => {
    if (!user) return;
    await userService.updateUserName(user._id, name);
    localStorage.setItem('user', JSON.stringify({ ...user, name }));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="bg-surface font-body text-on-surface antialiased">
      <aside className="fixed left-0 top-0 h-screen w-64 z-50 bg-white flex flex-col p-6 gap-y-2 shadow-2xl shadow-slate-200/50">
        <div className="mb-8">
          <h1 className="text-2xl font-black text-slate-900 mb-1">Curator</h1>
          <p className="text-[10px] uppercase tracking-widest text-secondary font-semibold">Premium Real Estate</p>
        </div>
        <nav className="flex-1 space-y-1">
          <Link className="flex items-center gap-3 px-4 py-3 text-slate-500 hover:bg-slate-50 text-sm font-semibold font-headline" to="/dashboard/buyer"><span className="material-symbols-outlined">dashboard</span>Overview</Link>
          <Link className="flex items-center gap-3 px-4 py-3 text-slate-500 hover:bg-slate-50 text-sm font-semibold font-headline" to="/dashboard/buyer/my-properties"><span className="material-symbols-outlined">domain</span>My Properties</Link>
          <Link className="flex items-center gap-3 px-4 py-3 text-slate-500 hover:bg-slate-50 text-sm font-semibold font-headline" to="/dashboard/buyer/payment-history"><span className="material-symbols-outlined">payments</span>Payment History</Link>
          <Link className="flex items-center gap-3 px-4 py-3 text-slate-500 hover:bg-slate-50 text-sm font-semibold font-headline" to="/dashboard/buyer/inquiry-history"><span className="material-symbols-outlined">chat_bubble</span>Inquiry History</Link>
          <Link className="flex items-center gap-3 px-4 py-3 text-slate-900 bg-slate-100 rounded-md font-bold scale-98 transition-all text-sm font-headline" to="/dashboard/buyer/profile-settings"><span className="material-symbols-outlined">settings</span>Settings</Link>
        </nav>
        <div className="mt-auto pt-6 border-t border-slate-100">
          <button className="w-full text-left flex items-center gap-3 px-4 py-3 text-slate-500 hover:bg-slate-50 transition-colors text-sm font-semibold"><span className="material-symbols-outlined">help</span>Help Center</button>
          <button className="w-full text-left flex items-center gap-3 px-4 py-3 text-slate-500 hover:bg-slate-50 transition-colors text-sm font-semibold" onClick={logout}><span className="material-symbols-outlined">logout</span>Logout</button>
        </div>
      </aside>

      <header className="fixed top-0 w-full z-40 bg-slate-50/80 backdrop-blur-xl flex justify-between items-center px-8 h-16 ml-64 max-w-[calc(100%-16rem)]">
        <div className="flex items-center gap-4"><span className="text-xl font-bold tracking-tighter text-slate-900 font-headline">Architectural Curator</span></div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-4 text-slate-500"><button className="hover:text-slate-900 transition-colors"><span className="material-symbols-outlined">notifications</span></button><button className="hover:text-slate-900 transition-colors"><span className="material-symbols-outlined">mail</span></button></div>
          <div className="h-8 w-8 rounded-full overflow-hidden bg-surface-container-high"><img className="w-full h-full object-cover" alt="avatar" src="https://lh3.googleusercontent.com/aida-public/AB6AXuD4k4NZjc2PlvqPjN82Q6qi2QBMqPmsUlHw9XGV9c-hdSSiyKcR6MdOZsSj1-2y59IZaUlR3dMfTZczisy75_QL54tphufxe5sfoSUXyIquYDgGXYf1I8rnYZ0Oki8WRVpcHREg9QJVwad-rPgHp96GP3_sc03v_RPY35QsphxxhtQrOXQ5T31Tmtl1eVSZMGPkAsNcxdQMQViOohCRajKnFg2iwkOwB78fI3hXk1vXF6oVykjlcCOMDSmoolZqJebKISSJGvf8ow" /></div>
        </div>
      </header>

      <main className="ml-64 pt-24 pb-20 px-12 min-h-screen">
        <div className="max-w-4xl mx-auto">
          <div className="mb-12"><span className="text-[10px] uppercase tracking-[0.2em] font-bold text-secondary font-headline mb-2 block">Account Management</span><h2 className="text-5xl font-extrabold font-headline text-primary tracking-tighter">Profile Settings</h2></div>

          <div className="space-y-12">
            <section className="bg-surface-container-low p-8 rounded-xl">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div><h3 className="text-lg font-bold font-headline mb-1">Personal Details</h3><p className="text-sm text-secondary leading-relaxed">Update your public identity and contact information for property inquiries.</p></div>
                <div className="md:col-span-2 space-y-6">
                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-1.5"><label className="text-[11px] font-bold uppercase tracking-wider text-secondary">Full Name</label><input className="w-full bg-surface-container-lowest border-none ring-1 ring-outline-variant/20 focus:ring-surface-tint rounded-lg px-4 py-3 text-sm transition-all outline-none" type="text" value={name} onChange={(e) => setName(e.target.value)} /></div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5"><label className="text-[11px] font-bold uppercase tracking-wider text-secondary">Email Address</label><input className="w-full bg-surface-container-lowest border-none ring-1 ring-outline-variant/20 rounded-lg px-4 py-3 text-sm" type="email" value={email} readOnly /></div>
                      <div className="space-y-1.5"><label className="text-[11px] font-bold uppercase tracking-wider text-secondary">Phone Number</label><input className="w-full bg-surface-container-lowest border-none ring-1 ring-outline-variant/20 focus:ring-surface-tint rounded-lg px-4 py-3 text-sm transition-all outline-none" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="flex flex-col md:flex-row gap-12 items-start">
              <div className="w-full md:w-1/3"><h3 className="text-lg font-bold font-headline mb-2">Password Management</h3><p className="text-sm text-secondary leading-relaxed">Ensure your account remains secure with a complex password of at least 12 characters.</p></div>
              <div className="w-full md:w-2/3 bg-surface-container-lowest p-8 rounded-xl shadow-[0_20px_40px_rgba(25,28,30,0.06)]">
                <div className="space-y-6">
                  <div className="space-y-1.5"><label className="text-[11px] font-bold uppercase tracking-wider text-secondary">Current Password</label><input className="w-full bg-surface-container-low border-none ring-1 ring-outline-variant/20 rounded-lg px-4 py-3 text-sm" type="password" /></div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5"><label className="text-[11px] font-bold uppercase tracking-wider text-secondary">New Password</label><input className="w-full bg-surface-container-low border-none ring-1 ring-outline-variant/20 rounded-lg px-4 py-3 text-sm" type="password" /></div>
                    <div className="space-y-1.5"><label className="text-[11px] font-bold uppercase tracking-wider text-secondary">Confirm New Password</label><input className="w-full bg-surface-container-low border-none ring-1 ring-outline-variant/20 rounded-lg px-4 py-3 text-sm" type="password" /></div>
                  </div>
                </div>
              </div>
            </section>

            <section className="bg-surface-container-low p-8 rounded-xl">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div><h3 className="text-lg font-bold font-headline mb-1">Preferences</h3><p className="text-sm text-secondary leading-relaxed">Control how and when you receive updates about listings and tours.</p></div>
                <div className="md:col-span-2 space-y-1">
                  {['New Listing Alerts', 'Tour Confirmations', 'Market Reports'].map((label, index) => (
                    <div key={label} className="flex items-center justify-between py-4 group">
                      <div className="space-y-0.5"><span className="text-sm font-bold block">{label}</span></div>
                      <div className={`relative inline-flex h-5 w-10 flex-shrink-0 rounded-full p-0.5 ${index === 2 ? 'bg-surface-container-highest' : 'bg-primary-container'}`}><span className={`inline-block h-4 w-4 transform rounded-full bg-white ${index === 2 ? 'translate-x-0' : 'translate-x-5'}`}></span></div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <div className="flex items-center justify-end gap-6 pt-8">
              {saved ? <span className="text-green-700 text-sm font-semibold">Saved successfully</span> : null}
              <button className="text-secondary text-sm font-semibold hover:text-primary transition-colors">Discard Changes</button>
              <button className="bg-primary text-on-primary px-8 py-4 rounded-md text-sm font-bold font-headline tracking-wide hover:opacity-90 transition-opacity" onClick={() => void onSave()}>Save Profile Settings</button>
            </div>
          </div>
        </div>
      </main>

      <div className="fixed bottom-8 right-8 bg-surface-container-lowest/80 backdrop-blur-xl p-4 rounded-xl border border-white/20 shadow-xl flex items-center gap-4">
        <div className="h-10 w-10 bg-secondary-container rounded-lg flex items-center justify-center text-on-secondary-fixed"><span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>verified_user</span></div>
        <div><p className="text-[10px] font-bold uppercase tracking-widest text-secondary">Privacy Status</p><p className="text-xs font-semibold">Two-Factor Enabled</p></div>
      </div>
    </div>
  );
};

export default ProfileSettings;