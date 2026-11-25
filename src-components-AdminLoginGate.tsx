import { useState, type FormEvent } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  Globe,
  Loader2,
  Lock,
  ShieldCheck,
  User,
} from 'lucide-react';
import type { AuthSessionUser, Language } from '../types/legal.js';
import { ASSET_IMAGES, UI_COPY } from '../data/firmContent.js';

interface AdminLoginGateProps {
  lang: Language;
  onLoginSuccess: (session: { token: string; user: AuthSessionUser }) => void;
  onExitToPublic: () => void;
  onToggleLanguage: () => void;
}

export function AdminLoginGate({
  lang,
  onLoginSuccess,
  onExitToPublic,
  onToggleLanguage,
}: AdminLoginGateProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const BackIcon = lang === 'ar' ? ArrowRight : ArrowLeft;

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMsg('');

    const cleanUser = username.trim();
    const cleanPass = password.trim();
    if (!cleanUser || !cleanPass) {
      setErrorMsg(
        lang === 'ar'
          ? 'يرجى إدخال اسم المستخدم وكلمة المرور.'
          : 'Please enter both username and password.'
      );
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username: cleanUser, password: cleanPass }),
      });

      const data = (await res.json().catch(() => ({}))) as {
        token?: string;
        user?: AuthSessionUser;
        error?: string;
      };

      if (!res.ok || !data.token || !data.user) {
        setErrorMsg(
          lang === 'ar'
            ? 'بيانات الدخول غير صحيحة أو الحساب غير مصرح له.'
            : data.error || 'Invalid credentials or unauthorized account.'
        );
        return;
      }

      onLoginSuccess({ token: data.token, user: data.user });
    } catch {
      setErrorMsg(
        lang === 'ar'
          ? 'تعذر الاتصال بخادم المصادقة. تأكد من تشغيل الخادم وحاول مجدداً.'
          : 'Unable to reach authentication server.'
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0B132B] text-white flex flex-col justify-between">
      <header className="border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <img
              src={ASSET_IMAGES.logoCrownEmblem}
              alt={UI_COPY.brandShort[lang]}
              className="h-9 w-auto object-contain rounded shrink-0"
            />
            <div className="min-w-0 leading-tight">
              <span className="block text-sm font-bold truncate font-display-en">
                {UI_COPY.brandShort[lang]}
              </span>
              <span className="block text-[10px] font-bold text-[#C5A059] font-mono-data">
                {UI_COPY.brandAbbr}
              </span>
            </div>
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

      <main className="flex-1 flex items-center justify-center px-4 py-10 sm:py-14">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-[#C5A059]/15 border border-[#C5A059]/40 text-[#C5A059] flex items-center justify-center mx-auto">
              <ShieldCheck className="w-7 h-7" aria-hidden="true" />
            </div>
            <p className="text-xs font-bold text-[#C5A059] tracking-wide">
              {lang === 'ar'
                ? 'بوابة داخلية مؤمّنة — للمحامين المسجلين فقط'
                : 'Secured Internal Portal — Registered Attorneys Only'}
            </p>
            <h1 className="text-2xl sm:text-3xl font-bold text-white font-display-en">
              {lang === 'ar' ? 'تسجيل دخول المحامين و RB AI' : 'Attorney & RB AI Sign In'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300">
              {lang === 'ar'
                ? 'مصادقة محمية بالصلاحيات (RBAC) للوصول إلى القضايا، الترويسة الرسمية، والمساعد القانوني الذكي.'
                : 'Role-based authenticated access to case files, official letterhead engine, and RB AI.'}
            </p>
          </div>

          <div className="bg-white text-[#0B132B] rounded-2xl border border-[#C5A059]/30 shadow-2xl shadow-black/40 p-6 sm:p-8 space-y-5">
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
                    placeholder="alradwan"
                    className="w-full min-h-[48px] ps-10 pe-4 py-2.5 rounded-xl border border-slate-300 text-sm font-mono-data focus:outline-none focus:ring-2 focus:ring-[#C5A059]"
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
                    className="w-full min-h-[48px] ps-10 pe-12 py-2.5 rounded-xl border border-slate-300 text-sm font-mono-data focus:outline-none focus:ring-2 focus:ring-[#C5A059]"
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
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {errorMsg && (
                <div
                  role="alert"
                  className="rounded-xl bg-red-50 border border-red-200 px-3.5 py-3 flex items-start gap-2 text-xs sm:text-sm font-semibold text-red-800"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full min-h-[50px] px-6 py-3 rounded-xl bg-[#C5A059] hover:bg-[#d4b06a] disabled:opacity-60 text-[#0B132B] font-bold text-sm sm:text-base transition-colors shadow-lg shadow-[#0B132B]/10 flex items-center justify-center gap-2 cursor-pointer"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>{lang === 'ar' ? 'دخول إلى المكتب الرقمي' : 'Sign In to Legal Portal'}</span>
              </button>
            </form>
          </div>
        </div>
      </main>

      <footer className="py-5 text-center text-xs text-slate-400 border-t border-white/10">
        {UI_COPY.brandFull[lang]} · {UI_COPY.slogan[lang]}
      </footer>
    </div>
  );
}
