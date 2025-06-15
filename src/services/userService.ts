import { useAuthStore, type AuthUser } from '../stores/useAuthStore';

export const currentUser = (): AuthUser | null => {
  return useAuthStore.getState().user;
};