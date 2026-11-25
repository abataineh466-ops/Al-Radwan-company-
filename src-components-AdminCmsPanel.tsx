import { useState, type FormEvent } from 'react';
import { Newspaper, Plus, Trash2 } from 'lucide-react';
import type { FirmPublication, Language, PublicationCategory } from '../types/legal.js';

interface AdminCmsPanelProps {
  lang: Language;
  authToken: string;
  publications: FirmPublication[];
  onPublicationCreated: (pub: FirmPublication) => void;
  onPublicationDeleted: (id: string) => void;
}

export function AdminCmsPanel({
  lang,
  authToken,
  publications,
  onPublicationCreated,
  onPublicationDeleted,
}: AdminCmsPanelProps) {
  const [category, setCategory] = useState<PublicationCategory>('article');
  const [titleAr, setTitleAr] = useState('');
  const [summaryAr, setSummaryAr] = useState('');
  const [contentAr, setContentAr] = useState('');
  const [authorName, setAuthorName] = useState('المحامي رضوان علي بطاينة');
  const [mediaOutlet, setMediaOutlet] = useState('');
  const [keywords, setKeywords] = useState('المحامي رضوان البطاينة, شركة الرضوان للقانون والتحكيم');
  const [featured, setFeatured] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handlePublish(e: FormEvent) {
    e.preventDefault();
    if (!titleAr.trim() || !summaryAr.trim() || !contentAr.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/publications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        credentials: 'include',
        body: JSON.stringify({
          category,
          titleAr,
          summaryAr,
          contentAr,
          authorName,
          mediaOutlet: mediaOutlet || undefined,
          featured,
          status: 'published',
          seoKeywords: keywords
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
        }),
      });
      if (res.ok) {
        const data = (await res.json()) as { publication: FirmPublication };
        onPublicationCreated(data.publication);
        setTitleAr('');
        setSummaryAr('');
        setContentAr('');
        setMediaOutlet('');
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/publications/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${authToken}` },
      credentials: 'include',
    });
    if (res.ok) onPublicationDeleted(id);
  }

  return (
    <div className="space-y-6">
      <form
        onSubmit={handlePublish}
        className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 space-y-4"
      >
        <div className="flex items-center gap-2 text-[#0B132B]">
          <Newspaper className="w-5 h-5 text-[#C5A059]" />
          <h2 className="text-base font-extrabold">
            {lang === 'ar'
              ? 'نظام إدارة المحتوى الإعلامي والمقالات القانونية (SEO & Media CMS)'
              : 'Articles, Legal Analyses & Media CMS'}
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as PublicationCategory)}
            className="min-h-[42px] px-3 py-2 rounded-xl border border-slate-300 text-sm bg-white font-semibold"
          >
            <option value="article">مقال قانوني</option>
            <option value="analysis">تحليل قانوني</option>
            <option value="media">ظهور إعلامي</option>
            <option value="interview">لقاء / مقابلة</option>
            <option value="news">خبر وإنجاز مهني</option>
          </select>

          <input
            type="text"
            value={authorName}
            onChange={(e) => setAuthorName(e.target.value)}
            placeholder="اسم الكاتب"
            className="min-h-[42px] px-3 py-2 rounded-xl border border-slate-300 text-sm"
          />

          <input
            type="text"
            value={mediaOutlet}
            onChange={(e) => setMediaOutlet(e.target.value)}
            placeholder="المنصة الإعلامية (اختياري)"
            className="min-h-[42px] px-3 py-2 rounded-xl border border-slate-300 text-sm"
          />
        </div>

        <input
          type="text"
          required
          value={titleAr}
          onChange={(e) => setTitleAr(e.target.value)}
          placeholder="عنوان المقال أو الخبر أو التحليل القانوني..."
          className="w-full min-h-[42px] px-3.5 py-2 rounded-xl border border-slate-300 text-sm font-bold"
        />

        <input
          type="text"
          required
          value={summaryAr}
          onChange={(e) => setSummaryAr(e.target.value)}
          placeholder="ملخص قصير يظهر في البطاقة وفي محركات البحث (SEO Description)..."
          className="w-full min-h-[42px] px-3.5 py-2 rounded-xl border border-slate-300 text-sm"
        />

        <textarea
          rows={5}
          required
          value={contentAr}
          onChange={(e) => setContentAr(e.target.value)}
          placeholder="النص الكامل للمقال أو التحليل القانوني..."
          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm leading-relaxed"
        />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <label className="inline-flex items-center gap-2 text-xs font-semibold cursor-pointer">
              <input
                type="checkbox"
                checked={featured}
                onChange={(e) => setFeatured(e.target.checked)}
                className="accent-[#C5A059]"
              />
              <span>إبراز كمنشور رئيسي</span>
            </label>
            <input
              type="text"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder="كلمات مفتاحية SEO مفصولة بفاصلة"
              className="min-h-[36px] px-3 py-1 rounded-lg border border-slate-300 text-xs w-64"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="min-h-[42px] px-5 py-2 rounded-xl bg-[#C5A059] hover:bg-[#d4b06a] text-[#0B132B] text-sm font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{saving ? 'جاري النشر...' : 'نشر على الموقع فوراً'}</span>
          </button>
        </div>
      </form>

      <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100">
        {publications.map((pub) => (
          <div key={pub.id} className="p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1 max-w-2xl">
              <p className="text-xs font-bold text-[#C5A059]">
                {pub.category} · {pub.publishedAt} · {pub.authorName}
              </p>
              <h3 className="text-sm font-bold text-[#0B132B]">{pub.titleAr}</h3>
              <p className="text-xs text-slate-600">{pub.summaryAr}</p>
            </div>
            <button
              type="button"
              onClick={() => void handleDelete(pub.id)}
              className="min-h-[36px] px-3 py-1.5 rounded-lg border border-red-200 bg-red-50 text-red-700 text-xs font-bold flex items-center gap-1 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>حذف</span>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
