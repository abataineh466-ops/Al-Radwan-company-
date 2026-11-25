import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Bell,
  Briefcase,
  CalendarCheck,
  CheckCircle2,
  Download,
  Globe,
  HardDrive,
  LogOut,
  Newspaper,
  PhoneCall,
  ShieldCheck,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import { AdminAnalyticsPanel } from './AdminAnalyticsPanel.js';
import { AdminTeamManagementPanel } from './AdminTeamManagementPanel.js';
import { GoogleWorkspacePanel } from './GoogleWorkspacePanel.js';
import { InquiryToastStack } from './InquiryToastStack.js';
import { RbAiAssistantPanel } from './RbAiAssistantPanel.js';
import { CaseWorkspacePanel } from './CaseWorkspacePanel.js';
import { AdminCmsPanel } from './AdminCmsPanel.js';
import type {
  AuditLogEntry,
  AuthSessionUser,
  BookingStatus,
  CaseAttachment,
  CaseHearing,
  CaseTask,
  ClientProfile,
  ConsultationBooking,
  ContactInquiry,
  FirmLawyer,
  FirmPublication,
  IntakeSummary,
  Language,
  LawyerRole,
  LawyerStatus,
  LegalCase,
  LegalDocumentRecord,
  SpecialtyId,
} from '../types/legal.js';
import { ASSET_IMAGES, SPECIALTIES, UI_COPY } from '../data/firmContent.js';
import { computeDashboardMetrics, filterBookings } from '../utils/legalWorkflow.js';
import {
  detectNewInquiries,
  formatInquiryToastPreview,
  mergeUniqueInquiries,
} from '../utils/inquiryNotifications.js';

type DashboardTab =
  | 'rb_ai'
  | 'cases_crm'
  | 'appointments'
  | 'cms'
  | 'analytics'
  | 'team'
  | 'audit'
  | 'workspace';

interface LawyerDashboardProps {
  lang: Language;
  authToken: string;
  currentUser: AuthSessionUser;
  bookings: ConsultationBooking[];
  cases: LegalCase[];
  intakes: IntakeSummary[];
  inquiries: ContactInquiry[];
  lawyers: FirmLawyer[];
  clients: ClientProfile[];
  hearings: CaseHearing[];
  tasks: CaseTask[];
  attachments: CaseAttachment[];
  documents: LegalDocumentRecord[];
  publications: FirmPublication[];
  auditLogs: AuditLogEntry[];
  loading: boolean;
  onExitDashboard: () => void;
  onLogout: () => void;
  onToggleLanguage: () => void;
  onUpdateBooking: (
    id: string,
    updates: { status?: BookingStatus; assignedLawyer?: string }
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
  onCaseCreated: (c: LegalCase) => void;
  onCaseUpdated: (c: LegalCase) => void;
  onClientCreated: (cl: ClientProfile) => void;
  onHearingCreated: (h: CaseHearing) => void;
  onTaskCreated: (t: CaseTask) => void;
  onTaskUpdated: (t: CaseTask) => void;
  onAttachmentCreated: (a: CaseAttachment) => void;
  onDocumentSaved: (doc: LegalDocumentRecord) => void;
  onPublicationCreated: (pub: FirmPublication) => void;
  onPublicationDeleted: (id: string) => void;
  onInquiriesSynced: (latest: ContactInquiry[]) => void;
}

export function LawyerDashboard({
  lang,
  authToken,
  currentUser,
  bookings,
  cases,
  intakes,
  inquiries,
  lawyers,
  clients,
  hearings,
  tasks,
  attachments,
  documents,
  publications,
  auditLogs,
  loading,
  onExitDashboard,
  onLogout,
  onToggleLanguage,
  onUpdateBooking,
  onCreateLawyer,
  onUpdateLawyer,
  onDeleteLawyer,
  onBulkTransfer,
  onCaseCreated,
  onCaseUpdated,
  onClientCreated,
  onHearingCreated,
  onTaskCreated,
  onTaskUpdated,
  onAttachmentCreated,
  onDocumentSaved,
  onPublicationCreated,
  onPublicationDeleted,
  onInquiriesSynced,
}: LawyerDashboardProps) {
  const [activeTab, setActiveTab] = useState<DashboardTab>('rb_ai');
  const [rbAiInitialCaseId, setRbAiInitialCaseId] = useState<string | undefined>(undefined);
  const [transferPresetLawyer, setTransferPresetLawyer] = useState<string | undefined>(undefined);
  const [bookingFilter, setBookingFilter] = useState<BookingStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [inlineToast, setInlineToast] = useState<string | null>(null);

  const [inquiryToasts, setInquiryToasts] = useState<ContactInquiry[]>([]);
  const [unreadInquiryCount, setUnreadInquiryCount] = useState(0);
  const [showInquiriesInbox, setShowInquiriesInbox] = useState(false);
  const seenInquiryIdsRef = useRef<Set<string>>(new Set());
  const seededInquiriesRef = useRef(false);
  const inquiriesRef = useRef<ContactInquiry[]>(inquiries);
  inquiriesRef.current = inquiries;

  const isAdmin = Boolean(currentUser.canManageRoles || currentUser.role === 'managing_partner');

  useEffect(() => {
    if (loading || seededInquiriesRef.current) return;
    for (const item of inquiries) seenInquiryIdsRef.current.add(item.id);
    seededInquiriesRef.current = true;
  }, [loading, inquiries]);

  useEffect(() => {
    if (loading || !authToken) return;
    let active = true;

    async function pollInquiries() {
      if (!active || document.visibilityState === 'hidden') return;
      try {
        const res = await fetch('/api/inquiries', {
          cache: 'no-store',
          headers: { Authorization: `Bearer ${authToken}` },
          credentials: 'include',
        });
        if (!res.ok || !active) return;
        const data = (await res.json()) as { inquiries?: ContactInquiry[] };
        const latest = Array.isArray(data.inquiries) ? data.inquiries : [];
        if (!seededInquiriesRef.current) {
          for (const item of latest) seenInquiryIdsRef.current.add(item.id);
          seededInquiriesRef.current = true;
          return;
        }
        const newlyArrived = detectNewInquiries(seenInquiryIdsRef.current, latest);
        if (newlyArrived.length === 0) return;
        for (const item of newlyArrived) seenInquiryIdsRef.current.add(item.id);
        onInquiriesSynced(mergeUniqueInquiries(latest, inquiriesRef.current));
        setUnreadInquiryCount((prev) => prev + newlyArrived.length);
        setInquiryToasts((prev) => [...newlyArrived, ...prev].slice(0, 3));
      } catch {
        // Ignore transient poll errors
      }
    }

    const timer = window.setInterval(() => void pollInquiries(), 8000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [loading, authToken, onInquiriesSynced]);

  const metrics = computeDashboardMetrics(bookings, cases, intakes);
  const filteredBookings = filterBookings(bookings, bookingFilter, searchQuery);
  const BackIcon = lang === 'ar' ? ArrowRight : ArrowLeft;

  function showBriefToast(message: string) {
    setInlineToast(message);
    window.setTimeout(() => {
      setInlineToast((c) => (c === message ? null : c));
    }, 3500);
  }

  async function handleDownloadBackup() {
    const res = await fetch('/api/admin/backup', {
      headers: { Authorization: `Bearer ${authToken}` },
      credentials: 'include',
    });
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rb-legal-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  const bookingStatusLabel: Record<BookingStatus, Record<Language, string>> = {
    pending: { ar: 'بانتظار تأكيد المكتب', en: 'Pending Confirmation' },
    confirmed: { ar: 'مؤكد من المكتب', en: 'Confirmed' },
    completed: { ar: 'مكتمل', en: 'Completed' },
    cancelled: { ar: 'ملغي', en: 'Cancelled' },
  };

  return (
    <div className="min-h-screen bg-[#FAF8F3] text-[#0B132B]">
      {/* Top Bar */}
      <header className="sticky top-0 z-30 bg-[#0B132B] text-white border-b border-[#C5A059]/25">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src={ASSET_IMAGES.logoCrownEmblem}
              alt={UI_COPY.brandShort[lang]}
              className="h-9 w-auto object-contain rounded shrink-0"
            />
            <div className="truncate">
              <p className="text-xs text-[#C5A059] font-bold truncate">
                {UI_COPY.brandShort[lang]} · {UI_COPY.brandAbbr}
              </p>
              <h1 className="text-xs sm:text-sm font-bold truncate">
                {currentUser.displayName} ({isAdmin ? 'الإدارة العامة' : 'محامي مسجل'})
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                setShowInquiriesInbox(true);
                setUnreadInquiryCount(0);
              }}
              className="relative min-h-[38px] px-3 py-1.5 rounded-lg border border-white/20 text-xs font-semibold text-white flex items-center gap-1.5 hover:bg-white/10 cursor-pointer"
            >
              <Bell className="w-4 h-4 text-[#C5A059]" />
              <span className="hidden md:inline">
                {lang === 'ar' ? 'الاستفسارات' : 'Inquiries'}
              </span>
              <span className="text-[11px] font-mono-data text-[#C5A059]">
                ({unreadInquiryCount > 0 ? unreadInquiryCount : inquiries.length})
              </span>
            </button>

            <button
              type="button"
              onClick={onToggleLanguage}
              className="min-h-[38px] px-3 py-1.5 rounded-lg border border-white/20 text-xs font-semibold text-white flex items-center gap-1.5 hover:bg-white/10 cursor-pointer"
            >
              <Globe className="w-3.5 h-3.5 text-[#C5A059]" />
              <span>{lang === 'ar' ? 'EN' : 'عربي'}</span>
            </button>

            <button
              type="button"
              onClick={onLogout}
              className="min-h-[38px] px-3 py-1.5 rounded-lg border border-red-400/40 bg-red-500/10 hover:bg-red-500/20 text-xs font-semibold text-red-200 flex items-center gap-1.5 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">{lang === 'ar' ? 'خروج' : 'Sign Out'}</span>
            </button>

            <button
              type="button"
              onClick={onExitDashboard}
              className="min-h-[38px] px-3.5 py-1.5 rounded-lg bg-[#C5A059] hover:bg-[#d4b06a] text-[#0B132B] text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <BackIcon className="w-4 h-4" />
              <span>{lang === 'ar' ? 'الموقع' : 'Public Site'}</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* KPI Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-4 border border-slate-200">
            <p className="text-xs font-semibold text-slate-500">المواعيد المعلقة / القادمة</p>
            <p className="text-2xl font-bold font-mono-data text-[#0B132B] mt-1">
              {metrics.upcomingBookings}
            </p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-slate-200">
            <p className="text-xs font-semibold text-slate-500">القضايا النشطة</p>
            <p className="text-2xl font-bold font-mono-data text-[#0B132B] mt-1">
              {metrics.activeCases}
            </p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-slate-200">
            <p className="text-xs font-semibold text-slate-500">المستندات القانونية (RB AI)</p>
            <p className="text-2xl font-bold font-mono-data text-[#C5A059] mt-1">
              {documents.length}
            </p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-slate-200">
            <p className="text-xs font-semibold text-slate-500">المهام الجارية</p>
            <p className="text-2xl font-bold font-mono-data text-emerald-700 mt-1">
              {tasks.filter((t) => t.status !== 'done').length}
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-white rounded-2xl border border-slate-200 p-2 flex flex-wrap gap-1.5">
          {[
            { id: 'rb_ai' as DashboardTab, icon: Sparkles, label: 'RB AI — المساعد الذكي' },
            { id: 'cases_crm' as DashboardTab, icon: Briefcase, label: `القضايا والملفات (${cases.length})` },
            { id: 'appointments' as DashboardTab, icon: CalendarCheck, label: `المواعيد (${bookings.length})` },
            { id: 'cms' as DashboardTab, icon: Newspaper, label: `المقالات والإعلام (${publications.length})` },
            { id: 'analytics' as DashboardTab, icon: BarChart3, label: 'الإحصائيات' },
            ...(isAdmin
              ? [
                  { id: 'team' as DashboardTab, icon: Users, label: `الفريق (${lawyers.length})` },
                  { id: 'audit' as DashboardTab, icon: ShieldCheck, label: 'سجل التدقيق والنسخ' },
                ]
              : []),
            { id: 'workspace' as DashboardTab, icon: HardDrive, label: 'Drive & Sheets' },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`min-h-[40px] px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors ${
                  active ? 'bg-[#0B132B] text-white' : 'text-slate-600 hover:bg-[#FAF8F3]'
                }`}
              >
                <Icon className="w-4 h-4 text-[#C5A059]" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {inlineToast && (
          <div
            role="status"
            className="bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl px-4 py-3 text-sm font-semibold flex items-center justify-between"
          >
            <span>{inlineToast}</span>
            <button type="button" onClick={() => setInlineToast(null)} className="cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {loading && (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-sm text-slate-500">
            جاري تحميل بيانات المكتب...
          </div>
        )}

        {/* TAB: RB AI — LEGAL ASSISTANT */}
        {!loading && activeTab === 'rb_ai' && (
          <RbAiAssistantPanel
            lang={lang}
            authToken={authToken}
            currentUser={currentUser}
            cases={cases}
            documents={documents}
            initialCaseId={rbAiInitialCaseId}
            onDocumentSaved={onDocumentSaved}
          />
        )}

        {/* TAB: Cases, Clients, Hearings, Tasks, Attachments */}
        {!loading && activeTab === 'cases_crm' && (
          <CaseWorkspacePanel
            lang={lang}
            authToken={authToken}
            cases={cases}
            clients={clients}
            hearings={hearings}
            tasks={tasks}
            attachments={attachments}
            documents={documents}
            lawyers={lawyers}
            onCaseCreated={onCaseCreated}
            onCaseUpdated={onCaseUpdated}
            onClientCreated={onClientCreated}
            onHearingCreated={onHearingCreated}
            onTaskCreated={onTaskCreated}
            onTaskUpdated={onTaskUpdated}
            onAttachmentCreated={onAttachmentCreated}
            onOpenInRbAi={(caseId) => {
              setRbAiInitialCaseId(caseId);
              setActiveTab('rb_ai');
            }}
          />
        )}

        {/* TAB: Appointments (Manual Office Confirmation) */}
        {!loading && activeTab === 'appointments' && (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold">جدول طلبات المواعيد (التأكيد من المكتب)</h2>
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="بحث بالاسم أو الهاتف..."
                  className="min-h-[34px] px-3 py-1 rounded-lg border border-slate-300 text-xs"
                />
              </div>
              <div className="flex items-center gap-1.5">
                {(['all', 'pending', 'confirmed', 'completed', 'cancelled'] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setBookingFilter(st)}
                    className={`min-h-[32px] px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
                      bookingFilter === st
                        ? 'bg-[#0B132B] text-white'
                        : 'bg-[#FAF8F3] text-slate-600'
                    }`}
                  >
                    {st === 'all' ? 'الكل' : bookingStatusLabel[st][lang]}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm text-start">
                <thead className="bg-[#FAF8F3] text-xs font-bold text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4 text-start">المرجع</th>
                    <th className="py-3 px-4 text-start">الموكل</th>
                    <th className="py-3 px-4 text-start">الفرع / النوع</th>
                    <th className="py-3 px-4 text-start">التخصص والمحامي</th>
                    <th className="py-3 px-4 text-start">الموعد</th>
                    <th className="py-3 px-4 text-start">اعتماد المكتب</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredBookings.map((bk) => {
                    const spec = SPECIALTIES.find((s) => s.id === bk.specialtyId);
                    const branchText =
                      bk.branch === 'amman'
                        ? 'فرع عمّان'
                        : bk.branch === 'online'
                          ? 'أونلاين'
                          : 'فرع إربد';
                    return (
                      <tr key={bk.id}>
                        <td className="py-3 px-4 font-mono-data text-xs font-bold">
                          {bk.referenceCode}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold">{bk.clientName}</div>
                          <div className="text-xs font-mono-data text-slate-500" dir="ltr">
                            {bk.clientPhone}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-xs font-semibold">{branchText}</td>
                        <td className="py-3 px-4 text-xs space-y-1">
                          <div>{spec?.title[lang]}</div>
                          <select
                            value={bk.assignedLawyer}
                            onChange={(e) =>
                              void onUpdateBooking(bk.id, { assignedLawyer: e.target.value })
                            }
                            className="px-2 py-1 rounded border border-slate-300 text-xs bg-white"
                          >
                            {lawyers.map((l) => (
                              <option key={l.id} value={l.name}>
                                {l.name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-3 px-4 font-mono-data text-xs">
                          {bk.date} · {bk.timeSlot}
                        </td>
                        <td className="py-3 px-4 flex flex-wrap items-center gap-2">
                          {bk.status === 'pending' && (
                            <button
                              type="button"
                              onClick={async () => {
                                await onUpdateBooking(bk.id, { status: 'confirmed' });
                                showBriefToast(`تم تأكيد موعد ${bk.clientName} رسمياً.`);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>تأكيد الموعد</span>
                            </button>
                          )}
                          <select
                            value={bk.status}
                            onChange={(e) =>
                              void onUpdateBooking(bk.id, {
                                status: e.target.value as BookingStatus,
                              })
                            }
                            className="min-h-[34px] px-2 py-1 rounded-lg border border-slate-300 text-xs font-bold bg-white"
                          >
                            <option value="pending">بانتظار التأكيد</option>
                            <option value="confirmed">مؤكد</option>
                            <option value="completed">مكتمل</option>
                            <option value="cancelled">ملغي</option>
                          </select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB: Media & Articles CMS */}
        {!loading && activeTab === 'cms' && (
          <AdminCmsPanel
            lang={lang}
            authToken={authToken}
            publications={publications}
            onPublicationCreated={onPublicationCreated}
            onPublicationDeleted={onPublicationDeleted}
          />
        )}

        {/* TAB: Analytics */}
        {!loading && activeTab === 'analytics' && (
          <AdminAnalyticsPanel
            lang={lang}
            bookings={bookings}
            cases={cases}
            intakes={intakes}
            inquiries={inquiries}
            lawyers={lawyers}
            onQuickTransferFromLawyer={(lawyerName) => {
              setTransferPresetLawyer(lawyerName);
              setActiveTab('team');
            }}
            onNavigateTab={(t) =>
              setActiveTab(t === 'cases' ? 'cases_crm' : t === 'team' ? 'team' : 'appointments')
            }
          />
        )}

        {/* TAB: Team & Roles (Admin only) */}
        {!loading && activeTab === 'team' && isAdmin && (
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

        {/* TAB: Audit Log & Backup (Admin only) */}
        {!loading && activeTab === 'audit' && isAdmin && (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-extrabold text-[#0B132B]">
                  سجل التدقيق الأمني (Audit Log) والنسخ الاحتياطي
                </h2>
                <p className="text-xs text-slate-500">
                  توثيق كامل لمن أنشأ، عدّل، اعتمد، أو صدّر كل مستند وقضية في النظام.
                </p>
              </div>
              <button
                type="button"
                onClick={() => void handleDownloadBackup()}
                className="min-h-[40px] px-4 py-2 rounded-xl bg-[#0B132B] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-4 h-4 text-[#C5A059]" />
                <span>تصدير نسخة احتياطية كاملة (JSON)</span>
              </button>
            </div>

            <div className="divide-y divide-slate-100 max-h-[550px] overflow-y-auto">
              {auditLogs.length === 0 ? (
                <div className="p-8 text-center text-sm text-slate-500">
                  لا توجد عمليات مسجلة بعد.
                </div>
              ) : (
                auditLogs.map((log) => (
                  <div
                    key={log.id}
                    className="px-5 py-3 flex flex-wrap items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-0.5">
                      <span className="font-bold text-[#0B132B]">{log.actorName}</span>{' '}
                      <span className="text-[#C5A059] font-mono-data font-bold">
                        [{log.action}]
                      </span>
                      <p className="text-slate-600">{log.summary}</p>
                    </div>
                    <span className="font-mono-data text-slate-400" dir="ltr">
                      {log.timestamp.slice(0, 19).replace('T', ' ')}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB: Google Drive & Sheets */}
        {!loading && activeTab === 'workspace' && (
          <GoogleWorkspacePanel lang={lang} bookings={bookings} cases={cases} intakes={intakes} />
        )}
      </main>

      <InquiryToastStack
        lang={lang}
        toasts={inquiryToasts}
        onDismiss={(id) => setInquiryToasts((p) => p.filter((x) => x.id !== id))}
        onOpenInbox={() => setShowInquiriesInbox(true)}
      />

      {showInquiriesInbox && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-[#0B132B]/70 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-2xl w-full max-w-2xl border border-slate-200 shadow-2xl overflow-hidden max-h-[85vh] flex flex-col">
            <div className="px-5 py-4 bg-[#0B132B] text-white flex items-center justify-between">
              <h3 className="text-base font-bold">الاستفسارات الواردة ({inquiries.length})</h3>
              <button
                type="button"
                onClick={() => setShowInquiriesInbox(false)}
                className="p-1.5 rounded-lg hover:bg-white/10 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 overflow-y-auto space-y-3">
              {inquiries.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-6">لا توجد استفسارات بعد.</p>
              ) : (
                inquiries.map((inq) => {
                  const preview = formatInquiryToastPreview(inq, lang, 2000);
                  return (
                    <div
                      key={inq.id}
                      className="rounded-xl border border-slate-200 bg-[#FAF8F3] p-4 space-y-2"
                    >
                      <div className="flex justify-between">
                        <span className="font-bold text-sm">{inq.name}</span>
                        <span className="font-mono-data text-xs" dir="ltr">
                          {inq.phone}
                        </span>
                      </div>
                      <p className="text-xs text-[#C5A059] font-semibold">
                        {preview.specialtyLabel}
                      </p>
                      <p className="text-sm text-slate-700">{inq.message}</p>
                      <a
                        href={preview.telHref}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#C5A059] text-[#0B132B] text-xs font-bold"
                      >
                        <PhoneCall className="w-3.5 h-3.5" />
                        <span>اتصال</span>
                      </a>
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
