const twilio = require('twilio');

// Initialize Twilio client only if credentials are valid
const isMockMode = !process.env.TWILIO_ACCOUNT_SID ||
  process.env.TWILIO_ACCOUNT_SID === 'dummy' ||
  !process.env.TWILIO_AUTH_TOKEN ||
  process.env.TWILIO_AUTH_TOKEN === 'dummy';

let client = null;
if (!isMockMode) {
  try {
    client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  } catch (err) {
    console.error('Failed to initialize Twilio client:', err.message);
  }
}

const WHATSAPP_FROM = `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER || '+14155238886'}`;

// ✅ Send renewal alert
const sendRenewalAlert = async (phone, userName, subName, amount, currency, daysLeft) => {
  const currencySymbol = currency === 'INR' ? '₹' : (currency === 'USD' ? '$' : '€');
  const bodyText = `
📊 *SubTrackr Alert*

Hey ${userName}! 👋

Your *${subName}* subscription renews in *${daysLeft} day${daysLeft > 1 ? 's' : ''}*.

💰 Amount: *${currencySymbol}${amount}*
📅 Renewal: ${new Date(Date.now() + daysLeft * 86400000).toLocaleDateString('en-IN')}

Reply with:
✅ *KEEP* — No action needed
❌ *CANCEL* — Get cancellation help
⏰ *SNOOZE* — Remind me tomorrow

_SubTrackr — Never miss a renewal_
  `.trim();

  if (isMockMode || !client) {
    console.log(`[WHATSAPP MOCK ALERT] To: +91${phone}\nBody: ${bodyText}\n-----------------------------------`);
    return 'SMmock_renewal_' + Math.random().toString(36).substr(2, 9);
  }

  try {
    const message = await client.messages.create({
      from: WHATSAPP_FROM,
      to: `whatsapp:+91${phone}`,
      body: bodyText
    });
    return message.sid;
  } catch (err) {
    console.error(`Failed to send WhatsApp renewal alert to +91${phone}:`, err.message);
    throw err;
  }
};

// ✅ Send wasted subscription alert
const sendWastedAlert = async (phone, userName, subName, amount, daysSinceUsed) => {
  const bodyText = `
⚠️ *SubTrackr — Money Alert*

Hey ${userName}!

You haven't used *${subName}* in *${daysSinceUsed} days* but you're paying *₹${amount}/month* for it!

💸 That's *₹${amount * Math.floor(daysSinceUsed / 30)} wasted* so far.

Reply with:
❌ *CANCEL* — Cancel this subscription
✅ *KEEP* — I still need it
📊 *REPORT* — See my full waste report

_SubTrackr — Save money, live better_
  `.trim();

  if (isMockMode || !client) {
    console.log(`[WHATSAPP MOCK WASTED] To: +91${phone}\nBody: ${bodyText}\n-----------------------------------`);
    return 'SMmock_wasted_' + Math.random().toString(36).substr(2, 9);
  }

  try {
    const message = await client.messages.create({
      from: WHATSAPP_FROM,
      to: `whatsapp:+91${phone}`,
      body: bodyText
    });
    return message.sid;
  } catch (err) {
    console.error(`Failed to send WhatsApp wasted alert to +91${phone}:`, err.message);
    throw err;
  }
};

// ✅ Send monthly summary statistics
const sendMonthlySummary = async (phone, userName, stats) => {
  const bodyText = `
📊 *Your Monthly SubTrackr Report*

Hey ${userName}! Here's your summary:

💰 Total Spent: *₹${stats.totalSpent}*
📱 Active Subs: *${stats.activeCount}*
⚠️ Unused Subs: *${stats.wastedCount}*
💸 Money Wasted: *₹${stats.wastedAmount}*

${stats.wastedAmount > 0
      ? `You could save *₹${stats.wastedAmount}/month* by cancelling unused subscriptions!`
      : `Great job! No wasted subscriptions this month! 🎉`}

Reply *REPORT* for detailed breakdown.

_SubTrackr — subtrackr.in_
  `.trim();

  if (isMockMode || !client) {
    console.log(`[WHATSAPP MOCK SUMMARY] To: +91${phone}\nBody: ${bodyText}\n-----------------------------------`);
    return 'SMmock_summary_' + Math.random().toString(36).substr(2, 9);
  }

  try {
    const message = await client.messages.create({
      from: WHATSAPP_FROM,
      to: `whatsapp:+91${phone}`,
      body: bodyText
    });
    return message.sid;
  } catch (err) {
    console.error(`Failed to send WhatsApp monthly summary to +91${phone}:`, err.message);
    throw err;
  }
};

// ✅ Handle user reply webhook with circular reference bypass (Fix 2, passing dbCtx)
const handleUserReply = async (from, body, dbCtx) => {
  const phone = from.replace('whatsapp:', '').replace('+91', '').trim();
  const reply = body.trim().toUpperCase();

  let responseText = '';

  switch (reply) {
    case 'KEEP':
      responseText = "✅ Got it! We'll remind you again before next renewal. Stay on top of your subscriptions! 💪";
      break;
    case 'CANCEL':
      responseText = "❌ No problem! Visit subtrackr.in/cancel-assistant for step-by-step cancellation guide for your subscription.";
      break;
    case 'SNOOZE':
      responseText = "⏰ Snoozed! We'll remind you again tomorrow morning.";

      // Update database status or add snooze logs if dbCtx is accessible
      if (dbCtx) {
        const { db, dbType, inMemoryDB, saveLocalDB } = dbCtx;
        try {
          // Add details inside database about tomorrow snooze
          if (dbType === 'firestore') {
            const userSnap = await db.collection('users').where('phone', '==', phone).limit(1).get();
            if (!userSnap.empty) {
              const userId = userSnap.docs[0].id;
              await db.collection('users').doc(userId).set({
                snoozeUntil: new Date(Date.now() + 24 * 60 * 60 * 1000)
              }, { merge: true });
            }
          } else {
            const user = inMemoryDB.users.find(u => u && u.phone === phone);
            if (user) {
              user.snoozeUntil = new Date(Date.now() + 24 * 60 * 60 * 1000);
              saveLocalDB();
            }
          }
        } catch (e) {
          console.error('Failed to log snooze update in DB:', e.message);
        }
      }
      break;
    case 'REPORT':
      responseText = "📊 Your detailed report: subtrackr.in/dashboard\n\nLogin to see your full expense breakdown!";
      break;
    default:
      responseText = "👋 Hi! I'm SubTrackr Bot.\n\nCommands:\n✅ KEEP\n❌ CANCEL\n⏰ SNOOZE\n📊 REPORT";
  }

  if (isMockMode || !client) {
    console.log(`[WHATSAPP MOCK BOT REPLY] To: whatsapp:+91${phone}\nBody: ${responseText}\n-----------------------------------`);
    return reply;
  }

  try {
    await client.messages.create({
      from: WHATSAPP_FROM,
      to: `whatsapp:+91${phone}`,
      body: responseText
    });
  } catch (err) {
    console.error(`Failed to send WhatsApp reply response to +91${phone}:`, err.message);
  }

  return reply;
};

module.exports = {
  sendRenewalAlert,
  sendWastedAlert,
  sendMonthlySummary,
  handleUserReply
};
