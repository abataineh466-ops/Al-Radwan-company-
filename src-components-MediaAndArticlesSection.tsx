import { useState } from 'react';
import { BookOpen, Calendar, Mic, Newspaper, Sparkles, X } from 'lucide-react';
import type { FirmPublication, Language, PublicationCategory } from '../types/legal.js';
import { FOUNDER_PROFILE } from '../data/firmContent.js';

interface MediaAndArticlesSectionProps {
  lang: Language;
  publications: FirmPublication[];
  onBookClick: () => void;
}

const CATEGORY_META: Record<
  PublicationCategory,
  { ar: string; en: string }
> = {
  analysis: { ar: 'تحليلات قانونية', en: 'Legal Analysis' },
  article: { ar: 'مقالات قانونية', en: 'Legal Articles' },
  media: { ar: 'الظهور الإعلامي', en: 'Media Appearances' },
  interview: { ar: 'اللقاءات والمقابلات', en: 'Interviews' },
  news: { ar: 'أخبار وإنجازات', en: 'Firm News' },
};

export function MediaAndArticlesSection({
  lang,
  publications,
  onBookClick,
}: MediaAndArticlesSectionProps) {
  const [selectedCategory, setSelectedCategory] = useState<PublicationCategory | 'all'>('all');
  const [activePub, setActivePub] = useState<FirmPublication | null>(null);

  const publishedItems = publications.filter((p) => p.status === 'published');
  const filtered =
    selectedCategory === 'all'
      ? publishedItems
      : publishedItems.filter((p) => p.category === selectedCategory);

  return (
    <section id="media" className="bg-[#FAF8F3] py-14 sm:py-20 border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div className="max-w-3xl space-y-2">
            <p className="text-xs sm:text-sm font-bold text-[#C5A059]">
              {lang === 'ar'
                ? 'المنصة الفكرية والإعلامية — المحامي رضوان البطاينة'
                : 'Legal Insights, Media & Publications — Attorney Radwan Al-Bataineh'}
            </p>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0B132B] [text-wrap:balance] font-display-en">
              {lang === 'ar'
                ? 'التحليلات القانونية، المقالات، والظهور الإعلامي'
                : 'Legal Analyses, Articles, Interviews & Firm News'}
            </h2>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => setSelectedCategory('all')}
              className={`min-h-[36px] px-3.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap cursor-pointer ${
                selectedCategory === 'all'
                  ? 'bg-[#0B132B] text-white'
                  : 'bg-white text-slate-700 border border-slate-200 hover:border-[#C5A059]'
              }`}
            >
              {lang === 'ar' ? 'الكل' : 'All'}
            </button>
            {(Object.keys(CATEGORY_META) as PublicationCategory[]).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`min-h-[36px] px-3.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-[#0B132B] text-white'
                    : 'bg-white text-slate-700 border border-slate-200 hover:border-[#C5A059]'
                }`}
              >
                {CATEGORY_META[cat][lang]}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-sm text-slate-500">
            {lang === 'ar'
              ? 'لا توجد منشورات في هذا التصنيف حالياً.'
              : 'No publications in this category yet.'}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {filtered.map((pub) => {
              const Icon =
                pub.category === 'media' || pub.category === 'interview'
                  ? Mic
                  : pub.category === 'news'
                    ? Newspaper
                    : pub.category === 'analysis'
                      ? Sparkles
                      : BookOpen;

              return (
                <article
                  key={pub.id}
                  className={`rounded-2xl p-6 border flex flex-col justify-between gap-5 transition-colors ${
                    pub.featured
                      ? 'bg-[#0B132B] text-white border-[#C5A059]/45'
                      : 'bg-white text-[#0B132B] border-slate-200 hover:border-[#C5A059]'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="inline-flex items-center gap-1.5 font-bold text-[#C5A059]">
                        <Icon className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>{CATEGORY_META[pub.category][lang]}</span>
                      </span>
                      <span
                        dir="ltr"
                        className={`font-mono-data ${
                          pub.featured ? 'text-slate-300' : 'text-slate-500'
                        }`}
                      >
                        {pub.publishedAt}
                      </span>
                    </div>

                    <h3 className="text-lg font-bold leading-snug">
                      {lang === 'en' && pub.titleEn ? pub.titleEn : pub.titleAr}
                    </h3>

                    <p
                      className={`text-sm leading-relaxed ${
                        pub.featured ? 'text-slate-200' : 'text-slate-600'
                      }`}
                    >
                      {lang === 'en' && pub.summaryEn ? pub.summaryEn : pub.summaryAr}
                    </p>
                  </div>

                  <div
                    className={`pt-4 border-t flex items-center justify-between gap-2 text-xs ${
                      pub.featured ? 'border-white/15' : 'border-slate-100'
                    }`}
                  >
                    <span className="font-semibold text-[#C5A059]">
                      {pub.authorName || FOUNDER_PROFILE.name[lang]}
                    </span>
                    <button
                      type="button"
                      onClick={() => setActivePub(pub)}
                      className={`font-bold underline-offset-4 hover:underline cursor-pointer ${
                        pub.featured ? 'text-white' : 'text-[#0B132B]'
                      }`}
                    >
                      {lang === 'ar' ? 'قراءة كاملة' : 'Read Full Article'}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {/* Article / Media Reader Modal */}
      {activePub && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="pub-reader-title"
          className="fixed inset-0 z-50 bg-[#0B132B]/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
        >
          <div className="bg-white text-[#0B132B] w-full sm:max-w-2xl rounded-t-3xl sm:rounded-2xl shadow-2xl border border-slate-200 max-h-[90vh] flex flex-col">
            <div className="bg-[#0B132B] text-white px-6 py-4 rounded-t-3xl sm:rounded-t-2xl flex items-center justify-between gap-3 shrink-0">
              <div>
                <p className="text-xs font-bold text-[#C5A059]">
                  {CATEGORY_META[activePub.category][lang]} · {activePub.publishedAt}
                </p>
                <h3 id="pub-reader-title" className="text-base sm:text-lg font-bold mt-0.5">
                  {lang === 'en' && activePub.titleEn ? activePub.titleEn : activePub.titleAr}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActivePub(null)}
                aria-label={lang === 'ar' ? 'إغلاق المقال' : 'Close article'}
                className="min-h-[40px] min-w-[40px] rounded-xl flex items-center justify-center hover:bg-white/10 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 pb-3 border-b border-slate-200">
                <span className="font-bold text-[#0B132B]">
                  {lang === 'ar' ? 'بقلم:' : 'Author:'} {activePub.authorName}
                </span>
                {activePub.mediaOutlet && (
                  <span className="inline-flex items-center gap-1 text-[#C5A059] font-semibold">
                    <Calendar className="w-3.5 h-3.5" />
                    {activePub.mediaOutlet}
                  </span>
                )}
              </div>

              <div className="text-sm sm:text-base text-slate-800 leading-loose whitespace-pre-wrap">
                {lang === 'en' && activePub.contentEn ? activePub.contentEn : activePub.contentAr}
              </div>

              {activePub.seoKeywords && activePub.seoKeywords.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-2">
                  {activePub.seoKeywords.map((kw) => (
                    <span
                      key={kw}
                      className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-[#FAF8F3] border border-slate-200 text-slate-700"
                    >
                      #{kw}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-slate-200 bg-[#FAF8F3] rounded-b-2xl flex flex-wrap items-center justify-between gap-3 shrink-0">
              <span className="text-xs font-semibold text-slate-600">
                {lang === 'ar'
                  ? 'هل لديك استفسار قانوني حول هذا الموضوع؟'
                  : 'Have a legal question related to this topic?'}
              </span>
              <button
                type="button"
                onClick={() => {
                  setActivePub(null);
                  onBookClick();
                }}
                className="min-h-[42px] px-5 py-2 rounded-xl bg-[#C5A059] hover:bg-[#d4b06a] text-[#0B132B] text-xs sm:text-sm font-bold cursor-pointer"
              >
                {lang === 'ar' ? 'طلب استشارة قانونية' : 'Request Consultation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
