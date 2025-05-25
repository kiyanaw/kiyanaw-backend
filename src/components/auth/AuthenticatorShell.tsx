import { Authenticator } from '@aws-amplify/ui-react';
import type { ReactNode } from 'react';

interface AuthenticatorShellProps {
  children: ReactNode;
}

export const AuthenticatorShell = ({ children }: AuthenticatorShellProps) => {
  return <Authenticator>{() => <div>{children}</div>}</Authenticator>;
};
