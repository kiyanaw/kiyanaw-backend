import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

export interface AuthUser {
  username: string;
  userId: string;
  signInDetails?: any;
}

interface AuthState {
  user: AuthUser | null;
  signedIn: boolean;
  setUser: (user: AuthUser | null) => void;
}

export const useAuthStore = create<AuthState>()(
  devtools(
    (set) => ({
      user: null,
      signedIn: false,
      setUser: (user) => set({ user, signedIn: !!user }, false, 'auth/setUser'),
    }),
    { name: 'AuthStore' }
  )
); 