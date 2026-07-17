// Entry point for Express backend
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(express.json({ limit: '12mb' })); // exam text (multiple PDFs) can be large
app.use(cors());

const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI;

mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));


// Health check and API info
app.get('/', (req, res) => {
  res.send('Backend is running. API available at /api');
});

app.use('/api', require('./routes'));

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
