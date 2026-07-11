const AUTH_SUCCESS = "AUTH_SUCCESS"
const INVALID_TOKEN = "INVALID_TOKEN"
const UNAUTHENTICATED = "UNAUTHENTICATED"

export type AUTH_SUCCESS = {
  type: typeof AUTH_SUCCESS
}

export type INVALID_TOKEN = {
  type: typeof INVALID_TOKEN
}

export type UNAUTHENTICATED = {
  type: typeof UNAUTHENTICATED
}

export type DepthUpdateMessage = {
  type: "DEPTH_UPDATE",
  data: {
    bids: [string, string][],
    asks: [string, string][]
  }
}

export type TradePublishMessage = {
  type: "TRADE_PUBLISH",
  data: {
    price: number,
    quantity: string,
    tradeId: string,
    otherUserId: string,
    symbol: string
  }
}

export type BalanceUpdateMessage = {
  type: "BALANCE_UPDATE",
  data: {
    balance: number
  }
}

export type incomingMessage = AUTH_SUCCESS | INVALID_TOKEN | UNAUTHENTICATED | DepthUpdateMessage | TradePublishMessage | BalanceUpdateMessage
