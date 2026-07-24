import { Client } from "pg";
import { createClient } from "redis";
import type { DbMessage } from "./types";


const pgClient = new Client({
  user: 'postgres',
  host: "localhost",
  database: "postgres", //  container name
  password: "postgrespass",
  port: 5433
})

await pgClient.connect()

async function initDb() {
  try {
    console.log("inside init db")

    await pgClient.query(`CREATE EXTENSION IF NOT EXISTS timescaledb;`); // for fresh db initialization

    await pgClient.query(`
      CREATE TABLE IF NOT EXISTS "trades" (
        time TIMESTAMPTZ NOT NULL,
        market TEXT NOT NULL,
        price DOUBLE PRECISION,
        quantity NUMERIC(30, 10) NOT NULL,
        currency_code VARCHAR(10)
      );
      SELECT create_hypertable('trades', 'time', if_not_exists => true);
    `);

    await pgClient.query(`
      CREATE MATERIALIZED VIEW IF NOT EXISTS klines_1m
      WITH (timescaledb.continuous) AS
      SELECT
        time_bucket('1 minute', time) AS bucket,
        market,
        first(price, time) AS open,
        max(price) AS high,
        min(price) AS low,
        last(price, time) AS close,
        sum(quantity) AS volume
      FROM trades
      GROUP BY bucket, market;
    `);

    try { // try cathc for refresh policy since it does not have IF NOT EXISTS thing
      // the refresh policy is -- every 1 minute, refresh klines_1m from now 1 day to now minus 1 minute
      await pgClient.query(`
        SELECT add_continuous_aggregate_policy('klines_1m',
          start_offset => INTERVAL '1 day',
          end_offset => INTERVAL '1 minute',
          schedule_interval => INTERVAL '1 minute'
        );
      `);
    } catch (err: any) {
      if (!err.message?.includes('already exists')) throw err;
    }

    // 1 HOUR

    await pgClient.query(`
      CREATE MATERIALIZED VIEW IF NOT EXISTS klines_1h
      WITH (timescaledb.continuous) AS
      SELECT
        time_bucket('1 hour', time) AS bucket,
        market,
        first(price, time) AS open,
        max(price) AS high,
        min(price) AS low,
        last(price, time) AS close,
        sum(quantity) AS volume
      FROM trades
      GROUP BY bucket, market;
    `);

    try {
      await pgClient.query(`
        SELECT add_continuous_aggregate_policy('klines_1h',
          start_offset => INTERVAL '30 days',
          end_offset => INTERVAL '1 hour',
          schedule_interval => INTERVAL '1 hour'
        );
      `);
    } catch (err: any) {
      if (!err.message?.includes('already exists')) throw err;
    }


    // 1 WEEK
    await pgClient.query(`
      CREATE MATERIALIZED VIEW IF NOT EXISTS klines_1w
      WITH (timescaledb.continuous) AS
      SELECT
        time_bucket('1 week', time) AS bucket,
        market,
        first(price, time) AS open,
        max(price) AS high,
        min(price) AS low,
        last(price, time) AS close,
        sum(quantity) AS volume
      FROM trades
      GROUP BY bucket, market;
    `);

    try {
      await pgClient.query(`
        SELECT add_continuous_aggregate_policy('klines_1w',
          start_offset => INTERVAL '2 years',
          end_offset => INTERVAL '1 week',
          schedule_interval => INTERVAL '1 day'
        );
      `);
    } catch (err: any) {
      if (!err.message?.includes('already exists')) throw err;
    }

    console.log("innit db done")

  } catch (e) {
    console.log("error while seeding the db", e)
  }

}

initDb().catch(console.error)

async function dbProcessor() {
  const redisClient = createClient()
  await redisClient.connect()

  while (true) {
    let a = await redisClient.brPop("db_publish", 0)

    let dbMessage: DbMessage = JSON.parse(a?.element!)

    console.log(dbMessage)

    if (dbMessage.type == "TRADE_ADDED") {
      // insert into timescale db with raw query

      const timestamp = new Date(dbMessage.data.timestamp)
      const market = dbMessage.data.market
      const price = dbMessage.data.price
      const quantity = dbMessage.data.quantity
      const currecy_code = "USDC"
      // the volume inside these intervals will be in SOL quantity
      const query = 'INSERT INTO trades(time, market, price, quantity, currency_code) VALUES ($1, $2, $3, $4, $5)'

      const values = [timestamp, market, price, quantity, currecy_code]
      await pgClient.query(query, values)

      console.log("after inserting data")
    }
    // todo: also add orders published to orders table
  }
}

dbProcessor()
