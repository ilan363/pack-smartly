import { useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/integrations/firebase/client";
import { useAuthStore } from "@/lib/auth-store";
import {
  resolveOAuthProviderFromUser,
  signOutFirebase,
} from "@/lib/oauth";

export function useFirebaseAuthSync() {
  const setFirebaseSession = useAuthStore((state) => state.setFirebaseSession);
  const clearFirebaseSession = useAuthStore(
    (state) => state.clearFirebaseSession,
  );

  useEffect(
    () =>
      onAuthStateChanged(auth, (user) => {
        if (!user?.email) {
          clearFirebaseSession();
          return;
        }

        const provider = resolveOAuthProviderFromUser(user);
        setFirebaseSession(user.email, provider);
      }),
    [clearFirebaseSession, setFirebaseSession],
  );
}

export async function logoutWithFirebase(): Promise<void> {
  await signOutFirebase();
  useAuthStore.getState().logout();
}
