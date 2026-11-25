import { Award, CheckCircle2, FileText, Scale } from 'lucide-react';
import type { Language } from '../types/legal.js';
import {
  ASSET_IMAGES,
  FOUNDER_PROFILE,
  TEAM_LAWYERS,
  UI_COPY,
  WHY_US_PILLARS,
} from '../data/firmContent.js';

interface AboutAndTeamSectionProps {
  lang: Language;
  onBookWithTeam: () => void;
  onOpenFounderCv: () => void;
}

export function AboutAndTeamSection({
  lang,
  onBookWithTeam,
  onOpenFounderCv,
}: AboutAndTeamSectionProps) {
  return (
    <>
      {/* Founder Leadership & Vision Section */}
      <section id="about" className="bg-[#FAF8F3] py-14 sm:py-20 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
            <div className="lg:col-span-6 space-y-5">
              <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm font-bold text-[#C5A059]">
                <span>{UI_COPY.brandShort[lang]}</span>
                <span aria-hidden="true">·</span>
                <span>{UI_COPY.brandAbbr}</span>
              </div>

              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0B132B] leading-snug [text-wrap:balance] font-display-en">
                {FOUNDER_PROFILE.leadershipHeading[lang]}
              </h2>

              <p className="text-slate-700 leading-relaxed text-base">
                {FOUNDER_PROFILE.executiveBio[lang]}
              </p>

              <p className="text-slate-600 leading-relaxed text-base">
                {FOUNDER_PROFILE.visionStatement[lang]}
              </p>

              {/* Achievements & Scope Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
                {FOUNDER_PROFILE.achievementsAndScope.map((item) => (
                  <div
                    key={item.title.ar}
                    className="bg-white rounded-xl p-4 border border-slate-200 space-y-1.5"
                  >
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-[#C5A059] shrink-0 mt-0.5" />
                      <h3 className="text-sm font-bold text-[#0B132B]">{item.title[lang]}</h3>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">{item.detail[lang]}</p>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={onOpenFounderCv}
                  className="min-h-[48px] px-6 py-3 rounded-xl bg-[#0B132B] hover:bg-[#162247] text-white text-sm font-bold flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <FileText className="w-4 h-4 text-[#C5A059]" />
                  <span>
                    {lang === 'ar'
                      ? 'صفحة المؤسس والسيرة الذاتية'
                      : 'Founder Page & Full CV'}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={onBookWithTeam}
                  className="min-h-[48px] px-6 py-3 rounded-xl bg-[#C5A059] hover:bg-[#d4b06a] text-[#0B132B] text-sm font-bold transition-colors cursor-pointer"
                >
                  {UI_COPY.hero.ctaPrimary[lang]}
                </button>
              </div>
            </div>

            {/* Institutional Pillars */}
            <div className="lg:col-span-6 space-y-5">
              <div className="bg-white rounded-2xl p-5 border border-slate-200 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <img
                    src={ASSET_IMAGES.logoScale}
                    alt={UI_COPY.brandShort[lang]}
                    className="h-14 w-auto object-contain shrink-0"
                  />
                  <div>
                    <p className="text-xs font-bold text-[#C5A059]">{UI_COPY.brandAbbr}</p>
                    <h3 className="text-base sm:text-lg font-bold text-[#0B132B]">
                      {lang === 'ar'
                        ? 'معايير العمل المؤسسي في شركة الرضوان'
                        : 'Institutional Standards at RB LEGAL'}
                    </h3>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {WHY_US_PILLARS.map((pillar) => (
                  <div
                    key={pillar.num}
                    className="bg-white rounded-xl p-5 border border-slate-200 space-y-2"
                  >
                    <div className="text-sm font-bold text-[#C5A059] font-mono-data">
                      {pillar.num}.
                    </div>
                    <h4 className="text-base font-bold text-[#0B132B]">{pillar.title[lang]}</h4>
                    <p className="text-sm text-slate-600 leading-relaxed">{pillar.body[lang]}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Standalone Founder Card + Compact Side-by-Side Legal Team */}
      <section id="team" className="bg-white py-14 sm:py-20 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="max-w-3xl space-y-2">
            <p className="text-xs sm:text-sm font-bold text-[#C5A059]">
              {lang === 'ar' ? 'القيادة والفريق القانوني' : 'Leadership & Legal Team'}
            </p>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0B132B] [text-wrap:balance] font-display-en">
              {lang === 'ar'
                ? 'قيادة مؤسسية راسخة وفريق محامين متخصص'
                : 'Commanding Leadership & Dedicated Legal Counsel'}
            </h2>
          </div>

          {/* Standalone Founder Leadership Banner */}
          <div
            id="founder"
            className="rounded-2xl bg-gradient-to-br from-[#0B132B] via-[#101B3B] to-[#141820] text-white border border-[#C5A059]/45 p-6 sm:p-8 shadow-xl"
          >
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
              <div className="md:col-span-4 lg:col-span-3">
                <div className="rounded-2xl overflow-hidden border-2 border-[#C5A059]/70 aspect-[3/4] max-w-[240px] mx-auto bg-[#070D1F]">
                  <img
                    src={ASSET_IMAGES.radwanPortrait}
                    alt={FOUNDER_PROFILE.name[lang]}
                    className="w-full h-full object-cover object-top"
                  />
                </div>
              </div>

              <div className="md:col-span-8 lg:col-span-9 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="inline-block text-xs font-bold text-[#C5A059] mb-1">
                      {lang === 'ar' ? 'المؤسس والمدير العام' : 'Founder & Managing Director'}
                    </span>
                    <h3 className="text-2xl sm:text-3xl font-extrabold text-white">
                      {FOUNDER_PROFILE.name[lang]}
                    </h3>
                  </div>
                  <Scale className="w-7 h-7 text-[#C5A059]" aria-hidden="true" />
                </div>

                <div className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-[#C5A059] bg-white/5 border border-[#C5A059]/30 rounded-lg px-3 py-1.5">
                  <Award className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>{FOUNDER_PROFILE.credential[lang]}</span>
                </div>

                <p className="text-sm sm:text-base text-slate-200 leading-relaxed max-w-3xl">
                  {FOUNDER_PROFILE.executiveBio[lang]}
                </p>

                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <button
                    type="button"
                    onClick={onOpenFounderCv}
                    className="min-h-[42px] px-5 py-2 rounded-xl bg-[#C5A059] hover:bg-[#d4b06a] text-[#0B132B] text-xs sm:text-sm font-bold cursor-pointer transition-colors"
                  >
                    {UI_COPY.hero.ctaCv[lang]}
                  </button>
                  <button
                    type="button"
                    onClick={onBookWithTeam}
                    className="min-h-[42px] px-5 py-2 rounded-xl border border-white/25 hover:border-[#C5A059] text-white text-xs sm:text-sm font-semibold cursor-pointer transition-colors"
                  >
                    {UI_COPY.hero.ctaPrimary[lang]}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Compact Uniform Team Grid (Ahmad non-partner, Najwa, Layali, Ghufran) */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-[#0B132B]">
              {lang === 'ar' ? 'فريق المحامين' : 'Legal Team'}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {TEAM_LAWYERS.map((lawyer) => (
                <article
                  key={lawyer.id}
                  className="rounded-xl p-4 sm:p-5 bg-[#FAF8F3] text-[#0B132B] border border-slate-200 hover:border-[#C5A059]/60 transition-colors flex flex-col justify-between gap-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div
                        aria-hidden="true"
                        className="w-10 h-10 rounded-lg bg-[#0B132B] text-[#C5A059] flex items-center justify-center font-bold text-xs shrink-0 border border-[#C5A059]/30"
                      >
                        {lawyer.initials[lang]}
                      </div>
                      <div className="min-w-0">
                        <span className="block text-[11px] font-bold text-[#C5A059] truncate">
                          {lawyer.role[lang]}
                        </span>
                        <h4 className="text-sm sm:text-base font-bold leading-snug text-[#0B132B]">
                          {lawyer.name[lang]}
                        </h4>
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed">{lawyer.bio[lang]}</p>
                  </div>

                  <div className="pt-3 border-t border-slate-200 text-[11px] font-semibold text-[#0B132B] flex flex-wrap items-center gap-x-1.5 gap-y-1">
                    {lawyer.focusAreas[lang].map((area, i) => (
                      <span key={area} className="inline-flex items-center gap-1.5">
                        {i > 0 && <span aria-hidden="true">·</span>}
                        <span>{area}</span>
                      </span>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
