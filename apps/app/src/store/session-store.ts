import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AuthSession } from "@yinjie/contracts";
import { createSessionStateStorage } from "../runtime/session-storage";

type SessionState = {
  token: string | null;
  userId: string | null;
  username: string | null;
  onboardingCompleted: boolean;
  environmentSetupCompleted: boolean;
  providerReady: boolean;
  runtimeMode: "self-hosted" | "remote";
  avatar: string;
  signature: string;
  hydrateSession: (session: AuthSession) => void;
  updateProfile: (input: { username?: string; avatar?: string; signature?: string }) => void;
  completeOnboarding: () => void;
  completeEnvironmentSetup: (input?: { providerReady?: boolean; runtimeMode?: "self-hosted" | "remote" }) => void;
  logout: () => void;
};

const defaultAvatar = "";
const defaultSignature = "在现实之外，进入另一个世界。";

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      token: null,
      userId: null,
      username: null,
      onboardingCompleted: false,
      environmentSetupCompleted: false,
      providerReady: false,
      runtimeMode: "remote",
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
      completeEnvironmentSetup: (input) =>
        set((state) => ({
          environmentSetupCompleted: true,
          providerReady: input?.providerReady ?? state.providerReady,
          runtimeMode: input?.runtimeMode ?? state.runtimeMode,
        })),
      logout: () =>
        set({
          token: null,
          userId: null,
          username: null,
          onboardingCompleted: false,
          environmentSetupCompleted: false,
          providerReady: false,
          runtimeMode: "remote",
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
