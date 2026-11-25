import { useCallback, useEffect, useState } from 'react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import type {
  AuditLogEntry,
  AuthSessionUser,
  BookingStatus,
  CaseAttachment,
  CaseHearing,
  CaseTask,
  ClientProfile,
  ConsultationBooking,
  ContactInquiry,
  FirmLawyer,
  FirmPublication,
  IntakeSummary,
  Language,
  LawyerRole,
  LawyerStatus,
  LegalCase,
  LegalDocumentRecord,
  SpecialtyId,
} from './types/legal.js';
import { DEFAULT_PUBLICATIONS } from './data/firmContent.js';
import { Navbar } from './components/Navbar.js';
import { HeroSection } from './components/HeroSection.js';
import { AboutAndTeamSection } from './components/AboutAndTeamSection.js';
import { SpecialtiesSection } from './components/SpecialtiesSection.js';
import { MediaAndArticlesSection } from './components/MediaAndArticlesSection.js';
import { TestimonialsAndContactSection } from './components/TestimonialsAndContactSection.js';
import { Footer } from './components/Footer.js';
import { FounderProfileModal } from './components/FounderProfileModal.js';
import { BookingModal } from './components/BookingModal.js';
import { LawyerDashboard } from './components/LawyerDashboard.js';
import { AdminLoginGate } from './components/AdminLoginGate.js';
import { isAdminHashRoute } from './utils/legalWorkflow.js';

const AUTH_TOKEN_KEY = 'rb_legal_auth_token';
const AUTH_USER_KEY = 'rb_legal_auth_user';

function readStoredAuth(): { token: string; user: AuthSessionUser | null } {
  try {
    const token = window.sessionStorage.getItem(AUTH_TOKEN_KEY) ?? '';
    const rawUser = window.sessionStorage.getItem(AUTH_USER_KEY);
    const user = rawUser ? (JSON.parse(rawUser) as AuthSessionUser) : null;
    return { token, user };
  } catch {
    return { token: '', user: null };
  }
}

export default function App() {
  const initialAuth = readStoredAuth();
  const [lang, setLang] = useState<Language>('ar');
  const [isAdminRoute, setIsAdminRoute] = useState<boolean>(false);
  const [authToken, setAuthToken] = useState<string>(initialAuth.token);
  const [currentUser, setCurrentUser] = useState<AuthSessionUser | null>(initialAuth.user);

  const [founderCvOpen, setFounderCvOpen] = useState(false);
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [bookingInitialSpec, setBookingInitialSpec] = useState<SpecialtyId | undefined>(undefined);

  const [publications, setPublications] = useState<FirmPublication[]>(DEFAULT_PUBLICATIONS);
  const [bookings, setBookings] = useState<ConsultationBooking[]>([]);
  const [cases, setCases] = useState<LegalCase[]>([]);
  const [intakes, setIntakes] = useState<IntakeSummary[]>([]);
  const [inquiries, setInquiries] = useState<ContactInquiry[]>([]);
  const [lawyers, setLawyers] = useState<FirmLawyer[]>([]);
  const [clients, setClients] = useState<ClientProfile[]>([]);
  const [hearings, setHearings] = useState<CaseHearing[]>([]);
  const [tasks, setTasks] = useState<CaseTask[]>([]);
  const [attachments, setAttachments] = useState<CaseAttachment[]>([]);
  const [documents, setDocuments] = useState<LegalDocumentRecord[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  }, [lang]);

  useEffect(() => {
    if (isAdminHashRoute(window.location.hash)) {
      window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
    }
    if (window.location.hash === '#founder') {
      setFounderCvOpen(true);
    }
  }, []);

  // Load public articles & media on initial render
  useEffect(() => {
    void fetch('/api/publications')
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { publications?: FirmPublication[] } | null) => {
        if (data?.publications && data.publications.length > 0) {
          setPublications(data.publications);
        }
      })
      .catch(() => {
        // Keep default publications gracefully
      });
  }, []);

  const clearSession = useCallback(() => {
    try {
      window.sessionStorage.removeItem(AUTH_TOKEN_KEY);
      window.sessionStorage.removeItem(AUTH_USER_KEY);
    } catch {
      // Ignore storage restrictions
    }
    setAuthToken('');
    setCurrentUser(null);
  }, []);

  const fetchDashboardData = useCallback(async () => {
    if (!authToken) return;
    setLoadingData(true);
    try {
      const res = await fetch('/api/dashboard-data', {
        headers: { Authorization: `Bearer ${authToken}` },
        credentials: 'include',
      });
      if (res.status === 401) {
        clearSession();
        return;
      }
      if (!res.ok) return;
      const data = (await res.json()) as {
        user?: AuthSessionUser;
        bookings?: ConsultationBooking[];
        cases?: LegalCase[];
        intakes?: IntakeSummary[];
        inquiries?: ContactInquiry[];
        lawyers?: FirmLawyer[];
        clients?: ClientProfile[];
        hearings?: CaseHearing[];
        tasks?: CaseTask[];
        attachments?: CaseAttachment[];
        documents?: LegalDocumentRecord[];
        publications?: FirmPublication[];
        auditLogs?: AuditLogEntry[];
      };
      if (data.user) setCurrentUser(data.user);
      setBookings(data.bookings ?? []);
      setCases(data.cases ?? []);
      setIntakes(data.intakes ?? []);
      setInquiries(data.inquiries ?? []);
      setLawyers(data.lawyers ?? []);
      setClients(data.clients ?? []);
      setHearings(data.hearings ?? []);
      setTasks(data.tasks ?? []);
      setAttachments(data.attachments ?? []);
      setDocuments(data.documents ?? []);
      if (data.publications) setPublications(data.publications);
      setAuditLogs(data.auditLogs ?? []);
    } finally {
      setLoadingData(false);
    }
  }, [authToken, clearSession]);

  useEffect(() => {
    if (!isAdminRoute || !authToken) return;
    void fetchDashboardData();
  }, [isAdminRoute, authToken, fetchDashboardData]);

  function handleLoginSuccess(session: { token: string; user: AuthSessionUser }) {
    try {
      window.sessionStorage.setItem(AUTH_TOKEN_KEY, session.token);
      window.sessionStorage.setItem(AUTH_USER_KEY, JSON.stringify(session.user));
    } catch {
      // Ignore storage errors
    }
    setAuthToken(session.token);
    setCurrentUser(session.user);
  }

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }).catch(() => {});
    clearSession();
  }

  function openBooking(specialtyId?: SpecialtyId) {
    setBookingInitialSpec(specialtyId);
    setBookingModalOpen(true);
  }

  async function handleUpdateBooking(
    id: string,
    updates: { status?: BookingStatus; assignedLawyer?: string }
  ) {
    const res = await fetch(`/api/bookings/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      credentials: 'include',
      body: JSON.stringify(updates),
    });
    if (res.ok) {
      const data = (await res.json()) as { booking: ConsultationBooking };
      setBookings((prev) => prev.map((b) => (b.id === id ? data.booking : b)));
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
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      credentials: 'include',
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
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      credentials: 'include',
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
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      credentials: 'include',
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
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      credentials: 'include',
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

  const isAuthenticated = Boolean(authToken && currentUser);

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF8F3] text-[#0B132B] overflow-x-clip">
      {isAdminRoute ? (
        isAuthenticated && currentUser ? (
          <LawyerDashboard
            lang={lang}
            authToken={authToken}
            currentUser={currentUser}
            bookings={bookings}
            cases={cases}
            intakes={intakes}
            inquiries={inquiries}
            lawyers={lawyers}
            clients={clients}
            hearings={hearings}
            tasks={tasks}
            attachments={attachments}
            documents={documents}
            publications={publications}
            auditLogs={auditLogs}
            loading={loadingData}
            onExitDashboard={() => {
              setIsAdminRoute(false);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onLogout={() => void handleLogout()}
            onToggleLanguage={() => setLang((p) => (p === 'ar' ? 'en' : 'ar'))}
            onUpdateBooking={handleUpdateBooking}
            onCreateLawyer={handleCreateLawyer}
            onUpdateLawyer={handleUpdateLawyer}
            onDeleteLawyer={handleDeleteLawyer}
            onBulkTransfer={handleBulkTransfer}
            onCaseCreated={(c) => setCases((p) => [c, ...p])}
            onCaseUpdated={(c) => setCases((p) => p.map((x) => (x.id === c.id ? c : x)))}
            onClientCreated={(cl) => setClients((p) => [cl, ...p])}
            onHearingCreated={(h) => setHearings((p) => [h, ...p])}
            onTaskCreated={(t) => setTasks((p) => [t, ...p])}
            onTaskUpdated={(t) => setTasks((p) => p.map((x) => (x.id === t.id ? t : x)))}
            onAttachmentCreated={(a) => setAttachments((p) => [a, ...p])}
            onDocumentSaved={(doc) =>
              setDocuments((p) =>
                p.some((d) => d.id === doc.id)
                  ? p.map((d) => (d.id === doc.id ? doc : d))
                  : [doc, ...p]
              )
            }
            onPublicationCreated={(pub) => setPublications((p) => [pub, ...p])}
            onPublicationDeleted={(id) =>
              setPublications((p) => p.filter((x) => x.id !== id))
            }
            onInquiriesSynced={setInquiries}
          />
        ) : (
          <AdminLoginGate
            lang={lang}
            onLoginSuccess={handleLoginSuccess}
            onExitToPublic={() => setIsAdminRoute(false)}
            onToggleLanguage={() => setLang((p) => (p === 'ar' ? 'en' : 'ar'))}
          />
        )
      ) : (
        <>
          <Navbar
            lang={lang}
            onBookClick={() => openBooking()}
            onOpenFounderCv={() => setFounderCvOpen(true)}
            onLawyerLoginClick={() => {
              setIsAdminRoute(true);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onToggleLanguage={() => setLang((p) => (p === 'ar' ? 'en' : 'ar'))}
          />

          <main className="flex-1">
            <HeroSection
              lang={lang}
              onBookClick={() => openBooking()}
              onOpenFounderCv={() => setFounderCvOpen(true)}
              onToggleLanguage={() => setLang((p) => (p === 'ar' ? 'en' : 'ar'))}
            />

            <AboutAndTeamSection
              lang={lang}
              onBookWithTeam={() => openBooking()}
              onOpenFounderCv={() => setFounderCvOpen(true)}
            />

            <SpecialtiesSection
              lang={lang}
              onBookWithSpecialty={(spec) => openBooking(spec)}
            />

            <MediaAndArticlesSection
              lang={lang}
              publications={publications}
              onBookClick={() => openBooking()}
            />

            <TestimonialsAndContactSection
              lang={lang}
              onBookClick={() => openBooking()}
            />
          </main>

          <Footer
            lang={lang}
            onLawyerLoginClick={() => {
              setIsAdminRoute(true);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onToggleLanguage={() => setLang((p) => (p === 'ar' ? 'en' : 'ar'))}
          />
        </>
      )}

      <FounderProfileModal
        isOpen={founderCvOpen}
        lang={lang}
        onClose={() => setFounderCvOpen(false)}
        onBookWithFounder={() => openBooking()}
      />

      <BookingModal
        isOpen={bookingModalOpen}
        lang={lang}
        initialSpecialty={bookingInitialSpec}
        onClose={() => setBookingModalOpen(false)}
        onBookingCreated={(booking) => setBookings((prev) => [booking, ...prev])}
      />

      <SpeedInsights />
    </div>
  );
}
