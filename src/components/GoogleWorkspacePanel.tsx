import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import type { User } from 'firebase/auth';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  Folder,
  FolderPlus,
  HardDrive,
  Image as ImageIcon,
  LogOut,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Table2,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import type {
  ConsultationBooking,
  IntakeSummary,
  Language,
  LegalCase,
} from '../types/legal';
import {
  clearWorkspaceAccessToken,
  getWorkspaceAccessToken,
  signInWithGoogleWorkspace,
  signOutGoogleWorkspace,
  subscribeWorkspaceAuth,
} from '../services/googleWorkspaceAuth';
import {
  createDriveFolder,
  createFirmSpreadsheet,
  getSpreadsheetMetadata,
  GoogleWorkspaceApiError,
  listDriveFiles,
  listDriveSpreadsheets,
  readSheetValues,
  syncRowsToSheet,
  trashDriveFile,
  uploadDriveFile,
  type DriveFileItem,
  type SpreadsheetMeta,
} from '../services/googleWorkspaceApi';
import {
  buildBookingsSheetRows,
  buildCasesSheetRows,
  buildIntakesSheetRows,
  classifyDriveMimeType,
  formatDriveFileSize,
  type DriveFileFilter,
} from '../utils/workspaceHelpers';

interface GoogleWorkspacePanelProps {
  lang: Language;
  bookings: ConsultationBooking[];
  cases: LegalCase[];
  intakes: IntakeSummary[];
}

type WorkspaceSubTab = 'drive' | 'sheets';
type SyncDataset = 'cases' | 'bookings' | 'intakes';
type SyncMode = 'replace' | 'append';

interface PendingConfirmation {
  title: string;
  description: string;
  details: string[];
  confirmLabel: string;
  variant: 'primary' | 'danger';
  onConfirm: () => Promise<void>;
}

function GoogleLogoSvg() {
  return (
    <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.745 12.27c0-.79-.07-1.54-.19-2.27h-11.3v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"
      />
      <path
        fill="#34A853"
        d="M12.255 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96h-3.98v3.09C3.515 21.3 7.565 24 12.255 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.525 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62h-3.98a11.86 11.86 0 0 0 0 10.76l3.98-3.09z"
      />
      <path
        fill="#EA4335"
        d="M12.255 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C18.205 1.19 15.495 0 12.255 0c-4.69 0-8.74 2.7-10.71 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"
      />
    </svg>
  );
}

export function GoogleWorkspacePanel({
  lang,
  bookings,
  cases,
  intakes,
}: GoogleWorkspacePanelProps) {
  const [googleUser, setGoogleUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(() => getWorkspaceAccessToken());
  const [authLoading, setAuthLoading] = useState(false);

  const [subTab, setSubTab] = useState<WorkspaceSubTab>('drive');
  const [bannerError, setBannerError] = useState<string | null>(null);
  const [bannerSuccess, setBannerSuccess] = useState<string | null>(null);

  // Google Drive state
  const [driveFiles, setDriveFiles] = useState<DriveFileItem[]>([]);
  const [driveLoading, setDriveLoading] = useState(false);
  const [driveSearch, setDriveSearch] = useState('');
  const [driveFilter, setDriveFilter] = useState<DriveFileFilter>('all');
  const [folderStack, setFolderStack] = useState<Array<{ id: string; name: string }>>([]);
  const [showFolderForm, setShowFolderForm] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Google Sheets state
  const [spreadsheets, setSpreadsheets] = useState<DriveFileItem[]>([]);
  const [sheetsListLoading, setSheetsListLoading] = useState(false);
  const [selectedSpreadsheetId, setSelectedSpreadsheetId] = useState<string>('');
  const [spreadsheetMeta, setSpreadsheetMeta] = useState<SpreadsheetMeta | null>(null);
  const [selectedSheetTitle, setSelectedSheetTitle] = useState<string>('');
  const [sheetRows, setSheetRows] = useState<string[][]>([]);
  const [sheetDataLoading, setSheetDataLoading] = useState(false);
  const [showNewSheetForm, setShowNewSheetForm] = useState(false);
  const [newSheetTitle, setNewSheetTitle] = useState('');
  const [syncDataset, setSyncDataset] = useState<SyncDataset>('cases');
  const [syncMode, setSyncMode] = useState<SyncMode>('replace');

  // Mandatory confirmation modal for all mutating/destructive operations
  const [pendingAction, setPendingAction] = useState<PendingConfirmation | null>(null);
  const [executingAction, setExecutingAction] = useState(false);

  const currentFolder = folderStack.length > 0 ? folderStack[folderStack.length - 1] : null;
  const needsAuth = !googleUser || !accessToken;
  const BreadcrumbChevron = lang === 'ar' ? ChevronLeft : ChevronRight;

  useEffect(() => {
    const unsubscribe = subscribeWorkspaceAuth(({ user, accessToken: token }) => {
      setGoogleUser(user);
      setAccessToken(token);
    });
    return unsubscribe;
  }, []);

  function handleApiFailure(err: unknown) {
    if (err instanceof GoogleWorkspaceApiError) {
      setBannerError(err.message);
      if (err.requiresReauth) {
        clearWorkspaceAccessToken();
        setAccessToken(null);
      }
      return;
    }
    const msg =
      err instanceof Error
        ? err.message
        : lang === 'ar'
          ? 'حدث خطأ غير متوقع أثناء الاتصال بخدمات Google.'
          : 'An unexpected error occurred while connecting to Google Workspace.';
    setBannerError(msg);
  }

  async function loadDrive(
    tokenOverride?: string,
    folderIdOverride?: string | null,
    filterOverride?: DriveFileFilter,
    searchOverride?: string,
  ) {
    const token = tokenOverride ?? accessToken;
    if (!token) return;
    setDriveLoading(true);
    setBannerError(null);
    try {
      const files = await listDriveFiles(token, lang, {
        folderId: folderIdOverride !== undefined ? folderIdOverride : currentFolder?.id ?? null,
        filterType: filterOverride ?? driveFilter,
        search: searchOverride !== undefined ? searchOverride : driveSearch,
      });
      setDriveFiles(files);
    } catch (err) {
      handleApiFailure(err);
    } finally {
      setDriveLoading(false);
    }
  }

  async function loadSpreadsheetsList(tokenOverride?: string) {
    const token = tokenOverride ?? accessToken;
    if (!token) return;
    setSheetsListLoading(true);
    setBannerError(null);
    try {
      const files = await listDriveSpreadsheets(token, lang);
      setSpreadsheets(files);
    } catch (err) {
      handleApiFailure(err);
    } finally {
      setSheetsListLoading(false);
    }
  }

  async function loadSpreadsheetDetails(
    spreadsheetId: string,
    tokenOverride?: string,
    preferredTab?: string,
  ) {
    const token = tokenOverride ?? accessToken;
    if (!token || !spreadsheetId) return;
    setSheetDataLoading(true);
    setBannerError(null);
    try {
      const meta = await getSpreadsheetMetadata(token, lang, spreadsheetId);
      setSpreadsheetMeta(meta);
      const tabToRead =
        (preferredTab && meta.sheets.some((s) => s.title === preferredTab)
          ? preferredTab
          : meta.sheets[0]?.title) ?? '';
      setSelectedSheetTitle(tabToRead);
      if (tabToRead) {
        const values = await readSheetValues(token, lang, spreadsheetId, tabToRead, 'A1:K50');
        setSheetRows(values);
      } else {
        setSheetRows([]);
      }
    } catch (err) {
      handleApiFailure(err);
    } finally {
      setSheetDataLoading(false);
    }
  }

  async function loadTabValues(spreadsheetId: string, tabTitle: string) {
    if (!accessToken || !spreadsheetId || !tabTitle) return;
    setSheetDataLoading(true);
    setBannerError(null);
    try {
      const values = await readSheetValues(accessToken, lang, spreadsheetId, tabTitle, 'A1:K50');
      setSheetRows(values);
    } catch (err) {
      handleApiFailure(err);
    } finally {
      setSheetDataLoading(false);
    }
  }

  useEffect(() => {
    if (!accessToken) return;
    if (subTab === 'drive') {
      void loadDrive(accessToken);
    } else {
      void loadSpreadsheetsList(accessToken);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, subTab]);

  async function handleGoogleSignIn(forceConsent = false) {
    setAuthLoading(true);
    setBannerError(null);
    setBannerSuccess(null);
    try {
      const { user, accessToken: freshToken } = await signInWithGoogleWorkspace(forceConsent);
      setGoogleUser(user);
      setAccessToken(freshToken);
      setBannerSuccess(
        lang === 'ar'
          ? 'تم ربط حساب Google Drive و Google Sheets بنجاح.'
          : 'Connected to Google Drive & Google Sheets successfully.',
      );
      await Promise.all([loadDrive(freshToken, null, 'all', ''), loadSpreadsheetsList(freshToken)]);
    } catch (err) {
      handleApiFailure(err);
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleGoogleSignOut() {
    setBannerError(null);
    setBannerSuccess(null);
    await signOutGoogleWorkspace();
    setGoogleUser(null);
    setAccessToken(null);
    setDriveFiles([]);
    setSpreadsheets([]);
    setSelectedSpreadsheetId('');
    setSpreadsheetMeta(null);
    setSelectedSheetTitle('');
    setSheetRows([]);
    setFolderStack([]);
  }

  function handleOpenFolder(folder: DriveFileItem) {
    const nextStack = [...folderStack, { id: folder.id, name: folder.name }];
    setFolderStack(nextStack);
    void loadDrive(accessToken ?? undefined, folder.id, driveFilter, driveSearch);
  }

  function handleNavigateBreadcrumb(index: number) {
    const nextStack = index < 0 ? [] : folderStack.slice(0, index + 1);
    const targetFolderId = nextStack.length > 0 ? nextStack[nextStack.length - 1].id : null;
    setFolderStack(nextStack);
    void loadDrive(accessToken ?? undefined, targetFolderId, driveFilter, driveSearch);
  }

  function requestCreateFolder(e: FormEvent) {
    e.preventDefault();
    const trimmed = newFolderName.trim();
    if (!trimmed || !accessToken) return;

    const locationLabel = currentFolder
      ? currentFolder.name
      : lang === 'ar'
        ? 'المجلد الرئيسي (My Drive)'
        : 'Root (My Drive)';

    setPendingAction({
      title: lang === 'ar' ? 'تأكيد إنشاء مجلد جديد في Google Drive' : 'Confirm New Google Drive Folder',
      description:
        lang === 'ar'
          ? 'سيتم إنشاء مجلد جديد داخل حساب Google Drive المرتبط:'
          : 'A new folder will be created inside your connected Google Drive:',
      details: [
        `${lang === 'ar' ? 'اسم المجلد:' : 'Folder Name:'} ${trimmed}`,
        `${lang === 'ar' ? 'الموقع:' : 'Location:'} ${locationLabel}`,
      ],
      confirmLabel: lang === 'ar' ? 'تأكيد وإنشاء المجلد' : 'Confirm & Create Folder',
      variant: 'primary',
      onConfirm: async () => {
        await createDriveFolder(accessToken, lang, trimmed, currentFolder?.id ?? null);
        setNewFolderName('');
        setShowFolderForm(false);
        setBannerSuccess(
          lang === 'ar'
            ? `تم إنشاء المجلد «${trimmed}» بنجاح في Google Drive.`
            : `Created folder "${trimmed}" in Google Drive.`,
        );
        await loadDrive(accessToken, currentFolder?.id ?? null);
      },
    });
  }

  function handleFileSelectedForUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !accessToken) return;

    const locationLabel = currentFolder
      ? currentFolder.name
      : lang === 'ar'
        ? 'المجلد الرئيسي (My Drive)'
        : 'Root (My Drive)';

    setPendingAction({
      title: lang === 'ar' ? 'تأكيد رفع مستند إلى Google Drive' : 'Confirm File Upload to Google Drive',
      description:
        lang === 'ar'
          ? 'سيتم رفع المستند التالي إلى حساب Google Drive المرتبط:'
          : 'The following document will be uploaded to your connected Google Drive:',
      details: [
        `${lang === 'ar' ? 'اسم الملف:' : 'File:'} ${file.name}`,
        `${lang === 'ar' ? 'الحجم:' : 'Size:'} ${formatDriveFileSize(file.size, lang)}`,
        `${lang === 'ar' ? 'المجلد المستهدف:' : 'Destination:'} ${locationLabel}`,
      ],
      confirmLabel: lang === 'ar' ? 'تأكيد ورفع الملف' : 'Confirm & Upload',
      variant: 'primary',
      onConfirm: async () => {
        await uploadDriveFile(accessToken, lang, file, currentFolder?.id ?? null);
        setBannerSuccess(
          lang === 'ar'
            ? `تم رفع الملف «${file.name}» بنجاح إلى Google Drive.`
            : `Uploaded "${file.name}" to Google Drive.`,
        );
        await loadDrive(accessToken, currentFolder?.id ?? null);
      },
    });
  }

  function requestTrashFile(file: DriveFileItem) {
    if (!accessToken) return;
    setPendingAction({
      title: lang === 'ar' ? 'تأكيد نقل الملف إلى سلة المهملات' : 'Confirm Move File to Trash',
      description:
        lang === 'ar'
          ? 'هل أنت متأكد من نقل هذا الملف إلى سلة المهملات في Google Drive؟ يمكنك استعادته لاحقاً من سلة المهملات في Drive.'
          : 'Are you sure you want to move this file to Google Drive Trash? You can still restore it from Drive Trash later.',
      details: [
        `${lang === 'ar' ? 'اسم الملف:' : 'File Name:'} ${file.name}`,
        `${lang === 'ar' ? 'النوع:' : 'Type:'} ${classifyDriveMimeType(file.mimeType, lang).label}`,
      ],
      confirmLabel: lang === 'ar' ? 'نعم، نقل إلى سلة المهملات' : 'Yes, Move to Trash',
      variant: 'danger',
      onConfirm: async () => {
        await trashDriveFile(accessToken, lang, file.id);
        setBannerSuccess(
          lang === 'ar'
            ? `تم نقل «${file.name}» إلى سلة المهملات في Google Drive.`
            : `Moved "${file.name}" to Google Drive Trash.`,
        );
        await loadDrive(accessToken, currentFolder?.id ?? null);
      },
    });
  }

  function requestCreateSpreadsheet(e: FormEvent) {
    e.preventDefault();
    if (!accessToken) return;
    const defaultTitle =
      lang === 'ar'
        ? 'سجل شركة الرضوان للقضايا والمواعيد'
        : 'Al-Radwan Law Firm - Cases & Schedule';
    const title = newSheetTitle.trim() || defaultTitle;
    const tabTitles =
      lang === 'ar'
        ? ['القضايا النشطة', 'مواعيد الاستشارات', 'ملخصات الصافي']
        : ['Active Cases', 'Consultation Appointments', 'Al-Safi AI Intakes'];

    setPendingAction({
      title:
        lang === 'ar'
          ? 'تأكيد إنشاء جدول Google Sheets جديد'
          : 'Confirm Creating New Google Spreadsheet',
      description:
        lang === 'ar'
          ? 'سيتم إنشاء جدول بيانات جديد في حساب Google Drive الخاص بك مع ثلاث أوراق عمل مخصصة لشركة الرضوان:'
          : 'A new Google Spreadsheet will be created in your Google Drive with three dedicated tabs for Al-Radwan Law Firm:',
      details: [
        `${lang === 'ar' ? 'اسم الجدول:' : 'Spreadsheet Title:'} ${title}`,
        `${lang === 'ar' ? 'أوراق العمل:' : 'Tabs:'} ${tabTitles.join(' · ')}`,
      ],
      confirmLabel: lang === 'ar' ? 'تأكيد وإنشاء الجدول' : 'Confirm & Create Sheet',
      variant: 'primary',
      onConfirm: async () => {
        const created = await createFirmSpreadsheet(accessToken, lang, title, tabTitles);
        setNewSheetTitle('');
        setShowNewSheetForm(false);
        setSelectedSpreadsheetId(created.spreadsheetId);
        setSpreadsheetMeta(created);
        setSelectedSheetTitle(created.sheets[0]?.title ?? '');
        setSheetRows([]);
        setBannerSuccess(
          lang === 'ar'
            ? `تم إنشاء جدول البيانات «${created.title}» بنجاح.`
            : `Created Google Spreadsheet "${created.title}".`,
        );
        await loadSpreadsheetsList(accessToken);
      },
    });
  }

  function requestSyncToSheet() {
    if (!accessToken || !spreadsheetMeta || !selectedSheetTitle) return;

    const includeHeader = syncMode === 'replace';
    const rows =
      syncDataset === 'cases'
        ? buildCasesSheetRows(cases, lang, includeHeader)
        : syncDataset === 'bookings'
          ? buildBookingsSheetRows(bookings, lang, includeHeader)
          : buildIntakesSheetRows(intakes, lang, includeHeader);

    const recordCount =
      syncDataset === 'cases'
        ? cases.length
        : syncDataset === 'bookings'
          ? bookings.length
          : intakes.length;

    const datasetLabel =
      syncDataset === 'cases'
        ? lang === 'ar'
          ? 'القضايا النشطة'
          : 'Active Cases'
        : syncDataset === 'bookings'
          ? lang === 'ar'
            ? 'مواعيد الاستشارات'
            : 'Consultation Appointments'
          : lang === 'ar'
            ? 'ملخصات الصافي'
            : 'Al-Safi AI Intakes';

    const modeLabel =
      syncMode === 'replace'
        ? lang === 'ar'
          ? 'استبدال كامل محتوى الورقة المحددة (مسح وإعادة كتابة)'
          : 'Overwrite entire selected tab (clear and write fresh)'
        : lang === 'ar'
          ? 'إضافة الصفوف الجديدة في نهاية الورقة دون حذف البيانات الحالية'
          : 'Append rows to the bottom without deleting existing rows';

    setPendingAction({
      title:
        lang === 'ar'
          ? 'تأكيد مزامنة البيانات مع Google Sheets'
          : 'Confirm Sync to Google Sheets',
      description:
        syncMode === 'replace'
          ? lang === 'ar'
            ? 'تنبيه: سيؤدي هذا الإجراء إلى مسح محتوى ورقة العمل المحددة واستبدالها بأحدث سجلات الشركة.'
            : 'Warning: This action will clear the selected sheet tab and replace it with the latest firm records.'
          : lang === 'ar'
            ? 'سيتم إضافة السجلات التالية كصفوف جديدة في نهاية ورقة العمل المحددة:'
            : 'The following records will be appended as new rows to the selected tab:',
      details: [
        `${lang === 'ar' ? 'جدول البيانات:' : 'Spreadsheet:'} ${spreadsheetMeta.title}`,
        `${lang === 'ar' ? 'ورقة العمل (Tab):' : 'Target Tab:'} ${selectedSheetTitle}`,
        `${lang === 'ar' ? 'البيانات المرسلة:' : 'Dataset:'} ${datasetLabel} (${recordCount})`,
        `${lang === 'ar' ? 'وضع المزامنة:' : 'Sync Mode:'} ${modeLabel}`,
      ],
      confirmLabel:
        syncMode === 'replace'
          ? lang === 'ar'
            ? 'تأكيد المسح والمزامنة'
            : 'Confirm Overwrite & Sync'
          : lang === 'ar'
            ? 'تأكيد إضافة الصفوف'
            : 'Confirm & Append Rows',
      variant: syncMode === 'replace' ? 'danger' : 'primary',
      onConfirm: async () => {
        const result = await syncRowsToSheet(accessToken, lang, {
          spreadsheetId: spreadsheetMeta.spreadsheetId,
          sheetTitle: selectedSheetTitle,
          rows,
          mode: syncMode,
        });
        setBannerSuccess(
          lang === 'ar'
            ? `تمت مزامنة ${result.updatedRows} صفاً بنجاح إلى ورقة «${selectedSheetTitle}».`
            : `Synced ${result.updatedRows} rows to "${selectedSheetTitle}" successfully.`,
        );
        await loadTabValues(spreadsheetMeta.spreadsheetId, selectedSheetTitle);
      },
    });
  }

  async function executePendingConfirmation() {
    if (!pendingAction) return;
    setExecutingAction(true);
    setBannerError(null);
    setBannerSuccess(null);
    try {
      await pendingAction.onConfirm();
      setPendingAction(null);
    } catch (err) {
      setPendingAction(null);
      handleApiFailure(err);
    } finally {
      setExecutingAction(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Status banners */}
      {bannerError && (
        <div
          role="alert"
          className="bg-red-50 border border-red-200 text-red-800 rounded-xl px-4 py-3 text-sm flex items-start justify-between gap-3"
        >
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" aria-hidden="true" />
            <span>{bannerError}</span>
          </div>
          <button
            type="button"
            onClick={() => setBannerError(null)}
            aria-label={lang === 'ar' ? 'إغلاق التنبيه' : 'Dismiss error'}
            className="p-1 rounded hover:bg-red-100 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {bannerSuccess && (
        <div
          role="status"
          className="bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl px-4 py-3 text-sm flex items-start justify-between gap-3"
        >
          <div className="flex items-start gap-2.5">
            <CheckCircle2
              className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5"
              aria-hidden="true"
            />
            <span>{bannerSuccess}</span>
          </div>
          <button
            type="button"
            onClick={() => setBannerSuccess(null)}
            aria-label={lang === 'ar' ? 'إغلاق الإشعار' : 'Dismiss notice'}
            className="p-1 rounded hover:bg-emerald-100 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Unauthenticated Gate with Official Sign in with Google Button */}
      {needsAuth ? (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="bg-[#0B132B] text-white px-6 py-6 sm:px-8 sm:py-7 border-b border-white/10">
            <div className="flex items-center gap-3 mb-3">
              <span className="w-10 h-10 rounded-xl bg-[#C5A059]/20 border border-[#C5A059]/40 flex items-center justify-center text-[#C5A059]">
                <HardDrive className="w-5 h-5" aria-hidden="true" />
              </span>
              <div>
                <p className="text-xs font-semibold text-[#C5A059]">
                  {lang === 'ar' ? 'ربط Google Workspace السحابي' : 'Google Workspace Cloud Sync'}
                </p>
                <h2 className="text-lg sm:text-xl font-bold">
                  {lang === 'ar'
                    ? 'إدارة ملفات القضايا في Google Drive ومزامنة Google Sheets'
                    : 'Manage Case Files in Google Drive & Sync Google Sheets'}
                </h2>
              </div>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed max-w-3xl">
              {lang === 'ar'
                ? 'اربط حساب Google الخاص بفريق شركة الرضوان لتصفح ورفع لوائح الدعاوى والوكالات مباشرة إلى Google Drive، ومزامنة سجل القضايا ومواعيد الاستشارات وملخصات «الصافي» إلى جداول Google Sheets بنقرة واحدة.'
                : 'Connect your Al-Radwan legal team Google account to browse and upload pleadings directly to Google Drive, and sync Active Cases, Appointments, and Al-Safi summaries to Google Sheets.'}
            </p>
          </div>

          <div className="p-6 sm:p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-xl border border-slate-200 bg-[#F8FAFC] p-4 space-y-2">
                <div className="flex items-center gap-2 text-[#0B132B] font-bold text-sm">
                  <HardDrive className="w-4 h-4 text-[#C5A059]" aria-hidden="true" />
                  <span>{lang === 'ar' ? 'أرشيف Google Drive القانوني' : 'Google Drive Legal Archive'}</span>
                </div>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  {lang === 'ar'
                    ? 'البحث في الملفات والمجلدات، إنشاء مجلدات جديدة لكل قضية أو موكل، رفع المستندات والوكالات، وفتح الملفات مباشرة.'
                    : 'Search files and folders, create dedicated case folders, upload contracts and pleadings, and open files directly.'}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-[#F8FAFC] p-4 space-y-2">
                <div className="flex items-center gap-2 text-[#0B132B] font-bold text-sm">
                  <FileSpreadsheet className="w-4 h-4 text-[#C5A059]" aria-hidden="true" />
                  <span>{lang === 'ar' ? 'جداول Google Sheets الحية' : 'Live Google Sheets Sync'}</span>
                </div>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  {lang === 'ar'
                    ? 'معاينة أي جدول بيانات حالي، أو إنشاء سجل رسمي للشركة وتصدير القضايا النشطة ومواعيد الاستشارات وملخصات الصافي إليه.'
                    : 'Preview existing spreadsheets, or create a master firm ledger and sync Active Cases, Appointments, and AI intakes.'}
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 border-t border-slate-200">
              <div className="flex items-start gap-2.5 text-xs text-slate-600 max-w-xl">
                <ShieldCheck className="w-4 h-4 text-[#C5A059] shrink-0 mt-0.5" aria-hidden="true" />
                <span>
                  {lang === 'ar'
                    ? 'يتم حفظ رمز الوصول في ذاكرة الجلسة الحالية فقط، ولن يتم تعديل أو حذف أي ملف أو جدول دون نافذة تأكيد واضحة منك.'
                    : 'Access tokens remain in memory for your active session only. Every file upload, sheet update, or deletion requires explicit confirmation.'}
                </span>
              </div>

              {/* Official Sign in with Google button */}
              <button
                type="button"
                disabled={authLoading}
                onClick={() => void handleGoogleSignIn(Boolean(googleUser && !accessToken))}
                className="min-h-[48px] px-5 py-2.5 rounded-lg bg-white hover:bg-slate-50 active:bg-slate-100 text-[#1f1f1f] border border-[#747775] shadow-sm text-sm font-semibold flex items-center justify-center gap-3 whitespace-nowrap cursor-pointer transition-colors disabled:opacity-60"
              >
                <GoogleLogoSvg />
                <span>
                  {authLoading
                    ? lang === 'ar'
                      ? 'جاري الاتصال بحساب Google...'
                      : 'Connecting to Google...'
                    : googleUser && !accessToken
                      ? lang === 'ar'
                        ? 'تجديد جلسة Google'
                        : 'Reconnect with Google'
                      : lang === 'ar'
                        ? 'تسجيل الدخول باستخدام Google'
                        : 'Sign in with Google'}
                </span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Authenticated Google Drive & Sheets Workspace */
        <div className="space-y-5">
          {/* Connected Account Bar + Sub-Tab Switcher */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              {googleUser.photoURL ? (
                <img
                  src={googleUser.photoURL}
                  alt={googleUser.displayName || 'Google Account'}
                  referrerPolicy="no-referrer"
                  className="w-10 h-10 rounded-full border border-[#C5A059]/50 shrink-0 object-cover"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-[#0B132B] text-[#C5A059] font-bold flex items-center justify-center shrink-0">
                  {(googleUser.displayName || googleUser.email || 'G').charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-sm font-bold text-[#0B132B] truncate">
                  {googleUser.displayName || (lang === 'ar' ? 'حساب Google المرتبط' : 'Connected Google Account')}
                </p>
                <p className="text-xs text-slate-500 font-mono-data truncate" dir="ltr">
                  {googleUser.email}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 p-1 bg-[#F8FAFC] rounded-xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => setSubTab('drive')}
                  className={`min-h-[38px] px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors ${
                    subTab === 'drive'
                      ? 'bg-[#0B132B] text-white'
                      : 'text-slate-600 hover:text-[#0B132B]'
                  }`}
                >
                  <HardDrive className="w-4 h-4 text-[#C5A059]" />
                  <span>{lang === 'ar' ? 'ملفات Google Drive' : 'Google Drive'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSubTab('sheets')}
                  className={`min-h-[38px] px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors ${
                    subTab === 'sheets'
                      ? 'bg-[#0B132B] text-white'
                      : 'text-slate-600 hover:text-[#0B132B]'
                  }`}
                >
                  <FileSpreadsheet className="w-4 h-4 text-[#C5A059]" />
                  <span>{lang === 'ar' ? 'جداول Google Sheets' : 'Google Sheets'}</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => void handleGoogleSignOut()}
                className="min-h-[38px] px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-100 text-xs font-semibold text-slate-700 flex items-center gap-1.5 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>{lang === 'ar' ? 'فصل حساب Google' : 'Disconnect'}</span>
              </button>
            </div>
          </div>

          {/* SUB-TAB A: Google Drive Manager */}
          {subTab === 'drive' && (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-200 space-y-3">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                  {/* Breadcrumbs */}
                  <nav aria-label="Drive folders" className="flex items-center flex-wrap gap-1 text-sm">
                    <button
                      type="button"
                      onClick={() => handleNavigateBreadcrumb(-1)}
                      className={`font-bold px-2 py-1 rounded-lg cursor-pointer ${
                        folderStack.length === 0
                          ? 'text-[#0B132B] bg-[#F8FAFC]'
                          : 'text-slate-500 hover:text-[#0B132B]'
                      }`}
                    >
                      {lang === 'ar' ? 'ملفاتي (Google Drive)' : 'My Drive'}
                    </button>
                    {folderStack.map((folder, idx) => (
                      <div key={folder.id} className="flex items-center gap-1">
                        <BreadcrumbChevron className="w-4 h-4 text-slate-400" />
                        <button
                          type="button"
                          onClick={() => handleNavigateBreadcrumb(idx)}
                          className={`font-bold px-2 py-1 rounded-lg cursor-pointer ${
                            idx === folderStack.length - 1
                              ? 'text-[#0B132B] bg-[#F8FAFC]'
                              : 'text-slate-500 hover:text-[#0B132B]'
                          }`}
                        >
                          {folder.name}
                        </button>
                      </div>
                    ))}
                  </nav>

                  {/* Drive Actions */}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowFolderForm((prev) => !prev)}
                      className="min-h-[40px] px-3.5 py-2 rounded-xl border border-slate-300 hover:bg-[#F8FAFC] text-xs font-bold text-[#0B132B] flex items-center gap-1.5 cursor-pointer"
                    >
                      <FolderPlus className="w-4 h-4 text-[#C5A059]" />
                      <span>{lang === 'ar' ? 'مجلد قضية جديد' : 'New Folder'}</span>
                    </button>

                    <input
                      ref={fileInputRef}
                      type="file"
                      onChange={handleFileSelectedForUpload}
                      className="hidden"
                      aria-label={lang === 'ar' ? 'رفع مستند إلى Google Drive' : 'Upload document to Google Drive'}
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="min-h-[40px] px-4 py-2 rounded-xl bg-[#C5A059] hover:bg-[#d4b06a] text-[#0B132B] text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Upload className="w-4 h-4" />
                      <span>{lang === 'ar' ? 'رفع مستند' : 'Upload File'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => void loadDrive()}
                      disabled={driveLoading}
                      aria-label={lang === 'ar' ? 'تحديث الملفات' : 'Refresh files'}
                      className="min-h-[40px] min-w-[40px] px-2.5 rounded-xl border border-slate-300 hover:bg-[#F8FAFC] flex items-center justify-center cursor-pointer"
                    >
                      <RefreshCw className={`w-4 h-4 text-[#0B132B] ${driveLoading ? 'animate-spin' : ''}`} />
                    </button>
                  </div>
                </div>

                {/* Inline New Folder Form */}
                {showFolderForm && (
                  <form
                    onSubmit={requestCreateFolder}
                    className="p-3.5 rounded-xl bg-[#F8FAFC] border border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5"
                  >
                    <input
                      type="text"
                      required
                      value={newFolderName}
                      onChange={(e) => setNewFolderName(e.target.value)}
                      placeholder={
                        lang === 'ar'
                          ? 'مثال: ملف القضية IRB-2026-101 - خالد المنصور'
                          : 'e.g., Case IRB-2026-101 - Client Folder'
                      }
                      className="flex-1 min-h-[40px] px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#C5A059]"
                    />
                    <div className="flex items-center gap-2">
                      <button
                        type="submit"
                        className="min-h-[40px] px-4 py-2 rounded-lg bg-[#0B132B] text-white text-xs font-bold cursor-pointer"
                      >
                        {lang === 'ar' ? 'إنشاء' : 'Create'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowFolderForm(false);
                          setNewFolderName('');
                        }}
                        className="min-h-[40px] px-3 py-2 rounded-lg border border-slate-300 text-xs font-semibold cursor-pointer"
                      >
                        {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                      </button>
                    </div>
                  </form>
                )}

                {/* Search & Type Filter */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      void loadDrive(accessToken ?? undefined, currentFolder?.id ?? null, driveFilter, driveSearch);
                    }}
                    className="relative flex-1 max-w-md flex items-center gap-2"
                  >
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 text-slate-400 absolute top-1/2 -translate-y-1/2 start-3" />
                      <input
                        type="search"
                        value={driveSearch}
                        onChange={(e) => setDriveSearch(e.target.value)}
                        placeholder={
                          lang === 'ar' ? 'ابحث في ملفات Google Drive...' : 'Search Google Drive files...'
                        }
                        className="w-full min-h-[40px] ps-9 pe-3 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#C5A059]"
                      />
                    </div>
                    <button
                      type="submit"
                      className="min-h-[40px] px-3.5 py-2 rounded-xl bg-[#0B132B] text-white text-xs font-bold cursor-pointer"
                    >
                      {lang === 'ar' ? 'بحث' : 'Search'}
                    </button>
                  </form>

                  <div className="flex items-center gap-1.5 overflow-x-auto">
                    {(
                      [
                        { id: 'all', ar: 'الكل', en: 'All' },
                        { id: 'folders', ar: 'المجلدات', en: 'Folders' },
                        { id: 'spreadsheets', ar: 'جداول Sheets', en: 'Sheets' },
                        { id: 'documents', ar: 'مستندات و PDF', en: 'Docs & PDF' },
                      ] as const
                    ).map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => {
                          setDriveFilter(f.id);
                          void loadDrive(accessToken ?? undefined, currentFolder?.id ?? null, f.id, driveSearch);
                        }}
                        className={`min-h-[34px] px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer ${
                          driveFilter === f.id
                            ? 'bg-[#0B132B] text-white'
                            : 'bg-[#F8FAFC] text-slate-600 hover:bg-slate-200/70'
                        }`}
                      >
                        {f[lang]}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Drive File List */}
              {driveLoading ? (
                <div className="p-10 text-center text-sm text-slate-500">
                  {lang === 'ar' ? 'جاري تحميل ملفات Google Drive...' : 'Loading Google Drive files...'}
                </div>
              ) : driveFiles.length === 0 ? (
                <div className="p-10 text-center text-sm text-slate-500">
                  {lang === 'ar'
                    ? 'لا توجد ملفات مطابقة في هذا الموقع.'
                    : 'No matching files found in this location.'}
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {driveFiles.map((file) => {
                    const fileType = classifyDriveMimeType(file.mimeType, lang);
                    const isFolder = fileType.kind === 'folder';
                    const isSheet = fileType.kind === 'spreadsheet';
                    return (
                      <div
                        key={file.id}
                        className="px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#F8FAFC]/80"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="w-9 h-9 rounded-lg bg-[#F8FAFC] border border-slate-200 flex items-center justify-center shrink-0">
                            {isFolder ? (
                              <Folder className="w-4 h-4 text-[#C5A059]" />
                            ) : isSheet ? (
                              <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
                            ) : fileType.kind === 'image' ? (
                              <ImageIcon className="w-4 h-4 text-sky-700" />
                            ) : (
                              <FileText className="w-4 h-4 text-[#0B132B]" />
                            )}
                          </span>
                          <div className="min-w-0">
                            {isFolder ? (
                              <button
                                type="button"
                                onClick={() => handleOpenFolder(file)}
                                className="text-sm font-bold text-[#0B132B] hover:text-[#C5A059] truncate block text-start cursor-pointer"
                              >
                                {file.name}
                              </button>
                            ) : (
                              <p className="text-sm font-bold text-[#0B132B] truncate">{file.name}</p>
                            )}
                            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                              <span>{fileType.label}</span>
                              {!isFolder && (
                                <>
                                  <span aria-hidden="true">·</span>
                                  <span className="font-mono-data">
                                    {formatDriveFileSize(file.size, lang)}
                                  </span>
                                </>
                              )}
                              {file.modifiedTime && (
                                <>
                                  <span aria-hidden="true">·</span>
                                  <span className="font-mono-data">
                                    {file.modifiedTime.slice(0, 10)}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {isSheet && (
                            <button
                              type="button"
                              onClick={() => {
                                setSubTab('sheets');
                                setSelectedSpreadsheetId(file.id);
                                void loadSpreadsheetDetails(file.id);
                              }}
                              className="min-h-[36px] px-3 py-1.5 rounded-lg bg-[#0B132B] text-white text-xs font-bold cursor-pointer"
                            >
                              {lang === 'ar' ? 'فتح للمزامنة' : 'Open in Sheets'}
                            </button>
                          )}

                          {file.webViewLink && (
                            <a
                              href={file.webViewLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="min-h-[36px] px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-100 text-xs font-semibold text-[#0B132B] flex items-center gap-1"
                            >
                              <ExternalLink className="w-3.5 h-3.5 text-[#C5A059]" />
                              <span>{lang === 'ar' ? 'فتح' : 'Open'}</span>
                            </a>
                          )}

                          <button
                            type="button"
                            onClick={() => requestTrashFile(file)}
                            aria-label={`${lang === 'ar' ? 'نقل إلى سلة المهملات' : 'Move to trash'} ${file.name}`}
                            className="min-h-[36px] min-w-[36px] px-2 rounded-lg border border-red-200 hover:bg-red-50 text-red-700 flex items-center justify-center cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* SUB-TAB B: Google Sheets Sync & Preview */}
          {subTab === 'sheets' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Spreadsheet Selector & Creator */}
              <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 overflow-hidden flex flex-col">
                <div className="px-4 py-3.5 border-b border-slate-200 flex items-center justify-between gap-2">
                  <h3 className="text-sm font-bold text-[#0B132B] flex items-center gap-1.5">
                    <FileSpreadsheet className="w-4 h-4 text-[#C5A059]" />
                    <span>{lang === 'ar' ? 'جداول البيانات' : 'Spreadsheets'}</span>
                  </h3>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setShowNewSheetForm((prev) => !prev)}
                      className="min-h-[34px] px-2.5 py-1 rounded-lg bg-[#C5A059] hover:bg-[#d4b06a] text-[#0B132B] text-xs font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{lang === 'ar' ? 'جدول جديد' : 'New Sheet'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => void loadSpreadsheetsList()}
                      disabled={sheetsListLoading}
                      aria-label={lang === 'ar' ? 'تحديث الجداول' : 'Refresh spreadsheets'}
                      className="min-h-[34px] min-w-[34px] rounded-lg border border-slate-300 hover:bg-[#F8FAFC] flex items-center justify-center cursor-pointer"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${sheetsListLoading ? 'animate-spin' : ''}`} />
                    </button>
                  </div>
                </div>

                {showNewSheetForm && (
                  <form
                    onSubmit={requestCreateSpreadsheet}
                    className="p-3.5 bg-[#F8FAFC] border-b border-slate-200 space-y-2.5"
                  >
                    <label className="block text-xs font-bold text-slate-700">
                      {lang === 'ar' ? 'اسم الجدول الجديد للشركة' : 'New Firm Spreadsheet Title'}
                    </label>
                    <input
                      type="text"
                      value={newSheetTitle}
                      onChange={(e) => setNewSheetTitle(e.target.value)}
                      placeholder={
                        lang === 'ar'
                          ? 'سجل شركة الرضوان للقضايا والمواعيد'
                          : 'Al-Radwan Law Firm - Cases & Schedule'
                      }
                      className="w-full min-h-[38px] px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs"
                    />
                    <div className="flex items-center gap-2">
                      <button
                        type="submit"
                        className="min-h-[36px] px-3 py-1.5 rounded-lg bg-[#0B132B] text-white text-xs font-bold cursor-pointer"
                      >
                        {lang === 'ar' ? 'إنشاء الجدول' : 'Create'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowNewSheetForm(false)}
                        className="min-h-[36px] px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold cursor-pointer"
                      >
                        {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                      </button>
                    </div>
                  </form>
                )}

                <div className="divide-y divide-slate-100 max-h-[460px] overflow-y-auto">
                  {sheetsListLoading ? (
                    <div className="p-6 text-center text-xs text-slate-500">
                      {lang === 'ar' ? 'جاري تحميل جداول Google Sheets...' : 'Loading spreadsheets...'}
                    </div>
                  ) : spreadsheets.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-500 space-y-2">
                      <p>
                        {lang === 'ar'
                          ? 'لم يتم العثور على جداول Google Sheets بعد.'
                          : 'No Google Spreadsheets found yet.'}
                      </p>
                      <p>
                        {lang === 'ar'
                          ? 'اضغط «جدول جديد» لإنشاء سجل قضايا ومواعيد جاهز للشركة.'
                          : 'Click "New Sheet" to create a ready-to-use firm ledger.'}
                      </p>
                    </div>
                  ) : (
                    spreadsheets.map((sheet) => {
                      const active = sheet.id === selectedSpreadsheetId;
                      return (
                        <button
                          key={sheet.id}
                          type="button"
                          onClick={() => {
                            setSelectedSpreadsheetId(sheet.id);
                            void loadSpreadsheetDetails(sheet.id);
                          }}
                          className={`w-full text-start px-4 py-3 flex items-start justify-between gap-2 cursor-pointer transition-colors ${
                            active ? 'bg-[#0B132B] text-white' : 'hover:bg-[#F8FAFC] text-[#0B132B]'
                          }`}
                        >
                          <div className="min-w-0">
                            <p className="text-xs sm:text-sm font-bold truncate">{sheet.name}</p>
                            {sheet.modifiedTime && (
                              <p
                                className={`text-[11px] font-mono-data mt-0.5 ${
                                  active ? 'text-slate-300' : 'text-slate-500'
                                }`}
                              >
                                {sheet.modifiedTime.slice(0, 10)}
                              </p>
                            )}
                          </div>
                          <Table2
                            className={`w-4 h-4 shrink-0 mt-0.5 ${
                              active ? 'text-[#C5A059]' : 'text-slate-400'
                            }`}
                          />
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Active Sheet Sync & Live Preview */}
              <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 overflow-hidden">
                {!spreadsheetMeta ? (
                  <div className="p-10 text-center space-y-2">
                    <FileSpreadsheet className="w-8 h-8 text-[#C5A059] mx-auto" />
                    <p className="text-sm font-bold text-[#0B132B]">
                      {lang === 'ar'
                        ? 'اختر جدول بيانات من القائمة أو أنشئ جدولاً جديداً'
                        : 'Select a Spreadsheet or Create a New One'}
                    </p>
                    <p className="text-xs text-slate-500 max-w-md mx-auto">
                      {lang === 'ar'
                        ? 'بعد اختيار الجدول يمكنك استعراض الأوراق (Tabs) الفعلية ومزامنة القضايا النشطة ومواعيد الاستشارات وملخصات الصافي.'
                        : 'Once selected, inspect its real tabs and sync Active Cases, Consultation Bookings, or Al-Safi AI Intakes.'}
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-200">
                    {/* Spreadsheet Header & Dynamic Tab Selector */}
                    <div className="p-5 space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold text-[#C5A059]">
                            {lang === 'ar' ? 'جدول Google Sheets المحدد' : 'Active Google Spreadsheet'}
                          </p>
                          <h3 className="text-base font-bold text-[#0B132B]">
                            {spreadsheetMeta.title}
                          </h3>
                        </div>
                        <a
                          href={spreadsheetMeta.spreadsheetUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="min-h-[38px] px-3.5 py-1.5 rounded-lg border border-slate-300 hover:bg-[#F8FAFC] text-xs font-bold text-[#0B132B] flex items-center gap-1.5"
                        >
                          <ExternalLink className="w-3.5 h-3.5 text-[#C5A059]" />
                          <span>{lang === 'ar' ? 'فتح في Google Sheets' : 'Open in Google Sheets'}</span>
                        </a>
                      </div>

                      {/* Sync Controls */}
                      <div className="p-4 rounded-xl bg-[#F8FAFC] border border-slate-200 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 items-end">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">
                            {lang === 'ar' ? 'ورقة العمل (Tab)' : 'Sheet Tab'}
                          </label>
                          <select
                            value={selectedSheetTitle}
                            onChange={(e) => {
                              const nextTab = e.target.value;
                              setSelectedSheetTitle(nextTab);
                              void loadTabValues(spreadsheetMeta.spreadsheetId, nextTab);
                            }}
                            className="w-full min-h-[40px] px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-bold"
                          >
                            {spreadsheetMeta.sheets.map((tab) => (
                              <option key={tab.sheetId} value={tab.title}>
                                {tab.title}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">
                            {lang === 'ar' ? 'البيانات المراد تصديرها' : 'Firm Dataset'}
                          </label>
                          <select
                            value={syncDataset}
                            onChange={(e) => setSyncDataset(e.target.value as SyncDataset)}
                            className="w-full min-h-[40px] px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-bold"
                          >
                            <option value="cases">
                              {lang === 'ar' ? `القضايا النشطة (${cases.length})` : `Active Cases (${cases.length})`}
                            </option>
                            <option value="bookings">
                              {lang === 'ar'
                                ? `مواعيد الاستشارات (${bookings.length})`
                                : `Appointments (${bookings.length})`}
                            </option>
                            <option value="intakes">
                              {lang === 'ar'
                                ? `ملخصات الصافي (${intakes.length})`
                                : `AI Intakes (${intakes.length})`}
                            </option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">
                            {lang === 'ar' ? 'طريقة الكتابة' : 'Write Mode'}
                          </label>
                          <select
                            value={syncMode}
                            onChange={(e) => setSyncMode(e.target.value as SyncMode)}
                            className="w-full min-h-[40px] px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-bold"
                          >
                            <option value="replace">
                              {lang === 'ar' ? 'تحديث كامل للورقة' : 'Overwrite Tab'}
                            </option>
                            <option value="append">
                              {lang === 'ar' ? 'إضافة صفوف جديدة' : 'Append Rows'}
                            </option>
                          </select>
                        </div>

                        <button
                          type="button"
                          onClick={requestSyncToSheet}
                          disabled={!selectedSheetTitle}
                          className="min-h-[40px] px-4 py-2 rounded-lg bg-[#C5A059] hover:bg-[#d4b06a] text-[#0B132B] text-xs font-bold cursor-pointer disabled:opacity-50"
                        >
                          {lang === 'ar' ? 'مزامنة الآن' : 'Sync to Sheet'}
                        </button>
                      </div>
                    </div>

                    {/* Live Sheet Preview Table */}
                    <div>
                      <div className="px-5 py-3 bg-[#F8FAFC] border-b border-slate-200 flex items-center justify-between text-xs">
                        <span className="font-bold text-[#0B132B]">
                          {lang === 'ar'
                            ? `معاينة ورقة «${selectedSheetTitle}»`
                            : `Preview of "${selectedSheetTitle}"`}
                        </span>
                        <span className="text-slate-500 font-mono-data">
                          {sheetRows.length} {lang === 'ar' ? 'صف' : 'rows'}
                        </span>
                      </div>

                      {sheetDataLoading ? (
                        <div className="p-8 text-center text-xs text-slate-500">
                          {lang === 'ar' ? 'جاري قراءة بيانات الجدول...' : 'Reading spreadsheet rows...'}
                        </div>
                      ) : sheetRows.length === 0 ? (
                        <div className="p-8 text-center text-xs text-slate-500">
                          {lang === 'ar'
                            ? 'هذه الورقة فارغة حالياً. اضغط «مزامنة الآن» لتصدير سجلات الشركة إليها.'
                            : 'This tab is currently empty. Click "Sync to Sheet" to export firm records here.'}
                        </div>
                      ) : (
                        <div className="overflow-x-auto max-h-[360px]">
                          <table className="w-full text-xs text-start">
                            <thead className="bg-[#0B132B] text-white sticky top-0">
                              <tr>
                                {sheetRows[0].map((cell, colIdx) => (
                                  <th
                                    key={colIdx}
                                    className="py-2.5 px-3 text-start font-bold whitespace-nowrap"
                                  >
                                    {cell}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {sheetRows.slice(1).map((row, rowIdx) => (
                                <tr key={rowIdx} className="hover:bg-[#F8FAFC]">
                                  {sheetRows[0].map((_, colIdx) => (
                                    <td
                                      key={colIdx}
                                      className="py-2.5 px-3 text-slate-700 whitespace-nowrap max-w-[260px] truncate"
                                    >
                                      {row[colIdx] ?? ''}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Mandatory In-App Confirmation Modal for All Mutating / Destructive Operations */}
      {pendingAction && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="workspace-confirm-title"
          className="fixed inset-0 z-50 bg-[#0B132B]/70 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-2xl w-full max-w-md border border-slate-200 shadow-2xl overflow-hidden">
            <div
              className={`px-5 py-4 text-white flex items-center justify-between ${
                pendingAction.variant === 'danger' ? 'bg-red-900' : 'bg-[#0B132B]'
              }`}
            >
              <h3 id="workspace-confirm-title" className="text-sm sm:text-base font-bold">
                {pendingAction.title}
              </h3>
              <button
                type="button"
                disabled={executingAction}
                onClick={() => setPendingAction(null)}
                aria-label={lang === 'ar' ? 'إغلاق' : 'Close'}
                className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg hover:bg-white/10 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <p className="text-sm text-slate-700 leading-relaxed">{pendingAction.description}</p>

              <ul className="bg-[#F8FAFC] border border-slate-200 rounded-xl p-3.5 space-y-1.5 text-xs text-[#0B132B]">
                {pendingAction.details.map((line, idx) => (
                  <li key={idx} className="font-medium break-words">
                    {line}
                  </li>
                ))}
              </ul>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  disabled={executingAction}
                  onClick={() => setPendingAction(null)}
                  className="min-h-[42px] px-4 py-2 rounded-xl border border-slate-300 text-sm font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="button"
                  disabled={executingAction}
                  onClick={() => void executePendingConfirmation()}
                  className={`min-h-[42px] px-5 py-2 rounded-xl text-sm font-bold cursor-pointer disabled:opacity-60 ${
                    pendingAction.variant === 'danger'
                      ? 'bg-red-700 hover:bg-red-800 text-white'
                      : 'bg-[#C5A059] hover:bg-[#d4b06a] text-[#0B132B]'
                  }`}
                >
                  {executingAction
                    ? lang === 'ar'
                      ? 'جاري التنفيذ...'
                      : 'Processing...'
                    : pendingAction.confirmLabel}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
