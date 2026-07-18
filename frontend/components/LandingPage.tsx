import React, { useState } from 'react';
import { BookOpen, LayoutDashboard, GraduationCap, Lock, X, FileText, Sparkles, Compass, ArrowRight } from 'lucide-react';

interface LandingPageProps {
  onSelectStudent: () => void;
  onAdminSubmit: (password: string) => boolean; // returns true on success
}

export const LandingPage: React.FC<LandingPageProps> = ({ onSelectStudent, onAdminSubmit }) => {
  const [tilt, setTilt] = useState({ rx: 0, ry: 0 });
  const [showAdmin, setShowAdmin] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    setTilt({ rx: -py * 7, ry: px * 9 });
  };
  const resetTilt = () => setTilt({ rx: 0, ry: 0 });

  const submitAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    const ok = onAdminSubmit(password);
    if (!ok) { setError('Incorrect access key. Please try again.'); setPassword(''); }
  };

  return (
    <div className="landing-bg">
      <div className="orb orb-1" />
      <div className="orb orb-2" />
      <div className="orb orb-3" />
      <div className="landing-grid" />

      {/* Admin login modal */}
      {showAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" onClick={() => { setShowAdmin(false); setPassword(''); setError(''); }} />
          <div className="modal-pop glass relative rounded-2xl p-8 max-w-md w-full overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-brand-500 via-indigo-500 to-cyan-400" />
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                <Lock className="w-6 h-6 text-brand-600" /> Admin Access
              </h2>
              <button onClick={() => { setShowAdmin(false); setPassword(''); setError(''); }} className="text-slate-400 hover:text-slate-700 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-slate-500 mb-6">Restricted area. Enter the access key to manage exams.</p>
            <form onSubmit={submitAdmin}>
              <label className="block text-xs font-bold text-slate-600 mb-2 uppercase tracking-wide">Access Key</label>
              <input
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all font-mono text-lg"
                placeholder="••••••••"
                autoFocus
              />
              {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => { setShowAdmin(false); setPassword(''); setError(''); }} className="px-5 py-2.5 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-colors">Cancel</button>
                <button type="submit" className="px-6 py-2.5 bg-brand-600 text-white font-bold rounded-xl hover:bg-brand-700 transition-colors shadow-lg shadow-brand-500/30">Verify Access</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tilting glass card */}
      <div className="tilt-scene" onMouseMove={handleMove} onMouseLeave={resetTilt}>
        <div
          className="tilt-card glass fade-up d2 relative flex flex-col md:flex-row overflow-hidden"
          style={{ transform: `rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)` }}
        >
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-brand-500 via-indigo-500 to-cyan-400 z-10" />

          {/* Left — branding */}
          <div className="flex-1 p-10 md:p-14 flex flex-col justify-center">
            <div className="logo3d inline-flex w-fit p-4 rounded-2xl bg-gradient-to-br from-brand-500 to-indigo-600 text-white mb-7">
              <BookOpen className="w-8 h-8" />
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight gradient-text leading-tight">SmartExam AI</h1>
            <p className="text-slate-600 text-lg mt-4 max-w-sm">
              Turn any PDF into an interactive exam — and generate fresh papers — powered by  AI.
            </p>
            <div className="flex flex-wrap gap-2 mt-7">
              <span className="chip inline-flex items-center gap-1.5 text-xs font-semibold text-brand-700 bg-brand-50 border border-brand-100 rounded-full px-3 py-1.5"><FileText className="w-3.5 h-3.5" /> PDF → Exam</span>
              <span className="chip chip-2 inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-full px-3 py-1.5"><Sparkles className="w-3.5 h-3.5" />  AI</span>
              <span className="chip chip-3 inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-700 bg-cyan-50 border border-cyan-100 rounded-full px-3 py-1.5"><Compass className="w-3.5 h-3.5" /> Instant PYQs</span>
            </div>
          </div>

          {/* Right — role selection */}
          <div className="flex-1 p-10 md:p-14 bg-slate-50/70 border-t md:border-t-0 md:border-l border-slate-200/70 flex flex-col justify-center">
            <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-5">Select your role to continue</h2>

            <button
              onClick={() => setShowAdmin(true)}
              className="role3d fade-up d3 group flex items-center p-4 mb-4 bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-xl hover:border-brand-400"
            >
              <div className="p-3 rounded-xl mr-4 bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/30">
                <LayoutDashboard className="w-6 h-6" />
              </div>
              <div className="text-left flex-1">
                <p className="font-bold text-slate-800">Admin Portal</p>
                <p className="text-sm text-slate-500">Upload PDFs, generate & manage exams</p>
              </div>
              <ArrowRight className="go-arrow w-5 h-5 text-brand-600" />
            </button>

            <button
              onClick={onSelectStudent}
              className="role3d fade-up d4 group flex items-center p-4 bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-xl hover:border-green-400"
            >
              <div className="p-3 rounded-xl mr-4 bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-lg shadow-green-500/30">
                <GraduationCap className="w-6 h-6" />
              </div>
              <div className="text-left flex-1">
                <p className="font-bold text-slate-800">Student Portal</p>
                <p className="text-sm text-slate-500">Take exams & practice GATE PYQs</p>
              </div>
              <ArrowRight className="go-arrow w-5 h-5 text-green-600" />
            </button>

            <p className="text-xs text-slate-400 mt-6 text-center">Powered by  AI · No question ever leaves your gateway</p>
          </div>
        </div>
      </div>
    </div>
  );
};
