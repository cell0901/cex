import type WebSocket from "ws"
import type { incomingMessage, SUBSCRIBE } from "./types/usertoWs"
import { SubscriptionManager } from "./SubscriptionManager";
import type { OutgoingMessage } from "./types/wsToClient";
import { verifyJwt } from "./utils";

export class User {
  private id: string | null = null
  private ws: WebSocket
  private connectionId: string
  private messageQueue = Promise.resolve()

  constructor(connectionId: string, ws: WebSocket) {
    this.connectionId = connectionId
    this.ws = ws
    this.listener() // on every message user sends we add listener
  }

  private listener() {
    this.ws.on("message", (message: string) => {
      // to fix the problem of react comp fast mount and unmount could cause multiple SUBSCRIBE UNSUBSCRIBE ws events.
      // that could run concurrently. adding async on ws message callback doesnt do anything since it fires anyways 
      // so have to use messageQueue to process each message one by one
      this.messageQueue = this.messageQueue
        .catch(console.error)
        .then(() => this.handleMessage(message))
    });
  }

  private async handleMessage(message: string) {
    const incoming: incomingMessage = JSON.parse(message)

    if (incoming.type == "AUTH") {
      const userId = verifyJwt(incoming.token)
      if (!userId) {
        this.ws.send(JSON.stringify({ type: "INVALID_TOKEN" }))
        return
      }
      this.id = userId
      this.ws.send(JSON.stringify({ type: "AUTH_SUCCESS" }))
      return
    }

    if (!this.id) { // if user not authenticated
      this.ws.send(JSON.stringify({ type: "UNAUTHENTICATED" }))
      return
    }

    if (incoming.type == "SUBSCRIBE") {
      for (const s of incoming.params) {
        const channel = s.startsWith("balance@") ? `balance@${this.id}` : s;
        console.log("inside subscribe", channel)
        await SubscriptionManager.getInstance().subscribe(this.connectionId, channel);
      }
    }

    if (incoming.type == "UNSUBSCRIBE") {
      // for each param remove the subscription for the user
      for (const s of incoming.params) {
        const channel = s.startsWith("balance@") ? `balance@${this.id}` : s;
        await SubscriptionManager.getInstance().unsubscribe(this.connectionId, channel);
      }
    }

  }


  emit(message: OutgoingMessage) {
    console.log("acutally did the emit", message)
    this.ws.send(JSON.stringify(message))
  }

}
