import { useEffect, useState } from 'react';
import { MessageSquareText } from 'lucide-react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { Analytics } from '@vercel/analytics/react';
import type {
  BookingStatus,
  CaseStage,
  ConsultationBooking,
  IntakeSummary,
  Language,
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
  const [isAdminRoute, setIsAdminRoute] = useState<boolean>(() =>
    isAdminHashRoute(window.location.hash)
  );
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(readAdminSession);

  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiInitialSpec, setAiInitialSpec] = useState<SpecialtyId | undefined>(undefined);

  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [bookingInitialSpec, setBookingInitialSpec] = useState<SpecialtyId | undefined>(undefined);
  const [prefilledIntake, setPrefilledIntake] = useState<IntakeSummary | null>(null);

  const [bookings, setBookings] = useState<ConsultationBooking[]>([]);
  const [cases, setCases] = useState<LegalCase[]>([]);
  const [intakes, setIntakes] = useState<IntakeSummary[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  // Sync HTML lang & RTL/LTR direction automatically
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  }, [lang]);

  // Listen for #admin hash navigation
  useEffect(() => {
    function handleHashChange() {
      setIsAdminRoute(isAdminHashRoute(window.location.hash));
    }
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
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
      };
      setBookings(data.bookings ?? []);
      setCases(data.cases ?? []);
      setIntakes(data.intakes ?? []);
    } finally {
      setLoadingData(false);
    }
  }

  // Only load private firm dashboard data after staff authenticates on #admin
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

  function handleExitAdmin() {
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
    setIsAdminRoute(false);
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

  async function handleUpdateBookingStatus(id: string, status: BookingStatus) {
    const res = await fetch(`/api/bookings/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
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
    updates: { stage?: CaseStage; nextHearingDate?: string }
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

  return (
    <div className="min-h-screen flex flex-col bg-white text-[#0B132B] overflow-x-clip">
      {isAdminRoute ? (
        isAdminAuthenticated ? (
          <LawyerDashboard
            lang={lang}
            bookings={bookings}
            cases={cases}
            intakes={intakes}
            loading={loadingData}
            onExitDashboard={handleExitAdmin}
            onLogout={handleAdminLogout}
            onToggleLanguage={toggleLanguage}
            onUpdateBookingStatus={handleUpdateBookingStatus}
            onCreateCase={handleCreateCase}
            onUpdateCase={handleUpdateCase}
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

          <Footer lang={lang} onToggleLanguage={toggleLanguage} />

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
      <Analytics />
    </div>
  );
}
