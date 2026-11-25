import { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Briefcase,
  Building2,
  CheckCircle2,
  FileText,
  Gavel,
  Handshake,
  Landmark,
  ShieldAlert,
  Users,
  X,
} from 'lucide-react';
import type { Language, SpecialtyId } from '../types/legal.js';
import { CORE_SERVICES, SPECIALTIES, type SpecialtyContent } from '../data/firmContent.js';

interface SpecialtiesSectionProps {
  lang: Language;
  onBookWithSpecialty: (specialtyId: SpecialtyId) => void;
}

function getSpecialtyIcon(id: SpecialtyId) {
  switch (id) {
    case 'civil':
      return Gavel;
    case 'sharia':
      return Users;
    case 'criminal':
      return ShieldAlert;
    case 'commercial':
      return Building2;
    case 'labor':
      return Briefcase;
    case 'administrative':
      return Landmark;
    case 'arbitration':
      return Handshake;
  }
}

export function SpecialtiesSection({ lang, onBookWithSpecialty }: SpecialtiesSectionProps) {
  const [activeSpecialty, setActiveSpecialty] = useState<SpecialtyContent | null>(null);
  const ArrowIcon = lang === 'ar' ? ArrowLeft : ArrowRight;

  return (
    <section id="specialties" className="bg-[#FAF8F3] py-14 sm:py-20 border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mb-8 space-y-2">
          <p className="text-xs sm:text-sm font-bold text-[#C5A059]">
            {lang === 'ar' ? 'المجالات القانونية والتحكيم' : 'Legal Services & Arbitration'}
          </p>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0B132B] [text-wrap:balance] font-display-en">
            {lang === 'ar'
              ? 'تمثيل قانوني وتحكيمي متخصص يحمي حقوقك ومصالحك'
              : 'Specialized Legal Representation & Arbitration Across Every Field'}
          </h2>
          <p className="text-slate-600 text-base">
            {lang === 'ar'
              ? 'اختر أي مجال لاستعراض المستندات الأولية المطلوبة وطلب استشارة قانونية مباشرة مع المكتب.'
              : 'Select any practice area to review required initial documents and request a legal consultation.'}
          </p>
        </div>

        {/* 5 Core Services Ribbon */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-8">
          {CORE_SERVICES.map((service) => (
            <div
              key={service.num}
              className="bg-[#0B132B] text-white rounded-xl px-4 py-3.5 border border-[#C5A059]/30 flex items-center gap-3"
            >
              <span className="text-xs font-bold text-[#C5A059] font-mono-data shrink-0">
                {service.num}.
              </span>
              <span className="text-xs sm:text-sm font-semibold leading-snug">
                {service.title[lang]}
              </span>
            </div>
          ))}
        </div>

        {/* 7 Practice Area Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {SPECIALTIES.map((item, idx) => {
            const Icon = getSpecialtyIcon(item.id);
            const isLead = idx === 0;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveSpecialty(item)}
                className={`text-start rounded-2xl p-6 border transition-all cursor-pointer flex flex-col justify-between gap-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C5A059] ${
                  isLead
                    ? 'md:col-span-2 lg:col-span-2 bg-[#0B132B] text-white border-[#0B132B] hover:border-[#C5A059]'
                    : 'bg-white text-[#0B132B] border-slate-200 hover:border-[#C5A059]'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-bold text-[#C5A059] font-mono-data">
                      {item.number}.
                    </span>
                    <span
                      className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        isLead
                          ? 'bg-[#C5A059]/15 text-[#C5A059]'
                          : 'bg-[#0B132B]/5 text-[#0B132B]'
                      }`}
                    >
                      <Icon className="w-5 h-5" aria-hidden="true" />
                    </span>
                  </div>

                  <h3 className="text-lg sm:text-xl font-bold">{item.title[lang]}</h3>
                  <p
                    className={`text-xs sm:text-sm font-medium ${
                      isLead ? 'text-[#C5A059]' : 'text-slate-500'
                    }`}
                  >
                    {item.subtitle[lang]}
                  </p>
                  <p
                    className={`text-sm leading-relaxed ${
                      isLead ? 'text-slate-200 max-w-2xl' : 'text-slate-600'
                    }`}
                  >
                    {item.description[lang]}
                  </p>
                </div>

                <div
                  className={`pt-3 border-t flex items-center justify-between text-xs sm:text-sm font-semibold ${
                    isLead
                      ? 'border-white/15 text-[#C5A059]'
                      : 'border-slate-100 text-[#0B132B]'
                  }`}
                >
                  <span>
                    {lang === 'ar'
                      ? 'عرض التفاصيل وطلب استشارة قانونية'
                      : 'View Scope & Request Consultation'}
                  </span>
                  <ArrowIcon className="w-4 h-4 shrink-0" aria-hidden="true" />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Specialty Detail Dialog (No Public AI) */}
      {activeSpecialty && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="specialty-dialog-title"
          className="fixed inset-0 z-50 bg-[#0B132B]/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
        >
          <div className="bg-white text-[#0B132B] w-full sm:max-w-xl rounded-t-3xl sm:rounded-2xl shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-bold text-[#C5A059] font-mono-data">
                  {activeSpecialty.number}. {activeSpecialty.leadLawyer[lang]}
                </p>
                <h3 id="specialty-dialog-title" className="text-lg sm:text-xl font-bold">
                  {activeSpecialty.title[lang]}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveSpecialty(null)}
                aria-label={lang === 'ar' ? 'إغلاق التفاصيل' : 'Close specialty details'}
                className="min-h-[44px] min-w-[44px] rounded-xl flex items-center justify-center hover:bg-slate-100 text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <p className="text-sm sm:text-base text-slate-700 leading-relaxed">
                {activeSpecialty.description[lang]}
              </p>

              <div className="bg-[#FAF8F3] rounded-xl p-5 border border-slate-200 space-y-3">
                <div className="flex items-center gap-2 text-sm font-bold text-[#0B132B]">
                  <FileText className="w-4 h-4 text-[#C5A059]" aria-hidden="true" />
                  <span>
                    {lang === 'ar'
                      ? 'المستندات الأولية المطلوبة للاستشارة:'
                      : 'Recommended Documents for Consultation:'}
                  </span>
                </div>
                <ul className="space-y-2">
                  {activeSpecialty.documentsNeeded[lang].map((doc) => (
                    <li key={doc} className="flex items-start gap-2.5 text-sm text-slate-700">
                      <CheckCircle2
                        className="w-4 h-4 text-[#C5A059] mt-0.5 shrink-0"
                        aria-hidden="true"
                      />
                      <span>{doc}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    const id = activeSpecialty.id;
                    setActiveSpecialty(null);
                    onBookWithSpecialty(id);
                  }}
                  className="w-full min-h-[48px] px-5 py-3 rounded-xl bg-[#C5A059] hover:bg-[#d4b06a] text-[#0B132B] font-bold text-sm cursor-pointer transition-colors"
                >
                  {lang === 'ar' ? 'طلب استشارة قانونية الآن' : 'Request Legal Consultation'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
