import { BellRing, Inbox, PhoneCall, X } from 'lucide-react';
import type { ContactInquiry, Language } from '../types/legal.js';
import { formatInquiryToastPreview } from '../utils/inquiryNotifications.js';

interface InquiryToastStackProps {
  lang: Language;
  toasts: ContactInquiry[];
  onDismiss: (id: string) => void;
  onOpenInbox: (inquiryId: string) => void;
}

export function InquiryToastStack({
  lang,
  toasts,
  onDismiss,
  onOpenInbox,
}: InquiryToastStackProps) {
  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      className="fixed top-20 end-4 z-50 flex flex-col gap-3 w-[calc(100vw-2rem)] max-w-sm pointer-events-none"
    >
      {toasts.map((inquiry) => {
        const preview = formatInquiryToastPreview(inquiry, lang);
        return (
          <div
            key={inquiry.id}
            role="status"
            data-testid="inquiry-toast"
            className="pointer-events-auto bg-[#0B132B] text-white rounded-2xl border border-[#C5A059]/60 shadow-2xl shadow-black/30 overflow-hidden"
          >
            <div className="px-4 py-2.5 bg-[#C5A059]/15 border-b border-[#C5A059]/25 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-7 h-7 rounded-lg bg-[#C5A059] text-[#0B132B] flex items-center justify-center shrink-0">
                  <BellRing className="w-4 h-4" aria-hidden="true" />
                </span>
                <p className="text-xs font-bold text-[#C5A059] truncate">{preview.title}</p>
              </div>
              <button
                type="button"
                onClick={() => onDismiss(inquiry.id)}
                aria-label={lang === 'ar' ? 'إغلاق التنبيه' : 'Dismiss notification'}
                className="min-h-[32px] min-w-[32px] flex items-center justify-center rounded-lg text-slate-300 hover:text-white hover:bg-white/10 cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-bold text-white truncate">{inquiry.name}</p>
                <span className="text-xs font-mono-data text-[#C5A059] shrink-0" dir="ltr">
                  {inquiry.phone}
                </span>
              </div>

              <p className="text-[11px] font-semibold text-slate-300">{preview.specialtyLabel}</p>

              <p className="text-xs text-slate-200 leading-relaxed bg-white/5 border border-white/10 rounded-xl px-3 py-2">
                {preview.excerpt}
              </p>

              <div className="flex items-center gap-2 pt-1">
                <a
                  href={preview.telHref}
                  className="flex-1 min-h-[38px] px-3 py-1.5 rounded-xl bg-[#C5A059] hover:bg-[#d4b06a] text-[#0B132B] text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <PhoneCall className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>{lang === 'ar' ? 'اتصال فوري' : 'Call Now'}</span>
                </a>
                <button
                  type="button"
                  onClick={() => onOpenInbox(inquiry.id)}
                  className="flex-1 min-h-[38px] px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Inbox className="w-3.5 h-3.5 text-[#C5A059]" aria-hidden="true" />
                  <span>{lang === 'ar' ? 'عرض الاستفسار' : 'View Inquiry'}</span>
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
