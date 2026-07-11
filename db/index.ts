import { Client } from "pg";
import { createClient } from "redis";

export type DbMessage = {
  type: "TRADE_ADDED",
  data: {
    id: string,
    market: string,
    price: string,
    quantity: string,
    quoteQuantity: string, // quote asset quantity (USDC) used
    timestamp: number,
  }
} | {
  type: "ORDER_UPDATE",
  data: {
    orderId: string,
    executedQuantity: string,
    market: string
  }
}

const pgClient = new Client({
  user: 'your_user',
  host: "localhost",
  database: "",
  password: "",
  port: 5432
})

async function dbProcessor() {
  const redisClient = createClient()
  // await redisClient.connect()

  while (true) {
    let a = await redisClient.brPop("db_publish", 0)

    let dbMessage: DbMessage = JSON.parse(a?.element!)

    console.log(dbMessage)

    if (dbMessage.type == "TRADE_ADDED") {

      // insert into timescale db with raw query
    }

  }
}

dbProcessor()
