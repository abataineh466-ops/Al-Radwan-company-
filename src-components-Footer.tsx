import { Lock, Phone } from 'lucide-react';
import type { Language } from '../types/legal.js';
import { ASSET_IMAGES, FIRM_CONTACT, UI_COPY } from '../data/firmContent.js';

interface FooterProps {
  lang: Language;
  onLawyerLoginClick: () => void;
  onToggleLanguage: () => void;
}

export function Footer({ lang, onLawyerLoginClick, onToggleLanguage }: FooterProps) {
  return (
    <footer className="bg-[#070D1F] text-slate-300 border-t border-[#C5A059]/25">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5 text-xs sm:text-sm">
        <div className="flex flex-wrap items-center gap-3">
          <img
            src={ASSET_IMAGES.logoCrownEmblem}
            alt={UI_COPY.brandShort[lang]}
            className="h-9 w-auto object-contain rounded shrink-0"
          />
          <div className="space-y-0.5">
            <div className="font-bold text-white">
              {UI_COPY.brandFull[lang]}
            </div>
            <div className="text-xs text-slate-400">
              {lang === 'ar'
                ? 'فرع عمّان: شارع مكة — مجمع داوود · فرع إربد: شارع الثلاثين — إشارة الضباط'
                : 'Amman: Mecca St — Dawood Complex · Irbid: 30th St — Al-Dubbat Signal'}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
          <a
            href={FIRM_CONTACT.phoneHref}
            dir="ltr"
            className="inline-flex items-center gap-1.5 font-mono-data text-[#C5A059] hover:underline font-bold"
          >
            <Phone className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>{FIRM_CONTACT.phoneDisplay}</span>
          </a>
          <span aria-hidden="true">·</span>
          <button
            type="button"
            onClick={onLawyerLoginClick}
            className="inline-flex items-center gap-1.5 text-slate-200 hover:text-[#C5A059] font-semibold transition-colors cursor-pointer"
          >
            <Lock className="w-3.5 h-3.5 text-[#C5A059]" aria-hidden="true" />
            <span>{lang === 'ar' ? 'دخول المحامين' : 'Attorney Login'}</span>
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
            {lang === 'ar'
              ? '© 2026 شركة الرضوان للقانون والتحكيم'
              : '© 2026 Al-Radwan Law & Arbitration'}
          </span>
        </div>
      </div>
    </footer>
  );
}
