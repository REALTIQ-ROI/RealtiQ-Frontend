import type { ReactNode } from 'react';

interface DashboardSectionProps {
  title: string;
  subtitle: string;
  children?: ReactNode;
}

const DashboardSection = ({ title, subtitle, children }: DashboardSectionProps) => {
  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-3xl font-headline font-extrabold tracking-tight">{title}</h1>
        <p className="text-secondary mt-2">{subtitle}</p>
      </header>
      {children ?? (
        <div className="bg-surface-container-low rounded-xl p-5 border border-outline-variant/20">
          <p className="text-on-surface-variant">This screen is API-ready and waiting for backend integration.</p>
        </div>
      )}
    </section>
  );
};

export default DashboardSection;