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
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import type { Language, SpecialtyId } from '../types/legal';
import {
  ASSET_IMAGES,
  FIRM_CONTACT,
  SPECIALTIES,
  TESTIMONIALS,
  UI_COPY,
} from '../data/firmContent';
import { isValidJordanianPhone } from '../utils/legalWorkflow';

interface TestimonialsAndContactSectionProps {
  lang: Language;
  onBookClick: () => void;
}

export function TestimonialsAndContactSection({
  lang,
  onBookClick,
}: TestimonialsAndContactSectionProps) {
  const [mapZoom, setMapZoom] = useState(1);
  const [selectedLandmark, setSelectedLandmark] = useState<'firm' | 'officers' | 'street30'>('firm');

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [specialtyId, setSpecialtyId] = useState<SpecialtyId>('civil');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
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
        body: JSON.stringify({ name, phone, specialtyId, message }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error || 'Submission failed');
      }
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

              {/* Interactive Architectural Street Map + Exterior Photo Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 items-stretch">
                <div className="sm:col-span-2 rounded-2xl overflow-hidden border border-white/15 bg-[#121D3D] min-h-[210px]">
                  <img
                    src={ASSET_IMAGES.irbidOffice}
                    alt={
                      lang === 'ar'
                        ? 'مبنى شركة الرضوان للتحكيم والمحاماة في إربد شارع الثلاثين'
                        : 'Al-Radwan Arbitration & Law Firm building exterior in Irbid 30th Street'
                    }
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Custom Interactive Street Map of Irbid 30th Street */}
                <div className="sm:col-span-3 rounded-2xl overflow-hidden border border-white/15 bg-[#111B38] flex flex-col justify-between">
                  <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-xs font-semibold text-[#C5A059]">
                      <Navigation className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                      <span className="font-mono-data">32.5385° N, 35.8572° E</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setMapZoom((z) => Math.max(0.9, Number((z - 0.15).toFixed(2))))}
                        aria-label={lang === 'ar' ? 'تصغير الخريطة' : 'Zoom out map'}
                        className="w-8 h-8 rounded bg-white/10 hover:bg-white/20 flex items-center justify-center text-white cursor-pointer"
                      >
                        <ZoomOut className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setMapZoom((z) => Math.min(1.45, Number((z + 0.15).toFixed(2))))}
                        aria-label={lang === 'ar' ? 'تكبير الخريطة' : 'Zoom in map'}
                        className="w-8 h-8 rounded bg-white/10 hover:bg-white/20 flex items-center justify-center text-white cursor-pointer"
                      >
                        <ZoomIn className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="relative h-52 overflow-hidden bg-[#0E1730] flex items-center justify-center">
                    <svg
                      viewBox="0 0 400 220"
                      className="w-full h-full transition-transform duration-200"
                      style={{ transform: `scale(${mapZoom})` }}
                      role="img"
                      aria-label={
                        lang === 'ar'
                          ? 'خريطة موقع شركة الرضوان في شارع الثلاثين بجانب نادي الضباط إربد'
                          : 'Map showing Al-Radwan Arbitration & Law Firm on 30th Street next to Officers Club, Irbid'
                      }
                    >
                      {/* Architectural city blocks */}
                      <rect x="0" y="0" width="400" height="220" fill="#0E1730" />
                      <g stroke="#1E2B4D" strokeWidth="1">
                        <rect x="25" y="20" width="95" height="65" rx="6" fill="#132043" />
                        <rect x="145" y="20" width="110" height="65" rx="6" fill="#132043" />
                        <rect x="280" y="20" width="95" height="65" rx="6" fill="#132043" />
                        <rect x="25" y="135" width="120" height="65" rx="6" fill="#132043" />
                        <rect x="170" y="135" width="205" height="65" rx="6" fill="#132043" />
                      </g>

                      {/* 30th Street Horizontal Corridor */}
                      <rect x="0" y="96" width="400" height="28" fill="#1B2952" />
                      <line
                        x1="0"
                        y1="110"
                        x2="400"
                        y2="110"
                        stroke="#C5A059"
                        strokeOpacity="0.45"
                        strokeWidth="1.5"
                        strokeDasharray="8 6"
                      />

                      {/* Officers Club Landmark */}
                      <g
                        onClick={() => setSelectedLandmark('officers')}
                        className="cursor-pointer"
                      >
                        <rect
                          x="152"
                          y="28"
                          width="96"
                          height="50"
                          rx="6"
                          fill={selectedLandmark === 'officers' ? '#233568' : '#18264F'}
                          stroke="#64748B"
                          strokeWidth="1"
                        />
                        <text
                          x="200"
                          y="56"
                          textAnchor="middle"
                          fill="#CBD5E1"
                          fontSize="10"
                          fontWeight="600"
                        >
                          {lang === 'ar' ? 'نادي الضباط' : 'Officers Club'}
                        </text>
                      </g>

                      {/* R.B Law Firm Pin */}
                      <g
                        onClick={() => setSelectedLandmark('firm')}
                        className="cursor-pointer"
                      >
                        <circle cx="272" cy="68" r="18" fill="#C5A059" fillOpacity="0.22" />
                        <circle cx="272" cy="68" r="9" fill="#C5A059" stroke="#0B132B" strokeWidth="2.5" />
                        <rect
                          x="220"
                          y="18"
                          width="124"
                          height="28"
                          rx="6"
                          fill="#C5A059"
                        />
                        <text
                          x="282"
                          y="36"
                          textAnchor="middle"
                          fill="#0B132B"
                          fontSize="10"
                          fontWeight="700"
                        >
                          {lang === 'ar' ? 'شركة الرضوان' : 'Al-Radwan Firm'}
                        </text>
                      </g>

                      {/* 30th Street Label */}
                      <g
                        onClick={() => setSelectedLandmark('street30')}
                        className="cursor-pointer"
                      >
                        <text
                          x="90"
                          y="114"
                          textAnchor="middle"
                          fill="#E2E8F0"
                          fontSize="10"
                          fontWeight="600"
                        >
                          {lang === 'ar' ? 'شارع الثلاثين' : '30th Street'}
                        </text>
                      </g>
                    </svg>
                  </div>

                  <div className="px-4 py-3 bg-[#0D1631] border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="text-slate-300">
                      {selectedLandmark === 'firm' &&
                        (lang === 'ar'
                          ? 'مقر شركة الرضوان — الطابق الثاني'
                          : 'Al-Radwan Law & Arbitration HQ — 2nd Floor')}
                      {selectedLandmark === 'officers' &&
                        (lang === 'ar'
                          ? 'ملاصق لنادي الضباط — إربد'
                          : 'Directly adjacent to Officers Club')}
                      {selectedLandmark === 'street30' &&
                        (lang === 'ar'
                          ? 'الواجهة المباشرة على شارع الثلاثين'
                          : 'Direct frontage on 30th Street')}
                    </span>
                    <a
                      href="https://maps.google.com/?q=32.5385,35.8572"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[#C5A059] hover:underline font-semibold"
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
                    {lang === 'ar'
                      ? 'تم تسجيل طلبك لدى فريق شركة الرضوان للتحكيم والمحاماة. يمكنك أيضاً حجز موعد استشارة مؤكد مباشرة.'
                      : 'Your inquiry has been logged for our legal team. You can also confirm a consultation slot immediately.'}
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
                      onClick={() => setSubmitStatus('idle')}
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
