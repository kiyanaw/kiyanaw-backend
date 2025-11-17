import { useEffect, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { regionSaveManager } from '../services/regionSaveManager';

/**
 * Hook to warn users when navigating away with pending changes
 * Works with BrowserRouter by intercepting navigation and showing confirmation
 */
export const useNavigationGuard = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = useRef(location.pathname);
  const isNavigating = useRef(false);

  // Update current path when location changes
  useEffect(() => {
    if (!isNavigating.current) {
      currentPath.current = location.pathname;
    }
    isNavigating.current = false;
  }, [location.pathname]);

  // Handle browser navigation/close with beforeunload
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (regionSaveManager.hasAnyPendingSaves()) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  // Intercept navigation attempts
  const interceptNavigation = useCallback((targetPath: string) => {
    if (regionSaveManager.hasAnyPendingSaves()) {
      const shouldLeave = window.confirm(
        'You have unsaved changes that are still being saved. If you leave now, you may lose your latest changes.\n\nAre you sure you want to leave?'
      );
      
      if (shouldLeave) {
        isNavigating.current = true;
        navigate(targetPath);
        return true;
      }
      return false;
    }
    return true;
  }, [navigate]);

  return { interceptNavigation };
};

