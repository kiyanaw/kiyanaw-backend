import { useAuthStore } from '../../stores/useAuthStore';
import { signOut } from 'aws-amplify/auth';

export const Navigation = () => {
  const user = useAuthStore((state) => state.user);
  const signedIn = useAuthStore((state) => state.signedIn);

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <nav>
      <div>
        {signedIn ? (
          <div>
            <span>Welcome, {user?.username}</span>
            <button onClick={handleSignOut}>Sign out</button>
          </div>
        ) : (
          <div>
            <span>Please sign in</span>
          </div>
        )}
      </div>
    </nav>
  );
};
