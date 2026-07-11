export type DbMessage = {
  type: "TRADE_ADDED",
  data: {
    id: string,
    market: string,
    price: string,
    quantity: string,
    quoteQuantity: string, // quote asset quantity (USDC) used
    timestamp: number,
  }
} | {
  type: "ORDER_UPDATE",
  data: {
    orderId: string,
    executedQuantity: string,
    market: string
  }
}
