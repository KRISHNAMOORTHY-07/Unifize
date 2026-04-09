const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;
const DB_FILE = path.join(__dirname, 'submissions.json');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname)); // Serve HTML files

// Helper: read DB
function readDB() {
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify({ demo_requests: [], email_subscriptions: [] }, null, 2));
  }
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
}

// Helper: write DB
function writeDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// Helper: validate email
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ─── ROUTES ───────────────────────────────────────────────────────────

// POST /api/demo — Book a Demo form
app.post('/api/demo', (req, res) => {
  const { firstName, lastName, email, company, phone } = req.body;

  if (!email || !isValidEmail(email)) {
    return res.status(400).json({ success: false, message: 'Valid email is required.' });
  }
  if (!firstName || !lastName) {
    return res.status(400).json({ success: false, message: 'First and last name are required.' });
  }

  const db = readDB();
  const record = {
    id: Date.now(),
    type: 'demo_request',
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    email: email.trim().toLowerCase(),
    company: (company || '').trim(),
    phone: (phone || '').trim(),
    submittedAt: new Date().toISOString(),
    status: 'pending'
  };

  db.demo_requests.push(record);
  writeDB(db);

  console.log(`[DEMO REQUEST] ${record.firstName} ${record.lastName} <${record.email}> from ${record.company}`);
  res.json({ success: true, message: 'Demo request received! We'll be in touch shortly.', id: record.id });
});

// POST /api/subscribe — Hero email capture
app.post('/api/subscribe', (req, res) => {
  const { email } = req.body;

  if (!email || !isValidEmail(email)) {
    return res.status(400).json({ success: false, message: 'Valid email is required.' });
  }

  const db = readDB();

  // Check duplicate
  const exists = db.email_subscriptions.find(s => s.email === email.trim().toLowerCase());
  if (exists) {
    return res.status(409).json({ success: false, message: 'This email is already subscribed.' });
  }

  const record = {
    id: Date.now(),
    email: email.trim().toLowerCase(),
    subscribedAt: new Date().toISOString(),
    source: 'hero_form'
  };

  db.email_subscriptions.push(record);
  writeDB(db);

  console.log(`[SUBSCRIPTION] ${record.email}`);
  res.json({ success: true, message: 'Thanks! We'll be in touch shortly.' });
});

// GET /api/submissions — Admin view all submissions
app.get('/api/submissions', (req, res) => {
  const db = readDB();
  res.json({
    summary: {
      total_demo_requests: db.demo_requests.length,
      total_subscriptions: db.email_subscriptions.length
    },
    demo_requests: db.demo_requests,
    email_subscriptions: db.email_subscriptions
  });
});

// DELETE /api/submissions/:type/:id — Remove a record
app.delete('/api/submissions/:type/:id', (req, res) => {
  const { type, id } = req.params;
  const db = readDB();

  if (type === 'demo') {
    db.demo_requests = db.demo_requests.filter(r => r.id !== parseInt(id));
  } else if (type === 'subscription') {
    db.email_subscriptions = db.email_subscriptions.filter(r => r.id !== parseInt(id));
  } else {
    return res.status(400).json({ success: false, message: 'Invalid type.' });
  }

  writeDB(db);
  res.json({ success: true, message: 'Record deleted.' });
});

// ─── START ────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n✅  Unifize backend running at http://localhost:${PORT}`);
  console.log(`📋  View submissions: http://localhost:${PORT}/api/submissions`);
  console.log(`🌐  Open site:        http://localhost:${PORT}/unifize-clone.html\n`);
});
