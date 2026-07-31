export interface Fill {
  price: number,
  quantity: number,
  side: "buy" | "sell",
  otherUserId: string,
  tradeId: number
}

export type fromEngine = {
  type: "TRADE_PUBLISH",
  data: {
    price: number,
    quantity: string,
    tradeId: string,
    otherUserId: string
    symbol: string,
    side: "buy" | "sell"
  }
} | {
  type: "DEPTH_UPDATE",
  data: {
    asks: [string, string][],
    bids: [string, string][]
  }
} | {
  type: "BALANCE_UPDATE",
  data: {
    balance: number
  }
}
