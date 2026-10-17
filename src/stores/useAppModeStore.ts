import { create } from 'zustand';
import type { AppMode } from '../services/appModeService';

interface AppModeState {
  /** Fixed at boot from the URL. Switching modes is a full page load. */
  mode: AppMode;
  setMode: (mode: AppMode) => void;
}

export const useAppModeStore = create<AppModeState>()((set) => ({
  mode: 'cloud',
  setMode: (mode) => set({ mode }),
}));
