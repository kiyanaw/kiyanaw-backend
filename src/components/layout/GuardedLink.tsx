import { Link, useNavigate } from 'react-router-dom';
import type { ComponentProps } from 'react';
import { regionSaveManager } from '../../services/regionSaveManager';

/**
 * A Link component that checks for pending saves before navigating
 * Shows a confirmation dialog if there are unsaved changes
 */
export const GuardedLink = ({ to, onClick, children, ...props }: ComponentProps<typeof Link>) => {
  const navigate = useNavigate();

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    // Check if there are pending saves
    if (regionSaveManager.hasAnyPendingSaves()) {
      e.preventDefault();
      
      const shouldLeave = window.confirm(
        'You have unsaved changes that are still being saved. If you leave now, you may lose your latest changes.\n\nAre you sure you want to leave?'
      );
      
      if (shouldLeave) {
        // User confirmed, proceed with navigation
        if (typeof to === 'string') {
          navigate(to);
        } else if ('pathname' in to) {
          navigate(to);
        }
      }
      // If user cancelled, do nothing (stay on current page)
      return;
    }
    
    // No pending saves, call original onClick if provided
    if (onClick) {
      onClick(e);
    }
  };

  return (
    <Link to={to} onClick={handleClick} {...props}>
      {children}
    </Link>
  );
};

