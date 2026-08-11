import { createClient } from "redis";
import { Engine } from "./src/trade/Engine";


const engine = new Engine()

async function main() {
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

async function readStream() {
  const redistClient = createClient()
  await redistClient.connect()

  let lastId = engine.getLastAppliedStreamId() ?? "0-0" // 0-0 means start from ids greater than 0-0 means from very beggining


  while (true) {
    const res = await redistClient.xRead({
      key: "order:stream",
      id: lastId // shouldnt use "$" thiis skips the current cursor and start with next message
    }, { BLOCK: 0 }) // this will stop the the process here and will stop hitting cpu again in every loop if no stream message

    if (!res) continue; // if res is null(means no order made) this condition true then continue the loop from start not run below code

    for (const msg of res[0]?.messages) {
      const message = JSON.parse(msg.message.data)
      engine.process(message.msg, message.clientId)
      engine.setLastAppliedStreamId(msg.id)
      lastId = msg.id
    }
  }
}

async function bootstrap() {
  await engine.recoverFromSnapshot();
  void main(); // fire and forget. 
  void readStream();
}
bootstrap()
