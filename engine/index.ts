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

  await redistClient.xGroupCreate("order:stream", "engine-group", "0", { MKSTREAM: true }).catch(() => { }) // mkstream true means  create a stream if doesnt exist

  while (true) {
    const res = await redistClient.xReadGroup("engine-group", "engine-1", {
      key: "order:stream",
      id: ">" // give all new messages that have not been delivered to any other consumer group
    })

    if (!res) continue; // if res is null(means no order made) this condition true then continue the loop from start not run below code

    for (const msg of res[0]?.messages) {
      const message = JSON.parse(msg.message.data)
      engine.process(message.msg, message.clientId)
      await redistClient.xAck("order:stream", "engine-group", msg.id)
    }
  }
}


main()

