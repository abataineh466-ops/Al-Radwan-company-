import { useState, type ChangeEvent, type FormEvent } from 'react';
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  Download,
  Edit3,
  Eye,
  FileCheck2,
  FileText,
  History,
  Loader2,
  Paperclip,
  Printer,
  RefreshCw,
  Scale,
  Send,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import type {
  AuthSessionUser,
  Language,
  LegalCase,
  LegalDocumentRecord,
  LegalDocumentType,
  LegalReferenceCitation,
} from '../types/legal.js';

interface RbAiAssistantPanelProps {
  lang: Language;
  authToken: string;
  currentUser: AuthSessionUser;
  cases: LegalCase[];
  documents: LegalDocumentRecord[];
  initialCaseId?: string;
  onDocumentSaved: (doc: LegalDocumentRecord) => void;
}

interface AiTurnMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  questions?: string[];
}

const DOC_TYPE_LABELS: Array<{ id: LegalDocumentType; ar: string; en: string }> = [
  { id: 'lawsuit', ar: 'لائحة دعوى', en: 'Statement of Claim' },
  { id: 'defense_memo', ar: 'لائحة جوابية', en: 'Statement of Defense' },
  { id: 'legal_memo', ar: 'مذكرة قانونية', en: 'Legal Memorandum' },
  { id: 'petition', ar: 'استدعاء', en: 'Petition' },
  { id: 'notarial_notice', ar: 'إنذار عدلي', en: 'Notarial Notice' },
  { id: 'contract', ar: 'عقد / اتفاقية', en: 'Contract / Agreement' },
  { id: 'expert_request', ar: 'طلب خبرة', en: 'Expert Appointment Request' },
  { id: 'appeal_objection', ar: 'استئناف / اعتراض', en: 'Appeal / Objection' },
  { id: 'power_of_attorney', ar: 'وكالة / تفويض قانوني', en: 'Power of Attorney' },
  { id: 'official_letter', ar: 'مخاطبة رسمية', en: 'Official Letter' },
  { id: 'government_request', ar: 'طلب جهة حكومية', en: 'Government Request' },
  { id: 'case_summary', ar: 'تلخيص قضية وملف', en: 'Case File Summary' },
  { id: 'contract_analysis', ar: 'تحليل عقد ومستند', en: 'Contract Analysis' },
  { id: 'entity_extraction', ar: 'استخراج أطراف وتواريخ ومبالغ', en: 'Entity Extraction' },
  { id: 'legal_review', ar: 'مراجعة لغوية وقانونية', en: 'Legal & Linguistic Review' },
  { id: 'draft_revision', ar: 'تحسين صياغة وتعديلات', en: 'Draft Revision' },
  { id: 'attachments_checklist', ar: 'قائمة المرفقات المطلوبة', en: 'Attachments Checklist' },
  { id: 'print_bundle', ar: 'ملف متكامل للطباعة', en: 'Print-Ready Bundle' },
];

const QUICK_PROMPTS = [
  'عندي موكل تعرض لحادث سير، وشركة التأمين رفضت تعويضه، بدي أجهز لائحة دعوى للمطالبة بالتعويض.',
  'أحتاج تجهيز إنذار عدلي لمقاول أخلّ بموعد تسليم المشروع في إربد والمطالبة بالتنفيذ أو الفسخ.',
  'أريد إعداد لائحة استئناف على حكم صلح حقوقي خلال المهلة القانونية.',
  'أرغب بصياغة عقد شراكة وتأسيس شركة ذات مسؤولية محدودة مع شرط تحكيم.',
];

const WORKFLOW_STAGES = [
  'فهم الطلب',
  'تحديد المستند والمحكمة',
  'استكمال البيانات',
  'تحليل الوقائع والمرفقات',
  'البحث في التشريعات الأردنية',
  'صياغة المسودة',
  'المراجعة اللغوية والقانونية',
  'الترويسة الرسمية',
  'تصدير DOCX / PDF',
  'المعاينة والاعتماد',
  'جاهز للتوقيع والتقديم',
];

export function RbAiAssistantPanel({
  lang,
  authToken,
  currentUser,
  cases,
  documents,
  initialCaseId,
  onDocumentSaved,
}: RbAiAssistantPanelProps) {
  const [messages, setMessages] = useState<AiTurnMessage[]>([
    {
      id: 'rbai-welcome',
      role: 'assistant',
      text: `أهلاً بك ${currentUser.displayName} في RB AI — LEGAL ASSISTANT.\nاكتب طلبك القانوني بلغتك الطبيعية دون الحاجة لأي أوامر تقنية، وسأتولى تحديد نوع المستند والمحكمة الأردنية المختصة، واستكمال البيانات الناقصة، وصياغة المستند على ترويسة المكتب المعتمدة.`,
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [selectedCaseId, setSelectedCaseId] = useState<string>(initialCaseId ?? '');
  const [preferredDocType, setPreferredDocType] = useState<LegalDocumentType | ''>('');
  const [attachmentText, setAttachmentText] = useState('');
  const [attachmentName, setAttachmentName] = useState('');
  const [maskPiiBeforeAi, setMaskPiiBeforeAi] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [workflowStep, setWorkflowStep] = useState(1);

  const [activeDoc, setActiveDoc] = useState<LegalDocumentRecord | null>(documents[0] ?? null);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editCourt, setEditCourt] = useState('');
  const [editBody, setEditBody] = useState('');
  const [changeNote, setChangeNote] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [statusNotice, setStatusNotice] = useState('');

  const [reviewNotes, setReviewNotes] = useState<string[]>([]);
  const [legalRefs, setLegalRefs] = useState<LegalReferenceCitation[]>([]);
  const [showVersions, setShowVersions] = useState(false);

  function loadDocIntoWorkspace(doc: LegalDocumentRecord) {
    setActiveDoc(doc);
    setEditTitle(doc.title);
    setEditCourt(doc.courtOrAuthority ?? '');
    setEditBody(doc.bodyText);
    setLegalRefs(doc.legalReferences ?? []);
    setIsEditing(false);
    setWorkflowStep(doc.status === 'signed_ready' ? 11 : doc.status === 'approved' ? 10 : 8);
  }

  function applyPiiMask(text: string): string {
    if (!maskPiiBeforeAi) return text;
    return text.replace(/07[789]\d{7}/g, '[هاتف الموكل]').replace(/\b\d{10}\b/g, '[الرقم الوطني]');
  }

  async function handleAttachmentUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setAttachmentName(file.name);
    if (file.type.startsWith('text/') || /\.(txt|md|csv|json|xml)$/i.test(file.name)) {
      const content = await file.text();
      setAttachmentText(content.slice(0, 12000));
    } else {
      setAttachmentText(
        `[ملف مرفق: ${file.name} — الحجم: ${Math.round(file.size / 1024)} KB — يرجى تلخيص مضمونه في المحادثة إذا كان ملفاً مصوراً]`
      );
    }
  }

  async function callRbAi(opts: { promptText?: string; forceGenerate?: boolean }) {
    const cleanText = (opts.promptText ?? inputText).trim();
    if (!cleanText && !opts.forceGenerate) return;

    setLoading(true);
    setErrorMsg('');
    setStatusNotice('');
    setWorkflowStep(opts.forceGenerate ? 6 : 3);

    const nextHistory: AiTurnMessage[] = cleanText
      ? [
          ...messages,
          { id: `u-${Date.now()}`, role: 'user', text: cleanText },
        ]
      : [...messages];

    if (cleanText) {
      setMessages(nextHistory);
      setInputText('');
    }

    try {
      const res = await fetch('/api/rb-ai/assist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        credentials: 'include',
        body: JSON.stringify({
          messages: nextHistory
            .filter((m) => m.id !== 'rbai-welcome')
            .map((m) => ({
              role: m.role,
              text: m.role === 'user' ? applyPiiMask(m.text) : m.text,
            })),
          caseId: selectedCaseId || undefined,
          attachmentText: attachmentText ? applyPiiMask(attachmentText) : undefined,
          forceGenerate: Boolean(opts.forceGenerate),
          preferredDocType: preferredDocType || undefined,
        }),
      });

      const data = (await res.json()) as {
        result?: {
          stage: 'clarifying' | 'draft_ready';
          assistantReply: string;
          detectedDocumentType: LegalDocumentType;
          documentTitle: string;
          courtOrAuthority: string;
          missingQuestions: string[];
          reviewNotes?: string[];
          legalReferences?: LegalReferenceCitation[];
        };
        document?: LegalDocumentRecord | null;
        error?: string;
      };

      if (!res.ok || !data.result) {
        throw new Error(data.error || 'RB AI request failed');
      }

      const aiMsg: AiTurnMessage = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        text: data.result.assistantReply,
        questions: data.result.missingQuestions,
      };
      setMessages((prev) => [...prev, aiMsg]);
      setReviewNotes(data.result.reviewNotes ?? []);
      setLegalRefs(data.result.legalReferences ?? []);

      if (data.document) {
        onDocumentSaved(data.document);
        loadDocIntoWorkspace(data.document);
        setWorkflowStep(9);
        setStatusNotice('تم توليد المسودة ووضعها على ترويسة المكتب الرسمية. راجعها ثم اعتمدها قبل التوقيع.');
      } else {
        setWorkflowStep(3);
      }
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'تعذر إتمام الطلب عبر RB AI. تأكد من مفتاح Gemini API وحاول مجدداً.'
      );
    } finally {
      setLoading(false);
    }
  }

  function handleFormSubmit(e: FormEvent) {
    e.preventDefault();
    void callRbAi({});
  }

  async function handleSaveEdit() {
    if (!activeDoc) return;
    setSavingEdit(true);
    setErrorMsg('');
    try {
      const res = await fetch(`/api/documents/${activeDoc.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        credentials: 'include',
        body: JSON.stringify({
          title: editTitle,
          courtOrAuthority: editCourt,
          bodyText: editBody,
          changeNote: changeNote || 'تعديل الصياغة من لوحة المحامي',
          status: 'reviewed',
        }),
      });
      const data = (await res.json()) as { document?: LegalDocumentRecord; error?: string };
      if (!res.ok || !data.document) throw new Error(data.error || 'Update failed');
      onDocumentSaved(data.document);
      loadDocIntoWorkspace(data.document);
      setChangeNote('');
      setStatusNotice(`تم حفظ النسخة رقم ${data.document.versions.length} بنجاح.`);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'فشل حفظ التعديل');
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleApproveOrSign(action: 'approve' | 'sign_ready') {
    if (!activeDoc) return;
    setSavingEdit(true);
    try {
      const res = await fetch(`/api/documents/${activeDoc.id}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        credentials: 'include',
        body: JSON.stringify({ action }),
      });
      const data = (await res.json()) as { document?: LegalDocumentRecord; error?: string };
      if (!res.ok || !data.document) throw new Error(data.error || 'Approval failed');
      onDocumentSaved(data.document);
      loadDocIntoWorkspace(data.document);
      setWorkflowStep(action === 'sign_ready' ? 11 : 10);
      setStatusNotice(
        action === 'sign_ready'
          ? 'تم اعتماد المستند وتجهيزه للتوقيع والختم والتقديم الرسمي.'
          : 'تم اعتماد النسخة النهائية للمستند.'
      );
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'تعذر اعتماد المستند');
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleDownload(format: 'docx' | 'pdf') {
    if (!activeDoc) return;
    setErrorMsg('');
    try {
      const res = await fetch(`/api/documents/${activeDoc.id}/export/${format}`, {
        headers: { Authorization: `Bearer ${authToken}` },
        credentials: 'include',
      });
      if (format === 'pdf' && res.status === 501) {
        await handleOpenPrintWindow(true);
        return;
      }
      if (!res.ok) {
        const errData = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(errData.error || `Export ${format} failed`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${activeDoc.title}.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'تعذر تنزيل الملف');
    }
  }

  async function handleOpenPrintWindow(autoPrint = true) {
    if (!activeDoc) return;
    const res = await fetch(`/api/documents/${activeDoc.id}/print`, {
      headers: { Authorization: `Bearer ${authToken}` },
      credentials: 'include',
    });
    if (!res.ok) return;
    const html = await res.text();
    const w = window.open('', '_blank', 'width=900,height=1000');
    if (w) {
      w.document.open();
      w.document.write(html);
      w.document.close();
      if (autoPrint) {
        w.setTimeout(() => w.print(), 350);
      }
    }
  }

  return (
    <div className="space-y-5">
      {/* Executive Header */}
      <div className="bg-gradient-to-l from-[#0B132B] to-[#141820] text-white rounded-2xl p-5 sm:p-6 border border-[#C5A059]/35 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 text-xs font-bold text-[#C5A059]">
              <Sparkles className="w-4 h-4" />
              <span>RB AI — LEGAL ASSISTANT · للمحامين المسجلين فقط</span>
            </div>
            <h2 className="text-lg sm:text-xl font-extrabold">
              مساعدك القانوني الذكي، من وصف القضية إلى المستند الجاهز للطباعة والتقديم.
            </h2>
          </div>

          <label className="inline-flex items-center gap-2 text-xs bg-white/10 border border-white/15 rounded-xl px-3.5 py-2 cursor-pointer self-start">
            <input
              type="checkbox"
              checked={maskPiiBeforeAi}
              onChange={(e) => setMaskPiiBeforeAi(e.target.checked)}
              className="accent-[#C5A059]"
            />
            <ShieldCheck className="w-4 h-4 text-[#C5A059]" />
            <span>حجب أرقام الهواتف والرقم الوطني قبل الإرسال للذكاء الاصطناعي</span>
          </label>
        </div>

        {/* 11-Stage Live Workflow Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {WORKFLOW_STAGES.map((stageLabel, idx) => {
            const num = idx + 1;
            const active = num <= workflowStep;
            return (
              <div
                key={stageLabel}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap border ${
                  active
                    ? 'bg-[#C5A059]/20 border-[#C5A059] text-[#C5A059]'
                    : 'bg-white/5 border-white/10 text-slate-400'
                }`}
              >
                {num}. {stageLabel}
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Two-Column Legal Studio */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
        {/* Left / Start Column: Conversational Intake & Controls */}
        <div className="xl:col-span-5 bg-white rounded-2xl border border-slate-200 overflow-hidden flex flex-col">
          {/* Context Linking Strip */}
          <div className="p-4 bg-[#FAF8F3] border-b border-slate-200 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  ربط بملف قضية (اختياري)
                </label>
                <select
                  value={selectedCaseId}
                  onChange={(e) => setSelectedCaseId(e.target.value)}
                  className="w-full min-h-[38px] px-2.5 py-1 rounded-lg border border-slate-300 text-xs bg-white"
                >
                  <option value="">بدون ربط بقضية محددة</option>
                  {cases.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.caseNumber} — {c.clientName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  نوع المستند / المهمة (18 وظيفة)
                </label>
                <select
                  value={preferredDocType}
                  onChange={(e) => setPreferredDocType(e.target.value as LegalDocumentType | '')}
                  className="w-full min-h-[38px] px-2.5 py-1 rounded-lg border border-slate-300 text-xs bg-white"
                >
                  <option value="">تحديد تلقائي حسب الوصف</option>
                  {DOC_TYPE_LABELS.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.ar}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0B132B] bg-white border border-slate-300 hover:border-[#C5A059] rounded-lg px-3 py-1.5 cursor-pointer">
                <Paperclip className="w-3.5 h-3.5 text-[#C5A059]" />
                <span>{attachmentName ? `مرفق: ${attachmentName}` : 'إرفاق نص عقد / مستند للتحليل'}</span>
                <input type="file" onChange={handleAttachmentUpload} className="hidden" />
              </label>

              {documents.length > 0 && (
                <select
                  aria-label="فتح مستند محفوظ"
                  value={activeDoc?.id ?? ''}
                  onChange={(e) => {
                    const found = documents.find((d) => d.id === e.target.value);
                    if (found) loadDocIntoWorkspace(found);
                  }}
                  className="min-h-[34px] max-w-[200px] px-2.5 py-1 rounded-lg border border-[#C5A059] text-xs font-bold bg-white"
                >
                  {documents.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.title}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Chat Thread */}
          <div className="p-4 space-y-3 max-h-[420px] overflow-y-auto bg-white flex-1">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[92%] rounded-2xl px-4 py-3 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap ${
                    msg.role === 'user'
                      ? 'bg-[#0B132B] text-white'
                      : 'bg-[#FAF8F3] text-[#0B132B] border border-slate-200'
                  }`}
                >
                  {msg.text}
                  {msg.questions && msg.questions.length > 0 && (
                    <ul className="mt-2.5 pt-2.5 border-t border-slate-200 space-y-1 list-disc list-inside text-xs font-semibold text-[#0B132B]">
                      {msg.questions.map((q) => (
                        <li key={q}>{q}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex items-center gap-2 text-xs text-slate-600 bg-[#FAF8F3] border border-slate-200 rounded-xl px-4 py-3">
                <Loader2 className="w-4 h-4 animate-spin text-[#C5A059]" />
                <span>جاري التحليل القانوني والبحث التشريعي وفق القوانين الأردنية...</span>
              </div>
            )}
          </div>

          {/* Quick Scenario Chips */}
          <div className="px-4 py-2 border-t border-slate-100 bg-slate-50 flex gap-1.5 overflow-x-auto">
            {QUICK_PROMPTS.map((qp, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setInputText(qp)}
                className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:border-[#C5A059] text-[11px] font-semibold text-slate-700 whitespace-nowrap cursor-pointer"
              >
                {qp.slice(0, 42)}...
              </button>
            ))}
          </div>

          {/* Composer */}
          <form onSubmit={handleFormSubmit} className="p-3 bg-[#FAF8F3] border-t border-slate-200 space-y-2">
            <textarea
              rows={3}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="اكتب وصف القضية أو المستند المطلوب ببساطة..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#C5A059]"
            />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                disabled={loading || messages.length <= 1}
                onClick={() => void callRbAi({ forceGenerate: true })}
                className="min-h-[40px] px-3.5 py-2 rounded-xl border border-[#0B132B] text-[#0B132B] hover:bg-[#0B132B]/5 disabled:opacity-40 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#C5A059]" />
                <span>توليد المسودة الكاملة الآن</span>
              </button>

              <button
                type="submit"
                disabled={loading || !inputText.trim()}
                className="min-h-[40px] px-5 py-2 rounded-xl bg-[#0B132B] hover:bg-[#162247] disabled:opacity-50 text-white text-xs sm:text-sm font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Send className="w-4 h-4 text-[#C5A059]" />
                <span>إرسال لـ RB AI</span>
              </button>
            </div>
          </form>
        </div>

        {/* Right / End Column: Official Letterhead Preview, Editor, Citations & Export Controls */}
        <div className="xl:col-span-7 space-y-4">
          {errorMsg && (
            <div
              role="alert"
              className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-xs sm:text-sm font-semibold text-red-800 flex items-center gap-2"
            >
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {statusNotice && (
            <div
              role="status"
              className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-xs sm:text-sm font-semibold text-emerald-900 flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{statusNotice}</span>
            </div>
          )}

          {!activeDoc ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center space-y-3">
              <Scale className="w-10 h-10 text-[#C5A059] mx-auto" />
              <h3 className="text-base font-bold text-[#0B132B]">
                منصة الصياغة القانونية على ترويسة المكتب المعتمدة
              </h3>
              <p className="text-sm text-slate-600 max-w-lg mx-auto">
                اكتب وصف الحالة في المحادثة على اليمين (أو اختر مستنداً محفوظاً)، وسيظهر المستند هنا
                على ترويسة المكتب الرسمية جاهزاً للمعاينة والتعديل والاعتماد والتصدير بصيغتي Word وPDF.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              {/* Required 7 Action Buttons Bar */}
              <div className="p-3.5 bg-[#0B132B] text-white flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className={`min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
                    !isEditing ? 'bg-[#C5A059] text-[#0B132B]' : 'bg-white/10 hover:bg-white/20'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>معاينة المستند</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className={`min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
                    isEditing ? 'bg-[#C5A059] text-[#0B132B]' : 'bg-white/10 hover:bg-white/20'
                  }`}
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>تعديل المستند</span>
                </button>

                <button
                  type="button"
                  disabled={loading}
                  onClick={() =>
                    void callRbAi({
                      promptText: `أعد صياغة وتحسين المستند "${activeDoc.title}" بدقة قانونية أعلى مع الحفاظ على الوقائع.`,
                      forceGenerate: true,
                    })
                  }
                  className="min-h-[36px] px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-[#C5A059]" />
                  <span>إعادة توليد المستند</span>
                </button>

                <button
                  type="button"
                  onClick={() => void handleDownload('docx')}
                  className="min-h-[36px] px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-[#C5A059]" />
                  <span>تنزيل Word</span>
                </button>

                <button
                  type="button"
                  onClick={() => void handleDownload('pdf')}
                  className="min-h-[36px] px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5 text-[#C5A059]" />
                  <span>تنزيل PDF</span>
                </button>

                <button
                  type="button"
                  onClick={() => void handleOpenPrintWindow(true)}
                  className="min-h-[36px] px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5 text-[#C5A059]" />
                  <span>طباعة</span>
                </button>

                <button
                  type="button"
                  disabled={savingEdit}
                  onClick={() => void handleApproveOrSign('sign_ready')}
                  className="min-h-[36px] px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer ms-auto"
                >
                  <FileCheck2 className="w-3.5 h-3.5" />
                  <span>
                    {activeDoc.status === 'signed_ready'
                      ? 'معتمد وجاهز للتقديم'
                      : 'اعتماد النسخة النهائية'}
                  </span>
                </button>
              </div>

              {/* Editor OR Authentic Letterhead Preview */}
              {isEditing ? (
                <div className="p-5 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        عنوان المستند
                      </label>
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="w-full min-h-[40px] px-3 py-2 rounded-xl border border-slate-300 text-sm font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        المحكمة / الجهة المختصة
                      </label>
                      <input
                        type="text"
                        value={editCourt}
                        onChange={(e) => setEditCourt(e.target.value)}
                        className="w-full min-h-[40px] px-3 py-2 rounded-xl border border-slate-300 text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      نص المستند القانوني (RTL)
                    </label>
                    <textarea
                      rows={16}
                      value={editBody}
                      onChange={(e) => setEditBody(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-300 text-sm leading-loose font-sans"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <input
                      type="text"
                      value={changeNote}
                      onChange={(e) => setChangeNote(e.target.value)}
                      placeholder="ملاحظة التعديل (لحفظها في سجل النسخ)"
                      className="flex-1 min-h-[40px] px-3 py-2 rounded-xl border border-slate-300 text-xs"
                    />
                    <button
                      type="button"
                      disabled={savingEdit}
                      onClick={() => void handleSaveEdit()}
                      className="min-h-[40px] px-5 py-2 rounded-xl bg-[#C5A059] hover:bg-[#d4b06a] text-[#0B132B] text-xs font-bold cursor-pointer"
                    >
                      {savingEdit ? 'جاري الحفظ...' : 'حفظ كنسخة جديدة'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-5 sm:p-7 bg-slate-100">
                  {/* A4 Paper Sheet Preview with Exact Letterhead Header & Footer */}
                  <div className="bg-white border border-slate-300 shadow-md rounded-lg p-6 sm:p-8 space-y-5 max-w-[760px] mx-auto">
                    <div className="border-b-2 border-slate-800 pb-2">
                      <img
                        src="/assets/brand/letterhead-header.jpg"
                        alt="ترويسة مكتب المحامي رضوان علي البطاينة"
                        className="w-full max-h-28 object-contain"
                      />
                    </div>

                    <div className="text-center border-b border-[#C5A059] pb-2">
                      <h3 className="text-lg font-extrabold text-[#0B132B]">{activeDoc.title}</h3>
                      {activeDoc.courtOrAuthority && (
                        <p className="text-xs font-bold text-slate-600 mt-1">
                          {activeDoc.courtOrAuthority}
                        </p>
                      )}
                    </div>

                    <div className="text-sm text-slate-900 leading-loose whitespace-pre-wrap text-justify">
                      {activeDoc.bodyText}
                    </div>

                    {activeDoc.attachmentsChecklist && activeDoc.attachmentsChecklist.length > 0 && (
                      <div className="bg-[#FAF8F3] border border-slate-200 rounded-xl p-4 space-y-1.5">
                        <p className="text-xs font-bold text-[#0B132B]">قائمة المرفقات المطلوبة:</p>
                        <ol className="list-decimal list-inside text-xs text-slate-700 space-y-1">
                          {activeDoc.attachmentsChecklist.map((att) => (
                            <li key={att}>{att}</li>
                          ))}
                        </ol>
                      </div>
                    )}

                    {/* Signature Placement (never auto-signed) */}
                    <div className="pt-4 flex justify-end">
                      <div className="text-center space-y-1 min-w-[200px]">
                        <p className="text-sm font-bold text-[#0B132B]">المحامي</p>
                        <p className="text-base font-extrabold text-[#0B132B]">
                          {activeDoc.signedBy || activeDoc.approvedBy || 'رضوان البطاينة'}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {activeDoc.status === 'signed_ready'
                            ? 'معتمد وجاهز للتوقيع والختم الرسمي'
                            : 'مسودة بانتظار المراجعة والاعتماد'}
                        </p>
                      </div>
                    </div>

                    {/* Exact Official Letterhead Footer */}
                    <div className="border-t-2 border-slate-800 pt-2 flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-slate-800">
                      <span>اربد – شارع الثلاثين – مجمع علاء الدين سنتر</span>
                      <span dir="ltr" className="font-mono-data">
                        0796251902
                      </span>
                      <span>عمان – شارع مكه – مجمع داوود</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Legal Citations, Review Notes & Version History Drawer */}
              <div className="p-4 bg-[#FAF8F3] border-t border-slate-200 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#0B132B]">
                    <BookOpen className="w-4 h-4 text-[#C5A059]" />
                    <span>المراجع التشريعية الأردنية وملاحظات المراجعة ({legalRefs.length})</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowVersions((p) => !p)}
                    className="inline-flex items-center gap-1 text-xs font-bold text-[#0B132B] hover:text-[#C5A059] cursor-pointer"
                  >
                    <History className="w-3.5 h-3.5" />
                    <span>سجل النسخ ({activeDoc.versions.length})</span>
                  </button>
                </div>

                {legalRefs.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {legalRefs.map((ref, idx) => (
                      <div
                        key={idx}
                        className="bg-white rounded-xl border border-slate-200 p-3 text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-[#0B132B]">
                            {ref.lawName} {ref.article ? `— المادة (${ref.article})` : ''}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              ref.verified
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-amber-50 text-amber-800'
                            }`}
                          >
                            {ref.verified ? 'مرجع موثق' : 'يتطلب تحققاً'}
                          </span>
                        </div>
                        {ref.year && <p className="text-[11px] text-slate-500">{ref.year}</p>}
                        {ref.note && <p className="text-slate-600">{ref.note}</p>}
                      </div>
                    ))}
                  </div>
                )}

                {reviewNotes.length > 0 && (
                  <div className="bg-white rounded-xl border border-slate-200 p-3 space-y-1 text-xs">
                    <p className="font-bold text-[#0B132B]">ملاحظات الصياغة والمراجعة:</p>
                    <ul className="list-disc list-inside text-slate-600 space-y-0.5">
                      {reviewNotes.map((n) => (
                        <li key={n}>{n}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {showVersions && (
                  <div className="bg-white rounded-xl border border-slate-200 p-3 space-y-2 text-xs">
                    {activeDoc.versions.map((v) => (
                      <div
                        key={v.versionNumber}
                        className="flex flex-wrap items-center justify-between gap-2 border-b last:border-b-0 border-slate-100 pb-2 last:pb-0"
                      >
                        <div>
                          <span className="font-bold text-[#0B132B]">
                            النسخة {v.versionNumber} — {v.editedBy}
                          </span>
                          <p className="text-slate-500">{v.changeNote}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono-data text-slate-400" dir="ltr">
                            {v.editedAt.slice(0, 16).replace('T', ' ')}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setEditBody(v.content);
                              setIsEditing(true);
                            }}
                            className="px-2.5 py-1 rounded bg-[#0B132B] text-white font-semibold cursor-pointer"
                          >
                            استعادة
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
