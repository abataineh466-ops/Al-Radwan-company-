import test from 'node:test';
import assert from 'node:assert/strict';
import PizZip from 'pizzip';
import { createApiApp } from './app.js';
import {
  buildOfficialLetterheadDocxBuffer,
  buildOfficialLetterheadPdfBuffer,
} from './letterheadEngine.js';
import {
  decryptSensitiveText,
  encryptSensitiveText,
} from './security.js';
import { searchJordanianLegalReferences } from './jordanianLawIndex.js';
import type { LegalDocumentRecord } from '../src/types/legal.js';

test('AES-256-GCM sensitive data encryption round-trips cleanly', () => {
  const secret = '0796251902 — قضية تعويض حادث سير';
  const cipher = encryptSensitiveText(secret);
  assert.ok(cipher.startsWith('enc:v1:'));
  assert.notEqual(cipher, secret);
  assert.equal(decryptSensitiveText(cipher), secret);
});

test('Jordanian legal index finds verified statutes for traffic accident insurance claim', () => {
  const { matches, citations } = searchJordanianLegalReferences(
    'عندي موكل تعرض لحادث سير وشركة التأمين رفضت تعويضه بدي لائحة دعوى'
  );
  assert.ok(matches.length >= 2);
  assert.ok(citations.some((c) => c.lawName.includes('السير') || c.lawName.includes('المدني')));
});

test('Official letterhead engine generates multi-page RTL DOCX and PDF preserving header1 and footer1', async () => {
  const longBody = Array.from({ length: 28 }, (_, idx) => {
    const num = idx + 1;
    return `البند (${num}): حيث إن المدعى عليها شركة التأمين ملزمة قانوناً بتعويض الموكل عن الأضرار المادية والجسدية الناجمة عن حادث السير الموصوف في تقرير الكروكا المرفق، وحيث امتنعت عن سداد التعويض المستحق رغم المطالبة الودية الموثقة، فإن موكلي يلتمس من مقام المحكمة الموقرة إلزام المدعى عليهم بالتضامن والتكافل بدفع قيمة التعويض العادل مع الرسوم والمصاريف وأتعاب المحاماة والفائدة القانونية من تاريخ المطالبة وحتى السداد التام.`;
  }).join('\n\n');

  const sampleDoc: LegalDocumentRecord = {
    id: 'doc-test-multipage',
    title: 'لائحة دعوى مطالبة بتعويض عن حادث سير',
    documentType: 'lawsuit',
    clientName: 'خالد محمد المومني',
    courtOrAuthority: 'محكمة بداية حقوق إربد الموقرة',
    status: 'approved',
    bodyText: longBody,
    attachmentsChecklist: [
      'صورة عن تقرير الحادث المروري (الكروكا)',
      'تقرير الخبرة الفنية وتقدير الأضرار',
      'وثيقة التأمين الإلزامي للمركبة المتسببة',
      'كتب المطالبة ورفض شركة التأمين',
    ],
    createdBy: 'المحامي رضوان علي بطاينة',
    createdByRole: 'managing_partner',
    approvedBy: 'المحامي رضوان علي بطاينة',
    approvedAt: new Date().toISOString(),
    versions: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const docxBuffer = buildOfficialLetterheadDocxBuffer(sampleDoc);
  assert.ok(docxBuffer.length > 50000);

  const zip = new PizZip(docxBuffer);
  const headerXml = zip.file('word/header1.xml')?.asText() ?? '';
  const footerXml = zip.file('word/footer1.xml')?.asText() ?? '';
  const docXml = zip.file('word/document.xml')?.asText() ?? '';

  assert.ok(headerXml.includes('rId1'), 'Original header image relationship must stay intact');
  assert.ok(footerXml.includes('0796251902'), 'Original footer phone must stay intact');
  assert.ok(footerXml.includes('علاء الدين سنتر'), 'Original letterhead Irbid address preserved');
  assert.ok(footerXml.includes('مجمع داوود'), 'Original letterhead Amman address preserved');
  assert.ok(docXml.includes('لائحة دعوى مطالبة بتعويض عن حادث سير'));
  assert.ok(docXml.includes('<w:bidi/>'));

  const pdfResult = await buildOfficialLetterheadPdfBuffer(sampleDoc);
  if (process.platform === 'win32') {
    assert.ok(pdfResult.buffer && pdfResult.buffer.length > 50000, 'PDF buffer must be generated via Word COM');
  }
});

test('API security: public AI disabled, private routes require auth, simplified booking is pending', async () => {
  const app = createApiApp();
  const server = app.listen(0);
  const addr = server.address();
  const port = typeof addr === 'object' && addr ? addr.port : 0;
  const base = `http://127.0.0.1:${port}`;

  try {
    // 1. Public AI disabled
    const publicAiRes = await fetch(`${base}/api/intake-chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [{ role: 'user', text: 'مرحبا' }] }),
    });
    assert.equal(publicAiRes.status, 403);

    // 2. Unauthenticated dashboard / RB AI rejected
    const unauthDash = await fetch(`${base}/api/dashboard-data`);
    assert.equal(unauthDash.status, 401);

    const unauthRbAi = await fetch(`${base}/api/rb-ai/assist`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [{ role: 'user', text: 'اختبار' }] }),
    });
    assert.equal(unauthRbAi.status, 401);

    // 3. Simplified OTP-free booking saved as pending
    const bookingRes = await fetch(`${base}/api/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientName: 'سالم أحمد العلي',
        clientPhone: '0791234567',
        specialtyId: 'civil',
        branch: 'amman',
        date: '2026-12-01',
        timeSlot: '11:00',
      }),
    });
    assert.equal(bookingRes.status, 201);
    const bookingBody = (await bookingRes.json()) as {
      booking: { status: string; branch: string; otpVerified: boolean };
    };
    assert.equal(bookingBody.booking.status, 'pending');
    assert.equal(bookingBody.booking.branch, 'amman');
    assert.equal(bookingBody.booking.otpVerified, false);

    // 4. Lawyer login + RBAC checks (non-admin vs admin)
    const teamLogin = await fetch(`${base}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'ghufran', password: process.env.RB_TEAM_PASSWORD || 'rblegal2026' }),
    });
    assert.equal(teamLogin.status, 200);
    const teamAuth = (await teamLogin.json()) as { token: string };
    const auditDenied = await fetch(`${base}/api/audit-logs`, {
      headers: { Authorization: `Bearer ${teamAuth.token}` },
    });
    assert.equal(auditDenied.status, 403);

    const adminLogin = await fetch(`${base}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'alradwan', password: process.env.RB_ADMIN_PASSWORD || 'radwan2026' }),
    });
    assert.equal(adminLogin.status, 200);
    const adminAuth = (await adminLogin.json()) as { token: string };
    const auditAllowed = await fetch(`${base}/api/audit-logs`, {
      headers: { Authorization: `Bearer ${adminAuth.token}` },
    });
    assert.equal(auditAllowed.status, 200);
  } finally {
    server.close();
  }
});
