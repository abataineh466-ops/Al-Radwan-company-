import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeAdminFirmAnalytics,
  normalizeLawyerRole,
  pickRecommendedLawyerForSpecialty,
} from './adminAnalytics.ts';
import type {
  ConsultationBooking,
  ContactInquiry,
  FirmLawyer,
  IntakeSummary,
  LegalCase,
} from '../types/legal.ts';

const sampleLawyers: FirmLawyer[] = [
  {
    id: 'law-radwan',
    name: 'المحامي رضوان علي البطاينة',
    phone: '0796251902',
    role: 'managing_partner',
    specialties: ['civil', 'administrative', 'arbitration'],
    status: 'active',
    canManageRoles: true,
    joinedAt: '2020-01-01',
  },
  {
    id: 'law-najwa',
    name: 'المحامية نجوى الشطناوي',
    phone: '0781112233',
    role: 'senior_lawyer',
    specialties: ['sharia'],
    status: 'active',
    canManageRoles: false,
    joinedAt: '2022-03-01',
  },
  {
    id: 'law-ahmad',
    name: 'المحامي أحمد سليم الخولي',
    phone: '0772223344',
    role: 'partner',
    specialties: ['criminal', 'labor'],
    status: 'on_leave',
    canManageRoles: true,
    joinedAt: '2021-05-01',
  },
];

test('computeAdminFirmAnalytics accurately computes KPIs, workloads, stages, and conversion rates', () => {
  const cases: LegalCase[] = [
    {
      id: 'c1',
      caseNumber: 'IRB-1',
      clientName: 'عميل 1',
      clientPhone: '0791111111',
      specialtyId: 'civil',
      courtName: 'محكمة إربد',
      assignedLawyer: 'المحامي رضوان علي البطاينة',
      stage: 'litigation',
      nextHearingDate: '2026-12-01',
      summary: 'ملخص 1',
      updatedAt: '2026-11-20',
    },
    {
      id: 'c2',
      caseNumber: 'IRB-2',
      clientName: 'عميل 2',
      clientPhone: '0792222222',
      specialtyId: 'civil',
      courtName: 'محكمة إربد',
      assignedLawyer: 'المحامي رضوان علي البطاينة',
      stage: 'closed',
      nextHearingDate: '2026-11-10',
      summary: 'ملخص 2',
      updatedAt: '2026-11-20',
    },
    {
      id: 'c3',
      caseNumber: 'IRB-3',
      clientName: 'عميل 3',
      clientPhone: '0793333333',
      specialtyId: 'sharia',
      courtName: 'محكمة إربد الشرعية',
      assignedLawyer: 'المحامية نجوى الشطناوي',
      stage: 'execution',
      nextHearingDate: '2026-12-05',
      summary: 'ملخص 3',
      updatedAt: '2026-11-20',
    },
  ];

  const bookings: ConsultationBooking[] = [
    {
      id: 'b1',
      referenceCode: 'RB-1',
      clientName: 'موكل 1',
      clientPhone: '0791234567',
      specialtyId: 'civil',
      mode: 'in_person',
      date: '2026-11-22',
      timeSlot: '10:00',
      feeJod: 0,
      paymentMethod: 'free',
      paymentReference: 'FREE',
      otpVerified: true,
      status: 'confirmed',
      assignedLawyer: 'المحامي رضوان علي البطاينة',
      createdAt: '2026-11-20',
    },
    {
      id: 'b2',
      referenceCode: 'RB-2',
      clientName: 'موكل 2',
      clientPhone: '0781234567',
      specialtyId: 'sharia',
      mode: 'online',
      date: '2026-11-23',
      timeSlot: '12:00',
      feeJod: 0,
      paymentMethod: 'free',
      paymentReference: 'FREE',
      otpVerified: true,
      status: 'completed',
      assignedLawyer: 'المحامية نجوى الشطناوي',
      createdAt: '2026-11-20',
    },
  ];

  const intakes: IntakeSummary[] = [
    {
      id: 'i1',
      clientName: 'يزن',
      clientPhone: '0790000001',
      specialtyId: 'labor',
      factsSummary: 'فصل تعسفي',
      documentsStatus: 'متوفر',
      urgency: 'urgent',
      recommendedMode: 'in_person',
      createdAt: '2026-11-20',
    },
    {
      id: 'i2',
      clientName: 'سالم',
      clientPhone: '0790000002',
      specialtyId: 'civil',
      factsSummary: 'شيك مرتجع',
      documentsStatus: 'متوفر',
      urgency: 'normal',
      recommendedMode: 'online',
      createdAt: '2026-11-20',
      convertedToCaseId: 'c1',
    },
  ];

  const inquiries: ContactInquiry[] = [
    {
      id: 'q1',
      name: 'نور',
      phone: '0795554444',
      specialtyId: 'civil',
      message: 'استفسار',
      createdAt: '2026-11-20',
    },
  ];

  const analytics = computeAdminFirmAnalytics({
    bookings,
    cases,
    intakes,
    inquiries,
    lawyers: sampleLawyers,
  });

  assert.equal(analytics.totalCases, 3);
  assert.equal(analytics.activeCases, 2);
  assert.equal(analytics.closedCases, 1);
  assert.equal(analytics.caseClosureRate, 33);
  assert.equal(analytics.bookingCompletionRate, 50);
  assert.equal(analytics.intakeConversionRate, 50);
  assert.equal(analytics.urgentIntakes, 1);
  assert.equal(analytics.activeLawyers, 2);
  assert.equal(analytics.avgActiveCasesPerLawyer, 1);
  assert.equal(analytics.totalInquiries, 1);

  const radwanLoad = analytics.lawyerWorkloads.find((w) => w.lawyerId === 'law-radwan');
  assert.ok(radwanLoad);
  assert.equal(radwanLoad.activeCases, 1);
  assert.equal(radwanLoad.closedCases, 1);
  assert.equal(radwanLoad.upcomingBookings, 1);
  assert.equal(radwanLoad.totalWorkload, 2);
  assert.equal(radwanLoad.capacityStatus, 'balanced');
});

test('pickRecommendedLawyerForSpecialty skips on_leave lawyers when active match or director exists', () => {
  assert.equal(
    pickRecommendedLawyerForSpecialty('sharia', sampleLawyers),
    'المحامية نجوى الشطناوي'
  );
  // Ahmad (criminal) is on_leave, so falls back to active managing_partner Radwan
  assert.equal(
    pickRecommendedLawyerForSpecialty('criminal', sampleLawyers),
    'المحامي رضوان علي البطاينة'
  );
  assert.equal(normalizeLawyerRole('partner'), 'partner');
  assert.equal(normalizeLawyerRole('unknown_role'), 'associate_lawyer');
});
