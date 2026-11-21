import { useEffect, useState } from 'react';
import { MessageSquareText } from 'lucide-react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import type {
  BookingStatus,
  CaseStage,
  ConsultationBooking,
  ContactInquiry,
  FirmLawyer,
  IntakeSummary,
  Language,
  LawyerRole,
  LawyerStatus,
  LegalCase,
  SpecialtyId,
} from './types/legal';
import { Navbar } from './components/Navbar';
import { HeroSection } from './components/HeroSection';
import { AboutAndTeamSection } from './components/AboutAndTeamSection';
import { SpecialtiesSection } from './components/SpecialtiesSection';
import { TestimonialsAndContactSection } from './components/TestimonialsAndContactSection';
import { Footer } from './components/Footer';
import { AiIntakeModal } from './components/AiIntakeModal';
import { BookingModal } from './components/BookingModal';
import { LawyerDashboard } from './components/LawyerDashboard';
import { AdminLoginGate } from './components/AdminLoginGate';
import { ADMIN_SESSION_STORAGE_KEY, isAdminHashRoute } from './utils/legalWorkflow';

function readAdminSession(): boolean {
  try {
    return window.sessionStorage.getItem(ADMIN_SESSION_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export default function App() {
  const [lang, setLang] = useState<Language>('ar');
  // Always land on the public client homepage first on open/reload
  const [isAdminRoute, setIsAdminRoute] = useState<boolean>(false);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(readAdminSession);

  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiInitialSpec, setAiInitialSpec] = useState<SpecialtyId | undefined>(undefined);

  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [bookingInitialSpec, setBookingInitialSpec] = useState<SpecialtyId | undefined>(undefined);
  const [prefilledIntake, setPrefilledIntake] = useState<IntakeSummary | null>(null);

  const [bookings, setBookings] = useState<ConsultationBooking[]>([]);
  const [cases, setCases] = useState<LegalCase[]>([]);
  const [intakes, setIntakes] = useState<IntakeSummary[]>([]);
  const [inquiries, setInquiries] = useState<ContactInquiry[]>([]);
  const [lawyers, setLawyers] = useState<FirmLawyer[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  // Sync HTML lang & RTL/LTR direction automatically
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  }, [lang]);

  // Clear any stale #admin hash on initial load so opening or refreshing the link
  // ALWAYS presents the public client homepage first; lawyers enter explicitly via the Lawyer Login button
  useEffect(() => {
    if (isAdminHashRoute(window.location.hash)) {
      window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
    }
  }, []);

  async function fetchDashboardData() {
    setLoadingData(true);
    try {
      const res = await fetch('/api/dashboard-data');
      if (!res.ok) return;
      const data = (await res.json()) as {
        bookings: ConsultationBooking[];
        cases: LegalCase[];
        intakes: IntakeSummary[];
        inquiries?: ContactInquiry[];
        lawyers?: FirmLawyer[];
      };
      setBookings(data.bookings ?? []);
      setCases(data.cases ?? []);
      setIntakes(data.intakes ?? []);
      setInquiries(data.inquiries ?? []);
      setLawyers(data.lawyers ?? []);
    } finally {
      setLoadingData(false);
    }
  }

  // Only load private firm dashboard data after staff authenticates
  useEffect(() => {
    if (isAdminRoute && isAdminAuthenticated) {
      fetchDashboardData();
    }
  }, [isAdminRoute, isAdminAuthenticated]);

  function toggleLanguage() {
    setLang((prev) => (prev === 'ar' ? 'en' : 'ar'));
  }

  function handleAdminLoginSuccess() {
    try {
      window.sessionStorage.setItem(ADMIN_SESSION_STORAGE_KEY, '1');
    } catch {
      // Ignore storage restriction errors
    }
    setIsAdminAuthenticated(true);
  }

  function handleAdminLogout() {
    try {
      window.sessionStorage.removeItem(ADMIN_SESSION_STORAGE_KEY);
    } catch {
      // Ignore storage restriction errors
    }
    setIsAdminAuthenticated(false);
  }

  function handleOpenLawyerLogin() {
    setIsAdminRoute(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleExitAdmin() {
    if (isAdminHashRoute(window.location.hash)) {
      window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
    }
    setIsAdminRoute(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function openBooking(specialtyId?: SpecialtyId, intake?: IntakeSummary | null) {
    setBookingInitialSpec(specialtyId);
    setPrefilledIntake(intake ?? null);
    setBookingModalOpen(true);
  }

  function openAiIntake(specialtyId?: SpecialtyId) {
    setAiInitialSpec(specialtyId);
    setAiModalOpen(true);
  }

  async function handleUpdateBooking(
    id: string,
    updates: { status?: BookingStatus; assignedLawyer?: string }
  ) {
    const res = await fetch(`/api/bookings/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (res.ok) {
      const data = (await res.json()) as { booking: ConsultationBooking };
      setBookings((prev) => prev.map((b) => (b.id === id ? data.booking : b)));
    }
  }

  async function handleCreateCase(payload: {
    clientName: string;
    clientPhone: string;
    specialtyId: SpecialtyId;
    courtName: string;
    assignedLawyer: string;
    stage: CaseStage;
    nextHearingDate: string;
    summary: string;
    intakeId?: string;
  }) {
    const res = await fetch('/api/cases', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const data = (await res.json()) as { legalCase: LegalCase };
      setCases((prev) => [data.legalCase, ...prev]);
      if (payload.intakeId) {
        setIntakes((prev) =>
          prev.map((i) =>
            i.id === payload.intakeId ? { ...i, convertedToCaseId: data.legalCase.id } : i
          )
        );
      }
    }
  }

  async function handleUpdateCase(
    id: string,
    updates: { stage?: CaseStage; nextHearingDate?: string; assignedLawyer?: string }
  ) {
    const res = await fetch(`/api/cases/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (res.ok) {
      const data = (await res.json()) as { legalCase: LegalCase };
      setCases((prev) => prev.map((c) => (c.id === id ? data.legalCase : c)));
    }
  }

  async function handleCreateLawyer(payload: {
    name: string;
    nameEn?: string;
    phone: string;
    email?: string;
    role: LawyerRole;
    specialties: SpecialtyId[];
    status: LawyerStatus;
    canManageRoles: boolean;
  }): Promise<{ ok: boolean; error?: string }> {
    const res = await fetch('/api/lawyers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = (await res.json().catch(() => ({}))) as { lawyer?: FirmLawyer; error?: string };
    if (res.ok && data.lawyer) {
      setLawyers((prev) => [...prev, data.lawyer!]);
      return { ok: true };
    }
    return { ok: false, error: data.error };
  }

  async function handleUpdateLawyer(
    id: string,
    updates: Partial<{
      role: LawyerRole;
      status: LawyerStatus;
      canManageRoles: boolean;
      specialties: SpecialtyId[];
    }>
  ): Promise<{ ok: boolean; error?: string }> {
    const res = await fetch(`/api/lawyers/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    const data = (await res.json().catch(() => ({}))) as {
      lawyer?: FirmLawyer;
      cases?: LegalCase[];
      bookings?: ConsultationBooking[];
      error?: string;
    };
    if (res.ok && data.lawyer) {
      setLawyers((prev) => prev.map((l) => (l.id === id ? data.lawyer! : l)));
      if (data.cases) setCases(data.cases);
      if (data.bookings) setBookings(data.bookings);
      return { ok: true };
    }
    return { ok: false, error: data.error };
  }

  async function handleDeleteLawyer(
    id: string,
    reassignToLawyerName: string
  ): Promise<{
    ok: boolean;
    error?: string;
    reassignedCases?: number;
    reassignedBookings?: number;
  }> {
    const res = await fetch(`/api/lawyers/${id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reassignToLawyerName }),
    });
    const data = (await res.json().catch(() => ({}))) as {
      lawyers?: FirmLawyer[];
      cases?: LegalCase[];
      bookings?: ConsultationBooking[];
      reassignedCases?: number;
      reassignedBookings?: number;
      error?: string;
    };
    if (res.ok) {
      if (data.lawyers) setLawyers(data.lawyers);
      if (data.cases) setCases(data.cases);
      if (data.bookings) setBookings(data.bookings);
      return {
        ok: true,
        reassignedCases: data.reassignedCases,
        reassignedBookings: data.reassignedBookings,
      };
    }
    return { ok: false, error: data.error };
  }

  async function handleBulkTransfer(payload: {
    fromLawyerName: string;
    toLawyerName: string;
    scope: 'active_cases' | 'all_cases' | 'all_cases_and_bookings';
  }): Promise<{
    ok: boolean;
    error?: string;
    transferredCases?: number;
    transferredBookings?: number;
  }> {
    const res = await fetch('/api/admin/transfer-cases', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = (await res.json().catch(() => ({}))) as {
      cases?: LegalCase[];
      bookings?: ConsultationBooking[];
      transferredCases?: number;
      transferredBookings?: number;
      error?: string;
    };
    if (res.ok) {
      if (data.cases) setCases(data.cases);
      if (data.bookings) setBookings(data.bookings);
      return {
        ok: true,
        transferredCases: data.transferredCases,
        transferredBookings: data.transferredBookings,
      };
    }
    return { ok: false, error: data.error };
  }

  return (
    <div className="min-h-screen flex flex-col bg-white text-[#0B132B] overflow-x-clip">
      {isAdminRoute ? (
        isAdminAuthenticated ? (
          <LawyerDashboard
            lang={lang}
            bookings={bookings}
            cases={cases}
            intakes={intakes}
            inquiries={inquiries}
            lawyers={lawyers}
            loading={loadingData}
            onExitDashboard={handleExitAdmin}
            onLogout={handleAdminLogout}
            onToggleLanguage={toggleLanguage}
            onUpdateBooking={handleUpdateBooking}
            onCreateCase={handleCreateCase}
            onUpdateCase={handleUpdateCase}
            onCreateLawyer={handleCreateLawyer}
            onUpdateLawyer={handleUpdateLawyer}
            onDeleteLawyer={handleDeleteLawyer}
            onBulkTransfer={handleBulkTransfer}
            onInquiriesSynced={setInquiries}
          />
        ) : (
          <AdminLoginGate
            lang={lang}
            onLoginSuccess={handleAdminLoginSuccess}
            onExitToPublic={handleExitAdmin}
            onToggleLanguage={toggleLanguage}
          />
        )
      ) : (
        <>
          <Navbar
            lang={lang}
            onBookClick={() => openBooking()}
            onLawyerLoginClick={handleOpenLawyerLogin}
            onToggleLanguage={toggleLanguage}
          />

          <main className="flex-1">
            <HeroSection
              lang={lang}
              onBookClick={() => openBooking()}
              onOpenAiIntake={() => openAiIntake()}
              onToggleLanguage={toggleLanguage}
            />

            <AboutAndTeamSection
              lang={lang}
              onBookWithTeam={() => openBooking()}
            />

            <SpecialtiesSection
              lang={lang}
              onStartAiWithSpecialty={(spec) => openAiIntake(spec)}
              onBookWithSpecialty={(spec) => openBooking(spec)}
            />

            <TestimonialsAndContactSection
              lang={lang}
              onBookClick={() => openBooking()}
            />
          </main>

          <Footer
            lang={lang}
            onLawyerLoginClick={handleOpenLawyerLogin}
            onToggleLanguage={toggleLanguage}
          />

          {/* Compact Floating AI Intake Trigger (respects 15% mobile sticky cap) */}
          <button
            type="button"
            onClick={() => openAiIntake()}
            aria-label={
              lang === 'ar'
                ? 'فتح المساعد القانوني الذكي'
                : 'Open AI Legal Intake Assistant'
            }
            className="fixed bottom-4 end-4 z-40 h-11 px-3.5 rounded-xl bg-[#C5A059] hover:bg-[#d4b06a] text-[#0B132B] font-bold text-xs shadow-xl border border-[#0B132B]/15 flex items-center gap-2 cursor-pointer transition-transform active:scale-[0.98]"
          >
            <MessageSquareText className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span className="whitespace-nowrap">
              {lang === 'ar' ? 'اسأل المساعد الذكي' : 'AI Intake'}
            </span>
          </button>
        </>
      )}

      {/* Modals */}
      <AiIntakeModal
        isOpen={aiModalOpen}
        lang={lang}
        initialSpecialty={aiInitialSpec}
        onClose={() => setAiModalOpen(false)}
        onSummarySaved={(summary) => setIntakes((prev) => [summary, ...prev])}
        onProceedToBooking={(summary) => {
          setAiModalOpen(false);
          openBooking(summary.specialtyId, summary);
        }}
      />

      <BookingModal
        isOpen={bookingModalOpen}
        lang={lang}
        initialSpecialty={bookingInitialSpec}
        prefilledIntake={prefilledIntake}
        onClose={() => setBookingModalOpen(false)}
        onBookingCreated={(booking) => setBookings((prev) => [booking, ...prev])}
      />

      <SpeedInsights />
    </div>
  );
}
