import { Link } from 'react-router-dom';
import Button from '../ui/Button';

interface PageNoticeProps {
  title: string;
  description: string;
  actionLabel?: string;
  actionTo?: string;
}

const PageNotice = ({ title, description, actionLabel = 'Back Home', actionTo = '/' }: PageNoticeProps) => {
  return (
    <div className="max-w-3xl mx-auto px-6 py-20 text-center">
      <h1 className="text-4xl font-headline font-extrabold tracking-tight mb-4">{title}</h1>
      <p className="text-secondary mb-8">{description}</p>
      <Link to={actionTo}>
        <Button>{actionLabel}</Button>
      </Link>
    </div>
  );
};

export default PageNotice;