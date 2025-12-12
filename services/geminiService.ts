import { GoogleGenAI, Type, Schema } from "@google/genai";

// Gemini API Key
export const key = "AIzaSyAHmjIx2Mb1jcixG_hEUhYiy41PF3ubTaE";
import { Exam, Question, QuestionType } from "../types";

const EXAM_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    title: {
      type: Type.STRING,
      description: "The title of the exam or test.",
    },
    instructions: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "List of general instructions for the exam.",
    },
    questions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          text: {
            type: Type.STRING,
            description: "The question text.",
          },
          type: {
            type: Type.STRING,
            enum: ["MCQ", "INTEGER"],
            description: "The type of question. Use 'INTEGER' if the answer is a numerical value input by the user. Use 'MCQ' if options are provided.",
          },
          options: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "The list of possible answer options (A, B, C, D text). Empty for INTEGER type.",
          },
          correctOptionIndex: {
            type: Type.INTEGER,
            description: "For MCQ: The zero-based index of the correct option if explicitly marked, otherwise -1.",
            nullable: true,
          },
          correctAnswer: {
            type: Type.STRING,
            description: "For INTEGER type: The correct numeric answer as a string (e.g. '10', '4.5').",
            nullable: true,
          },
        },
        required: ["text", "type", "options"],
      },
    },
  },
  required: ["title", "instructions", "questions"],
};

export const parseExamWithGemini = async (pdfText: string): Promise<Partial<Exam>> => {
  const ai = new GoogleGenAI({ apiKey: key });

  try {
    const prompt = `
      You are an expert exam parser. 
      Analyze the following text extracted from a PDF exam.
      Extract the Exam Title, the Instructions, and all Questions.
      
      Determine the 'type' of each question:
      - 'MCQ': If the question has multiple choice options (A, B, C, D).
      - 'INTEGER': If the question asks for a numerical value, integer, or calculation result without options.
      
      For MCQ questions:
      - Extract all options.
      - If the correct answer is indicated, set correctOptionIndex.
      
      For INTEGER questions:
      - Leave 'options' array empty.
      - If the answer key is present in the text, extract the numeric value into 'correctAnswer'.
      
      Here is the text:
      ${pdfText.substring(0, 30000)}
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: EXAM_SCHEMA,
        temperature: 0.1,
      },
    });

    const result = JSON.parse(response.text || "{}");
    return processResultToExam(result);

  } catch (error) {
    console.error("Gemini Parsing Error:", error);
    throw new Error("Failed to parse exam content using AI.");
  }
};

export const generateExamByTopic = async (topic: string): Promise<Partial<Exam>> => {
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing.");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  try {
    const prompt = `
      Create a comprehensive mock exam for the following topic: "${topic}".
      
      Requirements:
      1. Title should be "${topic}".
      2. Include standard GATE-style instructions.
      3. Generate 15 high-quality questions.
      4. Mix 'MCQ' (Multiple Choice) and 'INTEGER' (Numerical Answer Type) questions. Roughly 70% MCQ and 30% Integer.
      5. For Integer questions, provide the exact numeric answer in 'correctAnswer'.
      6. For MCQ questions, ensure one option is correct.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: EXAM_SCHEMA,
        temperature: 0.5,
      },
    });

    const result = JSON.parse(response.text || "{}");
    return processResultToExam(result);

  } catch (error) {
    console.error("Gemini Generation Error:", error);
    throw new Error("Failed to generate exam content using AI.");
  }
};

const processResultToExam = (result: any): Partial<Exam> => {
  const processedQuestions: Question[] = (result.questions || []).map((q: any, idx: number) => ({
    id: `q-${Date.now()}-${idx}`,
    text: q.text,
    type: (q.type === 'INTEGER') ? 'INTEGER' : 'MCQ',
    options: (q.options || []).map((opt: string, oIdx: number) => ({
      id: `opt-${Date.now()}-${idx}-${oIdx}`,
      text: opt,
      isCorrect: q.correctOptionIndex === oIdx
    })),
    correctAnswer: q.correctAnswer || undefined,
  }));

  return {
    title: result.title || "Untitled Exam",
    instructions: result.instructions || [],
    questions: processedQuestions
  };
};
