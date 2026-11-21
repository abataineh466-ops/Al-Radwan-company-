import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildTelegramSendMessagePayload,
  computeDashboardMetrics,
  extractOtpFromClipboard,
  extractPaymentRefFromClipboard,
  filterBookings,
  filterCases,
  formatFriendlyAiError,
  formatJodCurrency,
  formatTelegramInquiryMessage,
  getConsultationFee,
  isAdminHashRoute,
  isValidJordanianPhone,
  isValidTelegramBotToken,
  isValidTelegramChatId,
  normalizeGeminiChatContents,
  normalizeSpecialtyId,
  parseSafiSummaryBlock,
  sanitizeJordanianPhone,
  stripSafiJsonBlock,
  validateBookingCheckout,
  verifyAdminCredentials,
} from './legalWorkflow';
import type { ConsultationBooking, IntakeSummary, LegalCase } from '../types/legal';

test('consultations are free and formatted cleanly in Arabic and English', () => {
  assert.equal(getConsultationFee('in_person'), 0);
  assert.equal(getConsultationFee('online'), 0);
  assert.equal(formatJodCurrency(0, 'ar'), 'مجانية');
  assert.equal(formatJodCurrency(0, 'en'), 'Free');
});

test('Jordanian phone normalization and validation', () => {
  assert.equal(sanitizeJordanianPhone('+962 79 625 1902'), '0796251902');
  assert.equal(sanitizeJordanianPhone('00962785551122'), '0785551122');
  assert.equal(isValidJordanianPhone('+962771234567'), true);
  assert.equal(isValidJordanianPhone('0796251902'), true);
  assert.equal(isValidJordanianPhone('061234567'), false);
  assert.equal(isValidJordanianPhone('12345'), false);
});

test('smart clipboard extraction for SMS OTP and references', () => {
  assert.equal(
    extractOtpFromClipboard('Your Al-Radwan verification code is 482910. Do not share.'),
    '482910'
  );
  assert.equal(
    extractPaymentRefFromClipboard('Booking Ref: RB-994821 Confirmed'),
    'RB-994821'
  );
});

test('free booking checkout validation checks client details, schedule, and SMS OTP', () => {
  const validBooking = validateBookingCheckout({
    clientName: 'خالد المومني',
    clientPhone: '0796251902',
    date: '2026-11-20',
    timeSlot: '11:00',
    paymentMethod: 'free',
    otpCode: '654321',
  });
  assert.equal(validBooking.valid, true);
  assert.deepEqual(validBooking.errors, []);

  const invalidBooking = validateBookingCheckout({
    clientName: 'أ',
    clientPhone: '123',
    date: '',
    timeSlot: '',
    paymentMethod: 'free',
    otpCode: '12',
  });
  assert.equal(invalidBooking.valid, false);
  assert.ok(invalidBooking.errors.includes('invalid_name'));
  assert.ok(invalidBooking.errors.includes('invalid_phone'));
  assert.ok(invalidBooking.errors.includes('missing_schedule'));
  assert.ok(invalidBooking.errors.includes('invalid_otp'));
});

test('Al-Safi summary JSON parser and cleaner', () => {
  const modelReply = `تم إعداد الصافي الأولي لقضيتك:
\`\`\`json
{
  "clientName": "سارة الحسين",
  "clientPhone": "+962798877665",
  "specialtyId": "sharia",
  "factsSummary": "مطالبة بنفقة وحضانة أطفال بعد انفصال منذ 3 أشهر.",
  "documentsStatus": "عقد الزواج وشهادات الميلاد متوفرة",
  "urgency": "urgent",
  "recommendedMode": "in_person"
}
\`\`\``;

  const parsed = parseSafiSummaryBlock(modelReply);
  assert.ok(parsed);
  assert.equal(parsed.clientName, 'سارة الحسين');
  assert.equal(parsed.clientPhone, '0798877665');
  assert.equal(parsed.specialtyId, 'sharia');
  assert.equal(parsed.urgency, 'urgent');
  assert.equal(stripSafiJsonBlock(modelReply), 'تم إعداد الصافي الأولي لقضيتك:');
});

test('dashboard filtering and KPI metrics computation', () => {
  const bookings: ConsultationBooking[] = [
    {
      id: 'b1',
      referenceCode: 'RB-101',
      clientName: 'أحمد العزام',
      clientPhone: '0791112233',
      specialtyId: 'civil',
      mode: 'in_person',
      date: '2026-11-20',
      timeSlot: '10:00',
      feeJod: 0,
      paymentMethod: 'free',
      paymentReference: 'FREE',
      otpVerified: true,
      status: 'confirmed',
      assignedLawyer: 'المحامي رضوان علي البطاينة',
      createdAt: '2026-11-17T08:00:00Z',
    },
    {
      id: 'b2',
      referenceCode: 'RB-102',
      clientName: 'Lina Haddad',
      clientPhone: '0782223344',
      specialtyId: 'commercial',
      mode: 'online',
      date: '2026-11-21',
      timeSlot: '13:00',
      feeJod: 0,
      paymentMethod: 'free',
      paymentReference: 'FREE',
      otpVerified: true,
      status: 'completed',
      assignedLawyer: 'المحامية ليالي خريسات',
      createdAt: '2026-11-17T09:00:00Z',
    },
  ];
  const cases: LegalCase[] = [
    {
      id: 'c1',
      caseNumber: 'IR-2026-441',
      clientName: 'أحمد العزام',
      clientPhone: '0791112233',
      specialtyId: 'civil',
      courtName: 'محكمة بداية إربد',
      assignedLawyer: 'المحامي رضوان علي البطاينة',
      stage: 'litigation',
      nextHearingDate: '2026-11-25',
      summary: 'مطالبة مالية وشيك مرتجع',
      updatedAt: '2026-11-17T08:00:00Z',
    },
  ];
  const intakes: IntakeSummary[] = [
    {
      id: 'i1',
      clientName: 'يزن الشريدة',
      clientPhone: '0775556677',
      specialtyId: 'labor',
      factsSummary: 'فصل تعسفي دون إشعار',
      documentsStatus: 'عقد العمل متوفر',
      urgency: 'normal',
      recommendedMode: 'online',
      createdAt: '2026-11-17T10:00:00Z',
    },
  ];

  assert.equal(filterBookings(bookings, 'confirmed', 'أحمد').length, 1);
  assert.equal(filterCases(cases, 'litigation', 'civil', 'بداية إربد').length, 1);

  const metrics = computeDashboardMetrics(bookings, cases, intakes);
  assert.equal(metrics.upcomingBookings, 1);
  assert.equal(metrics.completedBookings, 1);
  assert.equal(metrics.activeCases, 1);
  assert.equal(metrics.unconvertedIntakes, 1);
});

test('private #admin hash detection and lawyer login credentials verification', () => {
  assert.equal(isAdminHashRoute('#admin'), true);
  assert.equal(isAdminHashRoute('#ADMIN'), true);
  assert.equal(isAdminHashRoute('#admin/cases'), true);
  assert.equal(isAdminHashRoute('#about'), false);
  assert.equal(isAdminHashRoute(''), false);

  assert.equal(verifyAdminCredentials('alradwan', 'radwan2026'), true);
  assert.equal(verifyAdminCredentials('  AlRadwan  ', 'radwan2026'), true);
  assert.equal(verifyAdminCredentials('Alradwan', ' Radwan2026 '), true);
  assert.equal(verifyAdminCredentials('alradwan', 'radwan٢٠٢٦'), true);
  assert.equal(verifyAdminCredentials('\u200Falradwan\u200E', '\u200Fradwan2026\u200B'), true);
  assert.equal(verifyAdminCredentials('alradwan', 'wrongpass'), false);
  assert.equal(verifyAdminCredentials('radwan', 'AlRadwan2026'), false);
  assert.equal(verifyAdminCredentials('', ''), false);
});

test('Telegram inquiry message formatting and credential format validation', () => {
  assert.equal(normalizeSpecialtyId('sharia'), 'sharia');
  assert.equal(normalizeSpecialtyId('invalid_value'), 'civil');

  assert.equal(isValidTelegramBotToken('123456789:AAExample_Valid_Token_Value_12345'), true);
  assert.equal(isValidTelegramBotToken('not-a-valid-token'), false);
  assert.equal(isValidTelegramBotToken(''), false);

  assert.equal(isValidTelegramChatId('1002003004'), true);
  assert.equal(isValidTelegramChatId('-1001234567890'), true);
  assert.equal(isValidTelegramChatId('@alradwan_alerts'), true);
  assert.equal(isValidTelegramChatId('bad chat id!'), false);

  const message = formatTelegramInquiryMessage({
    name: '  محمد العزام  ',
    phone: '+962 79 123 4567',
    specialtyId: 'commercial',
    message: '  أرغب في استشارة حول تأسيس شركة ذات مسؤولية محدودة.  ',
  });
  assert.ok(message.includes('محمد العزام'));
  assert.ok(message.includes('0791234567'));
  assert.ok(message.includes('القضايا التجارية وتأسيس الشركات'));
  assert.ok(message.includes('تأسيس شركة ذات مسؤولية محدودة'));

  const payload = buildTelegramSendMessagePayload(' 1002003004 ', {
    name: 'محمد العزام',
    phone: '0791234567',
    specialtyId: 'civil',
    message: 'استفسار حول شيك مرتجع.',
  });
  assert.equal(payload.chat_id, '1002003004');
  assert.ok(payload.text.includes('استفسار حول شيك مرتجع.'));
});

test('Gemini chat normalization strips leading model welcome and merges consecutive user turns', () => {
  const normalized = normalizeGeminiChatContents([
    { role: 'assistant', text: 'أهلاً بك في شركة الرضوان' },
    { role: 'user', text: 'عندي قضية شيك مرتجع' },
    { role: 'user', text: 'قيمته 5000 دينار' },
    { role: 'assistant', text: 'هل لديك ورقة اعتراض من البنك؟' },
    { role: 'user', text: 'نعم موجودة' },
  ]);

  assert.equal(normalized.length, 3);
  assert.equal(normalized[0].role, 'user');
  assert.equal(normalized[0].parts[0].text, 'عندي قضية شيك مرتجع\n\nقيمته 5000 دينار');
  assert.equal(normalized[1].role, 'model');
  assert.equal(normalized[2].role, 'user');

  const ar503 = formatFriendlyAiError(
    '{"error":{"code":503,"message":"This model is currently experiencing high demand"}}',
    'ar'
  );
  assert.ok(ar503.includes('ضغطاً مؤقتاً'));
  assert.ok(!ar503.includes('{'));

  const en429 = formatFriendlyAiError('RESOURCE_EXHAUSTED 429', 'en');
  assert.ok(en429.toLowerCase().includes('rate limit'));
});
