import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface AuthStore {
  token: string | null;
  userId: string | null;
  username: string | null;
  onboardingCompleted: boolean;
  login: (token: string, userId: string, username: string, onboardingCompleted?: boolean) => void;
  logout: () => void;
  setOnboardingCompleted: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      token: null,
      userId: null,
      username: null,
      onboardingCompleted: false,
      login: (token, userId, username, onboardingCompleted = false) =>
        set({ token, userId, username, onboardingCompleted }),
      logout: () => set({ token: null, userId: null, username: null, onboardingCompleted: false }),
      setOnboardingCompleted: () => set({ onboardingCompleted: true }),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
