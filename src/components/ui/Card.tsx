import type { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
}

const Card = ({ children, className = '' }: CardProps) => {
  return <div className={`bg-surface-container-lowest rounded-xl border border-outline-variant/10 ${className}`}>{children}</div>;
};

export default Card;