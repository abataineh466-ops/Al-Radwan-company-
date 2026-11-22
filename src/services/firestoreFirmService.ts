import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
  type Query,
  type Unsubscribe,
} from 'firebase/firestore';
import type {
  BookingStatus,
  CaseStage,
  ConsultationBooking,
  ContactInquiry,
  FirmLawyer,
  IntakeSummary,
  LawyerRole,
  LawyerStatus,
  LegalCase,
  SpecialtyId,
} from '../types/legal.js';
import { auth, db, handleFirestoreError, OperationType } from '../firebase.js';
import {
  isValidJordanianPhone,
  normalizeSpecialtyId,
  sanitizeJordanianPhone,
  VALID_SPECIALTY_IDS,
} from '../utils/legalWorkflow.js';
import { normalizeLawyerRole } from '../utils/adminAnalytics.js';

const SAFE_ID_REGEX = /[^a-zA-Z0-9_-]/g;

export function sanitizeFirestoreId(raw: string, prefix: string): string {
  const cleaned = raw.replace(SAFE_ID_REGEX, '').slice(0, 100);
  if (cleaned.length >= 2) return cleaned;
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function clampString(value: unknown, maxLen: number, fallback = ''): string {
  const str = String(value ?? '').trim();
  if (!str) return fallback;
  return str.slice(0, maxLen);
}

function ensureValidJordanianPhone(phone: unknown): string {
  const normalized = sanitizeJordanianPhone(String(phone ?? ''));
  return isValidJordanianPhone(normalized) ? normalized : '0796251902';
}

function sanitizeSpecialties(input: unknown): SpecialtyId[] {
  const rawList = Array.isArray(input) ? input : [];
  const unique = Array.from(
    new Set(
      rawList
        .map((item) => String(item))
        .filter((item): item is SpecialtyId =>
          VALID_SPECIALTY_IDS.includes(item as SpecialtyId)
        )
    )
  ).slice(0, 7);
  return unique.length > 0 ? unique : ['civil'];
}

function timestampToIso(value: unknown): string {
  if (value instanceof Timestamp) {
    return value.toDate().toISOString();
  }
  if (typeof value === 'string' && value.trim()) {
    return value;
  }
  return new Date().toISOString();
}

function requireSignedInUid(): string {
  const uid = auth.currentUser?.uid;
  if (!uid) {
    throw new Error('Firebase user must be signed in to perform Firestore operations.');
  }
  return uid;
}

function buildCollectionQuery(colName: string, uid: string, isBootstrapAdmin: boolean): Query {
  const ref = collection(db, colName);
  return isBootstrapAdmin ? query(ref) : query(ref, where('createdByUid', '==', uid));
}

export interface FirmSubscriptionsHandlers {
  onLawyers: (items: FirmLawyer[]) => void;
  onCases: (items: LegalCase[]) => void;
  onBookings: (items: ConsultationBooking[]) => void;
  onIntakes: (items: IntakeSummary[]) => void;
  onInquiries: (items: ContactInquiry[]) => void;
  onError?: (err: Error) => void;
}

/**
 * Attaches live real-time onSnapshot listeners to all 5 firm collections.
 * MUST only be called when Firebase Auth is ready and the user is verified.
 */
export function subscribeFirmCollections(
  uid: string,
  isBootstrapAdmin: boolean,
  handlers: FirmSubscriptionsHandlers
): () => void {
  const unsubscribers: Unsubscribe[] = [];

  const handleSubError = (error: unknown, path: string) => {
    try {
      handleFirestoreError(error, OperationType.LIST, path);
    } catch (wrapped) {
      handlers.onError?.(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
    }
  };

  unsubscribers.push(
    onSnapshot(
      buildCollectionQuery('lawyers', uid, isBootstrapAdmin),
      (snap) => {
        const items: FirmLawyer[] = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: String(data.id ?? d.id),
            name: String(data.name ?? ''),
            nameEn: typeof data.nameEn === 'string' && data.nameEn ? data.nameEn : undefined,
            phone: String(data.phone ?? '0796251902'),
            email: typeof data.email === 'string' && data.email ? data.email : undefined,
            role: normalizeLawyerRole(data.role),
            specialties: sanitizeSpecialties(data.specialties),
            status: data.status === 'on_leave' ? 'on_leave' : 'active',
            canManageRoles: Boolean(data.canManageRoles),
            joinedAt: String(data.joinedAt ?? '2026-01-01'),
          };
        });
        items.sort((a, b) => a.joinedAt.localeCompare(b.joinedAt));
        handlers.onLawyers(items);
      },
      (error) => handleSubError(error, 'lawyers')
    )
  );

  unsubscribers.push(
    onSnapshot(
      buildCollectionQuery('cases', uid, isBootstrapAdmin),
      (snap) => {
        const items: LegalCase[] = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: String(data.id ?? d.id),
            caseNumber: String(data.caseNumber ?? ''),
            clientName: String(data.clientName ?? ''),
            clientPhone: String(data.clientPhone ?? ''),
            specialtyId: normalizeSpecialtyId(data.specialtyId),
            courtName: String(data.courtName ?? ''),
            assignedLawyer: String(data.assignedLawyer ?? ''),
            stage: (data.stage as CaseStage) || 'intake',
            nextHearingDate: String(data.nextHearingDate ?? 'قيد التحديد'),
            summary: String(data.summary ?? ''),
            updatedAt: timestampToIso(data.updatedAt),
          };
        });
        items.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
        handlers.onCases(items);
      },
      (error) => handleSubError(error, 'cases')
    )
  );

  unsubscribers.push(
    onSnapshot(
      buildCollectionQuery('bookings', uid, isBootstrapAdmin),
      (snap) => {
        const items: ConsultationBooking[] = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: String(data.id ?? d.id),
            referenceCode: String(data.referenceCode ?? ''),
            clientName: String(data.clientName ?? ''),
            clientPhone: String(data.clientPhone ?? ''),
            specialtyId: normalizeSpecialtyId(data.specialtyId),
            mode: data.mode === 'online' ? 'online' : 'in_person',
            date: String(data.date ?? ''),
            timeSlot: String(data.timeSlot ?? ''),
            feeJod: typeof data.feeJod === 'number' ? data.feeJod : 0,
            paymentMethod:
              data.paymentMethod === 'cliq' || data.paymentMethod === 'card'
                ? data.paymentMethod
                : 'free',
            paymentReference: String(data.paymentReference ?? 'FREE'),
            otpVerified: Boolean(data.otpVerified),
            caseSummary: typeof data.caseSummary === 'string' ? data.caseSummary : undefined,
            status: (data.status as BookingStatus) || 'pending',
            assignedLawyer: String(data.assignedLawyer ?? ''),
            createdAt: timestampToIso(data.createdAt),
          };
        });
        items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        handlers.onBookings(items);
      },
      (error) => handleSubError(error, 'bookings')
    )
  );

  unsubscribers.push(
    onSnapshot(
      buildCollectionQuery('intakes', uid, isBootstrapAdmin),
      (snap) => {
        const items: IntakeSummary[] = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: String(data.id ?? d.id),
            clientName: String(data.clientName ?? ''),
            clientPhone: String(data.clientPhone ?? ''),
            specialtyId: normalizeSpecialtyId(data.specialtyId),
            factsSummary: String(data.factsSummary ?? ''),
            documentsStatus: String(data.documentsStatus ?? 'قيد المراجعة'),
            urgency: data.urgency === 'urgent' ? 'urgent' : 'normal',
            recommendedMode: data.recommendedMode === 'online' ? 'online' : 'in_person',
            createdAt: timestampToIso(data.createdAt),
            convertedToCaseId:
              typeof data.convertedToCaseId === 'string' && data.convertedToCaseId
                ? data.convertedToCaseId
                : undefined,
          };
        });
        items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        handlers.onIntakes(items);
      },
      (error) => handleSubError(error, 'intakes')
    )
  );

  unsubscribers.push(
    onSnapshot(
      buildCollectionQuery('inquiries', uid, isBootstrapAdmin),
      (snap) => {
        const items: ContactInquiry[] = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: String(data.id ?? d.id),
            name: String(data.name ?? ''),
            phone: String(data.phone ?? ''),
            specialtyId: normalizeSpecialtyId(data.specialtyId),
            message: String(data.message ?? ''),
            createdAt: timestampToIso(data.createdAt),
          };
        });
        items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        handlers.onInquiries(items);
      },
      (error) => handleSubError(error, 'inquiries')
    )
  );

  return () => {
    for (const unsub of unsubscribers) {
      unsub();
    }
  };
}

/**
 * Seeds Firestore atomically on first admin connection if the lawyers collection is empty,
 * migrating existing firm records from the API snapshot without duplicating.
 */
export async function seedFirestoreIfEmpty(seed: {
  lawyers: FirmLawyer[];
  cases: LegalCase[];
  bookings: ConsultationBooking[];
  intakes: IntakeSummary[];
  inquiries: ContactInquiry[];
}): Promise<boolean> {
  const uid = requireSignedInUid();

  try {
    const existingLawyers = await getDocs(collection(db, 'lawyers'));
    if (!existingLawyers.empty) {
      return false;
    }

    const batch = writeBatch(db);
    const now = serverTimestamp();

    for (const l of seed.lawyers) {
      const id = sanitizeFirestoreId(l.id, 'law');
      const payload: Record<string, unknown> = {
        id,
        name: clampString(l.name, 120, 'محامي شركة الرضوان'),
        phone: ensureValidJordanianPhone(l.phone),
        role: normalizeLawyerRole(l.role),
        specialties: sanitizeSpecialties(l.specialties),
        status: l.status === 'on_leave' ? 'on_leave' : 'active',
        canManageRoles: Boolean(l.canManageRoles),
        joinedAt: clampString(l.joinedAt, 32, '2026-01-01'),
        createdByUid: uid,
        createdAt: now,
        updatedAt: now,
      };
      if (l.nameEn?.trim()) payload.nameEn = clampString(l.nameEn, 120);
      if (l.email?.trim()) payload.email = clampString(l.email, 160);
      batch.set(doc(db, 'lawyers', id), payload);
    }

    for (const c of seed.cases) {
      const id = sanitizeFirestoreId(c.id, 'case');
      batch.set(doc(db, 'cases', id), {
        id,
        caseNumber: clampString(c.caseNumber, 64, `IRB-${Date.now()}`),
        clientName: clampString(c.clientName, 120, 'موكل'),
        clientPhone: ensureValidJordanianPhone(c.clientPhone),
        specialtyId: normalizeSpecialtyId(c.specialtyId),
        courtName: clampString(c.courtName, 160, 'محكمة بداية إربد'),
        assignedLawyer: clampString(c.assignedLawyer, 120, 'المحامي رضوان علي البطاينة'),
        stage: c.stage || 'intake',
        nextHearingDate: clampString(c.nextHearingDate, 40, 'قيد التحديد'),
        summary: clampString(c.summary, 2000, 'ملف قضية قانونية'),
        createdByUid: uid,
        createdAt: now,
        updatedAt: now,
      });
    }

    for (const b of seed.bookings) {
      const id = sanitizeFirestoreId(b.id, 'bk');
      const payload: Record<string, unknown> = {
        id,
        referenceCode: clampString(b.referenceCode, 40, `RB-${Date.now().toString().slice(-5)}`),
        clientName: clampString(b.clientName, 120, 'موكل'),
        clientPhone: ensureValidJordanianPhone(b.clientPhone),
        specialtyId: normalizeSpecialtyId(b.specialtyId),
        mode: b.mode === 'online' ? 'online' : 'in_person',
        date: clampString(b.date, 32, '2026-11-21'),
        timeSlot: clampString(b.timeSlot, 32, '10:00'),
        feeJod: typeof b.feeJod === 'number' && b.feeJod >= 0 ? Math.min(b.feeJod, 5000) : 0,
        paymentMethod: b.paymentMethod === 'cliq' || b.paymentMethod === 'card' ? b.paymentMethod : 'free',
        paymentReference: clampString(b.paymentReference, 64, 'FREE'),
        otpVerified: Boolean(b.otpVerified),
        status: b.status || 'pending',
        assignedLawyer: clampString(b.assignedLawyer, 120, 'المحامي رضوان علي البطاينة'),
        createdByUid: uid,
        createdAt: now,
        updatedAt: now,
      };
      if (b.caseSummary?.trim()) payload.caseSummary = clampString(b.caseSummary, 2000);
      batch.set(doc(db, 'bookings', id), payload);
    }

    for (const i of seed.intakes) {
      const id = sanitizeFirestoreId(i.id, 'intk');
      const payload: Record<string, unknown> = {
        id,
        clientName: clampString(i.clientName, 120, 'موكل'),
        clientPhone: ensureValidJordanianPhone(i.clientPhone),
        specialtyId: normalizeSpecialtyId(i.specialtyId),
        factsSummary: clampString(i.factsSummary, 2000, 'ملخص استشارة أولية'),
        documentsStatus: clampString(i.documentsStatus, 500, 'قيد المراجعة'),
        urgency: i.urgency === 'urgent' ? 'urgent' : 'normal',
        recommendedMode: i.recommendedMode === 'online' ? 'online' : 'in_person',
        createdByUid: uid,
        createdAt: now,
        updatedAt: now,
      };
      if (i.convertedToCaseId?.trim()) {
        payload.convertedToCaseId = sanitizeFirestoreId(i.convertedToCaseId, 'case');
      }
      batch.set(doc(db, 'intakes', id), payload);
    }

    for (const inq of seed.inquiries) {
      const id = sanitizeFirestoreId(inq.id, 'inq');
      batch.set(doc(db, 'inquiries', id), {
        id,
        name: clampString(inq.name, 120, 'زائر'),
        phone: ensureValidJordanianPhone(inq.phone),
        specialtyId: normalizeSpecialtyId(inq.specialtyId),
        message: clampString(inq.message, 2000, 'استفسار قانوني'),
        createdByUid: uid,
        createdAt: now,
        updatedAt: now,
      });
    }

    await batch.commit();
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'lawyers');
  }
}

export async function createCaseInFirestore(payload: {
  clientName: string;
  clientPhone: string;
  specialtyId: SpecialtyId;
  courtName: string;
  assignedLawyer: string;
  stage: CaseStage;
  nextHearingDate: string;
  summary: string;
  intakeId?: string;
}): Promise<string> {
  const uid = requireSignedInUid();
  const id = sanitizeFirestoreId(`case-${Date.now().toString(36)}`, 'case');
  const caseNumber = `IRB-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

  try {
    const batch = writeBatch(db);
    const now = serverTimestamp();

    batch.set(doc(db, 'cases', id), {
      id,
      caseNumber,
      clientName: clampString(payload.clientName, 120, 'موكل'),
      clientPhone: ensureValidJordanianPhone(payload.clientPhone),
      specialtyId: normalizeSpecialtyId(payload.specialtyId),
      courtName: clampString(payload.courtName, 160, 'محكمة بداية إربد'),
      assignedLawyer: clampString(payload.assignedLawyer, 120, 'المحامي رضوان علي البطاينة'),
      stage: payload.stage || 'intake',
      nextHearingDate: clampString(payload.nextHearingDate, 40, 'قيد التحديد'),
      summary: clampString(payload.summary, 2000, 'ملف قضية قانونية'),
      createdByUid: uid,
      createdAt: now,
      updatedAt: now,
    });

    if (payload.intakeId) {
      const intakeDocId = sanitizeFirestoreId(payload.intakeId, 'intk');
      batch.update(doc(db, 'intakes', intakeDocId), {
        convertedToCaseId: id,
        updatedAt: now,
      });
    }

    await batch.commit();
    return id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `cases/${id}`);
  }
}

export async function updateCaseInFirestore(
  id: string,
  updates: { stage?: CaseStage; nextHearingDate?: string; assignedLawyer?: string }
): Promise<void> {
  requireSignedInUid();
  const cleanId = sanitizeFirestoreId(id, 'case');
  const patch: Record<string, unknown> = { updatedAt: serverTimestamp() };
  if (updates.stage) patch.stage = updates.stage;
  if (updates.nextHearingDate !== undefined) {
    patch.nextHearingDate = clampString(updates.nextHearingDate, 40, 'قيد التحديد');
  }
  if (updates.assignedLawyer !== undefined) {
    patch.assignedLawyer = clampString(updates.assignedLawyer, 120, 'المحامي رضوان علي البطاينة');
  }

  try {
    await updateDoc(doc(db, 'cases', cleanId), patch);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `cases/${cleanId}`);
  }
}

export async function updateBookingInFirestore(
  id: string,
  updates: { status?: BookingStatus; assignedLawyer?: string }
): Promise<void> {
  requireSignedInUid();
  const cleanId = sanitizeFirestoreId(id, 'bk');
  const patch: Record<string, unknown> = { updatedAt: serverTimestamp() };
  if (updates.status) patch.status = updates.status;
  if (updates.assignedLawyer !== undefined) {
    patch.assignedLawyer = clampString(updates.assignedLawyer, 120, 'المحامي رضوان علي البطاينة');
  }

  try {
    await updateDoc(doc(db, 'bookings', cleanId), patch);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `bookings/${cleanId}`);
  }
}

export async function createLawyerInFirestore(payload: {
  name: string;
  nameEn?: string;
  phone: string;
  email?: string;
  role: LawyerRole;
  specialties: SpecialtyId[];
  status: LawyerStatus;
  canManageRoles: boolean;
}): Promise<string> {
  const uid = requireSignedInUid();
  const id = sanitizeFirestoreId(`law-${Date.now().toString(36)}`, 'law');
  const now = serverTimestamp();

  const docData: Record<string, unknown> = {
    id,
    name: clampString(payload.name, 120, 'محامي جديد'),
    phone: ensureValidJordanianPhone(payload.phone),
    role: normalizeLawyerRole(payload.role),
    specialties: sanitizeSpecialties(payload.specialties),
    status: payload.status === 'on_leave' ? 'on_leave' : 'active',
    canManageRoles: Boolean(payload.canManageRoles),
    joinedAt: new Date().toISOString().slice(0, 10),
    createdByUid: uid,
    createdAt: now,
    updatedAt: now,
  };
  if (payload.nameEn?.trim()) docData.nameEn = clampString(payload.nameEn, 120);
  if (payload.email?.trim()) docData.email = clampString(payload.email, 160);

  try {
    await setDoc(doc(db, 'lawyers', id), docData);
    return id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `lawyers/${id}`);
  }
}

export async function updateLawyerInFirestore(
  id: string,
  updates: Partial<{
    role: LawyerRole;
    status: LawyerStatus;
    canManageRoles: boolean;
    specialties: SpecialtyId[];
  }>
): Promise<void> {
  requireSignedInUid();
  const cleanId = sanitizeFirestoreId(id, 'law');
  const patch: Record<string, unknown> = { updatedAt: serverTimestamp() };
  if (updates.role) patch.role = normalizeLawyerRole(updates.role);
  if (updates.status) patch.status = updates.status === 'on_leave' ? 'on_leave' : 'active';
  if (updates.canManageRoles !== undefined) patch.canManageRoles = Boolean(updates.canManageRoles);
  if (updates.specialties) patch.specialties = sanitizeSpecialties(updates.specialties);

  try {
    await updateDoc(doc(db, 'lawyers', cleanId), patch);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `lawyers/${cleanId}`);
  }
}

export async function deleteLawyerWithHandoverInFirestore(
  lawyer: FirmLawyer,
  reassignToLawyerName: string,
  currentCases: LegalCase[],
  currentBookings: ConsultationBooking[]
): Promise<{ reassignedCases: number; reassignedBookings: number }> {
  requireSignedInUid();
  const cleanId = sanitizeFirestoreId(lawyer.id, 'law');
  const targetName = clampString(reassignToLawyerName, 120, 'المحامي رضوان علي البطاينة');
  const affectedCases = currentCases.filter((c) => c.assignedLawyer === lawyer.name);
  const affectedBookings = currentBookings.filter((b) => b.assignedLawyer === lawyer.name);

  try {
    if (affectedCases.length === 0 && affectedBookings.length === 0) {
      await deleteDoc(doc(db, 'lawyers', cleanId));
      return { reassignedCases: 0, reassignedBookings: 0 };
    }

    const batch = writeBatch(db);
    const now = serverTimestamp();

    for (const c of affectedCases) {
      batch.update(doc(db, 'cases', sanitizeFirestoreId(c.id, 'case')), {
        assignedLawyer: targetName,
        updatedAt: now,
      });
    }
    for (const b of affectedBookings) {
      batch.update(doc(db, 'bookings', sanitizeFirestoreId(b.id, 'bk')), {
        assignedLawyer: targetName,
        updatedAt: now,
      });
    }
    batch.delete(doc(db, 'lawyers', cleanId));
    await batch.commit();

    return {
      reassignedCases: affectedCases.length,
      reassignedBookings: affectedBookings.length,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `lawyers/${cleanId}`);
  }
}

export async function bulkTransferInFirestore(
  payload: {
    fromLawyerName: string;
    toLawyerName: string;
    scope: 'active_cases' | 'all_cases' | 'all_cases_and_bookings';
  },
  currentCases: LegalCase[],
  currentBookings: ConsultationBooking[]
): Promise<{ transferredCases: number; transferredBookings: number }> {
  requireSignedInUid();
  const targetName = clampString(payload.toLawyerName, 120, 'المحامي رضوان علي البطاينة');

  const targetCases = currentCases.filter((c) => {
    if (c.assignedLawyer !== payload.fromLawyerName) return false;
    if (payload.scope === 'active_cases') return c.stage !== 'closed';
    return true;
  });

  const targetBookings =
    payload.scope === 'all_cases_and_bookings'
      ? currentBookings.filter((b) => b.assignedLawyer === payload.fromLawyerName)
      : [];

  if (targetCases.length === 0 && targetBookings.length === 0) {
    return { transferredCases: 0, transferredBookings: 0 };
  }

  try {
    const batch = writeBatch(db);
    const now = serverTimestamp();

    for (const c of targetCases) {
      batch.update(doc(db, 'cases', sanitizeFirestoreId(c.id, 'case')), {
        assignedLawyer: targetName,
        updatedAt: now,
      });
    }
    for (const b of targetBookings) {
      batch.update(doc(db, 'bookings', sanitizeFirestoreId(b.id, 'bk')), {
        assignedLawyer: targetName,
        updatedAt: now,
      });
    }

    await batch.commit();
    return {
      transferredCases: targetCases.length,
      transferredBookings: targetBookings.length,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'cases');
  }
}

/**
 * Mirrors newly received public Contact Form inquiries from the Express endpoint
 * into Cloud Firestore so they persist permanently across sessions and devices.
 */
export async function syncInquiriesToFirestore(
  serverInquiries: ContactInquiry[],
  existingFirestoreIds: Set<string>
): Promise<number> {
  const uid = requireSignedInUid();
  const missing = serverInquiries.filter(
    (inq) => !existingFirestoreIds.has(sanitizeFirestoreId(inq.id, 'inq'))
  );
  if (missing.length === 0) return 0;

  try {
    const batch = writeBatch(db);
    const now = serverTimestamp();

    for (const inq of missing) {
      const id = sanitizeFirestoreId(inq.id, 'inq');
      batch.set(doc(db, 'inquiries', id), {
        id,
        name: clampString(inq.name, 120, 'زائر'),
        phone: ensureValidJordanianPhone(inq.phone),
        specialtyId: normalizeSpecialtyId(inq.specialtyId),
        message: clampString(inq.message, 2000, 'استفسار قانوني'),
        createdByUid: uid,
        createdAt: now,
        updatedAt: now,
      });
    }

    await batch.commit();
    return missing.length;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'inquiries');
  }
}
