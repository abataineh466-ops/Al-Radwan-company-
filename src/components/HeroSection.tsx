import {
  ArrowLeft,
  ArrowRight,
  Globe,
  HeartHandshake,
  MapPin,
  MessageSquareText,
  Phone,
} from 'lucide-react';
import type { Language } from '../types/legal';
import { ASSET_IMAGES, FIRM_CONTACT, UI_COPY } from '../data/firmContent';

interface HeroSectionProps {
  lang: Language;
  onBookClick: () => void;
  onOpenAiIntake: () => void;
  onToggleLanguage: () => void;
}

export function HeroSection({
  lang,
  onBookClick,
  onOpenAiIntake,
  onToggleLanguage,
}: HeroSectionProps) {
  const ArrowIcon = lang === 'ar' ? ArrowLeft : ArrowRight;

  return (
    <section id="top" className="bg-[#0B132B] text-white">
      {/* Utility Toolbar inside Hero */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-3 flex flex-wrap items-center justify-between gap-3 border-b border-white/10">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs sm:text-sm text-slate-300">
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
            className="min-h-[40px] px-3 py-1.5 rounded-lg border border-white/20 hover:border-[#C5A059] text-xs sm:text-sm font-semibold text-white flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C5A059]"
          >
            <Globe className="w-3.5 h-3.5 text-[#C5A059]" aria-hidden="true" />
            <span>{lang === 'ar' ? 'English' : 'العربية'}</span>
          </button>
        </div>
      </div>

      {/* Main Split Hero Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 lg:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
          {/* Copy Column */}
          <div className="lg:col-span-7 flex flex-col justify-center space-y-5">
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs sm:text-sm font-bold text-[#C5A059] tracking-wide">
              <span>{UI_COPY.brandFull[lang]}</span>
              <span aria-hidden="true">·</span>
              <span>{UI_COPY.slogan[lang]}</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-[2.65rem] font-bold leading-snug text-white [text-wrap:balance] font-display-en">
              {UI_COPY.hero.headline[lang]}
            </h1>

            <p className="text-base sm:text-lg text-slate-200 leading-relaxed max-w-2xl">
              {UI_COPY.hero.subheadline[lang]}
            </p>

            {/* Primary & Secondary Thumb-Friendly CTAs */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 pt-2">
              <button
                type="button"
                onClick={onBookClick}
                className="min-h-[52px] px-7 py-3.5 rounded-xl bg-[#C5A059] hover:bg-[#d4b06a] text-[#0B132B] font-bold text-base flex items-center justify-center gap-2 transition-colors shadow-lg shadow-black/20 cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <span>{UI_COPY.hero.ctaPrimary[lang]}</span>
                <ArrowIcon className="w-4 h-4" aria-hidden="true" />
              </button>

              <button
                type="button"
                onClick={onOpenAiIntake}
                className="min-h-[52px] px-6 py-3.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/25 text-white font-semibold text-base flex items-center justify-center gap-2 transition-colors cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C5A059]"
              >
                <MessageSquareText className="w-4 h-4 text-[#C5A059]" aria-hidden="true" />
                <span>{UI_COPY.hero.ctaAi[lang]}</span>
              </button>
            </div>

            <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-300 pt-1">
              <HeartHandshake className="w-4 h-4 text-[#C5A059] shrink-0" aria-hidden="true" />
              <span>
                {lang === 'ar'
                  ? 'الاستشارة القانونية الأولى مجانية بالكامل · حضورياً في إربد أو أونلاين بسرية تامة'
                  : 'Complimentary initial legal consultation · In-person in Irbid or confidential online session'}
              </span>
            </div>
          </div>

          {/* Authentic Uploaded Portrait of Director Radwan Ali Al-Bataineh */}
          <div className="lg:col-span-5 relative rounded-2xl overflow-hidden border border-[#C5A059]/35 bg-[#121D3D] aspect-[4/3] shadow-2xl shadow-black/30">
            <img
              src={ASSET_IMAGES.radwanPortrait}
              alt={
                lang === 'ar'
                  ? 'المحامي رضوان علي البطاينة — مؤسس ومدير شركة الرضوان للمحاماة والاستشارات القانونية'
                  : 'Attorney Radwan Ali Al-Bataineh — Founder & Director of Al-Radwan Law Firm'
              }
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover object-top"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0B132B]/90 via-[#0B132B]/15 to-transparent" />
            <div className="absolute bottom-0 inset-x-0 p-4 sm:p-5">
              <p className="text-xs text-[#C5A059] font-semibold">
                {lang === 'ar' ? 'مؤسس الشركة والمدير' : 'Founder & Director'}
              </p>
              <p className="text-base sm:text-lg font-bold text-white mt-0.5">
                {lang === 'ar' ? 'المحامي رضوان علي البطاينة' : 'Attorney Radwan Ali Al-Bataineh'}
              </p>
            </div>
          </div>
        </div>

        {/* Full-Width 4-Column Authority Strip Below Split */}
        <div className="mt-10 pt-8 border-t border-white/10 grid grid-cols-2 lg:grid-cols-4 gap-6">
          {UI_COPY.stats.map((stat, idx) => (
            <div key={idx} className="space-y-1">
              <div className="text-2xl sm:text-3xl font-bold text-[#C5A059] tabular-nums">
                {lang === 'ar' ? stat.value : stat.valueEn}
              </div>
              <div className="text-xs sm:text-sm text-slate-300">
                {stat.label[lang]}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
