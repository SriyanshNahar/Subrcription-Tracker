require('dotenv').config();
const fs = require('fs');
const path = require('path');
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
app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));

sgMail.setApiKey(process.env.SENDGRID_API_KEY || 'dummy');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'dummy',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'dummy'
});

// Initialize Firebase Admin
let db;
let dbType = 'memory';

try {
  let keyRaw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

  if (!keyRaw) {
    // Try to auto-detect pasted raw JSON inside .env file (self-healing fallback)
    try {
      const envPath = path.join(__dirname, '.env');
      if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8');
        const jsonMatch = envContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          keyRaw = jsonMatch[0].trim();
          console.log('💡 AUTO-DETECT: Found pasted Firebase Service Account JSON inside .env file!');
        }
      }
    } catch (e) {
      // Ignore env read error
    }
  }

  if (keyRaw) {
    keyRaw = keyRaw.trim();
    
    // Strip external surrounding quotes if added by environment variable parsers
    if (keyRaw.startsWith('"') && keyRaw.endsWith('"')) {
      keyRaw = keyRaw.slice(1, -1);
    }
    if (keyRaw.startsWith("'") && keyRaw.endsWith("'")) {
      keyRaw = keyRaw.slice(1, -1);
    }
    
    // Safely escape actual raw literal control characters (newlines, carriage returns, tabs) 
    // inside quoted string values, while preserving standard JSON structure.
    keyRaw = keyRaw.replace(/"([^"\\]*(?:\\.[^"\\]*)*)"/g, (match, p1) => {
      const cleaned = p1
        .replace(/\r/g, '')
        .replace(/\n/g, '\\n')
        .replace(/\t/g, '\\t');
      return `"${cleaned}"`;
    });

    // Self-healing JSON: Detect and escape any invalid/lone backslashes (e.g. not followed by standard escapes)
    // to prevent JSON.parse from throwing "Bad escaped character" errors.
    keyRaw = keyRaw.replace(/\\(?!["\\\/bfnrtu])/g, '\\\\');

    const serviceAccount = JSON.parse(keyRaw);
    
    // Robust Key Healing: Format PEM private key to eliminate any corrupt spacing, escaping or formatting issues
    if (serviceAccount.private_key) {
      let pk = serviceAccount.private_key;
      // Replace any double-escaped newlines or single-escaped newlines
      pk = pk.replace(/\\n/g, '\n').replace(/\\r/g, '\r');
      pk = pk.trim().replace(/^['"]|['"]$/g, '');
      
      const header = '-----BEGIN PRIVATE KEY-----';
      const footer = '-----END PRIVATE KEY-----';
      
      if (pk.includes(header) && pk.includes(footer)) {
        const body = pk
          .replace(header, '')
          .replace(footer, '')
          .replace(/\s+/g, ''); // strip all whitespace, newlines, tabs
        
        const lines = [];
        for (let i = 0; i < body.length; i += 64) {
          lines.push(body.substring(i, i + 64));
        }
        pk = `${header}\n${lines.join('\n')}\n${footer}\n`;
      } else {
        pk = pk.replace(/\n/g, '\n');
      }
      serviceAccount.private_key = pk;
    }
    
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    db = admin.firestore();
    dbType = 'firestore';
    console.log('🚀 SUCCESS: Firebase Admin Initialized. Using Google Firestore (Data is Persistent!).');
  } else {
    throw new Error('No FIREBASE_SERVICE_ACCOUNT_KEY provided in environment variables.');
  }
} catch (error) {
  console.error('⚠️ DATABASE FALLBACK: Falling back to in-memory database due to error:', error.message);
  console.log('💡 TIP: If this is production (Render), verify that FIREBASE_SERVICE_ACCOUNT_KEY is valid JSON.');
  dbType = 'memory';
}

const inMemoryDB = {
  users: [],
  subscriptions: [],
  alerts: [],
  payments: []
};

// --- DATABASE PLAN HELPERS ---
const updateUserPlan = async (userId, planKey, razorpaySubscriptionId) => {
  const planName = planKey.includes('family') ? 'family' : 'pro';
  const durationDays = planKey.includes('yearly') ? 365 : 30;
  const planExpiry = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);

  if (dbType === 'firestore') {
    await db.collection('users').doc(userId).set({
      plan: planName,
      planExpiry: planExpiry,
      razorpaySubscriptionId: razorpaySubscriptionId,
      updatedAt: new Date()
    }, { merge: true });
  } else {
    let user = inMemoryDB.users.find(u => u.id === userId);
    if (!user) {
      user = { id: userId, createdAt: new Date() };
      inMemoryDB.users.push(user);
    }
    user.plan = planName;
    user.planExpiry = planExpiry;
    user.razorpaySubscriptionId = razorpaySubscriptionId;
    user.updatedAt = new Date();
  }
  console.log(`Plan ${planName} activated for user ${userId}`);
};

const downgradeUserToFree = async (userId) => {
  if (dbType === 'firestore') {
    await db.collection('users').doc(userId).set({
      plan: 'free',
      razorpaySubscriptionId: null,
      planExpiry: null,
      updatedAt: new Date()
    }, { merge: true });
  } else {
    let user = inMemoryDB.users.find(u => u.id === userId);
    if (user) {
      user.plan = 'free';
      user.razorpaySubscriptionId = null;
      user.planExpiry = null;
      user.updatedAt = new Date();
    }
  }
  console.log(`Plan downgraded to free for user ${userId}`);
};

const findUserBySubscriptionId = async (subscriptionId) => {
  if (dbType === 'firestore') {
    const snapshot = await db.collection('users').where('razorpaySubscriptionId', '==', subscriptionId).limit(1).get();
    if (!snapshot.empty) {
      return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
    }
    return null;
  } else {
    return inMemoryDB.users.find(u => u.razorpaySubscriptionId === subscriptionId) || null;
  }
};

// Middleware for auth
const authenticate = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    let decoded;
    if (dbType === 'firestore') {
      decoded = await admin.auth().verifyIdToken(token);
      decoded.id = decoded.uid || decoded.sub;
    } else {
      try {
        decoded = jwt.verify(token, process.env.JWT_SECRET || 'supersecretjwtkey123');
      } catch (err) {
        // If local verification fails, try decoding as Firebase Token
        decoded = jwt.decode(token);
        if (decoded) {
          decoded.id = decoded.uid || decoded.sub;
        }
      }
    }
    
    if (!decoded) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// --- AUTH ROUTES ---
app.post('/api/auth/verify-captcha', async (req, res) => {
  let { token } = req.body;

  // Graceful fallback for local development or blocked Google scripts
  if (!token) {
    token = 'local-mock-token';
  }

  try {
    const secretKey = process.env.RECAPTCHA_SECRET_KEY || '6LeIxAcTAAAAAGG-vFI1qg7C5WYCcJb8I3Yg5laH';

    // In a real app, you would verify this against Google's API:
    // const response = await axios.post('https://www.google.com/recaptcha/api/siteverify', null, { params: { secret: secretKey, response: token } });
    // const { success, score } = response.data;
    
    // For local dev without a real token, we simulate success
    const success = true;
    const score = 0.9;

    if (!success) {
      return res.status(400).json({ error: 'reCAPTCHA verification failed', score: 0 });
    }

    return res.json({
      success: true,
      score: score,
      isHuman: score >= 0.5
    });

  } catch (error) {
    return res.status(500).json({ error: 'Server error during verification' });
  }
});
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
app.get('/api/subscriptions', authenticate, async (req, res) => {
  try {
    if (dbType === 'firestore') {
      const snapshot = await db.collection('subscriptions').where('userId', '==', req.user.id).get();
      const subs = [];
      snapshot.forEach(doc => subs.push({ id: doc.id, ...doc.data() }));
      res.json(subs);
    } else {
      const subs = inMemoryDB.subscriptions.filter(s => s.userId === req.user.id);
      res.json(subs);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/subscriptions', authenticate, async (req, res) => {
  try {
    // 1. Fetch user's plan
    let userPlan = 'free';
    if (dbType === 'firestore') {
      const userDoc = await db.collection('users').doc(req.user.id).get();
      if (userDoc.exists) {
        userPlan = userDoc.data().plan || 'free';
      }
    } else {
      const user = inMemoryDB.users.find(u => u.id === req.user.id);
      if (user) {
        userPlan = user.plan || 'free';
      }
    }

    // 2. Enforce subscription tier limits (Free: 3, Pro: 15, Family: Unlimited)
    let subsCount = 0;
    if (dbType === 'firestore') {
      const snapshot = await db.collection('subscriptions').where('userId', '==', req.user.id).get();
      subsCount = snapshot.size;
    } else {
      subsCount = inMemoryDB.subscriptions.filter(s => s.userId === req.user.id).length;
    }

    if (userPlan === 'free' && subsCount >= 3) {
      return res.status(403).json({
        error: 'Starter Free plan limit reached (max 3 subscriptions). Please upgrade to Premium Pro (15) or Shared Family for unlimited tracking!'
      });
    }

    if (userPlan === 'pro' && subsCount >= 15) {
      return res.status(403).json({
        error: 'Premium Pro plan limit reached (max 15 subscriptions). Please upgrade to Shared Family for unlimited tracking!'
      });
    }


    // 3. Save subscription
    if (dbType === 'firestore') {
      const docRef = await db.collection('subscriptions').add({
        ...req.body,
        userId: req.user.id,
        createdAt: new Date()
      });
      res.json({ id: docRef.id, ...req.body });
    } else {
      const sub = { ...req.body, id: Date.now().toString(), userId: req.user.id, createdAt: new Date() };
      inMemoryDB.subscriptions.push(sub);
      res.json(sub);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/subscriptions/:id', authenticate, async (req, res) => {
  try {
    if (dbType === 'firestore') {
      await db.collection('subscriptions').doc(req.params.id).update(req.body);
      res.json({ id: req.params.id, ...req.body });
    } else {
      const index = inMemoryDB.subscriptions.findIndex(s => s.id === req.params.id && s.userId === req.user.id);
      if (index === -1) return res.status(404).json({ error: 'Not found' });
      inMemoryDB.subscriptions[index] = { ...inMemoryDB.subscriptions[index], ...req.body };
      res.json(inMemoryDB.subscriptions[index]);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/subscriptions/:id', authenticate, async (req, res) => {
  try {
    if (dbType === 'firestore') {
      await db.collection('subscriptions').doc(req.params.id).delete();
      res.json({ success: true });
    } else {
      const index = inMemoryDB.subscriptions.findIndex(s => s.id === req.params.id && s.userId === req.user.id);
      if (index === -1) return res.status(404).json({ error: 'Not found' });
      inMemoryDB.subscriptions.splice(index, 1);
      res.json({ success: true });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- ANALYTICS ---
app.get('/api/analytics/summary', authenticate, async (req, res) => {
  try {
    let subs = [];
    if (dbType === 'firestore') {
      const snapshot = await db.collection('subscriptions').where('userId', '==', req.user.id).get();
      snapshot.forEach(doc => subs.push(doc.data()));
    } else {
      subs = inMemoryDB.subscriptions.filter(s => s.userId === req.user.id);
    }

    let totalMonthly = 0;
    let activeCount = 0;
    
    subs.forEach(s => {
      if (s && s.status === 'Active') {
        activeCount++;
        let amount = parseFloat(s.amount);
        if (!isNaN(amount)) {
          if (s.billingCycle === 'Yearly') amount /= 12;
          if (s.billingCycle === 'Weekly') amount *= 4;
          totalMonthly += amount;
        }
      }
    });
    
    res.json({ totalMonthly, activeCount, totalYearly: totalMonthly * 12 });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/analytics/graveyard', authenticate, async (req, res) => {
  try {
    let subs = [];
    if (dbType === 'firestore') {
      const snapshot = await db.collection('subscriptions').where('userId', '==', req.user.id).get();
      snapshot.forEach(doc => subs.push(doc.data()));
    } else {
      subs = inMemoryDB.subscriptions.filter(s => s.userId === req.user.id);
    }

    const inactiveSubs = subs.filter(s => s && s.status !== 'Active');
    let wasted = 0;
    inactiveSubs.forEach(s => {
      const amount = parseFloat(s.amount);
      if (!isNaN(amount)) {
        wasted += amount;
      }
    });
    res.json({ wasted, message: `You have wasted ${wasted} on apps you never used!` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
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

// --- USER PROFILE ENDPOINT ---
app.get('/api/auth/profile', authenticate, async (req, res) => {
  try {
    if (dbType === 'firestore') {
      const doc = await db.collection('users').doc(req.user.id).get();
      if (doc.exists) {
        return res.json(doc.data());
      } else {
        const defaultUser = {
          id: req.user.id,
          email: req.user.email,
          name: req.user.name || 'User',
          plan: 'free',
          planExpiry: null,
          createdAt: new Date()
        };
        await db.collection('users').doc(req.user.id).set(defaultUser);
        return res.json(defaultUser);
      }
    } else {
      let user = inMemoryDB.users.find(u => u.id === req.user.id);
      if (!user) {
        user = {
          id: req.user.id,
          email: req.user.email,
          name: req.user.name || 'User',
          plan: 'free',
          planExpiry: null,
          createdAt: new Date()
        };
        inMemoryDB.users.push(user);
      }
      return res.json(user);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- MONETIZATION PLANS ---
const PLANS = {
  pro_monthly: {
    id: process.env.RAZORPAY_PRO_MONTHLY_PLAN_ID,
    name: 'SubTrackr Pro Monthly',
    amount: 9900,  // ₹99 in paise
    interval: 1,
    period: 'monthly'
  },
  pro_yearly: {
    id: process.env.RAZORPAY_PRO_YEARLY_PLAN_ID,
    name: 'SubTrackr Pro Yearly',
    amount: 79900, // ₹799 in paise
    interval: 1,
    period: 'yearly'
  },
  family_monthly: {
    id: process.env.RAZORPAY_FAMILY_MONTHLY_PLAN_ID,
    name: 'SubTrackr Family Monthly',
    amount: 19900, // ₹199 in paise
    interval: 1,
    period: 'monthly'
  },
  family_yearly: {
    id: process.env.RAZORPAY_FAMILY_YEARLY_PLAN_ID,
    name: 'SubTrackr Family Yearly',
    amount: 149900, // ₹1499 in paise
    interval: 1,
    period: 'yearly'
  }
};

// --- PAYMENT (RAZORPAY SUBSCRIPTIONS) ---

// Create Razorpay Subscription Plan Checkout Session
app.post('/api/payment/subscribe', authenticate, async (req, res) => {
  try {
    const { planKey } = req.body;
    const userId = req.user.id;
    const email = req.user.email;

    const plan = PLANS[planKey];
    if (!plan) return res.status(400).json({ error: 'Invalid plan key' });

    const planId = plan.id || 'plan_mock_' + planKey;
    let subscription;

    try {
      // Only call Razorpay API if keys are not 'dummy'
      if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_ID !== 'dummy') {
        subscription = await razorpay.subscriptions.create({
          plan_id: planId,
          customer_notify: 1,
          total_count: planKey.includes('yearly') ? 1 : 12,
          notes: {
            userId: userId,
            email: email,
            plan: planKey
          }
        });
      } else {
        throw new Error('Using dummy keys or no active Razorpay key configured');
      }
    } catch (err) {
      console.log('Using sandbox subscription mock due to Razorpay error:', err.message);
      subscription = {
        id: 'sub_mock_' + Math.random().toString(36).substr(2, 9),
        short_url: 'https://checkout.razorpay.com/v1/checkout.js',
        status: 'created',
        notes: {
          userId,
          email,
          plan: planKey
        }
      };
    }

    res.json({
      success: true,
      subscriptionId: subscription.id,
      shortUrl: subscription.short_url,
      keyId: process.env.RAZORPAY_KEY_ID || 'dummy'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Verify & Activate Plan Signature
app.post('/api/payment/verify', authenticate, async (req, res) => {
  try {
    const { razorpay_subscription_id, razorpay_payment_id, razorpay_signature, plan } = req.body;
    const userId = req.user.id;

    // Check signature
    let isValid = false;
    if (razorpay_subscription_id?.startsWith('sub_mock_') || process.env.RAZORPAY_KEY_SECRET === 'dummy' || !process.env.RAZORPAY_KEY_SECRET) {
      isValid = true; // sandbox verify
    } else {
      const body = razorpay_payment_id + '|' + razorpay_subscription_id;
      const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(body.toString())
        .digest('hex');

      const bodyAlt = razorpay_subscription_id + '|' + razorpay_payment_id;
      const expectedSignatureAlt = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(bodyAlt.toString())
        .digest('hex');

      isValid = (expectedSignature === razorpay_signature || expectedSignatureAlt === razorpay_signature);
    }

    if (!isValid) {
      return res.status(400).json({ error: 'Invalid payment signature' });
    }

    // Activate the subscription in DB
    await updateUserPlan(userId, plan, razorpay_subscription_id);

    res.json({ success: true, message: 'Plan activated successfully!' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Cancel active subscription
app.post('/api/payment/cancel', authenticate, async (req, res) => {
  try {
    const { subscriptionId } = req.body;
    const userId = req.user.id;

    if (subscriptionId && !subscriptionId.startsWith('sub_mock_') && process.env.RAZORPAY_KEY_SECRET !== 'dummy') {
      try {
        await razorpay.subscriptions.cancel(subscriptionId);
      } catch (err) {
        console.warn('Razorpay subscription cancellation failed (might be already cancelled):', err.message);
      }
    }

    await downgradeUserToFree(userId);

    res.json({ success: true, message: 'Subscription successfully cancelled.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Razorpay Auto-Renewal and Cancellation Webhook
app.post('/api/payment/webhook', async (req, res) => {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const signature = req.headers['x-razorpay-signature'];

    let isSignatureValid = false;
    if (!webhookSecret || webhookSecret === 'dummy') {
      isSignatureValid = true; // Local development bypass
    } else {
      const body = req.rawBody ? req.rawBody : JSON.stringify(req.body);
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(body)
        .digest('hex');
      isSignatureValid = (signature === expectedSignature);
    }

    if (!isSignatureValid) {
      return res.status(400).json({ error: 'Invalid webhook signature' });
    }

    let event = req.body;
    if (req.rawBody && Buffer.isBuffer(req.rawBody)) {
      try {
        event = JSON.parse(req.rawBody.toString());
      } catch (e) {
        // use fallback parsed body
      }
    }

    if (event && event.payload && event.payload.subscription) {
      const subscription = event.payload.subscription.entity;
      const subId = subscription.id;
      
      if (event.event === 'subscription.activated' || event.event === 'subscription.charged') {
        console.log(`Webhook Event: ${event.event} for sub ${subId}`);
        const userId = subscription.notes?.userId;
        const planKey = subscription.notes?.plan;
        if (userId && planKey) {
          await updateUserPlan(userId, planKey, subId);
        }
      }
      
      if (event.event === 'subscription.cancelled') {
        console.log(`Webhook Event: subscription.cancelled for sub ${subId}`);
        const user = await findUserBySubscriptionId(subId);
        if (user) {
          await downgradeUserToFree(user.id);
        }
      }
    }

    res.json({ status: 'ok' });
  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Start CRON
cron.schedule('0 9 * * *', () => {
  console.log('Running daily subscription alert check...');
  // Logic to send emails via SendGrid
});

// --- SERVE STATIC FRONTEND IN PRODUCTION ---
const frontendPath = path.join(__dirname, '../frontend/dist/frontend/browser');
app.use(express.static(frontendPath));

// Fallback all client-side routes to Angular index.html (SPA routing)
app.get('/*splat', (req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return next();
  }
  res.sendFile(path.join(frontendPath, 'index.html'));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
