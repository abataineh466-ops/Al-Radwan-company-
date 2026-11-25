import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  getRedirectResult,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  type User,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, BOOTSTRAP_ADMIN_EMAIL, db } from '../firebase.js';

export interface GoogleSignInOutcome {
  user: User;
  isAdmin: boolean;
}

interface FirebaseContextValue {
  user: User | null;
  authReady: boolean;
  isFirebaseAdmin: boolean;
  authLoading: boolean;
  authError: string | null;
  signInWithGoogle: () => Promise<GoogleSignInOutcome | null>;
  signOutFirebase: () => Promise<void>;
  clearAuthError: () => void;
}

const FirebaseContext = createContext<FirebaseContextValue | null>(null);

async function resolveFirebaseAdminStatus(nextUser: User): Promise<boolean> {
  if (
    nextUser.emailVerified === true &&
    nextUser.email?.toLowerCase() === BOOTSTRAP_ADMIN_EMAIL
  ) {
    return true;
  }

  try {
    const adminSnap = await getDoc(doc(db, 'admins', nextUser.uid));
    return adminSnap.exists();
  } catch {
    return false;
  }
}

function formatFirebaseAuthError(error: unknown): string {
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code?: unknown }).code ?? '')
      : '';
  const msg = error instanceof Error ? error.message : String(error ?? '');
  const combined = `${code} ${msg}`.toLowerCase();

  if (combined.includes('unauthorized-domain')) {
    const host = typeof window !== 'undefined' ? window.location.hostname : '';
    return host
      ? `النطاق (${host}) غير مضاف بعد في قائمة النطاقات المصرّح بها في Firebase Authentication. أضفه من Firebase Console > Authentication > Settings > Authorized domains، أو ادخل الآن ببيانات المكتب أدناه.`
      : 'هذا النطاق غير مصرّح به في إعدادات Firebase Authentication. أضفه في Authorized domains أو ادخل ببيانات المكتب أدناه.';
  }
  if (combined.includes('popup-closed-by-user') || combined.includes('cancelled-popup-request')) {
    return 'تم إغلاق نافذة تسجيل الدخول قبل إتمام العملية. حاول مرة أخرى.';
  }
  if (combined.includes('popup-blocked')) {
    return 'المتصفح حظر النافذة المنبثقة. اسمح بالنوافذ المنبثقة أو ادخل ببيانات المكتب أدناه.';
  }
  if (combined.includes('network-request-failed')) {
    return 'تعذر الاتصال بخوادم Google. تحقق من اتصال الإنترنت وحاول مجدداً.';
  }
  if (combined.includes('operation-not-allowed')) {
    return 'تسجيل الدخول عبر Google غير مفعّل في Firebase Console > Authentication > Sign-in method.';
  }
  return code
    ? `تعذر تسجيل الدخول بحساب Google (${code}). يمكنك الدخول مباشرة ببيانات المكتب أدناه.`
    : 'تعذر تسجيل الدخول بحساب Google حالياً. يمكنك الدخول مباشرة ببيانات المكتب أدناه.';
}

export function FirebaseProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [isFirebaseAdmin, setIsFirebaseAdmin] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    void getRedirectResult(auth).catch((error) => {
      setAuthError(formatFirebaseAuthError(error));
    });

    const unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser);
      if (!nextUser) {
        setIsFirebaseAdmin(false);
        setAuthReady(true);
        return;
      }

      const admin = await resolveFirebaseAdminStatus(nextUser);
      setIsFirebaseAdmin(admin);
      setAuthReady(true);
    });

    return () => unsubscribe();
  }, []);

  async function signInWithGoogle(): Promise<GoogleSignInOutcome | null> {
    setAuthLoading(true);
    setAuthError(null);
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });

    try {
      const result = await signInWithPopup(auth, provider);
      const admin = await resolveFirebaseAdminStatus(result.user);
      setIsFirebaseAdmin(admin);
      return { user: result.user, isAdmin: admin };
    } catch (error) {
      const code =
        typeof error === 'object' && error !== null && 'code' in error
          ? String((error as { code?: unknown }).code ?? '')
          : '';
      const isTopLevelWindow =
        typeof window !== 'undefined' && window.self === window.top;

      if (
        isTopLevelWindow &&
        (code === 'auth/popup-blocked' ||
          code === 'auth/operation-not-supported-in-this-environment')
      ) {
        try {
          await signInWithRedirect(auth, provider);
          return null;
        } catch (redirectError) {
          setAuthError(formatFirebaseAuthError(redirectError));
          return null;
        }
      }

      setAuthError(formatFirebaseAuthError(error));
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
