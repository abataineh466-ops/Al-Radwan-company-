import { useState, type FormEvent } from 'react';
import {
  Briefcase,
  Calendar,
  CheckCircle2,
  FileText,
  Paperclip,
  Plus,
  Sparkles,
  UserPlus,
  Users,
} from 'lucide-react';
import type {
  CaseAttachment,
  CaseHearing,
  CaseStage,
  CaseTask,
  ClientProfile,
  FirmLawyer,
  Language,
  LegalCase,
  LegalDocumentRecord,
  SpecialtyId,
} from '../types/legal.js';
import { SPECIALTIES } from '../data/firmContent.js';

interface CaseWorkspacePanelProps {
  lang: Language;
  authToken: string;
  cases: LegalCase[];
  clients: ClientProfile[];
  hearings: CaseHearing[];
  tasks: CaseTask[];
  attachments: CaseAttachment[];
  documents: LegalDocumentRecord[];
  lawyers: FirmLawyer[];
  onCaseCreated: (c: LegalCase) => void;
  onCaseUpdated: (c: LegalCase) => void;
  onClientCreated: (cl: ClientProfile) => void;
  onHearingCreated: (h: CaseHearing) => void;
  onTaskCreated: (t: CaseTask) => void;
  onTaskUpdated: (t: CaseTask) => void;
  onAttachmentCreated: (a: CaseAttachment) => void;
  onOpenInRbAi: (caseId: string) => void;
}

export function CaseWorkspacePanel({
  lang,
  authToken,
  cases,
  clients,
  hearings,
  tasks,
  attachments,
  documents,
  lawyers,
  onCaseCreated,
  onCaseUpdated,
  onClientCreated,
  onHearingCreated,
  onTaskCreated,
  onTaskUpdated,
  onAttachmentCreated,
  onOpenInRbAi,
}: CaseWorkspacePanelProps) {
  const [subView, setSubView] = useState<'cases' | 'clients' | 'tasks'>('cases');
  const [selectedCaseId, setSelectedCaseId] = useState<string>(cases[0]?.id ?? '');

  // New Client form
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('079');
  const [clientAddress, setClientAddress] = useState('');

  // New Case form
  const [showCaseForm, setShowCaseForm] = useState(false);
  const [newCaseClient, setNewCaseClient] = useState('');
  const [newCasePhone, setNewCasePhone] = useState('079');
  const [newCaseSpec, setNewCaseSpec] = useState<SpecialtyId>('civil');
  const [newCaseCourt, setNewCaseCourt] = useState('محكمة بداية حقوق إربد');
  const [newCaseLawyer, setNewCaseLawyer] = useState(lawyers[0]?.name ?? '');
  const [newCaseSummary, setNewCaseSummary] = useState('');

  // Hearing / Task / Attachment forms
  const [hearingDate, setHearingDate] = useState('');
  const [hearingTitle, setHearingTitle] = useState('');
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDue, setTaskDue] = useState('');
  const [attName, setAttName] = useState('');

  const selectedCase = cases.find((c) => c.id === selectedCaseId) ?? cases[0] ?? null;
  const caseHearings = selectedCase ? hearings.filter((h) => h.caseId === selectedCase.id) : [];
  const caseTasks = selectedCase ? tasks.filter((t) => t.caseId === selectedCase.id) : [];
  const caseAttachments = selectedCase ? attachments.filter((a) => a.caseId === selectedCase.id) : [];
  const caseDocs = selectedCase ? documents.filter((d) => d.caseId === selectedCase.id) : [];

  async function apiPost<T>(url: string, body: unknown): Promise<T> {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
      credentials: 'include',
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as T;
  }

  async function handleCreateClient(e: FormEvent) {
    e.preventDefault();
    if (!clientName.trim()) return;
    const data = await apiPost<{ client: ClientProfile }>('/api/clients', {
      fullName: clientName,
      phone: clientPhone,
      address: clientAddress,
    });
    onClientCreated(data.client);
    setClientName('');
    setClientPhone('079');
    setClientAddress('');
  }

  async function handleCreateCase(e: FormEvent) {
    e.preventDefault();
    if (!newCaseClient.trim() || !newCaseSummary.trim()) return;
    const data = await apiPost<{ legalCase: LegalCase }>('/api/cases', {
      clientName: newCaseClient,
      clientPhone: newCasePhone,
      specialtyId: newCaseSpec,
      courtName: newCaseCourt,
      assignedLawyer: newCaseLawyer || lawyers[0]?.name,
      summary: newCaseSummary,
    });
    onCaseCreated(data.legalCase);
    setSelectedCaseId(data.legalCase.id);
    setShowCaseForm(false);
    setNewCaseClient('');
    setNewCaseSummary('');
  }

  async function handleStageChange(c: LegalCase, stage: CaseStage) {
    const res = await fetch(`/api/cases/${c.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
      credentials: 'include',
      body: JSON.stringify({ stage }),
    });
    if (res.ok) {
      const data = (await res.json()) as { legalCase: LegalCase };
      onCaseUpdated(data.legalCase);
    }
  }

  async function handleAddHearing(e: FormEvent) {
    e.preventDefault();
    if (!selectedCase || !hearingDate || !hearingTitle.trim()) return;
    const data = await apiPost<{ hearing: CaseHearing }>('/api/hearings', {
      caseId: selectedCase.id,
      date: hearingDate,
      title: hearingTitle,
    });
    onHearingCreated(data.hearing);
    setHearingDate('');
    setHearingTitle('');
  }

  async function handleAddTask(e: FormEvent) {
    e.preventDefault();
    if (!taskTitle.trim()) return;
    const data = await apiPost<{ task: CaseTask }>('/api/tasks', {
      caseId: selectedCase?.id,
      title: taskTitle,
      dueDate: taskDue || undefined,
      assignedLawyer: selectedCase?.assignedLawyer,
    });
    onTaskCreated(data.task);
    setTaskTitle('');
    setTaskDue('');
  }

  async function handleToggleTask(t: CaseTask) {
    const nextStatus = t.status === 'done' ? 'todo' : 'done';
    const res = await fetch(`/api/tasks/${t.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
      credentials: 'include',
      body: JSON.stringify({ status: nextStatus }),
    });
    if (res.ok) {
      const data = (await res.json()) as { task: CaseTask };
      onTaskUpdated(data.task);
    }
  }

  async function handleAddAttachment(e: FormEvent) {
    e.preventDefault();
    if (!selectedCase || !attName.trim()) return;
    const data = await apiPost<{ attachment: CaseAttachment }>('/api/attachments', {
      caseId: selectedCase.id,
      name: attName,
      mimeType: 'application/pdf',
      sizeBytes: 1024,
    });
    onAttachmentCreated(data.attachment);
    setAttName('');
  }

  return (
    <div className="space-y-5">
      {/* Sub-view Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSubView('cases')}
            className={`min-h-[38px] px-4 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
              subView === 'cases' ? 'bg-[#0B132B] text-white' : 'bg-[#FAF8F3] text-slate-700'
            }`}
          >
            <Briefcase className="w-3.5 h-3.5 text-[#C5A059]" />
            <span>ملفات القضايا ({cases.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setSubView('clients')}
            className={`min-h-[38px] px-4 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
              subView === 'clients' ? 'bg-[#0B132B] text-white' : 'bg-[#FAF8F3] text-slate-700'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-[#C5A059]" />
            <span>ملفات الموكلين ({clients.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setSubView('tasks')}
            className={`min-h-[38px] px-4 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
              subView === 'tasks' ? 'bg-[#0B132B] text-white' : 'bg-[#FAF8F3] text-slate-700'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-[#C5A059]" />
            <span>المهام والمواعيد ({tasks.length})</span>
          </button>
        </div>

        <button
          type="button"
          onClick={() => setShowCaseForm((p) => !p)}
          className="min-h-[38px] px-4 py-1.5 rounded-xl bg-[#C5A059] text-[#0B132B] text-xs font-bold flex items-center gap-1.5 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>فتح ملف قضية جديدة</span>
        </button>
      </div>

      {showCaseForm && (
        <form
          onSubmit={handleCreateCase}
          className="bg-white rounded-2xl border border-[#C5A059]/40 p-5 space-y-3"
        >
          <h3 className="text-sm font-bold text-[#0B132B]">ملف قضية جديدة</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              type="text"
              required
              value={newCaseClient}
              onChange={(e) => setNewCaseClient(e.target.value)}
              placeholder="اسم الموكل"
              className="min-h-[40px] px-3 py-2 rounded-xl border border-slate-300 text-sm"
            />
            <input
              type="tel"
              dir="ltr"
              value={newCasePhone}
              onChange={(e) => setNewCasePhone(e.target.value)}
              placeholder="079XXXXXXX"
              className="min-h-[40px] px-3 py-2 rounded-xl border border-slate-300 text-sm font-mono-data"
            />
            <select
              value={newCaseSpec}
              onChange={(e) => setNewCaseSpec(e.target.value as SpecialtyId)}
              className="min-h-[40px] px-3 py-2 rounded-xl border border-slate-300 text-sm bg-white"
            >
              {SPECIALTIES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title[lang]}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="text"
              value={newCaseCourt}
              onChange={(e) => setNewCaseCourt(e.target.value)}
              placeholder="المحكمة المختصة"
              className="min-h-[40px] px-3 py-2 rounded-xl border border-slate-300 text-sm"
            />
            <select
              value={newCaseLawyer}
              onChange={(e) => setNewCaseLawyer(e.target.value)}
              className="min-h-[40px] px-3 py-2 rounded-xl border border-slate-300 text-sm bg-white"
            >
              {lawyers.map((l) => (
                <option key={l.id} value={l.name}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>
          <textarea
            rows={2}
            required
            value={newCaseSummary}
            onChange={(e) => setNewCaseSummary(e.target.value)}
            placeholder="ملخص الوقائع والطلبات..."
            className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
          />
          <button
            type="submit"
            className="min-h-[40px] px-5 py-2 rounded-xl bg-[#0B132B] text-white text-xs font-bold cursor-pointer"
          >
            حفظ الملف
          </button>
        </form>
      )}

      {/* VIEW 1: Cases + Case Detail Inspector */}
      {subView === 'cases' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100 max-h-[650px] overflow-y-auto">
            {cases.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelectedCaseId(c.id)}
                className={`w-full text-start p-4 space-y-1 cursor-pointer transition-colors ${
                  selectedCase?.id === c.id ? 'bg-[#0B132B] text-white' : 'hover:bg-[#FAF8F3]'
                }`}
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono-data font-bold text-[#C5A059]">{c.caseNumber}</span>
                  <span>{c.nextHearingDate}</span>
                </div>
                <p className="font-bold text-sm">{c.clientName}</p>
                <p
                  className={`text-xs line-clamp-2 ${
                    selectedCase?.id === c.id ? 'text-slate-300' : 'text-slate-600'
                  }`}
                >
                  {c.summary}
                </p>
              </button>
            ))}
          </div>

          <div className="lg:col-span-7 space-y-4">
            {selectedCase ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-5">
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 pb-4">
                  <div>
                    <p className="text-xs font-mono-data font-bold text-[#C5A059]">
                      {selectedCase.caseNumber} · {selectedCase.courtName}
                    </p>
                    <h3 className="text-lg font-extrabold text-[#0B132B]">
                      {selectedCase.clientName}
                    </h3>
                    <p className="text-xs text-slate-500">
                      المحامي المسؤول: {selectedCase.assignedLawyer}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      value={selectedCase.stage}
                      onChange={(e) => void handleStageChange(selectedCase, e.target.value as CaseStage)}
                      className="min-h-[36px] px-3 py-1 rounded-lg border border-slate-300 text-xs font-bold"
                    >
                      <option value="intake">استشارة جديدة</option>
                      <option value="drafting">تجهيز اللوائح</option>
                      <option value="litigation">قيد المرافعة</option>
                      <option value="execution">مرحلة التنفيذ</option>
                      <option value="closed">مغلقة</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => onOpenInRbAi(selectedCase.id)}
                      className="min-h-[36px] px-3.5 py-1.5 rounded-lg bg-[#C5A059] text-[#0B132B] text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>صياغة عبر RB AI</span>
                    </button>
                  </div>
                </div>

                <p className="text-sm text-slate-700 leading-relaxed">{selectedCase.summary}</p>

                {/* Hearings */}
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <h4 className="text-xs font-bold text-[#0B132B] flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-[#C5A059]" />
                    <span>الجلسات ({caseHearings.length})</span>
                  </h4>
                  <form onSubmit={handleAddHearing} className="flex flex-wrap gap-2">
                    <input
                      type="date"
                      value={hearingDate}
                      onChange={(e) => setHearingDate(e.target.value)}
                      className="min-h-[36px] px-2.5 py-1 rounded-lg border border-slate-300 text-xs font-mono-data"
                    />
                    <input
                      type="text"
                      value={hearingTitle}
                      onChange={(e) => setHearingTitle(e.target.value)}
                      placeholder="موضوع الجلسة..."
                      className="flex-1 min-h-[36px] px-3 py-1 rounded-lg border border-slate-300 text-xs"
                    />
                    <button
                      type="submit"
                      className="min-h-[36px] px-3 py-1 rounded-lg bg-[#0B132B] text-white text-xs font-bold cursor-pointer"
                    >
                      إضافة جلسة
                    </button>
                  </form>
                  {caseHearings.map((h) => (
                    <div
                      key={h.id}
                      className="rounded-lg bg-[#FAF8F3] border border-slate-200 px-3 py-2 text-xs flex justify-between"
                    >
                      <span className="font-semibold">{h.title}</span>
                      <span className="font-mono-data text-slate-500">{h.date}</span>
                    </div>
                  ))}
                </div>

                {/* Linked Documents from RB AI */}
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <h4 className="text-xs font-bold text-[#0B132B] flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-[#C5A059]" />
                    <span>المستندات والمذكرات المرتبطة ({caseDocs.length})</span>
                  </h4>
                  {caseDocs.length === 0 ? (
                    <p className="text-xs text-slate-500">لا توجد مستندات منشأة لهذا الملف بعد.</p>
                  ) : (
                    caseDocs.map((d) => (
                      <div
                        key={d.id}
                        className="rounded-lg bg-[#FAF8F3] border border-slate-200 px-3 py-2 text-xs flex justify-between items-center"
                      >
                        <span className="font-bold">{d.title}</span>
                        <span className="text-slate-500">
                          النسخ: {d.versions.length} · {d.status}
                        </span>
                      </div>
                    ))
                  )}
                </div>

                {/* Attachments */}
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <h4 className="text-xs font-bold text-[#0B132B] flex items-center gap-1.5">
                    <Paperclip className="w-3.5 h-3.5 text-[#C5A059]" />
                    <span>المرفقات المسجلة ({caseAttachments.length})</span>
                  </h4>
                  <form onSubmit={handleAddAttachment} className="flex gap-2">
                    <input
                      type="text"
                      value={attName}
                      onChange={(e) => setAttName(e.target.value)}
                      placeholder="اسم المرفق (مثلاً: سند القبض، كروكا الحادث)..."
                      className="flex-1 min-h-[36px] px-3 py-1 rounded-lg border border-slate-300 text-xs"
                    />
                    <button
                      type="submit"
                      className="min-h-[36px] px-3 py-1 rounded-lg bg-[#0B132B] text-white text-xs font-bold cursor-pointer"
                    >
                      تسجيل مرفق
                    </button>
                  </form>
                  {caseAttachments.map((a) => (
                    <div
                      key={a.id}
                      className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-1.5 text-xs flex justify-between"
                    >
                      <span>{a.name}</span>
                      <span className="text-slate-400">{a.uploadedAt.slice(0, 10)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-sm text-slate-500">
                اختر ملف قضية لعرض تفاصيله.
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW 2: Clients CRM */}
      {subView === 'clients' && (
        <div className="space-y-4">
          <form
            onSubmit={handleCreateClient}
            className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-wrap items-end gap-3"
          >
            <input
              type="text"
              required
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="اسم الموكل الكامل"
              className="flex-1 min-w-[180px] min-h-[40px] px-3 py-2 rounded-xl border border-slate-300 text-sm"
            />
            <input
              type="tel"
              dir="ltr"
              value={clientPhone}
              onChange={(e) => setClientPhone(e.target.value)}
              placeholder="079XXXXXXX"
              className="min-h-[40px] px-3 py-2 rounded-xl border border-slate-300 text-sm font-mono-data"
            />
            <input
              type="text"
              value={clientAddress}
              onChange={(e) => setClientAddress(e.target.value)}
              placeholder="العنوان (عمّان / إربد)"
              className="min-h-[40px] px-3 py-2 rounded-xl border border-slate-300 text-sm"
            />
            <button
              type="submit"
              className="min-h-[40px] px-4 py-2 rounded-xl bg-[#0B132B] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <UserPlus className="w-4 h-4 text-[#C5A059]" />
              <span>إضافة موكل</span>
            </button>
          </form>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {clients.map((cl) => (
              <div
                key={cl.id}
                className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2"
              >
                <h4 className="font-bold text-[#0B132B]">{cl.fullName}</h4>
                <p className="text-xs font-mono-data text-slate-600" dir="ltr">
                  {cl.phone}
                </p>
                {cl.address && <p className="text-xs text-slate-500">{cl.address}</p>}
                <p className="text-[11px] font-semibold text-[#C5A059]">
                  المسؤول: {cl.assignedLawyer}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VIEW 3: Tasks */}
      {subView === 'tasks' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
          <form onSubmit={handleAddTask} className="flex flex-wrap gap-2">
            <input
              type="text"
              required
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              placeholder="أضف مهمة قانونية أو موعد إجراء..."
              className="flex-1 min-h-[40px] px-3 py-2 rounded-xl border border-slate-300 text-sm"
            />
            <input
              type="date"
              value={taskDue}
              onChange={(e) => setTaskDue(e.target.value)}
              className="min-h-[40px] px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono-data"
            />
            <button
              type="submit"
              className="min-h-[40px] px-4 py-2 rounded-xl bg-[#0B132B] text-white text-xs font-bold cursor-pointer"
            >
              إضافة مهمة
            </button>
          </form>

          <div className="divide-y divide-slate-100">
            {tasks.map((t) => (
              <div key={t.id} className="py-3 flex items-center justify-between gap-3">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={t.status === 'done'}
                    onChange={() => void handleToggleTask(t)}
                    className="accent-[#C5A059] w-4 h-4"
                  />
                  <span
                    className={`text-sm font-semibold ${
                      t.status === 'done' ? 'line-through text-slate-400' : 'text-[#0B132B]'
                    }`}
                  >
                    {t.title}
                  </span>
                </label>
                <span className="text-xs font-mono-data text-slate-500">
                  {t.dueDate || t.assignedLawyer}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
