const mongoose = require('mongoose');

const QuestionSchema = new mongoose.Schema({
  text: { type: String, required: true },
  options: [String],
  answerIndex: { type: Number, default: -1 },
});

const ExamSchema = new mongoose.Schema({
  title: { type: String, required: true },
  instructions: [String],
  questions: [QuestionSchema],
});


const ResultSchema = new mongoose.Schema({
  examId: { type: mongoose.Schema.Types.ObjectId, ref: 'Exam', required: true },
  score: Number,
  totalQuestions: Number,
  answers: [{}],
  timestamp: { type: Date, default: Date.now }
});

const Exam = mongoose.model('Exam', ExamSchema);
const Result = mongoose.model('Result', ResultSchema);

module.exports = { Exam, Result };
