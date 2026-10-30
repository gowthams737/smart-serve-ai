import { spawn } from 'child_process';
import http from 'http';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const DEBUG_PORT = 9222;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, res => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

class CDPClient {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.ws = null;
    this.id = 1;
    this.callbacks = new Map();
    this.eventListeners = new Map();
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.ws = new globalThis.WebSocket(this.wsUrl);
      this.ws.onopen = () => resolve();
      this.ws.onerror = err => reject(err);
      this.ws.onmessage = msg => {
        const data = JSON.parse(msg.data);
        if (data.id && this.callbacks.has(data.id)) {
          const { res, rej } = this.callbacks.get(data.id);
          this.callbacks.delete(data.id);
          if (data.error) rej(data.error);
          else res(data.result);
        } else if (data.method && this.eventListeners.has(data.method)) {
          this.eventListeners.get(data.method)(data.params);
        }
      };
    });
  }

  send(method, params = {}) {
    return new Promise((res, rej) => {
      const id = this.id++;
      this.callbacks.set(id, { res, rej });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  on(event, handler) {
    this.eventListeners.set(event, handler);
  }

  close() {
    if (this.ws) this.ws.close();
  }
}

async function runBrowserTests() {
  console.log('=== REAL BROWSER TESTING SUITE ===');

  // Launch Chrome headless with remote debugging
  const chromeProcess = spawn(CHROME_PATH, [
    `--remote-debugging-port=${DEBUG_PORT}`,
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--disable-dev-shm-usage',
    `--user-data-dir=C:\\Users\\kavin\\AppData\\Local\\Temp\\chrome-test-profile-${Date.now()}`
  ]);

  console.log('Spawned headless Chrome. Waiting for CDP endpoint...');
  let versionInfo = null;
  for (let i = 0; i < 30; i++) {
    await sleep(500);
    try {
      versionInfo = await fetchJson(`http://127.0.0.1:${DEBUG_PORT}/json/version`);
      if (versionInfo) break;
    } catch (e) {}
  }

  if (!versionInfo) {
    throw new Error('Could not connect to Chrome debugging endpoint');
  }

  console.log('Connected to Chrome via CDP:', versionInfo.Browser);

  // Query existing tab
  const tabs = await fetchJson(`http://127.0.0.1:${DEBUG_PORT}/json/list`);
  const newTab = tabs.find(t => t.type === 'page') || tabs[0];
  const cdp = new CDPClient(newTab.webSocketDebuggerUrl);
  await cdp.connect();

  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Log.enable');

  const consoleErrors = [];
  cdp.on('Runtime.exceptionThrown', (params) => {
    const text = params.exceptionDetails?.exception?.description || params.exceptionDetails?.text;
    consoleErrors.push(text);
    console.error(' [BROWSER EXCEPTION]', text);
  });

  cdp.on('Runtime.consoleAPICalled', (params) => {
    if (params.type === 'error') {
      const msg = params.args.map(a => a.value || a.description).join(' ');
      consoleErrors.push(msg);
      console.error(' [CONSOLE ERROR]', msg);
    }
  });

  // Helper to navigate and evaluate
  async function testRoute({ role, user, path, name, verifySelector }) {
    console.log(`\nTesting [${role}] Route: ${path} (${name})...`);
    consoleErrors.length = 0;

    // Set localStorage before navigating
    await cdp.send('Page.navigate', { url: 'http://localhost:5173/login' });
    await sleep(1000);

    const setUserScript = `
      localStorage.setItem('smartserve_user', JSON.stringify(${JSON.stringify(user)}));
    `;
    await cdp.send('Runtime.evaluate', { expression: setUserScript });

    // Navigate to target route
    await cdp.send('Page.navigate', { url: `http://localhost:5173${path}` });
    await sleep(2500);

    // Evaluate DOM text and check for crashes
    const pageCheckScript = `
      (() => {
        const bodyText = document.body.innerText || '';
        const hasErrorBoundary = bodyText.includes('Something went wrong') && bodyText.includes('activeBookings');
        const hasExactError = bodyText.includes('activeBookings is not defined');
        const isBlank = bodyText.trim().length === 0;
        return {
          title: document.title,
          hasErrorBoundary,
          hasExactError,
          isBlank,
          textSnippet: bodyText.substring(0, 300).replace(/\\n+/g, ' ')
        };
      })()
    `;

    const evalResult = await cdp.send('Runtime.evaluate', { expression: pageCheckScript, returnByValue: true });
    const res = evalResult.result.value;

    const noActiveBookingsError = !res.hasExactError && !res.hasErrorBoundary;
    const notBlank = !res.isBlank;
    const errorCount = consoleErrors.filter(e => e.includes('activeBookings')).length;

    console.log(`  Rendered Text Snippet: "${res.textSnippet.substring(0, 120)}..."`);
    console.log(`  activeBookings error absent: ${noActiveBookingsError}`);
    console.log(`  Page is not blank: ${notBlank}`);

    if (noActiveBookingsError && notBlank && errorCount === 0) {
      console.log(`  [PASS] ${name} rendered cleanly.`);
      return true;
    } else {
      console.error(`  [FAIL] ${name} encountered an issue. Exact error: ${res.hasExactError}, Blank: ${res.isBlank}`);
      return false;
    }
  }

  const providerUser = {
    id: '6ae0d4b8f0c23cdf2718f8c8',
    email: 'sgowtham731@gmail.com',
    role: 'Provider',
    fullName: 'Gowtham S'
  };

  const customerUser = {
    id: '6ae0fffdb5e91efed8abfa73',
    email: 'sgowtham7@gmail.com',
    role: 'Customer',
    fullName: 'Gowtham S'
  };

  let totalTests = 0;
  let passedTests = 0;

  // 1. Test Provider Portal Routes
  const providerRoutes = [
    { path: '/provider/dashboard', name: 'Provider Dashboard' },
    { path: '/provider/profile', name: 'Provider Profile' },
    { path: '/provider/services', name: 'Provider Services' },
    { path: '/provider/bookings', name: 'Provider Booking Requests' },
    { path: '/provider/reviews', name: 'Provider Reviews' },
    { path: '/provider/availability', name: 'Provider Availability' },
    { path: '/provider/notifications', name: 'Provider Notifications' },
    { path: '/provider/settings', name: 'Provider Settings' }
  ];

  for (const r of providerRoutes) {
    totalTests++;
    const ok = await testRoute({ role: 'Provider', user: providerUser, path: r.path, name: r.name });
    if (ok) passedTests++;
  }

  // 2. Test Customer Portal Routes
  const customerRoutes = [
    { path: '/customer/dashboard', name: 'Customer Dashboard' },
    { path: '/customer/ai-planner', name: 'Customer AI Service Planner' },
    { path: '/customer/ai-estimator', name: 'Customer AI Cost Estimator' },
    { path: '/customer/ai-assistant', name: 'Customer AI Assistant' },
    { path: '/customer/providers', name: 'Customer Providers' },
    { path: '/customer/services', name: 'Customer Services' },
    { path: '/customer/bookings-and-saved', name: 'Customer Bookings & Saved' },
    { path: '/customer/notifications', name: 'Customer Notifications' },
    { path: '/customer/profile', name: 'Customer Profile' }
  ];

  for (const r of customerRoutes) {
    totalTests++;
    const ok = await testRoute({ role: 'Customer', user: customerUser, path: r.path, name: r.name });
    if (ok) passedTests++;
  }

  // Clean up
  cdp.close();
  chromeProcess.kill('SIGKILL');

  console.log(`\n=== REAL BROWSER TEST RESULTS: ${passedTests} / ${totalTests} PASSED ===`);
  if (passedTests === totalTests) {
    console.log('ALL BROWSER PORTAL TESTS COMPLETED SUCCESSFULLY.');
  } else {
    process.exit(1);
  }
}

runBrowserTests().catch(err => {
  console.error('Fatal browser test failure:', err);
  process.exit(1);
});
