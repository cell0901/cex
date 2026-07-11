import type { Fill } from "../trade/Orderbook"

export type wsMessage = {
  type: "TRADE_PUBLISH",
  data: {
    price: number,
    quantity: string,
    tradeId: string
    otherUserId: string
    symbol: string

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
