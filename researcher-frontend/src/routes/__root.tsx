import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Outlet, createRootRouteWithContext } from "@tanstack/react-router";
import { useEffect } from "react";

import { useStore } from "@/store/useStore";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { createOrUpdateUser } from "@/lib/firestore";
import "../styles.css";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()(
  {
    component: RootComponent,
  }
);

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  // ─── SMOOTH SCROLL ─────────────────────────────────────────────────────────
  // Lenis disabled: conflicts with internal h-screen flexbox panel scrolling.

  // ─── FIREBASE AUTH LISTENER ───────────────────────────────────────────────
  useEffect(() => {
    // Apply theme on mount
    const { initTheme } = useStore.getState();
    if (initTheme) initTheme();

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const email = firebaseUser.email ?? "";
        const username =
          firebaseUser.displayName ??
          firebaseUser.email?.split("@")[0] ??
          "researcher";

        useStore.getState().setUser({
          id: firebaseUser.uid,
          email,
          username,
          avatarUrl: firebaseUser.photoURL ?? undefined,
        });

        await createOrUpdateUser(firebaseUser.uid, {
          email,
          username,
        });

        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          const savedTheme = userDoc.data()?.preferences?.theme;
          if (savedTheme) {
            useStore.getState().setTheme(savedTheme);
          }
        } catch(e) {
          console.warn('[Theme] Could not load saved theme');
        }
        
        await useStore.getState().loadSessions();
      } else {
        useStore.getState().clearUser();
      }
    });
    return () => unsubscribe();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
    </QueryClientProvider>
  );
}