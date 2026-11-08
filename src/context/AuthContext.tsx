import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useProfileDoc } from '@/lib/db';
import type { Profile } from '@/lib/types';

type AuthState = {
  user: User | null;
  profile: Profile | null;
  /** True until we know whether someone is signed in and have loaded their profile. */
  loading: boolean;
};

const AuthContext = createContext<AuthState>({ user: null, profile: null, loading: true });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(
    () =>
      onAuthStateChanged(auth, (u) => {
        setUser(u);
        setAuthReady(true);
      }),
    [],
  );

  const profile = useProfileDoc(user?.uid);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile: profile.data,
        loading: !authReady || (user != null && profile.loading),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

/** For screens that only render when signed in with a profile. */
export function useMe() {
  const { user, profile } = useContext(AuthContext);
  if (!user || !profile) throw new Error('useMe() used outside a signed-in screen');
  return { user, profile, uid: user.uid };
}

export function friendlyAuthError(e: unknown): string {
  const code = (e as { code?: string })?.code ?? '';
  switch (code) {
    case 'auth/invalid-email':
      return 'That email address looks wrong.';
    case 'auth/missing-password':
      return 'Please enter a password.';
    case 'auth/weak-password':
      return 'Password should be at least 6 characters.';
    case 'auth/email-already-in-use':
      return 'An account already exists with that email. Try signing in.';
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Wrong email or password.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Wait a bit and try again.';
    case 'auth/network-request-failed':
      return 'No internet connection.';
    default:
      return (e as Error)?.message ?? 'Something went wrong.';
  }
}
