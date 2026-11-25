import type {
  BookingStatus,
  CaseStage,
  ConsultationBooking,
  IntakeSummary,
  Language,
  LegalCase,
  SpecialtyId,
} from '../types/legal.js';
import { SPECIALTIES } from '../data/firmContent.js';

/**
 * Full set of Google Drive & Google Sheets OAuth scopes configured for the app.
 * Must stay in sync with OAuth client configuration.
 */
export const WORKSPACE_SCOPES: readonly string[] = [
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/drive.activity',
  'https://www.googleapis.com/auth/drive.activity.readonly',
  'https://www.googleapis.com/auth/drive.appdata',
  'https://www.googleapis.com/auth/drive.apps.readonly',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.install',
  'https://www.googleapis.com/auth/drive.meet.readonly',
  'https://www.googleapis.com/auth/drive.metadata',
  'https://www.googleapis.com/auth/drive.metadata.readonly',
  'https://www.googleapis.com/auth/drive.photos.readonly',
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/drive.scripts',
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/spreadsheets.readonly',
];

export type DriveFileFilter = 'all' | 'folders' | 'spreadsheets' | 'documents';

export interface DriveQueryOptions {
  search?: string;
  filterType?: DriveFileFilter;
  folderId?: string | null;
}

export function escapeDriveQueryValue(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'").trim();
}

export function buildDriveSearchQuery(options: DriveQueryOptions = {}): string {
  const clauses: string[] = ['trashed = false'];

  if (options.folderId) {
    clauses.push(`'${escapeDriveQueryValue(options.folderId)}' in parents`);
  }

  if (options.filterType === 'folders') {
    clauses.push("mimeType = 'application/vnd.google-apps.folder'");
  } else if (options.filterType === 'spreadsheets') {
    clauses.push("mimeType = 'application/vnd.google-apps.spreadsheet'");
  } else if (options.filterType === 'documents') {
    clauses.push(
      "(mimeType = 'application/vnd.google-apps.document' or mimeType = 'application/pdf' or mimeType contains 'wordprocessingml')",
    );
  }

  const trimmedSearch = options.search?.trim();
  if (trimmedSearch) {
    clauses.push(`name contains '${escapeDriveQueryValue(trimmedSearch)}'`);
  }

  return clauses.join(' and ');
}

export function formatSheetRange(sheetTitle: string, cellRange = 'A1:K50'): string {
  const safeTitle = sheetTitle.replace(/'/g, "''").trim();
  if (!safeTitle) {
    return cellRange;
  }
  return `'${safeTitle}'!${cellRange}`;
}

export function formatDriveFileSize(bytesInput: string | number | undefined, lang: Language): string {
  if (bytesInput === undefined || bytesInput === null || bytesInput === '') {
    return lang === 'ar' ? 'ملف سحابي' : 'Cloud file';
  }
  const bytes = typeof bytesInput === 'string' ? Number(bytesInput) : bytesInput;
  if (!Number.isFinite(bytes) || bytes < 0) {
    return lang === 'ar' ? 'ملف سحابي' : 'Cloud file';
  }
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function classifyDriveMimeType(
  mimeType: string,
  lang: Language,
): { kind: 'folder' | 'spreadsheet' | 'doc' | 'pdf' | 'image' | 'other'; label: string } {
  if (mimeType === 'application/vnd.google-apps.folder') {
    return { kind: 'folder', label: lang === 'ar' ? 'مجلد' : 'Folder' };
  }
  if (mimeType === 'application/vnd.google-apps.spreadsheet') {
    return { kind: 'spreadsheet', label: lang === 'ar' ? 'جدول Google Sheets' : 'Google Sheet' };
  }
  if (mimeType === 'application/vnd.google-apps.document') {
    return { kind: 'doc', label: lang === 'ar' ? 'مستند Google Docs' : 'Google Doc' };
  }
  if (mimeType === 'application/pdf') {
    return { kind: 'pdf', label: 'PDF' };
  }
  if (mimeType.startsWith('image/')) {
    return { kind: 'image', label: lang === 'ar' ? 'صورة' : 'Image' };
  }
  return { kind: 'other', label: lang === 'ar' ? 'ملف' : 'File' };
}

function getSpecialtyName(id: SpecialtyId, lang: Language): string {
  const spec = SPECIALTIES.find((item) => item.id === id);
  return spec ? spec.title[lang] : id;
}

const BOOKING_STATUS_TEXT: Record<BookingStatus, Record<Language, string>> = {
  pending: { ar: 'قيد المراجعة', en: 'Pending' },
  confirmed: { ar: 'مؤكد', en: 'Confirmed' },
  completed: { ar: 'مكتمل', en: 'Completed' },
  cancelled: { ar: 'ملغي', en: 'Cancelled' },
};

const CASE_STAGE_TEXT: Record<CaseStage, Record<Language, string>> = {
  intake: { ar: 'استشارة جديدة', en: 'Initial Intake' },
  drafting: { ar: 'تجهيز لائحة الدعوى', en: 'Drafting Pleadings' },
  litigation: { ar: 'قيد المرافعة', en: 'In Litigation' },
  execution: { ar: 'مرحلة التنفيذ', en: 'Execution Dept' },
  closed: { ar: 'مغلقة / منتهية', en: 'Closed' },
};

export function buildCasesSheetRows(
  cases: LegalCase[],
  lang: Language,
  includeHeader = true,
): string[][] {
  const header =
    lang === 'ar'
      ? [
          'رقم القضية',
          'اسم الموكل',
          'رقم الهاتف',
          'التخصص القانوني',
          'المحكمة المختصة',
          'المحامي المسؤول',
          'المرحلة القضائية',
          'تاريخ الجلسة القادمة',
          'ملخص الوقائع',
        ]
      : [
          'Case Number',
          'Client Name',
          'Phone',
          'Specialty',
          'Court',
          'Lead Counsel',
          'Stage',
          'Next Hearing',
          'Summary',
        ];

  const dataRows = cases.map((item) => [
    item.caseNumber,
    item.clientName,
    item.clientPhone,
    getSpecialtyName(item.specialtyId, lang),
    item.courtName,
    item.assignedLawyer,
    CASE_STAGE_TEXT[item.stage]?.[lang] ?? item.stage,
    item.nextHearingDate,
    item.summary,
  ]);

  return includeHeader ? [header, ...dataRows] : dataRows;
}

export function buildBookingsSheetRows(
  bookings: ConsultationBooking[],
  lang: Language,
  includeHeader = true,
): string[][] {
  const header =
    lang === 'ar'
      ? [
          'المرجع',
          'اسم الموكل',
          'رقم الهاتف',
          'التخصص',
          'التاريخ',
          'الوقت',
          'النوع',
          'الحالة',
          'المحامي المسؤول',
          'توثيق SMS',
        ]
      : [
          'Reference',
          'Client Name',
          'Phone',
          'Specialty',
          'Date',
          'Time Slot',
          'Mode',
          'Status',
          'Assigned Lawyer',
          'SMS Verified',
        ];

  const dataRows = bookings.map((item) => [
    item.referenceCode,
    item.clientName,
    item.clientPhone,
    getSpecialtyName(item.specialtyId, lang),
    item.date,
    item.timeSlot,
    item.mode === 'in_person'
      ? lang === 'ar'
        ? 'حضوري (إربد)'
        : 'In-Person (Irbid)'
      : lang === 'ar'
        ? 'أونلاين'
        : 'Online',
    BOOKING_STATUS_TEXT[item.status]?.[lang] ?? item.status,
    item.assignedLawyer,
    item.otpVerified ? (lang === 'ar' ? 'موثّق' : 'Verified') : lang === 'ar' ? 'قيد التحقق' : 'Pending',
  ]);

  return includeHeader ? [header, ...dataRows] : dataRows;
}

export function buildIntakesSheetRows(
  intakes: IntakeSummary[],
  lang: Language,
  includeHeader = true,
): string[][] {
  const header =
    lang === 'ar'
      ? [
          'اسم الموكل',
          'رقم الهاتف',
          'التخصص',
          'درجة الاستعجال',
          'الوضع الموصى به',
          'حالة المستندات',
          'ملخص الصافي',
          'تاريخ التسجيل',
        ]
      : [
          'Client Name',
          'Phone',
          'Specialty',
          'Urgency',
          'Recommended Mode',
          'Documents Status',
          'Al-Safi Summary',
          'Created At',
        ];

  const dataRows = intakes.map((item) => [
    item.clientName,
    item.clientPhone,
    getSpecialtyName(item.specialtyId, lang),
    item.urgency === 'urgent'
      ? lang === 'ar'
        ? 'عاجل'
        : 'Urgent'
      : lang === 'ar'
        ? 'اعتيادي'
        : 'Normal',
    item.recommendedMode === 'in_person'
      ? lang === 'ar'
        ? 'حضوري'
        : 'In-Person'
      : lang === 'ar'
        ? 'أونلاين'
        : 'Online',
    item.documentsStatus,
    item.factsSummary,
    item.createdAt,
  ]);

  return includeHeader ? [header, ...dataRows] : dataRows;
}

export interface ParsedGoogleApiError {
  message: string;
  requiresReauth: boolean;
}

export function parseGoogleApiError(
  status: number,
  payload: unknown,
  lang: Language,
): ParsedGoogleApiError {
  const rawMessage =
    typeof payload === 'object' &&
    payload !== null &&
    'error' in payload &&
    typeof (payload as { error?: { message?: unknown } }).error?.message === 'string'
      ? (payload as { error: { message: string } }).error.message
      : '';

  if (status === 401) {
    return {
      requiresReauth: true,
      message:
        lang === 'ar'
          ? 'انتهت صلاحية جلسة Google. يرجى تسجيل الدخول مجدداً بحساب Google.'
          : 'Your Google session expired. Please sign in with Google again.',
    };
  }

  if (status === 403) {
    return {
      requiresReauth: rawMessage.toLowerCase().includes('insufficient'),
      message:
        lang === 'ar'
          ? 'تعذر الوصول بسبب الصلاحيات. تأكد من منح صلاحيات Google Drive و Sheets عند تسجيل الدخول.'
          : 'Permission denied. Please ensure Google Drive and Sheets permissions were granted.',
    };
  }

  if (status === 404) {
    return {
      requiresReauth: false,
      message:
        lang === 'ar'
          ? 'لم يتم العثور على الملف أو جدول البيانات المطلوب في Google Drive.'
          : 'The requested Google Drive file or spreadsheet could not be found.',
    };
  }

  if (status === 429) {
    return {
      requiresReauth: false,
      message:
        lang === 'ar'
          ? 'تم تجاوز حد الطلبات المؤقت لخدمات Google. يرجى المحاولة بعد قليل.'
          : 'Google API rate limit reached. Please retry in a moment.',
    };
  }

  return {
    requiresReauth: false,
    message:
      rawMessage ||
      (lang === 'ar'
        ? 'حدث خطأ أثناء الاتصال بخدمات Google Workspace. يرجى المحاولة مرة أخرى.'
        : 'An error occurred while communicating with Google Workspace. Please try again.'),
  };
}
