import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface PlayerState {
  playing: boolean;
  setPlaying: () => void;
  setPaused: () => void;
}

export const usePlayerStore = create<PlayerState>()(
  devtools(
    (set) => ({
      playing: false,
      setPlaying: () => {
        set({ playing: true });
      },
      setPaused: () => {
        set({ playing: false });
      },
    }),
    { name: 'PlayerStore' }
  )
); 