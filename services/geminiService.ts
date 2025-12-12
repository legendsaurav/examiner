import { GoogleGenAI, Type, Schema } from "@google/genai";
import { Exam, Question } from "../types";

const parseExamWithGemini = async (pdfText: string): Promise<Partial<Exam>> => {
  const key = "AIzaSyAHmjIx2Mb1jcixG_hEUhYiy41PF3ubTaE";
  const ai = new GoogleGenAI({ apiKey: key });

  // Define the schema for structured output
  const examSchema: Schema = {
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
            options: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "The list of possible answer options (A, B, C, D text).",
            },
            correctOptionIndex: {
              type: Type.INTEGER,
              description: "The zero-based index of the correct option if explicitly marked, otherwise -1.",
              nullable: true,
            },
          },
          required: ["text", "options"],
        },
      },
    },
    required: ["title", "instructions", "questions"],
  };

  try {
    const prompt = `
      You are an expert exam parser. 
      Analyze the following text extracted from a PDF exam.
      Extract the Exam Title, the Instructions, and all Questions with their Options.
      
      For each question:
      1. Extract the question stem clearly.
      2. Extract all options as a simple list of strings. Remove letter prefixes like "A)", "a.", "1." from the start of the option text.
      3. If the correct answer is indicated (e.g., bolded, marked with asterisk, or in an answer key at the end), try to identify the index (0-3). If unknown, set to -1.
      4. Ignore page headers, footers, or page numbers (like "Page 1 of 5").
      
      Here is the text:
      ${pdfText.substring(0, 30000)} // Truncate to avoid token limits if PDF is huge, though Flash handles large context well.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: examSchema,
        temperature: 0.1, // Low temperature for factual extraction
      },
    });

    const result = JSON.parse(response.text || "{}");
    
    // Post-process to add IDs
    const processedQuestions: Question[] = (result.questions || []).map((q: any, idx: number) => ({
      id: `q-${Date.now()}-${idx}`,
      text: q.text,
      options: (q.options || []).map((opt: string, oIdx: number) => ({
        id: `opt-${Date.now()}-${idx}-${oIdx}`,
        text: opt,
        isCorrect: q.correctOptionIndex === oIdx
      })),
    }));

    return {
      title: result.title || "Untitled Exam",
      instructions: result.instructions || [],
      questions: processedQuestions
    };

  } catch (error) {
    console.error("Gemini Parsing Error:", error);
    throw new Error("Failed to parse exam content using AI.");
  }
};

export { parseExamWithGemini };
