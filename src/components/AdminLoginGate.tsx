import { useEffect, useState, type FormEvent } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Cloud,
  Eye,
  EyeOff,
  Globe,
  Loader2,
  Lock,
  Scale,
  ShieldCheck,
  User,
} from 'lucide-react';
import type { Language } from '../types/legal.js';
import { UI_COPY } from '../data/firmContent.js';
import { verifyAdminCredentials } from '../utils/legalWorkflow.js';
import { useFirebase } from '../context/FirebaseContext.js';
import { BOOTSTRAP_ADMIN_EMAIL } from '../firebase.js';

interface AdminLoginGateProps {
  lang: Language;
  onLoginSuccess: () => void;
  onExitToPublic: () => void;
  onToggleLanguage: () => void;
}

export function AdminLoginGate({
  lang,
  onLoginSuccess,
  onExitToPublic,
  onToggleLanguage,
}: AdminLoginGateProps) {
  const {
    user,
    authReady,
    isFirebaseAdmin,
    authLoading,
    authError,
    signInWithGoogle,
    signOutFirebase,
    clearAuthError,
  } = useFirebase();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const BackIcon = lang === 'ar' ? ArrowRight : ArrowLeft;

  useEffect(() => {
    if (!authReady || !user) return;
    if (isFirebaseAdmin) {
      onLoginSuccess();
    }
  }, [authReady, user, isFirebaseAdmin, onLoginSuccess]);

  async function handleGoogleLogin() {
    setErrorMsg('');
    clearAuthError();
    const signedUser = await signInWithGoogle();
    if (!signedUser) return;
    if (
      signedUser.emailVerified &&
      signedUser.email?.toLowerCase() === BOOTSTRAP_ADMIN_EMAIL
    ) {
      onLoginSuccess();
      return;
    }
    if (!isFirebaseAdmin) {
      setErrorMsg(
        lang === 'ar'
          ? 'هذا الحساب غير مدرج ضمن صلاحيات إدارة شركة الرضوان في Firebase. يرجى الدخول بحساب الإدارة المعتمد أو ببيانات المكتب.'
          : 'This Google account is not authorized as a firm administrator in Firebase. Please sign in with the authorized admin account or use firm credentials.'
      );
      await signOutFirebase();
    }
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMsg('');
    clearAuthError();

    const formData = new FormData(e.currentTarget);
    const submittedUsername = username || String(formData.get('username') ?? '');
    const submittedPassword = password || String(formData.get('password') ?? '');

    if (!submittedUsername.trim() || !submittedPassword.trim()) {
      setErrorMsg(
        lang === 'ar'
          ? 'يرجى إدخال اسم المستخدم وكلمة المرور.'
          : 'Please enter both username and password.'
      );
      return;
    }

    if (!verifyAdminCredentials(submittedUsername, submittedPassword)) {
      setErrorMsg(
        lang === 'ar'
          ? 'اسم المستخدم أو كلمة المرور غير صحيحة. تأكد من الكتابة بالأحرف الإنجليزية وحاول مجدداً.'
          : 'Invalid username or password. Please check your credentials and try again.'
      );
      return;
    }

    onLoginSuccess();
  }

  return (
    <div className="min-h-screen bg-[#0B132B] text-white flex flex-col justify-between">
      {/* Top Minimal Utility Bar */}
      <header className="border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-8 h-8 rounded bg-[#C5A059] text-[#0B132B] flex items-center justify-center shrink-0">
              <Scale className="w-4 h-4" aria-hidden="true" />
            </span>
            <span className="text-sm sm:text-base font-bold truncate font-display-en">
              {UI_COPY.brandShort[lang]}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onToggleLanguage}
              className="min-h-[40px] px-3 py-1.5 rounded-lg border border-white/20 hover:border-[#C5A059] text-xs sm:text-sm font-semibold text-white flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Globe className="w-3.5 h-3.5 text-[#C5A059]" aria-hidden="true" />
              <span>{lang === 'ar' ? 'English' : 'العربية'}</span>
            </button>
            <button
              type="button"
              onClick={onExitToPublic}
              className="min-h-[40px] px-3.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 border border-white/15 text-xs sm:text-sm font-semibold text-slate-100 flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
            >
              <BackIcon className="w-4 h-4 text-[#C5A059]" aria-hidden="true" />
              <span>{lang === 'ar' ? 'العودة للموقع' : 'Public Site'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Centered Royal Login Card */}
      <main className="flex-1 flex items-center justify-center px-4 py-10 sm:py-14">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-[#C5A059]/15 border border-[#C5A059]/40 text-[#C5A059] flex items-center justify-center mx-auto">
              <ShieldCheck className="w-7 h-7" aria-hidden="true" />
            </div>
            <p className="text-xs font-bold text-[#C5A059] tracking-wide">
              {lang === 'ar'
                ? 'بوابة خاصة بفريق شركة الرضوان فقط'
                : 'Al-Radwan Legal Team Private Portal'}
            </p>
            <h1 className="text-2xl sm:text-3xl font-bold text-white font-display-en">
              {lang === 'ar' ? 'تسجيل دخول المحامين' : 'Attorney Portal Sign In'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300">
              {lang === 'ar'
                ? 'أدخل بيانات الدخول المعتمدة لإدارة المواعيد ومتابعة ملفات القضايا.'
                : 'Enter your authorized credentials to manage consultations and legal cases.'}
            </p>
          </div>

          <div className="bg-white text-[#0B132B] rounded-2xl border border-[#C5A059]/30 shadow-2xl shadow-black/40 p-6 sm:p-8 space-y-5">
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={authLoading}
              className="w-full min-h-[48px] px-4 py-2.5 rounded-xl bg-[#0B132B] hover:bg-[#14224a] disabled:opacity-60 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2.5 transition-colors cursor-pointer"
            >
              {authLoading ? (
                <Loader2 className="w-4 h-4 animate-spin text-[#C5A059]" aria-hidden="true" />
              ) : (
                <Cloud className="w-4 h-4 text-[#C5A059]" aria-hidden="true" />
              )}
              <span>
                {lang === 'ar'
                  ? 'الدخول بحساب Google (قاعدة بيانات Firebase السحابية)'
                  : 'Sign In with Google (Firebase Cloud Database)'}
              </span>
            </button>

            <div className="relative flex items-center justify-center">
              <div className="border-t border-slate-200 w-full" />
              <span className="bg-white px-3 text-[11px] font-semibold text-slate-400 whitespace-nowrap">
                {lang === 'ar' ? 'أو الدخول ببيانات المكتب' : 'OR SIGN IN WITH FIRM CREDENTIALS'}
              </span>
              <div className="border-t border-slate-200 w-full" />
            </div>

            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              <div>
                <label
                  htmlFor="admin-username"
                  className="block text-xs font-bold text-slate-700 mb-1.5"
                >
                  {lang === 'ar' ? 'اسم المستخدم' : 'Username'}
                </label>
                <div className="relative">
                  <User
                    className="w-4 h-4 text-slate-400 absolute top-1/2 -translate-y-1/2 start-3.5"
                    aria-hidden="true"
                  />
                  <input
                    id="admin-username"
                    name="username"
                    type="text"
                    dir="ltr"
                    autoComplete="username"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value);
                      if (errorMsg) setErrorMsg('');
                    }}
                    placeholder={lang === 'ar' ? 'أدخل اسم المستخدم' : 'Enter username'}
                    className="w-full min-h-[48px] ps-10 pe-4 py-2.5 rounded-xl border border-slate-300 text-sm font-mono-data focus:outline-none focus:ring-2 focus:ring-[#C5A059] focus:border-[#C5A059]"
                    required
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="admin-password"
                  className="block text-xs font-bold text-slate-700 mb-1.5"
                >
                  {lang === 'ar' ? 'كلمة المرور' : 'Password'}
                </label>
                <div className="relative">
                  <Lock
                    className="w-4 h-4 text-slate-400 absolute top-1/2 -translate-y-1/2 start-3.5"
                    aria-hidden="true"
                  />
                  <input
                    id="admin-password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    dir="ltr"
                    autoComplete="current-password"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (errorMsg) setErrorMsg('');
                    }}
                    placeholder="••••••••••••"
                    className="w-full min-h-[48px] ps-10 pe-12 py-2.5 rounded-xl border border-slate-300 text-sm font-mono-data focus:outline-none focus:ring-2 focus:ring-[#C5A059] focus:border-[#C5A059]"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={
                      showPassword
                        ? lang === 'ar'
                          ? 'إخفاء كلمة المرور'
                          : 'Hide password'
                        : lang === 'ar'
                          ? 'إظهار كلمة المرور'
                          : 'Show password'
                    }
                    className="min-h-[40px] min-w-[40px] absolute top-1/2 -translate-y-1/2 end-1.5 flex items-center justify-center rounded-lg text-slate-500 hover:text-[#0B132B] cursor-pointer"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" aria-hidden="true" />
                    ) : (
                      <Eye className="w-4 h-4" aria-hidden="true" />
                    )}
                  </button>
                </div>
              </div>

              {(errorMsg || authError) && (
                <div
                  role="alert"
                  className="rounded-xl bg-red-50 border border-red-200 px-3.5 py-3 flex items-start gap-2 text-xs sm:text-sm font-semibold text-red-800"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                  <span>{errorMsg || authError}</span>
                </div>
              )}

              <button
                type="submit"
                className="w-full min-h-[50px] px-6 py-3 rounded-xl bg-[#C5A059] hover:bg-[#d4b06a] text-[#0B132B] font-bold text-sm sm:text-base transition-colors shadow-lg shadow-[#0B132B]/10 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B132B]"
              >
                {lang === 'ar' ? 'دخول إلى لوحة التحكم' : 'Sign In to Dashboard'}
              </button>
            </form>
          </div>
        </div>
      </main>

      {/* Subtle Footer */}
      <footer className="py-5 text-center text-xs text-slate-400 border-t border-white/10">
        {UI_COPY.brandFull[lang]} · {UI_COPY.slogan[lang]}
      </footer>
    </div>
  );
}
