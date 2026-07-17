const express = require('express');
const mongoose = require('mongoose');
const { Exam, Result } = require('./models');
const store = require('./store');
const router = express.Router();

// Use MongoDB when connected; otherwise fall back to the JSON file store so the
// app works locally without a database.
const mongoUp = () => !!(mongoose.connection && mongoose.connection.readyState === 1);

// ---- Kimi AI via the Desktop AI Copilot gateway (key stays server-side) ----
const GATEWAY_URL = (process.env.COPILOT_GATEWAY_URL || 'http://localhost:8080').replace(/\/+$/, '');
const KIMI_KEY = process.env.COPILOT_KIMI_KEY || '';
const rid = () => Math.random().toString(16).slice(2, 10);

// Ask Kimi to turn an exam paper into a strictly-formatted questions Markdown that
// the frontend can parse. Plain-chat (no browsing) so the response is captured reliably.
const EXTRACT_PROMPT = (text) => `From this exam paper, extract ALL the questions along with their graphs, formatted so each question can be extracted programmatically. Do NOT use web search, browsing or any agent/tool mode — work only from the text provided below.

Return ONLY a Markdown document in EXACTLY this structure (no commentary before or after):

# <Exam Title>

## Instructions
- <instruction>

## Questions

### Q1
Type: MCQ
Question: <the full question text on one line>
Graph: <describe any figure / graph / diagram / circuit / table / waveform the question refers to; if there is none write exactly: none>
A) <option A>
B) <option B>
C) <option C>
D) <option D>
Answer: <A|B|C|D>

### Q2
Type: INTEGER
Question: <text>
Graph: <description or none>
Answer: <numeric value>

Rules:
- One "### Q<n>" block per question, numbered in order.
- Type: MCQ when options are present; Type: INTEGER for numeric-answer questions (then omit the A)-D) lines).
- If the correct answer is not present in the source, write: Answer: NA
- Extract EVERY question; never summarise or skip any. Keep math and symbols readable as plain text.

Exam text:
"""
${text}
"""`;

// Generate a previous-year-style practice paper (used by the GATE Explorer).
const GENERATE_PROMPT = (topic) => `Generate a realistic previous-year-style practice exam (PYQ set) for: "${topic}". Use your own knowledge — do NOT use web search or browsing.

Return ONLY a Markdown document in EXACTLY this structure (no commentary):

# ${topic}

## Instructions
- <a few standard GATE-style instructions>

## Questions

### Q1
Type: MCQ
Question: <text>
Graph: none
A) <option A>
B) <option B>
C) <option C>
D) <option D>
Answer: <A|B|C|D>

Rules:
- Generate 15 questions, roughly 70% MCQ and 30% INTEGER.
- For INTEGER questions use "Type: INTEGER", omit the A)-D) lines, and give a numeric "Answer:".
- Every MCQ must have exactly one correct Answer letter. Keep questions authentic and solvable. One "### Q<n>" block each.`;

async function callKimi(prompt, convId) {
  if (!GATEWAY_URL || !KIMI_KEY) {
    throw new Error('AI not configured: set COPILOT_GATEWAY_URL and COPILOT_KIMI_KEY in backend/.env.');
  }
  const r = await fetch(`${GATEWAY_URL}/v1/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${KIMI_KEY}` },
    body: JSON.stringify({ model: 'kimi', conversation_id: convId, messages: [{ role: 'user', content: prompt }] }),
  });
  const txt = await r.text();
  if (!r.ok) throw new Error(`gateway ${r.status}: ${txt.slice(0, 300)}`);
  let data = {};
  try { data = JSON.parse(txt); } catch { /* non-JSON */ }
  return data.content || (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || '';
}

// --- Large-paper handling: split into chunks so no single Kimi call is too long
// (the desktop app times a message out at ~180s). Each chunk is extracted
// separately and the question blocks are merged. Splits at question/page
// boundaries so a question is never cut in half.
const CHUNK_MAX = 6500;

function chunkExamText(text, maxLen) {
  if (text.length <= maxLen) return [text];
  const parts = text.split(/(?=\n\s*(?:Q\s*\.?\s*\d+|Question\s+\d+|\d{1,3}[.)]\s)|\n-{2,}\s*Page)/i);
  const chunks = [];
  let cur = '';
  for (const p of parts) {
    if (cur && (cur.length + p.length) > maxLen) { chunks.push(cur); cur = p; }
    else cur += p;
  }
  if (cur.trim()) chunks.push(cur);
  const out = [];
  for (const c of chunks) {
    if (c.length <= maxLen * 1.6) out.push(c);
    else for (let i = 0; i < c.length; i += maxLen) out.push(c.slice(i, i + maxLen));
  }
  return out;
}

// Chunk 1 uses the full EXTRACT_PROMPT (title + instructions + questions);
// later chunks return questions only, which we append.
const EXTRACT_CHUNK_PROMPT = (text, part, total) => `This is part ${part} of ${total} of a longer exam paper. Extract ALL the questions found in THIS part only. Do NOT include a title or instructions — output ONLY the "### Q<n>" blocks below. Do NOT use web search or browsing.

### Q1
Type: MCQ
Question: <the full question text on one line>
Graph: <describe any figure/graph/diagram/circuit/table, else: none>
A) <option A>
B) <option B>
C) <option C>
D) <option D>
Answer: <A|B|C|D>

Use "Type: INTEGER" with a numeric "Answer:" and no A)-D) lines for numeric questions. If the answer is not present, write "Answer: NA". Extract EVERY question in this part; never skip.

Exam text (part ${part} of ${total}):
"""
${text}
"""`;

function mergeExtractResponses(responses) {
  const headerRe = /^#{2,3}\s*(?:Q(?:uestion)?\.?\s*)?\d+\b/im;
  let merged = String(responses[0] || '').replace(/\r/g, '').trim();
  for (let i = 1; i < responses.length; i++) {
    let r = String(responses[i] || '').replace(/\r/g, '');
    r = r.replace(/([^\n])(#{2,3}\s*(?:Q(?:uestion)?\.?\s*)?\d+\b)/gi, '$1\n$2'); // unglue headers
    const idx = r.search(headerRe);
    if (idx >= 0) merged += '\n\n' + r.slice(idx).trim();
  }
  return merged;
}

// Generate a brand-new original set of questions from topics OR a reference paper.
const GENERATE_NEW_PROMPT = ({ topics, referenceText, difficulty, standard, count, format }) => {
  const n = Math.max(1, Math.min(60, parseInt(count, 10) || 15));
  const diff = (difficulty || 'medium').trim();
  const std = (standard || 'standard competitive exam').trim();
  const fmt = format === 'mcq' ? 'all MCQ (exactly 4 options each)'
    : format === 'integer' ? 'all INTEGER (numeric answer, no options)'
    : 'a mix of about 70% MCQ (4 options) and 30% INTEGER (numeric answer)';
  const basis = referenceText
    ? `Base the new questions on the SAME syllabus, topics, and style as the reference question paper below, but every question MUST be original — do NOT repeat, copy, or merely reword any question from it.\n\nReference question paper:\n"""\n${String(referenceText).slice(0, 12000)}\n"""`
    : `Base the questions on these topics: ${topics}.`;
  return `Generate ${n} ORIGINAL exam questions. Use your own knowledge — do NOT use web search or browsing.

Requirements:
- Difficulty level: ${diff}.
- Standard / exam target: ${std}.
- Question format: ${fmt}.
- Every question must be original and solvable, and must include the correct answer.
${basis}

Return ONLY a Markdown document in EXACTLY this structure (no commentary before or after):

# ${std} — ${diff} practice set

## Instructions
- <a few standard instructions>

## Questions

### Q1
Type: MCQ
Question: <text>
Graph: none
A) <option A>
B) <option B>
C) <option C>
D) <option D>
Answer: <A|B|C|D>

Rules:
- Generate EXACTLY ${n} questions, numbered in order, one "### Q<n>" block each.
- Every MCQ has exactly one correct Answer letter.
- INTEGER questions use "Type: INTEGER", omit the A)-D) lines, and give a numeric "Answer:".`;
};

// Admin: PDF text -> questions Markdown. Large papers are split into chunks so no
// single Kimi call exceeds the desktop app's per-message timeout.
router.post('/ai/extract', async (req, res) => {
  try {
    const text = String((req.body && req.body.text) || '').trim();
    if (!text) return res.status(400).json({ error: 'text is required' });
    const capped = text.slice(0, 120000); // overall safety cap
    const chunks = chunkExamText(capped, CHUNK_MAX);

    if (chunks.length === 1) {
      const content = await callKimi(EXTRACT_PROMPT(chunks[0]), 'exam_extract_' + rid());
      return res.json({ content, chunks: 1 });
    }

    const responses = [];
    for (let i = 0; i < chunks.length; i++) {
      const prompt = i === 0 ? EXTRACT_PROMPT(chunks[i]) : EXTRACT_CHUNK_PROMPT(chunks[i], i + 1, chunks.length);
      responses.push(await callKimi(prompt, 'exam_extract_' + rid()));
    }
    res.json({ content: mergeExtractResponses(responses), chunks: chunks.length });
  } catch (err) {
    res.status(502).json({ error: err.message || 'extraction failed' });
  }
});

// Generate a brand-new original question set (from topics OR a reference paper).
router.post('/ai/generate-new', async (req, res) => {
  try {
    const b = req.body || {};
    const topics = String(b.topics || '').trim();
    const referenceText = String(b.referenceText || '').trim();
    if (!topics && !referenceText) return res.status(400).json({ error: 'Provide topics or a reference paper.' });
    const content = await callKimi(GENERATE_NEW_PROMPT({
      topics, referenceText,
      difficulty: b.difficulty, standard: b.standard, count: b.count, format: b.format,
    }), 'exam_gennew_' + rid());
    res.json({ content });
  } catch (err) {
    res.status(502).json({ error: err.message || 'generation failed' });
  }
});

// GATE Explorer: topic -> generated questions Markdown
router.post('/ai/generate', async (req, res) => {
  try {
    const topic = String((req.body && req.body.topic) || '').trim();
    if (!topic) return res.status(400).json({ error: 'topic is required' });
    const content = await callKimi(GENERATE_PROMPT(topic), 'exam_gen_' + rid());
    res.json({ content });
  } catch (err) {
    res.status(502).json({ error: err.message || 'generation failed' });
  }
});

// Save exam result
router.post('/results', async (req, res) => {
  try {
    if (!mongoUp()) return res.status(201).json(store.createResult(req.body));
    const result = new Result(req.body);
    await result.save();
    res.status(201).json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get all results
router.get('/results', async (req, res) => {
  try {
    if (!mongoUp()) return res.json(store.getResults());
    const results = await Result.find();
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// Create exam
router.post('/exams', async (req, res) => {
  try {
    if (!mongoUp()) return res.status(201).json(store.createExam(req.body));
    const exam = new Exam(req.body);
    await exam.save();
    res.status(201).json(exam);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get all exams
router.get('/exams', async (req, res) => {
  try {
    if (!mongoUp()) return res.json(store.getExams());
    const exams = await Exam.find();
    res.json(exams);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single exam
router.get('/exams/:id', async (req, res) => {
  try {
    if (!mongoUp()) {
      const exam = store.getExam(req.params.id);
      return exam ? res.json(exam) : res.status(404).json({ error: 'Not found' });
    }
    const exam = await Exam.findById(req.params.id);
    if (!exam) return res.status(404).json({ error: 'Not found' });
    res.json(exam);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update exam
router.put('/exams/:id', async (req, res) => {
  try {
    if (!mongoUp()) {
      const exam = store.updateExam(req.params.id, req.body);
      return exam ? res.json(exam) : res.status(404).json({ error: 'Not found' });
    }
    const exam = await Exam.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!exam) return res.status(404).json({ error: 'Not found' });
    res.json(exam);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Delete exam
router.delete('/exams/:id', async (req, res) => {
  try {
    if (!mongoUp()) {
      return store.deleteExam(req.params.id) ? res.json({ message: 'Deleted' }) : res.status(404).json({ error: 'Not found' });
    }
    const exam = await Exam.findByIdAndDelete(req.params.id);
    if (!exam) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
