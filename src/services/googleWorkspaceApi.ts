import type { Language } from '../types/legal.js';
import {
  buildDriveSearchQuery,
  formatSheetRange,
  parseGoogleApiError,
  type DriveFileFilter,
} from '../utils/workspaceHelpers.js';

export interface DriveFileItem {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime?: string;
  size?: string;
  webViewLink?: string;
  parents?: string[];
}

export interface SheetTabInfo {
  sheetId: number;
  title: string;
  rowCount?: number;
  columnCount?: number;
}

export interface SpreadsheetMeta {
  spreadsheetId: string;
  title: string;
  spreadsheetUrl: string;
  sheets: SheetTabInfo[];
}

export class GoogleWorkspaceApiError extends Error {
  status: number;
  requiresReauth: boolean;

  constructor(message: string, status: number, requiresReauth: boolean) {
    super(message);
    this.name = 'GoogleWorkspaceApiError';
    this.status = status;
    this.requiresReauth = requiresReauth;
  }
}

async function handleGoogleResponse<T>(res: Response, lang: Language): Promise<T> {
  const text = await res.text();
  let parsed: unknown = {};
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = {};
    }
  }

  if (!res.ok) {
    const info = parseGoogleApiError(res.status, parsed, lang);
    throw new GoogleWorkspaceApiError(info.message, res.status, info.requiresReauth);
  }

  return parsed as T;
}

export async function listDriveFiles(
  accessToken: string,
  lang: Language,
  options: {
    search?: string;
    filterType?: DriveFileFilter;
    folderId?: string | null;
    pageSize?: number;
  } = {},
): Promise<DriveFileItem[]> {
  const q = buildDriveSearchQuery({
    search: options.search,
    filterType: options.filterType,
    folderId: options.folderId,
  });

  const params = new URLSearchParams({
    q,
    fields: 'files(id,name,mimeType,modifiedTime,size,webViewLink,parents)',
    orderBy: 'folder,modifiedTime desc',
    pageSize: String(options.pageSize ?? 30),
    supportsAllDrives: 'true',
    includeItemsFromAllDrives: 'true',
  });

  const res = await fetch(`https://www.googleapis.com/drive/v3/files?${params.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const data = await handleGoogleResponse<{ files?: DriveFileItem[] }>(res, lang);
  return data.files ?? [];
}

export async function createDriveFolder(
  accessToken: string,
  lang: Language,
  name: string,
  parentId?: string | null,
): Promise<DriveFileItem> {
  const metadata: Record<string, unknown> = {
    name: name.trim(),
    mimeType: 'application/vnd.google-apps.folder',
  };
  if (parentId) {
    metadata.parents = [parentId];
  }

  const res = await fetch(
    'https://www.googleapis.com/drive/v3/files?fields=id,name,mimeType,modifiedTime,webViewLink,parents',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(metadata),
    },
  );

  return handleGoogleResponse<DriveFileItem>(res, lang);
}

export async function uploadDriveFile(
  accessToken: string,
  lang: Language,
  file: File,
  parentId?: string | null,
): Promise<DriveFileItem> {
  const metadata: Record<string, unknown> = {
    name: file.name,
  };
  if (parentId) {
    metadata.parents = [parentId];
  }

  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', file);

  const res = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,modifiedTime,size,webViewLink,parents',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: form,
    },
  );

  return handleGoogleResponse<DriveFileItem>(res, lang);
}

export async function trashDriveFile(
  accessToken: string,
  lang: Language,
  fileId: string,
): Promise<void> {
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ trashed: true }),
  });

  await handleGoogleResponse<unknown>(res, lang);
}

export async function listDriveSpreadsheets(
  accessToken: string,
  lang: Language,
  search?: string,
): Promise<DriveFileItem[]> {
  return listDriveFiles(accessToken, lang, {
    search,
    filterType: 'spreadsheets',
    pageSize: 25,
  });
}

export async function getSpreadsheetMetadata(
  accessToken: string,
  lang: Language,
  spreadsheetId: string,
): Promise<SpreadsheetMeta> {
  const fields =
    'spreadsheetId,spreadsheetUrl,properties.title,sheets.properties(sheetId,title,gridProperties)';
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}?fields=${encodeURIComponent(fields)}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );

  const data = await handleGoogleResponse<{
    spreadsheetId: string;
    spreadsheetUrl?: string;
    properties?: { title?: string };
    sheets?: Array<{
      properties?: {
        sheetId?: number;
        title?: string;
        gridProperties?: { rowCount?: number; columnCount?: number };
      };
    }>;
  }>(res, lang);

  return {
    spreadsheetId: data.spreadsheetId,
    title: data.properties?.title || 'Untitled Spreadsheet',
    spreadsheetUrl:
      data.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${data.spreadsheetId}/edit`,
    sheets: (data.sheets ?? []).map((s, idx) => ({
      sheetId: s.properties?.sheetId ?? idx,
      title: s.properties?.title || `Tab ${idx + 1}`,
      rowCount: s.properties?.gridProperties?.rowCount,
      columnCount: s.properties?.gridProperties?.columnCount,
    })),
  };
}

export async function readSheetValues(
  accessToken: string,
  lang: Language,
  spreadsheetId: string,
  sheetTitle: string,
  cellRange = 'A1:K50',
): Promise<string[][]> {
  const encodedRange = encodeURIComponent(formatSheetRange(sheetTitle, cellRange));
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodedRange}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );

  const data = await handleGoogleResponse<{ values?: string[][] }>(res, lang);
  return data.values ?? [];
}

export async function createFirmSpreadsheet(
  accessToken: string,
  lang: Language,
  title: string,
  tabTitles: string[],
): Promise<SpreadsheetMeta> {
  const res = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: { title: title.trim() },
      sheets: tabTitles.map((tabTitle) => ({
        properties: { title: tabTitle },
      })),
    }),
  });

  const data = await handleGoogleResponse<{
    spreadsheetId: string;
    spreadsheetUrl?: string;
    properties?: { title?: string };
    sheets?: Array<{ properties?: { sheetId?: number; title?: string } }>;
  }>(res, lang);

  return {
    spreadsheetId: data.spreadsheetId,
    title: data.properties?.title || title,
    spreadsheetUrl:
      data.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${data.spreadsheetId}/edit`,
    sheets: (data.sheets ?? []).map((s, idx) => ({
      sheetId: s.properties?.sheetId ?? idx,
      title: s.properties?.title || tabTitles[idx] || `Tab ${idx + 1}`,
    })),
  };
}

export async function syncRowsToSheet(
  accessToken: string,
  lang: Language,
  params: {
    spreadsheetId: string;
    sheetTitle: string;
    rows: string[][];
    mode: 'replace' | 'append';
  },
): Promise<{ updatedRows: number }> {
  const { spreadsheetId, sheetTitle, rows, mode } = params;
  const encodedClearRange = encodeURIComponent(formatSheetRange(sheetTitle, 'A1:Z1000'));
  const encodedStartRange = encodeURIComponent(formatSheetRange(sheetTitle, 'A1'));

  if (mode === 'replace') {
    const clearRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodedClearRange}:clear`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      },
    );
    await handleGoogleResponse<unknown>(clearRes, lang);

    const updateRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodedStartRange}?valueInputOption=USER_ENTERED`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ values: rows }),
      },
    );
    const updated = await handleGoogleResponse<{ updatedRows?: number }>(updateRes, lang);
    return { updatedRows: updated.updatedRows ?? rows.length };
  }

  const appendRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodedStartRange}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ values: rows }),
    },
  );
  const appended = await handleGoogleResponse<{ updates?: { updatedRows?: number } }>(
    appendRes,
    lang,
  );
  return { updatedRows: appended.updates?.updatedRows ?? rows.length };
}
