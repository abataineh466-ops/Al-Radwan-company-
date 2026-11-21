import { Lock, Phone, Scale } from 'lucide-react';
import type { Language } from '../types/legal';
import { FIRM_CONTACT, UI_COPY } from '../data/firmContent';

interface FooterProps {
  lang: Language;
  onLawyerLoginClick: () => void;
  onToggleLanguage: () => void;
}

export function Footer({ lang, onLawyerLoginClick, onToggleLanguage }: FooterProps) {
  return (
    <footer className="bg-[#070D1F] text-slate-300 border-t border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-xs sm:text-sm">
        <div className="flex flex-wrap items-center gap-2.5">
          <Scale className="w-4 h-4 text-[#C5A059] shrink-0" aria-hidden="true" />
          <span className="font-semibold text-white">{UI_COPY.brandFull[lang]}</span>
          <span aria-hidden="true">·</span>
          <span>{FIRM_CONTACT.addressShort[lang]}</span>
          <span aria-hidden="true">·</span>
          <a
            href={FIRM_CONTACT.phoneHref}
            dir="ltr"
            className="inline-flex items-center gap-1 font-mono-data text-[#C5A059] hover:underline font-semibold"
          >
            <Phone className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>{FIRM_CONTACT.phoneDisplay}</span>
          </a>
        </div>

        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
          <span className="font-bold text-[#C5A059]">{UI_COPY.closingMotto[lang]}</span>
          <span aria-hidden="true">·</span>
          <button
            type="button"
            onClick={onLawyerLoginClick}
            className="inline-flex items-center gap-1.5 text-slate-200 hover:text-[#C5A059] font-semibold transition-colors cursor-pointer"
          >
            <Lock className="w-3.5 h-3.5 text-[#C5A059]" aria-hidden="true" />
            <span>{lang === 'ar' ? 'تسجيل دخول المحامين' : 'Attorney Login'}</span>
          </button>
          <span aria-hidden="true">·</span>
          <button
            type="button"
            onClick={onToggleLanguage}
            className="hover:text-white cursor-pointer"
          >
            {lang === 'ar' ? 'English' : 'العربية'}
          </button>
          <span aria-hidden="true">·</span>
          <span>
            {lang === 'ar' ? '© 2026 شركة الرضوان للمحاماة' : '© 2026 Al-Radwan Law Firm'}
          </span>
        </div>
      </div>
    </footer>
  );
}
