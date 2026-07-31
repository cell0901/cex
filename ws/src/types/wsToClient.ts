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
    symbol: string,
    side: "buy" | "sell"
  }
}

export type BalanceUpdateMessage = {
  type: "BALANCE_UPDATE",
  data: {
    balance: number
  }
}

export type OutgoingMessage = DepthUpdateMessage | TradePublishMessage | BalanceUpdateMessage
