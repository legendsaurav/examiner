import React, { useState, useEffect } from 'react';
import { UserRole, ViewState, Exam, ExamResult, StudentAnswer } from './types';
import { extractTextFromPdf } from './services/pdfService';
import { parseExamWithGemini, generateExamByTopic } from './services/geminiService';
import { saveExam, getExams, deleteExam, saveResult } from './services/storageService';
import { Button } from './components/Button';
import { ExamEditor } from './components/ExamEditor';
import { ExamTaker } from './components/ExamTaker';
import { GateExplorer } from './components/GateExplorer';
import { Upload, BookOpen, User, GraduationCap, LayoutDashboard, FileText, Trash2, PlayCircle, LogOut, CheckCircle, AlertCircle, Lock, Compass, Library } from 'lucide-react';

const App: React.FC = () => {
  const [role, setRole] = useState<UserRole>(UserRole.NONE);
  const [view, setView] = useState<ViewState>(ViewState.HOME);
  const [exams, setExams] = useState<Exam[]>([]);
  
  // Admin State
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('');
  const [currentDraftExam, setCurrentDraftExam] = useState<Exam | null>(null);
  
  // Auth State
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  
  // Student State
  const [activeExam, setActiveExam] = useState<Exam | null>(null);
  const [lastResult, setLastResult] = useState<ExamResult | null>(null);

  useEffect(() => {
    refreshExams();
  }, []);

  const refreshExams = () => {
    setExams(getExams().sort((a, b) => b.createdAt - a.createdAt));
  };

  // --- Handlers ---

  const handleAdminAccessRequest = () => {
    setShowAdminLogin(true);
  };

  const handleAdminLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === 'admin123') {
        setRole(UserRole.ADMIN);
        setView(ViewState.ADMIN_DASHBOARD);
        setShowAdminLogin(false);
        setPasswordInput('');
    } else {
        alert("Incorrect Access Key. Please try again.");
        setPasswordInput('');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsProcessing(true);
    setProcessingStatus(`Processing ${files.length} file(s)...`);
    
    try {
      let combinedText = '';
      
      // 1. Extract Text from ALL files
      for (let i = 0; i < files.length; i++) {
        setProcessingStatus(`Extracting text from ${files[i].name} (${i + 1}/${files.length})...`);
        const text = await extractTextFromPdf(files[i]);
        combinedText += `\n\n--- FILE START: ${files[i].name} ---\n${text}\n--- FILE END ---\n`;
      }
      
      // 2. Send to Gemini
      setProcessingStatus('Analyzing combined content with Gemini AI...');
      const parsedData = await parseExamWithGemini(combinedText);
      
      // 3. Create Draft
      const draftExam: Exam = {
        id: `exam-${Date.now()}`,
        createdAt: Date.now(),
        title: parsedData.title || (files.length === 1 ? files[0].name.replace('.pdf', '') : 'Combined Exam Bank'),
        instructions: parsedData.instructions || [],
        questions: parsedData.questions || [],
        maxQuestionsToAttempt: undefined // Default to all questions
      };

      setCurrentDraftExam(draftExam);
      setView(ViewState.EXAM_EDITOR);
    } catch (error) {
      alert((error as Error).message);
    } finally {
      setIsProcessing(false);
      setProcessingStatus('');
      e.target.value = '';
    }
  };

  const handleGateTopicSelection = async (topic: string) => {
    setIsProcessing(true);
    setProcessingStatus(`Retrieving ${topic}...`);
    
    try {
        const generatedData = await generateExamByTopic(topic);
        
        const gateExam: Exam = {
            id: `gate-${Date.now()}`,
            createdAt: Date.now(),
            title: generatedData.title || topic,
            instructions: generatedData.instructions || [],
            questions: generatedData.questions || []
        };
        
        setActiveExam(gateExam);
        setView(ViewState.EXAM_TAKER);
    } catch (error) {
        alert("Failed to load GATE content: " + (error as Error).message);
    } finally {
        setIsProcessing(false);
        setProcessingStatus('');
    }
  };

  const saveDraftExam = (updatedExam: Exam) => {
    saveExam(updatedExam);
    refreshExams();
    setCurrentDraftExam(null);
    setView(ViewState.ADMIN_DASHBOARD);
  };

  const handleDeleteExam = (id: string) => {
    if (confirm('Are you sure you want to delete this exam?')) {
      deleteExam(id);
      refreshExams();
    }
  };

  const startExam = (exam: Exam) => {
    // 1. Clone the questions array to avoid mutating the original exam object
    const questionsCopy = [...exam.questions];

    // 2. Shuffle Questions (Fisher-Yates Shuffle)
    for (let i = questionsCopy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [questionsCopy[i], questionsCopy[j]] = [questionsCopy[j], questionsCopy[i]];
    }

    // 3. Apply Limit if set by Admin
    let finalQuestions = questionsCopy;
    if (exam.maxQuestionsToAttempt && exam.maxQuestionsToAttempt > 0 && exam.maxQuestionsToAttempt < questionsCopy.length) {
        finalQuestions = questionsCopy.slice(0, exam.maxQuestionsToAttempt);
    }

    // 4. Create a temporary exam session object
    const sessionExam: Exam = {
        ...exam,
        questions: finalQuestions
    };

    setActiveExam(sessionExam);
    setView(ViewState.EXAM_TAKER);
  };

  const finishExam = (answers: StudentAnswer[]) => {
    if (!activeExam) return;
    
    let score = 0;
    activeExam.questions.forEach(q => {
      const studentAns = answers.find(a => a.questionId === q.id);
      if (studentAns) {
        if (q.type === 'MCQ') {
            const selectedOpt = q.options.find(o => o.id === studentAns.selectedOptionId);
            if (selectedOpt && selectedOpt.isCorrect) {
              score++;
            }
        } else if (q.type === 'INTEGER') {
            // Check numeric answer
            if (studentAns.numericInput && q.correctAnswer) {
                // Simple string comparison for now, could be improved with float parsing tolerance
                if (parseFloat(studentAns.numericInput) === parseFloat(q.correctAnswer)) {
                    score++;
                }
            }
        }
      }
    });

    const result: ExamResult = {
      examId: activeExam.id,
      score,
      totalQuestions: activeExam.questions.length,
      answers,
      timestamp: Date.now()
    };

    saveResult(result);
    setLastResult(result);
    setView(ViewState.EXAM_RESULT);
  };

  const logout = () => {
    setRole(UserRole.NONE);
    setView(ViewState.HOME);
    setActiveExam(null);
    setCurrentDraftExam(null);
  };

  // --- Renders ---

  // Loading Overlay
  const LoadingOverlay = () => (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex flex-col items-center justify-center text-white">
        <svg className="animate-spin h-12 w-12 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p className="text-xl font-bold">{processingStatus}</p>
        <p className="text-sm opacity-80 mt-2">Generating authentic question set...</p>
    </div>
  );

  if (view === ViewState.HOME) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-200 flex items-center justify-center p-4">
        {/* Admin Login Modal */}
        {showAdminLogin && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 to-indigo-600"></div>
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                            <Lock className="w-6 h-6 text-brand-600" /> Admin Access
                        </h2>
                        <button onClick={() => setShowAdminLogin(false)} className="text-slate-400 hover:text-slate-600">
                            <Trash2 className="w-5 h-5 rotate-45" /> 
                        </button>
                    </div>
                    
                    <p className="text-slate-600 mb-6">This area is restricted to administrators. Please enter the access key to proceed.</p>
                    
                    <form onSubmit={handleAdminLoginSubmit}>
                        <div className="mb-6">
                            <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wide">Access Key</label>
                            <input 
                                type="password" 
                                value={passwordInput}
                                onChange={(e) => setPasswordInput(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all font-mono text-lg"
                                placeholder="••••••••"
                                autoFocus
                            />
                        </div>
                        <div className="flex justify-end gap-3">
                            <button 
                                type="button"
                                onClick={() => { setShowAdminLogin(false); setPasswordInput(''); }}
                                className="px-5 py-2.5 text-slate-600 font-bold hover:bg-slate-100 rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                            <button 
                                type="submit"
                                className="px-6 py-2.5 bg-brand-600 text-white font-bold rounded-lg hover:bg-brand-700 transition-colors shadow-lg shadow-brand-200"
                            >
                                Verify Access
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        )}

        <div className="max-w-4xl w-full bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row">
          <div className="flex-1 p-12 flex flex-col justify-center items-start space-y-6">
            <div className="inline-block p-3 bg-brand-100 rounded-lg">
                <BookOpen className="w-8 h-8 text-brand-600" />
            </div>
            <h1 className="text-4xl font-bold text-slate-900 tracking-tight">SmartExam AI</h1>
            <p className="text-lg text-slate-600">
              Transform PDF documents into interactive online exams instantly using Gemini AI.
            </p>
          </div>
          <div className="flex-1 bg-slate-50 p-12 flex flex-col justify-center gap-6 border-l border-slate-100">
            <h2 className="text-xl font-semibold text-slate-800 mb-4">Select your role to continue</h2>
            
            <button 
              onClick={handleAdminAccessRequest}
              className="group flex items-center p-4 bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md hover:border-brand-500 transition-all"
            >
              <div className="p-3 bg-blue-100 rounded-full mr-4 group-hover:bg-blue-200 transition-colors">
                <LayoutDashboard className="w-6 h-6 text-blue-700" />
              </div>
              <div className="text-left">
                <p className="font-bold text-slate-800">Admin Portal</p>
                <p className="text-sm text-slate-500">Upload PDFs & Manage Exams</p>
              </div>
            </button>

            <button 
               onClick={() => { setRole(UserRole.STUDENT); setView(ViewState.STUDENT_DASHBOARD); }}
               className="group flex items-center p-4 bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md hover:border-green-500 transition-all"
            >
              <div className="p-3 bg-green-100 rounded-full mr-4 group-hover:bg-green-200 transition-colors">
                <GraduationCap className="w-6 h-6 text-green-700" />
              </div>
              <div className="text-left">
                <p className="font-bold text-slate-800">Student Portal</p>
                <p className="text-sm text-slate-500">Take Assigned Exams</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  const Header = () => (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setView(role === UserRole.ADMIN ? ViewState.ADMIN_DASHBOARD : ViewState.STUDENT_DASHBOARD)}>
            <BookOpen className="w-6 h-6 text-brand-600" />
            <span className="font-bold text-xl text-slate-900">SmartExam AI</span>
            <span className="ml-2 text-xs font-medium px-2 py-1 bg-slate-100 rounded-full text-slate-600">{role}</span>
        </div>
        <Button variant="ghost" onClick={logout} className="text-sm">
            <LogOut className="w-4 h-4 mr-2" /> Logout
        </Button>
      </div>
    </header>
  );

  // --- Admin Dashboard ---
  if (view === ViewState.ADMIN_DASHBOARD) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Header />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          
          <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Exam Management</h1>
                <p className="text-slate-500">Upload new exams or manage existing ones.</p>
            </div>
            
            <div className="relative">
                <input 
                    type="file" 
                    id="pdf-upload" 
                    accept="application/pdf"
                    className="hidden"
                    multiple // Allow multiple files
                    onChange={handleFileUpload}
                    disabled={isProcessing}
                />
                <label 
                    htmlFor="pdf-upload" 
                    className={`flex items-center cursor-pointer px-4 py-2 bg-brand-600 text-white rounded-md shadow-sm hover:bg-brand-700 transition-colors ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                    {isProcessing ? (
                        <div className="flex items-center">
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            {processingStatus}
                        </div>
                    ) : (
                        <>
                            <Upload className="w-4 h-4 mr-2" /> Upload Exam PDFs (Multiple)
                        </>
                    )}
                </label>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {exams.length === 0 ? (
                <div className="col-span-full text-center py-20 bg-white rounded-lg border border-dashed border-slate-300">
                    <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500 font-medium">No exams created yet.</p>
                    <p className="text-sm text-slate-400">Upload PDFs to create a question bank.</p>
                </div>
            ) : (
                exams.map(exam => (
                    <div key={exam.id} className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow p-6 flex flex-col">
                        <div className="flex-1">
                            <div className="flex justify-between items-start mb-2">
                                <h3 className="text-lg font-semibold text-slate-900 line-clamp-2">{exam.title}</h3>
                            </div>
                            <p className="text-sm text-slate-500 mb-4">
                                Created {new Date(exam.createdAt).toLocaleDateString()}
                            </p>
                            <div className="flex items-center gap-4 text-sm text-slate-600 mb-2">
                                <span className="flex items-center font-medium"><FileText className="w-4 h-4 mr-1"/> {exam.questions.length} Total Questions</span>
                            </div>
                             {exam.maxQuestionsToAttempt && (
                                <div className="inline-block px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-md font-medium">
                                    Student sees {exam.maxQuestionsToAttempt} random questions
                                </div>
                            )}
                        </div>
                        <div className="mt-6 pt-4 border-t border-slate-100 flex justify-between">
                            <button 
                                onClick={() => { setCurrentDraftExam(exam); setView(ViewState.EXAM_EDITOR); }}
                                className="text-sm font-medium text-brand-600 hover:text-brand-800"
                            >
                                Edit / Review
                            </button>
                            <button 
                                onClick={() => handleDeleteExam(exam.id)}
                                className="text-slate-400 hover:text-red-600 transition-colors"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                ))
            )}
          </div>
        </main>
      </div>
    );
  }

  // --- Editor View ---
  if (view === ViewState.EXAM_EDITOR && currentDraftExam) {
    return (
      <div className="min-h-screen bg-slate-50 pb-20">
         <Header />
         <div className="py-8">
            <ExamEditor 
                exam={currentDraftExam}
                onSave={saveDraftExam}
                onCancel={() => setView(ViewState.ADMIN_DASHBOARD)}
            />
         </div>
      </div>
    );
  }

  // --- GATE Explorer ---
  if (view === ViewState.GATE_EXPLORER) {
    return (
        <div className="min-h-screen bg-slate-50">
            {isProcessing && <LoadingOverlay />}
            <Header />
            <GateExplorer 
                onSelectTopic={handleGateTopicSelection}
                onBack={() => setView(ViewState.STUDENT_DASHBOARD)}
            />
        </div>
    );
  }

  // --- Student Dashboard ---
  if (view === ViewState.STUDENT_DASHBOARD) {
    return (
        <div className="min-h-screen bg-slate-50">
          <Header />
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            
            {/* GATE Promo Banner */}
            <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-8 mb-10 text-white shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div>
                        <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
                             <Library className="w-6 h-6 text-brand-400" /> 
                             Career Booster GATE Repository
                        </h2>
                        <p className="text-slate-300 max-w-xl">
                            Direct access to Previous Year Questions (PYQs) for all major engineering branches. 
                            Practice with authentic Aerospace, Physics, and CS papers instantly.
                        </p>
                    </div>
                    <Button 
                        onClick={() => setView(ViewState.GATE_EXPLORER)}
                        className="bg-brand-500 hover:bg-brand-600 text-white border-none shadow-lg shadow-brand-500/30 px-6 py-3 h-auto text-base"
                    >
                        <Compass className="w-5 h-5 mr-2" /> Explore GATE Papers
                    </Button>
                </div>
            </div>

            <div className="mb-8">
                <h1 className="text-2xl font-bold text-slate-900">Assigned Exams</h1>
                <p className="text-slate-500">Exams created by your administrator.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {exams.map(exam => (
                    <div key={exam.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-all">
                        <div className="h-2 bg-brand-500"></div>
                        <div className="p-6">
                            <h3 className="text-lg font-bold text-slate-900 mb-2">{exam.title}</h3>
                            <div className="flex flex-col gap-1 mb-6">
                                <div className="flex items-center text-sm text-slate-500">
                                    <FileText className="w-4 h-4 mr-1" />
                                    {exam.questions.length} Total Questions
                                </div>
                                {exam.maxQuestionsToAttempt && (
                                    <div className="text-xs text-brand-600 font-medium">
                                        * You will attempt {exam.maxQuestionsToAttempt} random questions
                                    </div>
                                )}
                            </div>
                            <Button className="w-full" onClick={() => startExam(exam)}>
                                <PlayCircle className="w-4 h-4 mr-2" /> Take Exam
                            </Button>
                        </div>
                    </div>
                ))}
                 {exams.length === 0 && (
                     <div className="col-span-full text-center py-10 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
                        <p className="text-slate-500 mb-2">No assigned exams available.</p>
                        <p className="text-sm text-brand-600 font-medium cursor-pointer hover:underline" onClick={() => setView(ViewState.GATE_EXPLORER)}>Try a GATE Practice Exam instead</p>
                     </div>
                 )}
            </div>
          </main>
        </div>
    );
  }

  // --- Exam Taker ---
  if (view === ViewState.EXAM_TAKER && activeExam) {
    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            <Header />
            <ExamTaker 
                exam={activeExam}
                onComplete={finishExam}
                onExit={() => setView(ViewState.STUDENT_DASHBOARD)}
            />
        </div>
    );
  }

  // --- Results View ---
  if (view === ViewState.EXAM_RESULT && lastResult && activeExam) {
    const percentage = Math.round((lastResult.score / lastResult.totalQuestions) * 100);
    const passed = percentage >= 60; // Arbitrary pass mark

    return (
        <div className="min-h-screen bg-slate-50">
            <Header />
            <main className="max-w-3xl mx-auto px-4 py-12">
                <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                    <div className={`p-8 text-center ${passed ? 'bg-green-600' : 'bg-red-600'} text-white`}>
                        <div className="inline-flex items-center justify-center p-4 bg-white/20 rounded-full mb-4">
                            {passed ? <CheckCircle className="w-12 h-12" /> : <AlertCircle className="w-12 h-12" />}
                        </div>
                        <h2 className="text-3xl font-bold mb-2">{passed ? 'Excellent Job!' : 'Keep Practicing'}</h2>
                        <p className="opacity-90">You have completed {activeExam.title}</p>
                    </div>
                    
                    <div className="p-8">
                        <div className="flex justify-center items-end gap-2 mb-8">
                            <span className="text-6xl font-bold text-slate-900">{percentage}%</span>
                            <span className="text-xl text-slate-500 mb-2">Score</span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 mb-8">
                            <div className="p-4 bg-slate-50 rounded-lg text-center">
                                <p className="text-sm text-slate-500">Correct Answers</p>
                                <p className="text-2xl font-bold text-green-600">{lastResult.score}</p>
                            </div>
                            <div className="p-4 bg-slate-50 rounded-lg text-center">
                                <p className="text-sm text-slate-500">Total Questions</p>
                                <p className="text-2xl font-bold text-slate-800">{lastResult.totalQuestions}</p>
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <Button onClick={() => setView(ViewState.STUDENT_DASHBOARD)} variant="secondary" className="w-full">
                                Back to Dashboard
                            </Button>
                            <Button onClick={() => startExam(activeExam)} className="w-full">
                                Retake Exam
                            </Button>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
  }

  return <div>Loading...</div>;
};

export default App;