// Kimi-powered exam service (replaces the old Gemini service).
// The browser calls our backend (/api/ai/*), which proxies to the Desktop AI Copilot
// gateway -> Kimi. The sk_copilot_ key never reaches the browser. Kimi returns a
// questions Markdown document, which we parse into the app's Exam/Question shape.
import { Exam, Question, Option } from "../types";
import { API_BASE_URL } from "./apiConfig";

async function callAi(path: 'extract' | 'generate' | 'generate-new', body: Record<string, unknown>): Promise<string> {
  const res = await fetch(`${API_BASE_URL}/ai/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) {
    let msg = text;
    try { msg = JSON.parse(text).error || text; } catch { /* raw */ }
    throw new Error(msg || `AI request failed (${res.status})`);
  }
  let data: any = {};
  try { data = JSON.parse(text); } catch { /* non-JSON */ }
  return String(data.content || '');
}

// Admin: PDF text -> questions (via Kimi).
export const extractExamFromText = async (pdfText: string): Promise<Partial<Exam>> => {
  const md = await callAi('extract', { text: pdfText });
  const exam = parseQuestionsMarkdown(md);
  if (!exam.questions || exam.questions.length === 0) {
    throw new Error("The AI didn't return any parseable questions. Please try again (or check the PDF has selectable text).");
  }
  return exam;
};

export interface GenerateNewParams {
  topics?: string;
  referenceText?: string;
  difficulty?: string;   // easy | medium | hard | expert
  standard?: string;     // e.g. "GATE EC", "JEE Advanced", "CBSE Class 12"
  count?: number;
  format?: string;       // mixed | mcq | integer
}

// Generate a brand-new original question set from topics OR a reference paper
// (no repeats), at the requested standard/difficulty/format.
export const generateNewExam = async (params: GenerateNewParams): Promise<Partial<Exam>> => {
  const md = await callAi('generate-new', params as Record<string, unknown>);
  const exam = parseQuestionsMarkdown(md);
  if (!exam.questions || exam.questions.length === 0) {
    throw new Error("The AI didn't return any questions. Try adjusting the topics/difficulty and retry.");
  }
  return exam;
};

// GATE Explorer: topic -> generated PYQ set (via Kimi). Named the same as the old
// Gemini export so the rest of the app keeps working unchanged.
export const generateExamByTopic = async (topic: string): Promise<Partial<Exam>> => {
  const md = await callAi('generate', { topic });
  const exam = parseQuestionsMarkdown(md);
  if (!exam.title) exam.title = topic;
  if (!exam.questions || exam.questions.length === 0) {
    throw new Error("The AI didn't return any questions for this topic. Please try again.");
  }
  return exam;
};

// --- Markdown -> Exam parser --------------------------------------------------
// Tolerant parser for the "### Q<n> / Type / Question / Graph / A)-D) / Answer"
// format the prompt asks Kimi to produce. Robust to code fences, "(A)"/"A."/"A)"
// option styles, multi-line question text, and "Answer: NA".

const parseBlock = (block: string, idx: number): Question | null => {
  const lines = block.split('\n');
  let type = '';
  let qtext = '';
  let graph = '';
  let answer = '';
  const options: { letter: string; text: string }[] = [];
  let capturingQuestion = false;

  for (const raw of lines) {
    const line = raw.trim();
    let m: RegExpMatchArray | null;
    if ((m = line.match(/^Type\s*:\s*(.+)$/i))) { type = m[1].trim().toUpperCase(); capturingQuestion = false; }
    else if ((m = line.match(/^Question\s*:\s*(.*)$/i))) { qtext = m[1].trim(); capturingQuestion = true; }
    else if ((m = line.match(/^Graph\s*:\s*(.*)$/i))) { graph = m[1].trim(); capturingQuestion = false; }
    else if ((m = line.match(/^Answer\s*:\s*(.*)$/i))) { answer = m[1].trim(); capturingQuestion = false; }
    else if ((m = line.match(/^\(?([A-Da-d])[\).]\s*(.*)$/))) { options.push({ letter: m[1].toUpperCase(), text: m[2].trim() }); capturingQuestion = false; }
    else if (capturingQuestion && line) { qtext += (qtext ? ' ' : '') + line; }
  }

  if (!qtext && options.length === 0) return null;

  // Fold a graph description into the question text (admins can attach the real
  // figure image in the editor afterwards).
  if (graph && !/^(none|n\/?a|-|nil)$/i.test(graph)) qtext += `\n[Graph: ${graph}]`;

  const ts = Date.now();
  const isInteger = /INTEGER|NUMERIC|\bNAT\b/i.test(type) || options.length === 0;

  if (isInteger) {
    const isNa = /^(na|none|-|\?)$/i.test(answer.trim());
    const numeric = isNa ? undefined : (answer.replace(/[^0-9.\-]/g, '') || undefined);
    return { id: `q-${ts}-${idx}`, text: qtext || `Question ${idx + 1}`, type: 'INTEGER', options: [], correctAnswer: numeric };
  }

  const ansLetter = (answer.match(/[A-Da-d]/) || [''])[0].toUpperCase();
  const opts: Option[] = options.map((o, i) => ({
    id: `opt-${ts}-${idx}-${i}`,
    text: o.text,
    isCorrect: !!ansLetter && o.letter === ansLetter,
  }));
  return { id: `q-${ts}-${idx}`, text: qtext || `Question ${idx + 1}`, type: 'MCQ', options: opts };
};

export const parseQuestionsMarkdown = (raw: string): Partial<Exam> => {
  let md = String(raw || '').replace(/\r/g, '').trim();
  // Unwrap a whole-document code fence if the model wrapped it.
  md = md.replace(/^```(?:markdown|md|json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();
  // Kimi sometimes glues a question header to the previous line (e.g. "Answer: B### Q2")
  // or to its own first field ("### Q2Type:"). Force headers onto their own line so
  // the line-based parsing below stays reliable.
  md = md.replace(/([^\n])(#{2,3}\s*(?:Q(?:uestion)?\.?\s*)?\d+\b)/gi, '$1\n$2');
  md = md.replace(/(#{2,3}\s*(?:Q(?:uestion)?\.?\s*)?\d+\b)\s*(Type\s*:)/gi, '$1\n$2');

  const lines = md.split('\n');

  // Title = first top-level "# " heading (strip any ".md" filename suffix).
  let title = '';
  for (const l of lines) {
    const m = l.match(/^#\s+(.+)$/);
    if (m) { title = m[1].replace(/\.md\b.*$/i, '').trim(); break; }
  }

  // Question header lines: "### Q1", "## Question 2", "### 3.", etc.
  const headerRe = /^#{2,3}\s*(?:Q(?:uestion)?\.?\s*)?\d+\b/i;
  const headerIdx: number[] = [];
  lines.forEach((l, i) => { if (headerRe.test(l.trim())) headerIdx.push(i); });

  // Instructions: bullet lines under an "Instructions" heading, before the first question.
  const firstQ = headerIdx.length ? headerIdx[0] : lines.length;
  const instructions: string[] = [];
  let inInstr = false;
  for (let i = 0; i < firstQ; i++) {
    const l = lines[i].trim();
    if (/^#{1,3}\s/.test(l)) { inInstr = /instruction/i.test(l); continue; }
    if (inInstr) {
      const m = l.match(/^[-*]\s+(.*\S)/);
      if (m) instructions.push(m[1].trim());
    }
  }

  const questions: Question[] = [];
  for (let k = 0; k < headerIdx.length; k++) {
    const start = headerIdx[k];
    const end = k + 1 < headerIdx.length ? headerIdx[k + 1] : lines.length;
    const block = lines.slice(start + 1, end).join('\n');
    const q = parseBlock(block, k);
    if (q) questions.push(q);
  }

  return { title: title || 'Untitled Exam', instructions, questions };
};
