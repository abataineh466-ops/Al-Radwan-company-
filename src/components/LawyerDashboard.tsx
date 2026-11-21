import { useState, type FormEvent } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Briefcase,
  CalendarCheck,
  FilePlus2,
  Globe,
  LogOut,
  MessageSquareText,
  Plus,
  Scale,
  Search,
  X,
} from 'lucide-react';
import type {
  BookingStatus,
  CaseStage,
  ConsultationBooking,
  IntakeSummary,
  Language,
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

interface LawyerDashboardProps {
  lang: Language;
  bookings: ConsultationBooking[];
  cases: LegalCase[];
  intakes: IntakeSummary[];
  loading: boolean;
  onExitDashboard: () => void;
  onLogout: () => void;
  onToggleLanguage: () => void;
  onUpdateBookingStatus: (id: string, status: BookingStatus) => Promise<void>;
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
  onUpdateCase: (id: string, updates: { stage?: CaseStage; nextHearingDate?: string }) => Promise<void>;
}

export function LawyerDashboard({
  lang,
  bookings,
  cases,
  intakes,
  loading,
  onExitDashboard,
  onLogout,
  onToggleLanguage,
  onUpdateBookingStatus,
  onCreateCase,
  onUpdateCase,
}: LawyerDashboardProps) {
  const [activeTab, setActiveTab] = useState<'appointments' | 'cases' | 'intakes'>('appointments');
  const [searchQuery, setSearchQuery] = useState('');
  const [bookingFilter, setBookingFilter] = useState<BookingStatus | 'all'>('all');
  const [caseStageFilter, setCaseStageFilter] = useState<CaseStage | 'all'>('all');
  const [caseSpecFilter, setCaseSpecFilter] = useState<SpecialtyId | 'all'>('all');

  const [showNewCaseModal, setShowNewCaseModal] = useState(false);
  const [newCaseClient, setNewCaseClient] = useState('');
  const [newCasePhone, setNewCasePhone] = useState('079');
  const [newCaseSpec, setNewCaseSpec] = useState<SpecialtyId>('civil');
  const [newCaseCourt, setNewCaseCourt] = useState('محكمة بداية حقوق إربد');
  const [newCaseLawyer, setNewCaseLawyer] = useState('المحامي رضوان علي البطاينة');
  const [newCaseDate, setNewCaseDate] = useState('2026-11-28');
  const [newCaseSummary, setNewCaseSummary] = useState('');
  const [creatingCase, setCreatingCase] = useState(false);

  const metrics = computeDashboardMetrics(bookings, cases, intakes);
  const filteredBookings = filterBookings(bookings, bookingFilter, searchQuery);
  const filteredCases = filterCases(cases, caseStageFilter, caseSpecFilter, searchQuery);

  const BackIcon = lang === 'ar' ? ArrowRight : ArrowLeft;

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
        assignedLawyer: newCaseLawyer,
        stage: 'intake',
        nextHearingDate: newCaseDate,
        summary: newCaseSummary,
      });
      setShowNewCaseModal(false);
      setNewCaseClient('');
      setNewCaseSummary('');
    } finally {
      setCreatingCase(false);
    }
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
                  ? 'شركة الرضوان / لوحة تحكم المحامين'
                  : 'Al-Radwan Law & Arbitration / Attorney Portal'}
              </p>
              <h1 className="text-sm sm:text-base font-bold truncate">
                {lang === 'ar'
                  ? 'إدارة المواعيد وتتبع القضايا'
                  : 'Appointments & Case Management'}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
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
              {lang === 'ar' ? 'ملخصات "الصافي" المعلقة' : 'Pending AI Intakes'}
            </p>
            <p className="text-2xl sm:text-3xl font-bold text-[#C5A059] tabular-nums font-mono-data">
              {metrics.unconvertedIntakes}
            </p>
          </div>

          <div className="bg-white rounded-xl p-5 border border-slate-200 space-y-1">
            <p className="text-xs font-semibold text-slate-500">
              {lang === 'ar' ? 'الاستشارات المكتملة' : 'Completed Consultations'}
            </p>
            <p className="text-2xl sm:text-3xl font-bold text-emerald-700 tabular-nums font-mono-data">
              {metrics.completedBookings}
            </p>
          </div>
        </div>

        {/* Workspace Controls: Tabs + Search + Add Case */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-1 p-1 bg-[#F8FAFC] rounded-xl border border-slate-200 overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab('appointments')}
              className={`min-h-[40px] px-4 py-2 rounded-lg text-xs sm:text-sm font-bold flex items-center gap-2 whitespace-nowrap cursor-pointer transition-colors ${
                activeTab === 'appointments'
                  ? 'bg-[#0B132B] text-white'
                  : 'text-slate-600 hover:text-[#0B132B]'
              }`}
            >
              <CalendarCheck className="w-4 h-4 text-[#C5A059]" />
              <span>
                {lang === 'ar' ? `المواعيد (${bookings.length})` : `Appointments (${bookings.length})`}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('cases')}
              className={`min-h-[40px] px-4 py-2 rounded-lg text-xs sm:text-sm font-bold flex items-center gap-2 whitespace-nowrap cursor-pointer transition-colors ${
                activeTab === 'cases'
                  ? 'bg-[#0B132B] text-white'
                  : 'text-slate-600 hover:text-[#0B132B]'
              }`}
            >
              <Briefcase className="w-4 h-4 text-[#C5A059]" />
              <span>{lang === 'ar' ? `القضايا (${cases.length})` : `Cases (${cases.length})`}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('intakes')}
              className={`min-h-[40px] px-4 py-2 rounded-lg text-xs sm:text-sm font-bold flex items-center gap-2 whitespace-nowrap cursor-pointer transition-colors ${
                activeTab === 'intakes'
                  ? 'bg-[#0B132B] text-white'
                  : 'text-slate-600 hover:text-[#0B132B]'
              }`}
            >
              <MessageSquareText className="w-4 h-4 text-[#C5A059]" />
              <span>
                {lang === 'ar'
                  ? `ملخصات الصافي (${intakes.length})`
                  : `AI Intakes (${intakes.length})`}
              </span>
            </button>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <div className="relative flex-1 sm:w-64">
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
              onClick={() => setShowNewCaseModal(true)}
              className="min-h-[42px] px-4 py-2 rounded-xl bg-[#C5A059] hover:bg-[#d4b06a] text-[#0B132B] text-sm font-bold flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{lang === 'ar' ? 'إضافة قضية جديدة' : 'New Legal Case'}</span>
            </button>
          </div>
        </div>

        {/* Loading Skeleton */}
        {loading && (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-sm text-slate-500">
            {lang === 'ar' ? 'جاري تحميل بيانات الشركة...' : 'Loading firm records...'}
          </div>
        )}

        {/* TAB 1: Appointments */}
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
                      <th className="py-3 px-4 text-start">{lang === 'ar' ? 'التخصص' : 'Specialty'}</th>
                      <th className="py-3 px-4 text-start">{lang === 'ar' ? 'الموعد والنوع' : 'Schedule'}</th>
                      <th className="py-3 px-4 text-start">{lang === 'ar' ? 'التكلفة / التوثيق' : 'Cost / Verified'}</th>
                      <th className="py-3 px-4 text-start">{lang === 'ar' ? 'الحالة' : 'Status'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredBookings.map((bk) => {
                      const spec = SPECIALTIES.find((s) => s.id === bk.specialtyId);
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
                          <td className="py-3.5 px-4">
                            <div className="font-medium">{spec?.title[lang]}</div>
                            <div className="text-xs text-slate-500">{bk.assignedLawyer}</div>
                          </td>
                          <td className="py-3.5 px-4 font-mono-data text-xs">
                            <div className="font-bold">{bk.date} · {bk.timeSlot}</div>
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
                                onUpdateBookingStatus(bk.id, e.target.value as BookingStatus)
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

        {/* TAB 2: Cases Pipeline */}
        {!loading && activeTab === 'cases' && (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-base font-bold">
                {lang === 'ar' ? 'سجل القضايا والجلسات' : 'Active Case Docket'}
              </h2>
              <div className="flex flex-wrap items-center gap-2">
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
                  return (
                    <div
                      key={c.id}
                      className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-[#F8FAFC]/80"
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
                        <p className="text-xs text-slate-500">
                          {lang === 'ar' ? 'المحامي المسؤول:' : 'Lead Counsel:'}{' '}
                          <span className="font-semibold text-[#0B132B]">{c.assignedLawyer}</span>
                        </p>
                      </div>

                      <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 shrink-0">
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
                              assignedLawyer: spec?.leadLawyer.ar || 'المحامي رضوان علي البطاينة',
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
                  <input
                    type="text"
                    value={newCaseLawyer}
                    onChange={(e) => setNewCaseLawyer(e.target.value)}
                    className="w-full min-h-[42px] px-3 py-2 rounded-xl border border-slate-300 text-sm"
                  />
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
    </div>
  );
}
