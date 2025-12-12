export enum UserRole {
  ADMIN = 'ADMIN',
  STUDENT = 'STUDENT',
  NONE = 'NONE'
}

export enum ViewState {
  HOME = 'HOME',
  ADMIN_DASHBOARD = 'ADMIN_DASHBOARD',
  EXAM_EDITOR = 'EXAM_EDITOR',
  STUDENT_DASHBOARD = 'STUDENT_DASHBOARD',
  GATE_EXPLORER = 'GATE_EXPLORER',
  EXAM_TAKER = 'EXAM_TAKER',
  EXAM_RESULT = 'EXAM_RESULT'
}

export type QuestionStatus = 'not_visited' | 'not_answered' | 'answered' | 'marked_for_review' | 'answered_marked_for_review';

export interface Option {
  id: string;
  text: string;
  imageUrl?: string; // Optional image for the option
  isCorrect?: boolean; // Only visible to admin/backend
}

export interface Question {
  id: string;
  text: string;
  imageUrl?: string; // Optional image for the question
  options: Option[];
  correctOptionIndex?: number; // Helper for AI parsing
}

export interface Exam {
  id: string;
  title: string;
  createdAt: number;
  instructions: string[];
  questions: Question[];
  maxQuestionsToAttempt?: number; // Configurable limit for students
}

export interface StudentAnswer {
  questionId: string;
  selectedOptionId: string;
}

export interface ExamResult {
  examId: string;
  score: number;
  totalQuestions: number;
  answers: StudentAnswer[];
  timestamp: number;
}