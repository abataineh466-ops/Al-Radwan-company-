import { Award, Scale } from 'lucide-react';
import type { Language } from '../types/legal';
import { LAWYERS, UI_COPY, WHY_US_PILLARS } from '../data/firmContent';

interface AboutAndTeamSectionProps {
  lang: Language;
  onBookWithTeam: () => void;
}

export function AboutAndTeamSection({ lang, onBookWithTeam }: AboutAndTeamSectionProps) {
  return (
    <>
      {/* About ("من نحن") & Emotional Trust Pillars */}
      <section id="about" className="bg-[#F8FAFC] py-14 sm:py-20 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
            <div className="lg:col-span-6 space-y-4">
              <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm font-bold text-[#C5A059]">
                <span>{lang === 'ar' ? 'من نحن' : 'About Us'}</span>
                <span aria-hidden="true">·</span>
                <span>{UI_COPY.slogan[lang]}</span>
              </div>

              <h2 className="text-2xl sm:text-3xl font-bold text-[#0B132B] leading-snug [text-wrap:balance] font-display-en">
                {lang === 'ar'
                  ? 'شركة الرضوان للمحاماة والاستشارات القانونية — حقك… مسؤوليتنا'
                  : 'Al-Radwan Law Firm & Legal Consultations — Your Right... Our Responsibility'}
              </h2>

              <p className="text-slate-700 leading-relaxed text-base">
                {lang === 'ar'
                  ? 'خلف كل قضية إنسانٌ يبحث عن الأمان، وعن حقٍّ يخشى أن يضيع. ولهذا لا نتعامل مع ملفاتكم كأوراق وإجراءات، بل كأمانة نحملها بصدق، ونقف فيها إلى جانبكم بثبات حتى يعود الحق إلى أصحابه.'
                  : 'Behind every legal case is a person searching for safety and a right they fear losing. That is why we never treat your file as mere paperwork, but as a sacred trust we carry honestly until justice is restored.'}
              </p>

              <p className="text-slate-600 leading-relaxed text-base">
                {lang === 'ar'
                  ? 'في شركة الرضوان، يقود المحامي رضوان علي البطاينة، الحاصل على الماجستير في العلوم السياسية والعلاقات الدولية، فريقاً يجمع بين الخبرة القانونية العميقة والرؤية الواسعة، ليقدّم حلولاً آمنة وموثوقة تحمي مصالحكم وتمنحكم الطمأنينة.'
                  : "At Al-Radwan, Attorney Radwan Ali Al-Bataineh — holding a Master's in Political Science and International Relations — leads a dedicated team uniting legal mastery with strategic vision to provide secure, reliable solutions that protect your interests and bring peace of mind."}
              </p>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={onBookWithTeam}
                  className="min-h-[48px] px-6 py-3 rounded-xl bg-[#0B132B] hover:bg-[#162247] text-white text-sm font-bold transition-colors cursor-pointer"
                >
                  {lang === 'ar'
                    ? 'احجز استشارتك المجانية مع الفريق'
                    : 'Book Your Free Consultation With Our Team'}
                </button>
              </div>
            </div>

            {/* Why Choose Us 4 Emotional Pillars */}
            <div className="lg:col-span-6">
              <h3 className="text-lg font-bold text-[#0B132B] mb-5">
                {lang === 'ar' ? 'لماذا يطمئن موكلونا لشركة الرضوان؟' : 'Why Clients Trust Al-Radwan'}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {WHY_US_PILLARS.map((pillar) => (
                  <div
                    key={pillar.num}
                    className="bg-white rounded-xl p-5 border border-slate-200 space-y-2"
                  >
                    <div className="text-sm font-bold text-[#C5A059] font-mono-data">
                      {pillar.num}.
                    </div>
                    <h4 className="text-base font-bold text-[#0B132B]">
                      {pillar.title[lang]}
                    </h4>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      {pillar.body[lang]}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Our Legal Team ("فريق العمل") — Radwan (Director), Ahmad Al-Khouli (Partner), Najwa, Layali */}
      <section id="team" className="bg-white py-14 sm:py-20 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mb-10 space-y-2">
            <p className="text-xs sm:text-sm font-bold text-[#C5A059]">
              {lang === 'ar' ? 'فريق العمل' : 'Our Legal Team'}
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#0B132B] [text-wrap:balance] font-display-en">
              {lang === 'ar'
                ? 'فريق واحد، يجمعه الإخلاص لقضايا موكّليه والالتزام بحقوقهم.'
                : 'One Unified Team Bound by Devotion to Our Clients and Their Rights.'}
            </h2>
            <p className="text-slate-600 text-base">
              {lang === 'ar'
                ? 'بقيادة مؤسس الشركة والمدير المحامي رضوان علي البطاينة والشريك المحامي أحمد سليم الخولي إلى جانب نخبة من المحاميات المتخصصات.'
                : 'Led by Founder & Director Radwan Ali Al-Bataineh and Partner Ahmad Saleem Al-Khouli alongside our dedicated specialist attorneys.'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {LAWYERS.map((lawyer) => {
              const isLeadership = Boolean(lawyer.isDirector || lawyer.isPartner);
              return (
                <article
                  key={lawyer.id}
                  className={`rounded-2xl p-6 sm:p-7 border transition-colors flex flex-col justify-between gap-5 ${
                    lawyer.isDirector
                      ? 'bg-[#0B132B] text-white border-[#0B132B]'
                      : lawyer.isPartner
                        ? 'bg-[#121D3D] text-white border-[#C5A059]/45'
                        : 'bg-[#F8FAFC] text-[#0B132B] border-slate-200'
                  }`}
                >
                  <div className="space-y-3.5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3.5">
                        <div
                          aria-hidden="true"
                          className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-base shrink-0 border ${
                            isLeadership
                              ? 'bg-[#C5A059] text-[#0B132B] border-[#C5A059]'
                              : 'bg-[#0B132B] text-[#C5A059] border-[#0B132B]'
                          }`}
                        >
                          {lawyer.initials[lang]}
                        </div>
                        <div className="space-y-0.5">
                          <span className="block text-xs font-bold text-[#C5A059]">
                            {lawyer.role[lang]}
                          </span>
                          <h3 className="text-lg sm:text-xl font-bold leading-snug">
                            {lawyer.name[lang]}
                          </h3>
                        </div>
                      </div>

                      <Scale
                        className={`w-5 h-5 shrink-0 mt-1 ${
                          isLeadership ? 'text-[#C5A059]' : 'text-slate-400'
                        }`}
                        aria-hidden="true"
                      />
                    </div>

                    {lawyer.credential && (
                      <div className="flex items-center gap-2 text-xs sm:text-sm font-medium text-[#C5A059]">
                        <Award className="w-4 h-4 shrink-0" aria-hidden="true" />
                        <span>{lawyer.credential[lang]}</span>
                      </div>
                    )}

                    <p
                      className={`text-sm leading-relaxed ${
                        isLeadership ? 'text-slate-200' : 'text-slate-600'
                      }`}
                    >
                      {lawyer.bio[lang]}
                    </p>
                  </div>

                  {/* Clean unboxed focus areas with dot separators */}
                  <div
                    className={`pt-4 border-t text-xs font-semibold flex flex-wrap items-center gap-x-2 gap-y-1 ${
                      isLeadership
                        ? 'border-white/15 text-[#C5A059]'
                        : 'border-slate-200 text-[#0B132B]'
                    }`}
                  >
                    {lawyer.focusAreas[lang].map((area, i) => (
                      <span key={area} className="inline-flex items-center gap-2">
                        {i > 0 && <span aria-hidden="true">·</span>}
                        <span>{area}</span>
                      </span>
                    ))}
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>
    </>
  );
}
