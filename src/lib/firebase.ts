/**
 * Nolyvatix Client - Firebase Client SDK Initializer
 * Configured with project bubbly-music-ztgzl credentials
 */

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth, signInAnonymously, onAuthStateChanged, User } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

let app: FirebaseApp;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

export const auth: Auth = getAuth(app);

// Flag to track whether anonymous authentication is disabled on the Firebase project
let isAnonymousAuthDisabled = false;
let pendingSignIn: Promise<string | null> | null = null;

/**
 * Ensures the client has an active Firebase user session (anonymous or authenticated)
 * Returns the current Firebase ID Token string, or null if unauthenticated / anonymous sign-in is disabled.
 */
export async function getAuthToken(): Promise<string | null> {
  const currentUser = auth.currentUser;

  if (currentUser) {
    try {
      return await currentUser.getIdToken();
    } catch {
      return null;
    }
  }

  // If anonymous sign-in was previously restricted or disabled, avoid repeated failed network calls
  if (isAnonymousAuthDisabled) {
    return null;
  }

  if (pendingSignIn) {
    return pendingSignIn;
  }

  pendingSignIn = (async () => {
    try {
      const userCredential = await signInAnonymously(auth);
      return await userCredential.user.getIdToken();
    } catch (err: any) {
      const code = err?.code || '';
      if (
        code === 'auth/admin-restricted-operation' ||
        code === 'auth/operation-not-allowed' ||
        code === 'auth/configuration-not-found'
      ) {
        // Anonymous sign-in provider is disabled in this Firebase project; switch to dev/operator mode
        isAnonymousAuthDisabled = true;
      }
      return null;
    } finally {
      pendingSignIn = null;
    }
  })();

  return pendingSignIn;
}

export { app, signInAnonymously, onAuthStateChanged };
export type { User };
