import type { ContactInquiry, Language } from '../types/legal';
import { SPECIALTIES } from '../data/firmContent';

/**
 * Identifies newly arrived contact inquiries that were not present in the
 * previously acknowledged ID set. Preserves newest-first ordering.
 */
export function detectNewInquiries(
  seenIds: ReadonlySet<string>,
  latestInquiries: ContactInquiry[]
): ContactInquiry[] {
  if (!Array.isArray(latestInquiries) || latestInquiries.length === 0) {
    return [];
  }
  return latestInquiries.filter((item) => item && typeof item.id === 'string' && !seenIds.has(item.id));
}

export function mergeUniqueInquiries(
  incoming: ContactInquiry[],
  existing: ContactInquiry[]
): ContactInquiry[] {
  const byId = new Map<string, ContactInquiry>();
  for (const item of [...incoming, ...existing]) {
    if (item && item.id && !byId.has(item.id)) {
      byId.set(item.id, item);
    }
  }
  return Array.from(byId.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function formatInquiryToastPreview(
  inquiry: ContactInquiry,
  lang: Language,
  maxLength = 110
): {
  title: string;
  specialtyLabel: string;
  excerpt: string;
  telHref: string;
} {
  const spec = SPECIALTIES.find((s) => s.id === inquiry.specialtyId);
  const specialtyLabel = spec ? spec.title[lang] : inquiry.specialtyId;
  const cleanMsg = inquiry.message.trim().replace(/\s+/g, ' ');
  const excerpt =
    cleanMsg.length > maxLength ? `${cleanMsg.slice(0, maxLength - 1).trimEnd()}…` : cleanMsg;

  const digits = inquiry.phone.replace(/\D/g, '');
  const telHref = digits.startsWith('07') ? `tel:+962${digits.slice(1)}` : `tel:${digits}`;

  return {
    title: lang === 'ar' ? 'استفسار جديد عبر نموذج التواصل' : 'New Contact Form Inquiry',
    specialtyLabel,
    excerpt,
    telHref,
  };
}
