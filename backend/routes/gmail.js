const express = require('express');
const router = express.Router();
const { google } = require('googleapis');

// Helper to resolve the database context dynamically at request-time (immunizes against circular imports!)
const getDbCtx = () => {
  const index = require('../index');
  return {
    db: index.db(),
    dbType: index.getDbType(),
    inMemoryDB: index.inMemoryDB,
    saveLocalDB: index.saveLocalDB,
    admin: index.admin,
    authenticate: index.authenticate // Resolve authenticate middleware dynamically!
  };
};

const authenticate = (req, res, next) => {
  const dbCtx = getDbCtx();
  if (!dbCtx.authenticate) {
    return res.status(500).json({ error: 'Authentication middleware not loaded yet.' });
  }
  return dbCtx.authenticate(req, res, next);
};

const getOAuthClient = () => {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/api/gmail/callback'
  );
};

// 1. GET /api/gmail/auth - Generates Auth Redirect URL
router.get('/auth', authenticate, (req, res) => {
  try {
    const oauth2Client = getOAuthClient();
    const scopes = ['https://www.googleapis.com/auth/gmail.readonly'];
    
    // Encode user id into state base64 to securely pass across OAuth redirect
    const state = Buffer.from(JSON.stringify({ 
      userId: req.user.id 
    })).toString('base64');

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline', // crucial for getting refresh_token
      scope: scopes,
      prompt: 'consent',
      state: state
    });

    res.json({ success: true, url: authUrl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. GET /api/gmail/callback - Google OAuth Redirect Target
router.get('/callback', async (req, res) => {
  const { code, state } = req.query;
  if (!code) {
    return res.status(400).send('<h3>Authorization code missing from redirect callback parameters</h3>');
  }

  try {
    const oauth2Client = getOAuthClient();
    const { tokens } = await oauth2Client.getToken(code);
    
    // Storing tokens in both Firestore or InMemoryDB depending on config
    const dbCtx = getDbCtx();
    
    // Decode user id from base64 state parameter
    let userId = null;
    if (state) {
      try {
        const decodedState = JSON.parse(Buffer.from(state, 'base64').toString());
        userId = decodedState.userId;
      } catch (e) {
        // Fallback for legacy state format
        userId = state;
      }
    }
    
    if (!userId || userId === 'state') {
      return res.redirect(
        `${process.env.FRONTEND_URL || 'http://localhost:4200'}/dashboard?gmail=connected`
      );
    }

    const updates = {
      gmailAccessToken: tokens.access_token,
      updatedAt: new Date()
    };
    if (tokens.refresh_token) {
      updates.gmailRefreshToken = tokens.refresh_token;
    }

    let synced = false;
    if (dbCtx.dbType === 'firestore') {
      try {
        await dbCtx.db.collection('users').doc(userId).set(updates, { merge: true });
        synced = true;
      } catch (err) {
        console.error('⚠️ Firestore token save failed, syncing to memory:', err.message);
      }
    }

    if (!synced) {
      const user = dbCtx.inMemoryDB.users.find(u => u && u.id === userId);
      if (user) {
        user.gmailAccessToken = tokens.access_token;
        if (tokens.refresh_token) {
          user.gmailRefreshToken = tokens.refresh_token;
        }
        user.updatedAt = new Date();
        dbCtx.saveLocalDB();
      }
    }

    res.redirect(
      `${process.env.FRONTEND_URL || 'http://localhost:4200'}/dashboard?gmail=connected`
    );
  } catch (err) {
    console.error('Google OAuth callback error:', err);
    res.status(500).send(`<h3>Authorization failed: ${err.message}</h3>`);
  }
});

const extractCompany = (fromHeader, subjectHeader) => {
  const text = `${fromHeader} ${subjectHeader}`.toLowerCase();
  const popularServices = [
    'netflix', 'spotify', 'adobe', 'figma', 'notion', 'canva', 'github', 
    'slack', 'zoom', 'dropbox', 'grammarly', 'linkedin', 'youtube', 'disney', 
    'hulu', 'hbo', 'apple', 'google', 'microsoft', 'aws', 'heroku', 'digitalocean', 
    'openai', 'chatgpt', 'midjourney', 'cursor', 'copilot', 'uber', 'prime video', 
    'amazon', 'audible', 'scribd', 'medium', 'crunchyroll', 'cloudflare', 'stripe',
    'mailchimp', 'sendgrid', 'shopify', 'squarespace', 'wix', 'godaddy', 'namecheap',
    'loom', 'miro', 'linear', 'asana', 'trello', 'monday'
  ];

  for (const service of popularServices) {
    if (text.includes(service)) {
      return service.charAt(0).toUpperCase() + service.slice(1);
    }
  }

  const fromNameMatch = fromHeader.match(/^"([^"]+)"/);
  if (fromNameMatch) return fromNameMatch[1].trim();

  const fromEmailMatch = fromHeader.match(/([^@\s]+)@/);
  if (fromEmailMatch) {
    const raw = fromEmailMatch[1].replace(/no-reply|billing|support|info|receipts?/g, '').trim();
    if (raw.length > 2) return raw.charAt(0).toUpperCase() + raw.slice(1);
  }

  return 'Unknown Service';
};

// 3. POST /api/gmail/scan - Scans receipt emails and detects ghost subscriptions
router.post('/scan', authenticate, async (req, res) => {
  // Grab user context from authenticate (in index.js it sets req.user)
  // Wait, let's verify if req.user is set. This route will be registered behind authenticate in index.js, so req.user is guaranteed.
  const userId = req.user.id;
  const dbCtx = getDbCtx();

  try {
    // Fetch latest user tokens
    let user = null;
    if (dbCtx.dbType === 'firestore') {
      const doc = await dbCtx.db.collection('users').doc(userId).get();
      if (doc.exists) user = doc.data();
    } else {
      user = dbCtx.inMemoryDB.users.find(u => u && u.id === userId);
    }

    if (!user || !user.gmailAccessToken) {
      return res.status(401).json({ error: 'Gmail account not connected. Please link your Gmail inbox first.' });
    }

    // --- FIX 1: DAILY SCAN RATE LIMITER & RESET LOGIC ---
    const todayStr = new Date().toDateString();
    let scanCountToday = user.gmailScanCountToday || 0;
    let lastScanDate = user.lastGmailScanDate || '';

    if (lastScanDate !== todayStr) {
      // It is a different day - Reset daily limit counter
      scanCountToday = 0;
      lastScanDate = todayStr;
      
      const resetData = {
        gmailScanCountToday: 0,
        lastGmailScanDate: todayStr
      };

      if (dbCtx.dbType === 'firestore') {
        await dbCtx.db.collection('users').doc(userId).set(resetData, { merge: true });
      } else {
        user.gmailScanCountToday = 0;
        user.lastGmailScanDate = todayStr;
        dbCtx.saveLocalDB();
      }
    }

    // Check if limit is exceeded
    if (scanCountToday >= 3) {
      return res.status(429).json({
        error: 'Scan limit reached: You can scan Gmail up to 3 times per day to optimize API resources.'
      });
    }

    // --- SECURE OAUTH CLIENT & GMAIL TOKEN REFRESH LOGIC ---
    const oauth2Client = getOAuthClient();
    oauth2Client.setCredentials({
      access_token: user.gmailAccessToken,
      refresh_token: user.gmailRefreshToken
    });

    // Check if token is expired (or force refresh if needed)
    try {
      if (user.gmailRefreshToken) {
        const { credentials } = await oauth2Client.refreshAccessToken();
        oauth2Client.setCredentials(credentials);
        
        // Save new access token
        const newAccessToken = credentials.access_token;
        const updateToken = { gmailAccessToken: newAccessToken, updatedAt: new Date() };
        
        if (dbCtx.dbType === 'firestore') {
          await dbCtx.db.collection('users').doc(userId).set(updateToken, { merge: true });
        } else {
          user.gmailAccessToken = newAccessToken;
          user.updatedAt = new Date();
          dbCtx.saveLocalDB();
        }
        console.log('🔄 Gmail OAuth Access Token refreshed successfully!');
      }
    } catch (refreshErr) {
      console.warn('⚠️ Token refresh failed, trying with current token:', refreshErr.message);
    }

    // Scan Gmail API
    const gmailClient = google.gmail({ version: 'v1', auth: oauth2Client });
    
    let messagesResponse;
    try {
      messagesResponse = await gmailClient.users.messages.list({
        userId: 'me',
        q: 'subject:(receipt OR invoice OR subscription OR charged OR payment) newer_than:90d',
        maxResults: 15
      });
    } catch (apiErr) {
      return res.status(400).json({ error: 'Gmail scanning unauthorized or token revoked. Please reconnect Gmail.' });
    }

    const messages = messagesResponse.data.messages || [];
    const discoveredList = [];
    const companyDateMap = {};

    // Get current registered subscriptions of this user to filter out duplicates
    let userSubs = [];
    if (dbCtx.dbType === 'firestore') {
      const snap = await dbCtx.db.collection('subscriptions').where('userId', '==', userId).get();
      snap.forEach(doc => userSubs.push(doc.data()));
    } else {
      userSubs = dbCtx.inMemoryDB.subscriptions.filter(s => s && s.userId === userId);
    }
    const existingNames = userSubs.map(s => s.name.toLowerCase().trim().replace(/\s+/g, ''));

    // Process message details asynchronously
    for (const msgRef of messages) {
      try {
        const msg = await gmailClient.users.messages.get({
          userId: 'me',
          id: msgRef.id,
          format: 'metadata',
          metadataHeaders: ['From', 'Subject', 'Date']
        });

        const headers = msg.data.payload.headers || [];
        const fromHeader = (headers.find(h => h.name === 'From') || {}).value || '';
        const subjectHeader = (headers.find(h => h.name === 'Subject') || {}).value || '';
        const dateHeader = (headers.find(h => h.name === 'Date') || {}).value || '';

        const company = extractCompany(fromHeader, subjectHeader);
        if (company && company !== 'Unknown Service') {
          const compClean = company.toLowerCase().trim().replace(/\s+/g, '');
          
          // Filter duplicates from current dashboard
          if (!existingNames.includes(compClean)) {
            const dateVal = new Date(dateHeader);
            
            // Deduplicate scans showing the latest receipt date
            if (!companyDateMap[compClean] || dateVal > companyDateMap[compClean].date) {
              companyDateMap[compClean] = {
                companyName: company,
                lastSeen: dateVal.toISOString(),
                date: dateVal
              };
            }
          }
        }
      } catch (msgErr) {
        // Skip errored individual headers
      }
    }

    const ghosts = Object.values(companyDateMap).map(g => ({
      companyName: g.companyName,
      lastSeen: g.lastSeen
    }));

    // Update Daily Scan counts increment
    scanCountToday++;
    const scanUpdate = {
      gmailScanCountToday: scanCountToday,
      lastGmailScanDate: todayStr
    };

    if (dbCtx.dbType === 'firestore') {
      await dbCtx.db.collection('users').doc(userId).set(scanUpdate, { merge: true });
    } else {
      user.gmailScanCountToday = scanCountToday;
      user.lastGmailScanDate = todayStr;
      dbCtx.saveLocalDB();
    }

    res.json({ success: true, ghosts });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 4. POST /api/gmail/add-detected - Takes a ghost subscription and appends it to dashboard
router.post('/add-detected', authenticate, async (req, res) => {
  const userId = req.user.id;
  const { name, amount, currency, billingCycle, category, startDate } = req.body;
  const dbCtx = getDbCtx();

  if (!name || !amount) {
    return res.status(400).json({ error: 'Missing subscription name or price amount fields' });
  }

  try {
    const subData = {
      name,
      amount: parseFloat(amount),
      currency: currency || 'INR',
      billingCycle: billingCycle || 'Monthly',
      category: category || 'Entertainment',
      startDate: startDate || new Date().toISOString().split('T')[0],
      status: 'Active',
      userId,
      createdAt: new Date()
    };

    // Calculate renewal date
    const d = new Date(subData.startDate);
    if (subData.billingCycle === 'Monthly') d.setMonth(d.getMonth() + 1);
    else if (subData.billingCycle === 'Yearly') d.setFullYear(d.getFullYear() + 1);
    else if (subData.billingCycle === 'Weekly') d.setDate(d.getDate() + 7);
    subData.renewalDate = d.toISOString();

    const cleanName = subData.name.toLowerCase().trim().replace(/\s+/g, '');
    subData.logo = `https://www.google.com/s2/favicons?domain=${cleanName}.com&sz=128`;

    let subId = Date.now().toString();

    if (dbCtx.dbType === 'firestore') {
      const docRef = await dbCtx.db.collection('subscriptions').add(subData);
      subId = docRef.id;
    }

    const savedSub = { id: subId, ...subData };
    dbCtx.inMemoryDB.subscriptions.push(savedSub);
    dbCtx.saveLocalDB();

    res.json({ success: true, subscription: savedSub });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
