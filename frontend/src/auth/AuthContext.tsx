import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  getRedirectResult,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  type User,
} from "firebase/auth";
import { setApiTokenProvider, type UserMe } from "../api/client";
import { getFirebaseAuth, googleProvider } from "../lib/firebase";

type AuthState = {
  user: UserMe | null;
  loading: boolean;
  refresh: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  setUser: (u: UserMe | null) => void;
};

const AuthContext = createContext<AuthState | null>(null);

function mapFirebaseUser(u: User): UserMe {
  return {
    id: u.uid,
    email: u.email ?? "",
    displayName: u.displayName ?? null,
    onboardingCompleted: true,
    createdAt: u.metadata.creationTime ? new Date(u.metadata.creationTime).toISOString() : undefined,
  };
}

export function AuthProvider({ children }: { children: ReactNode }): React.ReactElement {
  const [user, setUser] = useState<UserMe | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setApiTokenProvider(async () => {
      const u = getFirebaseAuth().currentUser;
      if (!u) return null;
      return u.getIdToken();
    });
  }, []);

  const refresh = useCallback(async () => {
    const u = getFirebaseAuth().currentUser;
    setUser(u ? mapFirebaseUser(u) : null);
  }, []);

  useEffect(() => {
    const auth = getFirebaseAuth();

    // Complete redirect-based sign-in when returning from Google.
    void getRedirectResult(auth).catch(() => {
      // Ignore here; auth state listener below is the source of truth.
    });

    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u ? mapFirebaseUser(u) : null);
      setLoading(false);
    });
    return unsub;
  }, []);

  const signInWithGoogle = useCallback(async () => {
    const auth = getFirebaseAuth();
    try {
      await signInWithPopup(auth, googleProvider);
      return;
    } catch (e) {
      const code = (e as { code?: string })?.code ?? "";
      // Fallback for popup blockers / COOP restrictions.
      if (code.includes("popup") || code.includes("blocked") || code.includes("cancelled")) {
        await signInWithRedirect(auth, googleProvider);
        return;
      }
      throw e;
    }
  }, []);

  const logout = useCallback(async () => {
    await signOut(getFirebaseAuth());
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, refresh, signInWithGoogle, logout, setUser }),
    [user, loading, refresh, signInWithGoogle, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth outside AuthProvider");
  return ctx;
}
