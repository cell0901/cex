export const CREATE_ORDER = "CREATE_ORDER"
export const GET_OPEN_ORDERS = "GET_OPEN_ORDERS"
export const CANCEL_ORDER = "CANCEL_ORDER"
export const ON_RAMP = "ON_RAMP"
export const GET_DEPTH = "GET_DEPTH"
export const GET_BALANCE = "GET_BALANCE"


export type OrderType = "market" | "limit"



export type MessageFromApi = {
  type: typeof CREATE_ORDER,
  data: {
    symbol: string,// btc/usd 
    type: OrderType,
    side: "buy" | "sell",
    price: string,
    quantity: string,
    userId: string // to store balances in memory 
  }
} | {
  type: typeof CANCEL_ORDER,
  data: {
    symbol: string,// btc/usd 
    orderId: string // to store balances in memory 
  }
} | {
  type: typeof GET_OPEN_ORDERS,
  data: {
    symbol: string,// btc/usd 
    userId: string // to store balances in memory 
  }
} | {
  type: typeof ON_RAMP,
  data: {
    amount: string,// btc/usd 
    userId: string // to store balances in memory 
  }
} | {
  type: typeof GET_DEPTH,
  data: {
    symbol: string,// btc/usd 
  }
}
