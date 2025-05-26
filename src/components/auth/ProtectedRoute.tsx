import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { usePermissions } from '../../hooks/usePermissions';

interface ProtectedRouteProps {
  children: ReactNode;
  requireAuth?: boolean;
  requireEdit?: boolean;
  transcription?: any;
  fallback?: ReactNode;
}

export const ProtectedRoute = ({
  children,
  requireAuth = true,
  requireEdit = false,
  transcription,
  fallback,
}: ProtectedRouteProps) => {
  const { signedIn } = useAuth();
  const { canEdit } = usePermissions(transcription);
  const location = useLocation();

  // Check authentication
  if (requireAuth && !signedIn) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check edit permissions
  if (requireEdit && !canEdit) {
    if (fallback) {
      return <>{fallback}</>;
    }
    return (
      <div className="flex flex-col items-center justify-center py-10 px-5 text-center bg-gray-50 rounded-lg m-5">
        <h2 className="text-red-600 m-0 mb-4 text-2xl font-semibold">Access Denied</h2>
        <p className="text-gray-600 m-0 mb-2 text-base leading-relaxed max-w-md">You don't have permission to edit this transcription.</p>
        <p className="text-gray-600 m-0 mb-2 text-base leading-relaxed max-w-md">Only the author and editors can make changes.</p>
      </div>
    );
  }

  return <>{children}</>;
};

// Convenience wrapper for edit-protected content
export const EditProtected = ({
  children,
  transcription,
  fallback,
}: {
  children: ReactNode;
  transcription?: any;
  fallback?: ReactNode;
}) => {
  return (
    <ProtectedRoute
      requireAuth={true}
      requireEdit={true}
      transcription={transcription}
      fallback={fallback}
    >
      {children}
    </ProtectedRoute>
  );
};

// Convenience wrapper for author-only content
export const AuthorOnly = ({
  children,
  transcription,
  fallback,
}: {
  children: ReactNode;
  transcription?: any;
  fallback?: ReactNode;
}) => {
  const { isAuthor } = usePermissions(transcription);

  if (!isAuthor) {
    if (fallback) {
      return <>{fallback}</>;
    }
    return null;
  }

  return <>{children}</>;
};
