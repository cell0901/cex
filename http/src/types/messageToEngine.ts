export type OrderType = "market" | "limit"
export type Side = "buy" | "sell"

export type MessageToEngine = {
  type: "CREATE_ORDER",
  data: {
    symbol: string,// btc/usd 
    type: OrderType,
    side: Side,
    price: string,
    quantity: string,
    userId: string // to store balances in memory 
    orderId: string
  }
} | {
  type: "CANCEL_ORDER",
  data: {
    symbol: string,// btc/usd 
    orderId: string // not sending userid since. userid will already by authenticated with middleware while sending req
  }
} | {
  type: "GET_OPEN_ORDERS", // thiw will return all open orders for this symbol for this userid
  data: {
    symbol: string,// btc/usd 
    userId: string
  }
} | {
  type: "ON_RAMP", // this will also send to user to onramp the user balances in memory
  data: {
    amount: string,
    userId: string
  }
} | {
  type: "GET_DEPTH", // returns current bids and asks. to load on frontend. the connect to ws to see live changes
  data: {
    symbol: string,
  }
} | {
  type: "ON_RAMP_BASE",
  data: {
    amount: string,
    userId: string
  }
}




