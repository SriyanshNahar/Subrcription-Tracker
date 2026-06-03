// CRITICAL POPUP API CONFIGURATION
const IS_PRODUCTION = false; // Set to true on production deploy
const API_URL = IS_PRODUCTION
  ? 'https://vaultly.onrender.com'
  : 'http://localhost:5000';

document.addEventListener('DOMContentLoaded', async () => {
  const loginView = document.getElementById('login-view');
  const saveView = document.getElementById('save-view');
  const successView = document.getElementById('success-view');
  const connBadge = document.getElementById('conn-badge');

  // Helper: check if token is expired
  const isTokenExpired = (expiry) => {
    if (!expiry) return true;
    return Date.now() > expiry;
  };

  // Check current auth state
  const checkAuth = async () => {
    return new Promise((resolve) => {
      chrome.storage.local.get(['token', 'tokenExpiry', 'detectedService'], (data) => {
        const token = data.token;
        const expiry = data.tokenExpiry;

        if (!token || isTokenExpired(expiry)) {
          // Token missing or expired
          connBadge.textContent = 'Disconnected';
          connBadge.className = 'badge';
          loginView.classList.remove('hidden');
          saveView.classList.add('hidden');
          successView.classList.add('hidden');
          resolve(null);
        } else {
          // Connected
          connBadge.textContent = 'Connected';
          connBadge.className = 'badge connected';
          loginView.classList.add('hidden');
          saveView.classList.remove('hidden');
          successView.classList.add('hidden');

          // Pre-fill detected service if available
          if (data.detectedService) {
            document.getElementById('sub-name').value = data.detectedService;
            // Clear from storage so it does not persist across different domains
            chrome.storage.local.remove('detectedService');
          }
          resolve(token);
        }
      });
    });
  };

  // Perform initial check
  let token = await checkAuth();

  // Helper to show errors
  const showError = (msg) => {
    const errorDiv = document.getElementById('login-error');
    if (errorDiv) {
      errorDiv.textContent = msg;
    }
  };

  // Login handler
  document.getElementById('btn-login').addEventListener('click', async () => {
    const emailEl = document.getElementById('email');
    const passwordEl = document.getElementById('password');
    const errorDiv = document.getElementById('login-error');
    if (errorDiv) errorDiv.textContent = '';

    if (!emailEl || !passwordEl) {
      showError('Please enter email and password');
      return;
    }

    const email = emailEl.value ? emailEl.value.trim() : '';
    const password = passwordEl.value ? passwordEl.value : '';

    if (!email || !password) {
      showError('Please enter email and password');
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Login failed.');
      }

      // Save token + tokenExpiry (JWT standard 7 days standard or 1 hour fallback)
      const oneHour = 60 * 60 * 1000;
      const expiryTime = Date.now() + (7 * 24 * oneHour); // standard 7 days expiry

      chrome.storage.local.set({ 
        token: data.token,
        tokenExpiry: expiryTime
      }, async () => {
        token = data.token;
        await checkAuth();
      });

    } catch (err) {
      errorDiv.textContent = err.message;
    }
  });

  // Save Subscription handler
  document.getElementById('btn-save').addEventListener('click', async () => {
    const name = document.getElementById('sub-name').value.trim();
    const amount = document.getElementById('sub-amount').value;
    const currency = document.getElementById('sub-currency').value;
    const billingCycle = document.getElementById('sub-billing').value;
    const category = document.getElementById('sub-category').value;
    const errorDiv = document.getElementById('save-error');
    errorDiv.textContent = '';

    if (!name || !amount) {
      errorDiv.textContent = 'Please fill in name and amount.';
      return;
    }

    // CRITICAL: Double check token expiry before hitting API
    const authCheckToken = await checkAuth();
    if (!authCheckToken) {
      errorDiv.textContent = 'Session expired. Please log in again.';
      return;
    }

    try {
      const payload = {
        name,
        amount: parseFloat(amount),
        currency,
        billingCycle,
        category,
        startDate: new Date().toISOString().split('T')[0],
        status: 'Active'
      };

      const res = await fetch(`${API_URL}/api/subscriptions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authCheckToken}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save subscription.');
      }

      // Transition to success screen
      saveView.classList.add('hidden');
      successView.classList.remove('hidden');
      document.getElementById('success-desc').textContent = `${name} has been synced to your dashboard.`;

    } catch (err) {
      errorDiv.textContent = err.message;
    }
  });

  // Logout handler
  document.getElementById('btn-logout').addEventListener('click', () => {
    chrome.storage.local.remove(['token', 'tokenExpiry'], async () => {
      token = null;
      await checkAuth();
    });
  });

  // Close handler
  document.getElementById('btn-close').addEventListener('click', () => {
    window.close();
  });
});
