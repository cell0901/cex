import WebSocket, { WebSocketServer } from "ws"
import { UserManager } from "./UserManager"

const wss = new WebSocketServer({ port: 8080 })


// all trades from engine for specfic ticker if user subscribed to it only
// all depth updates
wss.on('connection', (ws) => {
  // every connection user made. we create userManger.class for that user with userId

  UserManager.getInstance().setUser(ws)

  // and subscribe to that pub/sub redis for the market trade and depth updates
})


