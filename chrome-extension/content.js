const host = window.location.hostname.toLowerCase();
const path = window.location.pathname.toLowerCase();

const KNOWN_SERVICES = [
  'netflix.com', 'spotify.com', 'adobe.com', 'figma.com',
  'notion.so', 'canva.com', 'github.com', 'slack.com',
  'zoom.us', 'dropbox.com', 'grammarly.com',
  'linkedin.com', 'microsoft.com', 'hulu.com',
  'disneyplus.com', 'primevideo.com', 'hotstar.com',
  'youtube.com', 'twitch.tv', 'chatgpt.com',
  'openai.com', 'airtable.com', 'monday.com',
  'asana.com', 'trello.com', 'atlassian.com',
  'shopify.com', 'mailchimp.com', 'hubspot.com',
  'zapier.com', 'webflow.com', 'squarespace.com',
  'wix.com', 'vercel.com', 'cloudflare.com',
  'loom.com', 'miro.com', 'framer.com'
];

const BILLING_PATHS = [
  '/billing', '/subscription', '/checkout',
  '/payment', '/upgrade', '/plans', '/pricing',
  '/subscribe', '/order', '/cart', '/buy'
];

const isKnownService = KNOWN_SERVICES.some(s => host.includes(s));
const isBillingPage = BILLING_PATHS.some(p => path.includes(p));

// Wrap ALL banner execution code in this clean if block:
if (isKnownService || isBillingPage) {
  console.log('Trackovo active on:', host);

  // Determine service name
  let serviceName = '';
  for (const service of KNOWN_SERVICES) {
    if (host.includes(service)) {
      const cleanName = service.split('.')[0];
      serviceName = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
      break;
    }
  }

  if (!serviceName) {
    const cleanHost = host.replace('www.', '').split('.')[0];
    serviceName = cleanHost.charAt(0).toUpperCase() + cleanHost.slice(1);
  }

  const injectFloatingBanner = (serviceName) => {
    if (document.getElementById('trackovo-saver-banner')) return;

    const banner = document.createElement('div');
    banner.id = 'trackovo-saver-banner';
    banner.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 999999;
      background: rgba(17, 17, 30, 0.85);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 16px;
      padding: 16px 20px;
      color: white;
      font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
      display: flex;
      align-items: center;
      gap: 16px;
      backdrop-filter: blur(16px);
      box-shadow: 0 10px 30px rgba(0,0,0,0.5), inset 0 1px 1px rgba(255,255,255,0.1);
      animation: trackovo-slide-in 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    `;

    // Inject animation keyframes
    const style = document.createElement('style');
    style.innerHTML = `
      @keyframes trackovo-slide-in {
        from { transform: translateY(100px) scale(0.9); opacity: 0; }
        to { transform: translateY(0) scale(1); opacity: 1; }
      }
      @keyframes trackovo-fade-out {
        from { transform: translateY(0) scale(1); opacity: 1; }
        to { transform: translateY(40px) scale(0.95); opacity: 0; }
      }
    `;
    document.head.appendChild(style);

    const logoUrl = 'http://localhost:4200/favicon.png';

    banner.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px;">
        <img src="${logoUrl}" style="width: 32px; height: 32px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.15); background: rgba(255,255,255,0.05); object-fit: contain; padding: 3px;" onerror="this.onerror=null; this.src='https://trackovo.onrender.com/favicon.png'">
        <div style="text-align: left;">
          <h4 style="margin: 0; font-size: 13px; font-weight: 800; color: white;">Save to Trackovo?</h4>
          <p style="margin: 2px 0 0; font-size: 11px; color: #9CA3AF;">Add ${serviceName} subscription</p>
        </div>
      </div>
      <div style="display: flex; gap: 8px; align-items: center;">
        <button id="trackovo-add-now" style="background: linear-gradient(135deg, #6C63FF, #FF007F); border: none; color: white; font-weight: bold; font-size: 11px; padding: 8px 14px; border-radius: 8px; cursor: pointer; transition: opacity 0.2s;">Add Now</button>
        <button id="trackovo-dismiss" style="background: transparent; border: 1px solid rgba(255,255,255,0.2); color: #D1D5DB; font-weight: 600; font-size: 11px; padding: 8px 12px; border-radius: 8px; cursor: pointer; transition: background 0.2s;">Dismiss</button>
      </div>
    `;

    document.body.appendChild(banner);

    document.getElementById('trackovo-dismiss').addEventListener('click', () => {
      banner.style.animation = 'trackovo-fade-out 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards';
      setTimeout(() => banner.remove(), 300);
    });

    document.getElementById('trackovo-add-now').addEventListener('click', () => {
      const IS_PRODUCTION = false; // Toggle to true on deployment
      const dashboardUrl = IS_PRODUCTION
        ? 'https://trackovo.onrender.com'
        : 'http://localhost:4200';

      window.open(
        `${dashboardUrl}/dashboard?addSub=${encodeURIComponent(serviceName)}`,
        '_blank'
      );

      // Transition to visual success state on floating banner
      const btn = document.getElementById('trackovo-add-now');
      btn.textContent = '🚀 Opened Tab!';
      btn.style.background = '#10B981';
      btn.disabled = true;

      setTimeout(() => {
        banner.style.animation = 'trackovo-fade-out 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards';
        setTimeout(() => banner.remove(), 300);
      }, 1500);
    });
  };

  // Inject the banner
  injectFloatingBanner(serviceName);
}
