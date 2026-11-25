import { Award, Briefcase, CheckCircle2, GraduationCap, MapPin, Phone, Scale, X } from 'lucide-react';
import type { Language } from '../types/legal.js';
import { ASSET_IMAGES, FIRM_CONTACT, FOUNDER_PROFILE, UI_COPY } from '../data/firmContent.js';

interface FounderProfileModalProps {
  isOpen: boolean;
  lang: Language;
  onClose: () => void;
  onBookWithFounder: () => void;
}

export function FounderProfileModal({
  isOpen,
  lang,
  onClose,
  onBookWithFounder,
}: FounderProfileModalProps) {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="founder-cv-title"
      className="fixed inset-0 z-50 bg-[#0B132B]/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
    >
      <div className="bg-[#FAF8F3] text-[#0B132B] w-full sm:max-w-3xl rounded-t-3xl sm:rounded-2xl shadow-2xl border border-[#C5A059]/40 max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-[#0B132B] text-white px-6 py-4 flex items-center justify-between gap-3 shrink-0 border-b border-[#C5A059]/30">
          <div className="flex items-center gap-3">
            <img
              src={ASSET_IMAGES.logoCrownEmblem}
              alt={UI_COPY.brandShort[lang]}
              className="h-9 w-auto object-contain rounded"
            />
            <div>
              <p className="text-[11px] font-bold text-[#C5A059]">
                {lang === 'ar'
                  ? 'الصفحة الشخصية والسيرة الذاتية للمؤسس'
                  : 'Founder Profile & Curriculum Vitae'}
              </p>
              <h2 id="founder-cv-title" className="text-base sm:text-lg font-extrabold">
                {FOUNDER_PROFILE.name[lang]}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label={lang === 'ar' ? 'إغلاق السيرة الذاتية' : 'Close founder biography'}
            className="min-h-[42px] min-w-[42px] rounded-xl flex items-center justify-center text-slate-200 hover:bg-white/10 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 grid grid-cols-1 sm:grid-cols-12 gap-5 items-center">
            <div className="sm:col-span-4">
              <div className="rounded-xl overflow-hidden border-2 border-[#C5A059]/60 aspect-[3/4] max-w-[190px] mx-auto bg-[#0B132B]">
                <img
                  src={ASSET_IMAGES.radwanPortrait}
                  alt={FOUNDER_PROFILE.name[lang]}
                  className="w-full h-full object-cover object-top"
                />
              </div>
            </div>
            <div className="sm:col-span-8 space-y-2.5">
              <p className="text-xs font-bold text-[#C5A059]">
                {FOUNDER_PROFILE.title[lang]}
              </p>
              <h3 className="text-xl sm:text-2xl font-extrabold text-[#0B132B]">
                {FOUNDER_PROFILE.name[lang]}
              </h3>
              <p className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <Award className="w-4 h-4 text-[#C5A059] shrink-0" />
                <span>{FOUNDER_PROFILE.credential[lang]}</span>
              </p>
              <p className="text-sm text-slate-600 leading-relaxed">
                {FOUNDER_PROFILE.executiveBio[lang]}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Education */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
              <div className="flex items-center gap-2 text-sm font-bold text-[#0B132B]">
                <GraduationCap className="w-4 h-4 text-[#C5A059]" />
                <span>{lang === 'ar' ? 'المؤهلات العلمية' : 'Academic Credentials'}</span>
              </div>
              <ul className="space-y-2">
                {FOUNDER_PROFILE.cvSections.education[lang].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-slate-700">
                    <CheckCircle2 className="w-4 h-4 text-[#C5A059] mt-0.5 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Leadership Positions */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
              <div className="flex items-center gap-2 text-sm font-bold text-[#0B132B]">
                <Briefcase className="w-4 h-4 text-[#C5A059]" />
                <span>{lang === 'ar' ? 'المناصب القيادية' : 'Leadership Positions'}</span>
              </div>
              <ul className="space-y-2">
                {FOUNDER_PROFILE.cvSections.positions[lang].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-slate-700">
                    <CheckCircle2 className="w-4 h-4 text-[#C5A059] mt-0.5 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Core Legal Focus */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
            <div className="flex items-center gap-2 text-sm font-bold text-[#0B132B]">
              <Scale className="w-4 h-4 text-[#C5A059]" />
              <span>
                {lang === 'ar'
                  ? 'مجالات التخصص والقيادة القانونية'
                  : 'Core Legal & Arbitration Practice'}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {FOUNDER_PROFILE.cvSections.coreFocus[lang].map((item) => (
                <div
                  key={item}
                  className="rounded-xl bg-[#FAF8F3] border border-slate-200 px-3.5 py-2.5 text-sm font-semibold text-[#0B132B]"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>

          {/* Official Firm Offices */}
          <div className="bg-[#0B132B] text-white rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1 text-xs sm:text-sm">
              <p className="font-bold text-[#C5A059] flex items-center gap-1.5">
                <MapPin className="w-4 h-4" />
                <span>{lang === 'ar' ? 'مكاتب الشركة' : 'Firm Offices'}</span>
              </p>
              <p className="text-slate-200">
                {FIRM_CONTACT.branches.map((b) => `${b.name[lang]}: ${b.address[lang]}`).join(' · ')}
              </p>
            </div>
            <a
              href={FIRM_CONTACT.phoneHref}
              dir="ltr"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 border border-[#C5A059]/40 text-[#C5A059] font-mono-data font-bold text-sm shrink-0"
            >
              <Phone className="w-4 h-4" />
              <span>{FIRM_CONTACT.phoneDisplay}</span>
            </a>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-white border-t border-slate-200 flex items-center justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] px-4 py-2 rounded-xl border border-slate-300 text-sm font-semibold cursor-pointer"
          >
            {lang === 'ar' ? 'إغلاق' : 'Close'}
          </button>
          <button
            type="button"
            onClick={() => {
              onClose();
              onBookWithFounder();
            }}
            className="min-h-[44px] px-6 py-2 rounded-xl bg-[#C5A059] hover:bg-[#d4b06a] text-[#0B132B] text-sm font-bold cursor-pointer"
          >
            {UI_COPY.hero.ctaPrimary[lang]}
          </button>
        </div>
      </div>
    </div>
  );
}
