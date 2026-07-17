// Lightweight JSON file store — used as a fallback when MongoDB isn't available
// (e.g. running locally on a PC without a DB). Persists to backend/data-store.json.
const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, 'data-store.json');

const load = () => {
  try { return JSON.parse(fs.readFileSync(FILE, 'utf8')); }
  catch { return { exams: [], results: [] }; }
};
let db = load();
const persist = () => { try { fs.writeFileSync(FILE, JSON.stringify(db, null, 2)); } catch (e) { /* ignore */ } };
const genId = () => 'x' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const matches = (e, id) => e._id === id || e.id === id;

module.exports = {
  getExams: () => db.exams,
  getExam: (id) => db.exams.find(e => matches(e, id)) || null,
  createExam: (body) => {
    const exam = { ...body, _id: body._id || body.id || genId() };
    db.exams.push(exam);
    persist();
    return exam;
  },
  updateExam: (id, body) => {
    const i = db.exams.findIndex(e => matches(e, id));
    if (i < 0) return null;
    db.exams[i] = { ...db.exams[i], ...body, _id: db.exams[i]._id };
    persist();
    return db.exams[i];
  },
  deleteExam: (id) => {
    const before = db.exams.length;
    db.exams = db.exams.filter(e => !matches(e, id));
    persist();
    return db.exams.length < before;
  },
  createResult: (body) => {
    const result = { ...body, _id: genId() };
    db.results.push(result);
    persist();
    return result;
  },
  getResults: () => db.results,
};
