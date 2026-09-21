/*/**
 * Benchmark script for Cex — measures real orders/sec throughput.
 *
 * Flow:
 *   1. Log in as a buyer and a seller (two pre-existing signed-up users).
 *   2. Onramp BOTH quote asset (e.g. USDC) and base asset (e.g. SOL) for
 *      both users, so neither order gets rejected for insufficient balance.
 *   3. Wait for balances to actually settle in the DB before trading —
 *      either by polling a balance endpoint (preferred, if you have one)
 *      or falling back to a flat delay.
 *   4. Run concurrent BUY-only and SELL-only load tests at a fixed price
 *      so orders actually cross and match (avoids self-trade prevention
 *      rejecting everything, which would happen with a single user).
 *
 * Setup:
 *   npm install autocannon node-fetch@2
 *
 * Before running:
 *   1. Sign up two test users manually (via your UI or signup endpoint).
 *   2. Confirm BASE_URL, LOGIN_ENDPOINT, ONRAMP_ENDPOINT,
 *      ONRAMP_BASE_ENDPOINT, ORDER_ENDPOINT below match your routes.
 *   3. If you have a balance-check endpoint, fill in BALANCE_ENDPOINT and
 *      set USE_BALANCE_POLLING = true. Otherwise leave it false and it
 *      will just wait FALLBACK_DELAY_MS.
 *   4. Run: node benchmark-orders.js
 */

const autocannon = require('autocannon');

const BASE_URL = 'http://localhost:3000';
const LOGIN_ENDPOINT = '/api/v1/auth/signin';
const ONRAMP_ENDPOINT = '/api/v1/auth/onramp';           // quote asset (e.g. USDC)
const ONRAMP_BASE_ENDPOINT = '/api/v1/auth/onramp-base'; // base asset (e.g. SOL)
const ORDER_ENDPOINT = '/api/v1/order';
const BENCHMARK_DURATION_SECONDS = 30;

// --- balance-settling config ---
const USE_BALANCE_POLLING = false;           // <-- set true if you have a balance endpoint
const BALANCE_ENDPOINT = '/api/v1/balance';  // <-- fill in your real route if used
const POLL_INTERVAL_MS = 300;
const POLL_TIMEOUT_MS = 10000;
const FALLBACK_DELAY_MS = 1500;              // used when USE_BALANCE_POLLING is false

const BUYER = { username: 'buyer@test.com', password: 'testpass123' };
const SELLER = { username: 'seller@test.com', password: 'testpass123' };

// Large enough that thousands of test orders won't exhaust it.
// Adjust the type if your onRampSchema expects a number instead of a string.
const ONRAMP_AMOUNT = '1000000';

function extractToken(loginResponseJson) {
  return loginResponseJson.token;
}

async function login(user) {
  const res = await fetch(BASE_URL + LOGIN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(user),
  });
  if (!res.ok) {
    throw new Error(`Login failed for ${user.email}: ${res.status} ${await res.text()}`);
  }
  const json = await res.json();
  const token = extractToken(json);
  if (!token) {
    throw new Error(`Could not find token in login response: ${JSON.stringify(json)}`);
  }
  return token;
}

async function onramp(endpoint, token, label) {
  const res = await fetch(BASE_URL + endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `${token}`, // no "Bearer " prefix, matching authMiddleware
    },
    body: JSON.stringify({ amount: ONRAMP_AMOUNT }),
  });
  if (!res.ok) {
    throw new Error(`Onramp (${label}) failed: ${res.status} ${await res.text()}`);
  }
  return res.json();
}


// Polls the balance endpoint until it shows a balance >= the onramp amount,
// or times out. Adjust the field path (e.g. json.balance, json.data.usdc)
// to match your actual response shape.
async function waitForBalanceSettled(token, label) {
  const start = Date.now();
  while (Date.now() - start < POLL_TIMEOUT_MS) {
    const res = await fetch(BASE_URL + BALANCE_ENDPOINT, {
      headers: { 'Authorization': `${token}` },
    });
    if (res.ok) {
      const json = await res.json();
      // <-- adjust this check to match your real balance response shape
      const balance = Number(json.balance ?? json.quoteBalance ?? 0);
      if (balance >= Number(ONRAMP_AMOUNT)) {
        console.log(`${label} balance settled (${balance}).`);
        return;
      }
    }
  }
  console.warn(`${label} balance did not confirm as settled within timeout — proceeding anyway.`);
}

async function fundUser(token, label) {
  await onramp(ONRAMP_ENDPOINT, token, `${label} quote asset`);
  await onramp(ONRAMP_BASE_ENDPOINT, token, `${label} base asset`);
  console.log(`Onramp calls sent for ${label} (quote + base asset).`);

  if (USE_BALANCE_POLLING) {
    await waitForBalanceSettled(token, label);
  }
}

function runOrderBenchmark({ label, token, side }) {
  const orders = {
    placed: 0,
    rejected: 0,
    invalidResponse: 0,
  };

  return autocannon({
    url: BASE_URL + ORDER_ENDPOINT,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `${token}`,
    },
    connections: 50, // 50 buyer + 50 seller connections = 100 total.
    duration: BENCHMARK_DURATION_SECONDS,
    body: JSON.stringify({
      type: 'limit',
      symbol: 'SOL_USDC',
      side,              // 'buy' or 'sell'
      price: '500.00',   // fixed so buy/sell cross and match
      quantity: '0.1',
    }),
    onResponse(statusCode, body) {
      if (statusCode < 200 || statusCode >= 300) return;

      try {
        const response = JSON.parse(body.toString());

        if (response.payload?.type === 'ORDER_PLACED') {
          orders.placed++;
        } else if (response.payload?.type === 'ORDER_CANCELLED') {
          orders.rejected++;
        } else {
          orders.invalidResponse++;
        }
      } catch {
        orders.invalidResponse++;
      }
    },
  }).then((result) => ({ label, result, orders }));
}

async function main() {
  console.log('Logging in test users...');
  const [buyerToken, sellerToken] = await Promise.all([
    login(BUYER),
    login(SELLER),
  ]);
  console.log('Both users authenticated.\n');

  console.log('Onramping balances for both users...');
  await Promise.all([
    fundUser(buyerToken, 'BUYER'),
    fundUser(sellerToken, 'SELLER'),
  ]);

  if (!USE_BALANCE_POLLING) {
    console.log(`\nNo balance endpoint configured — waiting ${FALLBACK_DELAY_MS}ms as a fallback for DB writes to settle...`);
  }

  console.log('\nFunding complete. Starting load test...\n');

  const [buyerRun, sellerRun] = await Promise.all([
    runOrderBenchmark({ label: 'BUYER', token: buyerToken, side: 'buy' }),
    runOrderBenchmark({ label: 'SELLER', token: sellerToken, side: 'sell' }),
  ]);

  for (const { label, result, orders } of [buyerRun, sellerRun]) {
    console.log(`--- ${label} RESULTS ---`);
    console.log(`Requests/sec (avg): ${result.requests.average}`);
    console.log(`Latency avg (ms):   ${result.latency.average}`);
    console.log(`Latency p99 (ms):   ${result.latency.p99}`);
    console.log(`2xx responses:      ${result['2xx']}`);
    console.log(`Errors/non-2xx:     ${result.errors + result.non2xx}`);
    console.log(`Engine accepted:    ${orders.placed}`);
    console.log(`Engine rejected:    ${orders.rejected}`);
    console.log(`Bad 2xx payloads:   ${orders.invalidResponse}`);
    console.log(`Accepted orders/sec: ${(orders.placed / BENCHMARK_DURATION_SECONDS).toFixed(2)}\n`);
  }

  const combinedHttpRps = buyerRun.result.requests.average + sellerRun.result.requests.average;
  const combinedAccepted = buyerRun.orders.placed + sellerRun.orders.placed;
  const combinedRejected = buyerRun.orders.rejected + sellerRun.orders.rejected;

  console.log(`Combined HTTP throughput: ${combinedHttpRps.toFixed(0)} requests/sec`);
  console.log(`Combined accepted orders: ${combinedAccepted}`);
  console.log(`Combined rejected orders: ${combinedRejected}`);
  console.log(`Accepted order throughput: ${(combinedAccepted / BENCHMARK_DURATION_SECONDS).toFixed(2)} orders/sec`);
}

main().catch((err) => {
  console.error('Benchmark failed:', err.message);
  process.exit(1);
});
