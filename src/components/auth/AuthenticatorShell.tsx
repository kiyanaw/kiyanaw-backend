import { Authenticator, useAuthenticator, ThemeProvider, createTheme } from '@aws-amplify/ui-react';
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
      username: user.signInDetails?.loginId as string,  // This is the email
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

  // Once authenticated, render without the auth background/styling
  return <div className="w-full h-full">{children}</div>;
};

// Custom theme with just brand colors for highlights
const kiyanawTheme = createTheme({
  name: 'kiyanaw-theme',
  tokens: {
    colors: {
      brand: {
        primary: {
          10: '#f0f4f8',
          20: '#e1e9f0',
          40: '#8fa0b8',
          60: '#305880',
          80: '#1e3a52',
          90: '#0f1d29',
          100: '#000000',
        },
      },
    },
    components: {
      button: {
        primary: {
          backgroundColor: '#305880',
          _hover: {
            backgroundColor: '#1e3a52',
          },
          _focus: {
            backgroundColor: '#1e3a52',
          },
          _active: {
            backgroundColor: '#0f1d29',
          },
        },
      },
      fieldcontrol: {
        _focus: {
          borderColor: '#305880',
          boxShadow: '0 0 0 2px rgba(48, 88, 128, 0.2)',
        },
      },
      tabs: {
        item: {
          color: '#64748b',
          _active: {
            color: '#305880',
            borderColor: '#305880',
          },
        },
      },
    },
  },
});

export const AuthenticatorShell = ({ children }: AuthenticatorShellProps) => {
  return (
    <ThemeProvider theme={kiyanawTheme}>
      <Authenticator
        components={{
          Header() {
            return (
              <div className="flex flex-col items-center mt-20 mb-8">
                <img 
                  src="/logo.png" 
                  alt="kiyânaw Transcribe" 
                  className="w-16 h-16 rounded-md border border-gray-200 mb-4"
                />
                <h1 className="text-2xl font-semibold text-ki-blue">kiyânaw Transcribe</h1>
                <p className="text-ki-blue/70 text-sm mt-1">Indigenous Language Transcription Platform</p>
              </div>
            );
          },
        }}
      >
        {() => <AuthenticatedApp>{children}</AuthenticatedApp>}
      </Authenticator>
    </ThemeProvider>
  );
};
