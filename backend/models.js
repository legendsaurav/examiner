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

const Exam = mongoose.model('Exam', ExamSchema);

module.exports = Exam;
