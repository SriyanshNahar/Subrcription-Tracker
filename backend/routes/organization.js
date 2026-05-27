const express = require('express');
const router = express.Router();
const { 
  createOrganization, 
  inviteMember, 
  acceptInvitation, 
  getOrgDashboard, 
  auditSeats 
} = require('../services/organization.service');
const { generateGSTReport } = require('../services/gst-invoice.service');

// Helper to resolve the database context dynamically at request-time (immunizes against circular imports!)
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

// Middleware to verify active member access to an organization
const verifyOrgAccess = async (req, res, next) => {
  try {
    const dbCtx = getDbCtx();
    const userId = req.user.id;
    const orgId = req.params.orgId;

    let member = null;
    if (dbCtx.dbType === 'firestore') {
      const snap = await dbCtx.db.collection('organization_members')
        .where('orgId', '==', orgId)
        .where('userId', '==', userId)
        .where('status', '==', 'active')
        .limit(1)
        .get();
      if (!snap.empty) {
        member = snap.docs[0].data();
      }
    } else {
      member = dbCtx.inMemoryDB.organization_members.find(
        m => m.orgId === orgId && m.userId === userId && m.status === 'active'
      );
    }

    if (!member) {
      return res.status(403).json({ error: 'Access denied: You are not an active member of this organization.' });
    }

    req.orgMember = member;
    next();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/org/my-organization
// Retrieve active organization profile of the logged-in user
router.get('/my-organization', async (req, res) => {
  try {
    const dbCtx = getDbCtx();
    const userId = req.user.id;

    let memberData = null;
    let orgData = null;

    if (dbCtx.dbType === 'firestore') {
      const snap = await dbCtx.db.collection('organization_members')
        .where('userId', '==', userId)
        .where('status', '==', 'active')
        .limit(1)
        .get();

      if (!snap.empty) {
        memberData = { id: snap.docs[0].id, ...snap.docs[0].data() };
        const orgDoc = await dbCtx.db.collection('organizations').doc(memberData.orgId).get();
        if (orgDoc.exists) {
          orgData = { id: orgDoc.id, ...orgDoc.data() };
        }
      }
    } else {
      // Memory Mode fallback
      memberData = dbCtx.inMemoryDB.organization_members.find(
        m => m && m.userId === userId && m.status === 'active'
      );
      if (memberData) {
        orgData = dbCtx.inMemoryDB.organizations.find(o => o && o.id === memberData.orgId);
      }
    }

    res.json({
      success: true,
      member: memberData,
      organization: orgData
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/org/create
router.post('/create', async (req, res) => {
  try {
    const dbCtx = getDbCtx();
    const adminUserId = req.user.id; // Authenticated user ID is safer
    
    // Check if user already has an active organization
    let existing = null;
    if (dbCtx.dbType === 'firestore') {
      const snap = await dbCtx.db.collection('organization_members')
        .where('userId', '==', adminUserId)
        .where('status', '==', 'active')
        .limit(1)
        .get();
      if (!snap.empty) existing = snap.docs[0].data();
    } else {
      existing = dbCtx.inMemoryDB.organization_members.find(
        m => m && m.userId === adminUserId && m.status === 'active'
      );
    }

    if (existing) {
      return res.status(400).json({ error: 'User is already associated with an active corporate organization.' });
    }

    const orgData = {
      name: req.body.name,
      gstNumber: req.body.gstNumber,
      adminEmail: req.user.email,
      currency: req.body.currency || 'INR'
    };

    const orgId = await createOrganization(dbCtx, orgData, adminUserId);
    res.json({ success: true, orgId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/org/invite
router.post('/invite', async (req, res) => {
  try {
    const dbCtx = getDbCtx();
    const { orgId, email, role } = req.body;
    const invitedBy = req.user.name || req.user.email;

    // Check if current user is an admin or manager in the organization
    let userRole = null;
    if (dbCtx.dbType === 'firestore') {
      const snap = await dbCtx.db.collection('organization_members')
        .where('orgId', '==', orgId)
        .where('userId', '==', req.user.id)
        .limit(1)
        .get();
      if (!snap.empty) userRole = snap.docs[0].data().role;
    } else {
      const mem = dbCtx.inMemoryDB.organization_members.find(
        m => m && m.orgId === orgId && m.userId === req.user.id
      );
      if (mem) userRole = mem.role;
    }

    if (!userRole || (userRole !== 'admin' && userRole !== 'manager')) {
      return res.status(403).json({ error: 'Unauthorized: Only Admins or Managers can invite team members.' });
    }

    await inviteMember(dbCtx, orgId, email, role, invitedBy);
    res.json({ success: true, message: 'Corporate invitation email sent successfully!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/org/accept-invite
// Consumes and validates a secure invitation token (Fix 2)
router.post('/accept-invite', async (req, res) => {
  try {
    const dbCtx = getDbCtx();
    const { token, orgId } = req.body;
    const userId = req.user.id;

    if (!token || !orgId) {
      return res.status(400).json({ error: 'Missing required validation token or organization identifier.' });
    }

    const result = await acceptInvitation(dbCtx, token, orgId, userId);
    res.json({ 
      success: true, 
      message: 'Invitation accepted! Welcome to the team.',
      role: result.role
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/org/:orgId/dashboard
router.get('/:orgId/dashboard', verifyOrgAccess, async (req, res) => {
  try {
    const dbCtx = getDbCtx();
    const data = await getOrgDashboard(dbCtx, req.params.orgId);
    res.json({ success: true, ...data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/org/:orgId/audit
router.get('/:orgId/audit', verifyOrgAccess, async (req, res) => {
  try {
    const dbCtx = getDbCtx();
    const audit = await auditSeats(dbCtx, req.params.orgId);
    res.json({ success: true, audit });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/org/:orgId/gst-report
router.get('/:orgId/gst-report', verifyOrgAccess, async (req, res) => {
  try {
    const dbCtx = getDbCtx();
    const { period } = req.query;
    
    const dashboard = await getOrgDashboard(dbCtx, req.params.orgId);
    const pdfBuffer = await generateGSTReport(
      dashboard.org,
      dashboard.subscriptions,
      period || 'This Month'
    );
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=gst-report-${req.params.orgId}.pdf`);
    res.send(pdfBuffer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/org/:orgId/subscription
// Adds a subscription to the corporate organization
router.post('/:orgId/subscription', verifyOrgAccess, async (req, res) => {
  try {
    const dbCtx = getDbCtx();
    const orgId = req.params.orgId;
    
    if (req.orgMember.role === 'viewer') {
      return res.status(403).json({ error: 'Access denied: Viewers cannot add subscriptions.' });
    }

    const subId = 'sub_org_' + Math.random().toString(36).substr(2, 9);
    const subData = {
      orgId,
      addedBy: req.user.id,
      name: req.body.name,
      amount: parseFloat(req.body.amount) || 0,
      currency: req.body.currency || 'INR',
      billingCycle: req.body.billingCycle || 'monthly',
      renewalDate: req.body.renewalDate ? new Date(req.body.renewalDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      category: req.body.category || 'Other',
      assignedTo: req.body.assignedTo || [],
      status: 'active',
      gstRate: 18,
      vendorGST: req.body.vendorGST || 'VENDOR_GST_NUMBER',
      invoiceNumber: req.body.invoiceNumber || 'INV-2024-001',
      notes: req.body.notes || 'Company SaaS Seat License'
    };

    if (dbCtx.dbType === 'firestore') {
      await dbCtx.db.collection('organization_subscriptions').doc(subId).set(subData);
    }
    
    dbCtx.inMemoryDB.organization_subscriptions.push({ id: subId, ...subData });
    dbCtx.saveLocalDB();

    res.json({ success: true, subscription: { id: subId, ...subData } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/org/:orgId/subscription/:subId
// Modifies a corporate subscription
router.put('/:orgId/subscription/:subId', verifyOrgAccess, async (req, res) => {
  try {
    const dbCtx = getDbCtx();
    const { subId } = req.params;
    
    if (req.orgMember.role === 'viewer') {
      return res.status(403).json({ error: 'Access denied: Viewers cannot modify subscriptions.' });
    }

    const updateData = {};
    if (req.body.name !== undefined) updateData.name = req.body.name;
    if (req.body.amount !== undefined) updateData.amount = parseFloat(req.body.amount);
    if (req.body.currency !== undefined) updateData.currency = req.body.currency;
    if (req.body.billingCycle !== undefined) updateData.billingCycle = req.body.billingCycle;
    if (req.body.category !== undefined) updateData.category = req.body.category;
    if (req.body.assignedTo !== undefined) updateData.assignedTo = req.body.assignedTo;
    if (req.body.status !== undefined) updateData.status = req.body.status;
    if (req.body.vendorGST !== undefined) updateData.vendorGST = req.body.vendorGST;
    if (req.body.invoiceNumber !== undefined) updateData.invoiceNumber = req.body.invoiceNumber;
    if (req.body.notes !== undefined) updateData.notes = req.body.notes;

    if (dbCtx.dbType === 'firestore') {
      await dbCtx.db.collection('organization_subscriptions').doc(subId).update(updateData);
    }
    
    const index = dbCtx.inMemoryDB.organization_subscriptions.findIndex(s => s && s.id === subId);
    if (index !== -1) {
      dbCtx.inMemoryDB.organization_subscriptions[index] = {
        ...dbCtx.inMemoryDB.organization_subscriptions[index],
        ...updateData
      };
    }
    dbCtx.saveLocalDB();

    res.json({ success: true, message: 'Corporate subscription updated successfully!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/org/:orgId/subscription/:subId
// Removes a corporate subscription
router.delete('/:orgId/subscription/:subId', verifyOrgAccess, async (req, res) => {
  try {
    const dbCtx = getDbCtx();
    const { subId } = req.params;

    if (req.orgMember.role === 'viewer') {
      return res.status(403).json({ error: 'Access denied: Viewers cannot delete subscriptions.' });
    }

    if (dbCtx.dbType === 'firestore') {
      await dbCtx.db.collection('organization_subscriptions').doc(subId).delete();
    }
    
    const index = dbCtx.inMemoryDB.organization_subscriptions.findIndex(s => s && s.id === subId);
    if (index !== -1) {
      dbCtx.inMemoryDB.organization_subscriptions.splice(index, 1);
    }
    dbCtx.saveLocalDB();

    res.json({ success: true, message: 'Corporate subscription deleted.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
