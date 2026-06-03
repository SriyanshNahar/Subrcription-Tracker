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
const rateLimit = require('express-rate-limit');
const currencyService = require('./services/currency.service');
const taxService = require('./services/tax.service');

const app = express();
app.use(cors());

// Stripe Webhook Endpoint (MUST be configured BEFORE express.json() body parsing!)
app.post('/api/payment/stripe/webhook',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    console.log('🔔 WEBHOOK HIT');
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    
    let event;
    try {
      const sig = req.headers['stripe-signature'];
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.error('❌ Webhook signature failed:', err.message);
      return res.status(400).send('Webhook Error: ' + err.message);
    }

    console.log('✅ Event type:', event.type);

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      console.log('💰 PAYMENT COMPLETE!');
      console.log('Metadata:', JSON.stringify(session.metadata));
      console.log('Customer:', session.customer);
      console.log('Email:', session.customer_email);

      const userId = session.metadata?.userId;
      const planId = session.metadata?.planId;
      
      console.log('userId:', userId);
      console.log('planId:', planId);

      if (userId && planId) {
        try {
          await updateUserPlan(userId, planId, undefined, session.subscription, session.customer);
          console.log('✅ Plan updated:', userId, '->', planId);
        } catch(updateErr) {
          console.error('❌ Plan update failed:', updateErr.message);
        }
      } else {
        console.log('❌ metadata missing - searching by customer...');
        // Find user by stripeCustomerId
        try {
          const allUsers = inMemoryDB.users || [];
          const user = allUsers.find(
            u => u.stripeCustomerId === session.customer
          );
          if (user) {
            console.log('Found user by customerId:', user.id);
            // Get planId from subscription metadata
            const subId = session.subscription;
            if (subId) {
              const subscription = await stripe.subscriptions.retrieve(subId);
              const subPlanId = subscription.metadata?.planId || 'pro_monthly';
              console.log('Plan from subscription:', subPlanId);
              await updateUserPlan(user.id, subPlanId, undefined, subId, session.customer);
              console.log('✅ Plan updated via customer lookup');
            }
          } else {
            console.log('❌ User not found by customerId either');
          }
        } catch(lookupErr) {
          console.error('Lookup error:', lookupErr.message);
        }
      }
    }

    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object;
      const subId = subscription.id;

      // Find user by subscription ID
      let user = null;
      let found = false;
      if (dbType === 'firestore') {
        try {
          const snapshot = await db.collection('users').where('stripeSubscriptionId', '==', subId).limit(1).get();
          if (!snapshot.empty) {
            user = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
            found = true;
          }
        } catch (err) {
          console.error('⚠️ Firestore Stripe find by subId failed:', err.message);
        }
      }

      if (!found) {
        user = inMemoryDB.users.find(u => u && u.stripeSubscriptionId === subId);
      }

      if (user) {
        await downgradeUserToFree(user.id);
        console.log(`[STRIPE DELETED] Webhook downgraded user ${user.id} to free`);
      }
    }

    res.json({ received: true });
  }
);

app.use(express.json({
  limit: '10mb',
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Health check endpoint (Render Cold Start Fix)
app.get('/health', (req, res) => {
  res.json({ status: 'alive', timestamp: new Date().toISOString() });
});

// Self-ping Render every 10 minutes to keep active
const https = require('https');
const http = require('http');
setInterval(() => {
  const url = process.env.RENDER_URL;
  if (url) {
    const client = url.startsWith('https') ? https : http;
    client.get(`${url}/health`, () => {}).on('error', () => {});
  }
}, 10 * 60 * 1000);

// Rate Limiters (Fix 3)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests, please try again later' }
});

const whatsappLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 3,
  message: { error: 'WhatsApp test limit reached. Wait 1 minute.' }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many attempts. Try again in 15 minutes.' }
});

const captchaLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many captcha verification attempts. Please try again later.' }
});

app.use('/api/auth/register', authLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/verify-captcha', captchaLimiter);
app.use('/api/whatsapp/test', whatsappLimiter);
app.use('/api/', apiLimiter);

sgMail.setApiKey(process.env.SENDGRID_API_KEY || 'dummy');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'dummy',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'dummy'
});

// Initialize Firebase Admin
let db;
let dbType = 'memory';
let dbInitError = null;

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
    
    // Support Base64 Encoded keys to bypass environment variable escaping hurdles
    if (keyRaw.match(/^[A-Za-z0-9+/=]+$/) && !keyRaw.startsWith('{')) {
      try {
        const decoded = Buffer.from(keyRaw, 'base64').toString('utf8');
        if (decoded.trim().startsWith('{')) {
          keyRaw = decoded.trim();
          console.log('💡 AUTO-DECODE: Successfully decoded Base64-encoded Firebase Service Account Key!');
        }
      } catch (err) {
        console.warn('⚠️ Base64 decode check failed, treating key as raw string.', err.message);
      }
    }

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

    let serviceAccount;
    try {
      serviceAccount = JSON.parse(keyRaw);
    } catch (parseError) {
      // If parsing failed, try healing double escaped backslashes and quotes
      try {
        const healedKey = keyRaw.replace(/\\\\n/g, '\\n').replace(/\\"/g, '"');
        serviceAccount = JSON.parse(healedKey);
        console.log('💡 JSON HEALED: Successfully parsed healed service account JSON.');
      } catch (nestedError) {
        throw new Error(`JSON.parse failed: ${parseError.message}. Direct parse error: ${nestedError.message}`);
      }
    }
    
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
    console.log('🚀 SUCCESS: Firebase Admin Initialized. Checking Cloud Firestore database status...');

    // Asynchronously perform startup verification to check if the Firestore database is actually created/enabled (Fixes 5 NOT_FOUND warnings spam!)
    db.collection('users').limit(1).get()
      .then(() => {
        console.log('✅ Firestore validation query succeeded. Cloud Firestore database is active and persistent!');
      })
      .catch((err) => {
        if (err.message.includes('NOT_FOUND') || err.message.includes('not found') || err.code === 5) {
          dbType = 'memory';
          console.warn('\n⚠️  [FIRESTORE DATABASE NOT CREATED]  ⚠️');
          console.warn('Your Firebase credentials are valid, but the Cloud Firestore database has not been created yet in your Firebase Project.');
          console.warn('💡 ACTION REQUIRED: Go to Firebase Console -> click "Firestore Database" in the left sidebar -> click "Create Database" -> select test mode & region.');
          console.warn('🔄 Automatically downgraded database mode to "memory" (saving to database.json) to eliminate request latency and console warnings.\n');
        } else {
          console.warn('⚠️ Firestore initialization check returned a warning:', err.message);
        }
      });
  } else {
    throw new Error('No FIREBASE_SERVICE_ACCOUNT_KEY provided in environment variables.');
  }
} catch (error) {
  dbInitError = error.message;
  console.error('⚠️ DATABASE FALLBACK: Falling back to in-memory database due to error:', error.message);
  console.error(error.stack);
  console.log('💡 TIP: If this is production (Render), verify that FIREBASE_SERVICE_ACCOUNT_KEY is valid JSON.');
  dbType = 'memory';
}

const DB_FILE = path.join(__dirname, 'database.json');
let inMemoryDB = {
  users: [],
  subscriptions: [],
  alerts: [],
  payments: [],
  organizations: [],
  organization_members: [],
  organization_subscriptions: []
};

// Safely restore data from local storage
if (fs.existsSync(DB_FILE)) {
  try {
    const fileData = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    inMemoryDB = {
      users: fileData.users || [],
      subscriptions: fileData.subscriptions || [],
      alerts: fileData.alerts || [],
      payments: fileData.payments || [],
      organizations: fileData.organizations || [],
      organization_members: fileData.organization_members || [],
      organization_subscriptions: fileData.organization_subscriptions || []
    };
    console.log('📦 SUCCESS: Restored local persistent backup from database.json');
  } catch (err) {
    console.error('⚠️ database.json parse failed, resetting to empty schema:', err.message);
  }
}

// Commit local changes to file backup
const saveLocalDB = () => {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(inMemoryDB, null, 2), 'utf8');
  } catch (err) {
    console.error('⚠️ Failed to save persistent database.json backup:', err.message);
  }
};

// Remove undefined fields before Firestore save
function removeUndefined(obj) {
  return Object.fromEntries(
    Object.entries(obj).filter(([_, v]) => v !== undefined)
  );
}

// --- DATABASE PLAN HELPERS ---
const updateUserPlan = async (userId, planKey, razorpaySubscriptionId, stripeSubscriptionId, stripeCustomerId) => {
  const planName = planKey.includes('corporate') ? 'corporate' : (planKey.includes('family') ? 'family' : (planKey.includes('student') ? 'student' : 'pro'));
  const durationDays = planKey.includes('yearly') ? 365 : 30;
  const planExpiry = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);

  let success = false;
  if (dbType === 'firestore') {
    try {
      const cleanData = removeUndefined({
        plan: planName,
        planExpiry: planExpiry,
        razorpaySubscriptionId: razorpaySubscriptionId,
        stripeSubscriptionId: stripeSubscriptionId,
        stripeCustomerId: stripeCustomerId,
        updatedAt: new Date()
      });
      await db.collection('users').doc(userId).update(cleanData);
      success = true;
    } catch (err) {
      console.error('⚠️ Firestore updateUserPlan failed, falling back to memory:', err.message);
    }
  }

  if (!success) {
    let user = inMemoryDB.users.find(u => u && u.id === userId);
    if (!user) {
      user = { id: userId, createdAt: new Date() };
      inMemoryDB.users.push(user);
    }
    user.plan = planName;
    user.planExpiry = planExpiry;
    if (razorpaySubscriptionId !== undefined) user.razorpaySubscriptionId = razorpaySubscriptionId;
    if (stripeSubscriptionId !== undefined) user.stripeSubscriptionId = stripeSubscriptionId;
    if (stripeCustomerId !== undefined) user.stripeCustomerId = stripeCustomerId;
    user.updatedAt = new Date();
    saveLocalDB();
  }
  console.log(`Plan ${planName} activated for user ${userId}`);
};

const downgradeUserToFree = async (userId) => {
  let success = false;
  if (dbType === 'firestore') {
    try {
      await db.collection('users').doc(userId).set({
        plan: 'free',
        razorpaySubscriptionId: null,
        planExpiry: null,
        updatedAt: new Date()
      }, { merge: true });
      success = true;
    } catch (err) {
      console.error('⚠️ Firestore downgradeUserToFree failed, falling back to memory:', err.message);
    }
  }

  if (!success) {
    let user = inMemoryDB.users.find(u => u && u.id === userId);
    if (user) {
      user.plan = 'free';
      user.razorpaySubscriptionId = null;
      user.planExpiry = null;
      user.updatedAt = new Date();
      saveLocalDB();
    }
  }
  console.log(`Plan downgraded to free for user ${userId}`);
};

const findUserBySubscriptionId = async (subscriptionId) => {
  if (dbType === 'firestore') {
    try {
      const snapshot = await db.collection('users').where('razorpaySubscriptionId', '==', subscriptionId).limit(1).get();
      if (!snapshot.empty) {
        return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
      }
      return null;
    } catch (err) {
      console.error('⚠️ Firestore findUserBySubscriptionId failed, falling back to memory:', err.message);
    }
  }
  return inMemoryDB.users.find(u => u.razorpaySubscriptionId === subscriptionId) || null;
};

const updateUserStripeCustomer = async (userId, stripeCustomerId) => {
  let success = false;
  if (dbType === 'firestore') {
    try {
      await db.collection('users').doc(userId).set({
        stripeCustomerId,
        updatedAt: new Date()
      }, { merge: true });
      success = true;
    } catch (err) {
      console.error('⚠️ Firestore updateUserStripeCustomer failed, falling back to memory:', err.message);
    }
  }

  // Always keep a warm copy in memory database
  let user = inMemoryDB.users.find(u => u && u.id === userId);
  if (!user) {
    user = { id: userId, createdAt: new Date() };
    inMemoryDB.users.push(user);
  }
  user.stripeCustomerId = stripeCustomerId;
  user.updatedAt = new Date();
  saveLocalDB();
  console.log(`Stripe customer ID updated to ${stripeCustomerId} for user ${userId}`);
};


// Middleware for auth
const authenticate = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    let decoded;
    if (dbType === 'firestore') {
      try {
        decoded = await admin.auth().verifyIdToken(token);
      } catch (err) {
        console.warn('⚠️ Firebase token verification failed, trying decode fallback:', err.message);
        decoded = jwt.decode(token);
        if (!decoded) {
          throw err;
        }
      }
    } else {
      try {
        decoded = jwt.verify(token, process.env.JWT_SECRET || 'supersecretjwtkey123');
      } catch (err) {
        // If local verification fails, try decoding as Firebase Token
        decoded = jwt.decode(token);
      }
    }
    
    if (!decoded) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    // Extract a guaranteed user id from claims
    const userId = decoded.uid || decoded.sub || decoded.id;
    if (!userId) {
      return res.status(401).json({ error: 'Invalid token: user identifier (uid/sub/id) not found' });
    }
    
    // Copy to a new extensible object to bypass frozen objects from Firebase verifyIdToken
    req.user = { ...decoded, id: String(userId) };
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

const resolveName = (user) => {
  if (user.name) return user.name;
  if (user.displayName) return user.displayName;
  if (user.email) {
    const parts = user.email.split('@')[0].split(/[\.\-_]/);
    return parts.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
  }
  return 'User';
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
  
  try {
    let existingUser = null;
    let usedFirestore = false;
    if (dbType === 'firestore') {
      try {
        const snapshot = await db.collection('users').where('email', '==', email).limit(1).get();
        if (!snapshot.empty) {
          existingUser = snapshot.docs[0].data();
        }
        usedFirestore = true;
      } catch (err) {
        console.error('⚠️ Firestore register check failed, falling back to memory:', err.message);
      }
    }
    
    if (!usedFirestore) {
      existingUser = inMemoryDB.users.find(u => u.email === email);
    }
    
    if (existingUser) return res.status(400).json({ error: 'User already exists' });
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = Date.now().toString();
    const newUser = {
      id: userId,
      name,
      email,
      password: hashedPassword,
      plan: 'free',
      currency: 'INR',
      createdAt: new Date()
    };
    
    let savedToFirestore = false;
    if (dbType === 'firestore') {
      try {
        await db.collection('users').doc(userId).set(newUser);
        savedToFirestore = true;
      } catch (err) {
        console.error('⚠️ Firestore register save failed, falling back to memory:', err.message);
      }
    }
    
    // Always keep a warm copy in memory database
    const memIndex = inMemoryDB.users.findIndex(u => u.email === email);
    if (memIndex === -1) {
      inMemoryDB.users.push(newUser);
    } else {
      inMemoryDB.users[memIndex] = newUser;
    }
    saveLocalDB();
    
    const token = jwt.sign(
      { id: newUser.id, email: newUser.email, name: newUser.name }, 
      process.env.JWT_SECRET || 'supersecretjwtkey123'
    );
    res.json({ token, user: { id: newUser.id, name: newUser.name, email: newUser.email, plan: newUser.plan } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Missing email or password' });
  
  try {
    let user = null;
    let fetchedFromFirestore = false;
    if (dbType === 'firestore') {
      try {
        const snapshot = await db.collection('users').where('email', '==', email).limit(1).get();
        if (!snapshot.empty) {
          user = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
        }
        fetchedFromFirestore = true;
      } catch (err) {
        console.error('⚠️ Firestore login query failed, falling back to memory:', err.message);
      }
    }
    
    if (!fetchedFromFirestore || !user) {
      user = inMemoryDB.users.find(u => u.email === email);
    }
    
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid password' });
    
    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name }, 
      process.env.JWT_SECRET || 'supersecretjwtkey123'
    );
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, plan: user.plan } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- SUBSCRIPTIONS ROUTES ---
app.get('/api/subscriptions', authenticate, async (req, res) => {
  try {
    if (dbType === 'firestore') {
      try {
        const snapshot = await db.collection('subscriptions').where('userId', '==', req.user.id).get();
        const subs = [];
        snapshot.forEach(doc => subs.push({ id: doc.id, ...doc.data() }));
        return res.json(subs);
      } catch (err) {
        console.error('⚠️ Firestore getSubscriptions failed, falling back to memory:', err.message);
      }
    }
    
    const subs = inMemoryDB.subscriptions.filter(s => s.userId === req.user.id);
    res.json(subs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/subscriptions', authenticate, async (req, res) => {
  try {
    // 1. Fetch user's plan
    let userPlan = 'free';
    let planFetched = false;
    if (dbType === 'firestore') {
      try {
        const userDoc = await db.collection('users').doc(req.user.id).get();
        if (userDoc.exists) {
          userPlan = userDoc.data().plan || 'free';
        }
        planFetched = true;
      } catch (err) {
        console.error('⚠️ Firestore getUserPlan failed, falling back to memory:', err.message);
      }
    }
    
    if (!planFetched) {
      const user = inMemoryDB.users.find(u => u && u.id === req.user.id);
      if (user) {
        userPlan = user.plan || 'free';
      }
    }

    // 2. Enforce subscription tier limits (Free: 3, Pro: 15, Family: Unlimited)
    let subsCount = 0;
    let counted = false;
    if (dbType === 'firestore') {
      try {
        const snapshot = await db.collection('subscriptions').where('userId', '==', req.user.id).get();
        subsCount = snapshot.size;
        counted = true;
      } catch (err) {
        console.error('⚠️ Firestore countSubs failed, falling back to memory:', err.message);
      }
    }
    
    if (!counted) {
      subsCount = inMemoryDB.subscriptions.filter(s => s.userId === req.user.id).length;
    }

    if (userPlan === 'free' && subsCount >= 3) {
      return res.status(403).json({
        error: 'Starter Free plan limit reached (max 3 subscriptions). Please upgrade to Student (6) or Premium Pro (20)!'
      });
    }

    if (userPlan === 'student' && subsCount >= 6) {
      return res.status(403).json({
        error: 'Student plan limit reached (max 6 subscriptions). Please upgrade to Premium Pro (20) or Shared Family for unlimited tracking!'
      });
    }

    if (userPlan === 'pro' && subsCount >= 20) {
      return res.status(403).json({
        error: 'Premium Pro plan limit reached (max 20 subscriptions). Please upgrade to Shared Family for unlimited tracking!'
      });
    }

    // 3. Save subscription
    if (dbType === 'firestore') {
      try {
        const docRef = await db.collection('subscriptions').add({
          ...req.body,
          userId: req.user.id,
          createdAt: new Date()
        });
        
        // Also save to memory backup
        const sub = { ...req.body, id: docRef.id, userId: req.user.id, createdAt: new Date() };
        inMemoryDB.subscriptions.push(sub);
        saveLocalDB();
        
        return res.json(sub);
      } catch (err) {
        console.error('⚠️ Firestore addSubscription failed, falling back to memory:', err.message);
      }
    }
    
    const sub = { ...req.body, id: Date.now().toString(), userId: req.user.id, createdAt: new Date() };
    inMemoryDB.subscriptions.push(sub);
    saveLocalDB();
    res.json(sub);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/subscriptions/:id', authenticate, async (req, res) => {
  try {
    if (dbType === 'firestore') {
      try {
        await db.collection('subscriptions').doc(req.params.id).update(req.body);
        
        // Also sync memory copy
        const index = inMemoryDB.subscriptions.findIndex(s => s.id === req.params.id && s.userId === req.user.id);
        if (index !== -1) {
          inMemoryDB.subscriptions[index] = { ...inMemoryDB.subscriptions[index], ...req.body };
          saveLocalDB();
        }
        
        return res.json({ id: req.params.id, ...req.body });
      } catch (err) {
        console.error('⚠️ Firestore updateSubscription failed, falling back to memory:', err.message);
      }
    }
    
    const index = inMemoryDB.subscriptions.findIndex(s => s.id === req.params.id && s.userId === req.user.id);
    if (index === -1) return res.status(404).json({ error: 'Not found' });
    inMemoryDB.subscriptions[index] = { ...inMemoryDB.subscriptions[index], ...req.body };
    saveLocalDB();
    res.json(inMemoryDB.subscriptions[index]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/subscriptions/:id', authenticate, async (req, res) => {
  try {
    if (dbType === 'firestore') {
      try {
        await db.collection('subscriptions').doc(req.params.id).delete();
        
        // Also delete from memory copy
        const index = inMemoryDB.subscriptions.findIndex(s => s.id === req.params.id && s.userId === req.user.id);
        if (index !== -1) {
          inMemoryDB.subscriptions.splice(index, 1);
          saveLocalDB();
        }
        
        return res.json({ success: true });
      } catch (err) {
        console.error('⚠️ Firestore deleteSubscription failed, falling back to memory:', err.message);
      }
    }
    
    const index = inMemoryDB.subscriptions.findIndex(s => s.id === req.params.id && s.userId === req.user.id);
    if (index === -1) return res.status(404).json({ error: 'Not found' });
    inMemoryDB.subscriptions.splice(index, 1);
    saveLocalDB();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- ANALYTICS ---
app.get('/api/analytics/summary', authenticate, async (req, res) => {
  try {
    let subs = [];
    let fetched = false;
    if (dbType === 'firestore') {
      try {
        const snapshot = await db.collection('subscriptions').where('userId', '==', req.user.id).get();
        snapshot.forEach(doc => subs.push(doc.data()));
        fetched = true;
      } catch (err) {
        console.error('⚠️ Firestore getAnalyticsSummary failed, falling back to memory:', err.message);
      }
    }
    
    if (!fetched) {
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
    let fetched = false;
    if (dbType === 'firestore') {
      try {
        const snapshot = await db.collection('subscriptions').where('userId', '==', req.user.id).get();
        snapshot.forEach(doc => subs.push(doc.data()));
        fetched = true;
      } catch (err) {
        console.error('⚠️ Firestore getGraveyard failed, falling back to memory:', err.message);
      }
    }
    
    if (!fetched) {
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
      try {
        const doc = await db.collection('users').doc(req.user.id).get();
        if (doc.exists) {
          const profile = doc.data();
          
          // Query B2B organization memberships dynamically (CRITICAL BUG FIX)
          let orgId = null;
          let orgRole = null;
          try {
            const memberSnap = await db.collection('organization_members')
              .where('userId', '==', req.user.id)
              .where('status', '==', 'active')
              .limit(1)
              .get();
            if (!memberSnap.empty) {
              orgId = memberSnap.docs[0].data().orgId;
              orgRole = memberSnap.docs[0].data().role;
            }
          } catch (orgErr) {
            console.error('Failed to query B2B org membership in profile fetch:', orgErr.message);
          }

          const profileWithB2B = {
            id: doc.id,
            ...profile,
            orgId,
            orgRole
          };

          // Keep memory warm copy
          const memIndex = inMemoryDB.users.findIndex(u => u && u.id === req.user.id);
          if (memIndex === -1) {
            inMemoryDB.users.push(profileWithB2B);
          } else {
            inMemoryDB.users[memIndex] = profileWithB2B;
          }
          saveLocalDB();
          
          return res.json(profileWithB2B);
        } else {
          const defaultUser = {
            id: req.user.id,
            email: req.user.email,
            name: resolveName(req.user),
            plan: 'free',
            planExpiry: null,
            createdAt: new Date(),
            orgId: null,
            orgRole: null
          };
          await db.collection('users').doc(req.user.id).set(defaultUser);
          
          // Also save in memory copy
          inMemoryDB.users.push(defaultUser);
          saveLocalDB();
          
          return res.json(defaultUser);
        }
      } catch (err) {
        console.error('⚠️ Firestore getProfile failed, falling back to memory:', err.message);
      }
    }
    
    let user = inMemoryDB.users.find(u => u && u.id === req.user.id);
    if (!user) {
      user = {
        id: req.user.id,
        email: req.user.email,
        name: resolveName(req.user),
        plan: 'free',
        planExpiry: null,
        createdAt: new Date(),
        orgId: null,
        orgRole: null
      };
      inMemoryDB.users.push(user);
      saveLocalDB();
    }

    // Resolve B2B organization memberships dynamically in memory mode
    const member = inMemoryDB.organization_members.find(
      m => m.userId === req.user.id && m.status === 'active'
    );

    const profileWithB2B = {
      ...user,
      orgId: member ? member.orgId : null,
      orgRole: member ? member.role : null
    };

    return res.json(profileWithB2B);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/auth/profile', authenticate, async (req, res) => {
  const { name, photoURL, currency, country, phone, whatsappEnabled, whatsappPreferences } = req.body;
  const userId = req.user.id;
  
  try {
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (photoURL !== undefined) updateData.photoURL = photoURL;
    if (currency !== undefined) updateData.currency = currency;
    if (country !== undefined) updateData.country = country;
    if (phone !== undefined) updateData.phone = phone;
    if (whatsappEnabled !== undefined) updateData.whatsappEnabled = whatsappEnabled;
    if (whatsappPreferences !== undefined) updateData.whatsappPreferences = whatsappPreferences;
    updateData.updatedAt = new Date();
    
    if (dbType === 'firestore') {
      try {
        await db.collection('users').doc(userId).set(updateData, { merge: true });
      } catch (err) {
        console.error('⚠️ Firestore profile update failed, syncing to memory:', err.message);
      }
    }
    
    // Warm backup in memory
    let user = inMemoryDB.users.find(u => u && u.id === userId);
    if (!user) {
      user = { id: userId, createdAt: new Date() };
      inMemoryDB.users.push(user);
    }
    if (name !== undefined) user.name = name;
    if (photoURL !== undefined) user.photoURL = photoURL;
    if (currency !== undefined) user.currency = currency;
    if (country !== undefined) user.country = country;
    if (phone !== undefined) user.phone = phone;
    if (whatsappEnabled !== undefined) user.whatsappEnabled = whatsappEnabled;
    if (whatsappPreferences !== undefined) user.whatsappPreferences = whatsappPreferences;
    user.updatedAt = new Date();
    saveLocalDB();
    
    // Fetch latest profile
    let updatedProfile = { ...user };
    if (dbType === 'firestore') {
      try {
        const doc = await db.collection('users').doc(userId).get();
        if (doc.exists) {
          updatedProfile = { id: doc.id, ...doc.data() };
        }
      } catch (err) {
        // Fallback to memory
      }
    }
    
    res.json(updatedProfile);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- MONETIZATION PLANS ---
const PLANS = {
  pro_monthly: {
    id: process.env.RAZORPAY_PRO_MONTHLY_PLAN_ID || process.env.RAZORPAY_PLAN_PRO_MONTHLY,
    name: 'Vaultly Pro Monthly',
    amount: 9900,  // ₹99 in paise
    interval: 1,
    period: 'monthly'
  },
  pro_yearly: {
    id: process.env.RAZORPAY_PRO_YEARLY_PLAN_ID || process.env.RAZORPAY_PLAN_PRO_YEARLY,
    name: 'Vaultly Pro Yearly',
    amount: 79900, // ₹799 in paise
    interval: 1,
    period: 'yearly'
  },
  student_monthly: {
    id: process.env.RAZORPAY_STUDENT_MONTHLY_PLAN_ID,
    stripePriceId: process.env.STRIPE_PRICE_STUDENT_MONTHLY,
    name: 'Vaultly Student Monthly',
    amount: 4900,  // ₹49 in paise
    interval: 1,
    period: 'monthly'
  },
  student_yearly: {
    id: process.env.RAZORPAY_STUDENT_YEARLY_PLAN_ID,
    stripePriceId: process.env.STRIPE_PRICE_STUDENT_YEARLY,
    name: 'Vaultly Student Yearly',
    amount: 39900, // ₹399 in paise
    interval: 1,
    period: 'yearly'
  },
  family_monthly: {
    id: process.env.RAZORPAY_FAMILY_MONTHLY_PLAN_ID,
    name: 'Vaultly Family Monthly',
    amount: 19900, // ₹199 in paise
    interval: 1,
    period: 'monthly'
  },
  family_yearly: {
    id: process.env.RAZORPAY_FAMILY_YEARLY_PLAN_ID,
    name: 'Vaultly Family Yearly',
    amount: 149900, // ₹1499 in paise
    interval: 1,
    period: 'yearly'
  },
  corporate_monthly: {
    id: process.env.RAZORPAY_CORPORATE_MONTHLY_PLAN_ID,
    name: 'Vaultly Corporate Monthly',
    amount: 99900, // ₹999 in paise
    interval: 1,
    period: 'monthly'
  },
  corporate_yearly: {
    id: process.env.RAZORPAY_CORPORATE_YEARLY_PLAN_ID,
    name: 'Vaultly Corporate Yearly',
    amount: 799900, // ₹7999 in paise
    interval: 1,
    period: 'yearly'
  }
};

// --- PAYMENT (RAZORPAY & STRIPE SUBSCRIPTIONS) ---

// Create Stripe Subscription Plan Checkout Session
app.post('/api/payment/stripe/subscribe', authenticate, async (req, res) => {
  try {
    const { planId, userEmail, country } = req.body;
    const userId = req.user.id;

    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

    // Map plans to Stripe Price IDs
    const planMap = {
      'pro_monthly': process.env.STRIPE_PRICE_PRO,
      'pro_yearly': process.env.STRIPE_PRICE_PRO,
      'solo_monthly': process.env.STRIPE_PRICE_SOLO,
      'team_monthly': process.env.STRIPE_PRICE_TEAM,
      'student_monthly': process.env.STRIPE_PRICE_STUDENT_MONTHLY,
      'student_yearly': process.env.STRIPE_PRICE_STUDENT_YEARLY,
      'family_monthly': process.env.STRIPE_PRICE_TEAM,
      'family_yearly': process.env.STRIPE_PRICE_TEAM,
      'corporate_monthly': process.env.STRIPE_PRICE_TEAM,
      'corporate_yearly': process.env.STRIPE_PRICE_TEAM
    };

    const priceId = planMap[planId];
    console.log('PriceId for plan:', planId, '->', priceId);
    if (!priceId) {
      return res.status(400).json({ error: 'Invalid plan: ' + planId });
    }

    // 1. Get or Create Stripe Customer ID
    let user = null;
    let fetched = false;
    if (dbType === 'firestore') {
      try {
        const doc = await db.collection('users').doc(userId).get();
        if (doc.exists) {
          user = doc.data();
          fetched = true;
        }
      } catch (err) {
        console.error('⚠️ Firestore Stripe user fetch failed:', err.message);
      }
    }

    if (!fetched) {
      user = inMemoryDB.users.find(u => u && u.id === userId);
    }

    let stripeCustomerId = user ? user.stripeCustomerId : null;

    // Always verify customer exists in current Stripe account
    if (stripeCustomerId) {
      try {
        await stripe.customers.retrieve(stripeCustomerId);
      } catch (customerErr) {
        // Customer not found in this Stripe account
        // Clear the stale ID and create a new one
        console.log('Stale customer ID detected, creating new customer...');
        stripeCustomerId = null;
      }
    }

    // Create new customer if needed
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: userEmail || req.user.email,
        metadata: { userId: userId }
      });
      stripeCustomerId = customer.id;
      // Save new customer ID to database
      await updateUserStripeCustomer(userId, stripeCustomerId);
    }


    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      metadata: {
        userId: req.user.id,
        planId: planId
      },
      subscription_data: {
        metadata: {
          userId: req.user.id,
          planId: planId
        }
      },
      success_url: `${process.env.FRONTEND_URL || 'http://localhost:4200'}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:4200'}/pricing`,
    });

    console.log('Session created:', session.id);
    console.log('Session metadata:', session.metadata);


    console.log('Stripe checkout URL:', session.url);
    return res.json({ 
      success: true, 
      checkoutUrl: session.url 
    });
  } catch(err) {
    console.error('Stripe FULL error:', err);
    console.error('Stripe error type:', err.type);
    console.error('Stripe error code:', err.code);
    console.error('Stripe error message:', err.message);
    return res.status(500).json({ 
      error: 'Stripe checkout failed', 
      details: err.message,
      code: err.code
    });
  }
});

// Cancel Stripe Subscription
app.post('/api/payment/stripe/cancel', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    let user = null;
    let fetched = false;

    if (dbType === 'firestore') {
      try {
        const doc = await db.collection('users').doc(userId).get();
        if (doc.exists) {
          user = doc.data();
          fetched = true;
        }
      } catch (err) {
        console.error('⚠️ Firestore user fetch failed:', err.message);
      }
    }

    if (!fetched) {
      user = inMemoryDB.users.find(u => u && u.id === userId);
    }

    const subId = user ? user.stripeSubscriptionId : null;

    if (subId && !subId.startsWith('sub_mock_') && process.env.STRIPE_SECRET_KEY && process.env.STRIPE_SECRET_KEY !== 'dummy') {
      try {
        const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
        await stripe.subscriptions.cancel(subId);
      } catch (err) {
        console.warn('Stripe subscription cancellation failed (might be already cancelled):', err.message);
      }
    }

    await downgradeUserToFree(userId);
    res.json({ success: true, message: 'Subscription successfully cancelled.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

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

    let isValid = false;
    if (razorpay_subscription_id?.startsWith('sub_mock_') || process.env.RAZORPAY_KEY_SECRET === 'dummy' || !process.env.RAZORPAY_KEY_SECRET) {
      isValid = true;
    } else {
      const crypto = require('crypto');
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

// --- PING & AI ROI-SCORES ROUTES ---

// Ping subscription cards to log usage
app.get('/api/subscriptions/:id/ping', authenticate, async (req, res) => {
  try {
    const subId = req.params.id;
    const updateData = { lastUsedAt: new Date().toISOString() };

    let success = false;
    if (dbType === 'firestore') {
      try {
        await db.collection('subscriptions').doc(subId).update(updateData);
        success = true;
      } catch (err) {
        console.error('⚠️ Firestore ping update failed:', err.message);
      }
    }

    const index = inMemoryDB.subscriptions.findIndex(s => s && s.id === subId && s.userId === req.user.id);
    if (index !== -1) {
      inMemoryDB.subscriptions[index].lastUsedAt = updateData.lastUsedAt;
      saveLocalDB();
      success = true;
    }

    if (!success) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    res.json({ success: true, lastUsedAt: updateData.lastUsedAt });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Calculate ROI Scores (1-10) dynamically
app.get('/api/analytics/roi-scores', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;

    // Fetch subscriptions
    let subs = [];
    if (dbType === 'firestore') {
      const snapshot = await db.collection('subscriptions').where('userId', '==', userId).get();
      snapshot.forEach(doc => subs.push({ id: doc.id, ...doc.data() }));
    } else {
      subs = inMemoryDB.subscriptions.filter(s => s && s.userId === userId);
    }

    const results = [];

    for (const sub of subs) {
      let usagePoints = 0;
      let costPoints = 0;
      let statusPoints = 0;

      // a) Usage Points based on lastUsedAt
      const lastUsed = sub.lastUsedAt;
      let diffDays = Infinity;
      if (lastUsed) {
        const diffMs = Date.now() - new Date(lastUsed).getTime();
        diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      }

      if (diffDays === 0) {
        usagePoints = 4; // Used today
      } else if (diffDays <= 7) {
        usagePoints = 3; // Used this week
      } else if (diffDays <= 30) {
        usagePoints = 2; // Used this month
      } else {
        usagePoints = 0; // Not used in 30+ days
      }

      // b) Cost Points based on USD converted cost
      let amount = parseFloat(sub.amount) || 0;
      const billingCycle = (sub.billingCycle || 'Monthly').toLowerCase();
      
      // Normalize billing cycle to monthly
      if (billingCycle === 'yearly') amount = amount / 12;
      else if (billingCycle === 'weekly') amount = amount * 4;

      // Convert pricing dynamically to USD via currency service
      const amountInUSD = await currencyService.convertAmount(amount, sub.currency || 'INR', 'USD');

      if (amountInUSD < 5) {
        costPoints = 3;
      } else if (amountInUSD >= 5 && amountInUSD <= 20) {
        costPoints = 2;
      } else if (amountInUSD > 20 && amountInUSD <= 50) {
        costPoints = 1;
      } else {
        costPoints = 0;
      }

      // c) Status Points
      const status = sub.status || 'Active';
      if (status === 'Active' || status === 'active') {
        statusPoints = 2;
      } else if (status === 'Want to Cancel') {
        statusPoints = 0;
      } else {
        statusPoints = -1; // Inactive
      }

      // Calculate score with +1 offset and clamp
      const rawScore = usagePoints + costPoints + statusPoints;
      const score = Math.min(10, Math.max(1, rawScore + 1));

      // Tailored recommendation and reasoning strings
      let reason = '';
      let recommendation = '';

      if (score >= 8) {
        reason = `Highly cost efficient and regularly used.`;
        recommendation = `Daily use detected — Great value! Keep it.`;
      } else if (score >= 4) {
        const dayStr = diffDays === Infinity ? '30+' : diffDays;
        reason = `Not actively used recently (last seen ${dayStr} days ago).`;
        recommendation = `Not used in ${dayStr} days — Consider pausing.`;
      } else {
        reason = `Extremely high cost or completely neglected usage patterns.`;
        recommendation = `Rarely used + high cost — Cancel this.`;
      }

      results.push({
        subscriptionId: sub.id,
        name: sub.name,
        amount: sub.amount,
        currency: sub.currency || 'INR',
        score,
        reason,
        recommendation
      });
    }

    res.json(results);
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

// --- B2B CORPORATE, WHATSAPP, & GMAIL ROUTERS ---
const organizationRoutes = require('./routes/organization');
const whatsappRoutes = require('./routes/whatsapp');
const gmailRoutes = require('./routes/gmail');
app.use('/api/org', authenticate, organizationRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/gmail', gmailRoutes);

// Start modular CRON jobs schedule
const { startDailyAlertJob, startMonthlySummaryJob } = require('./jobs/alert.cron');
startDailyAlertJob();
startMonthlySummaryJob();

// --- SERVE STATIC FRONTEND IN PRODUCTION ---
const frontendPath = path.join(__dirname, '../frontend/dist/frontend/browser');
app.use(express.static(frontendPath));

// --- SYSTEM DIAGNOSTICS ---
app.get('/api/system/status', (req, res) => {
  res.json({
    dbType: dbType,
    status: dbType === 'firestore' ? 'healthy' : 'warning',
    message: dbType === 'firestore' 
      ? 'Connected to Google Firestore. Data is persistent.' 
      : 'Running in ephemeral in-memory mode. Data will be lost on server restart or redeploy.',
    firebaseProjectId: dbType === 'firestore' ? (db?.projectId || 'subtrackr-b11eb') : null,
    dbInitError: dbInitError
  });
});

// Fallback all client-side routes to Angular index.html (SPA routing)
app.get('/*splat', (req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return next();
  }
  res.sendFile(path.join(frontendPath, 'index.html'));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log('Stripe mode:', process.env.STRIPE_SECRET_KEY?.startsWith('sk_test') ? 'TEST' : 'LIVE');
});

// Export database primitives dynamically using getter functions (Fixes Circular Dependency!)
module.exports = {
  db: () => db,
  getDbType: () => dbType,
  inMemoryDB,
  saveLocalDB,
  admin,
  authenticate
};
