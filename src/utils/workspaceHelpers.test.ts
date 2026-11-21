import test from 'node:test';
import assert from 'node:assert/strict';
import {
  WORKSPACE_SCOPES,
  buildBookingsSheetRows,
  buildCasesSheetRows,
  buildDriveSearchQuery,
  buildIntakesSheetRows,
  classifyDriveMimeType,
  formatDriveFileSize,
  formatSheetRange,
  parseGoogleApiError,
} from './workspaceHelpers.ts';
import type { ConsultationBooking, IntakeSummary, LegalCase } from '../types/legal.ts';

test('WORKSPACE_SCOPES contains all 15 deduplicated Google Drive and Sheets scopes', () => {
  assert.equal(WORKSPACE_SCOPES.length, 15);
  assert.equal(new Set(WORKSPACE_SCOPES).size, 15);
  assert.ok(WORKSPACE_SCOPES.includes('https://www.googleapis.com/auth/drive'));
  assert.ok(WORKSPACE_SCOPES.includes('https://www.googleapis.com/auth/spreadsheets'));
  assert.ok(WORKSPACE_SCOPES.includes('https://www.googleapis.com/auth/spreadsheets.readonly'));
});

test('buildDriveSearchQuery escapes single quotes and combines filters safely', () => {
  const query = buildDriveSearchQuery({
    search: "Al-Radwan's Brief",
    filterType: 'spreadsheets',
    folderId: 'folder_123',
  });
  assert.equal(
    query,
    "trashed = false and 'folder_123' in parents and mimeType = 'application/vnd.google-apps.spreadsheet' and name contains 'Al-Radwan\\'s Brief'",
  );
});

test('formatSheetRange quotes Arabic and apostrophe tab names safely without hardcoding Sheet1', () => {
  assert.equal(formatSheetRange('سجل القضايا', 'A1:I50'), "'سجل القضايا'!A1:I50");
  assert.equal(formatSheetRange("Client's Docket", 'A1:Z100'), "'Client''s Docket'!A1:Z100");
  assert.equal(formatSheetRange('', 'A1:B10'), 'A1:B10');
});

test('buildCasesSheetRows, buildBookingsSheetRows, and buildIntakesSheetRows format bilingual rows', () => {
  const sampleCases: LegalCase[] = [
    {
      id: 'case-1',
      caseNumber: 'IRB-2026-101',
      clientName: 'خالد المنصور',
      clientPhone: '0791112233',
      specialtyId: 'civil',
      courtName: 'محكمة بداية حقوق إربد',
      assignedLawyer: 'المحامي رضوان علي البطاينة',
      stage: 'litigation',
      nextHearingDate: '2026-12-01',
      summary: 'مطالبة مالية بموجب عقد بيع',
      updatedAt: '2026-11-20',
    },
  ];
  const caseRowsAr = buildCasesSheetRows(sampleCases, 'ar', true);
  assert.equal(caseRowsAr.length, 2);
  assert.equal(caseRowsAr[0][0], 'رقم القضية');
  assert.equal(caseRowsAr[1][0], 'IRB-2026-101');
  assert.equal(caseRowsAr[1][6], 'قيد المرافعة');

  const sampleBookings: ConsultationBooking[] = [
    {
      id: 'bk-1',
      referenceCode: 'RB-9001',
      clientName: 'سارة الخطيب',
      clientPhone: '0795556677',
      specialtyId: 'sharia',
      mode: 'in_person',
      date: '2026-11-25',
      timeSlot: '11:00',
      feeJod: 0,
      paymentMethod: 'free',
      paymentReference: 'FREE',
      otpVerified: true,
      status: 'confirmed',
      assignedLawyer: 'المحامي رضوان علي البطاينة',
      createdAt: '2026-11-20',
    },
  ];
  const bookingRowsEn = buildBookingsSheetRows(sampleBookings, 'en', false);
  assert.equal(bookingRowsEn.length, 1);
  assert.equal(bookingRowsEn[0][0], 'RB-9001');
  assert.equal(bookingRowsEn[0][6], 'In-Person (Irbid)');
  assert.equal(bookingRowsEn[0][9], 'Verified');

  const sampleIntakes: IntakeSummary[] = [
    {
      id: 'in-1',
      clientName: 'عمر الزعبي',
      clientPhone: '0781234567',
      specialtyId: 'labor',
      factsSummary: 'فصل تعسفي ومطالبة بحقوق عمالية',
      documentsStatus: 'عقد العمل متوفر',
      urgency: 'urgent',
      recommendedMode: 'online',
      createdAt: '2026-11-20',
    },
  ];
  const intakeRowsAr = buildIntakesSheetRows(sampleIntakes, 'ar', true);
  assert.equal(intakeRowsAr.length, 2);
  assert.equal(intakeRowsAr[1][3], 'عاجل');
});

test('formatDriveFileSize, classifyDriveMimeType, and parseGoogleApiError handle edge cases', () => {
  assert.equal(formatDriveFileSize(undefined, 'en'), 'Cloud file');
  assert.equal(formatDriveFileSize('2048', 'ar'), '2.0 KB');
  assert.equal(formatDriveFileSize(2 * 1024 * 1024, 'en'), '2.00 MB');

  assert.equal(
    classifyDriveMimeType('application/vnd.google-apps.spreadsheet', 'en').kind,
    'spreadsheet',
  );
  assert.equal(classifyDriveMimeType('application/vnd.google-apps.folder', 'ar').label, 'مجلد');

  const expired = parseGoogleApiError(401, {}, 'en');
  assert.equal(expired.requiresReauth, true);

  const insufficient = parseGoogleApiError(
    403,
    { error: { message: 'Request had insufficient authentication scopes.' } },
    'ar',
  );
  assert.equal(insufficient.requiresReauth, true);
});
