export type Language = 'ar' | 'en';

export type SpecialtyId =
  | 'civil'
  | 'sharia'
  | 'criminal'
  | 'commercial'
  | 'labor'
  | 'administrative'
  | 'arbitration';

export type BranchId = 'irbid' | 'amman' | 'online';

export type ConsultationMode = 'in_person' | 'online';

export type PaymentMethod = 'free' | 'cliq' | 'card';

export type BookingStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';

export type CaseStage =
  | 'intake'
  | 'drafting'
  | 'litigation'
  | 'execution'
  | 'closed';

export interface IntakeSummary {
  id: string;
  clientName: string;
  clientPhone: string;
  specialtyId: SpecialtyId;
  factsSummary: string;
  documentsStatus: string;
  urgency: 'normal' | 'urgent';
  recommendedMode: ConsultationMode;
  createdAt: string;
  convertedToCaseId?: string;
}

export interface ConsultationBooking {
  id: string;
  referenceCode: string;
  clientName: string;
  clientPhone: string;
  specialtyId: SpecialtyId;
  branch?: BranchId;
  mode: ConsultationMode;
  date: string;
  timeSlot: string;
  feeJod: number;
  paymentMethod: PaymentMethod;
  paymentReference: string;
  otpVerified: boolean;
  caseSummary?: string;
  status: BookingStatus;
  assignedLawyer: string;
  createdAt: string;
}

export interface LegalCase {
  id: string;
  caseNumber: string;
  clientId?: string;
  clientName: string;
  clientPhone: string;
  specialtyId: SpecialtyId;
  courtName: string;
  assignedLawyer: string;
  stage: CaseStage;
  nextHearingDate: string;
  summary: string;
  updatedAt: string;
}

export interface ContactInquiry {
  id: string;
  name: string;
  phone: string;
  specialtyId: SpecialtyId;
  message: string;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

export type LawyerRole =
  | 'managing_partner'
  | 'partner'
  | 'senior_lawyer'
  | 'associate_lawyer'
  | 'legal_consultant'
  | 'trainee_lawyer';

export type LawyerStatus = 'active' | 'on_leave';

export interface FirmLawyer {
  id: string;
  name: string;
  nameEn?: string;
  phone: string;
  email?: string;
  role: LawyerRole;
  specialties: SpecialtyId[];
  status: LawyerStatus;
  canManageRoles: boolean;
  joinedAt: string;
}

export interface ClientProfile {
  id: string;
  fullName: string;
  phone: string;
  nationalId?: string;
  email?: string;
  address?: string;
  notes?: string;
  assignedLawyer: string;
  createdAt: string;
  updatedAt: string;
}

export interface CaseHearing {
  id: string;
  caseId: string;
  date: string;
  time?: string;
  courtName: string;
  title: string;
  notes?: string;
  status: 'scheduled' | 'completed' | 'postponed';
  createdBy: string;
  createdAt: string;
}

export interface CaseTask {
  id: string;
  caseId?: string;
  title: string;
  dueDate?: string;
  assignedLawyer: string;
  priority: 'normal' | 'high' | 'urgent';
  status: 'todo' | 'in_progress' | 'done';
  createdBy: string;
  createdAt: string;
}

export interface CaseAttachment {
  id: string;
  caseId: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  textExtract?: string;
  uploadedBy: string;
  uploadedAt: string;
}

export type LegalDocumentType =
  | 'lawsuit'
  | 'defense_memo'
  | 'legal_memo'
  | 'petition'
  | 'notarial_notice'
  | 'contract'
  | 'expert_request'
  | 'appeal_objection'
  | 'power_of_attorney'
  | 'official_letter'
  | 'government_request'
  | 'case_summary'
  | 'contract_analysis'
  | 'entity_extraction'
  | 'legal_review'
  | 'draft_revision'
  | 'attachments_checklist'
  | 'print_bundle';

export type DocumentStatus = 'draft' | 'reviewed' | 'approved' | 'signed_ready' | 'submitted';

export interface DocumentVersion {
  versionNumber: number;
  content: string;
  changeNote: string;
  editedBy: string;
  editedAt: string;
}

export interface LegalReferenceCitation {
  lawName: string;
  article?: string;
  year?: string;
  note?: string;
  verified: boolean;
}

export interface LegalDocumentRecord {
  id: string;
  title: string;
  documentType: LegalDocumentType;
  caseId?: string;
  clientId?: string;
  clientName?: string;
  courtOrAuthority?: string;
  status: DocumentStatus;
  bodyText: string;
  attachmentsChecklist?: string[];
  legalReferences?: LegalReferenceCitation[];
  extractedEntities?: {
    parties?: string[];
    dates?: string[];
    amounts?: string[];
  };
  createdBy: string;
  createdByRole: LawyerRole;
  approvedBy?: string;
  approvedAt?: string;
  signedBy?: string;
  signedAt?: string;
  versions: DocumentVersion[];
  createdAt: string;
  updatedAt: string;
}

export type PublicationCategory = 'article' | 'analysis' | 'media' | 'interview' | 'news';

export interface FirmPublication {
  id: string;
  slug: string;
  category: PublicationCategory;
  titleAr: string;
  titleEn?: string;
  summaryAr: string;
  summaryEn?: string;
  contentAr: string;
  contentEn?: string;
  authorName: string;
  mediaOutlet?: string;
  publishedAt: string;
  featured: boolean;
  status: 'draft' | 'published';
  seoKeywords?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface AuditLogEntry {
  id: string;
  actorName: string;
  actorRole: string;
  action: string;
  entityType: string;
  entityId: string;
  summary: string;
  timestamp: string;
}

export interface AuthSessionUser {
  id: string;
  username: string;
  displayName: string;
  role: LawyerRole;
  lawyerId?: string;
  canManageRoles: boolean;
  specialties: SpecialtyId[];
}
