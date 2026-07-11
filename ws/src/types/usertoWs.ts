const SUBSCRIBE = "SUBSCRIBE"
const UNSUBSCRIBE = "UNSUBSCRIBE"
const AUTH = "AUTH"

export type SUBSCRIBE = {
  type: typeof SUBSCRIBE,
  params: string[] // ["depth@SOL_USDC", "trade@SOL_USDC"]
}

export type UNSUBSCRIBE = {
  type: typeof UNSUBSCRIBE,
  params: string[]
}

export type AUTH = {
  type: typeof AUTH,
  token: string
}
export type incomingMessage = SUBSCRIBE | UNSUBSCRIBE | AUTH
