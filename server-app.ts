import express, { type Express } from 'express';
import fs from 'fs';
import path from 'path';
import type {
  AuditLogEntry,
  BookingStatus,
  BranchId,
  CaseAttachment,
  CaseHearing,
  CaseStage,
  CaseTask,
  ClientProfile,
  ConsultationBooking,
  ContactInquiry,
  FirmLawyer,
  FirmPublication,
  IntakeSummary,
  LawyerStatus,
  LegalCase,
  LegalDocumentRecord,
  LegalDocumentType,
  PublicationCategory,
  SpecialtyId,
} from '../src/types/legal.js';
import {
  buildTelegramSendMessagePayload,
  getConsultationFee,
  isValidJordanianPhone,
  isValidTelegramBotToken,
  isValidTelegramChatId,
  normalizeSpecialtyId,
  sanitizeJordanianPhone,
  VALID_SPECIALTY_IDS,
} from '../src/utils/legalWorkflow.js';
import {
  LAWYER_ROLE_META,
  normalizeLawyerRole,
  pickRecommendedLawyerForSpecialty,
} from '../src/utils/adminAnalytics.js';
import { DEFAULT_PUBLICATIONS } from '../src/data/firmContent.js';
import {
  buildSessionUserFromPayload,
  canUserAccessLawyerRecord,
  createAuthMiddleware,
  createSessionToken,
  decryptSensitiveText,
  encryptSensitiveText,
  extractBearerOrCookieToken,
  getDefaultAuthAccounts,
  requireManageRoles,
  verifyPassword,
  verifySessionToken,
  type AuthenticatedRequest,
  type StoredAuthAccount,
} from './security.js';
import {
  buildOfficialLetterheadDocxBuffer,
  buildOfficialLetterheadPdfBuffer,
  buildOfficialLetterheadPrintHtml,
} from './letterheadEngine.js';
import { runRbAiLegalAssistant } from './rbAiAssistant.js';
import { searchJordanianLegalReferences } from './jordanianLawIndex.js';

export interface FirmDatabase {
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
  accounts: StoredAuthAccount[];
}

function resolveDataDir(): string {
  if (process.env.VERCEL === '1' || process.env.VERCEL === 'true') {
    return path.join('/tmp', 'al-radwan-law-data');
  }
  return path.resolve(process.cwd(), '.data');
}

const DATA_DIR = resolveDataDir();
const DB_FILE = path.join(DATA_DIR, 'firm-db.json');

let memoryDbCache: FirmDatabase | null = null;

export function getDefaultLawyers(): FirmLawyer[] {
  return [
    {
      id: 'law-radwan',
      name: 'المحامي رضوان علي بطاينة',
      nameEn: 'Attorney Radwan Ali Bataineh',
      phone: '0796251902',
      email: 'radwan@alradwan-law.jo',
      role: 'managing_partner',
      specialties: ['civil', 'administrative', 'arbitration'],
      status: 'active',
      canManageRoles: true,
      joinedAt: '2020-01-15',
    },
    {
      id: 'law-ahmad',
      name: 'المحامي أحمد سليم الخولي',
      nameEn: 'Attorney Ahmad Saleem Al-Khouli',
      phone: '0796251902',
      email: 'ahmad@alradwan-law.jo',
      role: 'senior_lawyer',
      specialties: ['criminal', 'labor'],
      status: 'active',
      canManageRoles: false,
      joinedAt: '2021-03-10',
    },
    {
      id: 'law-najwa',
      name: 'المحامية نجوى الشطناوي',
      nameEn: 'Attorney Najwa Al-Shatnawi',
      phone: '0796251902',
      email: 'najwa@alradwan-law.jo',
      role: 'senior_lawyer',
      specialties: ['sharia'],
      status: 'active',
      canManageRoles: false,
      joinedAt: '2022-06-01',
    },
    {
      id: 'law-layali',
      name: 'المحامية ليالي خريسات',
      nameEn: 'Attorney Layali Khreisat',
      phone: '0796251902',
      email: 'layali@alradwan-law.jo',
      role: 'senior_lawyer',
      specialties: ['commercial', 'civil'],
      status: 'active',
      canManageRoles: false,
      joinedAt: '2023-02-20',
    },
    {
      id: 'law-ghufran',
      name: 'المحامية غفران الخطيب',
      nameEn: 'Attorney Ghufran Al-Khatib',
      phone: '0796251902',
      email: 'ghufran@alradwan-law.jo',
      role: 'associate_lawyer',
      specialties: ['civil', 'commercial'],
      status: 'active',
      canManageRoles: false,
      joinedAt: '2024-09-01',
    },
  ];
}

export function getSeedDatabase(): FirmDatabase {
  return {
    bookings: [
      {
        id: 'bk-101',
        referenceCode: 'RB-26101',
        clientName: 'خالد محمد المومني',
        clientPhone: '0795412890',
        specialtyId: 'civil',
        branch: 'irbid',
        mode: 'in_person',
        date: '2026-11-18',
        timeSlot: '11:00',
        feeJod: 0,
        paymentMethod: 'free',
        paymentReference: 'FREE',
        otpVerified: false,
        caseSummary: 'شيكات مرتجعة بقيمة 14,500 دينار مع ورقة اعتراض صادرة عن البنك.',
        status: 'confirmed',
        assignedLawyer: 'المحامي رضوان علي بطاينة',
        createdAt: '2026-11-17T08:15:00.000Z',
      },
      {
        id: 'bk-102',
        referenceCode: 'RB-26102',
        clientName: 'هيا عبدالكريم البطاينة',
        clientPhone: '0786123409',
        specialtyId: 'sharia',
        branch: 'online',
        mode: 'online',
        date: '2026-11-18',
        timeSlot: '14:30',
        feeJod: 0,
        paymentMethod: 'free',
        paymentReference: 'FREE',
        otpVerified: false,
        caseSummary: 'استشارة حول دعوى نفقة وحضانة وتعديل مشاهدة أطفال.',
        status: 'pending',
        assignedLawyer: 'المحامية نجوى الشطناوي',
        createdAt: '2026-11-17T09:10:00.000Z',
      },
      {
        id: 'bk-103',
        referenceCode: 'RB-26103',
        clientName: 'Firas Al-Tal',
        clientPhone: '0778903321',
        specialtyId: 'commercial',
        branch: 'amman',
        mode: 'in_person',
        date: '2026-11-19',
        timeSlot: '10:00',
        feeJod: 0,
        paymentMethod: 'free',
        paymentReference: 'FREE',
        otpVerified: false,
        caseSummary: 'Company formation (LLC) and shareholder partnership agreement review.',
        status: 'completed',
        assignedLawyer: 'المحامية ليالي خريسات',
        createdAt: '2026-11-16T16:40:00.000Z',
      },
    ],
    cases: [
      {
        id: 'cs-201',
        caseNumber: 'IRB-CIV-2026/418',
        clientId: 'cl-101',
        clientName: 'م. عمر الخطيب',
        clientPhone: '0791124455',
        specialtyId: 'civil',
        courtName: 'محكمة بداية حقوق إربد',
        assignedLawyer: 'المحامي رضوان علي بطاينة',
        stage: 'litigation',
        nextHearingDate: '2026-11-24',
        summary: 'مطالبة مالية وعقد مقاولة إنشائية مع طلب حجز تحفظي.',
        updatedAt: '2026-11-16T12:00:00.000Z',
      },
      {
        id: 'cs-202',
        caseNumber: 'IRB-SHR-2026/192',
        clientId: 'cl-102',
        clientName: 'رنا بني هاني',
        clientPhone: '0784409988',
        specialtyId: 'sharia',
        courtName: 'محكمة إربد الشرعية',
        assignedLawyer: 'المحامية نجوى الشطناوي',
        stage: 'execution',
        nextHearingDate: '2026-11-26',
        summary: 'تنفيذ حكم نفقة زوجية ونفقة صغار لدى دائرة التنفيذ الشرعي.',
        updatedAt: '2026-11-15T14:20:00.000Z',
      },
      {
        id: 'cs-203',
        caseNumber: 'IRB-CYB-2026/087',
        clientId: 'cl-103',
        clientName: 'طارق النعيمي',
        clientPhone: '0772298811',
        specialtyId: 'criminal',
        courtName: 'محكمة صلح جزاء إربد',
        assignedLawyer: 'المحامي أحمد سليم الخولي',
        stage: 'drafting',
        nextHearingDate: '2026-11-22',
        summary: 'قضية جرائم إلكترونية وذم وقدح عبر منصات التواصل الاجتماعي.',
        updatedAt: '2026-11-17T07:50:00.000Z',
      },
    ],
    intakes: [
      {
        id: 'in-301',
        clientName: 'يزن الشريدة',
        clientPhone: '0798834120',
        specialtyId: 'labor',
        factsSummary:
          'فصل تعسفي من شركة لوجستية في إربد بعد 4 سنوات خدمة دون إنذار أو صرف بدل الإجازات.',
        documentsStatus: 'عقد العمل وكشف الضمان الاجتماعي متوفران',
        urgency: 'urgent',
        recommendedMode: 'in_person',
        createdAt: '2026-11-17T09:45:00.000Z',
      },
    ],
    inquiries: [],
    lawyers: getDefaultLawyers(),
    clients: [
      {
        id: 'cl-101',
        fullName: 'م. عمر الخطيب',
        phone: '0791124455',
        address: 'إربد — الحي الشرقي',
        notes: 'ملف مقاولة إنشائية ومطالبة مالية',
        assignedLawyer: 'المحامي رضوان علي بطاينة',
        createdAt: '2026-11-10T09:00:00.000Z',
        updatedAt: '2026-11-16T12:00:00.000Z',
      },
      {
        id: 'cl-102',
        fullName: 'رنا بني هاني',
        phone: '0784409988',
        address: 'إربد',
        assignedLawyer: 'المحامية نجوى الشطناوي',
        createdAt: '2026-11-11T09:00:00.000Z',
        updatedAt: '2026-11-15T14:20:00.000Z',
      },
      {
        id: 'cl-103',
        fullName: 'طارق النعيمي',
        phone: '0772298811',
        address: 'عمّان',
        assignedLawyer: 'المحامي أحمد سليم الخولي',
        createdAt: '2026-11-12T09:00:00.000Z',
        updatedAt: '2026-11-17T07:50:00.000Z',
      },
    ],
    hearings: [
      {
        id: 'hr-101',
        caseId: 'cs-201',
        date: '2026-11-24',
        time: '09:30',
        courtName: 'محكمة بداية حقوق إربد',
        title: 'جلسة تقديم البينات الخطية وطلب الحجز التحفظي',
        status: 'scheduled',
        createdBy: 'المحامي رضوان علي بطاينة',
        createdAt: '2026-11-16T12:00:00.000Z',
      },
    ],
    tasks: [
      {
        id: 'tsk-101',
        caseId: 'cs-201',
        title: 'مراجعة حافظة المستندات وتجهيز مذكرة الرد على اللائحة الجوابية',
        dueDate: '2026-11-22',
        assignedLawyer: 'المحامي رضوان علي بطاينة',
        priority: 'high',
        status: 'in_progress',
        createdBy: 'المحامي رضوان علي بطاينة',
        createdAt: '2026-11-16T12:30:00.000Z',
      },
    ],
    attachments: [],
    documents: [],
    publications: DEFAULT_PUBLICATIONS,
    auditLogs: [],
    accounts: getDefaultAuthAccounts(),
  };
}

function decryptDb(raw: FirmDatabase): FirmDatabase {
  return {
    ...raw,
    clients: raw.clients.map((c) => ({
      ...c,
      phone: decryptSensitiveText(c.phone),
      nationalId: c.nationalId ? decryptSensitiveText(c.nationalId) : undefined,
      notes: c.notes ? decryptSensitiveText(c.notes) : undefined,
    })),
    cases: raw.cases.map((c) => ({
      ...c,
      clientPhone: decryptSensitiveText(c.clientPhone),
      summary: decryptSensitiveText(c.summary),
    })),
    bookings: raw.bookings.map((b) => ({
      ...b,
      clientPhone: decryptSensitiveText(b.clientPhone),
      caseSummary: b.caseSummary ? decryptSensitiveText(b.caseSummary) : undefined,
    })),
    documents: raw.documents.map((d) => ({
      ...d,
      bodyText: decryptSensitiveText(d.bodyText),
      versions: (d.versions ?? []).map((v) => ({
        ...v,
        content: decryptSensitiveText(v.content),
      })),
    })),
  };
}

function encryptDbForDisk(db: FirmDatabase): FirmDatabase {
  return {
    ...db,
    clients: db.clients.map((c) => ({
      ...c,
      phone: encryptSensitiveText(c.phone),
      nationalId: c.nationalId ? encryptSensitiveText(c.nationalId) : undefined,
      notes: c.notes ? encryptSensitiveText(c.notes) : undefined,
    })),
    cases: db.cases.map((c) => ({
      ...c,
      clientPhone: encryptSensitiveText(c.clientPhone),
      summary: encryptSensitiveText(c.summary),
    })),
    bookings: db.bookings.map((b) => ({
      ...b,
      clientPhone: encryptSensitiveText(b.clientPhone),
      caseSummary: b.caseSummary ? encryptSensitiveText(b.caseSummary) : undefined,
    })),
    documents: db.documents.map((d) => ({
      ...d,
      bodyText: encryptSensitiveText(d.bodyText),
      versions: (d.versions ?? []).map((v) => ({
        ...v,
        content: encryptSensitiveText(v.content),
      })),
    })),
  };
}

function persistDbSafe(db: FirmDatabase): void {
  memoryDbCache = db;
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const encrypted = encryptDbForDisk(db);
    fs.writeFileSync(DB_FILE, JSON.stringify(encrypted, null, 2), 'utf8');
  } catch {
    // Graceful fallback to in-memory cache
  }
}

function migrateExistingDb(parsed: Partial<FirmDatabase>): { db: FirmDatabase; migrated: boolean } {
  let migrated = false;
  const seed = getSeedDatabase();

  const lawyers: FirmLawyer[] =
    Array.isArray(parsed.lawyers) && parsed.lawyers.length > 0 ? [...parsed.lawyers] : seed.lawyers;

  // Ensure Ahmad Al-Khouli is regular team lawyer (remove partner role if present from v1)
  const ahmad = lawyers.find((l) => l.id === 'law-ahmad');
  if (ahmad && (ahmad.role === 'partner' || ahmad.canManageRoles)) {
    ahmad.role = 'senior_lawyer';
    ahmad.canManageRoles = false;
    migrated = true;
  }

  // Ensure Ghufran Al-Khatib is present
  if (!lawyers.some((l) => l.id === 'law-ghufran' || l.name.includes('غفران الخطيب'))) {
    const ghufran = getDefaultLawyers().find((l) => l.id === 'law-ghufran');
    if (ghufran) {
      lawyers.push(ghufran);
      migrated = true;
    }
  }

  // Ensure all accounts exist
  const accounts = Array.isArray(parsed.accounts) && parsed.accounts.length > 0
    ? [...parsed.accounts]
    : getDefaultAuthAccounts();
  for (const defAcc of getDefaultAuthAccounts()) {
    if (!accounts.some((a) => a.username === defAcc.username)) {
      accounts.push(defAcc);
      migrated = true;
    }
  }

  const normalized: FirmDatabase = {
    bookings: Array.isArray(parsed.bookings) ? parsed.bookings : seed.bookings,
    cases: Array.isArray(parsed.cases) ? parsed.cases : seed.cases,
    intakes: Array.isArray(parsed.intakes) ? parsed.intakes : seed.intakes,
    inquiries: Array.isArray(parsed.inquiries) ? parsed.inquiries : [],
    lawyers,
    clients: Array.isArray(parsed.clients) ? parsed.clients : seed.clients,
    hearings: Array.isArray(parsed.hearings) ? parsed.hearings : seed.hearings,
    tasks: Array.isArray(parsed.tasks) ? parsed.tasks : seed.tasks,
    attachments: Array.isArray(parsed.attachments) ? parsed.attachments : [],
    documents: Array.isArray(parsed.documents) ? parsed.documents : [],
    publications:
      Array.isArray(parsed.publications) && parsed.publications.length > 0
        ? parsed.publications
        : seed.publications,
    auditLogs: Array.isArray(parsed.auditLogs) ? parsed.auditLogs : [],
    accounts,
  };

  if (
    !Array.isArray(parsed.clients) ||
    !Array.isArray(parsed.documents) ||
    !Array.isArray(parsed.publications) ||
    !Array.isArray(parsed.auditLogs) ||
    !Array.isArray(parsed.accounts)
  ) {
    migrated = true;
  }

  return { db: decryptDb(normalized), migrated };
}

function readDb(): FirmDatabase {
  if (memoryDbCache) {
    return memoryDbCache;
  }
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf8');
      const parsed = JSON.parse(raw) as Partial<FirmDatabase>;
      const { db, migrated } = migrateExistingDb(parsed);
      memoryDbCache = db;
      if (migrated) {
        persistDbSafe(db);
      }
      return db;
    }
  } catch {
    // Fall back to seed
  }

  const seed = getSeedDatabase();
  persistDbSafe(seed);
  return seed;
}

function writeDb(db: FirmDatabase): void {
  persistDbSafe(db);
}

function pushAudit(
  db: FirmDatabase,
  actorName: string,
  actorRole: string,
  action: string,
  entityType: string,
  entityId: string,
  summary: string
): void {
  const entry: AuditLogEntry = {
    id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    actorName,
    actorRole,
    action,
    entityType,
    entityId,
    summary,
    timestamp: new Date().toISOString(),
  };
  db.auditLogs.unshift(entry);
  if (db.auditLogs.length > 1000) {
    db.auditLogs = db.auditLogs.slice(0, 1000);
  }
}

function getLawyerForSpecialty(specialtyId: SpecialtyId, lawyers?: FirmLawyer[]): string {
  if (lawyers && lawyers.length > 0) {
    return pickRecommendedLawyerForSpecialty(specialtyId, lawyers, 'المحامي رضوان علي بطاينة');
  }
  switch (specialtyId) {
    case 'sharia':
      return 'المحامية نجوى الشطناوي';
    case 'commercial':
      return 'المحامية ليالي خريسات';
    case 'criminal':
    case 'labor':
      return 'المحامي أحمد سليم الخولي';
    default:
      return 'المحامي رضوان علي بطاينة';
  }
}

function getCourtForSpecialty(specialtyId: SpecialtyId): string {
  switch (specialtyId) {
    case 'sharia':
      return 'محكمة إربد الشرعية';
    case 'criminal':
      return 'محكمة صلح / بداية جزاء إربد';
    case 'labor':
      return 'محكمة صلح حقوق إربد (قضايا عمالية)';
    case 'administrative':
      return 'المحكمة الإدارية / دائرة التنفيذ';
    case 'arbitration':
      return 'هيئة التحكيم والوساطة';
    default:
      return 'محكمة بداية حقوق إربد';
  }
}

export function cleanEnvValue(raw: string | undefined): string {
  if (!raw) return '';
  return raw.trim().replace(/^(['"])(.*)\1$/, '$2').trim();
}

export function normalizeTelegramToken(raw: string | undefined): string {
  const cleaned = cleanEnvValue(raw);
  return cleaned.startsWith('bot') && /^\d+:/.test(cleaned.slice(3))
    ? cleaned.slice(3)
    : cleaned;
}

async function forwardInquiryToTelegram(inquiry: ContactInquiry): Promise<{
  configured: boolean;
  delivered: boolean;
}> {
  const botToken = normalizeTelegramToken(process.env.TELEGRAM_BOT_TOKEN);
  const chatId = cleanEnvValue(process.env.TELEGRAM_CHAT_ID);

  if (!isValidTelegramBotToken(botToken) || !isValidTelegramChatId(chatId)) {
    return { configured: false, delivered: false };
  }

  const payload = buildTelegramSendMessagePayload(chatId, {
    name: inquiry.name,
    phone: inquiry.phone,
    specialtyId: inquiry.specialtyId,
    message: inquiry.message,
  });

  try {
    const telegramResponse = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(7000),
    });

    if (!telegramResponse.ok) {
      return { configured: true, delivered: false };
    }

    const result = (await telegramResponse.json()) as { ok?: boolean };
    return { configured: true, delivered: Boolean(result.ok) };
  } catch {
    return { configured: true, delivered: false };
  }
}

export function normalizeVercelApiUrl(rawUrl: string): string {
  if (!rawUrl || !rawUrl.includes('__path=')) {
    return rawUrl;
  }

  try {
    const parsed = new URL(rawUrl, 'http://localhost');
    const forwardedPath = parsed.searchParams.get('__path');
    parsed.searchParams.delete('__path');
    const remainingQuery = parsed.searchParams.toString();
    const suffix = remainingQuery ? `?${remainingQuery}` : '';

    if (forwardedPath !== null && /^\/api\/index\/?$/.test(parsed.pathname)) {
      const cleanSubpath = forwardedPath.replace(/^\/+/, '');
      return `/api/${cleanSubpath}${suffix}`;
    }

    return `${parsed.pathname}${suffix}`;
  } catch {
    return rawUrl;
  }
}

export function isAllowedCorsOrigin(
  origin: string | undefined,
  extraAllowedOrigins = process.env.ALLOWED_ORIGINS ?? ''
): boolean {
  if (!origin) return false;

  try {
    const { hostname, protocol } = new URL(origin);
    if (protocol !== 'https:' && protocol !== 'http:') return false;

    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname.endsWith('.vercel.app') ||
      hostname.endsWith('.run.app')
    ) {
      return true;
    }

    const customOrigins = extraAllowedOrigins
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
    return customOrigins.includes(origin);
  } catch {
    return false;
  }
}

export function createApiApp(): Express {
  const app = express();
  const requireAuth = createAuthMiddleware(() => readDb().lawyers);

  app.use((req, _res, next) => {
    const normalized = normalizeVercelApiUrl(req.url);
    if (normalized !== req.url) {
      req.url = normalized;
    }
    next();
  });

  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin && isAllowedCorsOrigin(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Vary', 'Origin');
      res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    }
    if (req.method === 'OPTIONS') {
      return res.status(204).end();
    }
    return next();
  });

  app.use(express.json({ limit: '5mb' }));

  // Public Health Check
  app.get('/api/health', (_req, res) => {
    const apiKey = cleanEnvValue(process.env.GEMINI_API_KEY);
    const botToken = normalizeTelegramToken(process.env.TELEGRAM_BOT_TOKEN);
    const chatId = cleanEnvValue(process.env.TELEGRAM_CHAT_ID);
    res.json({
      ok: true,
      service: 'rb-legal-platform',
      runtime: process.env.VERCEL ? 'vercel-serverless' : 'node-server',
      geminiConfigured: Boolean(apiKey && apiKey !== 'MY_GEMINI_API_KEY'),
      telegramConfigured: isValidTelegramBotToken(botToken) && isValidTelegramChatId(chatId),
    });
  });

  // Public Published Articles, Legal Analyses & Media
  app.get('/api/publications', (_req, res) => {
    const db = readDb();
    const published = db.publications
      .filter((p) => p.status === 'published')
      .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
    return res.json({ publications: published });
  });

  // Public Booking Creation (Simplified — No OTP, No QR, Pending Firm Confirmation)
  app.post('/api/bookings', (req, res) => {
    const {
      clientName,
      clientPhone,
      specialtyId,
      branch,
      mode,
      date,
      timeSlot,
      caseSummary,
    } = req.body ?? {};

    if (!clientName || typeof clientName !== 'string' || clientName.trim().length < 3) {
      return res.status(400).json({ error: 'Invalid client name' });
    }
    const cleanPhone = sanitizeJordanianPhone(String(clientPhone ?? ''));
    if (!isValidJordanianPhone(cleanPhone)) {
      return res.status(400).json({ error: 'Invalid Jordanian mobile phone (07XXXXXXXX)' });
    }
    if (!date || !timeSlot) {
      return res.status(400).json({ error: 'Missing date or time slot' });
    }

    const validBranch: BranchId =
      branch === 'amman' || branch === 'online' ? branch : 'irbid';
    const consultationMode =
      validBranch === 'online' || mode === 'online' ? 'online' : 'in_person';
    const validSpec = normalizeSpecialtyId(specialtyId);
    const db = readDb();

    const newBooking: ConsultationBooking = {
      id: `bk-${Date.now()}`,
      referenceCode: `RB-${String(Math.floor(10000 + Math.random() * 89999))}`,
      clientName: clientName.trim(),
      clientPhone: cleanPhone,
      specialtyId: validSpec,
      branch: validBranch,
      mode: consultationMode,
      date: String(date),
      timeSlot: String(timeSlot),
      feeJod: getConsultationFee(consultationMode),
      paymentMethod: 'free',
      paymentReference: 'OFFICE-CONFIRM',
      otpVerified: false,
      caseSummary: caseSummary ? String(caseSummary).trim().slice(0, 2000) : undefined,
      status: 'pending',
      assignedLawyer: getLawyerForSpecialty(validSpec, db.lawyers),
      createdAt: new Date().toISOString(),
    };

    db.bookings.unshift(newBooking);
    pushAudit(
      db,
      'موقع الشركة (عميل)',
      'public',
      'BOOKING_REQUESTED',
      'booking',
      newBooking.id,
      `طلب موعد جديد (${newBooking.referenceCode}) باسم ${newBooking.clientName}`
    );
    writeDb(db);
    return res.status(201).json({ booking: newBooking });
  });

  // Public Contact Inquiry
  app.post('/api/inquiries', async (req, res) => {
    const { name, phone, specialtyId, message } = req.body ?? {};
    const cleanName = typeof name === 'string' ? name.trim() : '';
    const cleanMessage = typeof message === 'string' ? message.trim() : '';

    if (cleanName.length < 2 || cleanName.length > 120) {
      return res.status(400).json({ error: 'Name must be between 2 and 120 characters' });
    }
    if (cleanMessage.length < 5 || cleanMessage.length > 2000) {
      return res.status(400).json({ error: 'Message must be between 5 and 2000 characters' });
    }

    const cleanPhone = sanitizeJordanianPhone(String(phone ?? ''));
    if (!isValidJordanianPhone(cleanPhone)) {
      return res.status(400).json({ error: 'Invalid Jordanian phone number' });
    }

    const db = readDb();
    const inquiry: ContactInquiry = {
      id: `inq-${Date.now()}`,
      name: cleanName,
      phone: cleanPhone,
      specialtyId: normalizeSpecialtyId(specialtyId),
      message: cleanMessage,
      createdAt: new Date().toISOString(),
    };
    db.inquiries.unshift(inquiry);
    writeDb(db);

    const telegramStatus = await forwardInquiryToTelegram(inquiry);
    return res.status(201).json({
      inquiry,
      telegramConfigured: telegramStatus.configured,
      telegramDelivered: telegramStatus.delivered,
    });
  });

  // Explicitly disable old public AI endpoint (Section 5 & Section 8)
  app.post('/api/intake-chat', (_req, res) => {
    return res.status(403).json({
      error:
        'Public AI access is disabled. RB AI — LEGAL ASSISTANT is exclusively available to registered firm attorneys inside the internal portal.',
    });
  });

  // =========================================================================
  // AUTHENTICATION ENDPOINTS
  // =========================================================================
  app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body ?? {};
    const cleanUser = String(username ?? '').trim().toLowerCase();
    const cleanPass = String(password ?? '').trim();

    if (!cleanUser || !cleanPass) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const db = readDb();
    const account = db.accounts.find(
      (a) => a.active && a.username.toLowerCase() === cleanUser
    );
    if (!account || !verifyPassword(cleanPass, account.passwordHash)) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const token = createSessionToken({
      sub: account.id,
      username: account.username,
      displayName: account.displayName,
      role: account.role,
      lawyerId: account.lawyerId,
      canManageRoles: account.canManageRoles,
    });

    const payload = verifySessionToken(token)!;
    const sessionUser = buildSessionUserFromPayload(payload, db.lawyers);

    pushAudit(
      db,
      sessionUser.displayName,
      sessionUser.role,
      'LOGIN',
      'auth',
      account.id,
      `تسجيل دخول إلى البوابة الداخلية (${account.username})`
    );
    writeDb(db);

    res.setHeader(
      'Set-Cookie',
      `rb_session=${encodeURIComponent(token)}; HttpOnly; Path=/; SameSite=Lax; Max-Age=43200`
    );
    return res.json({ token, user: sessionUser });
  });

  app.post('/api/auth/logout', (req, res) => {
    const token = extractBearerOrCookieToken(req);
    const payload = verifySessionToken(token);
    if (payload) {
      const db = readDb();
      pushAudit(
        db,
        payload.displayName,
        payload.role,
        'LOGOUT',
        'auth',
        payload.sub,
        'تسجيل خروج من البوابة الداخلية'
      );
      writeDb(db);
    }
    res.setHeader('Set-Cookie', 'rb_session=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0');
    return res.json({ ok: true });
  });

  app.get('/api/auth/me', requireAuth, (req: AuthenticatedRequest, res) => {
    return res.json({ user: req.authUser });
  });

  // =========================================================================
  // PROTECTED INTERNAL FIRM DASHBOARD & CASE MANAGEMENT (RBAC ENFORCED)
  // =========================================================================
  app.get('/api/dashboard-data', requireAuth, (req: AuthenticatedRequest, res) => {
    const db = readDb();
    const user = req.authUser!;
    const isAdmin = Boolean(user.canManageRoles || user.role === 'managing_partner');

    const visibleCases = isAdmin
      ? db.cases
      : db.cases.filter((c) => canUserAccessLawyerRecord(user, c.assignedLawyer));
    const visibleCaseIds = new Set(visibleCases.map((c) => c.id));

    return res.json({
      user,
      bookings: isAdmin
        ? db.bookings
        : db.bookings.filter((b) => canUserAccessLawyerRecord(user, b.assignedLawyer)),
      cases: visibleCases,
      intakes: isAdmin ? db.intakes : [],
      inquiries: isAdmin ? db.inquiries : [],
      lawyers: db.lawyers,
      clients: isAdmin
        ? db.clients
        : db.clients.filter((c) => canUserAccessLawyerRecord(user, c.assignedLawyer)),
      hearings: isAdmin
        ? db.hearings
        : db.hearings.filter((h) => visibleCaseIds.has(h.caseId)),
      tasks: isAdmin
        ? db.tasks
        : db.tasks.filter(
            (t) =>
              canUserAccessLawyerRecord(user, t.assignedLawyer) ||
              (t.caseId ? visibleCaseIds.has(t.caseId) : false)
          ),
      attachments: isAdmin
        ? db.attachments
        : db.attachments.filter((a) => visibleCaseIds.has(a.caseId)),
      documents: isAdmin
        ? db.documents
        : db.documents.filter(
            (d) =>
              d.createdBy === user.displayName ||
              (d.caseId ? visibleCaseIds.has(d.caseId) : false)
          ),
      publications: db.publications,
      auditLogs: isAdmin ? db.auditLogs.slice(0, 200) : [],
    });
  });

  app.patch('/api/bookings/:id', requireAuth, (req: AuthenticatedRequest, res) => {
    const { id } = req.params;
    const { status, assignedLawyer } = req.body ?? {};
    const allowed: BookingStatus[] = ['pending', 'confirmed', 'completed', 'cancelled'];
    const db = readDb();
    const target = db.bookings.find((b) => b.id === id);
    if (!target) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    if (!canUserAccessLawyerRecord(req.authUser, target.assignedLawyer)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    if (status !== undefined) {
      if (!allowed.includes(status)) {
        return res.status(400).json({ error: 'Invalid booking status' });
      }
      target.status = status;
    }
    if (typeof assignedLawyer === 'string' && assignedLawyer.trim().length >= 2) {
      target.assignedLawyer = assignedLawyer.trim().slice(0, 120);
    }
    pushAudit(
      db,
      req.authUser!.displayName,
      req.authUser!.role,
      'BOOKING_UPDATED',
      'booking',
      target.id,
      `تحديث موعد ${target.referenceCode} (${target.status})`
    );
    writeDb(db);
    return res.json({ booking: target });
  });

  app.post('/api/cases', requireAuth, (req: AuthenticatedRequest, res) => {
    const {
      clientId,
      clientName,
      clientPhone,
      specialtyId,
      courtName,
      assignedLawyer,
      stage,
      nextHearingDate,
      summary,
      intakeId,
    } = req.body ?? {};

    if (!clientName || !summary) {
      return res.status(400).json({ error: 'Client name and summary are required' });
    }

    const spec = normalizeSpecialtyId(specialtyId);
    const db = readDb();
    const cleanPhone = sanitizeJordanianPhone(String(clientPhone ?? '0790000000'));
    const lawyerName = assignedLawyer
      ? String(assignedLawyer).trim()
      : getLawyerForSpecialty(spec, db.lawyers);

    // Ensure a ClientProfile exists and links automatically
    let resolvedClientId = typeof clientId === 'string' && clientId ? clientId : undefined;
    if (!resolvedClientId) {
      const existingClient = db.clients.find(
        (cl) => cl.fullName === String(clientName).trim() || cl.phone === cleanPhone
      );
      if (existingClient) {
        resolvedClientId = existingClient.id;
      } else {
        const newClient: ClientProfile = {
          id: `cl-${Date.now()}`,
          fullName: String(clientName).trim(),
          phone: cleanPhone || '0790000000',
          assignedLawyer: lawyerName,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        db.clients.unshift(newClient);
        resolvedClientId = newClient.id;
      }
    }

    const newCase: LegalCase = {
      id: `cs-${Date.now()}`,
      caseNumber: `RB-${spec.slice(0, 3).toUpperCase()}-2026/${Math.floor(100 + Math.random() * 899)}`,
      clientId: resolvedClientId,
      clientName: String(clientName).trim(),
      clientPhone: cleanPhone || '0790000000',
      specialtyId: spec,
      courtName: courtName ? String(courtName).trim() : getCourtForSpecialty(spec),
      assignedLawyer: lawyerName,
      stage: (stage || 'intake') as CaseStage,
      nextHearingDate: nextHearingDate ? String(nextHearingDate) : '2026-12-01',
      summary: String(summary).trim(),
      updatedAt: new Date().toISOString(),
    };

    db.cases.unshift(newCase);
    if (intakeId) {
      const intake = db.intakes.find((i) => i.id === intakeId);
      if (intake) intake.convertedToCaseId = newCase.id;
    }
    pushAudit(
      db,
      req.authUser!.displayName,
      req.authUser!.role,
      'CASE_CREATED',
      'case',
      newCase.id,
      `فتح ملف قضية ${newCase.caseNumber} للموكل ${newCase.clientName}`
    );
    writeDb(db);
    return res.status(201).json({ legalCase: newCase });
  });

  app.patch('/api/cases/:id', requireAuth, (req: AuthenticatedRequest, res) => {
    const { id } = req.params;
    const { stage, nextHearingDate, assignedLawyer, courtName, summary } = req.body ?? {};
    const allowedStages: CaseStage[] = ['intake', 'drafting', 'litigation', 'execution', 'closed'];
    const db = readDb();
    const target = db.cases.find((c) => c.id === id);
    if (!target) {
      return res.status(404).json({ error: 'Case not found' });
    }
    if (!canUserAccessLawyerRecord(req.authUser, target.assignedLawyer)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    if (stage && allowedStages.includes(stage)) target.stage = stage;
    if (nextHearingDate) target.nextHearingDate = String(nextHearingDate);
    if (typeof courtName === 'string' && courtName.trim()) target.courtName = courtName.trim();
    if (typeof summary === 'string' && summary.trim()) target.summary = summary.trim();
    if (typeof assignedLawyer === 'string' && assignedLawyer.trim().length >= 2) {
      target.assignedLawyer = assignedLawyer.trim().slice(0, 120);
    }
    target.updatedAt = new Date().toISOString();
    pushAudit(
      db,
      req.authUser!.displayName,
      req.authUser!.role,
      'CASE_UPDATED',
      'case',
      target.id,
      `تحديث ملف القضية ${target.caseNumber}`
    );
    writeDb(db);
    return res.json({ legalCase: target });
  });

  // Clients CRM
  app.get('/api/clients', requireAuth, (req: AuthenticatedRequest, res) => {
    const db = readDb();
    const isAdmin = Boolean(req.authUser?.canManageRoles || req.authUser?.role === 'managing_partner');
    const clients = isAdmin
      ? db.clients
      : db.clients.filter((c) => canUserAccessLawyerRecord(req.authUser, c.assignedLawyer));
    return res.json({ clients });
  });

  app.post('/api/clients', requireAuth, (req: AuthenticatedRequest, res) => {
    const { fullName, phone, nationalId, email, address, notes, assignedLawyer } = req.body ?? {};
    if (!fullName || String(fullName).trim().length < 2) {
      return res.status(400).json({ error: 'Client full name is required' });
    }
    const db = readDb();
    const client: ClientProfile = {
      id: `cl-${Date.now()}`,
      fullName: String(fullName).trim(),
      phone: sanitizeJordanianPhone(String(phone ?? '0790000000')) || '0790000000',
      nationalId: nationalId ? String(nationalId).trim() : undefined,
      email: email ? String(email).trim() : undefined,
      address: address ? String(address).trim() : undefined,
      notes: notes ? String(notes).trim() : undefined,
      assignedLawyer: assignedLawyer
        ? String(assignedLawyer).trim()
        : req.authUser!.displayName,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    db.clients.unshift(client);
    pushAudit(
      db,
      req.authUser!.displayName,
      req.authUser!.role,
      'CLIENT_CREATED',
      'client',
      client.id,
      `إضافة ملف موكل: ${client.fullName}`
    );
    writeDb(db);
    return res.status(201).json({ client });
  });

  // Hearings, Tasks & Attachments
  app.post('/api/hearings', requireAuth, (req: AuthenticatedRequest, res) => {
    const { caseId, date, time, courtName, title, notes } = req.body ?? {};
    if (!caseId || !date || !title) {
      return res.status(400).json({ error: 'caseId, date, and title are required' });
    }
    const db = readDb();
    const legalCase = db.cases.find((c) => c.id === caseId);
    if (!legalCase || !canUserAccessLawyerRecord(req.authUser, legalCase.assignedLawyer)) {
      return res.status(403).json({ error: 'Case not accessible' });
    }
    const hearing: CaseHearing = {
      id: `hr-${Date.now()}`,
      caseId,
      date: String(date),
      time: time ? String(time) : undefined,
      courtName: courtName ? String(courtName).trim() : legalCase.courtName,
      title: String(title).trim(),
      notes: notes ? String(notes).trim() : undefined,
      status: 'scheduled',
      createdBy: req.authUser!.displayName,
      createdAt: new Date().toISOString(),
    };
    db.hearings.unshift(hearing);
    legalCase.nextHearingDate = String(date);
    legalCase.updatedAt = new Date().toISOString();
    pushAudit(
      db,
      req.authUser!.displayName,
      req.authUser!.role,
      'HEARING_CREATED',
      'hearing',
      hearing.id,
      `إضافة جلسة (${hearing.date}) للقضية ${legalCase.caseNumber}`
    );
    writeDb(db);
    return res.status(201).json({ hearing });
  });

  app.patch('/api/hearings/:id', requireAuth, (req: AuthenticatedRequest, res) => {
    const { id } = req.params;
    const { status, notes } = req.body ?? {};
    const db = readDb();
    const hearing = db.hearings.find((h) => h.id === id);
    if (!hearing) return res.status(404).json({ error: 'Hearing not found' });
    if (status === 'scheduled' || status === 'completed' || status === 'postponed') {
      hearing.status = status;
    }
    if (typeof notes === 'string') hearing.notes = notes;
    writeDb(db);
    return res.json({ hearing });
  });

  app.post('/api/tasks', requireAuth, (req: AuthenticatedRequest, res) => {
    const { caseId, title, dueDate, assignedLawyer, priority } = req.body ?? {};
    if (!title || String(title).trim().length < 2) {
      return res.status(400).json({ error: 'Task title is required' });
    }
    const db = readDb();
    const task: CaseTask = {
      id: `tsk-${Date.now()}`,
      caseId: caseId ? String(caseId) : undefined,
      title: String(title).trim(),
      dueDate: dueDate ? String(dueDate) : undefined,
      assignedLawyer: assignedLawyer ? String(assignedLawyer).trim() : req.authUser!.displayName,
      priority: priority === 'urgent' || priority === 'high' ? priority : 'normal',
      status: 'todo',
      createdBy: req.authUser!.displayName,
      createdAt: new Date().toISOString(),
    };
    db.tasks.unshift(task);
    pushAudit(
      db,
      req.authUser!.displayName,
      req.authUser!.role,
      'TASK_CREATED',
      'task',
      task.id,
      `إضافة مهمة: ${task.title}`
    );
    writeDb(db);
    return res.status(201).json({ task });
  });

  app.patch('/api/tasks/:id', requireAuth, (req: AuthenticatedRequest, res) => {
    const { id } = req.params;
    const { status } = req.body ?? {};
    const db = readDb();
    const task = db.tasks.find((t) => t.id === id);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    if (status === 'todo' || status === 'in_progress' || status === 'done') {
      task.status = status;
    }
    writeDb(db);
    return res.json({ task });
  });

  app.post('/api/attachments', requireAuth, (req: AuthenticatedRequest, res) => {
    const { caseId, name, mimeType, sizeBytes, textExtract } = req.body ?? {};
    if (!caseId || !name) {
      return res.status(400).json({ error: 'caseId and attachment name are required' });
    }
    const db = readDb();
    const legalCase = db.cases.find((c) => c.id === caseId);
    if (!legalCase || !canUserAccessLawyerRecord(req.authUser, legalCase.assignedLawyer)) {
      return res.status(403).json({ error: 'Case not accessible' });
    }
    const attachment: CaseAttachment = {
      id: `att-${Date.now()}`,
      caseId,
      name: String(name).trim().slice(0, 200),
      mimeType: String(mimeType || 'application/octet-stream'),
      sizeBytes: Number(sizeBytes) || 0,
      textExtract: textExtract ? String(textExtract).slice(0, 20000) : undefined,
      uploadedBy: req.authUser!.displayName,
      uploadedAt: new Date().toISOString(),
    };
    db.attachments.unshift(attachment);
    pushAudit(
      db,
      req.authUser!.displayName,
      req.authUser!.role,
      'ATTACHMENT_ADDED',
      'attachment',
      attachment.id,
      `إرفاق مستند (${attachment.name}) بالقضية ${legalCase.caseNumber}`
    );
    writeDb(db);
    return res.status(201).json({ attachment });
  });

  // Lawyers & Role Management (Protected + Managing Director Control)
  app.get('/api/lawyers', requireAuth, (_req, res) => {
    const db = readDb();
    return res.json({ lawyers: db.lawyers });
  });

  app.post('/api/lawyers', requireAuth, requireManageRoles, (req: AuthenticatedRequest, res) => {
    const { name, nameEn, phone, email, role, specialties, status, canManageRoles } =
      req.body ?? {};
    const cleanName = typeof name === 'string' ? name.trim().slice(0, 120) : '';
    if (cleanName.length < 3) {
      return res.status(400).json({ error: 'Lawyer name must be at least 3 characters' });
    }

    const cleanPhone = sanitizeJordanianPhone(String(phone ?? '0796251902'));
    const normalizedRole = normalizeLawyerRole(role);
    const validSpecs: SpecialtyId[] = Array.isArray(specialties)
      ? specialties.filter((s): s is SpecialtyId => VALID_SPECIALTY_IDS.includes(s as SpecialtyId))
      : ['civil'];

    const db = readDb();
    const duplicate = db.lawyers.some(
      (l) => l.name.trim().toLowerCase() === cleanName.toLowerCase()
    );
    if (duplicate) {
      return res.status(409).json({ error: 'A lawyer with this name already exists' });
    }

    const newLawyer: FirmLawyer = {
      id: `law-${Date.now()}`,
      name: cleanName,
      nameEn: typeof nameEn === 'string' && nameEn.trim() ? nameEn.trim().slice(0, 120) : undefined,
      phone: cleanPhone || '0796251902',
      email: typeof email === 'string' && email.trim() ? email.trim().slice(0, 120) : undefined,
      role: normalizedRole,
      specialties: validSpecs.length > 0 ? validSpecs : ['civil'],
      status: status === 'on_leave' ? 'on_leave' : 'active',
      canManageRoles:
        typeof canManageRoles === 'boolean'
          ? canManageRoles
          : LAWYER_ROLE_META[normalizedRole].defaultCanManageRoles,
      joinedAt: new Date().toISOString().slice(0, 10),
    };

    db.lawyers.push(newLawyer);
    pushAudit(
      db,
      req.authUser!.displayName,
      req.authUser!.role,
      'LAWYER_ADDED',
      'lawyer',
      newLawyer.id,
      `إضافة محامي جديد للفريق: ${newLawyer.name}`
    );
    writeDb(db);
    return res.status(201).json({ lawyer: newLawyer });
  });

  app.patch('/api/lawyers/:id', requireAuth, requireManageRoles, (req: AuthenticatedRequest, res) => {
    const { id } = req.params;
    const { name, nameEn, phone, email, role, specialties, status, canManageRoles } =
      req.body ?? {};
    const db = readDb();
    const target = db.lawyers.find((l) => l.id === id);
    if (!target) {
      return res.status(404).json({ error: 'Lawyer not found' });
    }

    const previousName = target.name;
    if (typeof name === 'string' && name.trim().length >= 3) {
      const nextName = name.trim().slice(0, 120);
      target.name = nextName;
      if (nextName !== previousName) {
        for (const c of db.cases) {
          if (c.assignedLawyer.trim() === previousName.trim()) c.assignedLawyer = nextName;
        }
        for (const b of db.bookings) {
          if (b.assignedLawyer.trim() === previousName.trim()) b.assignedLawyer = nextName;
        }
      }
    }
    if (typeof nameEn === 'string') {
      target.nameEn = nameEn.trim() ? nameEn.trim().slice(0, 120) : undefined;
    }
    if (typeof phone === 'string' && phone.trim()) {
      target.phone = sanitizeJordanianPhone(phone);
    }
    if (typeof email === 'string') {
      target.email = email.trim() ? email.trim().slice(0, 120) : undefined;
    }
    if (role !== undefined) {
      target.role = normalizeLawyerRole(role);
      if (canManageRoles === undefined) {
        target.canManageRoles = LAWYER_ROLE_META[target.role].defaultCanManageRoles;
      }
    }
    if (typeof canManageRoles === 'boolean') target.canManageRoles = canManageRoles;
    if (Array.isArray(specialties)) {
      const validSpecs = specialties.filter((s): s is SpecialtyId =>
        VALID_SPECIALTY_IDS.includes(s as SpecialtyId)
      );
      if (validSpecs.length > 0) target.specialties = validSpecs;
    }
    if (status === 'active' || status === 'on_leave') {
      target.status = status as LawyerStatus;
    }

    pushAudit(
      db,
      req.authUser!.displayName,
      req.authUser!.role,
      'LAWYER_UPDATED',
      'lawyer',
      target.id,
      `تحديث بيانات/صلاحيات المحامي ${target.name}`
    );
    writeDb(db);
    return res.json({ lawyer: target, cases: db.cases, bookings: db.bookings });
  });

  app.delete('/api/lawyers/:id', requireAuth, requireManageRoles, (req: AuthenticatedRequest, res) => {
    const { id } = req.params;
    const reassignToLawyerName =
      typeof req.body?.reassignToLawyerName === 'string'
        ? req.body.reassignToLawyerName.trim()
        : '';

    const db = readDb();
    const targetIdx = db.lawyers.findIndex((l) => l.id === id);
    if (targetIdx === -1) return res.status(404).json({ error: 'Lawyer not found' });
    if (db.lawyers.length <= 1) {
      return res.status(400).json({ error: 'Cannot remove the last remaining lawyer in the firm' });
    }

    const removed = db.lawyers[targetIdx];
    const remaining = db.lawyers.filter((l) => l.id !== id);
    const fallbackTarget =
      remaining.find((l) => l.name.trim() === reassignToLawyerName)?.name ??
      remaining.find((l) => l.status === 'active')?.name ??
      remaining[0].name;

    let reassignedCases = 0;
    let reassignedBookings = 0;

    for (const c of db.cases) {
      if (c.assignedLawyer.trim() === removed.name.trim()) {
        c.assignedLawyer = fallbackTarget;
        c.updatedAt = new Date().toISOString();
        reassignedCases += 1;
      }
    }
    for (const b of db.bookings) {
      if (b.assignedLawyer.trim() === removed.name.trim()) {
        b.assignedLawyer = fallbackTarget;
        reassignedBookings += 1;
      }
    }

    db.lawyers = remaining;
    pushAudit(
      db,
      req.authUser!.displayName,
      req.authUser!.role,
      'LAWYER_REMOVED',
      'lawyer',
      id,
      `شطب المحامي ${removed.name} وتحويل ${reassignedCases} قضية إلى ${fallbackTarget}`
    );
    writeDb(db);
    return res.json({
      removedId: id,
      reassignedTo: fallbackTarget,
      reassignedCases,
      reassignedBookings,
      lawyers: db.lawyers,
      cases: db.cases,
      bookings: db.bookings,
    });
  });

  app.post('/api/admin/transfer-cases', requireAuth, requireManageRoles, (req: AuthenticatedRequest, res) => {
    const { fromLawyerName, toLawyerName, scope } = req.body ?? {};
    const fromName = typeof fromLawyerName === 'string' ? fromLawyerName.trim() : '';
    const toName = typeof toLawyerName === 'string' ? toLawyerName.trim() : '';

    if (!fromName || !toName || fromName === toName) {
      return res.status(400).json({ error: 'Please select two different lawyers for transfer' });
    }

    const db = readDb();
    const validTarget = db.lawyers.some((l) => l.name.trim() === toName);
    if (!validTarget) {
      return res.status(404).json({ error: 'Target lawyer not found in firm roster' });
    }

    const transferScope =
      scope === 'active_cases' || scope === 'all_cases_and_bookings' ? scope : 'all_cases';

    let transferredCases = 0;
    let transferredBookings = 0;

    for (const c of db.cases) {
      if (c.assignedLawyer.trim() !== fromName) continue;
      if (transferScope === 'active_cases' && c.stage === 'closed') continue;
      c.assignedLawyer = toName;
      c.updatedAt = new Date().toISOString();
      transferredCases += 1;
    }

    if (transferScope === 'all_cases_and_bookings') {
      for (const b of db.bookings) {
        if (b.assignedLawyer.trim() !== fromName) continue;
        if (b.status === 'pending' || b.status === 'confirmed') {
          b.assignedLawyer = toName;
          transferredBookings += 1;
        }
      }
    }

    pushAudit(
      db,
      req.authUser!.displayName,
      req.authUser!.role,
      'BULK_TRANSFER',
      'case',
      fromName,
      `نقل ${transferredCases} قضية و${transferredBookings} موعد من ${fromName} إلى ${toName}`
    );
    writeDb(db);
    return res.json({
      transferredCases,
      transferredBookings,
      cases: db.cases,
      bookings: db.bookings,
    });
  });

  app.get('/api/inquiries', requireAuth, (_req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const db = readDb();
    return res.json({ inquiries: db.inquiries });
  });

  // =========================================================================
  // PUBLICATIONS & MEDIA CMS (PROTECTED)
  // =========================================================================
  app.post('/api/publications', requireAuth, (req: AuthenticatedRequest, res) => {
    const {
      category,
      titleAr,
      titleEn,
      summaryAr,
      summaryEn,
      contentAr,
      contentEn,
      authorName,
      mediaOutlet,
      featured,
      status,
      seoKeywords,
    } = req.body ?? {};

    if (!titleAr || !summaryAr || !contentAr) {
      return res.status(400).json({ error: 'Arabic title, summary, and content are required' });
    }

    const validCat: PublicationCategory = ['article', 'analysis', 'media', 'interview', 'news'].includes(
      category
    )
      ? category
      : 'article';

    const db = readDb();
    const now = new Date().toISOString();
    const pub: FirmPublication = {
      id: `pub-${Date.now()}`,
      slug: `pub-${Date.now()}`,
      category: validCat,
      titleAr: String(titleAr).trim(),
      titleEn: titleEn ? String(titleEn).trim() : undefined,
      summaryAr: String(summaryAr).trim(),
      summaryEn: summaryEn ? String(summaryEn).trim() : undefined,
      contentAr: String(contentAr).trim(),
      contentEn: contentEn ? String(contentEn).trim() : undefined,
      authorName: authorName ? String(authorName).trim() : 'المحامي رضوان علي بطاينة',
      mediaOutlet: mediaOutlet ? String(mediaOutlet).trim() : undefined,
      publishedAt: now.slice(0, 10),
      featured: Boolean(featured),
      status: status === 'draft' ? 'draft' : 'published',
      seoKeywords: Array.isArray(seoKeywords) ? seoKeywords.map(String) : undefined,
      createdAt: now,
      updatedAt: now,
    };

    db.publications.unshift(pub);
    pushAudit(
      db,
      req.authUser!.displayName,
      req.authUser!.role,
      'PUBLICATION_CREATED',
      'publication',
      pub.id,
      `نشر محتوى إعلامي/قانوني: ${pub.titleAr}`
    );
    writeDb(db);
    return res.status(201).json({ publication: pub });
  });

  app.delete('/api/publications/:id', requireAuth, requireManageRoles, (req: AuthenticatedRequest, res) => {
    const { id } = req.params;
    const db = readDb();
    const before = db.publications.length;
    db.publications = db.publications.filter((p) => p.id !== id);
    if (db.publications.length === before) {
      return res.status(404).json({ error: 'Publication not found' });
    }
    pushAudit(
      db,
      req.authUser!.displayName,
      req.authUser!.role,
      'PUBLICATION_DELETED',
      'publication',
      id,
      `حذف منشور (${id})`
    );
    writeDb(db);
    return res.json({ ok: true });
  });

  // =========================================================================
  // RB AI — LEGAL ASSISTANT (REGISTERED FIRM ATTORNEYS ONLY)
  // =========================================================================
  app.get('/api/rb-ai/research', requireAuth, (req, res) => {
    const q = String(req.query.q ?? '');
    const result = searchJordanianLegalReferences(q);
    return res.json(result);
  });

  app.post('/api/rb-ai/assist', requireAuth, async (req: AuthenticatedRequest, res) => {
    const apiKey = cleanEnvValue(process.env.GEMINI_API_KEY);
    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
      return res.status(503).json({
        error: 'GEMINI_API_KEY is not configured in .env on the server.',
      });
    }

    const { messages, caseId, attachmentText, forceGenerate, preferredDocType } = req.body ?? {};
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

    const db = readDb();
    let caseContext = '';
    let linkedCase: LegalCase | undefined;
    if (caseId) {
      linkedCase = db.cases.find((c) => c.id === caseId);
      if (linkedCase) {
        if (!canUserAccessLawyerRecord(req.authUser, linkedCase.assignedLawyer)) {
          return res.status(403).json({ error: 'Not authorized for the selected case' });
        }
        caseContext = `رقم القضية: ${linkedCase.caseNumber}\nالموكل: ${linkedCase.clientName}\nالمحكمة: ${linkedCase.courtName}\nالوقائع: ${linkedCase.summary}`;
      }
    }

    try {
      const aiResult = await runRbAiLegalAssistant({
        apiKey,
        messages,
        caseContext,
        attachmentText: typeof attachmentText === 'string' ? attachmentText : undefined,
        forceGenerate: Boolean(forceGenerate),
        preferredDocType: preferredDocType as LegalDocumentType | undefined,
      });

      let savedDoc: LegalDocumentRecord | null = null;
      if (aiResult.stage === 'draft_ready' && aiResult.draftText) {
        const now = new Date().toISOString();
        savedDoc = {
          id: `doc-${Date.now()}`,
          title: aiResult.documentTitle,
          documentType: aiResult.detectedDocumentType,
          caseId: linkedCase?.id,
          clientId: linkedCase?.clientId,
          clientName: linkedCase?.clientName,
          courtOrAuthority: aiResult.courtOrAuthority,
          status: 'draft',
          bodyText: aiResult.draftText,
          attachmentsChecklist: aiResult.attachmentsChecklist,
          legalReferences: aiResult.legalReferences,
          extractedEntities: aiResult.extractedEntities,
          createdBy: req.authUser!.displayName,
          createdByRole: req.authUser!.role,
          versions: [
            {
              versionNumber: 1,
              content: aiResult.draftText,
              changeNote: 'المسودة الأولية عبر RB AI — LEGAL ASSISTANT',
              editedBy: req.authUser!.displayName,
              editedAt: now,
            },
          ],
          createdAt: now,
          updatedAt: now,
        };
        db.documents.unshift(savedDoc);
        pushAudit(
          db,
          req.authUser!.displayName,
          req.authUser!.role,
          'AI_DRAFT_GENERATED',
          'document',
          savedDoc.id,
          `توليد مسودة (${savedDoc.title}) عبر RB AI`
        );
        writeDb(db);
      } else {
        pushAudit(
          db,
          req.authUser!.displayName,
          req.authUser!.role,
          'AI_CONSULTED',
          'rb_ai',
          'session',
          `استخدام RB AI لاستيضاح متطلبات مستند (${aiResult.detectedDocumentType})`
        );
        writeDb(db);
      }

      return res.json({ result: aiResult, document: savedDoc });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'RB AI execution failed';
      return res.status(502).json({ error: msg });
    }
  });

  // =========================================================================
  // LEGAL DOCUMENTS, VERSIONING, APPROVAL & LETTERHEAD DOCX/PDF EXPORT
  // =========================================================================
  app.get('/api/documents', requireAuth, (req: AuthenticatedRequest, res) => {
    const db = readDb();
    const isAdmin = Boolean(req.authUser?.canManageRoles || req.authUser?.role === 'managing_partner');
    const docs = isAdmin
      ? db.documents
      : db.documents.filter((d) => d.createdBy === req.authUser?.displayName);
    return res.json({ documents: docs });
  });

  app.post('/api/documents', requireAuth, (req: AuthenticatedRequest, res) => {
    const {
      title,
      documentType,
      caseId,
      clientId,
      clientName,
      courtOrAuthority,
      bodyText,
      attachmentsChecklist,
      legalReferences,
    } = req.body ?? {};
    if (!title || !bodyText) {
      return res.status(400).json({ error: 'Document title and bodyText are required' });
    }
    const db = readDb();
    const now = new Date().toISOString();
    const docRecord: LegalDocumentRecord = {
      id: `doc-${Date.now()}`,
      title: String(title).trim(),
      documentType: (documentType || 'legal_memo') as LegalDocumentType,
      caseId: caseId ? String(caseId) : undefined,
      clientId: clientId ? String(clientId) : undefined,
      clientName: clientName ? String(clientName) : undefined,
      courtOrAuthority: courtOrAuthority ? String(courtOrAuthority) : undefined,
      status: 'draft',
      bodyText: String(bodyText),
      attachmentsChecklist: Array.isArray(attachmentsChecklist) ? attachmentsChecklist : undefined,
      legalReferences: Array.isArray(legalReferences) ? legalReferences : undefined,
      createdBy: req.authUser!.displayName,
      createdByRole: req.authUser!.role,
      versions: [
        {
          versionNumber: 1,
          content: String(bodyText),
          changeNote: 'إنشاء المستند',
          editedBy: req.authUser!.displayName,
          editedAt: now,
        },
      ],
      createdAt: now,
      updatedAt: now,
    };
    db.documents.unshift(docRecord);
    pushAudit(
      db,
      req.authUser!.displayName,
      req.authUser!.role,
      'DOCUMENT_CREATED',
      'document',
      docRecord.id,
      `إنشاء مستند: ${docRecord.title}`
    );
    writeDb(db);
    return res.status(201).json({ document: docRecord });
  });

  app.patch('/api/documents/:id', requireAuth, (req: AuthenticatedRequest, res) => {
    const { id } = req.params;
    const { title, bodyText, courtOrAuthority, caseId, clientName, changeNote, status } = req.body ?? {};
    const db = readDb();
    const docRecord = db.documents.find((d) => d.id === id);
    if (!docRecord) return res.status(404).json({ error: 'Document not found' });

    const isAdmin = Boolean(req.authUser?.canManageRoles || req.authUser?.role === 'managing_partner');
    if (!isAdmin && docRecord.createdBy !== req.authUser?.displayName) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const now = new Date().toISOString();
    if (typeof title === 'string' && title.trim()) docRecord.title = title.trim();
    if (typeof courtOrAuthority === 'string') docRecord.courtOrAuthority = courtOrAuthority.trim();
    if (typeof caseId === 'string') docRecord.caseId = caseId || undefined;
    if (typeof clientName === 'string') docRecord.clientName = clientName.trim() || undefined;
    if (status === 'draft' || status === 'reviewed') docRecord.status = status;

    if (typeof bodyText === 'string' && bodyText.trim() && bodyText !== docRecord.bodyText) {
      docRecord.bodyText = bodyText;
      docRecord.versions.unshift({
        versionNumber: docRecord.versions.length + 1,
        content: bodyText,
        changeNote: changeNote ? String(changeNote) : 'تعديل يدوي من المحامي',
        editedBy: req.authUser!.displayName,
        editedAt: now,
      });
    }
    docRecord.updatedAt = now;
    pushAudit(
      db,
      req.authUser!.displayName,
      req.authUser!.role,
      'DOCUMENT_EDITED',
      'document',
      docRecord.id,
      `تعديل المستند (${docRecord.title}) — النسخة ${docRecord.versions.length}`
    );
    writeDb(db);
    return res.json({ document: docRecord });
  });

  // Explicit Lawyer Approval & Sign-Ready Action (NEVER auto-signed by AI)
  app.post('/api/documents/:id/approve', requireAuth, (req: AuthenticatedRequest, res) => {
    const { id } = req.params;
    const { action } = req.body ?? {};
    const db = readDb();
    const docRecord = db.documents.find((d) => d.id === id);
    if (!docRecord) return res.status(404).json({ error: 'Document not found' });

    const now = new Date().toISOString();
    if (action === 'mark_submitted') {
      if (docRecord.status !== 'approved' && docRecord.status !== 'signed_ready') {
        return res.status(400).json({
          error: 'Document must be explicitly approved by a lawyer before marking as submitted.',
        });
      }
      docRecord.status = 'submitted';
    } else if (action === 'sign_ready') {
      docRecord.status = 'signed_ready';
      docRecord.approvedBy = docRecord.approvedBy || req.authUser!.displayName;
      docRecord.approvedAt = docRecord.approvedAt || now;
      docRecord.signedBy = req.authUser!.displayName;
      docRecord.signedAt = now;
    } else {
      docRecord.status = 'approved';
      docRecord.approvedBy = req.authUser!.displayName;
      docRecord.approvedAt = now;
    }
    docRecord.updatedAt = now;

    pushAudit(
      db,
      req.authUser!.displayName,
      req.authUser!.role,
      'DOCUMENT_APPROVED',
      'document',
      docRecord.id,
      `اعتماد المستند (${docRecord.title}) بالحالة: ${docRecord.status}`
    );
    writeDb(db);
    return res.json({ document: docRecord });
  });

  app.get('/api/documents/:id/export/docx', requireAuth, (req: AuthenticatedRequest, res) => {
    const { id } = req.params;
    const db = readDb();
    const docRecord = db.documents.find((d) => d.id === id);
    if (!docRecord) return res.status(404).json({ error: 'Document not found' });

    try {
      const buffer = buildOfficialLetterheadDocxBuffer(docRecord);
      pushAudit(
        db,
        req.authUser!.displayName,
        req.authUser!.role,
        'DOCUMENT_EXPORTED_DOCX',
        'document',
        docRecord.id,
        `تنزيل ملف Word (DOCX) على الترويسة الرسمية: ${docRecord.title}`
      );
      writeDb(db);

      const safeFilename = encodeURIComponent(`${docRecord.title}.docx`);
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      );
      res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${safeFilename}`);
      return res.send(buffer);
    } catch (err: unknown) {
      return res.status(500).json({
        error: err instanceof Error ? err.message : 'DOCX generation failed',
      });
    }
  });

  app.get('/api/documents/:id/export/pdf', requireAuth, async (req: AuthenticatedRequest, res) => {
    const { id } = req.params;
    const db = readDb();
    const docRecord = db.documents.find((d) => d.id === id);
    if (!docRecord) return res.status(404).json({ error: 'Document not found' });

    try {
      const { buffer, engine } = await buildOfficialLetterheadPdfBuffer(docRecord);
      if (!buffer) {
        return res.status(501).json({
          error: 'Server PDF engine unavailable; use print view fallback.',
          fallbackPrintUrl: `/api/documents/${docRecord.id}/print`,
        });
      }

      pushAudit(
        db,
        req.authUser!.displayName,
        req.authUser!.role,
        'DOCUMENT_EXPORTED_PDF',
        'document',
        docRecord.id,
        `تنزيل ملف PDF (${engine}) على الترويسة الرسمية: ${docRecord.title}`
      );
      writeDb(db);

      const safeFilename = encodeURIComponent(`${docRecord.title}.pdf`);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${safeFilename}`);
      return res.send(buffer);
    } catch (err: unknown) {
      return res.status(500).json({
        error: err instanceof Error ? err.message : 'PDF generation failed',
      });
    }
  });

  app.get('/api/documents/:id/print', requireAuth, (req: AuthenticatedRequest, res) => {
    const { id } = req.params;
    const db = readDb();
    const docRecord = db.documents.find((d) => d.id === id);
    if (!docRecord) return res.status(404).json({ error: 'Document not found' });
    const html = buildOfficialLetterheadPrintHtml(docRecord);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(html);
  });

  // Audit Log & Encrypted Backup Export (Admin Only)
  app.get('/api/audit-logs', requireAuth, requireManageRoles, (_req, res) => {
    const db = readDb();
    return res.json({ auditLogs: db.auditLogs.slice(0, 300) });
  });

  app.get('/api/admin/backup', requireAuth, requireManageRoles, (req: AuthenticatedRequest, res) => {
    const db = readDb();
    pushAudit(
      db,
      req.authUser!.displayName,
      req.authUser!.role,
      'BACKUP_EXPORTED',
      'system',
      'backup',
      'تصدير نسخة احتياطية كاملة لقاعدة بيانات المكتب'
    );
    writeDb(db);

    const { accounts: _omitAccounts, ...safeSnapshot } = db;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="rb-legal-backup-${new Date().toISOString().slice(0, 10)}.json"`
    );
    return res.send(JSON.stringify(safeSnapshot, null, 2));
  });

  app.use('/api', (_req, res) => {
    return res.status(404).json({ error: 'API route not found' });
  });

  return app;
}
