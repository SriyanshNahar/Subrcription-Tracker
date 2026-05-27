const crypto = require('crypto');
const sgMail = require('@sendgrid/mail');

// Set SendGrid API Key from environment or dummy fallback
sgMail.setApiKey(process.env.SENDGRID_API_KEY || 'dummy');

// ✅ Create a new B2B Organization
const createOrganization = async (dbCtx, orgData, adminUserId) => {
  const { db, dbType, inMemoryDB, saveLocalDB } = dbCtx;
  const orgId = 'org_' + Math.random().toString(36).substr(2, 9);
  
  const organizationData = {
    name: orgData.name,
    gstNumber: orgData.gstNumber,
    plan: 'corporate',
    planExpiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    razorpaySubscriptionId: orgData.razorpaySubscriptionId || null,
    adminUserId: adminUserId,
    createdAt: new Date(),
    memberCount: 1,
    settings: {
      currency: orgData.currency || 'INR',
      whatsappEnabled: orgData.whatsappEnabled !== undefined ? orgData.whatsappEnabled : true,
      emailEnabled: orgData.emailEnabled !== undefined ? orgData.emailEnabled : true
    }
  };

  const memberData = {
    orgId: orgId,
    userId: adminUserId,
    email: (orgData.adminEmail || 'admin@company.com').toLowerCase().trim(),
    role: 'admin',
    status: 'active',
    joinedAt: new Date()
  };

  if (dbType === 'firestore') {
    const orgRef = db.collection('organizations').doc(orgId);
    await orgRef.set(organizationData);
    
    // Add admin as the first member
    await db.collection('organization_members').add(memberData);
    
    // Also save a copy to memory to keep the warm cache in sync
    inMemoryDB.organizations.push({ id: orgId, ...organizationData });
    inMemoryDB.organization_members.push({ id: 'member_' + Math.random().toString(36).substr(2, 9), ...memberData });
    saveLocalDB();
  } else {
    // Memory Mode fallback
    inMemoryDB.organizations.push({ id: orgId, ...organizationData });
    inMemoryDB.organization_members.push({ id: 'member_' + Math.random().toString(36).substr(2, 9), ...memberData });
    saveLocalDB();
  }

  return orgId;
};

// ✅ Invite a team member using a secure, expiring token (Fix 1)
const inviteMember = async (dbCtx, orgId, email, role, invitedBy) => {
  const { db, dbType, inMemoryDB, saveLocalDB } = dbCtx;

  const normalizedEmail = email.toLowerCase().trim();

  // 1. Check if member already exists
  let existing = null;
  if (dbType === 'firestore') {
    const snap = await db.collection('organization_members')
      .where('orgId', '==', orgId)
      .where('email', '==', normalizedEmail)
      .get();
    if (!snap.empty) {
      existing = snap.docs[0].data();
    }
  } else {
    existing = inMemoryDB.organization_members.find(
      m => m && m.orgId === orgId && m.email.toLowerCase() === normalizedEmail
    );
  }

  if (existing) {
    throw new Error('Member already invited or is an active member of this organization');
  }

  // 2. Generate secure token & 24h expiry
  const inviteToken = crypto.randomBytes(32).toString('hex');
  const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  const pendingMember = {
    orgId,
    userId: null, // to be populated when invite is accepted
    email: email.toLowerCase().trim(),
    role,
    invitedBy,
    status: 'pending',
    inviteToken,
    tokenExpiry: expiry,
    joinedAt: new Date()
  };

  if (dbType === 'firestore') {
    await db.collection('organization_members').add(pendingMember);
  }
  
  // Sync to local memory cache for dual consistency
  inMemoryDB.organization_members.push({
    id: 'member_' + Math.random().toString(36).substr(2, 9),
    ...pendingMember
  });
  saveLocalDB();

  // 3. Send email invite with the secure token URL
  const baseUrl = process.env.BASE_URL || 'http://localhost:4200';
  const inviteUrl = `${baseUrl}/accept-invite?token=${inviteToken}&org=${orgId}`;

  const mailOptions = {
    to: email,
    from: 'noreply@subtrackr.in',
    subject: 'You are invited to SubTrackr Corporate Portal',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 12px; background-color: #0A0A18; color: #FFFFFF;">
        <h2 style="color: #6C63FF; text-align: center;">SubTrackr Corporate</h2>
        <p style="font-size: 16px; line-height: 1.6; color: #E5E7EB;">Hello!</p>
        <p style="font-size: 14px; line-height: 1.6; color: #9CA3AF;">
          You have been invited by <strong>${invitedBy}</strong> to join their corporate subscription management team as a <strong>${role.toUpperCase()}</strong>.
        </p>
        <p style="font-size: 14px; line-height: 1.6; color: #9CA3AF; margin-bottom: 25px;">
          SubTrackr Corporate helps companies track unused SaaS seats, audit licenses, and generate GST-ready invoice expense reports.
        </p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${inviteUrl}" style="background-color: #6C63FF; color: white; padding: 12px 28px; border-radius: 8px; font-weight: bold; text-decoration: none; display: inline-block;">
            Accept Corporate Invitation
          </a>
        </div>
        <p style="font-size: 12px; color: #EF4444; text-align: center; margin-top: 20px;">
          ⚠️ This secure invite link expires in 24 hours.
        </p>
        <div style="border-top: 1px solid #1f2937; margin-top: 30px; padding-top: 15px; text-align: center; font-size: 12px; color: #6B7280;">
          SubTrackr SaaS — Track every subscription. Save every rupee.
        </div>
      </div>
    `
  };

  // Mock sending email in development mode if SendGrid key is dummy
  if (!process.env.SENDGRID_API_KEY || process.env.SENDGRID_API_KEY === 'dummy') {
    console.log(`[EMAIL MOCK] Sending B2B invitation to ${email}. Invite URL: ${inviteUrl}`);
  } else {
    try {
      await sgMail.send(mailOptions);
    } catch (e) {
      console.error('SendGrid email invite error:', e.message);
    }
  }

  return inviteToken;
};

// ✅ Accept pending team invitation (Fix 2)
const acceptInvitation = async (dbCtx, token, orgId, userId) => {
  const { db, dbType, inMemoryDB, saveLocalDB } = dbCtx;

  let inviteDoc = null;
  let inviteData = null;

  if (dbType === 'firestore') {
    const snap = await db.collection('organization_members')
      .where('inviteToken', '==', token)
      .where('orgId', '==', orgId)
      .where('status', '==', 'pending')
      .limit(1)
      .get();

    if (snap.empty) {
      throw new Error('Invalid or expired team invite link');
    }
    inviteDoc = snap.docs[0];
    inviteData = inviteDoc.data();
  } else {
    inviteData = inMemoryDB.organization_members.find(
      m => m && m.inviteToken === token && m.orgId === orgId && m.status === 'pending'
    );
    if (!inviteData) {
      throw new Error('Invalid or expired team invite link');
    }
  }

  // Check token expiry
  const expiryDate = inviteData.tokenExpiry instanceof Date ? inviteData.tokenExpiry : new Date(inviteData.tokenExpiry);
  if (new Date() > expiryDate) {
    throw new Error('Invite link has expired. Please ask your administrator to resend the invite.');
  }

  // Update in Firestore
  if (dbType === 'firestore') {
    await inviteDoc.ref.update({
      userId,
      status: 'active',
      inviteToken: null,
      tokenExpiry: null,
      joinedAt: new Date()
    });
  }

  // Sync to local memory cache for consistency
  const cacheIndex = inMemoryDB.organization_members.findIndex(
    m => m && m.inviteToken === token && m.orgId === orgId
  );
  if (cacheIndex !== -1) {
    inMemoryDB.organization_members[cacheIndex] = {
      ...inMemoryDB.organization_members[cacheIndex],
      userId,
      status: 'active',
      inviteToken: null,
      tokenExpiry: null,
      joinedAt: new Date()
    };
  } else {
    // If not found in cache somehow, add it active
    inMemoryDB.organization_members.push({
      id: 'member_' + Math.random().toString(36).substr(2, 9),
      orgId,
      userId,
      email: inviteData.email,
      role: inviteData.role,
      status: 'active',
      inviteToken: null,
      tokenExpiry: null,
      joinedAt: new Date()
    });
  }
  
  // Increment memberCount on the organization
  let orgIndex = inMemoryDB.organizations.findIndex(o => o && o.id === orgId);
  if (orgIndex !== -1) {
    inMemoryDB.organizations[orgIndex].memberCount = (inMemoryDB.organizations[orgIndex].memberCount || 0) + 1;
  }

  if (dbType === 'firestore') {
    try {
      const orgRef = db.collection('organizations').doc(orgId);
      const orgDoc = await orgRef.get();
      if (orgDoc.exists) {
        await orgRef.update({
          memberCount: (orgDoc.data().memberCount || 0) + 1
        });
      }
    } catch (e) {
      console.error('Failed to update organization memberCount:', e.message);
    }
  }

  saveLocalDB();
  return { success: true, role: inviteData.role };
};

// ✅ Compute unified dashboard metrics for organization
const getOrgDashboard = async (dbCtx, orgId) => {
  const { db, dbType, inMemoryDB } = dbCtx;

  let org = null;
  let subscriptions = [];
  let members = [];

  if (dbType === 'firestore') {
    const [subsSnap, membersSnap, orgSnap] = await Promise.all([
      db.collection('organization_subscriptions').where('orgId', '==', orgId).get(),
      db.collection('organization_members').where('orgId', '==', orgId).get(),
      db.collection('organizations').doc(orgId).get()
    ]);

    subscriptions = subsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    members = membersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    org = orgSnap.exists ? { id: orgSnap.id, ...orgSnap.data() } : null;
  } else {
    org = inMemoryDB.organizations.find(o => o && o.id === orgId) || null;
    subscriptions = inMemoryDB.organization_subscriptions.filter(s => s.orgId === orgId);
    members = inMemoryDB.organization_members.filter(m => m.orgId === orgId);
  }

  if (!org) {
    throw new Error('Organization not found');
  }

  // Calculate total monthly expenditure (integrating yearly scale adjustments)
  const totalMonthly = subscriptions.reduce((sum, sub) => {
    if (sub.status !== 'active') return sum;
    let monthly = parseFloat(sub.amount) || 0;
    if (sub.billingCycle === 'yearly') monthly = monthly / 12;
    if (sub.billingCycle === 'weekly') monthly = monthly * 4;
    return sum + monthly;
  }, 0);

  // Identify unused or unassigned subscriptions (marked wasted)
  const wasted = subscriptions.filter(sub => 
    sub.status === 'inactive' || !sub.assignedTo || sub.assignedTo.length === 0
  );

  const wastedAmount = wasted.reduce((sum, sub) => {
    let monthly = parseFloat(sub.amount) || 0;
    if (sub.billingCycle === 'yearly') monthly = monthly / 12;
    if (sub.billingCycle === 'weekly') monthly = monthly * 4;
    return sum + monthly;
  }, 0);

  return {
    org,
    subscriptions,
    members,
    totalMonthly: parseFloat(totalMonthly.toFixed(2)),
    totalYearly: parseFloat((totalMonthly * 12).toFixed(2)),
    wastedAmount: parseFloat(wastedAmount.toFixed(2)),
    wastedCount: wasted.length,
    subCount: subscriptions.length,
    memberCount: members.length
  };
};

// ✅ B2B Employee Seat Auditor - identifies licenses held by former employees
const auditSeats = async (dbCtx, orgId) => {
  const { db, dbType, inMemoryDB } = dbCtx;

  let subs = [];
  let members = [];

  if (dbType === 'firestore') {
    const [subsSnap, membersSnap] = await Promise.all([
      db.collection('organization_subscriptions').where('orgId', '==', orgId).get(),
      db.collection('organization_members').where('orgId', '==', orgId).get()
    ]);
    subs = subsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    members = membersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } else {
    subs = inMemoryDB.organization_subscriptions.filter(s => s.orgId === orgId);
    members = inMemoryDB.organization_members.filter(m => m.orgId === orgId);
  }

  // Active email whitelist (employees registered in corporate tier)
  const activeEmails = members
    .filter(m => m && typeof m.email === 'string')
    .map(m => m.email.toLowerCase().trim());

  const audit = subs.map(sub => {
    if (sub.status !== 'active') {
      return {
        ...sub,
        auditStatus: 'inactive',
        inactiveSeats: [],
        wastedAmount: 0,
        recommendation: 'Subscription is currently inactive.'
      };
    }

    const assignedEmails = (sub.assignedTo || []).filter(e => typeof e === 'string');
    // Seats assigned to ex-employees (emails NOT in active member database)
    const inactiveSeats = assignedEmails.filter(e => !activeEmails.includes(e.toLowerCase().trim()));
    const unassignedSeats = assignedEmails.length === 0;

    let auditStatus = 'ok';
    let recommendation = null;
    let wastedAmount = 0;

    if (inactiveSeats.length > 0) {
      auditStatus = 'wasted_seats';
      
      // Calculate financial waste based on percentage of inactive seats
      const totalSeats = assignedEmails.length;
      const fractionWasted = inactiveSeats.length / totalSeats;
      let monthlyCost = parseFloat(sub.amount) || 0;
      if (sub.billingCycle === 'yearly') monthlyCost = monthlyCost / 12;
      if (sub.billingCycle === 'weekly') monthlyCost = monthlyCost * 4;
      
      wastedAmount = parseFloat((monthlyCost * fractionWasted).toFixed(2));
      recommendation = `Remove ${inactiveSeats.length} seat(s) assigned to inactive users (${inactiveSeats.join(', ')}) — Save ₹${wastedAmount}/month`;
    } else if (unassignedSeats) {
      auditStatus = 'unassigned';
      
      let monthlyCost = parseFloat(sub.amount) || 0;
      if (sub.billingCycle === 'yearly') monthlyCost = monthlyCost / 12;
      if (sub.billingCycle === 'weekly') monthlyCost = monthlyCost * 4;
      
      wastedAmount = monthlyCost;
      recommendation = `Subscription has 0 seats assigned! Re-assign to team members or cancel subscription to save ₹${wastedAmount}/month`;
    } else {
      recommendation = 'All seats assigned to active employees. Good job!';
    }

    return {
      ...sub,
      auditStatus,
      inactiveSeats,
      wastedAmount,
      recommendation
    };
  });

  return audit;
};

module.exports = {
  createOrganization,
  inviteMember,
  acceptInvitation,
  getOrgDashboard,
  auditSeats
};
