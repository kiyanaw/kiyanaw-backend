import { useEffect, useState } from 'react';
import { Outlet, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { getCurrentUser } from 'aws-amplify/auth';
import { useAuthStore } from '../../stores/useAuthStore';

export const SupportLayout = () => {
  const signedIn = useAuthStore((state) => state.signedIn);
  const setUser = useAuthStore((state) => state.setUser);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const u = await getCurrentUser();
        if (cancelled) return;
        setUser({
          username: (u.signInDetails?.loginId as string) ?? u.username,
          userId: u.userId,
          signInDetails: u.signInDetails,
        });
      } catch {
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setAuthChecked(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [setUser]);

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <header className="fixed top-0 left-0 right-0 z-[1000] flex items-center p-4 bg-ki-blue text-white shadow-md">
        <div className="flex-1 flex items-center gap-6">
          <img
            src="/logo.png"
            alt="kiyânaw Transcribe"
            className="w-[40px] h-[40px] rounded-[3px] border border-white"
          />
        </div>

        <div className="absolute inset-0 flex items-center justify-center md:hidden pointer-events-none">
          <span className="text-white font-semibold text-lg">kiyânaw</span>
        </div>

        <div className="flex items-center gap-4">
          {authChecked &&
            (signedIn ? (
              <Link
                to="/transcribe-list"
                className="flex items-center text-white hover:text-white/80 transition-colors duration-200 text-base font-medium"
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                Home
              </Link>
            ) : (
              <Link
                to="/"
                className="text-white hover:text-white/80 transition-colors duration-200 text-base font-medium"
              >
                Sign in
              </Link>
            ))}
        </div>
      </header>

      <main className="flex-1 mt-[72px]">
        <Outlet />
      </main>
    </div>
  );
};
