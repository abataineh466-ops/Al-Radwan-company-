import {
  ArrowLeftRight,
  BarChart3,
  Briefcase,
  CalendarCheck,
  CheckCircle2,
  Mail,
  Scale,
  Sparkles,
  Users,
} from 'lucide-react';
import type {
  BookingStatus,
  CaseStage,
  ConsultationBooking,
  ContactInquiry,
  FirmLawyer,
  IntakeSummary,
  Language,
  LegalCase,
} from '../types/legal.js';
import { SPECIALTIES } from '../data/firmContent.js';
import { computeAdminFirmAnalytics, LAWYER_ROLE_META } from '../utils/adminAnalytics.js';

interface AdminAnalyticsPanelProps {
  lang: Language;
  bookings: ConsultationBooking[];
  cases: LegalCase[];
  intakes: IntakeSummary[];
  inquiries: ContactInquiry[];
  lawyers: FirmLawyer[];
  onQuickTransferFromLawyer: (lawyerName: string) => void;
  onNavigateTab: (tab: 'cases' | 'appointments' | 'intakes' | 'team') => void;
}

const CASE_STAGE_LABELS: Record<CaseStage, Record<Language, string>> = {
  intake: { ar: 'استشارة جديدة', en: 'Initial Intake' },
  drafting: { ar: 'تجهيز لائحة الدعوى', en: 'Drafting Pleadings' },
  litigation: { ar: 'قيد المرافعة', en: 'In Litigation' },
  execution: { ar: 'مرحلة التنفيذ', en: 'Execution Dept' },
  closed: { ar: 'مغلقة / منتهية', en: 'Closed' },
};

const BOOKING_STATUS_LABELS: Record<BookingStatus, Record<Language, string>> = {
  confirmed: { ar: 'مؤكد', en: 'Confirmed' },
  pending: { ar: 'قيد المراجعة', en: 'Pending' },
  completed: { ar: 'مكتمل', en: 'Completed' },
  cancelled: { ar: 'ملغي', en: 'Cancelled' },
};

export function AdminAnalyticsPanel({
  lang,
  bookings,
  cases,
  intakes,
  inquiries,
  lawyers,
  onQuickTransferFromLawyer,
  onNavigateTab,
}: AdminAnalyticsPanelProps) {
  const analytics = computeAdminFirmAnalytics({
    bookings,
    cases,
    intakes,
    inquiries,
    lawyers,
  });

  const maxWorkload = Math.max(1, ...analytics.lawyerWorkloads.map((w) => w.totalWorkload));
  const maxSpecialtyVolume = Math.max(
    1,
    ...analytics.specialtyBreakdown.map((s) => s.totalVolume)
  );
  const inPersonPct =
    analytics.totalBookings > 0
      ? Math.round((analytics.inPersonBookings / analytics.totalBookings) * 100)
      : 0;
  const onlinePct = analytics.totalBookings > 0 ? 100 - inPersonPct : 0;

  return (
    <div className="space-y-6">
      {/* Executive Header Banner */}
      <div className="bg-[#0B132B] text-white rounded-2xl p-5 sm:p-6 border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <p className="text-xs font-semibold text-[#C5A059] flex items-center gap-1.5">
            <BarChart3 className="w-4 h-4" aria-hidden="true" />
            <span>
              {lang === 'ar'
                ? 'مركز القيادة والإحصائيات الشاملة للآدمن'
                : 'Executive Admin Control & Analytics Center'}
            </span>
          </p>
          <h2 className="text-lg sm:text-xl font-bold">
            {lang === 'ar'
              ? 'الأداء التشغيلي، توزيع القضايا، وحمل العمل على فريق المحامين'
              : 'Firm Performance, Case Pipeline & Attorney Workload Distribution'}
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onNavigateTab('team')}
            className="min-h-[40px] px-4 py-2 rounded-xl bg-[#C5A059] hover:bg-[#d4b06a] text-[#0B132B] text-xs sm:text-sm font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <Users className="w-4 h-4" />
            <span>{lang === 'ar' ? 'إدارة المحامين والأدوار' : 'Manage Team & Roles'}</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigateTab('cases')}
            className="min-h-[40px] px-4 py-2 rounded-xl border border-white/20 hover:bg-white/10 text-white text-xs sm:text-sm font-semibold flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <Briefcase className="w-4 h-4 text-[#C5A059]" />
            <span>{lang === 'ar' ? 'سجل القضايا' : 'Case Docket'}</span>
          </button>
        </div>
      </div>

      {/* Detailed Executive KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">
              {lang === 'ar' ? 'إجمالي القضايا والإنجاز' : 'Cases & Closure Rate'}
            </span>
            <Scale className="w-4 h-4 text-[#C5A059]" aria-hidden="true" />
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-3xl font-bold text-[#0B132B] font-mono-data tabular-nums">
              {analytics.totalCases}
            </span>
            <span className="text-xs font-bold text-emerald-700 font-mono-data">
              {analytics.caseClosureRate}% {lang === 'ar' ? 'مغلقة' : 'closed'}
            </span>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
            <span>
              {lang === 'ar' ? 'نشطة:' : 'Active:'}{' '}
              <strong className="text-[#0B132B] font-mono-data">{analytics.activeCases}</strong>
            </span>
            <span>
              {lang === 'ar' ? 'مغلقة:' : 'Closed:'}{' '}
              <strong className="text-emerald-700 font-mono-data">{analytics.closedCases}</strong>
            </span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">
              {lang === 'ar' ? 'الاستشارات ومعدل الإتمام' : 'Consultations & Completion'}
            </span>
            <CalendarCheck className="w-4 h-4 text-[#C5A059]" aria-hidden="true" />
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-3xl font-bold text-[#0B132B] font-mono-data tabular-nums">
              {analytics.totalBookings}
            </span>
            <span className="text-xs font-bold text-emerald-700 font-mono-data">
              {analytics.bookingCompletionRate}% {lang === 'ar' ? 'مكتملة' : 'completed'}
            </span>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
            <span>
              {lang === 'ar' ? 'حضوري:' : 'In-Person:'}{' '}
              <strong className="text-[#0B132B] font-mono-data">{inPersonPct}%</strong>
            </span>
            <span>
              {lang === 'ar' ? 'أونلاين:' : 'Online:'}{' '}
              <strong className="text-[#0B132B] font-mono-data">{onlinePct}%</strong>
            </span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">
              {lang === 'ar' ? 'كفاءة الفريق وحمل العمل' : 'Legal Team & Workload'}
            </span>
            <Users className="w-4 h-4 text-[#C5A059]" aria-hidden="true" />
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-3xl font-bold text-[#0B132B] font-mono-data tabular-nums">
              {analytics.activeLawyers}
              <span className="text-base text-slate-400 font-normal">/{analytics.totalLawyers}</span>
            </span>
            <span className="text-xs font-bold text-[#0B132B] font-mono-data">
              {analytics.avgActiveCasesPerLawyer}{' '}
              {lang === 'ar' ? 'قضية/محامي' : 'cases/lawyer'}
            </span>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
            <span>
              {lang === 'ar' ? 'محامون نشطون:' : 'Active:'}{' '}
              <strong className="text-emerald-700 font-mono-data">{analytics.activeLawyers}</strong>
            </span>
            <span>
              {lang === 'ar' ? 'في إجازة:' : 'On Leave:'}{' '}
              <strong className="text-amber-700 font-mono-data">
                {analytics.totalLawyers - analytics.activeLawyers}
              </strong>
            </span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">
              {lang === 'ar' ? 'ملخصات «الصافي» والرسائل' : 'AI Intakes & Inquiries'}
            </span>
            <Sparkles className="w-4 h-4 text-[#C5A059]" aria-hidden="true" />
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-3xl font-bold text-[#0B132B] font-mono-data tabular-nums">
              {analytics.totalIntakes}
            </span>
            <span className="text-xs font-bold text-[#C5A059] font-mono-data">
              {analytics.intakeConversionRate}% {lang === 'ar' ? 'تحوّلت لقضايا' : 'converted'}
            </span>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
            <span>
              {lang === 'ar' ? 'عاجلة معلّقة:' : 'Urgent:'}{' '}
              <strong className="text-red-700 font-mono-data">{analytics.urgentIntakes}</strong>
            </span>
            <span className="flex items-center gap-1">
              <Mail className="w-3.5 h-3.5 text-slate-400" />
              <span>{lang === 'ar' ? 'رسائل:' : 'Messages:'}</span>
              <strong className="text-[#0B132B] font-mono-data">{analytics.totalInquiries}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Lawyer Workload Distribution Table & Visual Bars */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-[#0B132B]">
              {lang === 'ar'
                ? 'توزيع القضايا والمواعيد على فريق المحامين'
                : 'Attorney Workload & Case Allocation'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {lang === 'ar'
                ? 'مقارنة مباشرة لحجم القضايا النشطة والمواعيد لكل محامي مع إمكانية إعادة التوزيع الفوري.'
                : 'Live comparison of active cases and upcoming consultations per attorney with quick reassignment.'}
            </p>
          </div>
          {analytics.unassignedCasesCount > 0 && (
            <span className="text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg">
              {lang === 'ar'
                ? `${analytics.unassignedCasesCount} قضية بأسماء محامين خارج القائمة الحالية`
                : `${analytics.unassignedCasesCount} cases assigned outside current roster`}
            </span>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-start">
            <thead className="bg-[#F8FAFC] text-xs font-bold text-slate-500 border-b border-slate-200">
              <tr>
                <th className="py-3 px-4 text-start">{lang === 'ar' ? 'المحامي والدور' : 'Attorney & Role'}</th>
                <th className="py-3 px-4 text-start">{lang === 'ar' ? 'قضايا نشطة' : 'Active Cases'}</th>
                <th className="py-3 px-4 text-start">{lang === 'ar' ? 'قضايا مغلقة' : 'Closed'}</th>
                <th className="py-3 px-4 text-start">{lang === 'ar' ? 'مواعيد قادمة' : 'Upcoming'}</th>
                <th className="py-3 px-4 text-start min-w-[180px]">
                  {lang === 'ar' ? 'مؤشر ضغط العمل' : 'Workload Meter'}
                </th>
                <th className="py-3 px-4 text-start">{lang === 'ar' ? 'إجراء' : 'Action'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {analytics.lawyerWorkloads.map((row) => {
                const barWidth = Math.max(8, Math.round((row.totalWorkload / maxWorkload) * 100));
                const barColor =
                  row.capacityStatus === 'high'
                    ? 'bg-red-600'
                    : row.capacityStatus === 'balanced'
                      ? 'bg-[#C5A059]'
                      : 'bg-emerald-600';
                const capacityLabel =
                  row.capacityStatus === 'high'
                    ? lang === 'ar'
                      ? 'ضغط مرتفع'
                      : 'High Load'
                    : row.capacityStatus === 'balanced'
                      ? lang === 'ar'
                        ? 'متوازن'
                        : 'Balanced'
                      : lang === 'ar'
                        ? 'متاح لاستلام قضايا'
                        : 'Available';

                return (
                  <tr key={row.lawyerId} className="hover:bg-[#F8FAFC]/80">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-[#0B132B] flex items-center gap-2">
                        <span>{row.lawyerName}</span>
                        {row.status === 'on_leave' && (
                          <span className="text-[11px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                            {lang === 'ar' ? 'إجازة' : 'On Leave'}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500">
                        {LAWYER_ROLE_META[row.role].label[lang]}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono-data font-bold text-[#0B132B]">
                      {row.activeCases}
                    </td>
                    <td className="py-3.5 px-4 font-mono-data text-emerald-700 font-semibold">
                      {row.closedCases}
                    </td>
                    <td className="py-3.5 px-4 font-mono-data font-semibold text-slate-700">
                      {row.upcomingBookings}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-semibold text-slate-600">{capacityLabel}</span>
                          <span className="font-mono-data font-bold text-[#0B132B]">
                            {row.totalWorkload} {lang === 'ar' ? 'ملف' : 'items'}
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${barColor}`}
                            style={{ width: `${row.totalWorkload === 0 ? 4 : barWidth}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <button
                        type="button"
                        disabled={row.totalCases === 0 && row.upcomingBookings === 0}
                        onClick={() => onQuickTransferFromLawyer(row.lawyerName)}
                        className="min-h-[34px] px-3 py-1 rounded-lg border border-slate-300 hover:bg-[#0B132B] hover:text-white text-xs font-bold text-[#0B132B] flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                      >
                        <ArrowLeftRight className="w-3.5 h-3.5 text-[#C5A059]" />
                        <span>{lang === 'ar' ? 'نقل قضايا' : 'Transfer'}</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bottom 2-Column Deep Analytics: Case Stages Funnel + Specialty Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Case Pipeline Funnel */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-[#0B132B]">
              {lang === 'ar' ? 'توزيع القضايا حسب المرحلة القضائية' : 'Cases by Litigation Stage'}
            </h3>
            <span className="text-xs font-mono-data text-slate-500">
              {analytics.totalCases} {lang === 'ar' ? 'قضية' : 'cases'}
            </span>
          </div>

          <div className="space-y-3">
            {analytics.stageBreakdown.map((item) => (
              <div key={item.stage} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-[#0B132B]">{CASE_STAGE_LABELS[item.stage][lang]}</span>
                  <span className="font-mono-data text-slate-600">
                    {item.count} ({item.percentage}%)
                  </span>
                </div>
                <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      item.stage === 'closed' ? 'bg-emerald-600' : 'bg-[#0B132B]'
                    }`}
                    style={{ width: `${item.count > 0 ? Math.max(6, item.percentage) : 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Booking Status Mini Summary */}
          <div className="pt-4 border-t border-slate-200 space-y-2.5">
            <h4 className="text-xs font-bold text-slate-500">
              {lang === 'ar' ? 'حالة مواعيد الاستشارات' : 'Consultation Status Breakdown'}
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {analytics.bookingStatusBreakdown.map((st) => (
                <div
                  key={st.status}
                  className="rounded-xl bg-[#F8FAFC] border border-slate-200 p-2.5 text-center"
                >
                  <p className="text-[11px] font-semibold text-slate-500">
                    {BOOKING_STATUS_LABELS[st.status][lang]}
                  </p>
                  <p className="text-lg font-bold text-[#0B132B] font-mono-data">{st.count}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Practice Area Demand */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-[#0B132B]">
              {lang === 'ar' ? 'الطلب حسب التخصصات القانونية (7 مجالات)' : 'Demand Across 7 Legal Specialties'}
            </h3>
            <CheckCircle2 className="w-4 h-4 text-[#C5A059]" aria-hidden="true" />
          </div>

          <div className="space-y-3">
            {analytics.specialtyBreakdown.map((item) => {
              const spec = SPECIALTIES.find((s) => s.id === item.specialtyId);
              const widthPct = Math.round((item.totalVolume / maxSpecialtyVolume) * 100);
              return (
                <div key={item.specialtyId} className="space-y-1">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-bold text-[#0B132B] truncate">{spec?.title[lang]}</span>
                    <span className="font-mono-data text-slate-600 whitespace-nowrap">
                      {lang === 'ar'
                        ? `${item.casesCount} قضية · ${item.bookingsCount} موعد · ${item.intakesCount} صافي`
                        : `${item.casesCount}C · ${item.bookingsCount}B · ${item.intakesCount}AI`}
                    </span>
                  </div>
                  <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#C5A059]"
                      style={{ width: `${item.totalVolume > 0 ? Math.max(6, widthPct) : 0}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
