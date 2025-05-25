import { useAuth } from '../../hooks/useAuth';

export const Navigation = () => {
  const { signedIn, signOut, user } = useAuth();

  return (
    <nav>
      <div>
        {signedIn ? (
          <div>
            <span>Welcome, {user?.username}</span>
            <button onClick={signOut}>Sign out</button>
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
