export const WS_URL = "ws://localhost:8080"

// registerCallback("depth", fn, id)  →  stores fn in callbacks["depth"]
// sendMessage({SUBSCRIBE depth})     →  tells server "send me depth data"
//         ...time passes...
// server pushes a depth frame        →  ws.onmessage fires
//   → type = "depth"
//   → this.callbacks["depth"].forEach(({callback}) => callback({bids, asks}))
//       → this calls YOUR fn from step 1, with the new data

export class SignalingManager {
  private ws: WebSocket;
  private bufferedMessage: any[] = [];
  private static instance: SignalingManager
  private callback: any = {}
  private initialized: boolean = false

  private constructor() {
    this.ws = new WebSocket(WS_URL)

    this.init()
  }

  public static getInstance() {
    if (!this.instance) {
      this.instance = new SignalingManager()
    }
    return this.instance
  }

  init() {
    this.ws.onopen = () => {
      console.log("connected to ws")
      this.initialized = true
      this.bufferedMessage.forEach(msg => {
        this.ws.send(JSON.stringify(msg))
      });
      this.bufferedMessage = []
    }

    this.ws.onmessage = (event) => { // on any incoming message from the server
      const parsedMessage = JSON.parse(event.data)
      const type = parsedMessage.type

      console.log("message from server", parsedMessage)
      if (type == "AUTH_SUCCESS" || type == "INVALID_TOKEN" || type == "UNAUTHENTICATED") {
        if (this.callback["AUTH"]) {
          this.callback["AUTH"].forEach(({ callback }) => {
            if (type == "AUTH_SUCCESS") {
              callback({ success: true })
            } else {
              callback({ success: false })
            }
          })
        }
        return
      }
      if (this.callback[type]) { // if any callback exist for this type
        this.callback[type].forEach(({ callback }) => { // for every callback function inside the type call it

          if (type == "DEPTH_UPDATE") {
            callback({ bids: parsedMessage.data.bids, asks: parsedMessage.data.asks })
          }
          if (type == "TRADE_PUBLISH") {
            callback({ trade: parsedMessage.data })
          }

          // add balance thing later
        })
      }
    }
  }

  sendMessage(message) {
    if (!this.initialized) {
      // if the socket isnt connected yet and the client has send message then store each one in the bufferred message array
      this.bufferedMessage.push(message)
      return
    }
    // if opened already then directly send to the ws

    this.ws.send(JSON.stringify(message))
  }

  registerCallback(type: string, callback: any, id: string) {
    this.callback[type] = this.callback[type] || []; // if the key type already exist then get that array. else create a empty one
    this.callback[type].push({ callback, id }) // id will com handy to deregister the callback when the component unmounts
  }

  deRegisterCallback(type: string, id: string) {
    // for this type say "depth" array. remove the callback from it
    if (this.callback[type]) {
      this.callback[type] = this.callback[type].filter((e) => e.id !== id);
    }
  }
}
