require('dotenv').config();
const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const cron = require('node-cron');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const sgMail = require('@sendgrid/mail');
const Razorpay = require('razorpay');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

sgMail.setApiKey(process.env.SENDGRID_API_KEY || 'dummy');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'dummy',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'dummy'
});

// Initialize Firebase Admin
let db;
let dbType = 'memory';

try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    db = admin.firestore();
    dbType = 'firestore';
    console.log('Firebase initialized. Using Firestore.');
  } else {
    throw new Error('No FIREBASE_SERVICE_ACCOUNT_KEY provided.');
  }
} catch (error) {
  console.log('Falling back to in-memory database:', error.message);
  dbType = 'memory';
}

const inMemoryDB = {
  users: [],
  subscriptions: [],
  alerts: [],
  payments: []
};


// Middleware for auth
const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'supersecretjwtkey123');
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// --- AUTH ROUTES ---
app.post('/api/auth/register', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'Missing fields' });
  
  const existingUser = inMemoryDB.users.find(u => u.email === email);
  if (existingUser) return res.status(400).json({ error: 'User already exists' });
  
  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser = {
    id: Date.now().toString(),
    name, email, password: hashedPassword, plan: 'free', currency: 'INR', createdAt: new Date()
  };
  inMemoryDB.users.push(newUser);
  
  const token = jwt.sign({ id: newUser.id, email: newUser.email }, process.env.JWT_SECRET || 'supersecretjwtkey123');
  res.json({ token, user: { id: newUser.id, name: newUser.name, email: newUser.email, plan: newUser.plan } });
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const user = inMemoryDB.users.find(u => u.email === email);
  if (!user) return res.status(404).json({ error: 'User not found' });
  
  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(401).json({ error: 'Invalid password' });
  
  const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET || 'supersecretjwtkey123');
  res.json({ token, user: { id: user.id, name: user.name, email: user.email, plan: user.plan } });
});

// --- SUBSCRIPTIONS ROUTES ---
app.get('/api/subscriptions', authenticate, (req, res) => {
  const subs = inMemoryDB.subscriptions.filter(s => s.userId === req.user.id);
  res.json(subs);
});

app.post('/api/subscriptions', authenticate, (req, res) => {
  const sub = { ...req.body, id: Date.now().toString(), userId: req.user.id, createdAt: new Date() };
  inMemoryDB.subscriptions.push(sub);
  res.json(sub);
});

app.put('/api/subscriptions/:id', authenticate, (req, res) => {
  const index = inMemoryDB.subscriptions.findIndex(s => s.id === req.params.id && s.userId === req.user.id);
  if (index === -1) return res.status(404).json({ error: 'Not found' });
  inMemoryDB.subscriptions[index] = { ...inMemoryDB.subscriptions[index], ...req.body };
  res.json(inMemoryDB.subscriptions[index]);
});

app.delete('/api/subscriptions/:id', authenticate, (req, res) => {
  const index = inMemoryDB.subscriptions.findIndex(s => s.id === req.params.id && s.userId === req.user.id);
  if (index === -1) return res.status(404).json({ error: 'Not found' });
  inMemoryDB.subscriptions.splice(index, 1);
  res.json({ success: true });
});

// --- ANALYTICS ---
app.get('/api/analytics/summary', authenticate, (req, res) => {
  const subs = inMemoryDB.subscriptions.filter(s => s.userId === req.user.id);
  let totalMonthly = 0;
  let activeCount = 0;
  
  subs.forEach(s => {
    if (s.status === 'Active') {
      activeCount++;
      let amount = parseFloat(s.amount);
      if (s.billingCycle === 'Yearly') amount /= 12;
      if (s.billingCycle === 'Weekly') amount *= 4;
      totalMonthly += amount;
    }
  });
  
  res.json({ totalMonthly, activeCount, totalYearly: totalMonthly * 12 });
});

app.get('/api/analytics/graveyard', authenticate, (req, res) => {
  const subs = inMemoryDB.subscriptions.filter(s => s.userId === req.user.id && s.status !== 'Active');
  let wasted = 0;
  subs.forEach(s => wasted += parseFloat(s.amount));
  res.json({ wasted, message: `You have wasted ${wasted} on apps you never used!` });
});

// --- ALERTS ---
app.post('/api/alerts/send', authenticate, (req, res) => {
  res.json({ success: true, message: 'Alerts simulated' });
});

// --- FAMILY ---
app.get('/api/family/members', authenticate, (req, res) => {
  res.json([]);
});

app.post('/api/family/invite', authenticate, (req, res) => {
  res.json({ success: true, message: 'Invite sent' });
});

// --- PAYMENT (RAZORPAY) ---
app.post('/api/payment/create-order', authenticate, async (req, res) => {
  try {
    const options = { amount: 79900, currency: "INR", receipt: "receipt_" + Date.now() };
    const order = await razorpay.orders.create(options);
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/payment/verify', authenticate, (req, res) => {
  res.json({ success: true, plan: 'premium' });
});

// Start CRON
cron.schedule('0 9 * * *', () => {
  console.log('Running daily subscription alert check...');
  // Logic to send emails via SendGrid
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
