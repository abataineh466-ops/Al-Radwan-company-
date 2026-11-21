import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Bell,
  Briefcase,
  CalendarCheck,
  FilePlus2,
  Globe,
  HardDrive,
  LogOut,
  MessageSquareText,
  PhoneCall,
  Plus,
  Scale,
  Search,
  Users,
  X,
} from 'lucide-react';
import { AdminAnalyticsPanel } from './AdminAnalyticsPanel';
import { AdminTeamManagementPanel } from './AdminTeamManagementPanel';
import { GoogleWorkspacePanel } from './GoogleWorkspacePanel';
import { InquiryToastStack } from './InquiryToastStack';
import type {
  BookingStatus,
  CaseStage,
  ConsultationBooking,
  ContactInquiry,
  FirmLawyer,
  IntakeSummary,
  Language,
  LawyerRole,
  LawyerStatus,
  LegalCase,
  SpecialtyId,
} from '../types/legal';
import { SPECIALTIES } from '../data/firmContent';
import {
  computeDashboardMetrics,
  filterBookings,
  filterCases,
  formatJodCurrency,
} from '../utils/legalWorkflow';
import {
  detectNewInquiries,
  formatInquiryToastPreview,
  mergeUniqueInquiries,
} from '../utils/inquiryNotifications';

type DashboardTab = 'analytics' | 'appointments' | 'cases' | 'team' | 'intakes' | 'workspace';

interface LawyerDashboardProps {
  lang: Language;
  bookings: ConsultationBooking[];
  cases: LegalCase[];
  intakes: IntakeSummary[];
  inquiries: ContactInquiry[];
  lawyers: FirmLawyer[];
  loading: boolean;
  onExitDashboard: () => void;
  onLogout: () => void;
  onToggleLanguage: () => void;
  onUpdateBooking: (
    id: string,
    updates: { status?: BookingStatus; assignedLawyer?: string }
  ) => Promise<void>;
  onCreateCase: (payload: {
    clientName: string;
    clientPhone: string;
    specialtyId: SpecialtyId;
    courtName: string;
    assignedLawyer: string;
    stage: CaseStage;
    nextHearingDate: string;
    summary: string;
    intakeId?: string;
  }) => Promise<void>;
  onUpdateCase: (
    id: string,
    updates: { stage?: CaseStage; nextHearingDate?: string; assignedLawyer?: string }
  ) => Promise<void>;
  onCreateLawyer: (payload: {
    name: string;
    nameEn?: string;
    phone: string;
    email?: string;
    role: LawyerRole;
    specialties: SpecialtyId[];
    status: LawyerStatus;
    canManageRoles: boolean;
  }) => Promise<{ ok: boolean; error?: string }>;
  onUpdateLawyer: (
    id: string,
    updates: Partial<{
      role: LawyerRole;
      status: LawyerStatus;
      canManageRoles: boolean;
      specialties: SpecialtyId[];
    }>
  ) => Promise<{ ok: boolean; error?: string }>;
  onDeleteLawyer: (
    id: string,
    reassignToLawyerName: string
  ) => Promise<{
    ok: boolean;
    error?: string;
    reassignedCases?: number;
    reassignedBookings?: number;
  }>;
  onBulkTransfer: (payload: {
    fromLawyerName: string;
    toLawyerName: string;
    scope: 'active_cases' | 'all_cases' | 'all_cases_and_bookings';
  }) => Promise<{
    ok: boolean;
    error?: string;
    transferredCases?: number;
    transferredBookings?: number;
  }>;
  onInquiriesSynced: (latest: ContactInquiry[]) => void;
}

function playSubtleNotificationChime(): void {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(660, ctx.currentTime);
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.09);
    gain.gain.setValueAtTime(0.05, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.28);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.28);
    window.setTimeout(() => {
      void ctx.close().catch(() => {});
    }, 350);
  } catch {
    // Browser autoplay policies may block audio prior to user gesture; ignore safely
  }
}

export function LawyerDashboard({
  lang,
  bookings,
  cases,
  intakes,
  inquiries,
  lawyers,
  loading,
  onExitDashboard,
  onLogout,
  onToggleLanguage,
  onUpdateBooking,
  onCreateCase,
  onUpdateCase,
  onCreateLawyer,
  onUpdateLawyer,
  onDeleteLawyer,
  onBulkTransfer,
  onInquiriesSynced,
}: LawyerDashboardProps) {
  const [activeTab, setActiveTab] = useState<DashboardTab>('analytics');
  const [transferPresetLawyer, setTransferPresetLawyer] = useState<string | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState('');
  const [bookingFilter, setBookingFilter] = useState<BookingStatus | 'all'>('all');
  const [caseStageFilter, setCaseStageFilter] = useState<CaseStage | 'all'>('all');
  const [caseSpecFilter, setCaseSpecFilter] = useState<SpecialtyId | 'all'>('all');
  const [caseLawyerFilter, setCaseLawyerFilter] = useState<string>('all');
  const [inlineToast, setInlineToast] = useState<string | null>(null);

  // Automatic real-time contact inquiry notifications state
  const [inquiryToasts, setInquiryToasts] = useState<ContactInquiry[]>([]);
  const [unreadInquiryCount, setUnreadInquiryCount] = useState(0);
  const [showInquiriesInbox, setShowInquiriesInbox] = useState(false);
  const [highlightedInquiryId, setHighlightedInquiryId] = useState<string | null>(null);
  const seenInquiryIdsRef = useRef<Set<string>>(new Set());
  const seededInquiriesRef = useRef(false);
  const toastTimersRef = useRef<Map<string, number>>(new Map());
  const inquiriesRef = useRef<ContactInquiry[]>(inquiries);
  inquiriesRef.current = inquiries;

  // Seed initial inquiry IDs once initial load completes so historical messages don't fire false toasts
  useEffect(() => {
    if (loading || seededInquiriesRef.current) return;
    for (const item of inquiries) {
      seenInquiryIdsRef.current.add(item.id);
    }
    seededInquiriesRef.current = true;
  }, [loading, inquiries]);

  // Clear pending toast timers on unmount
  useEffect(() => {
    return () => {
      for (const timerId of toastTimersRef.current.values()) {
        window.clearTimeout(timerId);
      }
      toastTimersRef.current.clear();
    };
  }, []);

  function dismissInquiryToast(id: string) {
    const timer = toastTimersRef.current.get(id);
    if (timer) {
      window.clearTimeout(timer);
      toastTimersRef.current.delete(id);
    }
    setInquiryToasts((prev) => prev.filter((item) => item.id !== id));
  }

  function openInquiriesInbox(focusInquiryId?: string) {
    setShowInquiriesInbox(true);
    setUnreadInquiryCount(0);
    if (focusInquiryId) {
      setHighlightedInquiryId(focusInquiryId);
      dismissInquiryToast(focusInquiryId);
    }
  }

  // Lightweight visibility-aware polling for new contact form inquiries (Vercel Hobby friendly)
  useEffect(() => {
    if (loading) return;
    let active = true;

    async function pollNewInquiries() {
      if (!active || document.visibilityState === 'hidden') return;
      try {
        const res = await fetch('/api/inquiries', { cache: 'no-store' });
        if (!res.ok || !active) return;
        const data = (await res.json()) as { inquiries?: ContactInquiry[] };
        const latest = Array.isArray(data.inquiries) ? data.inquiries : [];

        if (!seededInquiriesRef.current) {
          for (const item of latest) {
            seenInquiryIdsRef.current.add(item.id);
          }
          seededInquiriesRef.current = true;
          return;
        }

        const newlyArrived = detectNewInquiries(seenInquiryIdsRef.current, latest);
        if (newlyArrived.length === 0) return;

        for (const item of newlyArrived) {
          seenInquiryIdsRef.current.add(item.id);
        }

        onInquiriesSynced(mergeUniqueInquiries(latest, inquiriesRef.current));
        setUnreadInquiryCount((prev) => prev + newlyArrived.length);
        setInquiryToasts((prev) => {
          const combined = [...newlyArrived, ...prev];
          const deduped = combined.filter(
            (item, idx, arr) => arr.findIndex((x) => x.id === item.id) === idx
          );
          return deduped.slice(0, 3);
        });

        for (const item of newlyArrived) {
          const existingTimer = toastTimersRef.current.get(item.id);
          if (existingTimer) window.clearTimeout(existingTimer);
          const timerId = window.setTimeout(() => {
            setInquiryToasts((prev) => prev.filter((t) => t.id !== item.id));
            toastTimersRef.current.delete(item.id);
          }, 12000);
          toastTimersRef.current.set(item.id, timerId);
        }

        playSubtleNotificationChime();
      } catch {
        // Silent retry on next interval
      }
    }

    const intervalId = window.setInterval(() => {
      void pollNewInquiries();
    }, 6000);

    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') {
        void pollNewInquiries();
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      active = false;
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [loading, onInquiriesSynced]);

  const [showNewCaseModal, setShowNewCaseModal] = useState(false);
  const [newCaseClient, setNewCaseClient] = useState('');
  const [newCasePhone, setNewCasePhone] = useState('079');
  const [newCaseSpec, setNewCaseSpec] = useState<SpecialtyId>('civil');
  const [newCaseCourt, setNewCaseCourt] = useState('محكمة بداية حقوق إربد');
  const [newCaseLawyer, setNewCaseLawyer] = useState(
    lawyers[0]?.name || 'المحامي رضوان علي البطاينة'
  );
  const [newCaseDate, setNewCaseDate] = useState('2026-11-28');
  const [newCaseSummary, setNewCaseSummary] = useState('');
  const [creatingCase, setCreatingCase] = useState(false);

  const metrics = computeDashboardMetrics(bookings, cases, intakes);
  const filteredBookings = filterBookings(bookings, bookingFilter, searchQuery);
  const filteredCases = filterCases(cases, caseStageFilter, caseSpecFilter, searchQuery).filter(
    (c) => caseLawyerFilter === 'all' || c.assignedLawyer.trim() === caseLawyerFilter.trim()
  );

  const BackIcon = lang === 'ar' ? ArrowRight : ArrowLeft;

  const lawyerNameOptions = lawyers.map((l) => l.name);

  function showBriefToast(message: string) {
    setInlineToast(message);
    window.setTimeout(() => {
      setInlineToast((current) => (current === message ? null : current));
    }, 3500);
  }

  const bookingStatusLabel: Record<BookingStatus, Record<Language, string>> = {
    pending: { ar: 'قيد المراجعة', en: 'Pending' },
    confirmed: { ar: 'مؤكد', en: 'Confirmed' },
    completed: { ar: 'مكتمل', en: 'Completed' },
    cancelled: { ar: 'ملغي', en: 'Cancelled' },
  };

  const caseStageLabel: Record<CaseStage, Record<Language, string>> = {
    intake: { ar: 'استشارة جديدة', en: 'Initial Intake' },
    drafting: { ar: 'تجهيز لائحة الدعوى', en: 'Drafting Pleadings' },
    litigation: { ar: 'قيد المرافعة', en: 'In Litigation' },
    execution: { ar: 'مرحلة التنفيذ', en: 'Execution Dept' },
    closed: { ar: 'مغلقة / منتهية', en: 'Closed' },
  };

  async function handleCreateCaseSubmit(e: FormEvent) {
    e.preventDefault();
    if (!newCaseClient.trim() || !newCaseSummary.trim()) return;
    setCreatingCase(true);
    try {
      await onCreateCase({
        clientName: newCaseClient,
        clientPhone: newCasePhone,
        specialtyId: newCaseSpec,
        courtName: newCaseCourt,
        assignedLawyer: newCaseLawyer || lawyers[0]?.name || 'المحامي رضوان علي البطاينة',
        stage: 'intake',
        nextHearingDate: newCaseDate,
        summary: newCaseSummary,
      });
      setShowNewCaseModal(false);
      setNewCaseClient('');
      setNewCaseSummary('');
      showBriefToast(
        lang === 'ar' ? 'تم فتح ملف القضية الجديدة بنجاح.' : 'New legal case file opened.'
      );
    } finally {
      setCreatingCase(false);
    }
  }

  function handleQuickTransferFromAnalytics(lawyerName: string) {
    setTransferPresetLawyer(lawyerName);
    setActiveTab('team');
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0B132B]">
      {/* Dashboard Top Workspace Bar */}
      <header className="sticky top-0 z-30 bg-[#0B132B] text-white border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <span className="w-8 h-8 rounded bg-[#C5A059] text-[#0B132B] flex items-center justify-center shrink-0">
              <Scale className="w-4 h-4" aria-hidden="true" />
            </span>
            <div className="truncate">
              <p className="text-xs text-[#C5A059] font-semibold truncate">
                {lang === 'ar'
                  ? 'شركة الرضوان / لوحة تحكم الآدمن والمحامين'
                  : 'Al-Radwan Law & Arbitration / Admin & Attorney Portal'}
              </p>
              <h1 className="text-sm sm:text-base font-bold truncate">
                {lang === 'ar'
                  ? 'الإحصائيات، القضايا، وإدارة الفريق'
                  : 'Analytics, Cases & Legal Team Control'}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => openInquiriesInbox()}
              aria-label={
                lang === 'ar'
                  ? `صندوق الاستفسارات الواردة (${inquiries.length})`
                  : `Incoming contact inquiries (${inquiries.length})`
              }
              className="relative min-h-[40px] px-3 py-1.5 rounded-lg border border-white/20 text-xs font-semibold text-white flex items-center gap-1.5 hover:bg-white/10 cursor-pointer"
            >
              <Bell className="w-4 h-4 text-[#C5A059]" aria-hidden="true" />
              <span className="hidden md:inline">
                {lang === 'ar' ? 'الاستفسارات' : 'Inquiries'}
              </span>
              {unreadInquiryCount > 0 ? (
                <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-[#C5A059] text-[#0B132B] text-[11px] font-bold font-mono-data flex items-center justify-center">
                  {unreadInquiryCount}
                </span>
              ) : (
                <span className="text-[11px] font-mono-data text-slate-300">
                  ({inquiries.length})
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={onToggleLanguage}
              className="min-h-[40px] px-3 py-1.5 rounded-lg border border-white/20 text-xs font-semibold text-white flex items-center gap-1.5 hover:bg-white/10 cursor-pointer"
            >
              <Globe className="w-3.5 h-3.5 text-[#C5A059]" />
              <span>{lang === 'ar' ? 'EN' : 'عربي'}</span>
            </button>
            <button
              type="button"
              onClick={onLogout}
              className="min-h-[40px] px-3 py-1.5 rounded-lg border border-red-400/40 bg-red-500/10 hover:bg-red-500/20 text-xs sm:text-sm font-semibold text-red-200 flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <LogOut className="w-4 h-4" aria-hidden="true" />
              <span>{lang === 'ar' ? 'تسجيل الخروج' : 'Sign Out'}</span>
            </button>
            <button
              type="button"
              onClick={onExitDashboard}
              className="min-h-[40px] px-3.5 py-1.5 rounded-lg bg-[#C5A059] hover:bg-[#d4b06a] text-[#0B132B] text-xs sm:text-sm font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <BackIcon className="w-4 h-4" />
              <span>{lang === 'ar' ? 'العودة للموقع' : 'Public Site'}</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        {/* 4 KPI Strip with tabular-nums */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-5 border border-slate-200 space-y-1">
            <p className="text-xs font-semibold text-slate-500">
              {lang === 'ar' ? 'الاستشارات القادمة' : 'Upcoming Bookings'}
            </p>
            <p className="text-2xl sm:text-3xl font-bold text-[#0B132B] tabular-nums font-mono-data">
              {metrics.upcomingBookings}
            </p>
          </div>

          <div className="bg-white rounded-xl p-5 border border-slate-200 space-y-1">
            <p className="text-xs font-semibold text-slate-500">
              {lang === 'ar' ? 'القضايا النشطة' : 'Active Cases'}
            </p>
            <p className="text-2xl sm:text-3xl font-bold text-[#0B132B] tabular-nums font-mono-data">
              {metrics.activeCases}
            </p>
          </div>

          <div className="bg-white rounded-xl p-5 border border-slate-200 space-y-1">
            <p className="text-xs font-semibold text-slate-500">
              {lang === 'ar' ? 'فريق المحامين النشط' : 'Active Attorneys'}
            </p>
            <p className="text-2xl sm:text-3xl font-bold text-[#C5A059] tabular-nums font-mono-data">
              {lawyers.filter((l) => l.status === 'active').length}
            </p>
          </div>

          <div className="bg-white rounded-xl p-5 border border-slate-200 space-y-1">
            <p className="text-xs font-semibold text-slate-500">
              {lang === 'ar' ? 'ملخصات «الصافي» المعلقة' : 'Pending AI Intakes'}
            </p>
            <p className="text-2xl sm:text-3xl font-bold text-emerald-700 tabular-nums font-mono-data">
              {metrics.unconvertedIntakes}
            </p>
          </div>
        </div>

        {/* Workspace Controls: Full 6-Tab Admin Navigation + Search + Add Case */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:flex lg:flex-wrap lg:items-center gap-1.5 p-1 bg-[#F8FAFC] rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setActiveTab('analytics')}
              className={`min-h-[40px] px-3 sm:px-3.5 py-2 rounded-lg text-xs sm:text-sm font-bold flex items-center justify-center sm:justify-start gap-2 whitespace-nowrap cursor-pointer transition-colors ${
                activeTab === 'analytics'
                  ? 'bg-[#0B132B] text-white'
                  : 'text-slate-600 hover:text-[#0B132B]'
              }`}
            >
              <BarChart3 className="w-4 h-4 text-[#C5A059] shrink-0" />
              <span>{lang === 'ar' ? 'الإحصائيات الشاملة' : 'Analytics'}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('team')}
              className={`min-h-[40px] px-3 sm:px-3.5 py-2 rounded-lg text-xs sm:text-sm font-bold flex items-center justify-center sm:justify-start gap-2 whitespace-nowrap cursor-pointer transition-colors ${
                activeTab === 'team'
                  ? 'bg-[#0B132B] text-white'
                  : 'text-slate-600 hover:text-[#0B132B]'
              }`}
            >
              <Users className="w-4 h-4 text-[#C5A059] shrink-0" />
              <span>
                {lang === 'ar'
                  ? `المحامون والأدوار (${lawyers.length})`
                  : `Team & Roles (${lawyers.length})`}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('cases')}
              className={`min-h-[40px] px-3 sm:px-3.5 py-2 rounded-lg text-xs sm:text-sm font-bold flex items-center justify-center sm:justify-start gap-2 whitespace-nowrap cursor-pointer transition-colors ${
                activeTab === 'cases'
                  ? 'bg-[#0B132B] text-white'
                  : 'text-slate-600 hover:text-[#0B132B]'
              }`}
            >
              <Briefcase className="w-4 h-4 text-[#C5A059] shrink-0" />
              <span>{lang === 'ar' ? `القضايا (${cases.length})` : `Cases (${cases.length})`}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('appointments')}
              className={`min-h-[40px] px-3 sm:px-3.5 py-2 rounded-lg text-xs sm:text-sm font-bold flex items-center justify-center sm:justify-start gap-2 whitespace-nowrap cursor-pointer transition-colors ${
                activeTab === 'appointments'
                  ? 'bg-[#0B132B] text-white'
                  : 'text-slate-600 hover:text-[#0B132B]'
              }`}
            >
              <CalendarCheck className="w-4 h-4 text-[#C5A059] shrink-0" />
              <span>
                {lang === 'ar'
                  ? `المواعيد (${bookings.length})`
                  : `Appointments (${bookings.length})`}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('intakes')}
              className={`min-h-[40px] px-3 sm:px-3.5 py-2 rounded-lg text-xs sm:text-sm font-bold flex items-center justify-center sm:justify-start gap-2 whitespace-nowrap cursor-pointer transition-colors ${
                activeTab === 'intakes'
                  ? 'bg-[#0B132B] text-white'
                  : 'text-slate-600 hover:text-[#0B132B]'
              }`}
            >
              <MessageSquareText className="w-4 h-4 text-[#C5A059] shrink-0" />
              <span>
                {lang === 'ar'
                  ? `ملخصات الصافي (${intakes.length})`
                  : `AI Intakes (${intakes.length})`}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('workspace')}
              className={`min-h-[40px] px-3 sm:px-3.5 py-2 rounded-lg text-xs sm:text-sm font-bold flex items-center justify-center sm:justify-start gap-2 whitespace-nowrap cursor-pointer transition-colors ${
                activeTab === 'workspace'
                  ? 'bg-[#0B132B] text-white'
                  : 'text-slate-600 hover:text-[#0B132B]'
              }`}
            >
              <HardDrive className="w-4 h-4 text-[#C5A059] shrink-0" />
              <span dir="ltr">Drive &amp; Sheets</span>
            </button>
          </div>

          {(activeTab === 'cases' || activeTab === 'appointments') && (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-1">
              <div className="relative flex-1 sm:max-w-sm">
                <Search className="w-4 h-4 text-slate-400 absolute top-1/2 -translate-y-1/2 start-3" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={
                    lang === 'ar'
                      ? 'بحث بالاسم، المرجع، أو المحكمة...'
                      : 'Search client, ref, court...'
                  }
                  className="w-full min-h-[42px] ps-9 pe-3 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#C5A059]"
                />
              </div>

              <button
                type="button"
                onClick={() => {
                  if (lawyers[0]?.name) setNewCaseLawyer(lawyers[0].name);
                  setShowNewCaseModal(true);
                }}
                className="min-h-[42px] px-4 py-2 rounded-xl bg-[#C5A059] hover:bg-[#d4b06a] text-[#0B132B] text-sm font-bold flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>{lang === 'ar' ? 'إضافة قضية جديدة' : 'New Legal Case'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Inline Reassignment Toast */}
        {inlineToast && (
          <div
            role="status"
            className="bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl px-4 py-3 text-sm font-semibold flex items-center justify-between gap-2"
          >
            <span>{inlineToast}</span>
            <button
              type="button"
              onClick={() => setInlineToast(null)}
              aria-label={lang === 'ar' ? 'إغلاق' : 'Dismiss'}
              className="p-1 rounded hover:bg-emerald-100 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Loading Skeleton */}
        {loading && (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-sm text-slate-500">
            {lang === 'ar' ? 'جاري تحميل بيانات الشركة...' : 'Loading firm records...'}
          </div>
        )}

        {/* TAB 0: Complete Admin Analytics */}
        {!loading && activeTab === 'analytics' && (
          <AdminAnalyticsPanel
            lang={lang}
            bookings={bookings}
            cases={cases}
            intakes={intakes}
            inquiries={inquiries}
            lawyers={lawyers}
            onQuickTransferFromLawyer={handleQuickTransferFromAnalytics}
            onNavigateTab={(nextTab) => setActiveTab(nextTab)}
          />
        )}

        {/* TAB: Team, Roles & Bulk Transfer */}
        {!loading && activeTab === 'team' && (
          <AdminTeamManagementPanel
            lang={lang}
            lawyers={lawyers}
            cases={cases}
            bookings={bookings}
            preselectedTransferFrom={transferPresetLawyer}
            onCreateLawyer={onCreateLawyer}
            onUpdateLawyer={onUpdateLawyer}
            onDeleteLawyer={onDeleteLawyer}
            onBulkTransfer={onBulkTransfer}
          />
        )}

        {/* TAB 1: Appointments (with inline lawyer reassignment) */}
        {!loading && activeTab === 'appointments' && (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-base font-bold">
                {lang === 'ar' ? 'جدول مواعيد الاستشارات' : 'Consultation Schedule'}
              </h2>
              <div className="flex items-center gap-1.5 overflow-x-auto">
                {(['all', 'pending', 'confirmed', 'completed', 'cancelled'] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setBookingFilter(st)}
                    className={`min-h-[34px] px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer ${
                      bookingFilter === st
                        ? 'bg-[#0B132B] text-white'
                        : 'bg-[#F8FAFC] text-slate-600 hover:bg-slate-200/70'
                    }`}
                  >
                    {st === 'all'
                      ? lang === 'ar'
                        ? 'الكل'
                        : 'All'
                      : bookingStatusLabel[st][lang]}
                  </button>
                ))}
              </div>
            </div>

            {filteredBookings.length === 0 ? (
              <div className="p-10 text-center text-sm text-slate-500">
                {lang === 'ar'
                  ? 'لا توجد مواعيد مطابقة للبحث الحالي.'
                  : 'No consultations match the selected filter.'}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-start">
                  <thead className="bg-[#F8FAFC] text-xs font-bold text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4 text-start">{lang === 'ar' ? 'المرجع' : 'Ref'}</th>
                      <th className="py-3 px-4 text-start">{lang === 'ar' ? 'الموكل' : 'Client'}</th>
                      <th className="py-3 px-4 text-start">
                        {lang === 'ar' ? 'التخصص والمحامي المسؤول' : 'Specialty & Assigned Attorney'}
                      </th>
                      <th className="py-3 px-4 text-start">
                        {lang === 'ar' ? 'الموعد والنوع' : 'Schedule'}
                      </th>
                      <th className="py-3 px-4 text-start">
                        {lang === 'ar' ? 'التكلفة / التوثيق' : 'Cost / Verified'}
                      </th>
                      <th className="py-3 px-4 text-start">{lang === 'ar' ? 'الحالة' : 'Status'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredBookings.map((bk) => {
                      const spec = SPECIALTIES.find((s) => s.id === bk.specialtyId);
                      const hasCurrentLawyerInRoster = lawyerNameOptions.includes(bk.assignedLawyer);
                      return (
                        <tr key={bk.id} className="hover:bg-[#F8FAFC]/80">
                          <td className="py-3.5 px-4 font-mono-data font-semibold text-xs">
                            {bk.referenceCode}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-[#0B132B]">{bk.clientName}</div>
                            <div className="text-xs text-slate-500 font-mono-data" dir="ltr">
                              {bk.clientPhone}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 space-y-1.5">
                            <div className="font-medium text-xs">{spec?.title[lang]}</div>
                            <select
                              aria-label={`${lang === 'ar' ? 'المحامي المسؤول عن موعد' : 'Assigned lawyer for'} ${bk.clientName}`}
                              value={bk.assignedLawyer}
                              onChange={async (e) => {
                                const nextLawyer = e.target.value;
                                await onUpdateBooking(bk.id, { assignedLawyer: nextLawyer });
                                showBriefToast(
                                  lang === 'ar'
                                    ? `تم تحويل موعد ${bk.clientName} إلى ${nextLawyer}.`
                                    : `Reassigned ${bk.clientName}'s booking to ${nextLawyer}.`
                                );
                              }}
                              className="min-h-[34px] max-w-[220px] px-2 py-1 rounded-lg border border-slate-300 text-xs font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-[#C5A059]"
                            >
                              {!hasCurrentLawyerInRoster && (
                                <option value={bk.assignedLawyer}>{bk.assignedLawyer}</option>
                              )}
                              {lawyers.map((l) => (
                                <option key={l.id} value={l.name}>
                                  {l.name}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="py-3.5 px-4 font-mono-data text-xs">
                            <div className="font-bold">
                              {bk.date} · {bk.timeSlot}
                            </div>
                            <div className="text-slate-500">
                              {bk.mode === 'in_person'
                                ? lang === 'ar'
                                  ? 'حضوري (إربد)'
                                  : 'In-Person (Irbid)'
                                : lang === 'ar'
                                  ? 'أونلاين'
                                  : 'Online'}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-xs">
                            <div className="font-bold text-emerald-700">
                              {formatJodCurrency(bk.feeJod, lang)}
                            </div>
                            <div className="text-slate-500">
                              {bk.otpVerified
                                ? lang === 'ar'
                                  ? 'موثّق برسالة SMS'
                                  : 'SMS Verified'
                                : lang === 'ar'
                                  ? 'قيد التحقق'
                                  : 'Pending OTP'}
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <select
                              aria-label={`${lang === 'ar' ? 'تحديث حالة' : 'Update status for'} ${bk.clientName}`}
                              value={bk.status}
                              onChange={(e) =>
                                onUpdateBooking(bk.id, { status: e.target.value as BookingStatus })
                              }
                              className="min-h-[36px] px-2.5 py-1 rounded-lg border border-slate-300 text-xs font-bold bg-white focus:outline-none focus:ring-2 focus:ring-[#C5A059]"
                            >
                              <option value="pending">{bookingStatusLabel.pending[lang]}</option>
                              <option value="confirmed">{bookingStatusLabel.confirmed[lang]}</option>
                              <option value="completed">{bookingStatusLabel.completed[lang]}</option>
                              <option value="cancelled">{bookingStatusLabel.cancelled[lang]}</option>
                            </select>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: Cases Pipeline (with inline per-case lawyer reassignment & filter) */}
        {!loading && activeTab === 'cases' && (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-base font-bold">
                {lang === 'ar' ? 'سجل القضايا والجلسات وتوزيع المحامين' : 'Active Case Docket & Assignment'}
              </h2>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  aria-label={lang === 'ar' ? 'تصفية حسب المحامي' : 'Filter by attorney'}
                  value={caseLawyerFilter}
                  onChange={(e) => setCaseLawyerFilter(e.target.value)}
                  className="min-h-[36px] px-3 py-1 rounded-lg border border-slate-300 text-xs font-semibold bg-white"
                >
                  <option value="all">{lang === 'ar' ? 'كل المحامين' : 'All Attorneys'}</option>
                  {lawyers.map((l) => (
                    <option key={l.id} value={l.name}>
                      {l.name}
                    </option>
                  ))}
                </select>
                <select
                  aria-label={lang === 'ar' ? 'تصفية حسب المرحلة' : 'Filter by stage'}
                  value={caseStageFilter}
                  onChange={(e) => setCaseStageFilter(e.target.value as CaseStage | 'all')}
                  className="min-h-[36px] px-3 py-1 rounded-lg border border-slate-300 text-xs font-semibold bg-white"
                >
                  <option value="all">{lang === 'ar' ? 'كل المراحل' : 'All Stages'}</option>
                  {(Object.keys(caseStageLabel) as CaseStage[]).map((st) => (
                    <option key={st} value={st}>
                      {caseStageLabel[st][lang]}
                    </option>
                  ))}
                </select>
                <select
                  aria-label={lang === 'ar' ? 'تصفية حسب التخصص' : 'Filter by specialty'}
                  value={caseSpecFilter}
                  onChange={(e) => setCaseSpecFilter(e.target.value as SpecialtyId | 'all')}
                  className="min-h-[36px] px-3 py-1 rounded-lg border border-slate-300 text-xs font-semibold bg-white"
                >
                  <option value="all">{lang === 'ar' ? 'كل التخصصات' : 'All Specialties'}</option>
                  {SPECIALTIES.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title[lang]}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {filteredCases.length === 0 ? (
              <div className="p-10 text-center text-sm text-slate-500">
                {lang === 'ar'
                  ? 'لا توجد قضايا مطابقة للتصفية الحالية.'
                  : 'No cases match the current filters.'}
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredCases.map((c) => {
                  const spec = SPECIALTIES.find((s) => s.id === c.specialtyId);
                  const hasCurrentLawyerInRoster = lawyerNameOptions.includes(c.assignedLawyer);
                  return (
                    <div
                      key={c.id}
                      className="p-5 flex flex-col xl:flex-row xl:items-center justify-between gap-4 hover:bg-[#F8FAFC]/80"
                    >
                      <div className="space-y-1.5 flex-1">
                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                          <span className="font-mono-data font-bold text-[#0B132B]">
                            {c.caseNumber}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>{spec?.title[lang]}</span>
                          <span aria-hidden="true">·</span>
                          <span>{c.courtName}</span>
                        </div>
                        <h3 className="text-base font-bold text-[#0B132B]">
                          {c.clientName}{' '}
                          <span className="text-xs font-normal text-slate-500 font-mono-data" dir="ltr">
                            ({c.clientPhone})
                          </span>
                        </h3>
                        <p className="text-sm text-slate-600 leading-relaxed">{c.summary}</p>
                      </div>

                      <div className="flex flex-wrap items-end gap-3 shrink-0">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                            {lang === 'ar' ? 'تغيير المحامي المسؤول' : 'Reassign Attorney'}
                          </label>
                          <select
                            aria-label={`${lang === 'ar' ? 'المحامي المسؤول عن القضية' : 'Assigned lawyer for'} ${c.caseNumber}`}
                            value={c.assignedLawyer}
                            onChange={async (e) => {
                              const nextLawyer = e.target.value;
                              await onUpdateCase(c.id, { assignedLawyer: nextLawyer });
                              showBriefToast(
                                lang === 'ar'
                                  ? `تم تحويل القضية ${c.caseNumber} إلى ${nextLawyer}.`
                                  : `Reassigned case ${c.caseNumber} to ${nextLawyer}.`
                              );
                            }}
                            className="min-h-[38px] max-w-[230px] px-2.5 py-1 rounded-lg border border-[#C5A059] text-xs font-bold text-[#0B132B] bg-white focus:outline-none focus:ring-2 focus:ring-[#C5A059]"
                          >
                            {!hasCurrentLawyerInRoster && (
                              <option value={c.assignedLawyer}>{c.assignedLawyer}</option>
                            )}
                            {lawyers.map((l) => (
                              <option key={l.id} value={l.name}>
                                {l.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                            {lang === 'ar' ? 'تاريخ الجلسة' : 'Next Hearing'}
                          </label>
                          <input
                            type="date"
                            aria-label={`${lang === 'ar' ? 'موعد جلسة' : 'Next hearing for'} ${c.caseNumber}`}
                            value={c.nextHearingDate}
                            onChange={(e) =>
                              onUpdateCase(c.id, { nextHearingDate: e.target.value })
                            }
                            className="min-h-[38px] px-2.5 py-1 rounded-lg border border-slate-300 text-xs font-mono-data bg-white"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                            {lang === 'ar' ? 'المرحلة القضائية' : 'Case Stage'}
                          </label>
                          <select
                            aria-label={`${lang === 'ar' ? 'مرحلة القضية' : 'Case stage for'} ${c.caseNumber}`}
                            value={c.stage}
                            onChange={(e) =>
                              onUpdateCase(c.id, { stage: e.target.value as CaseStage })
                            }
                            className="min-h-[38px] px-3 py-1 rounded-lg border border-slate-300 text-xs font-bold bg-white focus:outline-none focus:ring-2 focus:ring-[#C5A059]"
                          >
                            {(Object.keys(caseStageLabel) as CaseStage[]).map((st) => (
                              <option key={st} value={st}>
                                {caseStageLabel[st][lang]}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: Al-Safi AI Intake Summaries */}
        {!loading && activeTab === 'intakes' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {intakes.length === 0 ? (
              <div className="md:col-span-2 bg-white rounded-2xl border border-slate-200 p-10 text-center text-sm text-slate-500">
                {lang === 'ar'
                  ? 'لم يتم تسجيل ملخصات من المساعد الذكي بعد.'
                  : 'No AI intake summaries logged yet.'}
              </div>
            ) : (
              intakes.map((intake) => {
                const spec = SPECIALTIES.find((s) => s.id === intake.specialtyId);
                return (
                  <div
                    key={intake.id}
                    className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col justify-between gap-4"
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                        <span className="font-bold text-[#C5A059]">{spec?.title[lang]}</span>
                        <span className="font-semibold">
                          {intake.urgency === 'urgent'
                            ? lang === 'ar'
                              ? 'عاجل'
                              : 'Urgent'
                            : lang === 'ar'
                              ? 'اعتيادي'
                              : 'Normal'}
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-[#0B132B]">
                        {intake.clientName}{' '}
                        <span className="text-xs font-mono-data text-slate-500" dir="ltr">
                          · {intake.clientPhone}
                        </span>
                      </h3>
                      <p className="text-sm text-slate-700 leading-relaxed">
                        {intake.factsSummary}
                      </p>
                      <p className="text-xs text-slate-500">
                        {lang === 'ar' ? 'المستندات:' : 'Documents:'} {intake.documentsStatus}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                      {intake.convertedToCaseId ? (
                        <span className="text-xs font-bold text-emerald-700">
                          {lang === 'ar' ? 'تم التحويل إلى ملف قضية' : 'Converted to Active Case'}
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            onCreateCase({
                              clientName: intake.clientName,
                              clientPhone: intake.clientPhone,
                              specialtyId: intake.specialtyId,
                              courtName:
                                intake.specialtyId === 'sharia'
                                  ? 'محكمة إربد الشرعية'
                                  : 'محكمة بداية إربد',
                              assignedLawyer:
                                lawyers.find(
                                  (l) =>
                                    l.status === 'active' &&
                                    l.specialties.includes(intake.specialtyId)
                                )?.name ||
                                lawyers[0]?.name ||
                                'المحامي رضوان علي البطاينة',
                              stage: 'intake',
                              nextHearingDate: '2026-11-29',
                              summary: intake.factsSummary,
                              intakeId: intake.id,
                            });
                            setActiveTab('cases');
                          }}
                          className="min-h-[40px] px-4 py-2 rounded-xl bg-[#0B132B] hover:bg-[#162247] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                        >
                          <FilePlus2 className="w-4 h-4 text-[#C5A059]" />
                          <span>
                            {lang === 'ar' ? 'تحويل إلى ملف قضية' : 'Convert to Case File'}
                          </span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* TAB 4: Google Drive & Google Sheets Workspace */}
        {!loading && activeTab === 'workspace' && (
          <GoogleWorkspacePanel
            lang={lang}
            bookings={bookings}
            cases={cases}
            intakes={intakes}
          />
        )}
      </main>

      {/* New Case Modal */}
      {showNewCaseModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="new-case-title"
          className="fixed inset-0 z-50 bg-[#0B132B]/70 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-2xl w-full max-w-lg border border-slate-200 shadow-2xl overflow-hidden">
            <div className="px-5 py-4 bg-[#0B132B] text-white flex items-center justify-between">
              <h3 id="new-case-title" className="text-base font-bold">
                {lang === 'ar' ? 'فتح ملف قضية جديدة' : 'Open New Legal Case File'}
              </h3>
              <button
                type="button"
                onClick={() => setShowNewCaseModal(false)}
                aria-label={lang === 'ar' ? 'إغلاق' : 'Close'}
                className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg hover:bg-white/10 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateCaseSubmit} className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {lang === 'ar' ? 'اسم الموكل' : 'Client Name'}
                  </label>
                  <input
                    type="text"
                    required
                    value={newCaseClient}
                    onChange={(e) => setNewCaseClient(e.target.value)}
                    className="w-full min-h-[42px] px-3 py-2 rounded-xl border border-slate-300 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {lang === 'ar' ? 'رقم الهاتف' : 'Phone'}
                  </label>
                  <input
                    type="tel"
                    dir="ltr"
                    required
                    value={newCasePhone}
                    onChange={(e) => setNewCasePhone(e.target.value)}
                    className="w-full min-h-[42px] px-3 py-2 rounded-xl border border-slate-300 text-sm font-mono-data"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {lang === 'ar' ? 'التخصص' : 'Specialty'}
                  </label>
                  <select
                    value={newCaseSpec}
                    onChange={(e) => setNewCaseSpec(e.target.value as SpecialtyId)}
                    className="w-full min-h-[42px] px-3 py-2 rounded-xl border border-slate-300 text-sm bg-white"
                  >
                    {SPECIALTIES.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.title[lang]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {lang === 'ar' ? 'المحكمة المختصة' : 'Court'}
                  </label>
                  <input
                    type="text"
                    value={newCaseCourt}
                    onChange={(e) => setNewCaseCourt(e.target.value)}
                    className="w-full min-h-[42px] px-3 py-2 rounded-xl border border-slate-300 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {lang === 'ar' ? 'المحامي المسؤول' : 'Assigned Lawyer'}
                  </label>
                  <select
                    value={newCaseLawyer}
                    onChange={(e) => setNewCaseLawyer(e.target.value)}
                    className="w-full min-h-[42px] px-3 py-2 rounded-xl border border-slate-300 text-sm bg-white font-semibold"
                  >
                    {lawyers.map((l) => (
                      <option key={l.id} value={l.name}>
                        {l.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {lang === 'ar' ? 'تاريخ الجلسة القادمة' : 'Next Hearing Date'}
                  </label>
                  <input
                    type="date"
                    value={newCaseDate}
                    onChange={(e) => setNewCaseDate(e.target.value)}
                    className="w-full min-h-[42px] px-3 py-2 rounded-xl border border-slate-300 text-sm font-mono-data"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {lang === 'ar' ? 'ملخص الوقائع والطلبات' : 'Case Summary'}
                </label>
                <textarea
                  rows={3}
                  required
                  value={newCaseSummary}
                  onChange={(e) => setNewCaseSummary(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewCaseModal(false)}
                  className="min-h-[44px] px-4 py-2 rounded-xl border border-slate-300 text-sm font-semibold cursor-pointer"
                >
                  {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={creatingCase}
                  className="min-h-[44px] px-5 py-2 rounded-xl bg-[#C5A059] text-[#0B132B] text-sm font-bold cursor-pointer"
                >
                  {creatingCase
                    ? lang === 'ar'
                      ? 'جاري الحفظ...'
                      : 'Saving...'
                    : lang === 'ar'
                      ? 'حفظ القضية'
                      : 'Save Case'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Automatic Toast Notifications for New Contact Form Inquiries */}
      <InquiryToastStack
        lang={lang}
        toasts={inquiryToasts}
        onDismiss={dismissInquiryToast}
        onOpenInbox={(inquiryId) => openInquiriesInbox(inquiryId)}
      />

      {/* Incoming Contact Inquiries Inbox Modal */}
      {showInquiriesInbox && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="inquiries-inbox-title"
          className="fixed inset-0 z-50 bg-[#0B132B]/70 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-2xl w-full max-w-2xl border border-slate-200 shadow-2xl overflow-hidden max-h-[85vh] flex flex-col">
            <div className="px-5 py-4 bg-[#0B132B] text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-[#C5A059]" aria-hidden="true" />
                <h3 id="inquiries-inbox-title" className="text-base font-bold">
                  {lang === 'ar'
                    ? `استفسارات نموذج التواصل الواردة (${inquiries.length})`
                    : `Incoming Contact Form Inquiries (${inquiries.length})`}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowInquiriesInbox(false);
                  setHighlightedInquiryId(null);
                }}
                aria-label={lang === 'ar' ? 'إغلاق' : 'Close'}
                className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-lg hover:bg-white/10 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-3">
              {inquiries.length === 0 ? (
                <div className="py-10 text-center text-sm text-slate-500">
                  {lang === 'ar'
                    ? 'لا توجد استفسارات واردة عبر نموذج التواصل حتى الآن. سيظهر تنبيه منبثق تلقائياً فور وصول أي استفسار جديد.'
                    : 'No contact inquiries received yet. A toast notification will appear automatically whenever a new inquiry arrives.'}
                </div>
              ) : (
                inquiries.map((inq) => {
                  const preview = formatInquiryToastPreview(inq, lang, 2000);
                  const isHighlighted = highlightedInquiryId === inq.id;
                  return (
                    <div
                      key={inq.id}
                      className={`rounded-2xl border p-4 space-y-2.5 transition-colors ${
                        isHighlighted
                          ? 'bg-[#C5A059]/10 border-[#C5A059]'
                          : 'bg-[#F8FAFC] border-slate-200'
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <h4 className="text-sm font-bold text-[#0B132B]">{inq.name}</h4>
                          <p className="text-xs text-[#C5A059] font-semibold">
                            {preview.specialtyLabel}
                          </p>
                        </div>
                        <div className="text-end">
                          <p className="text-xs font-mono-data font-bold text-[#0B132B]" dir="ltr">
                            {inq.phone}
                          </p>
                          <p className="text-[11px] font-mono-data text-slate-500" dir="ltr">
                            {inq.createdAt.slice(0, 16).replace('T', ' ')}
                          </p>
                        </div>
                      </div>

                      <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                        {inq.message}
                      </p>

                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <a
                          href={preview.telHref}
                          className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-[#C5A059] hover:bg-[#d4b06a] text-[#0B132B] text-xs font-bold flex items-center gap-1.5"
                        >
                          <PhoneCall className="w-3.5 h-3.5" />
                          <span>{lang === 'ar' ? 'اتصال بالمُرسِل' : 'Call Client'}</span>
                        </a>
                        <button
                          type="button"
                          onClick={async () => {
                            await onCreateCase({
                              clientName: inq.name,
                              clientPhone: inq.phone,
                              specialtyId: inq.specialtyId,
                              courtName:
                                inq.specialtyId === 'sharia'
                                  ? 'محكمة إربد الشرعية'
                                  : 'محكمة بداية حقوق إربد',
                              assignedLawyer:
                                lawyers.find(
                                  (l) =>
                                    l.status === 'active' &&
                                    l.specialties.includes(inq.specialtyId)
                                )?.name ||
                                lawyers[0]?.name ||
                                'المحامي رضوان علي البطاينة',
                              stage: 'intake',
                              nextHearingDate: '2026-11-30',
                              summary: inq.message,
                            });
                            setShowInquiriesInbox(false);
                            setActiveTab('cases');
                            showBriefToast(
                              lang === 'ar'
                                ? `تم تحويل استفسار ${inq.name} إلى ملف قضية جديدة.`
                                : `Converted ${inq.name}'s inquiry into a new case file.`
                            );
                          }}
                          className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-[#0B132B] hover:bg-[#162247] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                        >
                          <FilePlus2 className="w-3.5 h-3.5 text-[#C5A059]" />
                          <span>{lang === 'ar' ? 'تحويل إلى ملف قضية' : 'Convert to Case'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
