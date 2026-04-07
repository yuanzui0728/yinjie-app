import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AuthSession } from "@yinjie/contracts";
import { createSessionStateStorage } from "../runtime/session-storage";

type SessionState = {
  token: string | null;
  userId: string | null;
  username: string | null;
  onboardingCompleted: boolean;
  avatar: string;
  signature: string;
  hydrateSession: (session: AuthSession) => void;
  updateProfile: (input: { username?: string; avatar?: string; signature?: string }) => void;
  completeOnboarding: () => void;
  logout: () => void;
};

const defaultAvatar = "";
const defaultSignature = "在现实之外，进入另一片世界。";

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      token: null,
      userId: null,
      username: null,
      onboardingCompleted: false,
      avatar: defaultAvatar,
      signature: defaultSignature,
      hydrateSession: (session) =>
        set((state) => {
          const sameUser = state.userId === session.userId;

          return {
            token: session.token,
            userId: session.userId,
            username: session.username,
            onboardingCompleted: session.onboardingCompleted,
            avatar: sameUser ? state.avatar : defaultAvatar,
            signature: sameUser ? state.signature : defaultSignature,
          };
        }),
      updateProfile: (input) =>
        set((state) => ({
          username: input.username ?? state.username,
          avatar: input.avatar ?? state.avatar,
          signature: input.signature ?? state.signature,
        })),
      completeOnboarding: () => set({ onboardingCompleted: true }),
      logout: () =>
        set({
          token: null,
          userId: null,
          username: null,
          onboardingCompleted: false,
          avatar: defaultAvatar,
          signature: defaultSignature,
        }),
    }),
    {
      name: "yinjie-app-session",
      storage: createSessionStateStorage(),
    },
  ),
);
