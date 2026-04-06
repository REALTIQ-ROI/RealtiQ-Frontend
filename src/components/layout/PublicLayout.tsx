import type { ReactNode } from 'react';
import Navbar from './Navbar';
import Footer from './Footer';

const PublicLayout = ({ children }: { children: ReactNode }) => {
  return (
    <div className="min-h-screen bg-surface text-on-surface">
      <Navbar />
      <main className="pt-24">{children}</main>
      <Footer />
    </div>
  );
};

export default PublicLayout;