import { afterAll, expect, test } from "bun:test";
import { createClient } from "redis";
import { rmSync } from "node:fs";
import { join } from "node:path";
import { Engine } from "../src/trade/Engine";
import type { MessageFromApi } from "../src/types/messageFromApi";

// INTEGRATED test for testing the recovery of state of engine before crash and after snapshot

const snapshotPath = join(import.meta.dir, `.recovery-${crypto.randomUUID()}.snapshot.json`);
const streamKey = `test:engine-recovery:${crypto.randomUUID()}`;
const redis = createClient({
  socket: { reconnectStrategy: false }
});

async function processAndRecord(engine: Engine, message: MessageFromApi) {
  const clientId = crypto.randomUUID();
  const streamId = await redis.xAdd(streamKey, "*", {
    data: JSON.stringify({ clientId, msg: message })
  });

  // This represents the live engine consuming the same command from the stream.
  engine.process(message, clientId, { replay: true });
  engine.setLastAppliedStreamId(streamId);
}

afterAll(async () => { // after test del the redis stream and close the connection 
  if (redis.isOpen) {
    await redis.del(streamKey);
    await redis.quit();
  }
  rmSync(snapshotPath, { force: true }); // delete the file
});

test("recovers identical state from a snapshot and later stream events", async () => {
  await redis.connect();

  const liveEngine = new Engine({ // create Engine with this snapshot path and new streamKey
    snapshotPath: snapshotPath,
    streamKey: streamKey,
    enableSnapshotTimer: false
  });
  await liveEngine.recoverFromSnapshot();

  // These commands are included in the initial snapshot.
  await processAndRecord(liveEngine, {
    type: "ON_RAMP",
    data: { userId: "buyer", amount: "1000" }
  });
  await processAndRecord(liveEngine, {
    type: "ON_RAMP_BASE",
    data: { userId: "seller", amount: "10" }
  });
  await liveEngine.saveSnapshot();

  // These commands happen after the snapshot and must be replayed after a crash.
  await processAndRecord(liveEngine, {
    type: "CREATE_ORDER",
    data: {
      type: "limit",
      symbol: "SOL_USDC",
      side: "sell",
      price: "100",
      quantity: "2",
      userId: "seller",
      orderId: "sell-after-snapshot"
    }
  });
  await processAndRecord(liveEngine, {
    type: "CREATE_ORDER",
    data: {
      type: "limit",
      symbol: "SOL_USDC",
      side: "buy",
      price: "100",
      quantity: "1",
      userId: "buyer",
      orderId: "buy-matches-after-snapshot"
    }
  });
  await processAndRecord(liveEngine, {
    type: "CREATE_ORDER",
    data: {
      type: "limit",
      symbol: "SOL_USDC",
      side: "buy",
      price: "90",
      quantity: "1",
      userId: "buyer",
      orderId: "buy-then-cancel-after-snapshot"
    }
  });
  await processAndRecord(liveEngine, {
    type: "CANCEL_ORDER",
    data: {
      symbol: "SOL_USDC",
      orderId: "buy-then-cancel-after-snapshot"
    }
  });
  await processAndRecord(liveEngine, {
    type: "ON_RAMP",
    data: { userId: "buyer", amount: "25" }
  });

  const expectedState = liveEngine.getStateForTest(); // get the state just before crashing and after the snapshot

  // A new Engine instance simulates a process restart after a crash. uses the temp recover snapshot file in this folder
  const recoveredEngine = new Engine({
    snapshotPath,
    streamKey,
    enableSnapshotTimer: false // so we dont mess up with the original snapshot json file
  });
  await recoveredEngine.recoverFromSnapshot(); // reaches the state just before the crash

  expect(recoveredEngine.getStateForTest()).toEqual(expectedState); // both json should match
});
