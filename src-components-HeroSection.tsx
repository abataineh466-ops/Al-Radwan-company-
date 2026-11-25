import {
  ArrowLeft,
  ArrowRight,
  Award,
  FileText,
  Globe,
  MapPin,
  Phone,
  Scale,
} from 'lucide-react';
import type { Language } from '../types/legal.js';
import { ASSET_IMAGES, FIRM_CONTACT, FOUNDER_PROFILE, UI_COPY } from '../data/firmContent.js';

interface HeroSectionProps {
  lang: Language;
  onBookClick: () => void;
  onOpenFounderCv: () => void;
  onToggleLanguage: () => void;
}

export function HeroSection({
  lang,
  onBookClick,
  onOpenFounderCv,
  onToggleLanguage,
}: HeroSectionProps) {
  const ArrowIcon = lang === 'ar' ? ArrowLeft : ArrowRight;

  return (
    <section
      id="top"
      className="relative bg-gradient-to-b from-[#0B132B] via-[#0E1734] to-[#12151C] text-white overflow-hidden"
    >
      {/* Subtle architectural gold accent line */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#C5A059]/60 to-transparent"
      />

      {/* Utility Toolbar inside Hero */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-3.5 pb-3 flex flex-wrap items-center justify-between gap-3 border-b border-white/10">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs sm:text-sm text-slate-300">
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-[#C5A059] shrink-0" aria-hidden="true" />
            <span>{UI_COPY.locationText[lang]}</span>
          </span>
          <a
            href={FIRM_CONTACT.phoneHref}
            dir="ltr"
            className="inline-flex items-center gap-1.5 text-[#C5A059] hover:text-white font-mono-data font-semibold transition-colors"
          >
            <Phone className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>{FIRM_CONTACT.phoneDisplay}</span>
          </a>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onToggleLanguage}
            className="min-h-[38px] px-3 py-1.5 rounded-lg border border-white/20 hover:border-[#C5A059] text-xs sm:text-sm font-semibold text-white flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C5A059]"
          >
            <Globe className="w-3.5 h-3.5 text-[#C5A059]" aria-hidden="true" />
            <span>{lang === 'ar' ? 'English' : 'العربية'}</span>
          </button>
        </div>
      </div>

      {/* Main Executive Split Hero Grid — Founder Priority */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 lg:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Copy Column */}
          <div className="lg:col-span-7 flex flex-col justify-center space-y-5">
            {/* Brand Emblem + New Name Lockup */}
            <div className="inline-flex items-center gap-3 self-start bg-white/5 border border-[#C5A059]/35 rounded-2xl px-4 py-2.5">
              <img
                src={ASSET_IMAGES.logoCrownEmblem}
                alt={UI_COPY.brandShort[lang]}
                className="h-11 w-auto object-contain rounded shrink-0"
              />
              <div className="text-start">
                <p className="text-xs sm:text-sm font-bold text-white">
                  {UI_COPY.brandShort[lang]}
                </p>
                <p className="text-[11px] font-bold tracking-wider text-[#C5A059]">
                  AL-RADWAN LAW &amp; ARBITRATION · RB LEGAL
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs sm:text-sm font-bold text-[#C5A059] flex items-center gap-2">
                <Award className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>{FOUNDER_PROFILE.title[lang]}</span>
              </p>
              <h1 className="text-3xl sm:text-4xl lg:text-[2.85rem] font-extrabold leading-tight text-white [text-wrap:balance] font-display-en">
                {FOUNDER_PROFILE.name[lang]}
              </h1>
              <p className="text-sm sm:text-base font-semibold text-slate-300">
                {FOUNDER_PROFILE.credential[lang]}
              </p>
            </div>

            <p className="text-base sm:text-lg text-slate-200 leading-relaxed max-w-2xl">
              {FOUNDER_PROFILE.executiveBio[lang]}
            </p>

            {/* Practice & Leadership Highlights */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {FOUNDER_PROFILE.achievementsAndScope.slice(0, 2).map((item) => (
                <div
                  key={item.title.ar}
                  className="rounded-xl bg-white/5 border border-white/10 p-3.5 space-y-1"
                >
                  <p className="text-xs sm:text-sm font-bold text-[#C5A059]">
                    {item.title[lang]}
                  </p>
                  <p className="text-xs text-slate-300 leading-relaxed">{item.detail[lang]}</p>
                </div>
              ))}
            </div>

            {/* Primary CTAs: Book Consultation + Founder CV */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 pt-2">
              <button
                type="button"
                onClick={onBookClick}
                className="min-h-[52px] px-7 py-3.5 rounded-xl bg-[#C5A059] hover:bg-[#d4b06a] text-[#0B132B] font-bold text-base flex items-center justify-center gap-2 transition-colors shadow-xl shadow-black/30 cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <span>{UI_COPY.hero.ctaPrimary[lang]}</span>
                <ArrowIcon className="w-4 h-4" aria-hidden="true" />
              </button>

              <button
                type="button"
                onClick={onOpenFounderCv}
                className="min-h-[52px] px-6 py-3.5 rounded-xl bg-white/10 hover:bg-white/15 border border-[#C5A059]/45 text-white font-semibold text-base flex items-center justify-center gap-2 transition-colors cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C5A059]"
              >
                <FileText className="w-4 h-4 text-[#C5A059]" aria-hidden="true" />
                <span>{UI_COPY.hero.ctaCv[lang]}</span>
              </button>
            </div>

            <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-300 pt-1">
              <Scale className="w-4 h-4 text-[#C5A059] shrink-0" aria-hidden="true" />
              <span>
                {lang === 'ar'
                  ? 'عمّان (شارع مكة — مجمع داوود) · إربد (شارع الثلاثين — إشارة الضباط)'
                  : 'Amman (Mecca St — Dawood Complex) · Irbid (30th St — Al-Dubbat Signal)'}
              </span>
            </div>
          </div>

          {/* Large Commanding Founder Portrait */}
          <div className="lg:col-span-5">
            <div className="relative rounded-2xl overflow-hidden border-2 border-[#C5A059]/60 bg-[#070D1F] aspect-[3/4] max-h-[560px] mx-auto shadow-2xl shadow-black/50">
              <img
                src={ASSET_IMAGES.radwanPortrait}
                alt={
                  lang === 'ar'
                    ? 'المحامي رضوان علي بطاينة — المؤسس والمدير العام لشركة الرضوان للقانون والتحكيم'
                    : 'Attorney Radwan Ali Bataineh — Founder & Managing Director of Al-Radwan Law & Arbitration'
                }
                className="w-full h-full object-cover object-top"
              />
              <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#070D1F] via-[#070D1F]/75 to-transparent" />
              <div className="absolute bottom-0 inset-x-0 p-5 sm:p-6">
                <p className="text-xs font-bold tracking-wide text-[#C5A059]">
                  {lang === 'ar' ? 'المؤسس والمدير العام' : 'Founder & Managing Director'}
                </p>
                <p className="text-lg sm:text-xl font-extrabold text-white mt-0.5">
                  {FOUNDER_PROFILE.name[lang]}
                </p>
                <p className="text-xs text-slate-300 mt-0.5">
                  {FOUNDER_PROFILE.credential[lang]}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Full-Width 4-Column Authority Strip Below Split */}
        <div className="mt-10 pt-8 border-t border-white/10 grid grid-cols-2 lg:grid-cols-4 gap-6">
          {UI_COPY.stats.map((stat, idx) => (
            <div key={idx} className="space-y-1">
              <div className="text-xl sm:text-2xl font-bold text-[#C5A059] tabular-nums font-mono-data">
                {lang === 'ar' ? stat.value : stat.valueEn}
              </div>
              <div className="text-xs sm:text-sm text-slate-300">{stat.label[lang]}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
