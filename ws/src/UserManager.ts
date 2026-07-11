import type WebSocket from "ws"
import { User } from "./User"
import { SubscriptionManager } from "./SubscriptionManager"

export class UserManager {
  public static instance: UserManager
  public users: Map<string, User> = new Map() // the UserManager will store all user with random id
  // and then the user we will subscribe based on what he sends in the WebSocket object

  constructor() {
  }

  public static getInstance() {
    if (!this.instance) {
      this.instance = new UserManager()
    }
    return this.instance
  }

  setUser(ws: WebSocket) {
    let connectionId = crypto.randomUUID() // this should not be a random id. should be real id from the jwt token in client
    let user = new User(connectionId, ws);
    this.users.set(connectionId, user)
    this.onClose(ws, connectionId) // this only register the listener everytime the ws connection closes this will the user will be dleeted from the users Map
    // and unsub to all the channels
    return user;
  }

  getUser(userId: string) {
    return this.users.get(userId)
  }


  private onClose(ws: WebSocket, userId: string) { // not used right now 
    ws.on('close', () => {
      SubscriptionManager.getInstance().userLeft(userId)
      this.users.delete(userId)
    })
  }

}
