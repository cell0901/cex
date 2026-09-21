import { createClient, type RedisClient, type RedisClientType } from "redis"
import type { MessageToEngine } from "../types/messageToEngine";
import type { fromEngine } from "../types/fromEngine";

export class RedisManager { // this RedisManager will be used to connect to http instead with single instance 
  // instead everytime creating new instance. db, engine will also have this RedisManager to connect to redis
  public static instance: RedisManager;
  private client: RedisClientType;
  private subscriberClient: RedisClientType; // in redis if client enter subscriber mode it should only subscribe related commands

  // on calling this class first create the client then connect
  constructor() {
    this.client = createClient({ url: process.env.REDIS_URL ?? "redis://localhost:6379" });
    this.subscriberClient = createClient({ url: process.env.REDIS_URL ?? "redis://localhost:6379" });
    this.client.connect(); // after connecting i can send to queue or do whatever
    this.subscriberClient.connect();
  }

  public static getInstance() { // calling this function creates the instance. if already exist then return the previous one
    if (!this.instance) {
      this.instance = new RedisManager()
    }

    return this.instance
  }

  send(msg: MessageToEngine) {
    let clientId = this.generateRandomClientId()

    return new Promise<fromEngine>((resolve, rej) => {
      let finished = false;

      const cleanup = () => {
        clearTimeout(timer);
        void this.subscriberClient.unsubscribe(clientId);
      };

      const fail = (error: unknown) => {
        if (finished) return; // if try catch fails on JSON parse then this check should be here
        finished = true;
        cleanup()
        rej(error)
      }

      const timer = setTimeout(() => {
        fail(new Error("Engine response timeout"))
      }, 5000)

      this.subscriberClient.subscribe(clientId, (message) => {
        if (finished) return; // if finished is set true. (means message already arrived, timer passed, or redis failed). then return

        // if not then cleanup the timer
        try {
          const response = JSON.parse(message)
          finished = true;
          cleanup();
          resolve(response)
        } catch (e) {
          fail(e)
        }
      }).then(async () => { // this runs after succcessfull redis subscribe. not after subscribe callback handler 
        if (finished) return;

        if (
          msg.type === "CREATE_ORDER" ||
          msg.type === "CANCEL_ORDER" ||
          msg.type === "ON_RAMP" ||
          msg.type === "ON_RAMP_BASE"
        ) {
          await this.client.xAdd("order:stream", "*", {
            data: JSON.stringify({ clientId, msg }),
          });
        } else {
          await this.client.lPush("order", JSON.stringify({ clientId, msg }))
        }

      }).catch(fail) // if subscribe failed set finished to true

    });

  }


  generateRandomClientId() {
    return crypto.randomUUID()
  }

}
