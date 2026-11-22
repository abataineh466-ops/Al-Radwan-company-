import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, BOOTSTRAP_ADMIN_EMAIL, db } from '../firebase.js';

interface FirebaseContextValue {
  user: User | null;
  authReady: boolean;
  isFirebaseAdmin: boolean;
  authLoading: boolean;
  authError: string | null;
  signInWithGoogle: () => Promise<User | null>;
  signOutFirebase: () => Promise<void>;
  clearAuthError: () => void;
}

const FirebaseContext = createContext<FirebaseContextValue | null>(null);

export function FirebaseProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [isFirebaseAdmin, setIsFirebaseAdmin] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser);
      if (!nextUser) {
        setIsFirebaseAdmin(false);
        setAuthReady(true);
        return;
      }

      const isBootstrap =
        nextUser.emailVerified === true &&
        nextUser.email?.toLowerCase() === BOOTSTRAP_ADMIN_EMAIL;

      if (isBootstrap) {
        setIsFirebaseAdmin(true);
        setAuthReady(true);
        return;
      }

      // Check /admins/{uid} for secondary authorized firm administrators
      try {
        const adminSnap = await getDoc(doc(db, 'admins', nextUser.uid));
        setIsFirebaseAdmin(adminSnap.exists());
      } catch {
        setIsFirebaseAdmin(false);
      } finally {
        setAuthReady(true);
      }
    });

    return () => unsubscribe();
  }, []);

  async function signInWithGoogle(): Promise<User | null> {
    setAuthLoading(true);
    setAuthError(null);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const result = await signInWithPopup(auth, provider);
      return result.user;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      if (msg.includes('popup-closed-by-user')) {
        setAuthError('تم إغلاق نافذة تسجيل الدخول قبل إتمام العملية.');
      } else if (msg.includes('popup-blocked')) {
        setAuthError('يرجى السماح بالنوافذ المنبثقة لإتمام تسجيل الدخول عبر Google.');
      } else {
        setAuthError('تعذر تسجيل الدخول بحساب Google حالياً. حاول مرة أخرى.');
      }
      return null;
    } finally {
      setAuthLoading(false);
    }
  }

  async function signOutFirebase(): Promise<void> {
    await signOut(auth);
  }

  const value = useMemo<FirebaseContextValue>(
    () => ({
      user,
      authReady,
      isFirebaseAdmin,
      authLoading,
      authError,
      signInWithGoogle,
      signOutFirebase,
      clearAuthError: () => setAuthError(null),
    }),
    [user, authReady, isFirebaseAdmin, authLoading, authError]
  );

  return <FirebaseContext.Provider value={value}>{children}</FirebaseContext.Provider>;
}

export function useFirebase(): FirebaseContextValue {
  const ctx = useContext(FirebaseContext);
  if (!ctx) {
    throw new Error('useFirebase must be used inside a FirebaseProvider');
  }
  return ctx;
}
