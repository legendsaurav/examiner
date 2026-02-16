import { Exam, ExamResult } from "../types";
import { API_BASE_URL } from "./apiConfig";



export const saveExam = async (exam: Exam): Promise<void> => {
  await fetch(`${API_BASE_URL}/exams`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(exam)
  });
};

export const getExams = async (): Promise<Exam[]> => {
  const res = await fetch(`${API_BASE_URL}/exams`);
  if (!res.ok) throw new Error('Failed to fetch exams');
  return res.json();
};

export const deleteExam = async (id: string): Promise<void> => {
  await fetch(`${API_BASE_URL}/exams/${id}`, { method: 'DELETE' });
};

export const saveResult = async (result: ExamResult): Promise<void> => {
  await fetch(`${API_BASE_URL}/results`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(result)
  });
};

export const getResults = async (): Promise<ExamResult[]> => {
  const res = await fetch(`${API_BASE_URL}/results`);
  if (!res.ok) throw new Error('Failed to fetch results');
  return res.json();
};
