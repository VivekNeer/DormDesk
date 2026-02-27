require('dotenv').config();
const express = require('express');
const cors = require('cors');

const complaintsRouter = require('./routes/complaints');

const app = express();

// ── Middleware ───────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ── Health Check ────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Routes ──────────────────────────────────────────────
app.use('/api/complaints', complaintsRouter);

// ── 404 fallback ────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
});

// ── Start Server ────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ DormDesk backend running on port ${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
});
