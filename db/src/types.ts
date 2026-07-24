export type DbMessage = {
  type: "TRADE_ADDED", // for every trade made. this one will be used for klines using timeseries table
  data: {
    id: string,
    market: string,
    price: string,
    quantity: string,
    quoteQuantity: string, // quote asset quantity (USDC) used
    timestamp: number,
  }
} | {
  type: "ORDER_UPDATE", // this is hit the orders table in normal db
  data: {
    orderId: string,
    executedQuantity: string,
    market: string
  }
}
