import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import type { LegalDocumentType, LegalReferenceCitation } from '../src/types/legal.js';
import { searchJordanianLegalReferences } from './jordanianLawIndex.js';

export interface RbAiAssistantOutput {
  stage: 'clarifying' | 'draft_ready';
  assistantReply: string;
  detectedDocumentType: LegalDocumentType;
  documentTitle: string;
  courtOrAuthority: string;
  missingQuestions: string[];
  draftText?: string;
  reviewNotes?: string[];
  attachmentsChecklist?: string[];
  extractedEntities?: {
    parties?: string[];
    dates?: string[];
    amounts?: string[];
  };
  legalReferences?: LegalReferenceCitation[];
}

const VALID_DOC_TYPES: LegalDocumentType[] = [
  'lawsuit',
  'defense_memo',
  'legal_memo',
  'petition',
  'notarial_notice',
  'contract',
  'expert_request',
  'appeal_objection',
  'power_of_attorney',
  'official_letter',
  'government_request',
  'case_summary',
  'contract_analysis',
  'entity_extraction',
  'legal_review',
  'draft_revision',
  'attachments_checklist',
  'print_bundle',
];

const RB_AI_SYSTEM_PROMPT = `
You are "RB AI — LEGAL ASSISTANT", the internal AI Legal Office Assistant exclusively for registered attorneys of Al-Radwan Law & Arbitration (شركة الرضوان للقانون والتحكيم — RB LEGAL) in Jordan, led by Founder & Managing Director Attorney Radwan Ali Bataineh.

PURPOSE:
"مساعدك القانوني الذكي، من وصف القضية إلى المستند الجاهز للطباعة والتقديم."
The lawyer writes in plain natural Arabic (often Jordanian dialect or brief legal notes). Never require prompt engineering.

SUPPORTED 18 TASKS (Jordanian law & procedure):
1. lawsuit (لائحة دعوى)
2. defense_memo (لائحة جوابية)
3. legal_memo (مذكرة قانونية / مرافعة)
4. petition (استدعاء)
5. notarial_notice (إنذار عدلي)
6. contract (عقد / اتفاقية)
7. expert_request (طلب خبرة)
8. appeal_objection (لائحة استئناف / اعتراض)
9. power_of_attorney (وكالة / صيغة تفويض قانونية)
10. official_letter (مخاطبة رسمية)
11. government_request (طلب لجهة حكومية)
12. case_summary (تلخيص قضية / ملف)
13. contract_analysis (تحليل عقد / مستند)
14. entity_extraction (استخراج بيانات الأطراف والتواريخ والمبالغ)
15. legal_review (مراجعة لغوية وقانونية)
16. draft_revision (اقتراح تعديلات وتحسين الصياغة)
17. attachments_checklist (قائمة المرفقات المطلوبة)
18. print_bundle (ملف متكامل منظم للطباعة)

STRICT LEGAL INTEGRITY RULES (MANDATORY):
1. NEVER fabricate or invent Jordanian article numbers (رقم المادة), law numbers, or Court of Cassation / court ruling numbers!
2. Cite ONLY verified legislation and article numbers provided in the grounded reference context OR statutes you are 100% certain of; if a specific article number or precedent cannot be verified reliably, explicitly state in Arabic: "يتطلب التحقق من رقم المادة الدقيق أو الاجتهاد القضائي في الجريدة الرسمية / نظام قارئ الأحكام (قرارك) قبل التقديم النهائي" and mark verified=false in legalReferences.
3. Always determine the competent Jordanian court or authority (e.g., محكمة الصلح الحقوقية، محكمة البداية الحقوقية، المحكمة الشرعية، المحكمة الإدارية، دائرة الكاتب العدل، دائرة التنفيذ) based on Jordanian procedural law.
4. WORKFLOW:
   - If essential details (e.g., party names, claim value, key dates, or specific relief sought) are missing AND forceGenerate is false: set stage="clarifying", briefly confirm what document type and competent court you identified, and ask ONLY the essential missing questions cleanly in 1 short list.
   - If the lawyer already provided enough core facts OR answered your questions OR forceGenerate is true: set stage="draft_ready" and produce the FULL, formal, print-ready Arabic legal document in "draftText" (using placeholders like [الاسم الكامل / الرقم الوطني] only for any still-unspecified field), complete with proper Jordanian legal structure (المقدمة، الموضوع، الوقائع، الأسباب والدفوع القانونية، الطلبات), PLUS reviewNotes, attachmentsChecklist, extractedEntities, and legalReferences.
   - NEVER claim you signed or filed the document. The lawyer must review and explicitly approve it first.

OUTPUT FORMAT:
Return ONLY valid JSON matching this schema (no markdown outside JSON):
{
  "stage": "clarifying" | "draft_ready",
  "assistantReply": "Clear Arabic response to the attorney",
  "detectedDocumentType": "one of the 18 keys",
  "documentTitle": "Arabic formal title of the document",
  "courtOrAuthority": "Competent Jordanian court or authority",
  "missingQuestions": ["question 1", "question 2"],
  "draftText": "Full formal Arabic legal document text ready for letterhead injection when stage=draft_ready, else empty string",
  "reviewNotes": ["linguistic or legal review suggestion"],
  "attachmentsChecklist": ["required attachment 1", "required attachment 2"],
  "extractedEntities": {
    "parties": ["..."],
    "dates": ["..."],
    "amounts": ["..."]
  },
  "legalReferences": [
    {
      "lawName": "Law name",
      "article": "Optional verified article number or empty",
      "year": "Law number/year",
      "note": "Relevance note",
      "verified": true
    }
  ]
}
`;

export async function runRbAiLegalAssistant(params: {
  apiKey: string;
  messages: Array<{ role: string; text: string }>;
  caseContext?: string;
  attachmentText?: string;
  forceGenerate?: boolean;
  preferredDocType?: LegalDocumentType;
}): Promise<RbAiAssistantOutput> {
  const latestUserText = params.messages
    .filter((m) => m.role === 'user')
    .map((m) => m.text)
    .join('\n');

  const grounded = searchJordanianLegalReferences(
    `${latestUserText}\n${params.caseContext ?? ''}\n${params.attachmentText ?? ''}`
  );

  const groundedContext =
    grounded.matches.length > 0
      ? `\n\n[VERIFIED JORDANIAN STATUTORY CONTEXT]\n${grounded.matches
          .map(
            (m) =>
              `- ${m.lawName} (${m.lawNumberAndYear}): Competent Court: ${m.competentCourt}. Summary: ${m.summary} Notes: ${m.keyNotes.join(' ')}`
          )
          .join('\n')}`
      : '\n\n[VERIFIED STATUTORY CONTEXT: No exact local index match — state clearly if specific article numbers require verification in the Official Gazette.]';

  const contextEnvelope = [
    params.caseContext ? `[LINKED CASE CONTEXT]\n${params.caseContext}` : '',
    params.attachmentText ? `[ATTACHED DOCUMENT / FACTS TEXT]\n${params.attachmentText.slice(0, 12000)}` : '',
    params.preferredDocType ? `[REQUESTED DOCUMENT TYPE]: ${params.preferredDocType}` : '',
    params.forceGenerate
      ? '[INSTRUCTION: forceGenerate=true — Generate the complete formal Arabic legal draft now with stage="draft_ready", using bracketed placeholders only for any missing party details.]'
      : '',
  ]
    .filter(Boolean)
    .join('\n\n');

  const contents = params.messages.map((m, idx) => ({
    role: (m.role === 'assistant' || m.role === 'model' ? 'model' : 'user') as 'user' | 'model',
    parts: [
      {
        text:
          idx === params.messages.length - 1 && contextEnvelope
            ? `${m.text}\n\n${contextEnvelope}`
            : m.text,
      },
    ],
  }));

  // Ensure first turn is user
  while (contents.length > 0 && contents[0].role !== 'user') {
    contents.shift();
  }

  const ai = new GoogleGenAI({ apiKey: params.apiKey });
  const configuredModel = process.env.GEMINI_MODEL?.trim();
  const modelChain = [
    configuredModel,
    'gemini-3.1-flash-lite',
    'gemini-2.5-flash',
    'gemini-4-hydrogen',
  ].filter((v, idx, arr): v is string => Boolean(v) && arr.indexOf(v) === idx);

  let rawText = '';
  let lastError: unknown = null;

  for (const model of modelChain) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents,
        config: {
          systemInstruction: RB_AI_SYSTEM_PROMPT + groundedContext,
          responseMimeType: 'application/json',
          thinkingConfig: model.includes('flash-lite')
            ? undefined
            : { thinkingLevel: ThinkingLevel.LOW },
          abortSignal: AbortSignal.timeout(35000),
        },
      });
      if (response.text && response.text.trim()) {
        rawText = response.text.trim();
        break;
      }
    } catch (err) {
      lastError = err;
    }
  }

  if (!rawText) {
    throw lastError instanceof Error ? lastError : new Error('RB AI service unavailable');
  }

  const jsonMatch = rawText.match(/\{[\s\S]*\}/);
  const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : rawText) as Partial<RbAiAssistantOutput>;

  const docType = VALID_DOC_TYPES.includes(parsed.detectedDocumentType as LegalDocumentType)
    ? (parsed.detectedDocumentType as LegalDocumentType)
    : params.preferredDocType || 'legal_memo';

  const mergedRefs: LegalReferenceCitation[] = Array.isArray(parsed.legalReferences) && parsed.legalReferences.length > 0
    ? parsed.legalReferences
    : grounded.citations;

  return {
    stage: parsed.stage === 'draft_ready' && parsed.draftText ? 'draft_ready' : 'clarifying',
    assistantReply:
      parsed.assistantReply ||
      (parsed.stage === 'draft_ready'
        ? 'تم إعداد المسودة القانونية كاملة وفق الأصول القضائية الأردنية، ويمكنك مراجعتها وتعديلها أو تنزيلها على ترويسة المكتب الرسمية.'
        : 'تم فهم طلبك القانوني. يرجى تزويدي بالمعلومات التالية لاستكمال الصياغة بدقة:'),
    detectedDocumentType: docType,
    documentTitle: parsed.documentTitle || 'مستند قانوني — شركة الرضوان للقانون والتحكيم',
    courtOrAuthority:
      parsed.courtOrAuthority ||
      grounded.matches[0]?.competentCourt ||
      'المحكمة المختصة في المملكة الأردنية الهاشمية',
    missingQuestions: Array.isArray(parsed.missingQuestions) ? parsed.missingQuestions : [],
    draftText: parsed.draftText || '',
    reviewNotes: Array.isArray(parsed.reviewNotes) ? parsed.reviewNotes : [],
    attachmentsChecklist: Array.isArray(parsed.attachmentsChecklist)
      ? parsed.attachmentsChecklist
      : [],
    extractedEntities: parsed.extractedEntities,
    legalReferences: mergedRefs,
  };
}
