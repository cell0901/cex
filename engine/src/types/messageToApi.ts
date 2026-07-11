import type { Fill, Order } from "../trade/Orderbook"
import type { GET_BALANCE, GET_DEPTH, GET_OPEN_ORDERS } from "./messageFromApi"

export type responseType = "success" | "failed"


export const ORDER_PLACED = "ORDER_PLACED"
export const ORDER_CANCELLED = "ORDER_CANCELLED"
export const ON_RAMP = "ON_RAMP"

export type MessageToApi = {
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
    bids: [string, string][],
    asks: [string, string][]
  }
} | {
  type: typeof ON_RAMP,
  payload: {
    message: string
  }
}
