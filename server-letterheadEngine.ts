import { execFile } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { promisify } from 'util';
import PizZip from 'pizzip';
import type { LegalDocumentRecord } from '../src/types/legal.js';

const execFileAsync = promisify(execFile);

const TEMPLATE_DOCX_PATH = path.resolve(process.cwd(), 'server', 'templates', 'radwan-letterhead.docx');
const HEADER_IMAGE_PATH = path.resolve(
  process.cwd(),
  'public',
  'assets',
  'brand',
  'letterhead-header.jpg'
);

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function buildRtlParagraphXml(
  text: string,
  opts?: {
    bold?: boolean;
    sizeHalfPt?: number;
    align?: 'right' | 'center' | 'left' | 'both';
    spacingBefore?: number;
    spacingAfter?: number;
    lineSpacing?: number;
    keepNext?: boolean;
    colorHex?: string;
    borderBottom?: boolean;
    pageBreakBefore?: boolean;
  }
): string {
  const size = opts?.sizeHalfPt ?? 26; // 13pt
  const align = opts?.align ?? 'both';
  const before = opts?.spacingBefore ?? 40;
  const after = opts?.spacingAfter ?? 120;
  const line = opts?.lineSpacing ?? 320;
  const boldTag = opts?.bold ? '<w:b/><w:bCs/>' : '';
  const colorTag = opts?.colorHex ? `<w:color w:val="${opts.colorHex}"/>` : '';
  const keepNextTag = opts?.keepNext ? '<w:keepNext/>' : '';
  const pageBreakTag = opts?.pageBreakBefore ? '<w:pageBreakBefore/>' : '';
  const borderTag = opts?.borderBottom
    ? '<w:pBdr><w:bottom w:val="single" w:sz="8" w:space="4" w:color="C5A059"/></w:pBdr>'
    : '';

  const runProps = `<w:rPr><w:rFonts w:ascii="Simplified Arabic" w:hAnsi="Simplified Arabic" w:cs="Simplified Arabic"/>${boldTag}${colorTag}<w:sz w:val="${size}"/><w:szCs w:val="${size}"/><w:rtl/><w:lang w:bidi="ar-JO"/></w:rPr>`;
  const pProps = `<w:pPr>${keepNextTag}${pageBreakTag}${borderTag}<w:spacing w:before="${before}" w:after="${after}" w:line="${line}" w:lineRule="auto"/><w:bidi/><w:jc w:val="${align}"/>${runProps}</w:pPr>`;

  return `<w:p>${pProps}<w:r>${runProps}<w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r></w:p>`;
}

function buildMetadataBlockXml(docRecord: LegalDocumentRecord): string {
  const lines: string[] = [];
  if (docRecord.courtOrAuthority) {
    lines.push(`الجهة / المحكمة المختصة: ${docRecord.courtOrAuthority}`);
  }
  if (docRecord.clientName) {
    lines.push(`الموكل: ${docRecord.clientName}`);
  }
  lines.push(`تاريخ التحرير: ${docRecord.updatedAt.slice(0, 10)}`);
  lines.push(
    `حالة المستند: ${
      docRecord.status === 'signed_ready'
        ? 'معتمد وجاهز للتوقيع والتقديم'
        : docRecord.status === 'approved'
          ? 'معتمد من المحامي'
          : docRecord.status === 'reviewed'
            ? 'تمت المراجعة'
            : 'مسودة قيد المراجعة'
    }`
  );
  return lines
    .map((line, idx) =>
      buildRtlParagraphXml(line, {
        bold: idx === 0,
        sizeHalfPt: 24,
        align: 'right',
        spacingBefore: 20,
        spacingAfter: idx === lines.length - 1 ? 140 : 40,
        lineSpacing: 280,
        borderBottom: idx === lines.length - 1,
        colorHex: '0B132B',
      })
    )
    .join('');
}

function convertBodyLinesToWordXml(bodyText: string): string {
  const lines = bodyText.replace(/\r\n/g, '\n').split('\n');
  const paragraphs: string[] = [];

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (!trimmed) {
      paragraphs.push(
        buildRtlParagraphXml(' ', { sizeHalfPt: 16, spacingBefore: 0, spacingAfter: 60, lineSpacing: 240 })
      );
      continue;
    }

    const cleanHeading = trimmed.replace(/^#+\s*/, '').replace(/\*\*/g, '');
    const isHeading =
      /^#{1,3}\s+/.test(trimmed) ||
      /^(أولاً|ثانياً|ثالثاً|رابعاً|خامساً|سادساً|سابعاً|الوقائع|الأسباب|الطلبات|الدفوع|المرفقات|الموضوع|مقام محكمة|لدى محكمة|بواسطة|المستدعي|المدعي|المدعى عليه|الإنذار العدلي|عقد|اتفاقية)/.test(
        cleanHeading
      ) ||
      (cleanHeading.endsWith(':') && cleanHeading.length < 70);

    paragraphs.push(
      buildRtlParagraphXml(cleanHeading, {
        bold: isHeading,
        sizeHalfPt: isHeading ? 28 : 26,
        align: isHeading ? 'right' : 'both',
        spacingBefore: isHeading ? 140 : 40,
        spacingAfter: isHeading ? 80 : 110,
        lineSpacing: 320,
        keepNext: isHeading,
        colorHex: isHeading ? '0B132B' : '111827',
      })
    );
  }

  return paragraphs.join('');
}

function buildSignatureBlockXml(docRecord: LegalDocumentRecord): string {
  const signerName = docRecord.signedBy || docRecord.approvedBy || 'المحامي رضوان علي بطاينة';
  const isApproved = docRecord.status === 'approved' || docRecord.status === 'signed_ready' || docRecord.status === 'submitted';

  return [
    buildRtlParagraphXml(' ', { sizeHalfPt: 20, spacingBefore: 180, spacingAfter: 40 }),
    `<w:p><w:pPr><w:keepNext/><w:spacing w:before="120" w:after="40" w:line="280" w:lineRule="auto"/><w:bidi/><w:jc w:val="left"/><w:rPr><w:rFonts w:ascii="Aldhabi" w:hAnsi="Aldhabi" w:cs="Aldhabi"/><w:b/><w:bCs/><w:sz w:val="32"/><w:szCs w:val="32"/><w:rtl/><w:lang w:bidi="ar-JO"/></w:rPr></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Aldhabi" w:hAnsi="Aldhabi" w:cs="Aldhabi"/><w:b/><w:bCs/><w:sz w:val="32"/><w:szCs w:val="32"/><w:rtl/><w:lang w:bidi="ar-JO"/></w:rPr><w:t>وكيل الجهة / المحامي</w:t></w:r></w:p>`,
    `<w:p><w:pPr><w:keepNext/><w:spacing w:before="20" w:after="40" w:line="280" w:lineRule="auto"/><w:bidi/><w:jc w:val="left"/><w:rPr><w:rFonts w:ascii="Aldhabi" w:hAnsi="Aldhabi" w:cs="Aldhabi"/><w:b/><w:bCs/><w:sz w:val="34"/><w:szCs w:val="34"/><w:rtl/><w:lang w:bidi="ar-JO"/></w:rPr></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Aldhabi" w:hAnsi="Aldhabi" w:cs="Aldhabi"/><w:b/><w:bCs/><w:sz w:val="34"/><w:szCs w:val="34"/><w:rtl/><w:lang w:bidi="ar-JO"/></w:rPr><w:t>${escapeXml(signerName)}</w:t></w:r></w:p>`,
    buildRtlParagraphXml(
      isApproved
        ? 'التوقيع والختم الرسمي: ______________________ (نسخة معتمدة للتوقيع والتقديم)'
        : 'التوقيع والختم الرسمي: ______________________ (مسودة بانتظار اعتماد المحامي)',
      { bold: false, sizeHalfPt: 20, align: 'left', spacingBefore: 40, spacingAfter: 80, colorHex: '4B5563' }
    ),
  ].join('');
}

/**
 * Generates an authentic editable .docx buffer by opening the exact official
 * Radwan letterhead template (preserving header1.xml, footer1.xml, original logo,
 * margins, and RTL section settings) and inserting the structured legal content.
 */
export function buildOfficialLetterheadDocxBuffer(docRecord: LegalDocumentRecord): Buffer {
  if (!fs.existsSync(TEMPLATE_DOCX_PATH)) {
    throw new Error('Official letterhead template radwan-letterhead.docx is missing.');
  }

  const templateBytes = fs.readFileSync(TEMPLATE_DOCX_PATH);
  const zip = new PizZip(templateBytes);

  const documentXmlEntry = zip.file('word/document.xml');
  if (!documentXmlEntry) {
    throw new Error('Invalid letterhead DOCX: missing word/document.xml');
  }

  const originalDocXml = documentXmlEntry.asText();
  const sectPrMatch = originalDocXml.match(/<w:sectPr[\s\S]*<\/w:sectPr>/);
  if (!sectPrMatch) {
    throw new Error('Invalid letterhead DOCX: missing section properties <w:sectPr>');
  }

  // Ensure bottom margin protects the footer area from body text overlap on multi-page documents
  // while keeping header margin (top=2674, header=990, footer=438) and original header1/footer1 untouched.
  let sectPrXml = sectPrMatch[0];
  sectPrXml = sectPrXml.replace(/w:bottom="\d+"/, 'w:bottom="1150"');

  const titleXml = buildRtlParagraphXml(docRecord.title, {
    bold: true,
    sizeHalfPt: 34,
    align: 'center',
    spacingBefore: 60,
    spacingAfter: 160,
    colorHex: '0B132B',
    borderBottom: true,
    keepNext: true,
  });

  const metaXml = buildMetadataBlockXml(docRecord);
  const bodyXml = convertBodyLinesToWordXml(docRecord.bodyText);

  let attachmentsXml = '';
  if (docRecord.attachmentsChecklist && docRecord.attachmentsChecklist.length > 0) {
    attachmentsXml =
      buildRtlParagraphXml('قائمة المرفقات المطلوبة:', {
        bold: true,
        sizeHalfPt: 26,
        align: 'right',
        spacingBefore: 160,
        spacingAfter: 60,
        keepNext: true,
        colorHex: '0B132B',
      }) +
      docRecord.attachmentsChecklist
        .map((item, idx) =>
          buildRtlParagraphXml(`${idx + 1}. ${item}`, {
            sizeHalfPt: 24,
            align: 'right',
            spacingBefore: 20,
            spacingAfter: 60,
          })
        )
        .join('');
  }

  const signatureXml = buildSignatureBlockXml(docRecord);

  const docStartMatch = originalDocXml.match(/^[\s\S]*?<w:body>/);
  const docStart = docStartMatch ? docStartMatch[0] : '<w:document><w:body>';
  const updatedDocumentXml = `${docStart}${titleXml}${metaXml}${bodyXml}${attachmentsXml}${signatureXml}${sectPrXml}</w:body></w:document>`;

  zip.file('word/document.xml', updatedDocumentXml);

  return zip.generate({
    type: 'nodebuffer',
    compression: 'DEFLATE',
  }) as Buffer;
}

// Serialize Word COM automation calls so concurrent requests never collide
let wordConversionQueue: Promise<void> = Promise.resolve();

async function convertDocxToPdfViaWordCom(docxPath: string, pdfPath: string): Promise<boolean> {
  if (process.platform !== 'win32') return false;

  const script = `
$ErrorActionPreference = 'Stop'
$word = $null
$doc = $null
try {
  $word = New-Object -ComObject Word.Application
  $word.Visible = $false
  $word.DisplayAlerts = 0
  $doc = $word.Documents.Open('${docxPath.replace(/'/g, "''")}', $false, $true)
  $doc.ExportAsFixedFormat('${pdfPath.replace(/'/g, "''")}', 17)
  $doc.Close(0)
  $doc = $null
} finally {
  if ($doc -ne $null) { try { $doc.Close(0) } catch {} }
  if ($word -ne $null) { try { $word.Quit() } catch {} }
}
`;

  try {
    await execFileAsync(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-Command', script],
      { timeout: 30000 }
    );
    return fs.existsSync(pdfPath) && fs.statSync(pdfPath).size > 1000;
  } catch {
    return false;
  }
}

async function convertDocxToPdfViaLibreOffice(docxPath: string, outDir: string): Promise<string | null> {
  const candidates = [process.env.LIBREOFFICE_PATH, 'soffice', 'libreoffice'].filter(Boolean) as string[];
  for (const bin of candidates) {
    try {
      await execFileAsync(
        bin,
        ['--headless', '--convert-to', 'pdf', '--outdir', outDir, docxPath],
        { timeout: 30000 }
      );
      const expected = path.join(outDir, `${path.basename(docxPath, '.docx')}.pdf`);
      if (fs.existsSync(expected)) return expected;
    } catch {
      // Try next binary
    }
  }
  return null;
}

export async function buildOfficialLetterheadPdfBuffer(
  docRecord: LegalDocumentRecord
): Promise<{ buffer: Buffer | null; engine: 'word-com' | 'libreoffice' | 'print-fallback' }> {
  const docxBuffer = buildOfficialLetterheadDocxBuffer(docRecord);
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rb-doc-'));
  const docxPath = path.join(tmpDir, 'document.docx');
  const pdfPath = path.join(tmpDir, 'document.pdf');

  try {
    fs.writeFileSync(docxPath, docxBuffer);

    let converted = false;
    const prevTask = wordConversionQueue;
    let releaseQueue!: () => void;
    wordConversionQueue = new Promise<void>((resolve) => {
      releaseQueue = resolve;
    });

    try {
      await prevTask;
      converted = await convertDocxToPdfViaWordCom(docxPath, pdfPath);
    } finally {
      releaseQueue();
    }

    if (converted) {
      return { buffer: fs.readFileSync(pdfPath), engine: 'word-com' };
    }

    const sofficePdf = await convertDocxToPdfViaLibreOffice(docxPath, tmpDir);
    if (sofficePdf) {
      return { buffer: fs.readFileSync(sofficePdf), engine: 'libreoffice' };
    }

    return { buffer: null, engine: 'print-fallback' };
  } finally {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup error
    }
  }
}

/**
 * Generates an exact-letterhead A4 RTL print HTML document using the official extracted
 * header image and exact footer text from radwan-letterhead.doc for browser print/Save-as-PDF.
 */
export function buildOfficialLetterheadPrintHtml(docRecord: LegalDocumentRecord): string {
  let headerImgDataUri = '/assets/brand/letterhead-header.jpg';
  try {
    if (fs.existsSync(HEADER_IMAGE_PATH)) {
      const b64 = fs.readFileSync(HEADER_IMAGE_PATH).toString('base64');
      headerImgDataUri = `data:image/jpeg;base64,${b64}`;
    }
  } catch {
    // Use public URL fallback
  }

  const signerName = docRecord.signedBy || docRecord.approvedBy || 'المحامي رضوان علي بطاينة';
  const isApproved =
    docRecord.status === 'approved' ||
    docRecord.status === 'signed_ready' ||
    docRecord.status === 'submitted';

  const bodyParagraphs = docRecord.bodyText
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => {
      const t = line.trim();
      if (!t) return '<div class="spacer"></div>';
      const clean = t.replace(/^#+\s*/, '').replace(/\*\*/g, '');
      const isHeading =
        /^#{1,3}\s+/.test(t) ||
        /^(أولاً|ثانياً|ثالثاً|رابعاً|خامساً|سادساً|سابعاً|الوقائع|الأسباب|الطلبات|الدفوع|المرفقات|الموضوع|مقام محكمة|لدى محكمة|بواسطة)/.test(
          clean
        );
      return isHeading
        ? `<h2>${escapeXml(clean)}</h2>`
        : `<p>${escapeXml(clean)}</p>`;
    })
    .join('\n');

  const attachmentsHtml =
    docRecord.attachmentsChecklist && docRecord.attachmentsChecklist.length > 0
      ? `<div class="attachments"><h3>قائمة المرفقات المطلوبة:</h3><ol>${docRecord.attachmentsChecklist
          .map((a) => `<li>${escapeXml(a)}</li>`)
          .join('')}</ol></div>`
      : '';

  return `<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8" />
  <title>${escapeXml(docRecord.title)} — شركة الرضوان للقانون والتحكيم</title>
  <style>
    @page { size: A4; margin: 44mm 14mm 26mm 14mm; }
    * { box-sizing: border-box; }
    body {
      font-family: 'Simplified Arabic', 'Traditional Arabic', 'Cairo', Tahoma, sans-serif;
      color: #111827;
      margin: 0;
      padding: 0;
      direction: rtl;
      background: #fff;
      font-size: 13.5pt;
      line-height: 1.75;
    }
    .print-header {
      position: fixed;
      top: -38mm;
      left: 0;
      right: 0;
      border-bottom: 1.5px solid #111827;
      padding-bottom: 4px;
      text-align: center;
      background: #fff;
    }
    .print-header img {
      width: 100%;
      max-height: 31mm;
      object-fit: contain;
    }
    .print-footer {
      position: fixed;
      bottom: -20mm;
      left: 0;
      right: 0;
      border-top: 1.5px solid #111827;
      padding-top: 4px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 10.5pt;
      font-weight: bold;
      background: #fff;
    }
    h1.doc-title {
      text-align: center;
      font-size: 17pt;
      color: #0B132B;
      border-bottom: 1.5px solid #C5A059;
      padding-bottom: 6px;
      margin: 0 0 14px 0;
    }
    .meta-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 16px;
      font-size: 11pt;
    }
    .meta-table td {
      border: 1px solid #d6d3cd;
      padding: 5px 10px;
    }
    .meta-table td.label {
      width: 28%;
      background: #f4f1ea;
      font-weight: bold;
    }
    h2 {
      font-size: 14pt;
      color: #0B132B;
      margin: 14px 0 6px 0;
      page-break-after: avoid;
    }
    p {
      margin: 0 0 8px 0;
      text-align: justify;
    }
    .spacer { height: 8px; }
    .attachments {
      margin-top: 14px;
      padding: 10px 14px;
      background: #faf8f3;
      border: 1px solid #d6d3cd;
      border-radius: 6px;
      page-break-inside: avoid;
    }
    .attachments h3 { margin: 0 0 6px 0; font-size: 12.5pt; }
    .attachments ol { margin: 0; padding-inline-start: 20px; }
    .signature-box {
      margin-top: 28px;
      text-align: left;
      page-break-inside: avoid;
    }
    .signature-box .title { font-weight: bold; font-size: 14pt; }
    .signature-box .name { font-weight: bold; font-size: 15pt; color: #0B132B; }
    .signature-box .line { font-size: 10.5pt; color: #4b5563; margin-top: 6px; }
    @media screen {
      body { padding: 24px; max-width: 210mm; margin: 0 auto; }
      .print-header { position: static; margin-bottom: 16px; }
      .print-footer { position: static; margin-top: 28px; }
    }
  </style>
</head>
<body>
  <header class="print-header">
    <img src="${headerImgDataUri}" alt="ترويسة شركة الرضوان للقانون والتحكيم" />
  </header>

  <main>
    <h1 class="doc-title">${escapeXml(docRecord.title)}</h1>
    <table class="meta-table">
      ${docRecord.courtOrAuthority ? `<tr><td class="label">الجهة / المحكمة المختصة</td><td>${escapeXml(docRecord.courtOrAuthority)}</td></tr>` : ''}
      ${docRecord.clientName ? `<tr><td class="label">الموكل</td><td>${escapeXml(docRecord.clientName)}</td></tr>` : ''}
      <tr><td class="label">تاريخ التحرير</td><td>${escapeXml(docRecord.updatedAt.slice(0, 10))}</td></tr>
    </table>
    ${bodyParagraphs}
    ${attachmentsHtml}
    <div class="signature-box">
      <div class="title">المحامي</div>
      <div class="name">${escapeXml(signerName)}</div>
      <div class="line">${
        isApproved
          ? 'التوقيع والختم الرسمي: ______________________ (نسخة معتمدة للتوقيع والتقديم)'
          : 'التوقيع والختم الرسمي: ______________________ (مسودة بانتظار اعتماد المحامي)'
      }</div>
    </div>
  </main>

  <footer class="print-footer">
    <span>اربد – شارع الثلاثين – مجمع علاء الدين سنتر</span>
    <span dir="ltr">0796251902</span>
    <span>عمان – شارع مكه – مجمع داوود</span>
  </footer>
</body>
</html>`;
}
