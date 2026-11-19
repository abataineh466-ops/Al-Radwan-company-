import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import type {
  BookingStatus,
  CaseStage,
  ConsultationBooking,
  ContactInquiry,
  IntakeSummary,
  LegalCase,
  SpecialtyId,
} from './src/types/legal';
import {
  getConsultationFee,
  isValidJordanianPhone,
  parseSafiSummaryBlock,
  sanitizeJordanianPhone,
} from './src/utils/legalWorkflow';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const DATA_DIR = path.resolve(__dirname, '.data');
const DB_FILE = path.join(DATA_DIR, 'firm-db.json');

interface FirmDatabase {
  bookings: ConsultationBooking[];
  cases: LegalCase[];
  intakes: IntakeSummary[];
  inquiries: ContactInquiry[];
}

function getSeedDatabase(): FirmDatabase {
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
        factsSummary: 'فصل تعسفي من شركة لوجستية في إربد بعد 4 سنوات خدمة دون إنذار أو صرف بدل الإجازات.',
        documentsStatus: 'عقد العمل وكشف الضمان الاجتماعي متوفران',
        urgency: 'urgent',
        recommendedMode: 'in_person',
        createdAt: '2026-11-17T09:45:00.000Z',
      },
    ],
    inquiries: [],
  };
}

function readDb(): FirmDatabase {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_FILE)) {
    const seed = getSeedDatabase();
    fs.writeFileSync(DB_FILE, JSON.stringify(seed, null, 2), 'utf8');
    return seed;
  }
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf8');
    return JSON.parse(raw) as FirmDatabase;
  } catch {
    const seed = getSeedDatabase();
    fs.writeFileSync(DB_FILE, JSON.stringify(seed, null, 2), 'utf8');
    return seed;
  }
}

function writeDb(db: FirmDatabase): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
}

function getLawyerForSpecialty(specialtyId: SpecialtyId): string {
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

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, service: 'rb-law-firm' });
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
      assignedLawyer: getLawyerForSpecialty(validSpec),
      createdAt: new Date().toISOString(),
    };

    db.bookings.unshift(newBooking);
    writeDb(db);
    return res.status(201).json({ booking: newBooking });
  });

  app.patch('/api/bookings/:id', (req, res) => {
    const { id } = req.params;
    const { status } = req.body ?? {};
    const allowed: BookingStatus[] = ['pending', 'confirmed', 'completed', 'cancelled'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ error: 'Invalid booking status' });
    }
    const db = readDb();
    const target = db.bookings.find((b) => b.id === id);
    if (!target) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    target.status = status;
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
      assignedLawyer: assignedLawyer ? String(assignedLawyer).trim() : getLawyerForSpecialty(spec),
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
    const { stage, nextHearingDate } = req.body ?? {};
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
    target.updatedAt = new Date().toISOString();
    writeDb(db);
    return res.json({ legalCase: target });
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

  app.post('/api/inquiries', (req, res) => {
    const { name, phone, specialtyId, message } = req.body ?? {};
    if (!name || !phone || !message) {
      return res.status(400).json({ error: 'Name, phone, and message are required' });
    }
    const cleanPhone = sanitizeJordanianPhone(String(phone));
    if (!isValidJordanianPhone(cleanPhone)) {
      return res.status(400).json({ error: 'Invalid Jordanian phone number' });
    }
    const db = readDb();
    const inquiry: ContactInquiry = {
      id: `inq-${Date.now()}`,
      name: String(name).trim(),
      phone: cleanPhone,
      specialtyId: (specialtyId || 'civil') as SpecialtyId,
      message: String(message).trim(),
      createdAt: new Date().toISOString(),
    };
    db.inquiries.unshift(inquiry);
    writeDb(db);
    return res.status(201).json({ inquiry });
  });

  app.post('/api/intake-chat', async (req, res) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
      return res.status(503).json({
        error:
          'GEMINI_API_KEY is not configured in Settings > Secrets. Please add a valid Gemini API key.',
      });
    }

    const { messages, lang, preselectedSpecialty } = req.body ?? {};
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Messages array is required' });
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

      const contents = messages.map((m: { role: string; text: string }) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: String(m.text ?? '') }],
      }));

      const contextHint = preselectedSpecialty
        ? `\n[Context: UI language is "${lang === 'en' ? 'en' : 'ar'}". User pre-selected specialty: "${preselectedSpecialty}".]`
        : `\n[Context: UI language is "${lang === 'en' ? 'en' : 'ar'}".]`;

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents,
        config: {
          systemInstruction: INTAKE_SYSTEM_INSTRUCTION + contextHint,
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        },
      });

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

  const httpServer = http.createServer(app);

  if (process.env.NODE_ENV !== 'production') {
    const viteReady = import('vite').then(({ createServer: createViteServer }) =>
      createViteServer({
        server: {
          middlewareMode: true,
          hmr: process.env.DISABLE_HMR === 'true' ? false : { server: httpServer },
        },
        appType: 'spa',
      })
    );

    app.use(async (req, res, next) => {
      try {
        const vite = await viteReady;
        vite.middlewares(req, res, next);
      } catch (err) {
        next(err);
      }
    });
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`R.B Law Firm server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
