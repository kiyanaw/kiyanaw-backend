import { useEffect, useState } from 'react';
import { fetchAuthSession } from 'aws-amplify/auth';

/**
 * Whether the signed-in user belongs to the Cognito "Admins" group. Admins are
 * authorized on every model's @auth (groups: ["Admins"]) — e.g. they can create/read
 * Mentor exports for any transcription. Reads the group claim from the (cached) auth
 * session, so this is cheap and requires no changes to the sign-in flow.
 */
export const useIsAdmin = (): boolean => {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchAuthSession()
      .then((session) => {
        const groups = session.tokens?.accessToken?.payload?.['cognito:groups'];
        const isMember = Array.isArray(groups) && groups.includes('Admins');
        if (!cancelled) setIsAdmin(isMember);
      })
      .catch(() => {
        if (!cancelled) setIsAdmin(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return isAdmin;
};
