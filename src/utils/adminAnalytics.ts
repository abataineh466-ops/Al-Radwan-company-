import type {
  BookingStatus,
  CaseStage,
  ConsultationBooking,
  ContactInquiry,
  FirmLawyer,
  IntakeSummary,
  Language,
  LawyerRole,
  LegalCase,
  SpecialtyId,
} from '../types/legal.js';
import { SPECIALTIES } from '../data/firmContent.js';

export const VALID_LAWYER_ROLES: readonly LawyerRole[] = [
  'managing_partner',
  'partner',
  'senior_lawyer',
  'associate_lawyer',
  'legal_consultant',
  'trainee_lawyer',
] as const;

export const LAWYER_ROLE_META: Record<
  LawyerRole,
  {
    label: Record<Language, string>;
    permissions: Record<Language, string>;
    defaultCanManageRoles: boolean;
  }
> = {
  managing_partner: {
    label: { ar: 'المدير العام / شريك مؤسس', en: 'Managing Director / Founder' },
    permissions: {
      ar: 'صلاحيات كاملة: إدارة المحامين، توزيع الأدوار، ونقل القضايا',
      en: 'Full Admin: Manage team, assign roles & transfer cases',
    },
    defaultCanManageRoles: true,
  },
  partner: {
    label: { ar: 'شريك قانوني', en: 'Legal Partner' },
    permissions: {
      ar: 'إشراف مباشر على القضايا وإعادة توزيع الملفات',
      en: 'Case oversight & file reassignment',
    },
    defaultCanManageRoles: true,
  },
  senior_lawyer: {
    label: { ar: 'محامي رئيسي', en: 'Senior Attorney' },
    permissions: {
      ar: 'إدارة ملفات القضايا، الجلسات، والاستشارات المتخصصة',
      en: 'Lead litigation, hearings & specialist consultations',
    },
    defaultCanManageRoles: false,
  },
  associate_lawyer: {
    label: { ar: 'محامي مشارك', en: 'Associate Attorney' },
    permissions: {
      ar: 'متابعة القضايا المسندة وإعداد اللوائح والمذكرات',
      en: 'Assigned case handling & pleading drafting',
    },
    defaultCanManageRoles: false,
  },
  legal_consultant: {
    label: { ar: 'مستشار قانوني', en: 'Legal Consultant' },
    permissions: {
      ar: 'الاستشارات القانونية، صياغة العقود، والتحكيم',
      en: 'Legal advice, contract drafting & arbitration',
    },
    defaultCanManageRoles: false,
  },
  trainee_lawyer: {
    label: { ar: 'محامي متدرب', en: 'Trainee Lawyer' },
    permissions: {
      ar: 'مساندة بحثية ومتابعة الإجراءات تحت إشراف الشركاء',
      en: 'Research support & supervised procedural follow-up',
    },
    defaultCanManageRoles: false,
  },
};

export interface StageDistributionItem {
  stage: CaseStage;
  count: number;
  percentage: number;
}

export interface SpecialtyAnalyticsItem {
  specialtyId: SpecialtyId;
  casesCount: number;
  bookingsCount: number;
  intakesCount: number;
  totalVolume: number;
}

export interface LawyerWorkloadItem {
  lawyerId: string;
  lawyerName: string;
  role: LawyerRole;
  status: 'active' | 'on_leave';
  activeCases: number;
  closedCases: number;
  totalCases: number;
  upcomingBookings: number;
  completedBookings: number;
  totalWorkload: number;
  capacityStatus: 'available' | 'balanced' | 'high';
}

export interface AdminFirmAnalytics {
  totalCases: number;
  activeCases: number;
  closedCases: number;
  caseClosureRate: number;
  totalBookings: number;
  upcomingBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  bookingCompletionRate: number;
  inPersonBookings: number;
  onlineBookings: number;
  totalIntakes: number;
  convertedIntakes: number;
  pendingIntakes: number;
  urgentIntakes: number;
  intakeConversionRate: number;
  totalInquiries: number;
  totalLawyers: number;
  activeLawyers: number;
  avgActiveCasesPerLawyer: number;
  stageBreakdown: StageDistributionItem[];
  bookingStatusBreakdown: Array<{ status: BookingStatus; count: number; percentage: number }>;
  specialtyBreakdown: SpecialtyAnalyticsItem[];
  lawyerWorkloads: LawyerWorkloadItem[];
  unassignedCasesCount: number;
}

function pct(part: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((part / total) * 100);
}

export function normalizeLawyerRole(value: unknown): LawyerRole {
  if (typeof value === 'string' && VALID_LAWYER_ROLES.includes(value as LawyerRole)) {
    return value as LawyerRole;
  }
  return 'associate_lawyer';
}

export function computeAdminFirmAnalytics(params: {
  bookings: ConsultationBooking[];
  cases: LegalCase[];
  intakes: IntakeSummary[];
  inquiries: ContactInquiry[];
  lawyers: FirmLawyer[];
}): AdminFirmAnalytics {
  const { bookings, cases, intakes, inquiries, lawyers } = params;

  const totalCases = cases.length;
  const closedCases = cases.filter((c) => c.stage === 'closed').length;
  const activeCases = totalCases - closedCases;

  const totalBookings = bookings.length;
  const upcomingBookings = bookings.filter(
    (b) => b.status === 'pending' || b.status === 'confirmed'
  ).length;
  const completedBookings = bookings.filter((b) => b.status === 'completed').length;
  const cancelledBookings = bookings.filter((b) => b.status === 'cancelled').length;
  const inPersonBookings = bookings.filter((b) => b.mode === 'in_person').length;
  const onlineBookings = totalBookings - inPersonBookings;

  const totalIntakes = intakes.length;
  const convertedIntakes = intakes.filter((i) => Boolean(i.convertedToCaseId)).length;
  const pendingIntakes = totalIntakes - convertedIntakes;
  const urgentIntakes = intakes.filter((i) => i.urgency === 'urgent' && !i.convertedToCaseId).length;

  const totalLawyers = lawyers.length;
  const activeLawyers = lawyers.filter((l) => l.status === 'active').length;
  const avgActiveCasesPerLawyer =
    activeLawyers > 0 ? Number((activeCases / activeLawyers).toFixed(1)) : 0;

  const stagesOrder: CaseStage[] = ['intake', 'drafting', 'litigation', 'execution', 'closed'];
  const stageBreakdown: StageDistributionItem[] = stagesOrder.map((stage) => {
    const count = cases.filter((c) => c.stage === stage).length;
    return {
      stage,
      count,
      percentage: pct(count, totalCases),
    };
  });

  const bookingStatuses: BookingStatus[] = ['confirmed', 'pending', 'completed', 'cancelled'];
  const bookingStatusBreakdown = bookingStatuses.map((status) => {
    const count = bookings.filter((b) => b.status === status).length;
    return {
      status,
      count,
      percentage: pct(count, totalBookings),
    };
  });

  const specialtyBreakdown: SpecialtyAnalyticsItem[] = SPECIALTIES.map((spec) => {
    const casesCount = cases.filter((c) => c.specialtyId === spec.id).length;
    const bookingsCount = bookings.filter((b) => b.specialtyId === spec.id).length;
    const intakesCount = intakes.filter((i) => i.specialtyId === spec.id).length;
    return {
      specialtyId: spec.id,
      casesCount,
      bookingsCount,
      intakesCount,
      totalVolume: casesCount + bookingsCount + intakesCount,
    };
  }).sort((a, b) => b.totalVolume - a.totalVolume);

  const knownLawyerNames = new Set(lawyers.map((l) => l.name.trim()));
  const unassignedCasesCount = cases.filter(
    (c) => !c.assignedLawyer || !knownLawyerNames.has(c.assignedLawyer.trim())
  ).length;

  const lawyerWorkloads: LawyerWorkloadItem[] = lawyers
    .map((lawyer) => {
      const targetName = lawyer.name.trim();
      const lawyerCases = cases.filter((c) => c.assignedLawyer.trim() === targetName);
      const lawyerActiveCases = lawyerCases.filter((c) => c.stage !== 'closed').length;
      const lawyerClosedCases = lawyerCases.length - lawyerActiveCases;

      const lawyerBookings = bookings.filter((b) => b.assignedLawyer.trim() === targetName);
      const lawyerUpcomingBookings = lawyerBookings.filter(
        (b) => b.status === 'pending' || b.status === 'confirmed'
      ).length;
      const lawyerCompletedBookings = lawyerBookings.filter((b) => b.status === 'completed').length;

      const totalWorkload = lawyerActiveCases + lawyerUpcomingBookings;
      const capacityStatus: 'available' | 'balanced' | 'high' =
        totalWorkload >= 4 ? 'high' : totalWorkload >= 2 ? 'balanced' : 'available';

      return {
        lawyerId: lawyer.id,
        lawyerName: lawyer.name,
        role: lawyer.role,
        status: lawyer.status,
        activeCases: lawyerActiveCases,
        closedCases: lawyerClosedCases,
        totalCases: lawyerCases.length,
        upcomingBookings: lawyerUpcomingBookings,
        completedBookings: lawyerCompletedBookings,
        totalWorkload,
        capacityStatus,
      };
    })
    .sort((a, b) => b.totalWorkload - a.totalWorkload);

  return {
    totalCases,
    activeCases,
    closedCases,
    caseClosureRate: pct(closedCases, totalCases),
    totalBookings,
    upcomingBookings,
    completedBookings,
    cancelledBookings,
    bookingCompletionRate: pct(completedBookings, totalBookings),
    inPersonBookings,
    onlineBookings,
    totalIntakes,
    convertedIntakes,
    pendingIntakes,
    urgentIntakes,
    intakeConversionRate: pct(convertedIntakes, totalIntakes),
    totalInquiries: inquiries.length,
    totalLawyers,
    activeLawyers,
    avgActiveCasesPerLawyer,
    stageBreakdown,
    bookingStatusBreakdown,
    specialtyBreakdown,
    lawyerWorkloads,
    unassignedCasesCount,
  };
}

export function pickRecommendedLawyerForSpecialty(
  specialtyId: SpecialtyId,
  lawyers: FirmLawyer[],
  fallbackName = 'المحامي رضوان علي البطاينة'
): string {
  const active = lawyers.filter((l) => l.status === 'active');
  const pool = active.length > 0 ? active : lawyers;
  const specialist = pool.find((l) => l.specialties.includes(specialtyId));
  if (specialist) return specialist.name;
  const director = pool.find((l) => l.role === 'managing_partner');
  if (director) return director.name;
  return pool[0]?.name ?? fallbackName;
}
