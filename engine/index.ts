import { createClient } from "redis";
import { Orderbook, type Order } from "./src/trade/Orderbook";
import { Engine } from "./src/trade/Engine";


async function main() {
  const engine = new Engine()
  const redisClient = createClient()
  await redisClient.connect()
  // infinite runing loop. constantly removing messages from the the queue
  // should use brpop since it will not run loop continously spiking cpu usage instead 
  // it will block on the connection waiting for nay new message
  while (true) {
    let response = await redisClient.brPop("order", 0); // block connection indefinite until any element is pushed to queue 
    const message = JSON.parse(response?.element!)
    engine.process(message.msg, message.clientId)
  }
}
main()

