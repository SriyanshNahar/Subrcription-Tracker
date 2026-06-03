const cron = require('node-cron');
const sgMail = require('@sendgrid/mail');
const { sendRenewalAlert, sendMonthlySummary } = require('../services/whatsapp.service');

// Dynamically resolve database context at cron-run time (prevents circular reference crashes!)
const getDbCtx = () => {
  const index = require('../index');
  return {
    db: index.db(),
    dbType: index.getDbType(),
    inMemoryDB: index.inMemoryDB,
    saveLocalDB: index.saveLocalDB
  };
};

sgMail.setApiKey(process.env.SENDGRID_API_KEY || 'dummy');

// Helper to check if a user is snoozed
const isUserSnoozed = (user) => {
  if (!user || !user.snoozeUntil) return false;
  const snoozeDate = user.snoozeUntil instanceof Date ? user.snoozeUntil : new Date(user.snoozeUntil);
  return new Date() < snoozeDate;
};

// Helper to convert renewalDate field to safe JS Date
const parseRenewalDate = (dateVal) => {
  if (!dateVal) return null;
  if (typeof dateVal.toDate === 'function') {
    return dateVal.toDate();
  }
  return new Date(dateVal);
};

// ==========================================
// ✅ TASK 1: RUN DAILY RENEWAL ALERT CHECK AT 9:00 AM
// ==========================================
const startDailyAlertJob = () => {
  cron.schedule('0 9 * * *', async () => {
    console.log('⏰ [CRON DAILY] Running daily subscription renewal scan...');
    try {
      const dbCtx = getDbCtx();
      const { db, dbType, inMemoryDB } = dbCtx;

      const today = new Date();
      today.setHours(0,0,0,0);

      // 1. Gather all active subscriptions (both personal and B2B corporate)
      let personalSubs = [];
      let corporateSubs = [];

      if (dbType === 'firestore') {
        try {
          const personalSnap = await db.collectionGroup('subscriptions')
            .where('status', '==', 'Active')
            .get();
          personalSubs = personalSnap.docs.map(d => ({ id: d.id, ...d.data(), isCorporate: false }));
        } catch (e) {
          console.warn('Firestore collectionGroup query failed, fallback to collection:', e.message);
          const personalSnap = await db.collection('subscriptions')
            .where('status', '==', 'Active')
            .get();
          personalSubs = personalSnap.docs.map(d => ({ id: d.id, ...d.data(), isCorporate: false }));
        }

        try {
          const corporateSnap = await db.collection('organization_subscriptions')
            .where('status', '==', 'active')
            .get();
          corporateSubs = corporateSnap.docs.map(d => ({ id: d.id, ...d.data(), isCorporate: true }));
        } catch (e) {
          console.warn('Firestore B2B subscriptions fetch warning:', e.message);
        }
      } else {
        // Memory Mode fallback
        personalSubs = inMemoryDB.subscriptions
          .filter(s => s.status === 'Active')
          .map(s => ({ ...s, isCorporate: false }));
        corporateSubs = inMemoryDB.organization_subscriptions
          .filter(s => s.status === 'active')
          .map(s => ({ ...s, isCorporate: true }));
      }

      const allSubs = [...personalSubs, ...corporateSubs];
      console.log(`[CRON DAILY] Found ${allSubs.length} total active subscriptions to analyze.`);

      for (const sub of allSubs) {
        const renewalDate = parseRenewalDate(sub.renewalDate);
        if (!renewalDate) continue;

        // Calculate days remaining
        const diffTime = renewalDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        // Trigger notifications only on exactly 7, 3, or 1 days remaining
        if (![7, 3, 1].includes(diffDays)) continue;

        // Determine who needs to be notified
        let usersToNotify = [];

        if (sub.isCorporate) {
          // B2B subscription - alert all assigned team members
          const assignedEmails = sub.assignedTo || [];
          for (const email of assignedEmails) {
            let u = null;
            if (dbType === 'firestore') {
              const uSnap = await db.collection('users').where('email', '==', email.toLowerCase().trim()).limit(1).get();
              if (!uSnap.empty) u = { id: uSnap.docs[0].id, ...uSnap.docs[0].data() };
            } else {
               u = inMemoryDB.users.find(usr => usr && usr.email && usr.email.toLowerCase() === email.toLowerCase().trim());
            }
            if (u) usersToNotify.push(u);
          }
        } else {
          // Personal subscription - alert individual owner
          let u = null;
          if (dbType === 'firestore') {
            const uDoc = await db.collection('users').doc(sub.userId).get();
            if (uDoc.exists) u = { id: uDoc.id, ...uDoc.data() };
          } else {
             u = inMemoryDB.users.find(usr => usr && usr.id === sub.userId);
          }
          if (u) usersToNotify.push(u);
        }

        // Notify each target user
        for (const user of usersToNotify) {
          // Skip if user is currently snoozed
          if (isUserSnoozed(user)) {
            console.log(`[CRON DAILY] User ${user.email} is snoozed. Skipping alert.`);
            continue;
          }

          // 1. Send WhatsApp Alert if enabled
          if (user.whatsappEnabled && user.phone) {
            try {
              await sendRenewalAlert(
                user.phone,
                user.name || 'Subscriber',
                sub.name,
                sub.amount,
                sub.currency || 'INR',
                diffDays
              );
            } catch (wErr) {
              console.error(`Failed to send WhatsApp alert during CRON to ${user.email}:`, wErr.message);
            }
          }

          // 2. Send SendGrid Email Alert (Always Send)
          const mailOptions = {
            to: user.email,
            from: 'alerts@vaultly.com',
            subject: `⏰ ${sub.name} renews in ${diffDays} day${diffDays > 1 ? 's' : ''}!`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 12px; background-color: #0A0A18; color: #FFFFFF;">
                <h2 style="color: #6C63FF; text-align: center;">📊 Vaultly Renewal Alert</h2>
                <p style="font-size: 16px; color: #E5E7EB;">Hey ${user.name || 'there'}!</p>
                <p style="font-size: 14px; color: #9CA3AF; line-height: 1.5;">
                  This is a quick reminder that your <strong>${sub.name}</strong> subscription is scheduled to renew in <strong>${diffDays} day${diffDays > 1 ? 's' : ''}</strong>.
                </p>
                <div style="background-color: #121226; border: 1px solid #1f2937; border-radius: 12px; padding: 20px; margin: 25px 0; text-align: center;">
                  <h3 style="color: #00D4AA; margin: 0 0 10px 0; font-size: 20px;">${sub.name}</h3>
                  <p style="margin: 5px 0; color: #E5E7EB; font-size: 16px;">💰 Cost: <strong>${sub.currency || 'INR'} ${sub.amount}</strong></p>
                  <p style="margin: 5px 0; color: #E5E7EB; font-size: 16px;">📅 Date: <strong>${renewalDate.toLocaleDateString('en-IN')}</strong></p>
                </div>
                <div style="text-align: center; margin-top: 30px;">
                  <a href="https://vaultly.onrender.com" style="background-color: #6C63FF; color: white; padding: 10px 24px; border-radius: 6px; font-weight: bold; text-decoration: none;">
                    Go to My Dashboard
                  </a>
                </div>
                <div style="border-top: 1px solid #1f2937; margin-top: 30px; padding-top: 15px; text-align: center; font-size: 11px; color: #6B7280;">
                  Vaultly SaaS — Never miss a renewal again.
                </div>
              </div>
            `
          };

          if (!process.env.SENDGRID_API_KEY || process.env.SENDGRID_API_KEY === 'dummy') {
            console.log(`[EMAIL MOCK ALERT] To: ${user.email} Subject: ${mailOptions.subject}`);
          } else {
            try {
              await sgMail.send(mailOptions);
            } catch (sgErr) {
              console.error(`Failed to send Email alert during CRON to ${user.email}:`, sgErr.message);
            }
          }
        }
      }
      console.log('⏰ [CRON DAILY] Daily renewal alert scan completed successfully.');
    } catch (err) {
      console.error('⏰ [CRON DAILY ERROR]:', err);
    }
  });
};

// ==========================================
// ✅ TASK 2: RUN MONTHLY STATS SUMMARY AT 10:00 AM ON 1ST OF THE MONTH
// ==========================================
const startMonthlySummaryJob = () => {
  cron.schedule('0 10 1 * *', async () => {
    console.log('⏰ [CRON MONTHLY] Running monthly summary digest job...');
    try {
      const dbCtx = getDbCtx();
      const { db, dbType, inMemoryDB } = dbCtx;

      // 1. Gather all users who have enabled WhatsApp
      let targetUsers = [];
      if (dbType === 'firestore') {
        const uSnap = await db.collection('users')
          .where('whatsappEnabled', '==', true)
          .get();
        targetUsers = uSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      } else {
         targetUsers = inMemoryDB.users.filter(u => u && u.whatsappEnabled === true);
      }

      console.log(`[CRON MONTHLY] Dispatched summaries scanning for ${targetUsers.length} active premium WhatsApp subscribers.`);

      for (const user of targetUsers) {
        if (!user.phone) continue;

        // 2. Fetch user's individual subscriptions
        let subs = [];
        if (dbType === 'firestore') {
          const subsSnap = await db.collection('subscriptions')
            .where('userId', '==', user.id)
            .get();
          subs = subsSnap.docs.map(d => d.data());
        } else {
           subs = inMemoryDB.subscriptions.filter(s => s && s.userId === user.id);
        }

        if (subs.length === 0) continue;

        // 3. Compute stats
        const activeSubs = subs.filter(s => s.status === 'Active');
        
        const totalSpent = activeSubs.reduce((sum, s) => {
          let cost = parseFloat(s.amount) || 0;
          if (s.billingCycle === 'Yearly') cost /= 12;
          if (s.billingCycle === 'Weekly') cost *= 4;
          return sum + cost;
        }, 0);

        const wastedSubs = subs.filter(s => s.status !== 'Active');
        const wastedAmount = wastedSubs.reduce((sum, s) => {
          let cost = parseFloat(s.amount) || 0;
          return sum + cost;
        }, 0);

        // 4. Send monthly WhatsApp digest
        try {
          await sendMonthlySummary(user.phone, user.name || 'Subscriber', {
            totalSpent: parseFloat(totalSpent.toFixed(2)),
            activeCount: activeSubs.length,
            wastedCount: wastedSubs.length,
            wastedAmount: parseFloat(wastedAmount.toFixed(2))
          });
        } catch (wErr) {
          console.error(`Failed to send WhatsApp Monthly digest to ${user.email}:`, wErr.message);
        }
      }
      console.log('⏰ [CRON MONTHLY] Monthly summary digests completed successfully.');
    } catch (err) {
      console.error('⏰ [CRON MONTHLY ERROR]:', err);
    }
  });
};

module.exports = {
  startDailyAlertJob,
  startMonthlySummaryJob
};
