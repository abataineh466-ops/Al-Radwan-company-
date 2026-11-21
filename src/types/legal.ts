export type Language = 'ar' | 'en';

export type SpecialtyId =
  | 'civil'
  | 'sharia'
  | 'criminal'
  | 'commercial'
  | 'labor'
  | 'administrative'
  | 'arbitration';

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

