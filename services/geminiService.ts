// DEPRECATED — Gemini has been fully replaced by Kimi (see ./kimiService.ts).
// This shim keeps any older imports working and removes the @google/genai
// dependency and the previously hard-coded API key from the client bundle.
export {
  extractExamFromText as parseExamWithGemini,
  generateExamByTopic,
  parseQuestionsMarkdown,
} from './kimiService';
