import { useEffect, useRef } from 'react';
import { useAuth } from './useAuth';
import { personalisationService } from '../services/personalisationService';
export const useRecordRecentProperty = (propertyReference?: string) => {
  const { isAuthenticated } = useAuth(); const recorded = useRef('');
  useEffect(() => { if (!isAuthenticated || !propertyReference || recorded.current === propertyReference) return; recorded.current = propertyReference; void personalisationService.recordRecent(propertyReference).catch(() => { recorded.current = ''; }); }, [isAuthenticated, propertyReference]);
};
