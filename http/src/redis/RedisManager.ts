import { createClient, type RedisClient, type RedisClientType } from "redis"
import type { MessageToEngine } from "../types/messageToEngine";
import type { fromEngine } from "../types/fromEngine";

export class RedisManager { // this RedisManager will be used to connect to http instead with single instance 
  // instead everytime creating new instance. db, engine will also have this RedisManager to connect to redis
  public static instance: RedisManager;
  private client: RedisClientType;

  // on calling this class first create the client then connect
  constructor() {
    this.client = createClient();
    this.client.connect(); // after connecting i can send to queue or do whatever
  }

  public static getInstance() { // calling this function creates the instance. if already exist then return the previous one
    if (!this.instance) {
      this.instance = new RedisManager()
    }

    return this.instance
  }

  send(msg: MessageToEngine) {
    if (msg.type == "CREATE_ORDER" || msg.type == "CANCEL_ORDER" || msg.type == "ON_RAMP" || msg.type == "ON_RAMP_BASE") {
      return new Promise<fromEngine>((resolve) => {
        let clientId = this.generateRandomClientId()
        this.client.subscribe(clientId, (message) => { //this tells redis if u every send message to this pub call this callback fundtion
          this.client.unsubscribe(clientId)
          resolve((JSON.parse(message))) // this Promise will resolve after we gets the message
        })
        this.client.xAdd('order:stream', "*", {
          data: JSON.stringify({ clientId: clientId, msg })
        })
      })
    } else {
      return new Promise<fromEngine>((resolve) => {
        let clientId = this.generateRandomClientId()
        this.client.subscribe(clientId, (message) => { //this tells redis if u every send message to this pub call this callback fundtion
          this.client.unsubscribe(clientId)
          resolve((JSON.parse(message))) // this Promise will resolve after we gets the message
        })
        this.client.lPush('order', JSON.stringify({ clientId: clientId, msg }))
      })
    }
  }


  generateRandomClientId() {
    return crypto.randomUUID()
  }

}
