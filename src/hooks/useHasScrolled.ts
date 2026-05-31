import { useEffect, useState } from 'react';

const useHasScrolled = (threshold = 8) => {
  const [hasScrolled, setHasScrolled] = useState(false);

  useEffect(() => {
    const updateScrollState = () => {
      setHasScrolled(window.scrollY > threshold);
    };

    updateScrollState();
    window.addEventListener('scroll', updateScrollState, { passive: true });

    return () => {
      window.removeEventListener('scroll', updateScrollState);
    };
  }, [threshold]);

  return hasScrolled;
};

export default useHasScrolled;
