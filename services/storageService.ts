import { Exam, ExamResult } from "../types";

const EXAMS_KEY = 'smartexam_exams';
const RESULTS_KEY = 'smartexam_results';

export const saveExam = (exam: Exam): void => {
  const exams = getExams();
  const existingIndex = exams.findIndex(e => e.id === exam.id);
  
  if (existingIndex >= 0) {
    exams[existingIndex] = exam;
  } else {
    exams.push(exam);
  }
  
  localStorage.setItem(EXAMS_KEY, JSON.stringify(exams));
};

export const getExams = (): Exam[] => {
  const data = localStorage.getItem(EXAMS_KEY);
  return data ? JSON.parse(data) : [];
};

export const deleteExam = (id: string): void => {
  const exams = getExams().filter(e => e.id !== id);
  localStorage.setItem(EXAMS_KEY, JSON.stringify(exams));
};

export const saveResult = (result: ExamResult): void => {
  const results = getResults();
  results.push(result);
  localStorage.setItem(RESULTS_KEY, JSON.stringify(results));
};

export const getResults = (): ExamResult[] => {
  const data = localStorage.getItem(RESULTS_KEY);
  return data ? JSON.parse(data) : [];
};
