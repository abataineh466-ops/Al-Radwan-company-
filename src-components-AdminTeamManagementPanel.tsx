import { useEffect, useState, type FormEvent } from 'react';
import {
  AlertTriangle,
  ArrowLeftRight,
  CheckCircle2,
  Mail,
  Phone,
  Shield,
  Trash2,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import type {
  ConsultationBooking,
  FirmLawyer,
  Language,
  LawyerRole,
  LawyerStatus,
  LegalCase,
  SpecialtyId,
} from '../types/legal.js';
import { SPECIALTIES } from '../data/firmContent.js';
import { LAWYER_ROLE_META, VALID_LAWYER_ROLES } from '../utils/adminAnalytics.js';

interface AdminTeamManagementPanelProps {
  lang: Language;
  lawyers: FirmLawyer[];
  cases: LegalCase[];
  bookings: ConsultationBooking[];
  preselectedTransferFrom?: string;
  onCreateLawyer: (payload: {
    name: string;
    nameEn?: string;
    phone: string;
    email?: string;
    role: LawyerRole;
    specialties: SpecialtyId[];
    status: LawyerStatus;
    canManageRoles: boolean;
  }) => Promise<{ ok: boolean; error?: string }>;
  onUpdateLawyer: (
    id: string,
    updates: Partial<{
      role: LawyerRole;
      status: LawyerStatus;
      canManageRoles: boolean;
      specialties: SpecialtyId[];
    }>
  ) => Promise<{ ok: boolean; error?: string }>;
  onDeleteLawyer: (
    id: string,
    reassignToLawyerName: string
  ) => Promise<{
    ok: boolean;
    error?: string;
    reassignedCases?: number;
    reassignedBookings?: number;
  }>;
  onBulkTransfer: (payload: {
    fromLawyerName: string;
    toLawyerName: string;
    scope: 'active_cases' | 'all_cases' | 'all_cases_and_bookings';
  }) => Promise<{
    ok: boolean;
    error?: string;
    transferredCases?: number;
    transferredBookings?: number;
  }>;
}

export function AdminTeamManagementPanel({
  lang,
  lawyers,
  cases,
  bookings,
  preselectedTransferFrom,
  onCreateLawyer,
  onUpdateLawyer,
  onDeleteLawyer,
  onBulkTransfer,
}: AdminTeamManagementPanelProps) {
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Add Lawyer Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newNameEn, setNewNameEn] = useState('');
  const [newPhone, setNewPhone] = useState('079');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<LawyerRole>('associate_lawyer');
  const [newStatus, setNewStatus] = useState<LawyerStatus>('active');
  const [newSpecialties, setNewSpecialties] = useState<SpecialtyId[]>(['civil']);
  const [savingNewLawyer, setSavingNewLawyer] = useState(false);

  // Bulk Transfer State
  const [fromLawyer, setFromLawyer] = useState<string>(
    preselectedTransferFrom || lawyers[0]?.name || ''
  );
  const [toLawyer, setToLawyer] = useState<string>(
    lawyers.find((l) => l.name !== (preselectedTransferFrom || lawyers[0]?.name))?.name || ''
  );
  const [transferScope, setTransferScope] = useState<
    'active_cases' | 'all_cases' | 'all_cases_and_bookings'
  >('active_cases');
  const [showTransferConfirm, setShowTransferConfirm] = useState(false);
  const [transferring, setTransferring] = useState(false);

  // Delete Lawyer Modal State
  const [deleteTarget, setDeleteTarget] = useState<FirmLawyer | null>(null);
  const [deleteReassignTo, setDeleteReassignTo] = useState<string>('');
  const [deletingLawyer, setDeletingLawyer] = useState(false);

  useEffect(() => {
    if (preselectedTransferFrom) {
      setFromLawyer(preselectedTransferFrom);
      const fallbackTo = lawyers.find((l) => l.name !== preselectedTransferFrom)?.name ?? '';
      setToLawyer(fallbackTo);
    }
  }, [preselectedTransferFrom, lawyers]);

  useEffect(() => {
    if (lawyers.length > 0 && !lawyers.some((l) => l.name === fromLawyer)) {
      setFromLawyer(lawyers[0].name);
    }
    if (lawyers.length > 1 && (!toLawyer || toLawyer === fromLawyer || !lawyers.some((l) => l.name === toLawyer))) {
      const next = lawyers.find((l) => l.name !== fromLawyer)?.name ?? '';
      setToLawyer(next);
    }
  }, [lawyers, fromLawyer, toLawyer]);

  function getLawyerCounts(lawyerName: string) {
    const trimmed = lawyerName.trim();
    const totalCases = cases.filter((c) => c.assignedLawyer.trim() === trimmed).length;
    const activeCases = cases.filter(
      (c) => c.assignedLawyer.trim() === trimmed && c.stage !== 'closed'
    ).length;
    const upcomingBookings = bookings.filter(
      (b) =>
        b.assignedLawyer.trim() === trimmed &&
        (b.status === 'pending' || b.status === 'confirmed')
    ).length;
    return { totalCases, activeCases, upcomingBookings };
  }

  function toggleNewSpecialty(specId: SpecialtyId) {
    setNewSpecialties((prev) =>
      prev.includes(specId)
        ? prev.length > 1
          ? prev.filter((id) => id !== specId)
          : prev
        : [...prev, specId]
    );
  }

  async function handleCreateSubmit(e: FormEvent) {
    e.preventDefault();
    if (newName.trim().length < 3) return;
    setSavingNewLawyer(true);
    setNotice(null);
    try {
      const res = await onCreateLawyer({
        name: newName.trim(),
        nameEn: newNameEn.trim() || undefined,
        phone: newPhone.trim() || '0796251902',
        email: newEmail.trim() || undefined,
        role: newRole,
        specialties: newSpecialties,
        status: newStatus,
        canManageRoles: LAWYER_ROLE_META[newRole].defaultCanManageRoles,
      });
      if (res.ok) {
        setShowAddModal(false);
        setNewName('');
        setNewNameEn('');
        setNewPhone('079');
        setNewEmail('');
        setNewRole('associate_lawyer');
        setNewStatus('active');
        setNewSpecialties(['civil']);
        setNotice({
          type: 'success',
          text:
            lang === 'ar'
              ? 'تمت إضافة المحامي الجديد إلى فريق الشركة بنجاح.'
              : 'New attorney added to the firm roster successfully.',
        });
      } else {
        setNotice({
          type: 'error',
          text:
            res.error ||
            (lang === 'ar' ? 'تعذر إضافة المحامي الجديد.' : 'Unable to add the new attorney.'),
        });
      }
    } finally {
      setSavingNewLawyer(false);
    }
  }

  async function handleRoleChange(lawyer: FirmLawyer, role: LawyerRole) {
    setNotice(null);
    const res = await onUpdateLawyer(lawyer.id, {
      role,
      canManageRoles: LAWYER_ROLE_META[role].defaultCanManageRoles,
    });
    if (res.ok) {
      setNotice({
        type: 'success',
        text:
          lang === 'ar'
            ? `تم تحديث دور ${lawyer.name} إلى «${LAWYER_ROLE_META[role].label.ar}».`
            : `Updated ${lawyer.name}'s role to "${LAWYER_ROLE_META[role].label.en}".`,
      });
    } else {
      setNotice({
        type: 'error',
        text: res.error || (lang === 'ar' ? 'فشل تحديث الدور.' : 'Failed to update role.'),
      });
    }
  }

  async function handleStatusToggle(lawyer: FirmLawyer) {
    setNotice(null);
    const nextStatus: LawyerStatus = lawyer.status === 'active' ? 'on_leave' : 'active';
    const res = await onUpdateLawyer(lawyer.id, { status: nextStatus });
    if (res.ok) {
      setNotice({
        type: 'success',
        text:
          lang === 'ar'
            ? `تم تغيير حالة ${lawyer.name} إلى «${nextStatus === 'active' ? 'نشط' : 'في إجازة'}».`
            : `Updated ${lawyer.name}'s status to ${nextStatus === 'active' ? 'Active' : 'On Leave'}.`,
      });
    }
  }

  async function handleAdminPrivilegeToggle(lawyer: FirmLawyer) {
    setNotice(null);
    const nextPerm = !lawyer.canManageRoles;
    const res = await onUpdateLawyer(lawyer.id, { canManageRoles: nextPerm });
    if (res.ok) {
      setNotice({
        type: 'success',
        text:
          lang === 'ar'
            ? nextPerm
              ? `تم منح ${lawyer.name} صلاحية إدارة الأدوار وتوزيع القضايا.`
              : `تم إلغاء صلاحية إدارة الأدوار عن ${lawyer.name}.`
            : nextPerm
              ? `Granted admin role-management access to ${lawyer.name}.`
              : `Revoked admin role-management access from ${lawyer.name}.`,
      });
    }
  }

  function openDeleteLawyerModal(lawyer: FirmLawyer) {
    const others = lawyers.filter((l) => l.id !== lawyer.id);
    const defaultTarget =
      others.find((l) => l.status === 'active')?.name ?? others[0]?.name ?? '';
    setDeleteTarget(lawyer);
    setDeleteReassignTo(defaultTarget);
  }

  async function confirmDeleteLawyer() {
    if (!deleteTarget) return;
    setDeletingLawyer(true);
    setNotice(null);
    try {
      const res = await onDeleteLawyer(deleteTarget.id, deleteReassignTo);
      if (res.ok) {
        const movedMsg =
          (res.reassignedCases ?? 0) > 0 || (res.reassignedBookings ?? 0) > 0
            ? lang === 'ar'
              ? ` وتم تحويل ${res.reassignedCases ?? 0} قضية و ${res.reassignedBookings ?? 0} موعد تلقائياً إلى ${deleteReassignTo}.`
              : ` Automatically reassigned ${res.reassignedCases ?? 0} case(s) and ${res.reassignedBookings ?? 0} booking(s) to ${deleteReassignTo}.`
            : '';
        setNotice({
          type: 'success',
          text:
            (lang === 'ar'
              ? `تم شطب ${deleteTarget.name} من قائمة الفريق بنجاح.`
              : `Removed ${deleteTarget.name} from the team roster.`) + movedMsg,
        });
        setDeleteTarget(null);
      } else {
        setNotice({
          type: 'error',
          text:
            res.error ||
            (lang === 'ar' ? 'تعذر شطب المحامي.' : 'Could not remove this attorney.'),
        });
        setDeleteTarget(null);
      }
    } finally {
      setDeletingLawyer(false);
    }
  }

  const transferPreviewCounts = getLawyerCounts(fromLawyer);
  const transferCasesCount =
    transferScope === 'active_cases'
      ? transferPreviewCounts.activeCases
      : transferPreviewCounts.totalCases;
  const transferBookingsCount =
    transferScope === 'all_cases_and_bookings' ? transferPreviewCounts.upcomingBookings : 0;

  async function confirmBulkTransfer() {
    if (!fromLawyer || !toLawyer || fromLawyer === toLawyer) return;
    setTransferring(true);
    setNotice(null);
    try {
      const res = await onBulkTransfer({
        fromLawyerName: fromLawyer,
        toLawyerName: toLawyer,
        scope: transferScope,
      });
      if (res.ok) {
        setNotice({
          type: 'success',
          text:
            lang === 'ar'
              ? `تم نقل ${res.transferredCases ?? 0} قضية و ${res.transferredBookings ?? 0} موعد من ${fromLawyer} إلى ${toLawyer} بنجاح.`
              : `Transferred ${res.transferredCases ?? 0} case(s) and ${res.transferredBookings ?? 0} booking(s) from ${fromLawyer} to ${toLawyer}.`,
        });
        setShowTransferConfirm(false);
      } else {
        setNotice({
          type: 'error',
          text: res.error || (lang === 'ar' ? 'تعذر نقل القضايا.' : 'Failed to transfer cases.'),
        });
        setShowTransferConfirm(false);
      }
    } finally {
      setTransferring(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Feedback Notice */}
      {notice && (
        <div
          role={notice.type === 'error' ? 'alert' : 'status'}
          className={`rounded-xl px-4 py-3 text-sm flex items-start justify-between gap-3 border ${
            notice.type === 'error'
              ? 'bg-red-50 border-red-200 text-red-800'
              : 'bg-emerald-50 border-emerald-200 text-emerald-900'
          }`}
        >
          <div className="flex items-start gap-2.5">
            {notice.type === 'error' ? (
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
            )}
            <span>{notice.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotice(null)}
            aria-label={lang === 'ar' ? 'إغلاق الإشعار' : 'Dismiss notice'}
            className="p-1 rounded hover:bg-black/5 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Bulk Case Transfer Tool */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="bg-[#0B132B] text-white px-5 py-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-xl bg-[#C5A059]/20 border border-[#C5A059]/40 flex items-center justify-center text-[#C5A059]">
              <ArrowLeftRight className="w-4 h-4" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-sm sm:text-base font-bold">
                {lang === 'ar'
                  ? 'نقل وتوزيع القضايا بين المحامين'
                  : 'Reassign & Rebalance Cases Between Attorneys'}
              </h2>
              <p className="text-xs text-slate-300">
                {lang === 'ar'
                  ? 'انقل جميع قضايا محامي (أو القضايا النشطة والمواعيد) إلى محامي آخر بضغطة زر عند الحاجة أو الإجازات.'
                  : 'Transfer active cases or all files & upcoming appointments from one attorney to another in one step.'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="min-h-[42px] px-4 py-2 rounded-xl bg-[#C5A059] hover:bg-[#d4b06a] text-[#0B132B] text-xs sm:text-sm font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <UserPlus className="w-4 h-4" />
            <span>{lang === 'ar' ? 'إضافة محامي جديد' : 'Add New Lawyer'}</span>
          </button>
        </div>

        <div className="p-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 items-end">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {lang === 'ar' ? 'نقل من المحامي' : 'Transfer From'}
            </label>
            <select
              aria-label={lang === 'ar' ? 'نقل من المحامي' : 'Transfer from lawyer'}
              value={fromLawyer}
              onChange={(e) => setFromLawyer(e.target.value)}
              className="w-full min-h-[42px] px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm font-semibold"
            >
              {lawyers.map((l) => {
                const counts = getLawyerCounts(l.name);
                return (
                  <option key={l.id} value={l.name}>
                    {l.name} ({counts.activeCases}{' '}
                    {lang === 'ar' ? 'نشطة' : 'active'})
                  </option>
                );
              })}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {lang === 'ar' ? 'إلى المحامي المستلم' : 'Transfer To'}
            </label>
            <select
              aria-label={lang === 'ar' ? 'إلى المحامي المستلم' : 'Transfer to lawyer'}
              value={toLawyer}
              onChange={(e) => setToLawyer(e.target.value)}
              className="w-full min-h-[42px] px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm font-semibold"
            >
              {lawyers
                .filter((l) => l.name !== fromLawyer)
                .map((l) => {
                  const counts = getLawyerCounts(l.name);
                  return (
                    <option key={l.id} value={l.name}>
                      {l.name} ({counts.activeCases}{' '}
                      {lang === 'ar' ? 'نشطة' : 'active'})
                    </option>
                  );
                })}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {lang === 'ar' ? 'نطاق النقل' : 'Transfer Scope'}
            </label>
            <select
              aria-label={lang === 'ar' ? 'نطاق النقل' : 'Transfer scope'}
              value={transferScope}
              onChange={(e) =>
                setTransferScope(
                  e.target.value as 'active_cases' | 'all_cases' | 'all_cases_and_bookings'
                )
              }
              className="w-full min-h-[42px] px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm font-semibold"
            >
              <option value="active_cases">
                {lang === 'ar' ? 'القضايا النشطة فقط' : 'Active Cases Only'}
              </option>
              <option value="all_cases">
                {lang === 'ar' ? 'جميع القضايا (النشطة والمغلقة)' : 'All Cases (Active & Closed)'}
              </option>
              <option value="all_cases_and_bookings">
                {lang === 'ar' ? 'جميع القضايا + المواعيد القادمة' : 'All Cases + Upcoming Bookings'}
              </option>
            </select>
          </div>

          <button
            type="button"
            disabled={
              !fromLawyer ||
              !toLawyer ||
              fromLawyer === toLawyer ||
              (transferCasesCount === 0 && transferBookingsCount === 0)
            }
            onClick={() => setShowTransferConfirm(true)}
            className="min-h-[42px] px-4 py-2 rounded-xl bg-[#0B132B] hover:bg-[#162247] text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
          >
            <ArrowLeftRight className="w-4 h-4 text-[#C5A059]" />
            <span>
              {lang === 'ar'
                ? `نقل الآن (${transferCasesCount + transferBookingsCount})`
                : `Transfer Now (${transferCasesCount + transferBookingsCount})`}
            </span>
          </button>
        </div>
      </div>

      {/* Team Roster & Role Distribution Grid */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-[#C5A059]" aria-hidden="true" />
            <div>
              <h3 className="text-base font-bold text-[#0B132B]">
                {lang === 'ar'
                  ? `فريق المحامين وتوزيع الأدوار (${lawyers.length})`
                  : `Attorneys Roster & Role Assignment (${lawyers.length})`}
              </h3>
              <p className="text-xs text-slate-500">
                {lang === 'ar'
                  ? 'يمكنك تعديل الدور الوظيفي، صلاحية الإدارة، حالة التوفر، أو شطب محامي مع تحويل ملفاته تلقائياً.'
                  : 'Update legal roles, admin permissions, availability status, or remove an attorney with automatic case handover.'}
              </p>
            </div>
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {lawyers.map((lawyer) => {
            const counts = getLawyerCounts(lawyer.name);
            return (
              <div
                key={lawyer.id}
                className="p-5 flex flex-col xl:flex-row xl:items-center justify-between gap-4 hover:bg-[#F8FAFC]/70"
              >
                <div className="space-y-2 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="text-base font-bold text-[#0B132B]">{lawyer.name}</h4>
                    <span
                      className={`text-[11px] font-bold px-2.5 py-0.5 rounded border ${
                        lawyer.status === 'active'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-amber-50 text-amber-800 border-amber-200'
                      }`}
                    >
                      {lawyer.status === 'active'
                        ? lang === 'ar'
                          ? 'نشط'
                          : 'Active'
                        : lang === 'ar'
                          ? 'في إجازة'
                          : 'On Leave'}
                    </span>
                    {lawyer.canManageRoles && (
                      <span className="text-[11px] font-bold px-2.5 py-0.5 rounded bg-[#0B132B] text-[#C5A059] flex items-center gap-1">
                        <Shield className="w-3 h-3" />
                        <span>{lang === 'ar' ? 'صلاحية آدمن' : 'Admin Access'}</span>
                      </span>
                    )}
                  </div>

                  {lawyer.nameEn && (
                    <p className="text-xs text-slate-500" dir="ltr">
                      {lawyer.nameEn}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
                    <span className="flex items-center gap-1 font-mono-data" dir="ltr">
                      <Phone className="w-3.5 h-3.5 text-[#C5A059]" />
                      {lawyer.phone}
                    </span>
                    {lawyer.email && (
                      <span className="flex items-center gap-1 font-mono-data" dir="ltr">
                        <Mail className="w-3.5 h-3.5 text-[#C5A059]" />
                        {lawyer.email}
                      </span>
                    )}
                    <span className="text-slate-400">·</span>
                    <span className="font-semibold text-[#0B132B]">
                      {lang === 'ar'
                        ? `${counts.activeCases} قضية نشطة · ${counts.upcomingBookings} موعد قادم`
                        : `${counts.activeCases} active cases · ${counts.upcomingBookings} upcoming bookings`}
                    </span>
                  </div>

                  <p className="text-xs text-slate-500">
                    {LAWYER_ROLE_META[lawyer.role].permissions[lang]}
                  </p>

                  <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                    {lawyer.specialties.map((specId) => {
                      const spec = SPECIALTIES.find((s) => s.id === specId);
                      return (
                        <span
                          key={specId}
                          className="text-[11px] font-semibold bg-[#F8FAFC] border border-slate-200 text-slate-700 px-2 py-0.5 rounded"
                        >
                          {spec?.title[lang] ?? specId}
                        </span>
                      );
                    })}
                  </div>
                </div>

                {/* Role & Status Controls */}
                <div className="flex flex-wrap items-end gap-2.5 shrink-0">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">
                      {lang === 'ar' ? 'توزيع الدور الوظيفي' : 'Assigned Role'}
                    </label>
                    <select
                      aria-label={`${lang === 'ar' ? 'دور المحامي' : 'Role for'} ${lawyer.name}`}
                      value={lawyer.role}
                      onChange={(e) => void handleRoleChange(lawyer, e.target.value as LawyerRole)}
                      className="min-h-[38px] px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-bold text-[#0B132B] focus:outline-none focus:ring-2 focus:ring-[#C5A059]"
                    >
                      {VALID_LAWYER_ROLES.map((roleKey) => (
                        <option key={roleKey} value={roleKey}>
                          {LAWYER_ROLE_META[roleKey].label[lang]}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={() => void handleAdminPrivilegeToggle(lawyer)}
                    className={`min-h-[38px] px-3 py-1.5 rounded-lg border text-xs font-bold cursor-pointer transition-colors ${
                      lawyer.canManageRoles
                        ? 'border-[#0B132B] bg-[#0B132B]/5 text-[#0B132B]'
                        : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {lawyer.canManageRoles
                      ? lang === 'ar'
                        ? 'إلغاء صلاحية الآدمن'
                        : 'Revoke Admin'
                      : lang === 'ar'
                        ? 'منح صلاحية آدمن'
                        : 'Grant Admin'}
                  </button>

                  <button
                    type="button"
                    onClick={() => void handleStatusToggle(lawyer)}
                    className="min-h-[38px] px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-xs font-bold text-slate-700 cursor-pointer"
                  >
                    {lawyer.status === 'active'
                      ? lang === 'ar'
                        ? 'تحويل لإجازة'
                        : 'Set On Leave'
                      : lang === 'ar'
                        ? 'تفعيل التوفر'
                        : 'Set Active'}
                  </button>

                  <button
                    type="button"
                    disabled={lawyers.length <= 1}
                    onClick={() => openDeleteLawyerModal(lawyer)}
                    aria-label={`${lang === 'ar' ? 'شطب المحامي' : 'Remove lawyer'} ${lawyer.name}`}
                    className="min-h-[38px] px-3 py-1.5 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold flex items-center gap-1 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{lang === 'ar' ? 'شطب' : 'Remove'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add New Lawyer Modal */}
      {showAddModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-lawyer-modal-title"
          className="fixed inset-0 z-50 bg-[#0B132B]/70 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-2xl w-full max-w-lg border border-slate-200 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-5 py-4 bg-[#0B132B] text-white flex items-center justify-between shrink-0">
              <h3 id="add-lawyer-modal-title" className="text-base font-bold flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-[#C5A059]" />
                <span>{lang === 'ar' ? 'إضافة محامي جديد إلى الفريق' : 'Add New Attorney to Team'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                aria-label={lang === 'ar' ? 'إغلاق' : 'Close'}
                className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-lg hover:bg-white/10 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-5 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {lang === 'ar' ? 'الاسم الكامل (بالعربية) *' : 'Full Name (Arabic) *'}
                  </label>
                  <input
                    type="text"
                    required
                    minLength={3}
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder={lang === 'ar' ? 'المحامي طارق العلاونة' : 'Attorney Name'}
                    className="w-full min-h-[42px] px-3 py-2 rounded-xl border border-slate-300 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {lang === 'ar' ? 'الاسم بالإنجليزية (اختياري)' : 'English Name (Optional)'}
                  </label>
                  <input
                    type="text"
                    dir="ltr"
                    value={newNameEn}
                    onChange={(e) => setNewNameEn(e.target.value)}
                    placeholder="Attorney Tariq Al-Alawneh"
                    className="w-full min-h-[42px] px-3 py-2 rounded-xl border border-slate-300 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {lang === 'ar' ? 'رقم الهاتف الأردني' : 'Jordanian Phone'}
                  </label>
                  <input
                    type="tel"
                    dir="ltr"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="079XXXXXXX"
                    className="w-full min-h-[42px] px-3 py-2 rounded-xl border border-slate-300 text-sm font-mono-data"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {lang === 'ar' ? 'البريد الإلكتروني (اختياري)' : 'Email (Optional)'}
                  </label>
                  <input
                    type="email"
                    dir="ltr"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="lawyer@alradwan-law.jo"
                    className="w-full min-h-[42px] px-3 py-2 rounded-xl border border-slate-300 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {lang === 'ar' ? 'الدور الوظيفي والصلاحية' : 'Role & Authority'}
                  </label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as LawyerRole)}
                    className="w-full min-h-[42px] px-3 py-2 rounded-xl border border-slate-300 text-sm bg-white font-semibold"
                  >
                    {VALID_LAWYER_ROLES.map((roleKey) => (
                      <option key={roleKey} value={roleKey}>
                        {LAWYER_ROLE_META[roleKey].label[lang]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {lang === 'ar' ? 'حالة التوفر' : 'Availability Status'}
                  </label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as LawyerStatus)}
                    className="w-full min-h-[42px] px-3 py-2 rounded-xl border border-slate-300 text-sm bg-white font-semibold"
                  >
                    <option value="active">{lang === 'ar' ? 'نشط وجاهز لاستلام قضايا' : 'Active'}</option>
                    <option value="on_leave">{lang === 'ar' ? 'في إجازة مؤقتة' : 'On Leave'}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  {lang === 'ar' ? 'التخصصات القانونية' : 'Legal Specialties'}
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {SPECIALTIES.map((spec) => {
                    const checked = newSpecialties.includes(spec.id);
                    return (
                      <label
                        key={spec.id}
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold cursor-pointer ${
                          checked
                            ? 'bg-[#0B132B] text-white border-[#0B132B]'
                            : 'bg-[#F8FAFC] text-slate-700 border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleNewSpecialty(spec.id)}
                          className="accent-[#C5A059]"
                        />
                        <span className="truncate">{spec.title[lang]}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="min-h-[42px] px-4 py-2 rounded-xl border border-slate-300 text-sm font-semibold cursor-pointer"
                >
                  {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={savingNewLawyer}
                  className="min-h-[42px] px-5 py-2 rounded-xl bg-[#C5A059] hover:bg-[#d4b06a] text-[#0B132B] text-sm font-bold cursor-pointer disabled:opacity-60"
                >
                  {savingNewLawyer
                    ? lang === 'ar'
                      ? 'جاري الإضافة...'
                      : 'Adding...'
                    : lang === 'ar'
                      ? 'حفظ وإضافة للفريق'
                      : 'Save & Add Attorney'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Transfer Confirmation Modal */}
      {showTransferConfirm && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="transfer-confirm-title"
          className="fixed inset-0 z-50 bg-[#0B132B]/70 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-2xl w-full max-w-md border border-slate-200 shadow-2xl overflow-hidden">
            <div className="px-5 py-4 bg-[#0B132B] text-white flex items-center justify-between">
              <h3 id="transfer-confirm-title" className="text-base font-bold">
                {lang === 'ar' ? 'تأكيد نقل الملفات بين المحامين' : 'Confirm Case Transfer'}
              </h3>
              <button
                type="button"
                onClick={() => setShowTransferConfirm(false)}
                aria-label={lang === 'ar' ? 'إغلاق' : 'Close'}
                className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg hover:bg-white/10 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-sm text-slate-700 leading-relaxed">
                {lang === 'ar'
                  ? 'سيتم إعادة إسناد الملفات التالية فوراً وتحديث سجل الشركة:'
                  : 'The following files will be immediately reassigned in the firm docket:'}
              </p>
              <ul className="bg-[#F8FAFC] border border-slate-200 rounded-xl p-3.5 space-y-1.5 text-xs text-[#0B132B] font-semibold">
                <li>
                  {lang === 'ar' ? 'من المحامي:' : 'From:'} {fromLawyer}
                </li>
                <li>
                  {lang === 'ar' ? 'إلى المحامي:' : 'To:'} {toLawyer}
                </li>
                <li>
                  {lang === 'ar' ? 'القضايا المنقولة:' : 'Cases to Transfer:'} {transferCasesCount}
                </li>
                {transferBookingsCount > 0 && (
                  <li>
                    {lang === 'ar' ? 'المواعيد المنقولة:' : 'Upcoming Bookings:'}{' '}
                    {transferBookingsCount}
                  </li>
                )}
              </ul>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  disabled={transferring}
                  onClick={() => setShowTransferConfirm(false)}
                  className="min-h-[42px] px-4 py-2 rounded-xl border border-slate-300 text-sm font-semibold cursor-pointer"
                >
                  {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="button"
                  disabled={transferring}
                  onClick={() => void confirmBulkTransfer()}
                  className="min-h-[42px] px-5 py-2 rounded-xl bg-[#C5A059] hover:bg-[#d4b06a] text-[#0B132B] text-sm font-bold cursor-pointer disabled:opacity-60"
                >
                  {transferring
                    ? lang === 'ar'
                      ? 'جاري النقل...'
                      : 'Transferring...'
                    : lang === 'ar'
                      ? 'تأكيد النقل'
                      : 'Confirm Transfer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Remove Lawyer Confirmation Modal with Automatic Handover */}
      {deleteTarget && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="remove-lawyer-title"
          className="fixed inset-0 z-50 bg-[#0B132B]/70 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-2xl w-full max-w-md border border-slate-200 shadow-2xl overflow-hidden">
            <div className="px-5 py-4 bg-red-900 text-white flex items-center justify-between">
              <h3 id="remove-lawyer-title" className="text-base font-bold">
                {lang === 'ar' ? 'تأكيد شطب محامي من الفريق' : 'Confirm Attorney Removal'}
              </h3>
              <button
                type="button"
                disabled={deletingLawyer}
                onClick={() => setDeleteTarget(null)}
                aria-label={lang === 'ar' ? 'إغلاق' : 'Close'}
                className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg hover:bg-white/10 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <p className="text-sm text-slate-700 leading-relaxed">
                {lang === 'ar'
                  ? `هل أنت متأكد من شطب «${deleteTarget.name}» من قائمة محامي الشركة؟`
                  : `Are you sure you want to remove "${deleteTarget.name}" from the firm roster?`}
              </p>

              {(() => {
                const counts = getLawyerCounts(deleteTarget.name);
                return (
                  <div className="space-y-3">
                    {(counts.totalCases > 0 || counts.upcomingBookings > 0) && (
                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 font-semibold">
                        {lang === 'ar'
                          ? `يوجد ${counts.totalCases} قضية و ${counts.upcomingBookings} موعد مسند حالياً لهذا المحامي. اختر المحامي البديل لاستلام كافة الملفات تلقائياً:`
                          : `This attorney currently holds ${counts.totalCases} case(s) and ${counts.upcomingBookings} upcoming booking(s). Choose who should automatically inherit their files:`}
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        {lang === 'ar' ? 'تحويل القضايا والمواعيد تلقائياً إلى:' : 'Reassign Files Automatically To:'}
                      </label>
                      <select
                        value={deleteReassignTo}
                        onChange={(e) => setDeleteReassignTo(e.target.value)}
                        className="w-full min-h-[42px] px-3 py-2 rounded-xl border border-slate-300 bg-white text-sm font-semibold"
                      >
                        {lawyers
                          .filter((l) => l.id !== deleteTarget.id)
                          .map((l) => (
                            <option key={l.id} value={l.name}>
                              {l.name} ({LAWYER_ROLE_META[l.role].label[lang]})
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>
                );
              })()}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  disabled={deletingLawyer}
                  onClick={() => setDeleteTarget(null)}
                  className="min-h-[42px] px-4 py-2 rounded-xl border border-slate-300 text-sm font-semibold cursor-pointer"
                >
                  {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="button"
                  disabled={deletingLawyer}
                  onClick={() => void confirmDeleteLawyer()}
                  className="min-h-[42px] px-5 py-2 rounded-xl bg-red-700 hover:bg-red-800 text-white text-sm font-bold cursor-pointer disabled:opacity-60"
                >
                  {deletingLawyer
                    ? lang === 'ar'
                      ? 'جاري الشطب...'
                      : 'Removing...'
                    : lang === 'ar'
                      ? 'تأكيد الشطب والتحويل'
                      : 'Confirm Removal'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
