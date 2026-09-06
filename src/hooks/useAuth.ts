/**
 * Nolyvatix Client - Firebase Auth React Hook
 */

import { useState, useEffect } from 'react';
import { auth, onAuthStateChanged, signInAnonymously, User } from '../lib/firebase.ts';

export interface AuthState {
  user: User | null;
  loading: boolean;
  token: string | null;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

let hasAttemptedAutoSignIn = false;
let isAnonymousAuthRestricted = false;

export function useAuth(): AuthState {
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        try {
          const idToken = await currentUser.getIdToken();
          setToken(idToken);
        } catch {
          setToken(null);
        }
        setLoading(false);
      } else {
        if (!hasAttemptedAutoSignIn && !isAnonymousAuthRestricted) {
          hasAttemptedAutoSignIn = true;
          try {
            const cred = await signInAnonymously(auth);
            setUser(cred.user);
            const idToken = await cred.user.getIdToken();
            setToken(idToken);
          } catch (err: any) {
            const code = err?.code || '';
            if (
              code === 'auth/admin-restricted-operation' ||
              code === 'auth/operation-not-allowed' ||
              code === 'auth/configuration-not-found'
            ) {
              // Anonymous auth provider disabled in Firebase Console
              isAnonymousAuthRestricted = true;
            }
            setUser(null);
            setToken(null);
          } finally {
            setLoading(false);
          }
        } else {
          setUser(null);
          setToken(null);
          setLoading(false);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  const signIn = async () => {
    if (isAnonymousAuthRestricted) return;
    setLoading(true);
    try {
      const cred = await signInAnonymously(auth);
      setUser(cred.user);
      const idToken = await cred.user.getIdToken();
      setToken(idToken);
    } catch (err: any) {
      const code = err?.code || '';
      if (
        code === 'auth/admin-restricted-operation' ||
        code === 'auth/operation-not-allowed'
      ) {
        isAnonymousAuthRestricted = true;
      }
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    await auth.signOut();
    setUser(null);
    setToken(null);
  };

  return {
    user,
    loading,
    token,
    signIn,
    signOut,
  };
}
