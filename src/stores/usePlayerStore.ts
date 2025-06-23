import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface PlayerState {
  playing: boolean;
  loadedAndReady: boolean;
  setPlaying: () => void;
  setPaused: () => void;
  setLoadedAndReady: (ready: boolean) => void;
}

export const usePlayerStore = create<PlayerState>()(
  devtools(
    (set) => ({
      playing: false,
      loadedAndReady: false,
      setPlaying: () => {
        set({ playing: true });
      },
      setPaused: () => {
        set({ playing: false });
      },
      setLoadedAndReady: (ready: boolean) => {
        set({ loadedAndReady: ready });
      },
    }),
    { name: 'PlayerStore' }
  )
); 