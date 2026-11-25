import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type Auth,
  type User,
} from 'firebase/auth';
import { auth as sharedFirebaseAuth } from '../firebase.js';
import { WORKSPACE_SCOPES } from '../utils/workspaceHelpers.js';

/**
 * OAuth access token is kept strictly in JS memory — NEVER stored in
 * localStorage or sessionStorage.
 */
let cachedAccessToken: string | null = null;

function ensureFirebaseAuth(): Auth {
  return sharedFirebaseAuth;
}

export function subscribeWorkspaceAuth(
  callback: (state: { user: User | null; accessToken: string | null }) => void,
): () => void {
  const auth = ensureFirebaseAuth();
  return onAuthStateChanged(auth, (user) => {
    if (!user) {
      cachedAccessToken = null;
    }
    callback({ user, accessToken: user ? cachedAccessToken : null });
  });
}

export function getWorkspaceAccessToken(): string | null {
  return cachedAccessToken;
}

export function clearWorkspaceAccessToken(): void {
  cachedAccessToken = null;
}

export async function signInWithGoogleWorkspace(forceConsent = false): Promise<{
  user: User;
  accessToken: string;
}> {
  const auth = ensureFirebaseAuth();
  const provider = new GoogleAuthProvider();

  for (const scope of WORKSPACE_SCOPES) {
    provider.addScope(scope);
  }

  provider.setCustomParameters({
    prompt: forceConsent ? 'consent' : 'select_account',
  });

  const result = await signInWithPopup(auth, provider);
  const credential = GoogleAuthProvider.credentialFromResult(result);
  const accessToken = credential?.accessToken;

  if (!accessToken) {
    throw new Error(
      'Google did not return an OAuth access token. Please try signing in again and grant Drive & Sheets access.',
    );
  }

  cachedAccessToken = accessToken;
  return { user: result.user, accessToken };
}

export async function signOutGoogleWorkspace(): Promise<void> {
  cachedAccessToken = null;
  const auth = ensureFirebaseAuth();
  await signOut(auth);
}
