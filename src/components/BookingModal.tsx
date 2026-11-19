import { useEffect, useState } from 'react';
import {
  Building2,
  Calendar,
  CheckCircle2,
  ClipboardPaste,
  Loader2,
  ShieldCheck,
  Video,
  X,
} from 'lucide-react';
import type {
  ConsultationBooking,
  ConsultationMode,
  IntakeSummary,
  Language,
  SpecialtyId,
} from '../types/legal';
import { FIRM_CONTACT, SPECIALTIES } from '../data/firmContent';
import {
  extractOtpFromClipboard,
  validateBookingCheckout,
} from '../utils/legalWorkflow';

interface BookingModalProps {
  isOpen: boolean;
  lang: Language;
  initialSpecialty?: SpecialtyId;
  prefilledIntake?: IntakeSummary | null;
  onClose: () => void;
  onBookingCreated: (booking: ConsultationBooking) => void;
}

const TIME_SLOTS = ['09:30', '11:00', '12:30', '14:00', '15:30', '16:30'];

export function BookingModal({
  isOpen,
  lang,
  initialSpecialty,
  prefilledIntake,
  onClose,
  onBookingCreated,
}: BookingModalProps) {
  const [step, setStep] = useState<'details' | 'verify' | 'confirmed'>('details');

  // Step 1: Consultation details
  const [mode, setMode] = useState<ConsultationMode>('in_person');
  const [specialtyId, setSpecialtyId] = useState<SpecialtyId>('civil');
  const [date, setDate] = useState('2026-11-20');
  const [timeSlot, setTimeSlot] = useState('11:00');
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [caseSummary, setCaseSummary] = useState('');

  // Step 2: Free Consultation SMS Verification (Auto-fill + Quick Paste)
  const [otpCode, setOtpCode] = useState('');
  const [pasteFeedback, setPasteFeedback] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [confirmedBooking, setConfirmedBooking] = useState<ConsultationBooking | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setStep('details');
    setErrors([]);
    setPasteFeedback('');
    setConfirmedBooking(null);

    if (prefilledIntake) {
      setClientName(prefilledIntake.clientName);
      setClientPhone(prefilledIntake.clientPhone);
      setSpecialtyId(prefilledIntake.specialtyId);
      setMode(prefilledIntake.recommendedMode);
      setCaseSummary(prefilledIntake.factsSummary);
    } else if (initialSpecialty) {
      setSpecialtyId(initialSpecialty);
    }
  }, [isOpen, initialSpecialty, prefilledIntake]);

  if (!isOpen) return null;

  function goToVerifyStep() {
    const cleanCheck = validateBookingCheckout({
      clientName,
      clientPhone,
      date,
      timeSlot,
      paymentMethod: 'free',
      otpCode: '123456',
    });
    const step1Errors = cleanCheck.errors.filter(
      (e) => e === 'invalid_name' || e === 'invalid_phone' || e === 'missing_schedule'
    );
    if (step1Errors.length > 0) {
      setErrors(step1Errors);
      return;
    }
    setErrors([]);
    setStep('verify');
  }

  async function handleQuickPasteOtp() {
    setPasteFeedback('');
    try {
      const clipText = await navigator.clipboard.readText();
      if (!clipText.trim()) {
        setPasteFeedback(
          lang === 'ar'
            ? 'الحافظة فارغة حالياً — انسخ رمز الرسالة أو أدخله يدوياً.'
            : 'Clipboard is currently empty — copy your SMS code or type it.'
        );
        return;
      }
      const extracted = extractOtpFromClipboard(clipText);
      if (extracted) {
        setOtpCode(extracted);
        setPasteFeedback(
          lang === 'ar' ? `تم لصق الرمز: ${extracted}` : `Pasted OTP: ${extracted}`
        );
      }
    } catch {
      setPasteFeedback(
        lang === 'ar'
          ? 'يرجى السماح باللصق أو الضغط مطولاً داخل الحقل لإلصاق الرمز.'
          : 'Please allow clipboard access or long-press the input field to paste.'
      );
    }
  }

  async function handleConfirmFreeBooking() {
    const validation = validateBookingCheckout({
      clientName,
      clientPhone,
      date,
      timeSlot,
      paymentMethod: 'free',
      otpCode,
    });

    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }

    setErrors([]);
    setSubmitting(true);
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName,
          clientPhone,
          specialtyId,
          mode,
          date,
          timeSlot,
          paymentMethod: 'free',
          paymentReference: 'FREE',
          otpCode,
          caseSummary,
        }),
      });

      const data = (await res.json()) as {
        booking?: ConsultationBooking;
        error?: string;
      };

      if (!res.ok || !data.booking) {
        throw new Error(data.error || 'Booking failed');
      }

      setConfirmedBooking(data.booking);
      onBookingCreated(data.booking);
      setStep('confirmed');
    } catch (err: unknown) {
      setErrors([err instanceof Error ? err.message : 'network_error']);
    } finally {
      setSubmitting(false);
    }
  }

  function renderErrorText(code: string) {
    const map: Record<string, Record<Language, string>> = {
      invalid_name: {
        ar: 'يرجى كتابة الاسم الثلاثي الكامل.',
        en: 'Please enter your full name.',
      },
      invalid_phone: {
        ar: 'يرجى إدخال رقم هاتف أردني صحيح (077 / 078 / 079).',
        en: 'Enter a valid Jordanian mobile number (077 / 078 / 079).',
      },
      missing_schedule: {
        ar: 'يرجى تحديد التاريخ والوقت المناسبين.',
        en: 'Please select a date and time slot.',
      },
      invalid_otp: {
        ar: 'يرجى إدخال رمز تأكيد الموعد (من 4 إلى 6 أرقام).',
        en: 'Please enter the 4–6 digit SMS confirmation code.',
      },
    };
    return map[code]?.[lang] ?? code;
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="booking-modal-title"
      className="fixed inset-0 z-50 bg-[#0B132B]/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
    >
      <div className="bg-white text-[#0B132B] w-full sm:max-w-xl rounded-t-3xl sm:rounded-2xl shadow-2xl border border-slate-200 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="bg-[#0B132B] text-white px-5 py-4 rounded-t-3xl sm:rounded-t-2xl flex items-center justify-between gap-3 shrink-0">
          <div>
            <p className="text-xs font-semibold text-[#C5A059]">
              {step === 'details' &&
                (lang === 'ar' ? 'الخطوة 1 من 2 · بيانات الموعد المجاني' : 'Step 1 of 2 · Free Consultation Details')}
              {step === 'verify' &&
                (lang === 'ar' ? 'الخطوة 2 من 2 · تأكيد رقم الهاتف' : 'Step 2 of 2 · Mobile Verification')}
              {step === 'confirmed' &&
                (lang === 'ar' ? 'تم تأكيد حجزك المجاني' : 'Free Consultation Confirmed')}
            </p>
            <h2 id="booking-modal-title" className="text-base sm:text-lg font-bold">
              {lang === 'ar'
                ? 'حجز استشارة قانونية مجانية — شركة الرضوان'
                : 'Book Free Legal Consultation — Al-Radwan Firm'}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label={lang === 'ar' ? 'إغلاق نافذة الحجز' : 'Close booking modal'}
            className="min-h-[44px] min-w-[44px] rounded-xl flex items-center justify-center text-slate-200 hover:bg-white/10 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {step === 'details' && (
            <>
              {/* Consultation Type Toggle (Both Free) */}
              <div className="space-y-2">
                <span className="block text-xs font-bold text-slate-700">
                  {lang === 'ar' ? 'اختر طريقة الاستشارة المجانية' : 'Select Free Consultation Mode'}
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setMode('in_person')}
                    className={`min-h-[64px] p-3.5 rounded-xl border text-start flex items-start gap-3 cursor-pointer transition-colors ${
                      mode === 'in_person'
                        ? 'bg-[#0B132B] text-white border-[#0B132B]'
                        : 'bg-[#F8FAFC] text-[#0B132B] border-slate-200 hover:border-[#C5A059]'
                    }`}
                  >
                    <Building2
                      className={`w-5 h-5 mt-0.5 shrink-0 ${
                        mode === 'in_person' ? 'text-[#C5A059]' : 'text-slate-500'
                      }`}
                    />
                    <div>
                      <div className="text-sm font-bold">
                        {lang === 'ar' ? 'حضورية في مقر الشركة' : 'In-Person (Irbid HQ)'}
                      </div>
                      <div
                        className={`text-xs mt-0.5 font-semibold ${
                          mode === 'in_person' ? 'text-[#C5A059]' : 'text-emerald-700'
                        }`}
                      >
                        {lang === 'ar' ? 'مجانية · الشارع الثلاثين' : 'Free · 30th Street'}
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMode('online')}
                    className={`min-h-[64px] p-3.5 rounded-xl border text-start flex items-start gap-3 cursor-pointer transition-colors ${
                      mode === 'online'
                        ? 'bg-[#0B132B] text-white border-[#0B132B]'
                        : 'bg-[#F8FAFC] text-[#0B132B] border-slate-200 hover:border-[#C5A059]'
                    }`}
                  >
                    <Video
                      className={`w-5 h-5 mt-0.5 shrink-0 ${
                        mode === 'online' ? 'text-[#C5A059]' : 'text-slate-500'
                      }`}
                    />
                    <div>
                      <div className="text-sm font-bold">
                        {lang === 'ar' ? 'استشارة أونلاين (هاتف / فيديو)' : 'Online / Phone Call'}
                      </div>
                      <div
                        className={`text-xs mt-0.5 font-semibold ${
                          mode === 'online' ? 'text-[#C5A059]' : 'text-emerald-700'
                        }`}
                      >
                        {lang === 'ar' ? 'مجانية · من أي مكان' : 'Free · Anywhere'}
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Specialty */}
              <div>
                <label htmlFor="bk-spec" className="block text-xs font-bold text-slate-700 mb-1.5">
                  {lang === 'ar' ? 'التخصص القانوني' : 'Legal Practice Area'}
                </label>
                <select
                  id="bk-spec"
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

              {/* Date & Time Slot */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="bk-date" className="block text-xs font-bold text-slate-700 mb-1.5">
                    {lang === 'ar' ? 'تاريخ الموعد' : 'Preferred Date'}
                  </label>
                  <input
                    id="bk-date"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-mono-data focus:outline-none focus:ring-2 focus:ring-[#C5A059]"
                  />
                </div>

                <div>
                  <span className="block text-xs font-bold text-slate-700 mb-1.5">
                    {lang === 'ar' ? 'الوقت المتاح' : 'Available Slot'}
                  </span>
                  <div className="grid grid-cols-3 gap-1.5">
                    {TIME_SLOTS.map((slot) => (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => setTimeSlot(slot)}
                        className={`min-h-[40px] rounded-lg text-xs font-bold font-mono-data border cursor-pointer transition-colors ${
                          timeSlot === slot
                            ? 'bg-[#0B132B] text-[#C5A059] border-[#0B132B]'
                            : 'bg-white text-slate-700 border-slate-200 hover:border-[#C5A059]'
                        }`}
                      >
                        {slot}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Client Name & Jordanian Mobile */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="bk-name" className="block text-xs font-bold text-slate-700 mb-1.5">
                    {lang === 'ar' ? 'الاسم الكامل' : 'Client Full Name'}
                  </label>
                  <input
                    id="bk-name"
                    type="text"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder={lang === 'ar' ? 'الاسم الثلاثي' : 'Full name'}
                    className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#C5A059]"
                  />
                </div>
                <div>
                  <label htmlFor="bk-phone" className="block text-xs font-bold text-slate-700 mb-1.5">
                    {lang === 'ar' ? 'رقم الموبايل الأردني' : 'Jordanian Mobile'}
                  </label>
                  <input
                    id="bk-phone"
                    type="tel"
                    dir="ltr"
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    placeholder="079XXXXXXX"
                    className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-mono-data focus:outline-none focus:ring-2 focus:ring-[#C5A059]"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="bk-summary" className="block text-xs font-bold text-slate-700 mb-1.5">
                  {lang === 'ar'
                    ? 'ملخص قضيتك (اختياري — يُعامل بسرية تامة)'
                    : 'Brief Case Summary (Optional — Strictly Confidential)'}
                </label>
                <textarea
                  id="bk-summary"
                  rows={2}
                  value={caseSummary}
                  onChange={(e) => setCaseSummary(e.target.value)}
                  placeholder={
                    lang === 'ar'
                      ? 'شاركنا ما يشغلك لنستعد للاستماع إليك ومساعدتك...'
                      : 'Share key facts so our attorney is ready to help you...'
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#C5A059]"
                />
              </div>
            </>
          )}

          {step === 'verify' && (
            <>
              {/* Free Consultation Reassurance Summary */}
              <div className="rounded-xl bg-[#F8FAFC] border border-slate-200 p-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs text-slate-500">
                    {mode === 'in_person'
                      ? lang === 'ar'
                        ? 'استشارة حضورية في مقر الشركة (إربد – الشارع الثلاثين)'
                        : 'In-Person Consultation (Irbid – 30th Street)'
                      : lang === 'ar'
                        ? 'استشارة أونلاين (فيديو / اتصال هاتفي)'
                        : 'Online / Phone Consultation'}
                  </p>
                  <p className="text-sm font-bold text-[#0B132B] mt-0.5 font-mono-data">
                    {date} · {timeSlot}
                  </p>
                </div>
                <div className="text-base sm:text-lg font-bold text-emerald-700">
                  {lang === 'ar' ? 'استشارة مجانية' : 'Free'}
                </div>
              </div>

              <div className="rounded-xl bg-[#0B132B] text-white p-4 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-[#C5A059] shrink-0 mt-0.5" aria-hidden="true" />
                <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                  {lang === 'ar'
                    ? 'لتثبيت موعدك المجاني وضمان تواصل المحامي المختص معك في الوقت المحدد، يرجى إدخال رمز التحقق المرسل عبر SMS (بدون أي رسوم).'
                    : 'To lock in your complimentary consultation slot and verify your mobile number, please enter the SMS verification code below (no charges apply).'}
                </p>
              </div>

              {/* Mobile SMS OTP Auto-fill + Prominent One-Tap Paste */}
              <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2.5">
                <label htmlFor="sms-otp" className="block text-xs font-bold text-[#0B132B]">
                  {lang === 'ar'
                    ? 'رمز تأكيد الموعد عبر SMS (التقاط تلقائي عبر الهاتف أو لصق سريع)'
                    : 'SMS Verification Code (Mobile Auto-fill or One-Tap Paste)'}
                </label>
                <div className="flex items-stretch gap-2">
                  <input
                    id="sms-otp"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    pattern="[0-9]*"
                    maxLength={6}
                    dir="ltr"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="482910"
                    className="flex-1 min-h-[48px] px-4 py-2.5 rounded-xl border border-slate-300 text-base tracking-[0.25em] font-bold font-mono-data text-center focus:outline-none focus:ring-2 focus:ring-[#C5A059]"
                  />
                  <button
                    type="button"
                    onClick={handleQuickPasteOtp}
                    className="min-h-[48px] px-4 rounded-xl bg-[#0B132B] hover:bg-[#162247] text-white text-xs sm:text-sm font-bold flex items-center gap-1.5 shrink-0 cursor-pointer"
                  >
                    <ClipboardPaste className="w-4 h-4 text-[#C5A059]" />
                    <span>{lang === 'ar' ? 'لصق / Paste' : 'Paste OTP'}</span>
                  </button>
                </div>
                {pasteFeedback && (
                  <p className="text-xs font-medium text-[#0B132B]">{pasteFeedback}</p>
                )}
              </div>
            </>
          )}

          {step === 'confirmed' && confirmedBooking && (
            <div className="space-y-5 text-center py-2">
              <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div className="space-y-1">
                <h3 className="text-xl font-bold text-[#0B132B]">
                  {lang === 'ar'
                    ? 'تم تأكيد استشارتك المجانية بنجاح!'
                    : 'Your Free Consultation Is Confirmed!'}
                </h3>
                <p className="text-sm text-slate-600">
                  {lang === 'ar'
                    ? 'حقك أمانة عندنا — تم تحويل موعدك مباشرة لفريق شركة الرضوان.'
                    : 'Your rights are in safe hands — your booking has been routed to our legal team.'}
                </p>
              </div>

              <div className="bg-[#F8FAFC] rounded-2xl border border-slate-200 p-5 text-start space-y-3 text-sm">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="text-slate-500">
                    {lang === 'ar' ? 'رقم المرجع:' : 'Booking Ref:'}
                  </span>
                  <span className="font-bold font-mono-data text-[#0B132B]">
                    {confirmedBooking.referenceCode}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">
                    {lang === 'ar' ? 'المحامي المسؤول:' : 'Assigned Counsel:'}
                  </span>
                  <span className="font-bold">{confirmedBooking.assignedLawyer}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">
                    {lang === 'ar' ? 'الموعد:' : 'Schedule:'}
                  </span>
                  <span className="font-semibold font-mono-data">
                    {confirmedBooking.date} · {confirmedBooking.timeSlot}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">
                    {lang === 'ar' ? 'المكان / النوع:' : 'Location / Mode:'}
                  </span>
                  <span className="font-semibold">
                    {confirmedBooking.mode === 'in_person'
                      ? FIRM_CONTACT.addressShort[lang]
                      : lang === 'ar'
                        ? 'استشارة أونلاين / هاتف'
                        : 'Online / Phone Consultation'}
                  </span>
                </div>
                <div className="flex items-center justify-between border-t border-slate-200 pt-2">
                  <span className="text-slate-500">
                    {lang === 'ar' ? 'التكلفة:' : 'Fee:'}
                  </span>
                  <span className="font-bold text-emerald-700">
                    {lang === 'ar' ? 'استشارة أولية مجانية بالكامل' : '100% Free Initial Consultation'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {errors.length > 0 && (
            <div
              role="alert"
              className="rounded-xl bg-red-50 border border-red-200 p-3.5 space-y-1 text-xs font-semibold text-red-800"
            >
              {errors.map((err) => (
                <div key={err}>• {renderErrorText(err)}</div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-4 border-t border-slate-200 bg-[#F8FAFC] rounded-b-2xl flex items-center justify-between gap-3 shrink-0">
          {step === 'details' && (
            <>
              <div className="text-xs sm:text-sm font-bold text-emerald-700">
                {lang === 'ar' ? 'الاستشارة الأولى مجانية' : 'Free Consultation'}
              </div>
              <button
                type="button"
                onClick={goToVerifyStep}
                className="min-h-[48px] px-6 py-3 rounded-xl bg-[#C5A059] hover:bg-[#d4b06a] text-[#0B132B] font-bold text-sm flex items-center gap-2 cursor-pointer"
              >
                <Calendar className="w-4 h-4" />
                <span>
                  {lang === 'ar' ? 'متابعة وتأكيد الموعد المجاني' : 'Continue to Confirm Slot'}
                </span>
              </button>
            </>
          )}

          {step === 'verify' && (
            <>
              <button
                type="button"
                onClick={() => {
                  setErrors([]);
                  setStep('details');
                }}
                className="min-h-[48px] px-4 py-3 rounded-xl border border-slate-300 text-slate-700 font-semibold text-sm cursor-pointer"
              >
                {lang === 'ar' ? 'رجوع' : 'Back'}
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleConfirmFreeBooking}
                className="flex-1 min-h-[48px] px-6 py-3 rounded-xl bg-[#C5A059] hover:bg-[#d4b06a] disabled:opacity-60 text-[#0B132B] font-bold text-sm flex items-center justify-center gap-2 cursor-pointer"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>
                  {submitting
                    ? lang === 'ar'
                      ? 'جاري تأكيد الموعد...'
                      : 'Confirming...'
                    : lang === 'ar'
                      ? 'تأكيد حجز الاستشارة المجانية'
                      : 'Confirm Free Consultation'}
                </span>
              </button>
            </>
          )}

          {step === 'confirmed' && (
            <button
              type="button"
              onClick={onClose}
              className="w-full min-h-[48px] px-6 py-3 rounded-xl bg-[#0B132B] hover:bg-[#162247] text-white font-bold text-sm cursor-pointer"
            >
              {lang === 'ar' ? 'إغلاق والعودة للموقع' : 'Done & Return to Website'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
