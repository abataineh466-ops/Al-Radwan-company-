import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

interface MockAuth {
  uid: string;
  email: string;
  email_verified: boolean;
}

const BOOTSTRAP_ADMIN_EMAIL = 'abataineh466@gmail.com';
const VALID_SPECIALTIES = new Set([
  'civil',
  'sharia',
  'criminal',
  'commercial',
  'labor',
  'administrative',
  'arbitration',
]);
const VALID_ROLES = new Set([
  'managing_partner',
  'partner',
  'senior_lawyer',
  'associate_lawyer',
  'legal_consultant',
  'trainee_lawyer',
]);
const VALID_STAGES = new Set(['intake', 'drafting', 'litigation', 'execution', 'closed']);
const VALID_BOOKING_STATUSES = new Set(['pending', 'confirmed', 'completed', 'cancelled']);
const SERVER_TIME = 'SERVER_TIMESTAMP';

function isValidId(id: unknown): boolean {
  return typeof id === 'string' && id.length >= 1 && id.length <= 128 && /^[a-zA-Z0-9_-]+$/.test(id);
}

function isValidJordanianPhone(phone: unknown): boolean {
  return typeof phone === 'string' && phone.length >= 9 && phone.length <= 20 && /^07[789][0-9]{7}$/.test(phone);
}

function isVerified(auth: MockAuth | null): boolean {
  return auth !== null && auth.email_verified === true;
}

function isBootstrapAdmin(auth: MockAuth | null): boolean {
  return isVerified(auth) && auth!.email === BOOTSTRAP_ADMIN_EMAIL;
}

function evaluateCaseCreate(auth: MockAuth | null, docId: string, data: Record<string, unknown>): 'ALLOW' | 'PERMISSION_DENIED' {
  if (!isVerified(auth) || !isValidId(docId) || !isBootstrapAdmin(auth)) return 'PERMISSION_DENIED';
  const required = [
    'id', 'caseNumber', 'clientName', 'clientPhone', 'specialtyId',
    'courtName', 'assignedLawyer', 'stage', 'nextHearingDate',
    'summary', 'createdByUid', 'createdAt', 'updatedAt',
  ];
  const keys = Object.keys(data);
  if (!required.every((k) => keys.includes(k)) || !keys.every((k) => required.includes(k))) {
    return 'PERMISSION_DENIED';
  }
  if (data.id !== docId || data.createdByUid !== auth!.uid) return 'PERMISSION_DENIED';
  if (data.createdAt !== SERVER_TIME || data.updatedAt !== SERVER_TIME) return 'PERMISSION_DENIED';
  if (!isValidJordanianPhone(data.clientPhone)) return 'PERMISSION_DENIED';
  if (!VALID_SPECIALTIES.has(String(data.specialtyId))) return 'PERMISSION_DENIED';
  if (!VALID_STAGES.has(String(data.stage))) return 'PERMISSION_DENIED';
  if (typeof data.summary !== 'string' || data.summary.length < 3 || data.summary.length > 2000) return 'PERMISSION_DENIED';
  return 'ALLOW';
}

function evaluateLawyerCreate(auth: MockAuth | null, docId: string, data: Record<string, unknown>): 'ALLOW' | 'PERMISSION_DENIED' {
  if (!isVerified(auth) || !isValidId(docId) || !isBootstrapAdmin(auth)) return 'PERMISSION_DENIED';
  const allowed = new Set([
    'id', 'name', 'nameEn', 'phone', 'email', 'role', 'specialties', 'status',
    'canManageRoles', 'joinedAt', 'createdByUid', 'createdAt', 'updatedAt',
  ]);
  const keys = Object.keys(data);
  if (!keys.every((k) => allowed.has(k))) return 'PERMISSION_DENIED';
  if (data.id !== docId || data.createdByUid !== auth!.uid) return 'PERMISSION_DENIED';
  if (data.createdAt !== SERVER_TIME || data.updatedAt !== SERVER_TIME) return 'PERMISSION_DENIED';
  if (!VALID_ROLES.has(String(data.role))) return 'PERMISSION_DENIED';
  if (!Array.isArray(data.specialties) || data.specialties.length < 1 || data.specialties.length > 7) return 'PERMISSION_DENIED';
  if (!data.specialties.every((s) => typeof s === 'string' && VALID_SPECIALTIES.has(s))) return 'PERMISSION_DENIED';
  return 'ALLOW';
}

function evaluateBookingRead(auth: MockAuth | null, docId: string, existing: Record<string, unknown>): 'ALLOW' | 'PERMISSION_DENIED' {
  if (!isVerified(auth) || !isValidId(docId)) return 'PERMISSION_DENIED';
  if (isBootstrapAdmin(auth) || existing.createdByUid === auth!.uid) return 'ALLOW';
  return 'PERMISSION_DENIED';
}

function evaluateCaseUpdate(
  auth: MockAuth | null,
  docId: string,
  existing: Record<string, unknown>,
  incoming: Record<string, unknown>
): 'ALLOW' | 'PERMISSION_DENIED' {
  if (!isVerified(auth) || !isValidId(docId)) return 'PERMISSION_DENIED';
  if (incoming.id !== existing.id || incoming.createdByUid !== existing.createdByUid || incoming.createdAt !== existing.createdAt) {
    return 'PERMISSION_DENIED';
  }
  if (incoming.updatedAt !== SERVER_TIME) return 'PERMISSION_DENIED';
  if (typeof incoming.summary !== 'string' || incoming.summary.length < 3 || incoming.summary.length > 2000) {
    return 'PERMISSION_DENIED';
  }
  if (isBootstrapAdmin(auth)) return 'ALLOW';
  if (existing.createdByUid === auth!.uid && existing.stage !== 'closed' && incoming.stage !== 'closed') {
    return 'ALLOW';
  }
  return 'PERMISSION_DENIED';
}

const adminAuth: MockAuth = { uid: 'admin-uid-1', email: BOOTSTRAP_ADMIN_EMAIL, email_verified: true };
const spoofedAdminAuth: MockAuth = { uid: 'spoof-uid-2', email: BOOTSTRAP_ADMIN_EMAIL, email_verified: false };
const regularUserAuth: MockAuth = { uid: 'user-uid-3', email: 'client@example.com', email_verified: true };

const baseCase = {
  id: 'case-101',
  caseNumber: 'IRB-2026-101',
  clientName: 'خالد محمد المومني',
  clientPhone: '0795412890',
  specialtyId: 'civil',
  courtName: 'محكمة بداية إربد',
  assignedLawyer: 'المحامي رضوان علي البطاينة',
  stage: 'litigation',
  nextHearingDate: '2026-12-01',
  summary: 'مطالبة مالية وشيكات مرتجعة.',
  createdByUid: adminAuth.uid,
  createdAt: SERVER_TIME,
  updatedAt: SERVER_TIME,
};

test('Dirty Dozen 1-6: Shadow fields, email spoofing, identity spoofing, self-admin, ID poisoning, value poisoning return PERMISSION_DENIED', () => {
  // 1. Shadow field injection
  assert.equal(
    evaluateCaseCreate(adminAuth, 'case-101', { ...baseCase, isVerifiedByCourt: true }),
    'PERMISSION_DENIED'
  );
  // 2. Email spoofing (email_verified: false)
  assert.equal(evaluateCaseCreate(spoofedAdminAuth, 'case-101', baseCase), 'PERMISSION_DENIED');
  // 3. Identity spoofing (createdByUid != auth.uid)
  assert.equal(
    evaluateCaseCreate(adminAuth, 'case-101', { ...baseCase, createdByUid: 'victim-uid-999' }),
    'PERMISSION_DENIED'
  );
  // 4. Privilege escalation (non-admin cannot create firm cases/admins)
  assert.equal(
    evaluateCaseCreate(regularUserAuth, 'case-101', { ...baseCase, createdByUid: regularUserAuth.uid }),
    'PERMISSION_DENIED'
  );
  // 5. Resource poisoning (invalid/oversized docId)
  assert.equal(evaluateCaseCreate(adminAuth, '../bad/id/' + 'a'.repeat(150), baseCase), 'PERMISSION_DENIED');
  // 6. Value poisoning (oversized summary > 2000 chars)
  assert.equal(
    evaluateCaseUpdate(adminAuth, 'case-101', baseCase, { ...baseCase, summary: 'x'.repeat(2500) }),
    'PERMISSION_DENIED'
  );
});

test('Dirty Dozen 7-12: PII leak, timestamp forgery, immortal field tamper, terminal state bypass, and array allowlist violation return PERMISSION_DENIED', () => {
  // 7. PII blanket read by non-owner
  assert.equal(
    evaluateBookingRead(regularUserAuth, 'bk-101', { createdByUid: 'other-user-888' }),
    'PERMISSION_DENIED'
  );
  // 8. Unauthenticated query / read
  assert.equal(evaluateBookingRead(null, 'bk-101', { createdByUid: 'other-user-888' }), 'PERMISSION_DENIED');
  // 9. Client timestamp forgery
  assert.equal(
    evaluateCaseCreate(adminAuth, 'case-101', { ...baseCase, createdAt: '2020-01-01T00:00:00Z' }),
    'PERMISSION_DENIED'
  );
  // 10. Immortal field tampering on update
  assert.equal(
    evaluateCaseUpdate(adminAuth, 'case-101', baseCase, { ...baseCase, createdByUid: 'attacker-uid' }),
    'PERMISSION_DENIED'
  );
  // 11. Terminal state violation by non-admin on closed case
  assert.equal(
    evaluateCaseUpdate(
      regularUserAuth,
      'case-101',
      { ...baseCase, createdByUid: regularUserAuth.uid, stage: 'closed' },
      { ...baseCase, createdByUid: regularUserAuth.uid, stage: 'litigation' }
    ),
    'PERMISSION_DENIED'
  );
  // 12. Array allowlist / empty array violation on FirmLawyer.specialties
  assert.equal(
    evaluateLawyerCreate(adminAuth, 'law-bad', {
      id: 'law-bad',
      name: 'محامي اختبار',
      phone: '0796251902',
      role: 'senior_lawyer',
      specialties: ['hacking'],
      status: 'active',
      canManageRoles: false,
      joinedAt: '2026-01-01',
      createdByUid: adminAuth.uid,
      createdAt: SERVER_TIME,
      updatedAt: SERVER_TIME,
    }),
    'PERMISSION_DENIED'
  );
});

test('Legitimate verified admin writes and rules file Eight Pillars structural checks pass', () => {
  assert.equal(evaluateCaseCreate(adminAuth, 'case-101', baseCase), 'ALLOW');
  assert.equal(evaluateBookingRead(adminAuth, 'bk-101', { createdByUid: 'other-user-888' }), 'ALLOW');
  assert.equal(evaluateBookingRead(regularUserAuth, 'bk-101', { createdByUid: regularUserAuth.uid }), 'ALLOW');
  assert.equal(VALID_BOOKING_STATUSES.has('confirmed'), true);

  const rulesPath = fs.existsSync(path.resolve('firestore.rules'))
    ? path.resolve('firestore.rules')
    : path.resolve('DRAFT_firestore.rules');
  const rulesText = fs.readFileSync(rulesPath, 'utf8');

  assert.ok(rulesText.includes("rules_version = '2';"), 'Must declare rules_version 2');
  assert.ok(rulesText.includes('allow read, write: if false;'), 'Must include default-deny catch-all');
  assert.ok(rulesText.includes('request.auth.token.email_verified == true'), 'Must require email_verified');
  assert.ok(rulesText.includes('abataineh466@gmail.com'), 'Must include bootstrapped runtime admin');
  for (const col of ['admins', 'lawyers', 'cases', 'bookings', 'intakes', 'inquiries']) {
    assert.ok(rulesText.includes(`match /${col}/`), `Must secure collection /${col}`);
  }
});
