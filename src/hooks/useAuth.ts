import { useAuthenticator } from '@aws-amplify/ui-react';
import { signOut as amplifySignOut } from 'aws-amplify/auth';

export interface AuthUser {
  username: string;
  userId: string;
  signInDetails?: any;
}

export interface UseAuthReturn {
  user: AuthUser | null;
  route: 'authenticated' | 'unauthenticated';
  signedIn: boolean;
  signIn: () => void;
  signOut: () => void;
  refreshSession: () => void;
}

export const useAuth = (): UseAuthReturn => {
  const {
    user,
    route,
    signOut: authenticatorSignOut,
  } = useAuthenticator((context) => [
    context.user,
    context.route,
    context.signOut,
  ]);

  const signIn = () => {
    // This will be handled by the Authenticator component
    console.log('Sign in triggered');
  };

  const signOut = async () => {
    try {
      await amplifySignOut();
      authenticatorSignOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const refreshSession = () => {
    // This will be implemented when needed
    console.log('Refresh session triggered');
  };

  // Map AuthenticatorRoute to our expected route type
  const mappedRoute: 'authenticated' | 'unauthenticated' =
    route === 'authenticated' ? 'authenticated' : 'unauthenticated';

  return {
    user: user
      ? {
          username: user.username,
          userId: user.userId,
          signInDetails: user.signInDetails,
        }
      : null,
    route: mappedRoute,
    signedIn: route === 'authenticated',
    signIn,
    signOut,
    refreshSession,
  };
};
