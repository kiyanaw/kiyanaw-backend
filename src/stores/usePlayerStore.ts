import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface PlayerState {
  playing: boolean;
  loadedAndReady: boolean;
  currentTime: number;
  duration: number;
  setPlaying: () => void;
  setPaused: () => void;
  setLoadedAndReady: (ready: boolean) => void;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
}

export const usePlayerStore = create<PlayerState>()(
  devtools(
    (set) => ({
      playing: false,
      loadedAndReady: false,
      currentTime: 0,
      duration: 0,
      setPlaying: () => {
        set({ playing: true });
      },
      setPaused: () => {
        set({ playing: false });
      },
      setLoadedAndReady: (ready: boolean) => {
        set({ loadedAndReady: ready });
      },
      setCurrentTime: (time: number) => {
        set({ currentTime: time });
      },
      setDuration: (duration: number) => {
        set({ duration: duration });
      },
    }),
    { name: 'PlayerStore' }
  )
); 