import { Client } from "pg";

const pgClient = new Client({
  user: "postgres",
  host: "localhost",
  database: "postgres",
  password: "postgrespass",
  port: 5433,
});

const MARKET = "SOL_USDC";
const CURRENCY = "USDC";

// how far back to start seeding from
const HOURS_BACK = 3;

// price bounds
const MIN_PRICE = 80;
const MAX_PRICE = 150;
const START_PRICE = 110;

// gap between trades, in seconds (random within this range)
const MIN_GAP_SEC = 2;
const MAX_GAP_SEC = 5;

function randomInRange(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

// simple bounded random walk so price movement looks realistic
// instead of pure random jumps every tick
function nextPrice(prev: number) {
  const step = randomInRange(-0.5, 0.5); // small step each trade
  let next = prev + step;
  if (next < MIN_PRICE) next = MIN_PRICE + Math.abs(step);
  if (next > MAX_PRICE) next = MAX_PRICE - Math.abs(step);
  return Math.round(next * 100) / 100; // 2 decimal places
}

async function seed() {
  await pgClient.connect();

  const now = Date.now();
  const startTime = now - HOURS_BACK * 60 * 60 * 1000;

  let currentTime = startTime;
  let price = START_PRICE;
  let count = 0;

  const rows: { time: Date; market: string; price: number; quantity: number; currency_code: string }[] = [];

  while (currentTime <= now) {
    price = nextPrice(price);
    const quantity = Math.round(randomInRange(0.1, 5) * 10000) / 10000;

    rows.push({
      time: new Date(currentTime),
      market: MARKET,
      price,
      quantity,
      currency_code: CURRENCY,
    });

    count++;
    const gapSec = randomInRange(MIN_GAP_SEC, MAX_GAP_SEC);
    currentTime += gapSec * 1000;
  }

  console.log(`Inserting ${count} trades from ${new Date(startTime).toISOString()} to ${new Date(now).toISOString()}...`);

  // batch insert in chunks for speed
  const CHUNK_SIZE = 100;
  for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
    const chunk = rows.slice(i, i + CHUNK_SIZE);

    const values: any[] = [];
    const placeholders = chunk
      .map((row, idx) => {
        const base = idx * 5;
        values.push(row.time, row.market, row.price, row.quantity, row.currency_code);
        return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5})`;
      })
      .join(", ");

    const query = `INSERT INTO trades (time, market, price, quantity, currency_code) VALUES ${placeholders}`;
    await pgClient.query(query, values);
    console.log(`Inserted ${Math.min(i + CHUNK_SIZE, rows.length)} / ${rows.length}`);
  }

  // force refresh the continuous aggregates so the new data shows up immediately
  // instead of waiting for the scheduled background job
  console.log("Refreshing continuous aggregates...");
  await pgClient.query(`CALL refresh_continuous_aggregate('klines_1m', NULL, NULL);`);
  await pgClient.query(`CALL refresh_continuous_aggregate('klines_1h', NULL, NULL);`);
  await pgClient.query(`CALL refresh_continuous_aggregate('klines_1w', NULL, NULL);`);

  console.log("Done seeding.");
  await pgClient.end();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
