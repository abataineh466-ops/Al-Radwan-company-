import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  FileCheck2,
  Loader2,
  MessageSquareText,
  Send,
  X,
} from 'lucide-react';
import type { ChatMessage, IntakeSummary, Language, SpecialtyId } from '../types/legal';
import { SPECIALTIES } from '../data/firmContent';
import { formatFriendlyAiError, stripSafiJsonBlock } from '../utils/legalWorkflow';

interface AiIntakeModalProps {
  isOpen: boolean;
  lang: Language;
  initialSpecialty?: SpecialtyId;
  onClose: () => void;
  onProceedToBooking: (summary: IntakeSummary) => void;
  onSummarySaved: (summary: IntakeSummary) => void;
}

export function AiIntakeModal({
  isOpen,
  lang,
  initialSpecialty,
  onClose,
  onProceedToBooking,
  onSummarySaved,
}: AiIntakeModalProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState<SpecialtyId | undefined>(
    initialSpecialty
  );
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [canRetry, setCanRetry] = useState(false);
  const [generatedSummary, setGeneratedSummary] = useState<IntakeSummary | null>(null);
  const scrollEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    setSelectedSpecialty(initialSpecialty);
    setErrorMsg('');
    setCanRetry(false);

    const specLabel = initialSpecialty
      ? SPECIALTIES.find((s) => s.id === initialSpecialty)?.title[lang]
      : null;

    if (messages.length === 0) {
      const greeting =
        lang === 'ar'
          ? specLabel
            ? `أهلاً بك في شركة الرضوان للمحاماة والاستشارات القانونية (إربد) — حقك… مسؤوليتنا. أرى أن استفسارك يتعلق بـ "${specLabel}". نصغي إليك بكل اهتمام؛ احكِ لي باختصار شو اللي صار معك حتى أجهزلك "الصافي" وأربطك مباشرة بحجز استشارتك المجانية.`
            : 'أهلاً بك في شركة الرضوان للمحاماة والاستشارات القانونية — حقك… مسؤوليتنا. نصغي إليك أولاً لنحمي حقك بأمانة. اختر نوع قضيتك من الأسفل أو اكتب لي موضوعك باختصار، وسأطرح عليك سؤالين ذكيين ثم أجهزلك ملخص "الصافي" لحجز استشارتك المجانية.'
          : specLabel
            ? `Welcome to Al-Radwan Arbitration & Law Firm (Irbid) — Your Right Is Our Responsibility. I see your inquiry relates to "${specLabel}". Share what happened so I can prepare your structured "Al-Safi" brief and connect you to your free consultation.`
            : 'Welcome to Al-Radwan Arbitration & Law Firm — Your Right Is Our Responsibility. Select your legal specialty below or briefly describe your situation so I can prepare your "Al-Safi" brief for your free consultation.';

      setMessages([
        {
          id: 'welcome-msg',
          role: 'assistant',
          text: greeting,
          timestamp: new Date().toISOString(),
        },
      ]);
    }
  }, [isOpen, initialSpecialty, lang]);

  useEffect(() => {
    scrollEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading, generatedSummary]);

  if (!isOpen) return null;

  const ArrowIcon = lang === 'ar' ? ArrowLeft : ArrowRight;

  async function requestAiReply(historyToSend: ChatMessage[], activeSpec?: SpecialtyId) {
    setLoading(true);
    setErrorMsg('');
    setCanRetry(false);

    try {
      const res = await fetch('/api/intake-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: historyToSend.map((m) => ({ role: m.role, text: m.text })),
          lang,
          preselectedSpecialty: activeSpec,
        }),
        signal: AbortSignal.timeout(25000),
      });

      const contentType = res.headers.get('content-type') ?? '';
      let data: {
        reply?: string;
        summary?: IntakeSummary | null;
        error?: string;
      } = {};

      if (contentType.includes('application/json')) {
        data = (await res.json()) as typeof data;
      } else if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      if (!res.ok) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }

      const cleanReply = stripSafiJsonBlock(data.reply ?? '');
      const assistantMsg: ChatMessage = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        text:
          cleanReply ||
          (lang === 'ar'
            ? 'تم تجهيز ملخص "الصافي" لقضيتك وإرساله للفريق القانوني.'
            : 'Your Al-Safi case summary is ready for our legal team.'),
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMsg]);

      if (data.summary) {
        setGeneratedSummary(data.summary);
        onSummarySaved(data.summary);
      }
    } catch (err: unknown) {
      const rawErr = err instanceof Error ? err.message : '';
      setErrorMsg(formatFriendlyAiError(rawErr, lang));
      setCanRetry(true);
    } finally {
      setLoading(false);
    }
  }

  async function sendUserMessage(rawText: string, specialtyOverride?: SpecialtyId) {
    const trimmed = rawText.trim();
    if (!trimmed || loading) return;

    const activeSpec = specialtyOverride ?? selectedSpecialty;
    if (specialtyOverride) {
      setSelectedSpecialty(specialtyOverride);
    }

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      text: trimmed,
      timestamp: new Date().toISOString(),
    };

    const nextHistory = [...messages, userMsg];
    setMessages(nextHistory);
    setInputValue('');
    await requestAiReply(nextHistory, activeSpec);
  }

  async function handleRetry() {
    if (loading || messages.length === 0) return;
    await requestAiReply(messages, selectedSpecialty);
  }

  function handleFormSubmit(e: FormEvent) {
    e.preventDefault();
    sendUserMessage(inputValue);
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="ai-intake-title"
      className="fixed inset-0 z-50 bg-[#0B132B]/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
    >
      <div className="bg-white text-[#0B132B] w-full sm:max-w-2xl rounded-t-3xl sm:rounded-2xl shadow-2xl border border-slate-200 flex flex-col h-[92vh] sm:h-[82vh]">
        {/* Header */}
        <div className="bg-[#0B132B] text-white px-5 py-4 rounded-t-3xl sm:rounded-t-2xl flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-[#C5A059] text-[#0B132B] flex items-center justify-center shrink-0">
              <MessageSquareText className="w-5 h-5" aria-hidden="true" />
            </span>
            <div>
              <h2 id="ai-intake-title" className="text-base sm:text-lg font-bold">
                {lang === 'ar'
                  ? 'المساعد القانوني الذكي — "الصافي"'
                  : 'AI Legal Intake — "Al-Safi"'}
              </h2>
              <p className="text-xs text-slate-300">
                {lang === 'ar'
                  ? 'تحليل أولي باللهجة الأردنية وتجهيز ملخص للفريق القانوني'
                  : 'Quick structured case intake for Al-Radwan Law & Arbitration'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label={lang === 'ar' ? 'إغلاق المساعد الذكي' : 'Close AI assistant'}
            className="min-h-[44px] min-w-[44px] rounded-xl flex items-center justify-center text-slate-200 hover:bg-white/10 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Specialty Quick-Pick Chips */}
        <div className="px-4 py-2.5 bg-[#F8FAFC] border-b border-slate-200 flex items-center gap-2 overflow-x-auto shrink-0">
          {SPECIALTIES.map((spec) => {
            const active = selectedSpecialty === spec.id;
            return (
              <button
                key={spec.id}
                type="button"
                onClick={() =>
                  sendUserMessage(
                    lang === 'ar'
                      ? `موضوع قضيتي يتعلق بـ: ${spec.title.ar}`
                      : `My legal matter relates to: ${spec.title.en}`,
                    spec.id
                  )
                }
                disabled={loading}
                className={`min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 border transition-colors cursor-pointer ${
                  active
                    ? 'bg-[#0B132B] text-[#C5A059] border-[#0B132B]'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-[#C5A059]'
                }`}
              >
                {spec.title[lang]}
              </button>
            );
          })}
        </div>

        {/* Conversation Thread */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 bg-white">
          {messages.map((msg) => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={msg.id}
                className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                    isUser
                      ? 'bg-[#0B132B] text-white'
                      : 'bg-[#F8FAFC] text-[#0B132B] border border-slate-200'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            );
          })}

          {loading && (
            <div className="flex justify-start">
              <div className="rounded-2xl px-4 py-3 bg-[#F8FAFC] border border-slate-200 flex items-center gap-2 text-sm text-slate-600">
                <Loader2 className="w-4 h-4 animate-spin text-[#C5A059]" />
                <span>
                  {lang === 'ar' ? 'جاري تحليل المعطيات...' : 'Analyzing your case details...'}
                </span>
              </div>
            </div>
          )}

          {errorMsg && (
            <div
              role="alert"
              className="rounded-xl bg-red-50 border border-red-200 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs sm:text-sm text-red-800"
            >
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
              {canRetry && (
                <button
                  type="button"
                  onClick={handleRetry}
                  disabled={loading}
                  className="min-h-[38px] px-3.5 py-1.5 rounded-lg bg-[#0B132B] hover:bg-[#162247] text-white text-xs font-bold whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {lang === 'ar' ? 'إعادة المحاولة' : 'Retry'}
                </button>
              )}
            </div>
          )}

          {/* Structured Al-Safi Summary Card */}
          {generatedSummary && (
            <div className="rounded-2xl border-2 border-[#C5A059] bg-[#0B132B] text-white p-5 space-y-4">
              <div className="flex items-center justify-between gap-2 border-b border-white/15 pb-3">
                <div className="flex items-center gap-2 text-[#C5A059] font-bold text-sm">
                  <FileCheck2 className="w-5 h-5 shrink-0" />
                  <span>
                    {lang === 'ar'
                      ? 'ملخص "الصافي" الجاهز للفريق القانوني'
                      : 'Structured "Al-Safi" Case Summary'}
                  </span>
                </div>
                <span className="text-xs text-emerald-300 flex items-center gap-1 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {lang === 'ar' ? 'تم الحفظ للفريق' : 'Saved to Team'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm">
                <div>
                  <span className="text-slate-400 block">
                    {lang === 'ar' ? 'اسم الموكل:' : 'Client Name:'}
                  </span>
                  <span className="font-bold">{generatedSummary.clientName}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">
                    {lang === 'ar' ? 'رقم الهاتف:' : 'Phone:'}
                  </span>
                  <span className="font-bold font-mono-data" dir="ltr">
                    {generatedSummary.clientPhone}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">
                    {lang === 'ar' ? 'التخصص:' : 'Specialty:'}
                  </span>
                  <span className="font-semibold text-[#C5A059]">
                    {SPECIALTIES.find((s) => s.id === generatedSummary.specialtyId)?.title[lang]}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">
                    {lang === 'ar' ? 'حالة المستندات:' : 'Documents:'}
                  </span>
                  <span className="font-medium">{generatedSummary.documentsStatus}</span>
                </div>
              </div>

              <div className="bg-white/10 rounded-xl p-3.5 text-xs sm:text-sm text-slate-100 leading-relaxed">
                {generatedSummary.factsSummary}
              </div>

              <button
                type="button"
                onClick={() => onProceedToBooking(generatedSummary)}
                className="w-full min-h-[48px] px-5 py-3 rounded-xl bg-[#C5A059] hover:bg-[#d4b06a] text-[#0B132B] font-bold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <span>
                  {lang === 'ar'
                    ? 'الانتقال لحجز استشارتك المجانية الآن'
                    : 'Proceed to Book Your Free Consultation'}
                </span>
                <ArrowIcon className="w-4 h-4" />
              </button>
            </div>
          )}

          <div ref={scrollEndRef} />
        </div>

        {/* Input Composer */}
        <form
          onSubmit={handleFormSubmit}
          className="p-3 sm:p-4 bg-[#F8FAFC] border-t border-slate-200 flex items-center gap-2 shrink-0"
        >
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={
              lang === 'ar'
                ? 'اكتب تفاصيل قضيتك أو أجب عن السؤال هنا...'
                : 'Type your response or case details here...'
            }
            aria-label={lang === 'ar' ? 'رسالتك للمساعد القانوني' : 'Message to legal assistant'}
            className="flex-1 min-h-[46px] px-4 py-2.5 rounded-xl bg-white border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#C5A059]"
          />
          <button
            type="submit"
            disabled={loading || !inputValue.trim()}
            aria-label={lang === 'ar' ? 'إرسال' : 'Send'}
            className="min-h-[46px] min-w-[46px] px-4 rounded-xl bg-[#0B132B] hover:bg-[#162247] disabled:opacity-50 text-white font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Send className="w-4 h-4 text-[#C5A059]" />
          </button>
        </form>
      </div>
    </div>
  );
}
