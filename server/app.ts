import express, { type Express } from 'express';
import fs from 'fs';
import path from 'path';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import type {
  BookingStatus,
  CaseStage,
  ConsultationBooking,
  ContactInquiry,
  FirmLawyer,
  IntakeSummary,
  LawyerStatus,
  LegalCase,
  SpecialtyId,
} from '../src/types/legal.js';
import {
  buildTelegramSendMessagePayload,
  getConsultationFee,
  isValidJordanianPhone,
  isValidTelegramBotToken,
  isValidTelegramChatId,
  normalizeGeminiChatContents,
  normalizeSpecialtyId,
  parseSafiSummaryBlock,
  sanitizeJordanianPhone,
  VALID_SPECIALTY_IDS,
} from '../src/utils/legalWorkflow.js';
import {
  LAWYER_ROLE_META,
  normalizeLawyerRole,
  pickRecommendedLawyerForSpecialty,
} from '../src/utils/adminAnalytics.js';

export interface FirmDatabase {
  bookings: ConsultationBooking[];
  cases: LegalCase[];
  intakes: IntakeSummary[];
  inquiries: ContactInquiry[];
  lawyers: FirmLawyer[];
}

function resolveDataDir(): string {
  // Vercel serverless filesystem is read-only except /tmp
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
      name: 'المحامي رضوان علي البطاينة',
      nameEn: 'Attorney Radwan Ali Al-Bataineh',
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
      phone: '0796251903',
      email: 'ahmad@alradwan-law.jo',
      role: 'partner',
      specialties: ['criminal', 'labor'],
      status: 'active',
      canManageRoles: true,
      joinedAt: '2021-03-10',
    },
    {
      id: 'law-najwa',
      name: 'المحامية نجوى الشطناوي',
      nameEn: 'Attorney Najwa Al-Shatnawi',
      phone: '0786251904',
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
      phone: '0776251905',
      email: 'layali@alradwan-law.jo',
      role: 'senior_lawyer',
      specialties: ['commercial', 'civil'],
      status: 'active',
      canManageRoles: false,
      joinedAt: '2023-02-20',
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
        mode: 'in_person',
        date: '2026-11-18',
        timeSlot: '11:00',
        feeJod: 0,
        paymentMethod: 'free',
        paymentReference: 'FREE',
        otpVerified: true,
        caseSummary: 'شيكات مرتجعة بقيمة 14,500 دينار مع ورقة اعتراض صادرة عن البنك.',
        status: 'confirmed',
        assignedLawyer: 'المحامي رضوان علي البطاينة',
        createdAt: '2026-11-17T08:15:00.000Z',
      },
      {
        id: 'bk-102',
        referenceCode: 'RB-26102',
        clientName: 'هيا عبدالكريم البطاينة',
        clientPhone: '0786123409',
        specialtyId: 'sharia',
        mode: 'online',
        date: '2026-11-18',
        timeSlot: '14:30',
        feeJod: 0,
        paymentMethod: 'free',
        paymentReference: 'FREE',
        otpVerified: true,
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
        mode: 'in_person',
        date: '2026-11-19',
        timeSlot: '10:00',
        feeJod: 0,
        paymentMethod: 'free',
        paymentReference: 'FREE',
        otpVerified: true,
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
        clientName: 'م. عمر الخطيب',
        clientPhone: '0791124455',
        specialtyId: 'civil',
        courtName: 'محكمة بداية حقوق إربد',
        assignedLawyer: 'المحامي رضوان علي البطاينة',
        stage: 'litigation',
        nextHearingDate: '2026-11-24',
        summary: 'مطالبة مالية وعقد مقاولة إنشائية مع طلب حجز تحفظي.',
        updatedAt: '2026-11-16T12:00:00.000Z',
      },
      {
        id: 'cs-202',
        caseNumber: 'IRB-SHR-2026/192',
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
  };
}

function persistDbSafe(db: FirmDatabase): void {
  memoryDbCache = db;
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
  } catch {
    // Graceful fallback to in-memory cache if filesystem is unavailable
  }
}

function readDb(): FirmDatabase {
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf8');
      const parsed = JSON.parse(raw) as Partial<FirmDatabase>;
      let migrated = false;
      if (!Array.isArray(parsed.inquiries)) {
        parsed.inquiries = [];
        migrated = true;
      }
      if (!Array.isArray(parsed.lawyers) || parsed.lawyers.length === 0) {
        parsed.lawyers = getDefaultLawyers();
        migrated = true;
      }
      const normalized: FirmDatabase = {
        bookings: Array.isArray(parsed.bookings) ? parsed.bookings : [],
        cases: Array.isArray(parsed.cases) ? parsed.cases : [],
        intakes: Array.isArray(parsed.intakes) ? parsed.intakes : [],
        inquiries: parsed.inquiries,
        lawyers: parsed.lawyers,
      };
      memoryDbCache = normalized;
      if (migrated) {
        persistDbSafe(normalized);
      }
      return normalized;
    }
  } catch {
    // Fall back to memory cache or fresh seed
  }

  if (memoryDbCache) {
    return memoryDbCache;
  }

  const seed = getSeedDatabase();
  persistDbSafe(seed);
  return seed;
}

function writeDb(db: FirmDatabase): void {
  persistDbSafe(db);
}

function getLawyerForSpecialty(specialtyId: SpecialtyId, lawyers?: FirmLawyer[]): string {
  if (lawyers && lawyers.length > 0) {
    return pickRecommendedLawyerForSpecialty(specialtyId, lawyers);
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
      return 'المحامي رضوان علي البطاينة';
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
      return 'المحكمة الإدارية / دائرة تنفيذ إربد';
    case 'arbitration':
      return 'هيئة التحكيم والوساطة';
    default:
      return 'محكمة بداية حقوق إربد';
  }
}

const INTAKE_SYSTEM_INSTRUCTION = `
You are the Smart Legal Intake Assistant ("المساعد القانوني الذكي - الصافي") for Al-Radwan Arbitration, Law Firm & Legal Consultations (شركة الرضوان للمحاماة والاستشارات القانونية) located in Irbid - 30th Street (إربد – الشارع الثلاثين), phone 0796251902.
Motto: "حقك… مسؤوليتنا" ("Your Right Is Our Responsibility").
Leadership & Team:
- Founder & Director: Attorney Radwan Ali Al-Bataineh (المحامي رضوان علي البطاينة – مؤسس الشركة والمدير، ماجستير في العلوم السياسية والعلاقات الدولية)
- Partner: Attorney Ahmad Saleem Al-Khouli (المحامي أحمد سليم الخولي – شريك)
- Attorneys: Najwa Al-Shatnawi (المحامية نجوى الشطناوي) and Layali Khreisat (المحامية ليالي خريسات)
IMPORTANT: Initial consultations at Al-Radwan Law Firm are 100% FREE (الاستشارات الأولية مجانية بالكامل). Never quote consultation fees or ask clients to pay for consultations.

YOUR ROLE & STRICT INTERVIEW FLOW:
1. Language & Tone:
   - Respond in warm, empathetic, reassuring, concise Jordanian Arabic if the client writes in Arabic (or if lang="ar"), and clear professional English if the client writes in English (or if lang="en").
   - Never give final binding legal verdicts or pretend to replace a lawyer; instead listen carefully and gather precise intake facts so the Al-Radwan legal team can protect their rights effectively.
2. Exact 4-Step Intake Flow (keep replies crisp, 2–4 short sentences max per turn):
   - Step A: Identify which of the 7 specialties fits the client's issue:
     1) civil (القضايا المدنية والحقوقية: شيكات، عقارات، تعويضات)
     2) sharia (القضايا الشرعية والأحوال الشخصية: طلاق، نفقة، حضانة، مواريث)
     3) criminal (القضايا الجزائية والجرائم الإلكترونية)
     4) commercial (القضايا التجارية وتأسيس الشركات)
     5) labor (القضايا العمالية وحقوق الموظفين)
     6) administrative (القضايا الإدارية ودوائر التنفيذ)
     7) arbitration (التحكيم والوساطة القانونية)
   - Step B: Ask TWO smart, specific clarifying questions tailored to that specialty (you can ask them together cleanly or one after another) to learn: (a) what documents/evidence they currently hold, and (b) current legal stage/deadlines (e.g., police/prosecutor complaint, bounced check protest, court summons, execution notice).
   - Step C: Ask for their Full Name and Jordanian Mobile Number (07XXXXXXXX).
   - Step D ("الصافي" Output): Once you have the specialty, core facts, documents status, name, and phone number, write a brief reassuring closing line in Arabic/English AND include a strict \`\`\`json\`\`\` block at the end of your message matching this exact schema:
\`\`\`json
{
  "clientName": "string",
  "clientPhone": "07XXXXXXXX",
  "specialtyId": "civil | sharia | criminal | commercial | labor | administrative | arbitration",
  "factsSummary": "concise 2-3 sentence structured summary (الصافي) in the conversation language",
  "documentsStatus": "what documents the client has or needs",
  "urgency": "normal | urgent",
  "recommendedMode": "in_person | online"
}
\`\`\`
Only output the \`\`\`json\`\`\` block once you actually have the client's name, phone, specialty, and core case facts.
`;

function isTransientGeminiError(err: unknown): boolean {
  const raw = err instanceof Error ? err.message : String(err ?? '');
  const status =
    typeof err === 'object' && err !== null && 'status' in err
      ? Number((err as { status?: unknown }).status)
      : 0;
  return (
    status === 503 ||
    status === 429 ||
    status === 500 ||
    /503|unavailable|high demand|overloaded|temporarily|rate limit|timeout/i.test(raw)
  );
}

function isModelNotFoundError(err: unknown): boolean {
  const raw = err instanceof Error ? err.message : String(err ?? '');
  const status =
    typeof err === 'object' && err !== null && 'status' in err
      ? Number((err as { status?: unknown }).status)
      : 0;
  return status === 404 || /404|not_found|not found|no longer available/i.test(raw);
}

const DEFAULT_PRIMARY_MODEL = 'gemini-3.1-flash-lite';
const DEFAULT_FALLBACK_MODEL = 'gemini-4-hydrogen';

let flashLiteCooldownUntil = 0;

async function generateIntakeReplyWithFallback(
  ai: GoogleGenAI,
  contents: ReturnType<typeof normalizeGeminiChatContents>,
  systemInstruction: string
) {
  const configuredModel = process.env.GEMINI_MODEL?.trim();
  const flashLiteHealthy = Date.now() >= flashLiteCooldownUntil;

  const baseAttempts: Array<{
    model: string;
    useLowThinking: boolean;
    timeoutMs: number;
    delayMs: number;
  }> = flashLiteHealthy
    ? [
        { model: DEFAULT_PRIMARY_MODEL, useLowThinking: false, timeoutMs: 8500, delayMs: 0 },
        { model: DEFAULT_PRIMARY_MODEL, useLowThinking: false, timeoutMs: 8500, delayMs: 350 },
        { model: DEFAULT_FALLBACK_MODEL, useLowThinking: true, timeoutMs: 9000, delayMs: 0 },
      ]
    : [
        { model: DEFAULT_FALLBACK_MODEL, useLowThinking: true, timeoutMs: 9000, delayMs: 0 },
        { model: DEFAULT_PRIMARY_MODEL, useLowThinking: false, timeoutMs: 8500, delayMs: 350 },
      ];

  const attempts =
    configuredModel &&
    configuredModel !== DEFAULT_PRIMARY_MODEL &&
    configuredModel !== DEFAULT_FALLBACK_MODEL
      ? [
          { model: configuredModel, useLowThinking: false, timeoutMs: 8500, delayMs: 0 },
          ...baseAttempts,
        ]
      : baseAttempts;

  let lastError: unknown = null;

  for (const attempt of attempts) {
    if (attempt.delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, attempt.delayMs));
    }

    try {
      const config = attempt.useLowThinking
        ? {
            systemInstruction,
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            abortSignal: AbortSignal.timeout(attempt.timeoutMs),
          }
        : {
            systemInstruction,
            abortSignal: AbortSignal.timeout(attempt.timeoutMs),
          };

      const response = await ai.models.generateContent({
        model: attempt.model,
        contents,
        config,
      });

      if (response.text && response.text.trim().length > 0) {
        return response;
      }
    } catch (err: unknown) {
      lastError = err;
      const status =
        typeof err === 'object' && err !== null && 'status' in err
          ? Number((err as { status?: unknown }).status)
          : 0;
      const isAbort =
        err instanceof Error && (err.name === 'TimeoutError' || err.name === 'AbortError');
      const canFallback = isAbort || isTransientGeminiError(err) || isModelNotFoundError(err);
      if (!canFallback || status === 400 || status === 401 || status === 403) {
        throw err;
      }
      if (attempt.model === DEFAULT_PRIMARY_MODEL) {
        flashLiteCooldownUntil = Date.now() + 2 * 60 * 1000;
      }
      console.warn(`Gemini model ${attempt.model} unavailable, trying fallback...`);
    }
  }

  throw lastError ?? new Error('503 UNAVAILABLE');
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
      console.error(`Telegram notification rejected with HTTP status ${telegramResponse.status}`);
      return { configured: true, delivered: false };
    }

    const result = (await telegramResponse.json()) as { ok?: boolean };
    return { configured: true, delivered: Boolean(result.ok) };
  } catch {
    console.error('Telegram notification request failed');
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
      res.setHeader('Vary', 'Origin');
      res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    }
    if (req.method === 'OPTIONS') {
      return res.status(204).end();
    }
    return next();
  });

  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => {
    const apiKey = cleanEnvValue(process.env.GEMINI_API_KEY);
    const botToken = normalizeTelegramToken(process.env.TELEGRAM_BOT_TOKEN);
    const chatId = cleanEnvValue(process.env.TELEGRAM_CHAT_ID);
    res.json({
      ok: true,
      service: 'rb-law-firm',
      runtime: process.env.VERCEL ? 'vercel-serverless' : 'node-server',
      geminiConfigured: Boolean(apiKey && apiKey !== 'MY_GEMINI_API_KEY'),
      telegramConfigured: isValidTelegramBotToken(botToken) && isValidTelegramChatId(chatId),
    });
  });

  app.get('/api/dashboard-data', (_req, res) => {
    const db = readDb();
    res.json(db);
  });

  app.post('/api/bookings', (req, res) => {
    const {
      clientName,
      clientPhone,
      specialtyId,
      mode,
      date,
      timeSlot,
      paymentMethod,
      paymentReference,
      otpCode,
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
    if (!otpCode || !/^\d{4,6}$/.test(String(otpCode).trim())) {
      return res.status(400).json({ error: 'Invalid SMS OTP verification code' });
    }

    const consultationMode = mode === 'online' ? 'online' : 'in_person';
    const validSpec = (specialtyId || 'civil') as SpecialtyId;
    const db = readDb();

    const newBooking: ConsultationBooking = {
      id: `bk-${Date.now()}`,
      referenceCode: `RB-${String(Math.floor(10000 + Math.random() * 89999))}`,
      clientName: clientName.trim(),
      clientPhone: cleanPhone,
      specialtyId: validSpec,
      mode: consultationMode,
      date: String(date),
      timeSlot: String(timeSlot),
      feeJod: getConsultationFee(consultationMode),
      paymentMethod: paymentMethod === 'card' || paymentMethod === 'cliq' ? paymentMethod : 'free',
      paymentReference: String(paymentReference || 'FREE').trim(),
      otpVerified: true,
      caseSummary: caseSummary ? String(caseSummary).trim() : undefined,
      status: 'confirmed',
      assignedLawyer: getLawyerForSpecialty(validSpec, db.lawyers),
      createdAt: new Date().toISOString(),
    };

    db.bookings.unshift(newBooking);
    writeDb(db);
    return res.status(201).json({ booking: newBooking });
  });

  app.patch('/api/bookings/:id', (req, res) => {
    const { id } = req.params;
    const { status, assignedLawyer } = req.body ?? {};
    const allowed: BookingStatus[] = ['pending', 'confirmed', 'completed', 'cancelled'];
    const db = readDb();
    const target = db.bookings.find((b) => b.id === id);
    if (!target) {
      return res.status(404).json({ error: 'Booking not found' });
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
    writeDb(db);
    return res.json({ booking: target });
  });

  app.post('/api/cases', (req, res) => {
    const {
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

    const spec = (specialtyId || 'civil') as SpecialtyId;
    const db = readDb();
    const newCase: LegalCase = {
      id: `cs-${Date.now()}`,
      caseNumber: `IRB-${spec.slice(0, 3).toUpperCase()}-2026/${Math.floor(100 + Math.random() * 899)}`,
      clientName: String(clientName).trim(),
      clientPhone: sanitizeJordanianPhone(String(clientPhone ?? '0790000000')),
      specialtyId: spec,
      courtName: courtName ? String(courtName).trim() : getCourtForSpecialty(spec),
      assignedLawyer: assignedLawyer
        ? String(assignedLawyer).trim()
        : getLawyerForSpecialty(spec, db.lawyers),
      stage: (stage || 'intake') as CaseStage,
      nextHearingDate: nextHearingDate ? String(nextHearingDate) : '2026-11-28',
      summary: String(summary).trim(),
      updatedAt: new Date().toISOString(),
    };

    db.cases.unshift(newCase);
    if (intakeId) {
      const intake = db.intakes.find((i) => i.id === intakeId);
      if (intake) {
        intake.convertedToCaseId = newCase.id;
      }
    }
    writeDb(db);
    return res.status(201).json({ legalCase: newCase });
  });

  app.patch('/api/cases/:id', (req, res) => {
    const { id } = req.params;
    const { stage, nextHearingDate, assignedLawyer } = req.body ?? {};
    const allowedStages: CaseStage[] = ['intake', 'drafting', 'litigation', 'execution', 'closed'];
    const db = readDb();
    const target = db.cases.find((c) => c.id === id);
    if (!target) {
      return res.status(404).json({ error: 'Case not found' });
    }
    if (stage && allowedStages.includes(stage)) {
      target.stage = stage;
    }
    if (nextHearingDate) {
      target.nextHearingDate = String(nextHearingDate);
    }
    if (typeof assignedLawyer === 'string' && assignedLawyer.trim().length >= 2) {
      target.assignedLawyer = assignedLawyer.trim().slice(0, 120);
    }
    target.updatedAt = new Date().toISOString();
    writeDb(db);
    return res.json({ legalCase: target });
  });

  app.get('/api/lawyers', (_req, res) => {
    const db = readDb();
    return res.json({ lawyers: db.lawyers });
  });

  app.post('/api/lawyers', (req, res) => {
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
    writeDb(db);
    return res.status(201).json({ lawyer: newLawyer });
  });

  app.patch('/api/lawyers/:id', (req, res) => {
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
          if (c.assignedLawyer.trim() === previousName.trim()) {
            c.assignedLawyer = nextName;
          }
        }
        for (const b of db.bookings) {
          if (b.assignedLawyer.trim() === previousName.trim()) {
            b.assignedLawyer = nextName;
          }
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
    if (typeof canManageRoles === 'boolean') {
      target.canManageRoles = canManageRoles;
    }
    if (Array.isArray(specialties)) {
      const validSpecs = specialties.filter((s): s is SpecialtyId =>
        VALID_SPECIALTY_IDS.includes(s as SpecialtyId)
      );
      if (validSpecs.length > 0) {
        target.specialties = validSpecs;
      }
    }
    if (status === 'active' || status === 'on_leave') {
      target.status = status as LawyerStatus;
    }

    writeDb(db);
    return res.json({ lawyer: target, cases: db.cases, bookings: db.bookings });
  });

  app.delete('/api/lawyers/:id', (req, res) => {
    const { id } = req.params;
    const reassignToLawyerName =
      typeof req.body?.reassignToLawyerName === 'string'
        ? req.body.reassignToLawyerName.trim()
        : '';

    const db = readDb();
    const targetIdx = db.lawyers.findIndex((l) => l.id === id);
    if (targetIdx === -1) {
      return res.status(404).json({ error: 'Lawyer not found' });
    }
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

  app.post('/api/admin/transfer-cases', (req, res) => {
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

    writeDb(db);
    return res.json({
      transferredCases,
      transferredBookings,
      cases: db.cases,
      bookings: db.bookings,
    });
  });

  app.post('/api/intakes', (req, res) => {
    const {
      clientName,
      clientPhone,
      specialtyId,
      factsSummary,
      documentsStatus,
      urgency,
      recommendedMode,
    } = req.body ?? {};

    if (!clientName || !factsSummary) {
      return res.status(400).json({ error: 'Missing intake fields' });
    }

    const db = readDb();
    const intake: IntakeSummary = {
      id: `in-${Date.now()}`,
      clientName: String(clientName).trim(),
      clientPhone: sanitizeJordanianPhone(String(clientPhone ?? '0790000000')),
      specialtyId: (specialtyId || 'civil') as SpecialtyId,
      factsSummary: String(factsSummary).trim(),
      documentsStatus: String(documentsStatus || 'قيد التحقق').trim(),
      urgency: urgency === 'urgent' ? 'urgent' : 'normal',
      recommendedMode: recommendedMode === 'online' ? 'online' : 'in_person',
      createdAt: new Date().toISOString(),
    };
    db.intakes.unshift(intake);
    writeDb(db);
    return res.status(201).json({ intake });
  });

  app.get('/api/inquiries', (_req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const db = readDb();
    return res.json({ inquiries: db.inquiries });
  });

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

  app.post('/api/intake-chat', async (req, res) => {
    const apiKey = cleanEnvValue(process.env.GEMINI_API_KEY);
    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
      return res.status(503).json({
        error:
          'GEMINI_API_KEY is not configured in Environment Variables. Please add a valid Gemini API key.',
      });
    }

    const { messages, lang, preselectedSpecialty } = req.body ?? {};
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

    const contents = normalizeGeminiChatContents(messages);
    if (contents.length === 0) {
      return res.status(400).json({ error: 'At least one user message is required' });
    }

    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const contextHint = preselectedSpecialty
        ? `\n[Context: UI language is "${lang === 'en' ? 'en' : 'ar'}". User pre-selected specialty: "${preselectedSpecialty}".]`
        : `\n[Context: UI language is "${lang === 'en' ? 'en' : 'ar'}".]`;

      const response = await generateIntakeReplyWithFallback(
        ai,
        contents,
        INTAKE_SYSTEM_INSTRUCTION + contextHint
      );

      const replyText = response.text ?? '';
      const parsedSummary = parseSafiSummaryBlock(
        replyText,
        (preselectedSpecialty as SpecialtyId) || 'civil'
      );

      let savedIntake: IntakeSummary | null = null;
      if (parsedSummary) {
        const db = readDb();
        savedIntake = {
          id: `in-${Date.now()}`,
          ...parsedSummary,
          createdAt: new Date().toISOString(),
        };
        db.intakes.unshift(savedIntake);
        writeDb(db);
      }

      return res.json({
        reply: replyText,
        summary: savedIntake,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Gemini request failed';
      console.error('Gemini intake error:', message);
      return res.status(502).json({ error: message });
    }
  });

  app.use('/api', (_req, res) => {
    return res.status(404).json({ error: 'API route not found' });
  });

  return app;
}
