import { useState, type FormEvent } from 'react';
import {
  CheckCircle2,
  Clock,
  ExternalLink,
  MapPin,
  Navigation,
  Phone,
  Quote,
  Send,
} from 'lucide-react';
import type { Language, SpecialtyId } from '../types/legal.js';
import {
  FIRM_CONTACT,
  SPECIALTIES,
  TESTIMONIALS,
  UI_COPY,
} from '../data/firmContent.js';
import { isValidJordanianPhone } from '../utils/legalWorkflow.js';

interface TestimonialsAndContactSectionProps {
  lang: Language;
  onBookClick: () => void;
}

export function TestimonialsAndContactSection({
  lang,
  onBookClick,
}: TestimonialsAndContactSectionProps) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [specialtyId, setSpecialtyId] = useState<SpecialtyId>('civil');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [telegramDelivered, setTelegramDelivered] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  async function handleInquirySubmit(e: FormEvent) {
    e.preventDefault();
    setErrorMsg('');
    if (name.trim().length < 2) {
      setSubmitStatus('error');
      setErrorMsg(lang === 'ar' ? 'يرجى إدخال الاسم الكامل.' : 'Please enter your full name.');
      return;
    }
    if (!isValidJordanianPhone(phone)) {
      setSubmitStatus('error');
      setErrorMsg(
        lang === 'ar'
          ? 'يرجى إدخال رقم هاتف أردني صحيح يبدأ بـ 07.'
          : 'Please enter a valid Jordanian mobile number (07XXXXXXXX).'
      );
      return;
    }
    if (message.trim().length < 5) {
      setSubmitStatus('error');
      setErrorMsg(
        lang === 'ar'
          ? 'يرجى كتابة نبذة مختصرة عن استفسارك.'
          : 'Please write a brief summary of your inquiry.'
      );
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          specialtyId,
          message: message.trim(),
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        telegramDelivered?: boolean;
      };
      if (!res.ok) {
        throw new Error(data.error || 'Submission failed');
      }
      setTelegramDelivered(Boolean(data.telegramDelivered));
      setSubmitStatus('success');
      setName('');
      setPhone('');
      setMessage('');
    } catch (err: unknown) {
      setSubmitStatus('error');
      setErrorMsg(
        err instanceof Error
          ? err.message
          : lang === 'ar'
            ? 'تعذر إرسال الرسالة، حاول مجدداً.'
            : 'Unable to submit message. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      {/* Testimonials Section */}
      <section className="bg-white py-14 sm:py-20 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mb-10 space-y-2">
            <p className="text-xs sm:text-sm font-bold text-[#C5A059]">
              {lang === 'ar' ? 'ثقة الموكلين' : 'Client Trust & Outcomes'}
            </p>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0B132B] [text-wrap:balance] font-display-en">
              {lang === 'ar'
                ? 'شهادات موكلين في عمّان وإربد'
                : 'Trusted by Individuals & Companies Across Jordan'}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((item) => (
              <article
                key={item.id}
                className="bg-[#FAF8F3] rounded-2xl p-6 border border-slate-200 flex flex-col justify-between gap-5"
              >
                <div className="space-y-4">
                  <Quote className="w-6 h-6 text-[#C5A059]" aria-hidden="true" />
                  <p className="text-sm sm:text-base text-slate-700 leading-relaxed">
                    “{item.quote[lang]}”
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-200 space-y-1">
                  <div className="text-sm font-bold text-[#0B132B]">{item.clientName[lang]}</div>
                  <div className="text-xs text-slate-500 flex flex-wrap items-center gap-1.5">
                    <span>{item.caseType[lang]}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-semibold text-[#0B132B]">{item.outcome[lang]}</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Dual Branches (Irbid & Amman) + Maps + Contact Section */}
      <section id="contact" className="bg-[#0B132B] text-white py-14 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
            <div className="space-y-2 max-w-3xl">
              <p className="text-xs sm:text-sm font-bold text-[#C5A059]">
                {lang === 'ar' ? 'فروع الشركة وبيانات الاتصال' : 'Our Offices & Direct Contact'}
              </p>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white [text-wrap:balance] font-display-en leading-snug">
                {lang === 'ar'
                  ? 'فروع شركة الرضوان للقانون والتحكيم في عمّان وإربد'
                  : 'Al-Radwan Law & Arbitration Offices in Amman & Irbid'}
              </h2>
              <p className="text-sm sm:text-base text-slate-300">
                {lang === 'ar'
                  ? 'للتواصل المباشر وحجز المواعيد في أي من الفرعين عبر رقم المكتب الرسمي الموحد.'
                  : 'Reach either branch or request a consultation through our unified official office line.'}
              </p>
            </div>

            <a
              href={FIRM_CONTACT.phoneHref}
              dir="ltr"
              className="inline-flex items-center justify-center gap-2.5 min-h-[48px] px-5 py-2.5 rounded-xl bg-[#C5A059] hover:bg-[#d4b06a] text-[#0B132B] font-mono-data font-extrabold text-base shrink-0 transition-colors"
            >
              <Phone className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>{FIRM_CONTACT.phoneDisplay}</span>
            </a>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Two Official Branches with Google Maps & Directions */}
            <div className="lg:col-span-7 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {FIRM_CONTACT.branches.map((branch) => (
                  <div
                    key={branch.id}
                    className="rounded-2xl overflow-hidden border border-white/15 bg-[#111B38] flex flex-col justify-between"
                  >
                    <div className="px-4 py-3.5 border-b border-white/10 space-y-1">
                      <span className="inline-block text-[11px] font-bold text-[#C5A059]">
                        {branch.badge[lang]}
                      </span>
                      <h3 className="text-base font-bold text-white flex items-center gap-1.5">
                        <MapPin className="w-4 h-4 text-[#C5A059] shrink-0" aria-hidden="true" />
                        <span>{branch.name[lang]}</span>
                      </h3>
                      <p className="text-xs sm:text-sm text-slate-200">{branch.address[lang]}</p>
                    </div>

                    <div className="h-52 bg-[#0E1730]">
                      <iframe
                        title={`${branch.name[lang]} — ${branch.address[lang]}`}
                        src={branch.embedUrl}
                        loading="lazy"
                        allowFullScreen
                        referrerPolicy="no-referrer-when-downgrade"
                        className="w-full h-full border-0"
                      />
                    </div>

                    <div className="px-4 py-3 bg-[#0D1631] border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs">
                      <a
                        href={branch.directionsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-[#C5A059] hover:underline font-bold"
                      >
                        <Navigation className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>{lang === 'ar' ? 'الاتجاهات على Google Maps' : 'Get Directions'}</span>
                        <ExternalLink className="w-3 h-3" aria-hidden="true" />
                      </a>

                      <a
                        href={FIRM_CONTACT.phoneHref}
                        dir="ltr"
                        className="inline-flex items-center gap-1 text-white hover:text-[#C5A059] font-mono-data font-bold"
                      >
                        <Phone className="w-3.5 h-3.5 text-[#C5A059]" aria-hidden="true" />
                        <span>{FIRM_CONTACT.phoneDisplay}</span>
                      </a>
                    </div>
                  </div>
                ))}
              </div>

              {/* Official Office Hours & Unified Contact Strip */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-xl p-4 bg-white/5 border border-white/10 space-y-1">
                  <div className="flex items-center gap-2 text-xs font-semibold text-[#C5A059]">
                    <Phone className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span>{lang === 'ar' ? 'رقم المكتب الرسمي' : 'Official Office Phone'}</span>
                  </div>
                  <a
                    href={FIRM_CONTACT.phoneHref}
                    dir="ltr"
                    className="block text-lg font-bold text-white hover:text-[#C5A059] font-mono-data transition-colors"
                  >
                    {FIRM_CONTACT.phoneDisplay}
                  </a>
                  <p className="text-xs text-slate-300">
                    {lang === 'ar'
                      ? 'الرقم المعتمد لكافة الاستفسارات والمواعيد في عمّان وإربد'
                      : 'Unified firm line for Amman & Irbid branches'}
                  </p>
                </div>

                <div className="rounded-xl p-4 bg-white/5 border border-white/10 space-y-1">
                  <div className="flex items-center gap-2 text-xs font-semibold text-[#C5A059]">
                    <Clock className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span>{lang === 'ar' ? 'ساعات الدوام الرسمي' : 'Office Hours'}</span>
                  </div>
                  <p className="text-sm font-semibold text-slate-100">
                    {lang === 'ar'
                      ? 'الأحد – الخميس: 9:00 صباحاً – 5:00 مساءً'
                      : 'Sun – Thu: 9:00 AM – 5:00 PM'}
                  </p>
                  <p className="text-xs text-slate-300">{UI_COPY.closingMotto[lang]}</p>
                </div>
              </div>
            </div>

            {/* Quick Inquiry Form */}
            <div className="lg:col-span-5 bg-white text-[#0B132B] rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xl">
              <div className="space-y-1.5 mb-5">
                <h3 className="text-xl font-bold">
                  {lang === 'ar' ? 'أرسل استفساراً سريعاً للمكتب' : 'Send a Quick Legal Inquiry'}
                </h3>
                <p className="text-sm text-slate-600">
                  {lang === 'ar'
                    ? 'يصل استفسارك مباشرة إلى لوحة التحكم الداخلية ليتم التواصل معك من قبل المكتب.'
                    : 'Your inquiry is logged directly for prompt review by our legal office.'}
                </p>
              </div>

              {submitStatus === 'success' ? (
                <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-5 space-y-3">
                  <div className="flex items-center gap-2 text-emerald-800 font-bold">
                    <CheckCircle2 className="w-5 h-5 shrink-0" />
                    <span>
                      {lang === 'ar' ? 'تم استلام رسالتك بنجاح' : 'Inquiry Received Successfully'}
                    </span>
                  </div>
                  <p className="text-sm text-emerald-900">
                    {telegramDelivered
                      ? lang === 'ar'
                        ? 'تم استلام رسالتك وإرسال إشعار فوري لمكتب شركة الرضوان للقانون والتحكيم. يمكنك أيضاً طلب حجز موعد استشارة مباشرة.'
                        : 'Your inquiry has been received and forwarded to our office. You can also request a consultation appointment directly.'
                      : lang === 'ar'
                        ? 'تم تسجيل طلبك لدى مكتب شركة الرضوان للقانون والتحكيم. يمكنك أيضاً طلب حجز موعد استشارة مباشرة.'
                        : 'Your inquiry has been logged for our office. You can also request a consultation appointment directly.'}
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <button
                      type="button"
                      onClick={onBookClick}
                      className="min-h-[44px] px-4 py-2 rounded-lg bg-[#C5A059] text-[#0B132B] text-sm font-bold cursor-pointer"
                    >
                      {UI_COPY.hero.ctaPrimary[lang]}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSubmitStatus('idle');
                        setTelegramDelivered(false);
                      }}
                      className="min-h-[44px] px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-sm font-medium cursor-pointer"
                    >
                      {lang === 'ar' ? 'إرسال استفسار آخر' : 'Send Another'}
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleInquirySubmit} className="space-y-4">
                  <div>
                    <label htmlFor="inq-name" className="block text-xs font-bold text-slate-700 mb-1.5">
                      {lang === 'ar' ? 'الاسم الكامل' : 'Full Name'}
                    </label>
                    <input
                      id="inq-name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={lang === 'ar' ? 'الاسم الثلاثي' : 'Your full name'}
                      className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#C5A059]"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="inq-phone" className="block text-xs font-bold text-slate-700 mb-1.5">
                      {lang === 'ar' ? 'رقم الهاتف (الأردن)' : 'Jordanian Mobile Number'}
                    </label>
                    <input
                      id="inq-phone"
                      type="tel"
                      dir="ltr"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="079XXXXXXX"
                      className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-mono-data focus:outline-none focus:ring-2 focus:ring-[#C5A059]"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="inq-spec" className="block text-xs font-bold text-slate-700 mb-1.5">
                      {lang === 'ar' ? 'المجال القانوني' : 'Practice Area'}
                    </label>
                    <select
                      id="inq-spec"
                      value={specialtyId}
                      onChange={(e) => setSpecialtyId(e.target.value as SpecialtyId)}
                      className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#C5A059]"
                    >
                      {SPECIALTIES.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.title[lang]}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="inq-msg" className="block text-xs font-bold text-slate-700 mb-1.5">
                      {lang === 'ar' ? 'ملخص مختصر للاستفسار' : 'Brief Inquiry Summary'}
                    </label>
                    <textarea
                      id="inq-msg"
                      rows={3}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder={
                        lang === 'ar'
                          ? 'اكتب تفاصيل مختصرة حول موضوعك القانوني...'
                          : 'Briefly describe your legal question...'
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#C5A059]"
                      required
                    />
                  </div>

                  {submitStatus === 'error' && errorMsg && (
                    <p
                      role="alert"
                      className="text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2"
                    >
                      {errorMsg}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full min-h-[48px] px-5 py-3 rounded-xl bg-[#0B132B] hover:bg-[#162247] disabled:opacity-60 text-white font-bold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <Send className="w-4 h-4 text-[#C5A059]" aria-hidden="true" />
                    <span>
                      {submitting
                        ? lang === 'ar'
                          ? 'جاري الإرسال...'
                          : 'Sending...'
                        : lang === 'ar'
                          ? 'إرسال للمكتب'
                          : 'Send to Firm'}
                    </span>
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
