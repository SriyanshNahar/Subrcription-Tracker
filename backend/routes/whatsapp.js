const express = require('express');
const router = express.Router();
const twilio = require('twilio');
const { handleUserReply, sendRenewalAlert } = require('../services/whatsapp.service');

// Helper to resolve the database context dynamically (avoids circular imports)
const getDbCtx = () => {
  const index = require('../index');
  return {
    db: index.db(),
    dbType: index.getDbType(),
    inMemoryDB: index.inMemoryDB,
    saveLocalDB: index.saveLocalDB,
    admin: index.admin
  };
};

// ✅ POST /api/whatsapp/webhook — Twilio webhook endpoint for incoming user text replies
router.post('/webhook', express.urlencoded({ extended: false }), async (req, res) => {
  try {
    const twilioSignature = req.headers['x-twilio-signature'];
    const baseUrl = process.env.BASE_URL || 'https://trackovo.onrender.com';
    const requestUrl = `${baseUrl}/api/whatsapp/webhook`;

    const isMockToken = !process.env.TWILIO_AUTH_TOKEN || 
                         process.env.TWILIO_AUTH_TOKEN === 'dummy';

    // Verify request authenticity only if not in mock/sandbox environment (Fix 4)
    if (!isMockToken && twilioSignature) {
      const isValid = twilio.validateRequest(
        process.env.TWILIO_AUTH_TOKEN,
        twilioSignature,
        requestUrl,
        req.body
      );

      if (!isValid) {
        console.warn('⚠️ Twilio signature verification failed! Blocked request.');
        return res.status(403).json({ error: 'Invalid Twilio signature verification' });
      }
    }

    const { From, Body } = req.body;
    if (!From || !Body) {
      return res.status(400).send('Missing Twilio payload parameters');
    }

    const dbCtx = getDbCtx();
    const reply = await handleUserReply(From, Body, dbCtx);
    
    console.log(`[WHATSAPP WEBHOOK] Reply processed successfully for ${From}: ${reply}`);
    res.status(200).send('OK');
  } catch (error) {
    console.error('WhatsApp webhook error:', error);
    res.status(500).send('Webhook server processing error');
  }
});

// ✅ POST /api/whatsapp/test — Development test trigger (Rate-limited via index.js)
router.post('/test', async (req, res) => {
  try {
    const { phone, userName, subName, amount, currency, daysLeft } = req.body;
    
    if (!phone || !userName) {
      return res.status(400).json({ error: 'Missing parameter: phone and userName are required.' });
    }

    const name = subName || 'Netflix';
    const cost = amount || 649;
    const curr = currency || 'INR';
    const days = daysLeft !== undefined ? daysLeft : 3;

    console.log(`[WHATSAPP TEST] Dispatching test renewal alert to +91${phone} for ${name}`);
    const sid = await sendRenewalAlert(phone, userName, name, cost, curr, days);
    
    res.json({ 
      success: true, 
      message: `Test alert dispatched! mode: ${sid.startsWith('SMmock') ? 'Mock' : 'Production'}`, 
      messageSid: sid 
    });
  } catch (error) {
    console.error('WhatsApp manual test trigger error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
