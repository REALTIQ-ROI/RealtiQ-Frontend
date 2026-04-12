import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../ui/Button';

const navItems = [
  { to: '/', label: 'Home' },
  { to: '/properties', label: 'Properties' },
  { to: '/about', label: 'About' },
  { to: '/contact', label: 'Contact' },
];

const Navbar = () => {
  const { isAuthenticated, logout } = useAuth();

  return (
    <nav className="fixed top-0 w-full z-50 bg-surface/85 backdrop-blur-xl border-b border-outline-variant/20">
      <div className="flex justify-between items-center px-6 py-4 max-w-7xl mx-auto gap-6">
        <Link to="/" className="text-xl font-black text-on-surface tracking-tighter font-headline">
          RealtiQ
        </Link>

        <div className="hidden md:flex items-center space-x-8">
          {navItems.map((item) => (
            <NavLink
              key={item.to + item.label}
              to={item.to}
              className={({ isActive }) =>
                `font-manrope font-bold tracking-tight text-sm transition-colors ${
                  isActive ? 'text-on-surface border-b-2 border-on-surface pb-1' : 'text-on-surface-variant hover:text-on-surface'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </div>

        {isAuthenticated ? (
          <div className="flex items-center gap-3">
            <Link className="text-sm font-semibold hover:underline" to="/dashboard">
              Dashboard
            </Link>
            <Button variant="secondary" onClick={logout}>
              Logout
            </Button>
          </div>
        ) : (
          <Link to="/login">
            <Button>Login</Button>
          </Link>
        )}
      </div>
    </nav>
  );
};

export default Navbar;