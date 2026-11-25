import test from 'node:test';
import assert from 'node:assert/strict';
import {
  detectNewInquiries,
  formatInquiryToastPreview,
  mergeUniqueInquiries,
} from './inquiryNotifications.js';
import type { ContactInquiry } from '../types/legal.js';

const baseInquiries: ContactInquiry[] = [
  {
    id: 'inq-2',
    name: 'سامي العزام',
    phone: '0795554433',
    specialtyId: 'civil',
    message: 'لدي استفسار عاجل حول شيك مرتجع بقيمة 7000 دينار في إربد.',
    createdAt: '2026-11-21T10:05:00.000Z',
  },
  {
    id: 'inq-1',
    name: 'دانا الحموري',
    phone: '0781112233',
    specialtyId: 'sharia',
    message: 'أرغب بالاستفسار عن إجراءات دعوى النفقة والحضانة.',
    createdAt: '2026-11-21T09:00:00.000Z',
  },
];

test('detectNewInquiries returns only unseen inquiries and ignores already-seen ones', () => {
  const seen = new Set<string>(['inq-1']);
  const detected = detectNewInquiries(seen, baseInquiries);
  assert.equal(detected.length, 1);
  assert.equal(detected[0].id, 'inq-2');

  const allSeen = new Set<string>(['inq-1', 'inq-2']);
  assert.equal(detectNewInquiries(allSeen, baseInquiries).length, 0);
});

test('mergeUniqueInquiries deduplicates and sorts newest first', () => {
  const incoming: ContactInquiry[] = [
    {
      id: 'inq-3',
      name: 'رائد المومني',
      phone: '0779998877',
      specialtyId: 'labor',
      message: 'فصل تعسفي من العمل',
      createdAt: '2026-11-21T11:00:00.000Z',
    },
    baseInquiries[0],
  ];
  const merged = mergeUniqueInquiries(incoming, baseInquiries);
  assert.equal(merged.length, 3);
  assert.deepEqual(
    merged.map((i) => i.id),
    ['inq-3', 'inq-2', 'inq-1']
  );
});

test('formatInquiryToastPreview builds Jordanian tel link and truncates long messages', () => {
  const longInquiry: ContactInquiry = {
    id: 'inq-long',
    name: 'خالد البطاينة',
    phone: '0796251902',
    specialtyId: 'commercial',
    message: 'أ'.repeat(160),
    createdAt: '2026-11-21T12:00:00.000Z',
  };
  const previewAr = formatInquiryToastPreview(longInquiry, 'ar', 50);
  assert.equal(previewAr.telHref, 'tel:+962796251902');
  assert.ok(previewAr.excerpt.endsWith('…'));
  assert.ok(previewAr.excerpt.length <= 50);
  assert.ok(previewAr.title.includes('استفسار جديد'));

  const previewEn = formatInquiryToastPreview(longInquiry, 'en', 50);
  assert.equal(previewEn.title, 'New Contact Form Inquiry');
});
