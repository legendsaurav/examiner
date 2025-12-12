import React, { useState, useEffect, useRef } from 'react';
import { Exam, StudentAnswer, QuestionStatus } from '../types';
import { User, ChevronLeft, ChevronRight, Info } from 'lucide-react';

interface ExamTakerProps {
  exam: Exam;
  onComplete: (answers: StudentAnswer[]) => void;
  onExit: () => void;
}

export const ExamTaker: React.FC<ExamTakerProps> = ({ exam, onComplete, onExit }) => {
  // State
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({}); // questionId -> optionId
  const [questionStatus, setQuestionStatus] = useState<Record<string, QuestionStatus>>({});
  const [hasStarted, setHasStarted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(180 * 60); // 3 hours in seconds
  const [agreedToInstructions, setAgreedToInstructions] = useState(false);

  // Initialize status on mount
  useEffect(() => {
    const initialStatus: Record<string, QuestionStatus> = {};
    exam.questions.forEach(q => {
      initialStatus[q.id] = 'not_visited';
    });
    setQuestionStatus(initialStatus);
  }, [exam]);

  // Timer logic
  useEffect(() => {
    if (!hasStarted) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 0) {
          clearInterval(timer);
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [hasStarted]);

  // Update status to 'not_answered' when visiting a 'not_visited' question
  useEffect(() => {
    if (!hasStarted) return;
    const qId = exam.questions[currentQuestionIndex]?.id;
    if (qId && questionStatus[qId] === 'not_visited') {
      setQuestionStatus(prev => ({ ...prev, [qId]: 'not_answered' }));
    }
  }, [currentQuestionIndex, hasStarted, questionStatus, exam.questions]);

  // Format time HH:MM:SS
  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // -- Handlers --

  const handleOptionSelect = (optionId: string) => {
    const qId = exam.questions[currentQuestionIndex].id;
    setAnswers(prev => ({ ...prev, [qId]: optionId }));
  };

  const handleSaveAndNext = () => {
    const qId = exam.questions[currentQuestionIndex].id;
    if (answers[qId]) {
      setQuestionStatus(prev => ({ ...prev, [qId]: 'answered' }));
    } else {
      setQuestionStatus(prev => ({ ...prev, [qId]: 'not_answered' }));
    }
    if (currentQuestionIndex < exam.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const handleClearResponse = () => {
    const qId = exam.questions[currentQuestionIndex].id;
    const newAnswers = { ...answers };
    delete newAnswers[qId];
    setAnswers(newAnswers);
    setQuestionStatus(prev => ({ ...prev, [qId]: 'not_answered' }));
  };

  const handleSaveAndMarkForReview = () => {
    const qId = exam.questions[currentQuestionIndex].id;
    if (answers[qId]) {
      setQuestionStatus(prev => ({ ...prev, [qId]: 'answered_marked_for_review' }));
    } else {
      alert("Please select an option to Save & Mark for Review");
      return;
    }
    if (currentQuestionIndex < exam.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const handleMarkForReviewAndNext = () => {
    const qId = exam.questions[currentQuestionIndex].id;
    // If answered, keep answer but mark as review? Usually just marks as review without implying saved answer status unless specifically "Answered & Marked".
    // NTA logic: "Marked for Review" usually means no answer or answer ignored.
    // If answer exists, it becomes 'answered_marked_for_review'. If not, 'marked_for_review'.
    if (answers[qId]) {
       setQuestionStatus(prev => ({ ...prev, [qId]: 'answered_marked_for_review' }));
    } else {
       setQuestionStatus(prev => ({ ...prev, [qId]: 'marked_for_review' }));
    }
    
    if (currentQuestionIndex < exam.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const handleNavigation = (direction: 'next' | 'prev') => {
    if (direction === 'next' && currentQuestionIndex < exam.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else if (direction === 'prev' && currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const handleSubmit = () => {
    const answerArray: StudentAnswer[] = Object.entries(answers).map(([qId, oId]) => ({
      questionId: qId,
      selectedOptionId: oId as string
    }));
    onComplete(answerArray);
  };

  // --- Views ---

  if (!hasStarted) {
    return (
      <div className="fixed inset-0 z-50 bg-white overflow-y-auto">
        {/* NTA Header Mock */}
        <div className="bg-white border-b border-slate-300 p-2 flex justify-between items-center h-16 shadow-sm">
           <div className="text-xl font-bold text-slate-800 ml-4">Instructions</div>
           <div className="mr-4 flex items-center">
             <img src={`https://ui-avatars.com/api/?name=Candidate&background=random`} className="w-10 h-10 rounded mr-2" alt="Candidate" />
           </div>
        </div>

        <div className="max-w-5xl mx-auto p-6">
          <h1 className="text-center text-2xl font-bold text-slate-900 mb-6 underline">Please read the instructions carefully</h1>
          
          <div className="space-y-4 text-slate-800 text-sm leading-relaxed border p-6 rounded shadow-sm bg-white">
            <h3 className="font-bold text-lg underline">General Instructions:</h3>
            <ol className="list-decimal list-inside space-y-2">
              <li>Total duration of examination is 180 minutes.</li>
              <li>The clock will be set at the server. The countdown timer in the top right corner of screen will display the remaining time available for you to complete the examination. When the timer reaches zero, the examination will end by itself. You will not be required to end or submit your examination.</li>
              <li>The Question Palette displayed on the right side of screen will show the status of each question using one of the following symbols:</li>
            </ol>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-6 pl-4">
               <div className="flex items-center gap-3"><div className="w-8 h-8 bg-slate-200 border border-slate-300 rounded text-xs flex items-center justify-center">1</div> <span className="text-slate-600">You have not visited the question yet.</span></div>
               <div className="flex items-center gap-3"><div className="w-8 h-8 bg-orange-500 text-white rounded text-xs flex items-center justify-center clip-path-polygon">2</div> <span className="text-slate-600">You have not answered the question.</span></div>
               <div className="flex items-center gap-3"><div className="w-8 h-8 bg-green-500 text-white rounded text-xs flex items-center justify-center">3</div> <span className="text-slate-600">You have answered the question.</span></div>
               <div className="flex items-center gap-3"><div className="w-8 h-8 bg-purple-700 text-white rounded-full text-xs flex items-center justify-center">4</div> <span className="text-slate-600">You have NOT answered the question, but have marked the question for review.</span></div>
               <div className="flex items-center gap-3"><div className="w-8 h-8 bg-purple-700 text-white rounded-full text-xs flex items-center justify-center relative"><div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border border-white"></div>5</div> <span className="text-slate-600">The question(s) "Answered and Marked for Review" will be considered for evaluation.</span></div>
            </div>

            <p>You can click on the "&gt;" arrow which appears to the left of question palette to collapse the question palette thereby maximizing the question window.</p>
            <h3 className="font-bold text-lg underline mt-4">Navigating to a Question:</h3>
            <p>To answer a question, do the following:</p>
            <ul className="list-disc list-inside pl-4">
                <li>Click on the question number in the Question Palette at the right of your screen to go to that numbered question directly.</li>
                <li>Click on <strong>Save & Next</strong> to save your answer for the current question and then go to the next question.</li>
                <li>Click on <strong>Mark for Review & Next</strong> to save your answer for the current question, mark it for review, and then go to the next question.</li>
            </ul>
          </div>

          <div className="mt-8 border-t pt-6">
             <div className="flex items-start gap-3 mb-6">
                <input 
                  type="checkbox" 
                  id="agree" 
                  checked={agreedToInstructions}
                  onChange={(e) => setAgreedToInstructions(e.target.checked)}
                  className="mt-1 w-5 h-5 text-brand-600 border-slate-300 rounded focus:ring-brand-500"
                />
                <label htmlFor="agree" className="text-sm text-slate-700">
                  I have read and understood the instructions. All computer hardware allotted to me are in proper working condition. I declare that I am not in possession of / not wearing / not carrying any prohibited gadget like mobile phone, bluetooth devices etc. /any prohibited material with me into the Examination Hall. I agree that in case of not adhering to the instructions, I shall be liable to be debarred from this Test and/or to disciplinary action, which may include ban from future Tests / Examinations
                </label>
             </div>
             
             <button 
               onClick={() => agreedToInstructions && setHasStarted(true)}
               disabled={!agreedToInstructions}
               className={`w-full md:w-auto px-12 py-3 font-bold text-white uppercase tracking-wider rounded shadow-md transition-colors ${agreedToInstructions ? 'bg-brand-500 hover:bg-brand-600' : 'bg-slate-300 cursor-not-allowed'}`}
             >
               Proceed
             </button>
             <button onClick={onExit} className="block mt-4 text-sm text-slate-500 hover:text-slate-700 underline mx-auto">Cancel and Exit</button>
          </div>
        </div>
      </div>
    );
  }

  // --- Main Exam Interface ---

  const currentQuestion = exam.questions[currentQuestionIndex];
  
  // Helper to get status color class
  const getStatusColor = (status: QuestionStatus) => {
    switch (status) {
      case 'answered': return 'bg-green-500 text-white';
      case 'not_answered': return 'bg-orange-600 text-white'; // NTA uses a reddish orange
      case 'marked_for_review': return 'bg-purple-700 text-white rounded-full';
      case 'answered_marked_for_review': return 'bg-purple-700 text-white rounded-full relative after:content-[""] after:absolute after:bottom-0 after:right-0 after:w-2 after:h-2 after:bg-green-400 after:rounded-full after:border after:border-white';
      case 'not_visited': default: return 'bg-slate-100 text-slate-800 border border-slate-300';
    }
  };

  const getStatusCounts = () => {
    const counts = { not_visited: 0, not_answered: 0, answered: 0, marked_for_review: 0, answered_marked_for_review: 0 };
    Object.values(questionStatus).forEach((s) => {
      counts[s as QuestionStatus]++;
    });
    return counts;
  };
  const counts = getStatusCounts();

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col font-sans">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-300 flex justify-between items-center px-4 shadow-sm shrink-0">
            <div className="font-bold text-xl text-slate-800">SmartExam Assessment</div>
            <div className="flex items-center gap-6">
                <div className="flex flex-col items-end">
                    <span className="text-xs text-slate-500 uppercase font-semibold">Remaining Time</span>
                    <span className="text-xl font-bold bg-black text-white px-3 py-1 rounded font-mono tracking-widest">{formatTime(timeLeft)}</span>
                </div>
                <div className="flex items-center gap-2 bg-slate-50 px-3 py-1 rounded border border-slate-200">
                    <div className="w-8 h-8 bg-slate-300 rounded-full flex items-center justify-center text-slate-600">
                        <User className="w-5 h-5" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-800 leading-none">Candidate Name</span>
                        <span className="text-xs text-slate-500">Subject: {exam.title.substring(0, 15)}...</span>
                    </div>
                </div>
            </div>
        </header>

        {/* Main Layout */}
        <div className="flex flex-1 overflow-hidden">
            {/* Left: Question Area */}
            <div className="flex-1 flex flex-col h-full overflow-hidden">
                {/* Question Header */}
                <div className="bg-white border-b border-slate-200 p-3 flex justify-between items-center shrink-0">
                    <h2 className="text-lg font-bold text-slate-800">Question {currentQuestionIndex + 1}:</h2>
                    <div className="flex gap-1">
                        <button className="p-1 hover:bg-slate-100 rounded text-brand-600"><div className="w-6 h-6 border-2 border-brand-600 rounded-full flex items-center justify-center">↓</div></button>
                    </div>
                </div>

                {/* Question Content */}
                <div className="flex-1 overflow-y-auto p-6 bg-white">
                    <div className="max-w-4xl">
                        <div className="text-lg text-slate-900 leading-relaxed font-medium mb-8 border-b pb-8 whitespace-pre-wrap">
                            {currentQuestion.text}
                        </div>
                        
                        <div className="space-y-4">
                            {currentQuestion.options.map((option, idx) => (
                                <label 
                                    key={option.id} 
                                    className="flex items-start gap-4 p-3 rounded hover:bg-slate-50 cursor-pointer group transition-colors"
                                >
                                    <div className="relative flex items-center justify-center shrink-0 mt-0.5">
                                        <input 
                                            type="radio" 
                                            name={`question-${currentQuestion.id}`}
                                            checked={answers[currentQuestion.id] === option.id}
                                            onChange={() => handleOptionSelect(option.id)}
                                            className="peer sr-only"
                                        />
                                        <div className="w-5 h-5 rounded-full border-2 border-slate-400 peer-checked:border-brand-600 peer-checked:bg-white transition-all"></div>
                                        <div className="w-2.5 h-2.5 rounded-full bg-brand-600 absolute opacity-0 peer-checked:opacity-100 transition-all"></div>
                                    </div>
                                    <span className="text-slate-700 font-medium peer-checked:text-slate-900">{idx + 1}) {option.text}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer Action Buttons */}
                <div className="bg-white border-t border-slate-200 p-3 shrink-0">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex gap-2">
                            <button 
                                onClick={handleSaveAndNext}
                                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm font-bold shadow-sm uppercase border border-green-700 transition-colors"
                            >
                                Save & Next
                            </button>
                            <button 
                                onClick={handleClearResponse}
                                className="bg-white hover:bg-slate-50 text-slate-700 px-4 py-2 rounded text-sm font-bold shadow-sm border border-slate-300 uppercase transition-colors"
                            >
                                Clear
                            </button>
                            <button 
                                onClick={handleSaveAndMarkForReview}
                                className="bg-orange-400 hover:bg-orange-500 text-white px-4 py-2 rounded text-sm font-bold shadow-sm border border-orange-500 uppercase transition-colors"
                            >
                                Save & Mark for Review
                            </button>
                            <button 
                                onClick={handleMarkForReviewAndNext}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm font-bold shadow-sm border border-blue-700 uppercase transition-colors"
                            >
                                Mark for Review & Next
                            </button>
                        </div>

                        <div className="flex gap-1 items-center">
                            <button 
                                onClick={() => handleNavigation('prev')}
                                className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded border border-slate-300 text-xs font-bold uppercase disabled:opacity-50"
                                disabled={currentQuestionIndex === 0}
                            >
                                &lt;&lt; Back
                            </button>
                            <button 
                                onClick={() => handleNavigation('next')}
                                className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded border border-slate-300 text-xs font-bold uppercase disabled:opacity-50"
                                disabled={currentQuestionIndex === exam.questions.length - 1}
                            >
                                Next &gt;&gt;
                            </button>
                            <button 
                                onClick={handleSubmit}
                                className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded text-sm font-bold shadow-sm uppercase border border-green-700 ml-4 transition-colors"
                            >
                                Submit
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right: Sidebar / Question Palette */}
            <div className="w-80 bg-blue-50 border-l border-slate-300 flex flex-col h-full shrink-0 overflow-y-auto custom-scrollbar">
                <div className="p-4 border-b border-blue-100 bg-white">
                    <div className="flex items-center gap-3 mb-4">
                        <img src={`https://ui-avatars.com/api/?name=User&background=0D8ABC&color=fff`} className="w-16 h-16 rounded bg-slate-200" alt="Profile" />
                        <div>
                            <div className="font-bold text-slate-800">Candidate</div>
                            <div className="text-xs text-green-600 font-semibold cursor-pointer hover:underline">Full Question Paper</div>
                        </div>
                    </div>
                    
                    {/* Legend */}
                    <div className="grid grid-cols-2 gap-2 text-[10px] leading-tight text-slate-600">
                        <div className="flex items-center gap-1.5"><div className="w-5 h-5 bg-slate-100 border border-slate-300 flex items-center justify-center font-bold text-slate-600">{counts.not_visited}</div> Not Visited</div>
                        <div className="flex items-center gap-1.5"><div className="w-5 h-5 bg-orange-600 text-white flex items-center justify-center font-bold clip-path-polygon">{counts.not_answered}</div> Not Answered</div>
                        <div className="flex items-center gap-1.5"><div className="w-5 h-5 bg-green-500 text-white flex items-center justify-center font-bold">{counts.answered}</div> Answered</div>
                        <div className="flex items-center gap-1.5"><div className="w-5 h-5 bg-purple-700 text-white rounded-full flex items-center justify-center font-bold">{counts.marked_for_review}</div> Marked for Review</div>
                        <div className="col-span-2 flex items-center gap-1.5"><div className="w-5 h-5 bg-purple-700 text-white rounded-full flex items-center justify-center font-bold relative"><div className="absolute bottom-0 right-0 w-1.5 h-1.5 bg-green-400 rounded-full border border-white"></div>{counts.answered_marked_for_review}</div> Ans & Marked for Review (will be considered for eval)</div>
                    </div>
                </div>

                <div className="flex-1 p-2">
                    <div className="bg-blue-200 text-blue-900 px-3 py-2 font-bold text-sm mb-2 rounded-t">
                        Section: {exam.title}
                    </div>
                    <div className="bg-white p-2 rounded-b border border-blue-200 min-h-[300px]">
                        <div className="text-xs font-bold text-slate-700 mb-2">Choose a Question</div>
                        <div className="grid grid-cols-5 gap-2">
                            {exam.questions.map((q, idx) => (
                                <button
                                    key={q.id}
                                    onClick={() => setCurrentQuestionIndex(idx)}
                                    className={`
                                        h-9 w-full flex items-center justify-center text-sm font-bold border hover:opacity-80 transition-all
                                        ${getStatusColor(questionStatus[q.id] || 'not_visited')}
                                        ${currentQuestionIndex === idx ? 'ring-2 ring-blue-400 ring-offset-1 z-10' : ''}
                                    `}
                                >
                                    {idx + 1}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
};