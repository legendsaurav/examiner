import React, { useState } from 'react';
import { Exam } from '../types';
import { Button } from './Button';
import { extractTextFromPdf } from '../services/pdfService';
import { generateNewExam } from '../services/kimiService';
import { Sparkles, FileText, ListTree, X, Upload, Loader2 } from 'lucide-react';

interface GenerateModalProps {
  onClose: () => void;
  onGenerated: (exam: Exam) => void;
}

type Mode = 'topics' | 'reference';

export const GenerateModal: React.FC<GenerateModalProps> = ({ onClose, onGenerated }) => {
  const [mode, setMode] = useState<Mode>('topics');
  const [topics, setTopics] = useState('');
  const [refText, setRefText] = useState('');
  const [refName, setRefName] = useState('');
  const [extracting, setExtracting] = useState(false);

  const [difficulty, setDifficulty] = useState('medium');
  const [standard, setStandard] = useState('');
  const [count, setCount] = useState(15);
  const [format, setFormat] = useState('mixed');

  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  const handleRefUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setExtracting(true);
    setRefName(file.name);
    try {
      const text = await extractTextFromPdf(file);
      setRefText(text);
    } catch (err) {
      setError((err as Error).message);
      setRefText('');
      setRefName('');
    } finally {
      setExtracting(false);
      e.target.value = '';
    }
  };

  const canGenerate = mode === 'topics' ? topics.trim().length > 0 : refText.trim().length > 0;

  const handleGenerate = async () => {
    setError('');
    setBusy(true);
    setStatus('Generating original questions with Ai… this can take a minute or two.');
    try {
      const parsed = await generateNewExam({
        topics: mode === 'topics' ? topics.trim() : undefined,
        referenceText: mode === 'reference' ? refText : undefined,
        difficulty,
        standard: standard.trim(),
        count,
        format,
      });
      const title = parsed.title
        || (mode === 'topics'
          ? `${standard.trim() || 'Practice'} — ${topics.split(/[,\n]/)[0].trim()}`
          : `New paper from ${refName || 'reference'}`);
      const exam: Exam = {
        id: `gen-${Date.now()}`,
        createdAt: Date.now(),
        title,
        instructions: parsed.instructions || [],
        questions: parsed.questions || [],
      };
      onGenerated(exam);
    } catch (err) {
      setError((err as Error).message || 'Generation failed.');
    } finally {
      setBusy(false);
      setStatus('');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl relative overflow-hidden max-h-[92vh] flex flex-col">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-brand-500 to-indigo-600" />
        <div className="flex justify-between items-center p-6 pb-4 border-b border-slate-100">
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-brand-600" /> Generate New Paper
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-6 overflow-y-auto space-y-5">
          {/* Mode toggle */}
          <div className="flex bg-slate-100 rounded-lg p-1">
            <button
              onClick={() => setMode('topics')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-bold rounded-md transition-colors ${mode === 'topics' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <ListTree className="w-4 h-4" /> From topics
            </button>
            <button
              onClick={() => setMode('reference')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-bold rounded-md transition-colors ${mode === 'reference' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <FileText className="w-4 h-4" /> From a reference paper
            </button>
          </div>

          {mode === 'topics' ? (
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Topics</label>
              <textarea
                value={topics}
                onChange={(e) => setTopics(e.target.value)}
                rows={3}
                placeholder="e.g. Network theorems, Laplace transform, BJT amplifiers"
                className="w-full p-3 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-brand-500"
              />
              <p className="text-xs text-slate-500 mt-1">Separate multiple topics with commas or new lines.</p>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Reference question paper (PDF)</label>
              <input type="file" id="ref-pdf" accept="application/pdf" className="hidden" onChange={handleRefUpload} />
              <label htmlFor="ref-pdf" className="flex items-center gap-2 cursor-pointer px-4 py-3 border-2 border-dashed border-slate-300 rounded-lg text-slate-600 hover:border-brand-400 hover:text-brand-600">
                {extracting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {extracting ? 'Reading PDF…' : (refName || 'Choose a PDF to base new questions on')}
              </label>
              {refText && !extracting && (
                <p className="text-xs text-green-600 mt-1">Loaded “{refName}”. New questions won’t repeat any from it.</p>
              )}
            </div>
          )}

          {/* Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Difficulty</label>
              <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-brand-500">
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
                <option value="expert">Expert</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Standard / Exam</label>
              <input
                value={standard}
                onChange={(e) => setStandard(e.target.value)}
                placeholder="e.g. GATE EC, JEE Advanced, Class 12"
                className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Number of questions</label>
              <input
                type="number" min={1} max={60}
                value={count}
                onChange={(e) => setCount(Math.max(1, Math.min(60, parseInt(e.target.value) || 1)))}
                className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-brand-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Format</label>
              <select value={format} onChange={(e) => setFormat(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-brand-500">
                <option value="mixed">Mixed (MCQ + Integer)</option>
                <option value="mcq">MCQ only</option>
                <option value="integer">Integer only</option>
              </select>
            </div>
          </div>

          {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">{error}</div>}
          {busy && status && <div className="text-sm text-brand-700 bg-brand-50 border border-brand-200 rounded-lg p-3 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />{status}</div>}
        </div>

        <div className="p-6 pt-4 border-t border-slate-100 flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button onClick={handleGenerate} disabled={!canGenerate || busy || extracting}>
            {busy ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating…</> : <><Sparkles className="w-4 h-4 mr-2" /> Generate</>}
          </Button>
        </div>
      </div>
    </div>
  );
};
