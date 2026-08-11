import { createClient, type RedisClientType } from "redis"
import type { MessageToApi } from "./types/messageToApi"
import type { DbMessage } from "./types/toDb"
import type { wsMessage } from "./types/toWs"

// this is for the engine
export class RedisManager {
  public static instance: RedisManager
  private client: RedisClientType

  constructor() {
    this.client = createClient()
    this.client.connect()
  }


  public static getInstance() {
    if (!this.instance) { // then create one
      this.instance = new RedisManager()
    }
    return this.instance
  }

  // we are fire and forgetting . since we need to process other trades and these can reach the api and 
  sendToApi(clientId: string, messageToApi: MessageToApi) {
    this.client.publish(clientId, JSON.stringify(messageToApi))
  }

  pushMessage(message: DbMessage) { // push message to db 
    console.log("db publish from engine", message)
    this.client.lPush("db_publish", JSON.stringify(message))
  }

  publishMessage(channel: string, message: wsMessage) { // for 
    console.log("from engine", channel, "message", message)
    this.client.publish(channel, JSON.stringify(message))
  }

  async getStreamReplayEvents(lastStreamMessageId: string, streamKey = "order:stream") {
    const res = await this.client.xRange(streamKey, `(${lastStreamMessageId}`, "+") // + means get all messages to end of queue (newest)
    return res
  }

  async trimStream(lastStreamMessageId: string, streamKey = "order:stream") {
    await this.client.xTrim(streamKey, "MINID", lastStreamMessageId, {
      strategyModifier: "~" //~ apprx is faster
    })
  }
}
