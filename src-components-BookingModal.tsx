import { useEffect, useState, type FormEvent } from 'react';
import {
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Loader2,
  MapPin,
  Video,
  X,
} from 'lucide-react';
import type {
  BranchId,
  ConsultationBooking,
  Language,
  SpecialtyId,
} from '../types/legal.js';
import { FIRM_CONTACT, SPECIALTIES, UI_COPY } from '../data/firmContent.js';
import { isValidJordanianPhone } from '../utils/legalWorkflow.js';

interface BookingModalProps {
  isOpen: boolean;
  lang: Language;
  initialSpecialty?: SpecialtyId;
  onClose: () => void;
  onBookingCreated: (booking: ConsultationBooking) => void;
}

const TIME_SLOTS = ['09:30', '11:00', '12:30', '14:00', '15:30', '16:30'];

export function BookingModal({
  isOpen,
  lang,
  initialSpecialty,
  onClose,
  onBookingCreated,
}: BookingModalProps) {
  const [submittedBooking, setSubmittedBooking] = useState<ConsultationBooking | null>(null);
  const [branch, setBranch] = useState<BranchId>('irbid');
  const [specialtyId, setSpecialtyId] = useState<SpecialtyId>('civil');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [timeSlot, setTimeSlot] = useState('11:00');
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [caseSummary, setCaseSummary] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    setSubmittedBooking(null);
    setErrors([]);
    if (initialSpecialty) {
      setSpecialtyId(initialSpecialty);
    }
  }, [isOpen, initialSpecialty]);

  if (!isOpen) return null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const nextErrors: string[] = [];
    if (clientName.trim().length < 3) {
      nextErrors.push(
        lang === 'ar' ? 'يرجى إدخال الاسم الكامل.' : 'Please enter your full name.'
      );
    }
    if (!isValidJordanianPhone(clientPhone)) {
      nextErrors.push(
        lang === 'ar'
          ? 'يرجى إدخال رقم هاتف أردني صحيح (077 / 078 / 079).'
          : 'Enter a valid Jordanian mobile number (077 / 078 / 079).'
      );
    }
    if (!date.trim() || !timeSlot.trim()) {
      nextErrors.push(
        lang === 'ar' ? 'يرجى تحديد التاريخ والوقت المناسبين.' : 'Please select a date and time.'
      );
    }
    if (nextErrors.length > 0) {
      setErrors(nextErrors);
      return;
    }

    setErrors([]);
    setSubmitting(true);
    try {
      const mode = branch === 'online' ? 'online' : 'in_person';
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName: clientName.trim(),
          clientPhone: clientPhone.trim(),
          specialtyId,
          branch,
          mode,
          date,
          timeSlot,
          caseSummary: caseSummary.trim() || undefined,
        }),
      });

      const data = (await res.json()) as {
        booking?: ConsultationBooking;
        error?: string;
      };

      if (!res.ok || !data.booking) {
        throw new Error(data.error || 'Booking request failed');
      }

      setSubmittedBooking(data.booking);
      onBookingCreated(data.booking);
    } catch (err: unknown) {
      setErrors([
        err instanceof Error
          ? err.message
          : lang === 'ar'
            ? 'تعذر إرسال طلب الموعد، حاول مجدداً.'
            : 'Unable to submit booking request.',
      ]);
    } finally {
      setSubmitting(false);
    }
  }

  function formatBranchLabel(b?: BranchId): string {
    if (b === 'amman') {
      return lang === 'ar'
        ? 'فرع عمّان — شارع مكة — مجمع داوود'
        : 'Amman Branch — Mecca St — Dawood Complex';
    }
    if (b === 'online') {
      return lang === 'ar' ? 'استشارة عن بُعد (أونلاين / هاتف)' : 'Online / Phone Consultation';
    }
    return lang === 'ar'
      ? 'فرع إربد — شارع الثلاثين — إشارة الضباط'
      : 'Irbid Branch — 30th St — Al-Dubbat Signal';
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
            <p className="text-xs font-bold text-[#C5A059]">
              {UI_COPY.brandShort[lang]} · {UI_COPY.brandAbbr}
            </p>
            <h2 id="booking-modal-title" className="text-base sm:text-lg font-bold">
              {submittedBooking
                ? lang === 'ar'
                  ? 'تم استلام طلب الموعد'
                  : 'Appointment Request Received'
                : lang === 'ar'
                  ? 'طلب حجز موعد استشارة قانونية'
                  : 'Request Legal Consultation Appointment'}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label={lang === 'ar' ? 'إغلاق نافذة الحجز' : 'Close booking modal'}
            className="min-h-[42px] min-w-[42px] rounded-xl flex items-center justify-center text-slate-200 hover:bg-white/10 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        {submittedBooking ? (
          <div className="p-6 overflow-y-auto space-y-5 flex-1 text-center">
            <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center mx-auto">
              <Clock className="w-8 h-8" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-xl font-bold text-[#0B132B]">
                {lang === 'ar'
                  ? 'تم تسجيل طلب الموعد بنجاح (بانتظار تأكيد المكتب)'
                  : 'Request Logged — Pending Office Confirmation'}
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                {lang === 'ar'
                  ? `تم إرسال طلبك مباشرة إلى لوحة التحكم الداخلية. سيتواصل معك المكتب قريباً لتأكيد الموعد النهائي عبر الرقم ${FIRM_CONTACT.phoneDisplay}.`
                  : `Your request has been sent directly to our firm dashboard. Our office will contact you promptly via ${FIRM_CONTACT.phoneDisplay} to confirm the appointment.`}
              </p>
            </div>

            <div className="bg-[#FAF8F3] rounded-2xl border border-slate-200 p-5 text-start space-y-3 text-sm">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="text-slate-500">
                  {lang === 'ar' ? 'رقم الطلب:' : 'Reference:'}
                </span>
                <span className="font-bold font-mono-data text-[#0B132B]">
                  {submittedBooking.referenceCode}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">{lang === 'ar' ? 'الفرع:' : 'Branch:'}</span>
                <span className="font-semibold text-end">
                  {formatBranchLabel(submittedBooking.branch)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">
                  {lang === 'ar' ? 'التاريخ والوقت المقترح:' : 'Requested Slot:'}
                </span>
                <span className="font-semibold font-mono-data">
                  {submittedBooking.date} · {submittedBooking.timeSlot}
                </span>
              </div>
              <div className="flex items-center justify-between border-t border-slate-200 pt-2">
                <span className="text-slate-500">{lang === 'ar' ? 'الحالة:' : 'Status:'}</span>
                <span className="inline-flex items-center gap-1.5 font-bold text-amber-800">
                  <CheckCircle2 className="w-4 h-4" />
                  {lang === 'ar' ? 'بانتظار تأكيد المكتب' : 'Pending Firm Confirmation'}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-full min-h-[48px] px-6 py-3 rounded-xl bg-[#0B132B] hover:bg-[#162247] text-white font-bold text-sm cursor-pointer"
            >
              {lang === 'ar' ? 'إغلاق والعودة للموقع' : 'Close & Return'}
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1">
            {/* Branch Selector */}
            <div className="space-y-2">
              <span className="block text-xs font-bold text-slate-700">
                {lang === 'ar' ? 'الفرع / طريقة الاستشارة' : 'Select Branch or Mode'}
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {[
                  {
                    id: 'irbid' as BranchId,
                    icon: Building2,
                    label: lang === 'ar' ? 'فرع إربد' : 'Irbid Branch',
                    sub: lang === 'ar' ? 'ش. الثلاثين — إشارة الضباط' : '30th St — Al-Dubbat',
                  },
                  {
                    id: 'amman' as BranchId,
                    icon: MapPin,
                    label: lang === 'ar' ? 'فرع عمّان' : 'Amman Branch',
                    sub: lang === 'ar' ? 'ش. مكة — مجمع داوود' : 'Mecca St — Dawood',
                  },
                  {
                    id: 'online' as BranchId,
                    icon: Video,
                    label: lang === 'ar' ? 'عن بُعد' : 'Online / Call',
                    sub: lang === 'ar' ? 'اتصال أو اجتماع مرئي' : 'Phone / Video',
                  },
                ].map((opt) => {
                  const Icon = opt.icon;
                  const active = branch === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setBranch(opt.id)}
                      className={`p-3 rounded-xl border text-start flex items-start gap-2.5 cursor-pointer transition-colors ${
                        active
                          ? 'bg-[#0B132B] text-white border-[#0B132B]'
                          : 'bg-[#FAF8F3] text-[#0B132B] border-slate-200 hover:border-[#C5A059]'
                      }`}
                    >
                      <Icon
                        className={`w-4 h-4 mt-0.5 shrink-0 ${
                          active ? 'text-[#C5A059]' : 'text-slate-500'
                        }`}
                      />
                      <div className="min-w-0">
                        <div className="text-xs font-bold">{opt.label}</div>
                        <div
                          className={`text-[11px] mt-0.5 truncate ${
                            active ? 'text-slate-300' : 'text-slate-500'
                          }`}
                        >
                          {opt.sub}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Name & Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="bk-name" className="block text-xs font-bold text-slate-700 mb-1.5">
                  {lang === 'ar' ? 'الاسم الكامل' : 'Full Name'}
                </label>
                <input
                  id="bk-name"
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder={lang === 'ar' ? 'الاسم الثلاثي' : 'Your full name'}
                  required
                  className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#C5A059]"
                />
              </div>
              <div>
                <label htmlFor="bk-phone" className="block text-xs font-bold text-slate-700 mb-1.5">
                  {lang === 'ar' ? 'رقم الهاتف' : 'Phone Number'}
                </label>
                <input
                  id="bk-phone"
                  type="tel"
                  dir="ltr"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  placeholder="079XXXXXXX"
                  required
                  className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-mono-data focus:outline-none focus:ring-2 focus:ring-[#C5A059]"
                />
              </div>
            </div>

            {/* Consultation Type */}
            <div>
              <label htmlFor="bk-spec" className="block text-xs font-bold text-slate-700 mb-1.5">
                {lang === 'ar' ? 'نوع الاستشارة' : 'Consultation Type'}
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

            {/* Date & Time */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="bk-date" className="block text-xs font-bold text-slate-700 mb-1.5">
                  {lang === 'ar' ? 'التاريخ المقترح' : 'Preferred Date'}
                </label>
                <input
                  id="bk-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-mono-data focus:outline-none focus:ring-2 focus:ring-[#C5A059]"
                />
              </div>

              <div>
                <span className="block text-xs font-bold text-slate-700 mb-1.5">
                  {lang === 'ar' ? 'الوقت المقترح' : 'Preferred Time'}
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

            {/* Optional Details */}
            <div>
              <label htmlFor="bk-summary" className="block text-xs font-bold text-slate-700 mb-1.5">
                {lang === 'ar'
                  ? 'تفاصيل اختيارية حول الاستشارة'
                  : 'Optional Consultation Details'}
              </label>
              <textarea
                id="bk-summary"
                rows={2}
                value={caseSummary}
                onChange={(e) => setCaseSummary(e.target.value)}
                placeholder={
                  lang === 'ar'
                    ? 'اكتب نبذة مختصرة إذا رغبت بذلك...'
                    : 'Share any optional background details...'
                }
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#C5A059]"
              />
            </div>

            {errors.length > 0 && (
              <div
                role="alert"
                className="rounded-xl bg-red-50 border border-red-200 p-3.5 space-y-1 text-xs font-semibold text-red-800"
              >
                {errors.map((err) => (
                  <div key={err}>• {err}</div>
                ))}
              </div>
            )}

            <div className="pt-2 border-t border-slate-200 flex items-center justify-between gap-3">
              <span className="text-[11px] sm:text-xs text-slate-500">
                {lang === 'ar'
                  ? 'يتم تأكيد الموعد من قِبل المكتب مباشرة'
                  : 'Confirmed directly by our office'}
              </span>
              <button
                type="submit"
                disabled={submitting}
                className="min-h-[48px] px-6 py-3 rounded-xl bg-[#C5A059] hover:bg-[#d4b06a] disabled:opacity-60 text-[#0B132B] font-bold text-sm flex items-center gap-2 cursor-pointer"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Calendar className="w-4 h-4" />
                )}
                <span>
                  {submitting
                    ? lang === 'ar'
                      ? 'جاري الإرسال...'
                      : 'Submitting...'
                    : lang === 'ar'
                      ? 'إرسال طلب الموعد'
                      : 'Submit Appointment Request'}
                </span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
