import { Authenticator, useAuthenticator } from '@aws-amplify/ui-react';
import { useRef, type ReactNode } from 'react';
import { useAuthStore } from '../../stores/useAuthStore';

interface AuthenticatorShellProps {
  children: ReactNode;
}

const AuthenticatedApp = ({ children }: { children: ReactNode }) => {
  const { user, route } = useAuthenticator((context) => [
    context.user,
    context.route,
  ]);
  
  const lastUserRef = useRef<string>('__initial__');
  
  // Only update store when user actually changes
  const currentUserKey = route === 'authenticated' && user ? user.userId : 'null';
  
  if (lastUserRef.current !== currentUserKey) {
    lastUserRef.current = currentUserKey;
    
    const currentUser = route === 'authenticated' && user ? {
      username: user.username,
      userId: user.userId,
      signInDetails: user.signInDetails,
    } : null;
    
    // Check if the store actually needs updating
    const storeUser = useAuthStore.getState().user;
    const storeUserKey = storeUser ? storeUser.userId : 'null';
    
    if (storeUserKey !== currentUserKey) {
      useAuthStore.getState().setUser(currentUser);
    }
  }

  return <div>{children}</div>;
};

export const AuthenticatorShell = ({ children }: AuthenticatorShellProps) => {
  return (
    <Authenticator>
      {() => <AuthenticatedApp>{children}</AuthenticatedApp>}
    </Authenticator>
  );
};
