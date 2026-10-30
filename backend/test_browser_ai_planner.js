import { spawn } from 'child_process';
import http from 'http';
import assert from 'assert';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const DEBUG_PORT = 9223;

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

async function testAIServicePlannerInteractive() {
  console.log('=== AI SERVICE PLANNER INTERACTIVE BROWSER TEST ===');

  const chromeProcess = spawn(CHROME_PATH, [
    `--remote-debugging-port=${DEBUG_PORT}`,
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--disable-dev-shm-usage',
    `--user-data-dir=C:\\Users\\kavin\\AppData\\Local\\Temp\\chrome-planner-test-${Date.now()}`
  ]);

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

  const tabs = await fetchJson(`http://127.0.0.1:${DEBUG_PORT}/json/list`);
  const newTab = tabs.find(t => t.type === 'page') || tabs[0];
  const cdp = new CDPClient(newTab.webSocketDebuggerUrl);
  await cdp.connect();

  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');

  const customerUser = {
    id: '6ae0fffdb5e91efed8abfa73',
    email: 'sgowtham7@gmail.com',
    role: 'Customer',
    fullName: 'Gowtham S',
    address: 'Peelamedu, Coimbatore'
  };

  try {
    // 1. Navigate to login and seed localStorage
    await cdp.send('Page.navigate', { url: 'http://localhost:5173/login' });
    await sleep(800);
    await cdp.send('Runtime.evaluate', {
      expression: `localStorage.setItem('smartserve_user', JSON.stringify(${JSON.stringify(customerUser)}));`
    });

    // 2. Navigate to AI Planner
    console.log('Navigating to /customer/ai-planner...');
    await cdp.send('Page.navigate', { url: 'http://localhost:5173/customer/ai-planner' });
    await sleep(3000);

    // 3. Verify initial page load & 8 structured sections
    const pageCheck = await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const text = (document.body.innerText || '').toUpperCase();
        return {
          hasHeader: text.includes('AI SERVICE PLANNER'),
          hasUnderstanding: text.includes('1. UNDERSTANDING YOUR REQUIREMENT'),
          hasRecommended: text.includes('2. RECOMMENDED SERVICE'),
          hasRequiredDetails: text.includes('3. REQUIRED DETAILS'),
          hasWorkPlan: text.includes('4. SUGGESTED WORK PLAN'),
          hasMatchingProviders: text.includes('5. MATCHING VERIFIED PROVIDERS'),
          hasEstCost: text.includes('6. ESTIMATED COST'),
          hasEstDuration: text.includes('7. ESTIMATED DURATION'),
          hasNextStep: text.includes('8. NEXT STEP'),
          hasZeroSurcharge: text.includes('ZERO PLATFORM SURCHARGES'),
          hasPlaceholder: document.querySelector('input[type="text"]')?.placeholder
        };
      })()`,
      returnByValue: true
    });

    const res = pageCheck.result.value;
    console.log('Initial page check:', res);
    assert.ok(res.hasHeader, 'Must display AI Service Planner header');
    assert.ok(res.hasUnderstanding, 'Must render Section 1: Understanding Your Requirement');
    assert.ok(res.hasRecommended, 'Must render Section 2: Recommended Service');
    assert.ok(res.hasRequiredDetails, 'Must render Section 3: Required Details');
    assert.ok(res.hasWorkPlan, 'Must render Section 4: Suggested Work Plan');
    assert.ok(res.hasMatchingProviders, 'Must render Section 5: Matching Verified Providers');
    assert.ok(res.hasEstCost, 'Must render Section 6: Estimated Cost');
    assert.ok(res.hasEstDuration, 'Must render Section 7: Estimated Duration');
    assert.ok(res.hasNextStep, 'Must render Section 8: Next Step');
    assert.ok(res.hasZeroSurcharge, 'Must highlight Zero Platform Surcharges');
    assert.ok(!res.hasPlaceholder?.toLowerCase().includes('e.g.'), 'Search input placeholder must NOT contain example text');

    console.log('[PASS] All 8 structured planning sections rendered cleanly on the page.');

    // 4. Test Search Bar with typos / natural language
    console.log('Testing planner search bar with typo "electrishan"...');
    await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const input = document.querySelector('input[type="text"]');
        if (input) {
          const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
          nativeInputValueSetter.call(input, 'electrishan');
          input.dispatchEvent(new Event('input', { bubbles: true }));
        }
      })()`
    });
    await sleep(500);

    // Click search submit button
    await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const btn = document.querySelector('button[type="submit"]');
        if (btn) btn.click();
      })()`
    });
    await sleep(2500);

    const searchCheck = await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const text = document.body.innerText || '';
        return {
          hasElectrician: text.includes('Electrician'),
          hasWorkPlan: text.includes('4. Suggested Work Plan'),
          hasMatchingProviders: text.includes('5. Matching Verified Providers')
        };
      })()`,
      returnByValue: true
    });
    console.log('Search response check:', searchCheck.result.value);
    assert.ok(searchCheck.result.value.hasElectrician, 'Search for typo electrishan must resolve to Electrician plan');

    // 5. Test Unmatched Query Empty State
    console.log('Testing unmatched query for empty state...');
    await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const input = document.querySelector('input[type="text"]');
        if (input) {
          const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
          nativeInputValueSetter.call(input, 'spaceship astronaut mechanic');
          input.dispatchEvent(new Event('input', { bubbles: true }));
        }
      })()`
    });
    await sleep(500);

    await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const btn = document.querySelector('button[type="submit"]');
        if (btn) btn.click();
      })()`
    });
    await sleep(2500);

    const emptyStateCheck = await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const text = document.body.innerText || '';
        return {
          hasNoMatch: text.includes('No Matching Services or Providers Found'),
          hasSupportedHint: text.includes('Supported Categories in Coimbatore')
        };
      })()`,
      returnByValue: true
    });
    console.log('Empty state check:', emptyStateCheck.result.value);
    assert.ok(emptyStateCheck.result.value.hasNoMatch, 'Must show clear empty state for unmatched search');
    assert.ok(emptyStateCheck.result.value.hasSupportedHint, 'Must suggest supported categories');

    console.log('[PASS] Empty state rendered accurately for unmatched search queries.');

    console.log('\n=== ALL INTERACTIVE PLANNER BROWSER TESTS PASSED! ===');
  } finally {
    cdp.close();
    chromeProcess.kill('SIGKILL');
  }
}

testAIServicePlannerInteractive().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
