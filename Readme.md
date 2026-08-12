# Centralized Exchange (CEX) 

A small, full-stack cryptocurrency-exchange prototype built around an in-memory matching engine. It supports authenticated order placement and cancellation, live order-book and trade updates, candlestick data, a frontend trading screen, a market-making simulator, and snapshot-based engine recovery.

## Architecture
![CEX architecture](./assets/architecture.png)

## Services

- *Frontend* — `fe/` — Port `3001`
  React/Vite trading UI

- *HTTP API* — `http/` — Port `3000`
  Auth, REST API, validation, and command forwarding

- *Matching Engine* — `engine/`
  Order matching, balance locking, snapshots, and recovery

- *WebSocket Gateway* — `ws/` — Port `8080`
  Authenticated subscriptions and real-time updates

- *Database Worker* — `db/`
  Creates TimescaleDB candle aggregates

- *Simulator* — `simulate/`
  Creates two bots to maintain a populated `SOL_USDC` order book

- *Redis* — Docker — Port `6379`
  Command stream/list, Pub/Sub, and database queue

- *PostgreSQL* — Docker — Port `5432`
  Prisma user database

- *TimescaleDB* — Docker — Port `5433`
  Trade history and continuous kline aggregates

## Overview

- Sign-up and sign-in with JWT authentication.
- USDC and SOL demo on-ramping.
- Limit buy and sell orders, matching, partial fills, and cancellations.
- Self-trade prevention in the matching engine.
- Live order-book depth, trades, and balance updates over WebSocket.
- Trade persistence in TimescaleDB and 1-minute, 1-hour, and 1-week candles.
- Engine snapshots every two minutes and Redis Stream replay after a restart.
- A two-bot simulator that maintains 15 bids and 15 asks and occasionally creates trades.
- A recovery integration test that compares live state with recovered state.

## Prerequisites

- [Bun](https://bun.sh/)
- Docker and Docker Compose

The repository uses local Redis, PostgreSQL, and TimescaleDB. Start them first:

```bash
docker compose -f docker/docker-compose.yml up -d
```

Create `http/.env`:

```env
DATABASE_URL="postgresql://postgres:postgrespass@localhost:5432/postgres?schema=public"
JWT_SECRET="replace-this-with-a-local-development-secret"
```

## Run the project

Install dependencies in each service once:

```bash
cd engine && bun install
cd ../http && bun install
cd ../ws && bun install
cd ../db && bun install
cd ../simulate && bun install
cd ../fe && bun install
```

Generate the Prisma client and apply the user-database migrations:

```bash
cd http
bunx prisma generate
bunx prisma migrate deploy
```

Start each process in its own terminal, in this order:

```bash
# Terminal 1 — matching engine
cd engine
bun run index.ts

# Terminal 2 — HTTP API
cd http
bun run index.ts

# Terminal 3 — WebSocket gateway
cd ws
bun run index.ts

# Terminal 4 — TimescaleDB worker
cd db
bun run src/index.ts

# Terminal 5 — frontend
cd fe
bun run dev
```

Open the frontend at <http://localhost:3001>.

### Optional: populate the order book

After Redis, the API, and the engine are running, start the simulator in another terminal:

```bash
cd simulate
bun run src/index.ts
```

It signs in (or creates) two persistent local bot accounts, funds them, maintains 15 bid levels and 15 ask levels around a changing midpoint, randomly cancels stale levels, and occasionally places crossing orders to produce trades.

## REST API

Base URL: `http://localhost:3000/api/v1`

Authenticated endpoints expect the raw JWT in the `authorization` header:

```http
authorization: <token>
```

### Authentication and OnRamp

| Method | Route | Body | Description |
| --- | --- | --- | --- |
| `POST` | `/auth/signup` | `{ "username", "password" }` | Creates a user. Both fields must be at least 5 characters. |
| `POST` | `/auth/signin` | `{ "username", "password" }` | Returns `{ "token" }`. |
| `POST` | `/auth/onramp` | `{ "amount": "1000" }` | Adds demo USDC to the authenticated user. |
| `POST` | `/auth/onramp-base` | `{ "amount": "10" }` | Adds demo SOL to the authenticated user. |

### Orders and market data

| Method | Route | Auth | Inputs | Description |
| --- | --- | --- | --- | --- |
| `POST` | `/order` | Yes | `type`, `symbol`, `side`, `price`, `quantity` | Places an `limit` order; quantities and prices are strings. |
| `DELETE` | `/order/cancel-order` | Yes | `symbol`, `orderId` | Cancels an open order and unlocks its remaining balance. |
| `GET` | `/order/open-orders?symbol=SOL_USDC` | Yes | Query: `symbol` | Returns the caller’s open orders. |
| `GET` | `/depth?symbol=SOL_USDC` | No | Query: `symbol` | Returns current order-book depth. |
| `GET` | `/klines?market=SOL_USDC&interval=1m&startTime=...&endTime=...` | No | Query: market, interval, Unix seconds | Returns candle data. Supported intervals: `1m`, `1h`, `1w`. |

Example order:

```bash
curl -X POST http://localhost:3000/api/v1/order \
  -H 'Content-Type: application/json' \
  -H "authorization: $TOKEN" \
  -d '{
    "type": "limit",
    "symbol": "SOL_USDC",
    "side": "buy",
    "price": "100.00",
    "quantity": "1"
  }'
```

## WebSocket protocol

Connect to `ws://localhost:8080`.

Authenticate before subscribing:

```json
{ "type": "AUTH", "token": "<jwt>" }
```

Then subscribe to one or more channels:

```json
{
  "type": "SUBSCRIBE",
  "params": ["depth@SOL_USDC", "trade@SOL_USDC", "balance@"]
}
```

`balance@` is rewritten by the server to the authenticated user’s own balance channel. To unsubscribe, send the same `params` with type `UNSUBSCRIBE`.

The gateway sends these messages:

```json
{ "type": "DEPTH_UPDATE", "data": { "bids": [["99.80", "1"]], "asks": [["100.20", "2"]] } }
```

```json
{ "type": "TRADE_PUBLISH", "data": { "price": 100, "quantity": "1", "tradeId": "0", "symbol": "SOL_USDC", "side": "buy" } }
```

```json
{ "type": "BALANCE_UPDATE", "data": { "balance": 900 } }
```

## Matching engine and recovery

The engine keeps order books and balances in memory. It uses Redis in two ways:

- State-changing commands (`CREATE_ORDER`, `CANCEL_ORDER`, `ON_RAMP`, `ON_RAMP_BASE`) are appended to the `order:stream` Redis Stream.
- Read-only requests such as depth and open orders use the normal Redis command queue.

Every two minutes the engine writes `engine/snapshot.json` containing order books, balances, and the last applied Stream ID. After a restart it:

1. restores the snapshot into memory;
2. reads Redis Stream events strictly after that saved ID;
3. applies them without republishing old API, WebSocket, or database side effects;
4. starts consuming new stream messages from the recovered cursor.

After a successful snapshot, older stream entries are trimmed asynchronously. The snapshot is written first.

### Recovery test

With Redis running:

```bash
cd engine
bun test
```

The test uses a unique temp Redis stream name and a temporary snapshot inside `engine/test/`. It places funds and orders, saves a snapshot, performs a matching trade, creates and cancels an order, adds more funds, simulates a restart with a `second engine` instance, and asserts that recovered state equals the original live state. It does not touch the normal `engine/snapshot.json` or `order:stream`.

## Project layout

```text
cex/
├── engine/       # Matching engine, order book, Redis recovery, recovery test
├── http/         # Express REST API, JWT middleware, Prisma user model
├── ws/           # WebSocket server and Redis Pub/Sub subscriptions
├── db/           # TimescaleDB trade writer and continuous aggregates
├── fe/           # React/Vite trading interface
├── simulate/     # Two-bot market simulation script
└── docker/       # Local Redis, PostgreSQL, and TimescaleDB Compose file
```

## Current limitations and next steps

- Only `SOL_USDC` is initialized by the engine; multi-market initialization is the next major extension.
- Authentication Passwords are not hashed.
- Order and trade persistence is intentionally incomplete; the database worker currently persists trades for charting.
- Add matching fairness for price - time priority than lowest ask or highest bid
