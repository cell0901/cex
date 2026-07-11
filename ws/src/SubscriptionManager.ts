import { createClient, type RedisClientType } from "redis"
import { UserManager } from "./UserManager"
import type { OutgoingMessage } from "./types/wsToClient"

export class SubscriptionManager {
  public static instance: SubscriptionManager// static means this belongs to this class itself and not its new instance
  private client: RedisClientType
  private ready: Promise<RedisClientType>
  private subscriptions: Map<string, string[]> = new Map() // this userId can have subscription of multiple things so we use array
  private refCount: Map<string, string[]> = new Map() // ref count. on unsubscribe just remove the userId for this channel from the array we first 
  // put in the subscribe method

  constructor() {
    this.client = createClient()
    this.ready = this.client.connect()
  }

  public static getInstance() {
    if (!this.instance) {
      this.instance = new SubscriptionManager()
    }
    return this.instance
  }

  public async subscribe(userId: string, channel: string) {
    await this.ready
    if (this.subscriptions.get(userId)?.includes(channel)) { // means user is already subscribed to  thiis channel return
      return
    }

    // if it doesnt then all the previous subscriptions add this one also

    const previous = this.subscriptions.get(userId) || []
    this.subscriptions.set(userId, previous.concat(channel))

    const previousRefs = this.refCount.get(channel)
    this.refCount.set(channel, (previousRefs || []).concat(userId))

    if (this.refCount.get(channel)?.length === 1) { // means only one user or first user has come so we need to channel to the channel for this first time 
      console.log("inside the if check measns this is the first connection")
      // it will not repeat as more 
      console.log("for channel", channel)
      await this.client.subscribe(channel, this.redisCallbackHandler)
      console.log("redis subscribed", channel)
    }
  }

  private redisCallbackHandler = (message: string, channel: string) => {
    const parsedMessage: OutgoingMessage = JSON.parse(message)
    console.log("parsedMessage", parsedMessage)

    this.refCount.get(channel)?.forEach(user => UserManager.getInstance().getUser(user)?.emit(parsedMessage))
  }

  public async unsubscribe(userId: string, channel: string) {
    await this.ready
    const subscriptions = this.subscriptions.get(userId)
    if (subscriptions) { // first get if any subscription exist
      this.subscriptions.set(userId, subscriptions.filter(s => s !== channel))
    }
    if (this.refCount.get(channel)) {
      this.refCount.set(channel, this.refCount.get(channel)!.filter(user => user !== userId)) // remove the userId from the channel
    }
    if (this.refCount.get(channel)?.length === 0) { // if no user exist to keep subscribed to this  channel then unsubscribe the pub sub
      this.refCount.delete(channel)

      console.log("unsubscribe called", userId, channel)
      await this.client.unsubscribe(channel)
      console.log("redis unsubscribed", channel)
    }
  }

  userLeft(userId: string) { // means the unsubscribe to all the channel for the user 
    // this.subscriptions.
    this.subscriptions.get(userId)?.forEach(s => this.unsubscribe(userId, s))
    this.subscriptions.delete(userId)
  }


}
