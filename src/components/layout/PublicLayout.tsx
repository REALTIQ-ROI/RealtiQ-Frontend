import type { ReactNode } from 'react';
import Navbar from './Navbar';
import Footer from './Footer';

const PublicLayout = ({ children, fullHeight = false }: { children: ReactNode; fullHeight?: boolean }) => {
  return (
    <div className="min-h-screen bg-surface text-on-surface">
      <Navbar />
      <main className={fullHeight ? 'pt-20 sm:pt-24 lg:h-screen lg:overflow-hidden' : 'pt-20 sm:pt-24'}>{children}</main>
      {!fullHeight ? <Footer /> : null}
    </div>
  );
};

export default PublicLayout;
