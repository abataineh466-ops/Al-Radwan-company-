import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeDashboardMetrics,
  extractOtpFromClipboard,
  extractPaymentRefFromClipboard,
  filterBookings,
  filterCases,
  formatJodCurrency,
  getConsultationFee,
  isValidJordanianPhone,
  parseSafiSummaryBlock,
  sanitizeJordanianPhone,
  stripSafiJsonBlock,
  validateBookingCheckout,
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
