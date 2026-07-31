export const GET_OPEN_ORDERS = "GET_OPEN_ORDERS"
export const GET_DEPTH = "GET_DEPTH"
export type responseType = "success" | "failed"
export const ORDER_PLACED = "ORDER_PLACED"
export const ORDER_CANCELLED = "ORDER_CANCELLED"
export const GET_BALANCE = "GET_BALANCE"
export const ON_RAMP = "ON_RAMP"
export const ON_RAMP_BASE = "ON_RAMP_BASE"

export interface Order {
  userId: string,
  price: number,
  quantity: number,
  side: "buy" | "sell",
  filled: number,
  orderId: string
}

export interface Fill {
  price: number,
  quantity: number,
  side: "buy" | "sell",
  otherUserId: string,
  tradeId: number
}


export type fromEngine = {
  type: typeof ORDER_PLACED,
  payload: {
    orderId: string,
    executedQuantity: number,
    fills: Fill[]
  }
} | {
  type: typeof ORDER_CANCELLED,
  payload: {
    orderId: string,
    executedQuantity: number,
    remainingQuantity: number
  }
} | {
  type: typeof GET_OPEN_ORDERS,
  payload: {
    orders: Order[]
  }
} | {
  type: typeof GET_DEPTH, // only return the price and quantity
  payload: {
    bids: [string, string][]
    asks: [string, string][],
  }
} | {
  type: typeof GET_BALANCE,
  payload: {
    balance: number
  }
} | {
  type: typeof ON_RAMP,
  payload: {
    message: string
  }
} | {
  type: typeof ON_RAMP_BASE,
  payload: {
    message: string
  }
}
