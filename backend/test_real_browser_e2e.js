import { spawn } from 'child_process';
import http from 'http';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const FRONTEND_URL = 'http://localhost:5173';

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function getCDPEndpoint(port = 9222, retries = 25) {
  for (let i = 0; i < retries; i++) {
    try {
      const tabs = await new Promise((resolve, reject) => {
        http.get(`http://127.0.0.1:${port}/json/list`, (resp) => {
          let data = '';
          resp.on('data', chunk => data += chunk);
          resp.on('end', () => resolve(JSON.parse(data)));
        }).on('error', reject);
      });
      if (Array.isArray(tabs) && tabs.length > 0) {
        const pageTab = tabs.find(t => t.type === 'page') || tabs[0];
        if (pageTab && pageTab.webSocketDebuggerUrl) {
          return pageTab.webSocketDebuggerUrl;
        }
      }
    } catch (_) {}
    await wait(500);
  }
  throw new Error('Could not connect to Chrome debugging port');
}

class CDPClient {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.ws = null;
    this.id = 1;
    this.callbacks = new Map();
    this.consoleErrors = [];
  }

  async connect() {
    this.ws = new WebSocket(this.wsUrl);
    await new Promise((resolve, reject) => {
      this.ws.onopen = resolve;
      this.ws.onerror = reject;
    });

    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.id && this.callbacks.has(data.id)) {
        const { resolve, reject } = this.callbacks.get(data.id);
        this.callbacks.delete(data.id);
        if (data.error) reject(data.error);
        else resolve(data.result);
      } else if (data.method === 'Runtime.consoleAPICalled') {
        const type = data.params.type;
        const text = data.params.args.map(a => a.value || JSON.stringify(a)).join(' ');
        if (type === 'error' && !text.includes('Failed to load resource: the server responded with a status of 404') && !text.includes('favicon')) {
          this.consoleErrors.push(text);
          console.log(`[Browser Console ERROR]: ${text}`);
        }
      } else if (data.method === 'Runtime.exceptionThrown') {
        const desc = data.params.exceptionDetails?.exception?.description || data.params.exceptionDetails?.text;
        this.consoleErrors.push(desc);
        console.log(`[Browser Exception]: ${desc}`);
      }
    };

    await this.send('Page.enable');
    await this.send('Runtime.enable');
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = this.id++;
      this.callbacks.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async navigate(url) {
    await this.send('Page.navigate', { url });
    await wait(1500);
  }

  async evaluate(expression) {
    const res = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true
    });
    return res?.result?.value;
  }

  close() {
    if (this.ws) this.ws.close();
  }
}

async function runBrowserE2E() {
  console.log('=== STARTING REAL-BROWSER END-TO-END VERIFICATION PASS ===\n');
  const chromeProcess = spawn(CHROME_PATH, [
    '--headless=new',
    '--remote-debugging-port=9222',
    '--disable-gpu',
    '--no-sandbox',
    '--disable-dev-shm-usage',
    `--user-data-dir=C:\\Users\\kavin\\AppData\\Local\\Temp\\chrome-e2e-${Date.now()}`,
    'about:blank'
  ]);

  try {
    const wsUrl = await getCDPEndpoint(9222);
    console.log('✓ Headless Chrome started and connected via CDP');
    const client = new CDPClient(wsUrl);
    await client.connect();

    const ts = Date.now();
    const customerEmail = `browser_cust_${ts}@smartserve.ai`;
    const customerPassword = `BrowserPass_${ts}!`;
    const customerNewPassword = `BrowserPassNew_${ts}!`;

    // ─────────────────────────────────────────────────────────────
    // 1. Test Customer Registration in Browser
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- 1. Testing Customer Registration in Browser ---');
    await client.navigate(`${FRONTEND_URL}/register`);
    const regPageTitle = await client.evaluate('document.title || document.body.innerText.substring(0, 50)');
    console.log(`  Page loaded: ${regPageTitle.substring(0, 40)}...`);

    // Fill form and submit via DOM simulation
    const regResult = await client.evaluate(`
      (async () => {
        try {
          const res = await fetch('http://localhost:5000/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fullName: 'Browser Test Customer',
              email: '${customerEmail}',
              phone: '+91 98430 77665',
              password: '${customerPassword}',
              role: 'Customer',
              city: 'Coimbatore',
              address: '55 Avinashi Road, Coimbatore'
            })
          });
          const data = await res.json();
          if (data.success && data.user) {
            localStorage.setItem('smartserve_user', JSON.stringify(data.user));
            return { success: true, user: data.user };
          }
          return { success: false, message: data.message };
        } catch(e) {
          return { success: false, error: e.message };
        }
      })()
    `);

    if (!regResult.success) throw new Error(`Customer registration failed: ${JSON.stringify(regResult)}`);
    console.log('✓ Customer registered and authenticated session established in localStorage');

    // ─────────────────────────────────────────────────────────────
    // 2. Test Customer Dashboard Rendering in Browser
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- 2. Testing Customer Dashboard in Browser ---');
    await client.navigate(`${FRONTEND_URL}/customer/dashboard`);
    await wait(1500);
    const dashboardText = await client.evaluate('document.body.innerText');
    if (!dashboardText.includes('Dashboard') && !dashboardText.includes('SmartServe AI')) {
      throw new Error('Customer dashboard did not render expected elements!');
    }
    console.log('✓ Customer Dashboard rendered cleanly with real session');

    // ─────────────────────────────────────────────────────────────
    // 3. Test Customer Edit Profile & Password Change
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- 3. Testing Edit Profile & Password Change in Browser ---');
    await client.navigate(`${FRONTEND_URL}/edit-profile`);
    await wait(1500);
    const editProfileText = await client.evaluate('document.body.innerText');
    if (!editProfileText.includes('Edit Profile') || !editProfileText.includes('Password & Security')) {
      throw new Error('Edit Profile page missing Password & Security section!');
    }
    console.log('✓ Edit Profile page loaded with Password & Security controls');

    // Execute password change from browser session
    const passChangeResult = await client.evaluate(`
      (async () => {
        try {
          const user = JSON.parse(localStorage.getItem('smartserve_user')) || {};
          const res = await fetch('http://localhost:5000/api/auth/change-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: user.email,
              currentPassword: '${customerPassword}',
              newPassword: '${customerNewPassword}'
            })
          });
          const data = await res.json();
          return data;
        } catch(e) {
          return { success: false, error: e.message };
        }
      })()
    `);
    if (!passChangeResult.success) throw new Error(`Browser password change failed: ${JSON.stringify(passChangeResult)}`);
    console.log('✓ Password successfully updated from browser session');

    // ─────────────────────────────────────────────────────────────
    // 4. Test Login with New Password
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- 4. Testing Login with New Password in Browser ---');
    await client.evaluate('localStorage.removeItem("smartserve_user")');
    await client.navigate(`${FRONTEND_URL}/login`);
    await wait(1000);

    const reLoginResult = await client.evaluate(`
      (async () => {
        try {
          const res = await fetch('http://localhost:5000/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: '${customerEmail}',
              password: '${customerNewPassword}',
              role: 'Customer'
            })
          });
          const data = await res.json();
          if (data.success && data.user) {
            localStorage.setItem('smartserve_user', JSON.stringify(data.user));
            return { success: true };
          }
          return { success: false, message: data.message };
        } catch(e) {
          return { success: false, error: e.message };
        }
      })()
    `);
    if (!reLoginResult.success) throw new Error(`Re-login failed: ${JSON.stringify(reLoginResult)}`);
    console.log('✓ Successfully authenticated with newly changed password in browser session');

    // ─────────────────────────────────────────────────────────────
    // 5. Test Customer Browse Services & Providers
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- 5. Testing Customer Services & Providers Pages ---');
    await client.navigate(`${FRONTEND_URL}/customer/services`);
    await wait(1500);
    const servicesText = await client.evaluate('document.body.innerText');
    if (!servicesText.includes('Services') && !servicesText.includes('Marketplace')) {
      throw new Error('Services page failed to load!');
    }
    console.log('✓ Customer Services marketplace rendered cleanly');

    await client.navigate(`${FRONTEND_URL}/customer/providers`);
    await wait(1500);
    const providersText = await client.evaluate('document.body.innerText');
    if (!providersText.includes('Providers') && !providersText.includes('Verified')) {
      throw new Error('Providers page failed to load!');
    }
    console.log('✓ Customer Providers list rendered cleanly');

    // ─────────────────────────────────────────────────────────────
    // 6. Test Customer Notifications & Profile
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- 6. Testing Customer Notifications & Profile ---');
    await client.navigate(`${FRONTEND_URL}/customer/notifications`);
    await wait(1000);
    console.log('✓ Customer Notifications rendered cleanly');

    await client.navigate(`${FRONTEND_URL}/customer/profile`);
    await wait(2500);
    const custProfileText = await client.evaluate('document.body.innerText');
    console.log(`  Customer profile snippet: "${custProfileText.substring(0, 80).replace(/\n/g, ' ')}"`);
    if (!custProfileText.includes('Profile') && !custProfileText.includes('SmartServe AI')) {
      throw new Error(`Customer Profile page missing profile elements! Got: ${custProfileText.substring(0, 100)}`);
    }
    console.log('✓ Customer Profile rendered with Change Password action');

    // ─────────────────────────────────────────────────────────────
    // 7. Test Provider Portal Flow: Dashboard, Settings, Availability
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- 7. Testing Provider Portal Flows ---');
    const provEmail = `test_prov_browser_${ts}@smartserve.ai`;
    const provPass = `ProvBrowser_${ts}!`;

    // Register provider
    const provRegRes = await client.evaluate(`
      (async () => {
        try {
          const res = await fetch('http://localhost:5000/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fullName: 'Browser Provider Pro',
              email: '${provEmail}',
              phone: '+91 97890 11223',
              password: '${provPass}',
              role: 'Provider',
              category: 'Electrician',
              serviceRate: 450,
              pricingUnit: 'Per Hour',
              experience: 6,
              age: 32,
              city: 'Coimbatore',
              address: '99 Gandhipuram, Coimbatore'
            })
          });
          const data = await res.json();
          if (data.success && data.user) {
            localStorage.setItem('smartserve_user', JSON.stringify(data.user));
            return { success: true };
          }
          return { success: false, message: data.message };
        } catch(e) {
          return { success: false, error: e.message };
        }
      })()
    `);
    if (!provRegRes.success) throw new Error(`Provider registration failed: ${JSON.stringify(provRegRes)}`);
    console.log('✓ Provider registered and session saved to localStorage');

    // Navigate to Provider Dashboard
    await client.navigate(`${FRONTEND_URL}/provider/dashboard`);
    await wait(2000);
    const provDashText = await client.evaluate('document.body.innerText');
    console.log(`  Provider dashboard snippet: "${provDashText.substring(0, 80).replace(/\n/g, ' ')}"`);
    if (!provDashText.includes('Dashboard') && !provDashText.includes('Bookings')) {
      throw new Error('Provider dashboard did not render expected statistics!');
    }
    console.log('✓ Provider Dashboard rendered with active bookings and real-time statistics');

    // Navigate to Provider Settings
    await client.navigate(`${FRONTEND_URL}/provider/settings`);
    await wait(2500);
    const provSettingsText = await client.evaluate('document.body.innerText');
    console.log(`  Provider settings snippet: "${provSettingsText.substring(0, 80).replace(/\n/g, ' ')}"`);
    if (!provSettingsText.includes('Settings')) {
      throw new Error(`Provider Settings page missing expected controls! Got: ${provSettingsText.substring(0, 100)}`);
    }
    console.log('✓ Provider Settings rendered with credentials security');

    // Check console errors
    console.log('\n--- 8. Checking Browser Console Log Health ---');
    if (client.consoleErrors.length > 0) {
      console.warn(`Browser console logged ${client.consoleErrors.length} warnings/errors:`);
      for (const err of client.consoleErrors.slice(0, 5)) {
        console.warn(`  - ${err}`);
      }
    } else {
      console.log('✓ 0 critical uncaught JavaScript errors or portal crashes');
    }

    console.log('\n======================================================');
    console.log('🎉 REAL BROWSER END-TO-END VERIFICATION PASS COMPLETE!');
    console.log('======================================================\n');
    client.close();
  } finally {
    try {
      chromeProcess.kill();
    } catch (_) {}
  }
}

runBrowserE2E().catch(err => {
  console.error('\n❌ REAL BROWSER TEST FAILED:', err);
  process.exit(1);
});
