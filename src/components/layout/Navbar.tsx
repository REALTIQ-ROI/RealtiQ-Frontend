import { useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useCart } from '../../contexts/CartContext';
import { useAuth } from '../../contexts/AuthContext';
import useHasScrolled from '../../hooks/useHasScrolled';
import Button from '../ui/Button';

const navItems = [
  { to: '/', label: 'Home' },
  { to: '/properties', label: 'Properties' },
  { to: '/proxy-inspectors', label: 'Verified Property Agents' },
  { to: '/about', label: 'About' },
  { to: '/contact', label: 'Contact' },
];

const Navbar = () => {
  const { isAuthenticated, logout, user } = useAuth();
  const { itemCount } = useCart();
  const hasScrolled = useHasScrolled(8);
  const [open, setOpen] = useState(false);
  const location = useLocation();

  return (
    <nav className={`fixed top-0 z-50 w-full border-b backdrop-blur-xl transition-all duration-200 ${hasScrolled ? 'bg-surface/95 border-outline-variant/20 shadow-md shadow-black/5' : 'bg-surface/80 border-transparent'}`}>
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 sm:py-4">
        <Link to="/" className="font-headline text-xl font-black tracking-tighter text-on-surface">RealtiQ</Link>
        <div className="hidden items-center space-x-8 md:flex">
          {navItems.map((item) => <NavLink key={item.to} to={item.to} className={({ isActive }) => `font-manrope text-sm font-bold tracking-tight transition-colors ${isActive ? 'border-b-2 border-on-surface pb-1 text-on-surface' : 'text-on-surface-variant hover:text-on-surface'}`}>{item.label}</NavLink>)}
        </div>
        <button type="button" className="ml-auto flex h-10 w-10 items-center justify-center rounded-lg md:hidden" aria-label="Toggle navigation" aria-expanded={open} onClick={() => setOpen((value) => !value)}><span className="material-symbols-outlined">{open ? 'close' : 'menu'}</span></button>
        {isAuthenticated ? (
          <div className="hidden items-center gap-3 md:flex">
            {user?.role === 'buyer' ? (
              <Link className="relative flex h-10 w-10 items-center justify-center rounded-lg bg-surface-container-low" to="/dashboard/buyer/cart" aria-label="Service cart">
                <span className="material-symbols-outlined text-lg">shopping_cart</span>
                {itemCount ? <span className="absolute -right-1 -top-1 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-on-primary">{itemCount}</span> : null}
              </Link>
            ) : null}
            <Link className="text-sm font-semibold hover:underline" to="/dashboard">Dashboard</Link><Button variant="secondary" onClick={logout}>Logout</Button>
          </div>
        ) : <Link to="/login" className="hidden md:block"><Button>Login</Button></Link>}
      </div>
      {open ? (
        <div className="border-t border-outline-variant/20 bg-surface px-4 py-4 md:hidden" key={location.pathname}>
          <div className="flex flex-col gap-1">
            {navItems.map((item) => <NavLink key={item.to} to={item.to} onClick={() => setOpen(false)} className={({ isActive }) => `rounded-lg px-4 py-3 text-sm font-bold ${isActive ? 'bg-surface-container-low text-primary' : 'text-on-surface-variant'}`}>{item.label}</NavLink>)}
            {isAuthenticated && user?.role === 'buyer' ? (
              <Link to="/dashboard/buyer/cart" onClick={() => setOpen(false)} className="rounded-lg px-4 py-3 text-sm font-bold text-on-surface-variant">
                Service Cart ({itemCount})
              </Link>
            ) : null}
            <Link to={isAuthenticated ? '/dashboard' : '/login'} onClick={() => setOpen(false)} className="mt-2 rounded-lg bg-primary px-4 py-3 text-center text-sm font-bold text-on-primary">{isAuthenticated ? 'Dashboard' : 'Login'}</Link>
            {isAuthenticated ? <button type="button" onClick={() => { logout(); setOpen(false); }} className="rounded-lg px-4 py-3 text-left text-sm font-bold text-error">Logout</button> : null}
          </div>
        </div>
      ) : null}
    </nav>
  );
};

export default Navbar;
