import type {
  BookingStatus,
  CaseStage,
  ConsultationBooking,
  ConsultationMode,
  IntakeSummary,
  Language,
  LegalCase,
  PaymentMethod,
  SpecialtyId,
} from '../types/legal.js';

export const CONSULTATION_FEES_JOD: Record<ConsultationMode, number> = {
  in_person: 0,
  online: 0,
};

export function getConsultationFee(mode: ConsultationMode): number {
  return CONSULTATION_FEES_JOD[mode];
}

export function formatJodCurrency(amount: number, lang: Language): string {
  if (amount <= 0) {
    return lang === 'ar' ? 'مجانية' : 'Free';
  }
  const formatted = amount.toFixed(2);
  return lang === 'ar' ? `${formatted} د.أ` : `${formatted} JOD`;
}

export function sanitizeJordanianPhone(input: string): string {
  const digits = input.replace(/[^\d+]/g, '');
  if (digits.startsWith('+962')) {
    return `0${digits.slice(4)}`;
  }
  if (digits.startsWith('00962')) {
    return `0${digits.slice(5)}`;
  }
  if (digits.startsWith('962')) {
    return `0${digits.slice(3)}`;
  }
  return digits.replace(/\+/g, '');
}

export function isValidJordanianPhone(input: string): boolean {
  const normalized = sanitizeJordanianPhone(input);
  return /^07[789]\d{7}$/.test(normalized);
}

export function extractOtpFromClipboard(rawText: string): string {
  const sixDigitMatch = rawText.match(/\b(\d{6})\b/);
  if (sixDigitMatch) {
    return sixDigitMatch[1];
  }
  const fourToSixDigits = rawText.replace(/\D/g, '').slice(0, 6);
  return fourToSixDigits;
}

export function extractPaymentRefFromClipboard(rawText: string): string {
  const cleaned = rawText.trim().replace(/[\r\n]+/g, ' ');
  const cliqRefMatch = cleaned.match(
    /\b((?:[A-Z]{2,8}-\d{3,14})|(?=[A-Z0-9-]*\d)[A-Z0-9]{4,}-[A-Z0-9]{2,}|\d{6,14})\b/i
  );
  if (cliqRefMatch) {
    return cliqRefMatch[1].toUpperCase().slice(0, 24);
  }
  return cleaned.slice(0, 24);
}

export function validateBookingCheckout(params: {
  clientName: string;
  clientPhone: string;
  date: string;
  timeSlot: string;
  paymentMethod?: PaymentMethod;
  paymentReference?: string;
  otpCode?: string;
}): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (params.clientName.trim().length < 3) {
    errors.push('invalid_name');
  }
  if (!isValidJordanianPhone(params.clientPhone)) {
    errors.push('invalid_phone');
  }
  if (!params.date.trim() || !params.timeSlot.trim()) {
    errors.push('missing_schedule');
  }
  if (params.otpCode !== undefined && !/^\d{4,6}$/.test(params.otpCode.trim())) {
    errors.push('invalid_otp');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function parseSafiSummaryBlock(
  text: string,
  fallbackSpecialty: SpecialtyId = 'civil'
): Omit<IntakeSummary, 'id' | 'createdAt'> | null {
  const jsonBlockMatch = text.match(/```json\s*([\s\S]*?)```/i);
  const rawJson = jsonBlockMatch ? jsonBlockMatch[1] : null;
  if (!rawJson) return null;

  try {
    const parsed = JSON.parse(rawJson) as Partial<{
      clientName: string;
      clientPhone: string;
      specialtyId: SpecialtyId;
      factsSummary: string;
      documentsStatus: string;
      urgency: 'normal' | 'urgent';
      recommendedMode: ConsultationMode;
    }>;

    if (!parsed.clientName || !parsed.factsSummary) {
      return null;
    }

    const validSpecialties: SpecialtyId[] = [
      'civil',
      'sharia',
      'criminal',
      'commercial',
      'labor',
      'administrative',
      'arbitration',
    ];
    const specialtyId = validSpecialties.includes(parsed.specialtyId as SpecialtyId)
      ? (parsed.specialtyId as SpecialtyId)
      : fallbackSpecialty;

    return {
      clientName: parsed.clientName.trim(),
      clientPhone: sanitizeJordanianPhone(parsed.clientPhone ?? '') || '0796251902',
      specialtyId,
      factsSummary: parsed.factsSummary.trim(),
      documentsStatus: parsed.documentsStatus?.trim() || 'قيد المراجعة مع الفريق',
      urgency: parsed.urgency === 'urgent' ? 'urgent' : 'normal',
      recommendedMode: parsed.recommendedMode === 'online' ? 'online' : 'in_person',
    };
  } catch {
    return null;
  }
}

export function stripSafiJsonBlock(text: string): string {
  return text.replace(/```json\s*[\s\S]*?```/gi, '').trim();
}

export function filterBookings(
  bookings: ConsultationBooking[],
  statusFilter: BookingStatus | 'all',
  query: string
): ConsultationBooking[] {
  const normalizedQuery = query.trim().toLowerCase();
  return bookings.filter((item) => {
    const statusOk = statusFilter === 'all' || item.status === statusFilter;
    const queryOk =
      !normalizedQuery ||
      item.clientName.toLowerCase().includes(normalizedQuery) ||
      item.referenceCode.toLowerCase().includes(normalizedQuery) ||
      item.clientPhone.includes(normalizedQuery);
    return statusOk && queryOk;
  });
}

export function filterCases(
  cases: LegalCase[],
  stageFilter: CaseStage | 'all',
  specialtyFilter: SpecialtyId | 'all',
  query: string
): LegalCase[] {
  const normalizedQuery = query.trim().toLowerCase();
  return cases.filter((item) => {
    const stageOk = stageFilter === 'all' || item.stage === stageFilter;
    const specOk = specialtyFilter === 'all' || item.specialtyId === specialtyFilter;
    const queryOk =
      !normalizedQuery ||
      item.clientName.toLowerCase().includes(normalizedQuery) ||
      item.caseNumber.toLowerCase().includes(normalizedQuery) ||
      item.courtName.toLowerCase().includes(normalizedQuery);
    return stageOk && specOk && queryOk;
  });
}

export function computeDashboardMetrics(
  bookings: ConsultationBooking[],
  cases: LegalCase[],
  intakes: IntakeSummary[]
) {
  const upcomingBookings = bookings.filter(
    (b) => b.status === 'pending' || b.status === 'confirmed'
  ).length;
  const completedBookings = bookings.filter((b) => b.status === 'completed').length;
  const activeCases = cases.filter((c) => c.stage !== 'closed').length;
  const unconvertedIntakes = intakes.filter((i) => !i.convertedToCaseId).length;

  return {
    upcomingBookings,
    completedBookings,
    activeCases,
    unconvertedIntakes,
  };
}

export const ADMIN_SESSION_STORAGE_KEY = 'rb_law_admin_authenticated';

export function isAdminHashRoute(hash: string): boolean {
  const normalized = hash.trim().toLowerCase();
  return (
    normalized === '#admin' ||
    normalized.startsWith('#admin/') ||
    normalized.startsWith('#admin?')
  );
}

const INVISIBLE_BIDI_AND_ZW_REGEX = /[\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g;

export function normalizeArabicDigits(input: string): string {
  return input
    .replace(/[\u0660-\u0669]/g, (ch) => String(ch.charCodeAt(0) - 0x0660))
    .replace(/[\u06F0-\u06F9]/g, (ch) => String(ch.charCodeAt(0) - 0x06f0));
}

function normalizeCredentialInput(input: string): string {
  return normalizeArabicDigits(input)
    .replace(INVISIBLE_BIDI_AND_ZW_REGEX, '')
    .trim()
    .toLowerCase();
}

export function verifyAdminCredentials(username: string, password: string): boolean {
  const normalizedUser = normalizeCredentialInput(username);
  const normalizedPass = normalizeCredentialInput(password);
  return normalizedUser === 'alradwan' && normalizedPass === 'radwan2026';
}

export const VALID_SPECIALTY_IDS: readonly SpecialtyId[] = [
  'civil',
  'sharia',
  'criminal',
  'commercial',
  'labor',
  'administrative',
  'arbitration',
] as const;

export const SPECIALTY_LABELS_AR: Record<SpecialtyId, string> = {
  civil: 'القضايا المدنية والحقوقية',
  sharia: 'القضايا الشرعية والأحوال الشخصية',
  criminal: 'القضايا الجزائية والجرائم الإلكترونية',
  commercial: 'القضايا التجارية وتأسيس الشركات',
  labor: 'القضايا العمالية وحقوق الموظفين',
  administrative: 'القضايا الإدارية ودوائر التنفيذ',
  arbitration: 'التحكيم والوساطة القانونية',
};

export function normalizeSpecialtyId(value: unknown): SpecialtyId {
  if (typeof value === 'string' && VALID_SPECIALTY_IDS.includes(value as SpecialtyId)) {
    return value as SpecialtyId;
  }
  return 'civil';
}

export function isValidTelegramBotToken(token: string): boolean {
  return /^\d{5,15}:[A-Za-z0-9_-]{20,80}$/.test(token.trim());
}

export function isValidTelegramChatId(chatId: string): boolean {
  return /^-?\d{5,20}$/.test(chatId.trim()) || /^@[A-Za-z0-9_]{5,32}$/.test(chatId.trim());
}

export function formatTelegramInquiryMessage(params: {
  name: string;
  phone: string;
  specialtyId: SpecialtyId;
  message: string;
}): string {
  const cleanName = params.name.trim().slice(0, 120);
  const cleanPhone = sanitizeJordanianPhone(params.phone);
  const specialtyLabel = SPECIALTY_LABELS_AR[normalizeSpecialtyId(params.specialtyId)];
  const cleanMessage = params.message.trim().slice(0, 2000);

  return [
    '📩 رسالة جديدة من موقع شركة الرضوان للمحاماة',
    '────────────────────',
    `👤 الاسم: ${cleanName}`,
    `📞 رقم الهاتف: ${cleanPhone}`,
    `⚖️ نوع القضية: ${specialtyLabel}`,
    `📝 نص الرسالة:\n${cleanMessage}`,
  ].join('\n');
}

export function buildTelegramSendMessagePayload(
  chatId: string,
  params: {
    name: string;
    phone: string;
    specialtyId: SpecialtyId;
    message: string;
  }
): { chat_id: string; text: string } {
  return {
    chat_id: chatId.trim(),
    text: formatTelegramInquiryMessage(params),
  };
}

export interface NormalizedGeminiContent {
  role: 'user' | 'model';
  parts: Array<{ text: string }>;
}

/**
 * Ensures Gemini multi-turn contents always start with a user message
 * and strictly alternate between user and model turns.
 */
export function normalizeGeminiChatContents(
  messages: Array<{ role: string; text: string }>
): NormalizedGeminiContent[] {
  const normalized: NormalizedGeminiContent[] = [];

  for (const raw of messages) {
    const text = String(raw?.text ?? '').trim();
    if (!text) continue;
    const role: 'user' | 'model' = raw.role === 'assistant' || raw.role === 'model' ? 'model' : 'user';

    // Gemini generateContent expects the conversation to begin with a user turn.
    if (normalized.length === 0 && role === 'model') {
      continue;
    }

    const last = normalized[normalized.length - 1];
    if (last && last.role === role) {
      last.parts[0].text = `${last.parts[0].text}\n\n${text}`;
    } else {
      normalized.push({ role, parts: [{ text }] });
    }
  }

  return normalized;
}

export function formatFriendlyAiError(rawMessage: string, lang: Language): string {
  const lower = rawMessage.toLowerCase();

  if (
    lower.includes('503') ||
    lower.includes('unavailable') ||
    lower.includes('high demand') ||
    lower.includes('overloaded')
  ) {
    return lang === 'ar'
      ? 'المساعد الذكي يشهد ضغطاً مؤقتاً الآن. يرجى الضغط على "إعادة المحاولة" بعد لحظات أو التواصل مباشرة على 0796251902.'
      : 'The AI assistant is experiencing temporary high demand. Please tap Retry in a moment or call 0796251902.';
  }

  if (lower.includes('429') || lower.includes('resource_exhausted') || lower.includes('quota')) {
    return lang === 'ar'
      ? 'تم تجاوز الحد المؤقت لطلبات المساعد الذكي. يرجى المحاولة بعد قليل أو حجز استشارتك المجانية مباشرة.'
      : 'Temporary rate limit reached. Please try again shortly or book your free consultation directly.';
  }

  if (
    lower.includes('api_key') ||
    lower.includes('permission_denied') ||
    lower.includes('403') ||
    lower.includes('not configured')
  ) {
    return lang === 'ar'
      ? 'خدمة المساعد الذكي غير مفعّلة حالياً في إعدادات الخادم. يمكنك حجز استشارتك المجانية أو التواصل مباشرة على 0796251902.'
      : 'The AI assistant service is not configured on this server yet. Please book a free consultation or call 0796251902.';
  }

  if (lower.includes('unexpected token') || lower.includes('404') || lower.includes('failed to fetch')) {
    return lang === 'ar'
      ? 'تعذر الاتصال بخادم المساعد الذكي حالياً. تأكد من اتصالك بالإنترنت أو استخدم زر حجز الاستشارة المجانية.'
      : 'Unable to reach the AI assistant server right now. Please check your connection or book a free consultation directly.';
  }

  return lang === 'ar'
    ? 'حدث خطأ مؤقت أثناء معالجة رسالتك. يرجى إعادة المحاولة.'
    : 'A temporary error occurred while processing your message. Please try again.';
}
