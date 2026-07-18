import React, { useState } from 'react';
import { Exam, Question, QuestionType } from '../types';
import { Button } from './Button';
import { Trash2, Plus, Save, ArrowLeft, Image as ImageIcon, X, Settings, Hash, List } from 'lucide-react';

interface ExamEditorProps {
  exam: Exam;
  onSave: (exam: Exam) => void;
  onCancel: () => void;
}

export const ExamEditor: React.FC<ExamEditorProps> = ({ exam: initialExam, onSave, onCancel }) => {
  const [exam, setExam] = useState<Exam>(initialExam);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setExam(prev => ({ ...prev, title: e.target.value }));
  };
  
  const handleMaxQuestionsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value);
    setExam(prev => ({ 
        ...prev, 
        maxQuestionsToAttempt: val > 0 ? val : undefined 
    }));
  };

  const handleInstructionChange = (index: number, val: string) => {
    const newInstructions = [...exam.instructions];
    newInstructions[index] = val;
    setExam(prev => ({ ...prev, instructions: newInstructions }));
  };

  const addInstruction = () => {
    setExam(prev => ({ ...prev, instructions: [...prev.instructions, "New instruction"] }));
  };

  const deleteInstruction = (index: number) => {
    setExam(prev => ({ ...prev, instructions: prev.instructions.filter((_, i) => i !== index) }));
  };

  // --- Image Helpers ---
  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleQuestionImageUpload = async (qIndex: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const base64 = await convertFileToBase64(file);
      const newQuestions = [...exam.questions];
      newQuestions[qIndex].imageUrl = base64;
      setExam(prev => ({ ...prev, questions: newQuestions }));
    } catch (error) {
      console.error("Error uploading image", error);
    }
  };

  const removeQuestionImage = (qIndex: number) => {
    const newQuestions = [...exam.questions];
    newQuestions[qIndex].imageUrl = undefined;
    setExam(prev => ({ ...prev, questions: newQuestions }));
  };

  const handleOptionImageUpload = async (qIndex: number, optIndex: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const base64 = await convertFileToBase64(file);
      const newQuestions = [...exam.questions];
      newQuestions[qIndex].options[optIndex].imageUrl = base64;
      setExam(prev => ({ ...prev, questions: newQuestions }));
    } catch (error) {
      console.error("Error uploading image", error);
    }
  };

  const removeOptionImage = (qIndex: number, optIndex: number) => {
    const newQuestions = [...exam.questions];
    newQuestions[qIndex].options[optIndex].imageUrl = undefined;
    setExam(prev => ({ ...prev, questions: newQuestions }));
  };

  // --- Question Helpers ---

  const updateQuestionText = (qIndex: number, text: string) => {
    const newQuestions = [...exam.questions];
    newQuestions[qIndex].text = text;
    setExam(prev => ({ ...prev, questions: newQuestions }));
  };
  
  const updateQuestionType = (qIndex: number, type: QuestionType) => {
    const newQuestions = [...exam.questions];
    newQuestions[qIndex].type = type;
    // If switching to INTEGER, options might be irrelevant, but we keep them in memory or clear them?
    // Let's keep them but hide them in UI.
    setExam(prev => ({ ...prev, questions: newQuestions }));
  };

  const updateCorrectIntegerAnswer = (qIndex: number, ans: string) => {
    const newQuestions = [...exam.questions];
    newQuestions[qIndex].correctAnswer = ans;
    setExam(prev => ({ ...prev, questions: newQuestions }));
  };

  const updateOptionText = (qIndex: number, optIndex: number, text: string) => {
    const newQuestions = [...exam.questions];
    newQuestions[qIndex].options[optIndex].text = text;
    setExam(prev => ({ ...prev, questions: newQuestions }));
  };

  const toggleCorrectOption = (qIndex: number, optIndex: number) => {
    const newQuestions = [...exam.questions];
    const currentStatus = newQuestions[qIndex].options[optIndex].isCorrect;
    
    newQuestions[qIndex].options.forEach((opt, idx) => {
        opt.isCorrect = idx === optIndex ? !currentStatus : false;
    });
    
    setExam(prev => ({ ...prev, questions: newQuestions }));
  };

  const deleteQuestion = (qIndex: number) => {
    setExam(prev => ({ ...prev, questions: prev.questions.filter((_, i) => i !== qIndex) }));
  };

  const addQuestion = () => {
    const newQuestion: Question = {
      id: `q-${Date.now()}`,
      text: "New Question",
      type: 'MCQ',
      options: [
        { id: `opt-${Date.now()}-0`, text: "Option A", isCorrect: false },
        { id: `opt-${Date.now()}-1`, text: "Option B", isCorrect: false },
      ]
    };
    setExam(prev => ({ ...prev, questions: [...prev.questions, newQuestion] }));
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="flex items-center justify-between mb-8 border-b pb-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Edit Exam</h2>
          <p className="text-sm text-slate-500">Review content and configure exam settings.</p>
        </div>
        <div className="flex gap-2">
            <Button variant="secondary" onClick={onCancel}>
                <ArrowLeft className="w-4 h-4 mr-2" /> Cancel
            </Button>
            <Button onClick={() => onSave(exam)}>
                <Save className="w-4 h-4 mr-2" /> Save Exam
            </Button>
        </div>
      </div>

      <div className="space-y-6">
        {/* Exam Title */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Exam Title / Bank Name</label>
          <input
            type="text"
            value={exam.title}
            onChange={handleTitleChange}
            className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-brand-500 outline-none"
          />
        </div>
        
        {/* Exam Configuration */}
        <div className="bg-blue-50 p-4 rounded-md border border-blue-200">
            <div className="flex items-center gap-2 mb-3 text-blue-800 font-semibold">
                <Settings className="w-4 h-4" /> Exam Configuration
            </div>
            <div className="flex flex-col md:flex-row gap-6">
                <div className="flex-1">
                    <label className="block text-xs font-bold text-blue-700 uppercase mb-1">Total Questions Available</label>
                    <div className="text-2xl font-bold text-slate-800">{exam.questions.length}</div>
                    <p className="text-xs text-slate-500">Total number of questions in this bank.</p>
                </div>
                <div className="flex-1">
                    <label className="block text-xs font-bold text-blue-700 uppercase mb-1">Max Questions to Display</label>
                    <input
                        type="number"
                        min="1"
                        max={exam.questions.length}
                        value={exam.maxQuestionsToAttempt || ''}
                        onChange={handleMaxQuestionsChange}
                        placeholder="All"
                        className="w-full p-2 border border-blue-300 rounded text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-slate-500 mt-1">
                        If set, students will see a random subset of this size (e.g., 20 random questions out of 50). Leave blank to show all.
                    </p>
                </div>
            </div>
        </div>

        {/* Instructions */}
        <div className="bg-slate-50 p-4 rounded-md border border-slate-200">
          <div className="flex justify-between items-center mb-2">
            <label className="block text-sm font-medium text-slate-700">Instructions</label>
            <button onClick={addInstruction} className="text-xs text-brand-600 font-medium hover:underline">+ Add Instruction</button>
          </div>
          {exam.instructions.map((inst, idx) => (
            <div key={idx} className="flex gap-2 mb-2">
              <input
                type="text"
                value={inst}
                onChange={(e) => handleInstructionChange(idx, e.target.value)}
                className="flex-1 p-2 text-sm border border-slate-300 rounded outline-none focus:border-brand-500"
              />
              <button onClick={() => deleteInstruction(idx)} className="text-red-500 hover:text-red-700">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        {/* Questions */}
        <div className="space-y-6">
          <div className="flex justify-between items-center">
             <h3 className="text-lg font-semibold text-slate-800">Question Bank ({exam.questions.length})</h3>
             <Button variant="secondary" onClick={addQuestion} className="text-xs">
                <Plus className="w-4 h-4 mr-1" /> Add Question
             </Button>
          </div>
         
          {exam.questions.map((q, qIndex) => (
            <div key={q.id} className="border border-slate-200 rounded-lg p-4 hover:border-brand-200 transition-colors bg-white">
              <div className="flex justify-between items-start mb-2">
                <div className="w-full mr-4">
                    <div className="flex justify-between items-center mb-2">
                        <label className="text-xs font-semibold text-slate-500 uppercase">Question {qIndex + 1}</label>
                        {/* Question Type Toggle */}
                        <div className="flex items-center bg-slate-100 rounded-md p-1">
                            <button 
                                onClick={() => updateQuestionType(qIndex, 'MCQ')}
                                className={`px-2 py-1 text-xs font-bold rounded ${q.type !== 'INTEGER' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                <List className="w-3 h-3 inline mr-1" /> MCQ
                            </button>
                            <button 
                                onClick={() => updateQuestionType(qIndex, 'INTEGER')}
                                className={`px-2 py-1 text-xs font-bold rounded ${q.type === 'INTEGER' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                <Hash className="w-3 h-3 inline mr-1" /> Integer
                            </button>
                        </div>
                    </div>

                    <textarea
                        value={q.text}
                        onChange={(e) => updateQuestionText(qIndex, e.target.value)}
                        className="w-full mt-1 p-2 border border-slate-300 rounded text-slate-800 font-medium outline-none focus:ring-1 focus:ring-brand-500"
                        rows={2}
                        placeholder="Enter question text here..."
                    />
                    
                    {/* Question Image Upload */}
                    <div className="mt-2">
                        {q.imageUrl ? (
                            <div className="relative inline-block border rounded p-1 bg-slate-50">
                                <img src={q.imageUrl} alt="Question" className="h-20 object-contain" />
                                <button 
                                    onClick={() => removeQuestionImage(qIndex)}
                                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600"
                                    title="Remove Image"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            </div>
                        ) : (
                            <div>
                                <input 
                                    type="file" 
                                    id={`file-q-${qIndex}`}
                                    className="hidden" 
                                    accept="image/*"
                                    onChange={(e) => handleQuestionImageUpload(qIndex, e)}
                                />
                                <label 
                                    htmlFor={`file-q-${qIndex}`} 
                                    className="inline-flex items-center text-xs text-brand-600 hover:text-brand-800 cursor-pointer font-medium"
                                >
                                    <ImageIcon className="w-3 h-3 mr-1" /> Add Image to Question
                                </label>
                            </div>
                        )}
                    </div>
                </div>
                <button onClick={() => deleteQuestion(qIndex)} className="text-slate-400 hover:text-red-600 mt-6">
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>

              {/* Conditional Rendering based on Type */}
              {q.type === 'INTEGER' ? (
                   <div className="mt-4 pl-4 border-l-2 border-brand-100">
                        <label className="block text-xs font-bold text-slate-600 mb-1">Correct Numeric Answer</label>
                        <input
                            type="text"
                            value={q.correctAnswer || ''}
                            onChange={(e) => updateCorrectIntegerAnswer(qIndex, e.target.value)}
                            placeholder="e.g. 10.5, -4, 25"
                            className="w-48 p-2 border border-slate-300 rounded outline-none focus:ring-1 focus:ring-brand-500 font-mono"
                        />
                   </div>
              ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-4 border-l-2 border-brand-100 mt-4">
                    {q.options.map((opt, optIndex) => (
                      <div key={opt.id} className={`flex flex-col p-2 rounded border ${opt.isCorrect ? 'bg-green-50 border-green-200' : 'bg-white border-slate-200'}`}>
                        <div className="flex items-center gap-2">
                            <input
                              type="radio"
                              checked={!!opt.isCorrect}
                              onChange={() => toggleCorrectOption(qIndex, optIndex)}
                              className="text-brand-600 focus:ring-brand-500 h-4 w-4 cursor-pointer shrink-0"
                              title="Mark as correct answer"
                            />
                            <input
                              type="text"
                              value={opt.text}
                              onChange={(e) => updateOptionText(qIndex, optIndex, e.target.value)}
                              className="flex-1 bg-transparent border-none outline-none text-sm min-w-0"
                              placeholder={`Option ${optIndex + 1}`}
                            />
                        </div>
                        
                        {/* Option Image Upload */}
                        <div className="ml-6 mt-2">
                             {opt.imageUrl ? (
                                <div className="relative inline-block border rounded p-1 bg-white">
                                    <img src={opt.imageUrl} alt="Option" className="h-12 object-contain" />
                                    <button 
                                        onClick={() => removeOptionImage(qIndex, optIndex)}
                                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600"
                                        title="Remove Image"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </div>
                            ) : (
                                <div>
                                    <input 
                                        type="file" 
                                        id={`file-opt-${qIndex}-${optIndex}`}
                                        className="hidden" 
                                        accept="image/*"
                                        onChange={(e) => handleOptionImageUpload(qIndex, optIndex, e)}
                                    />
                                    <label 
                                        htmlFor={`file-opt-${qIndex}-${optIndex}`} 
                                        className="inline-flex items-center text-xs text-slate-400 hover:text-brand-600 cursor-pointer"
                                    >
                                        <ImageIcon className="w-3 h-3 mr-1" /> Add Image
                                    </label>
                                </div>
                            )}
                        </div>
                      </div>
                    ))}
                  </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};