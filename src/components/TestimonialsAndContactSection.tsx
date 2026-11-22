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
  ASSET_IMAGES,
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
      setErrorMsg(
        lang === 'ar' ? 'يرجى إدخال الاسم الكامل.' : 'Please enter your full name.'
      );
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
              {lang === 'ar' ? 'ثقة الموكلين' : 'Client Outcomes & Testimonials'}
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#0B132B] [text-wrap:balance] font-display-en">
              {lang === 'ar'
                ? 'آراء موكلينا ونتائج حقيقية في المحاكم الأردنية'
                : 'Trusted by Individuals & Companies Across Northern Jordan'}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((item) => (
              <article
                key={item.id}
                className="bg-[#F8FAFC] rounded-2xl p-6 border border-slate-200 flex flex-col justify-between gap-5"
              >
                <div className="space-y-4">
                  <Quote className="w-6 h-6 text-[#C5A059]" aria-hidden="true" />
                  <p className="text-sm sm:text-base text-slate-700 leading-relaxed">
                    “{item.quote[lang]}”
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-200 space-y-1">
                  <div className="text-sm font-bold text-[#0B132B]">
                    {item.clientName[lang]}
                  </div>
                  <div className="text-xs text-slate-500 flex flex-wrap items-center gap-1.5">
                    <span>{item.caseType[lang]}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-semibold text-[#0B132B]">
                      {item.outcome[lang]}
                    </span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Location, Map & Contact Section */}
      <section id="contact" className="bg-[#0B132B] text-white py-14 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
            {/* Location Card + Interactive Architectural Map of Irbid 30th St */}
            <div className="lg:col-span-7 space-y-6">
              <div className="space-y-3">
                <p className="text-xs sm:text-sm font-bold text-[#C5A059]">
                  {lang === 'ar' ? 'تواصل معنا' : 'Contact Us'}
                </p>
                <h2 className="text-2xl sm:text-3xl font-bold text-white [text-wrap:balance] font-display-en leading-snug">
                  {lang === 'ar'
                    ? 'نصغي إليكم أولاً، ثم نعمل بأمانة وإخلاص، لأن ثقتكم هي رأس مالنا الحقيقي.'
                    : 'We listen to you first, then work with honesty and dedication — because your trust is our true capital.'}
                </h2>
                <p className="text-sm sm:text-base text-[#C5A059] font-bold">
                  {UI_COPY.closingMotto[lang]}
                </p>
              </div>

              {/* Real Interactive Google Maps Embed + Exterior Photo Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 items-stretch">
                <div className="sm:col-span-2 rounded-2xl overflow-hidden border border-white/15 bg-[#121D3D] min-h-[240px]">
                  <img
                    src={ASSET_IMAGES.irbidOffice}
                    alt={
                      lang === 'ar'
                        ? 'مبنى شركة الرضوان للتحكيم والمحاماة في إربد شارع الثلاثين - عمارة علاء الدين سنتر'
                        : 'Al-Radwan Arbitration & Law Firm building exterior in Irbid 30th Street - Alaa Al-Din Center'
                    }
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Real Interactive Google Maps Embed (Free iframe, No API Key) */}
                <div className="sm:col-span-3 rounded-2xl overflow-hidden border border-white/15 bg-[#111B38] flex flex-col justify-between">
                  <div className="px-4 py-3 border-b border-white/10 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-xs font-semibold text-[#C5A059]">
                      <Navigation className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                      <span className="font-mono-data" dir="ltr">
                        32.5517807° N, 35.8628263° E
                      </span>
                    </div>
                    <span className="text-[11px] font-medium text-slate-300 font-mono-data">
                      {lang === 'ar' ? 'HV27+P3 إربد، الأردن' : 'HV27+P3 Irbid, Jordan'}
                    </span>
                  </div>

                  <div className="relative h-60 flex-1 min-h-[230px] bg-[#0E1730]">
                    <iframe
                      title={
                        lang === 'ar'
                          ? 'خريطة موقع شركة الرضوان في إربد - شارع الثلاثين - عمارة علاء الدين سنتر'
                          : 'Google Map of Al-Radwan Law Firm — Irbid, 30th Street, Alaa Al-Din Center'
                      }
                      src={`https://maps.google.com/maps?q=32.5517807,35.8628263&hl=${lang}&z=17&output=embed`}
                      loading="lazy"
                      allowFullScreen
                      referrerPolicy="no-referrer-when-downgrade"
                      className="w-full h-full border-0"
                    />
                  </div>

                  <div className="px-4 py-3 bg-[#0D1631] border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="text-slate-200 font-medium">
                      {lang === 'ar'
                        ? 'إربد – شارع الثلاثين – عمارة علاء الدين سنتر'
                        : 'Irbid – 30th Street – Alaa Al-Din Center'}
                    </span>
                    <a
                      href="https://www.google.com/maps/search/?api=1&query=32.5517807,35.8628263"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[#C5A059] hover:underline font-semibold shrink-0"
                    >
                      <span>{lang === 'ar' ? 'فتح في خرائط جوجل' : 'Open in Google Maps'}</span>
                      <ExternalLink className="w-3 h-3" aria-hidden="true" />
                    </a>
                  </div>
                </div>
              </div>

              {/* Contact Details Strip */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                <div className="rounded-xl p-4 bg-white/5 border border-white/10 space-y-1">
                  <div className="flex items-center gap-2 text-xs font-semibold text-[#C5A059]">
                    <MapPin className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span>{lang === 'ar' ? 'العنوان' : 'Address'}</span>
                  </div>
                  <p className="text-sm font-semibold text-slate-100">
                    {FIRM_CONTACT.addressShort[lang]}
                  </p>
                  <p className="text-xs text-slate-300">
                    {FIRM_CONTACT.addressDetailed[lang]}
                  </p>
                </div>

                <div className="rounded-xl p-4 bg-white/5 border border-white/10 space-y-1">
                  <div className="flex items-center gap-2 text-xs font-semibold text-[#C5A059]">
                    <Phone className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span>{lang === 'ar' ? 'للتواصل والاستفسار' : 'Direct Phone & WhatsApp'}</span>
                  </div>
                  <a
                    href={FIRM_CONTACT.phoneHref}
                    dir="ltr"
                    className="block text-base font-bold text-white hover:text-[#C5A059] font-mono-data transition-colors"
                  >
                    {FIRM_CONTACT.phoneDisplay}
                  </a>
                  <p className="text-xs text-slate-300">
                    {lang === 'ar' ? 'استشارتك الأولية مجانية بالكامل' : '100% Free Initial Consultation'}
                  </p>
                </div>

                <div className="rounded-xl p-4 bg-white/5 border border-white/10 space-y-1">
                  <div className="flex items-center gap-2 text-xs font-semibold text-[#C5A059]">
                    <Clock className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span>{lang === 'ar' ? 'ساعات الدوام' : 'Office Hours'}</span>
                  </div>
                  <p className="text-sm text-slate-100">
                    {lang === 'ar' ? 'الأحد - الخميس: 9 ص - 5 م' : 'Sun – Thu: 9 AM – 5 PM'}
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Inquiry Form */}
            <div className="lg:col-span-5 bg-white text-[#0B132B] rounded-2xl p-6 sm:p-8 border border-slate-200">
              <div className="space-y-1.5 mb-5">
                <h3 className="text-xl font-bold">
                  {lang === 'ar' ? 'أرسل استفساراً سريعاً للفريق' : 'Send a Quick Legal Inquiry'}
                </h3>
                <p className="text-sm text-slate-600">
                  {lang === 'ar'
                    ? 'سيتواصل معك المحامي المختص خلال ساعات العمل الرسمية.'
                    : 'A specialized attorney from our Irbid team will respond promptly.'}
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
                        ? 'تم استلام رسالتك وإرسال إشعار فوري لفريق شركة الرضوان للتحكيم والمحاماة. يمكنك أيضاً حجز موعد استشارة مجانية مباشرة.'
                        : 'Your inquiry has been received and forwarded instantly to our legal team. You can also book a free consultation slot.'
                      : lang === 'ar'
                        ? 'تم تسجيل طلبك لدى فريق شركة الرضوان للتحكيم والمحاماة. يمكنك أيضاً حجز موعد استشارة مجانية مباشرة.'
                        : 'Your inquiry has been logged for our legal team. You can also confirm a free consultation slot immediately.'}
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
                      {lang === 'ar' ? 'نوع القضية' : 'Practice Area'}
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
                    <p role="alert" className="text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
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
                          ? 'إرسال للفريق القانوني'
                          : 'Send to Legal Team'}
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
