const BACKEND_URL = "http://localhost:3000/api/v1"
const SYMBOL = "SOL_USDC"
const TOTAL_BIDS = 15
const TOTAL_ASKS = 15

interface SigninResponse {
  token: string
}

interface Order {
  price: number
  quantity: number
  side: "buy" | "sell"
  filled: number
  orderId: string
}

interface BotCredentials {
  username: string
  password: string
}

const bidBot: BotCredentials = {
  username: "simulate_bid_bot",
  password: "simulate_bid_bot_password"
}

const askBot: BotCredentials = {
  username: "simulate_ask_bot",
  password: "simulate_ask_bot_password"
}

// this simulation uses two bot accounts one for bids and one for asks. to put ordres in orderbook and. also calls a 
// function to execute trades

async function signInOrSignUp(credentials: BotCredentials) {
  const signInResponse = await fetch(`${BACKEND_URL}/auth/signin`, {
    method: "POST",
    headers: { "Content-type": "application/json" },
    body: JSON.stringify(credentials)
  })

  if (signInResponse.ok) {
    return (await signInResponse.json() as SigninResponse).token
  }

  await fetch(`${BACKEND_URL}/auth/signup`, {
    method: "POST",
    headers: { "Content-type": "application/json" },
    body: JSON.stringify(credentials)
  })

  const retryResponse = await fetch(`${BACKEND_URL}/auth/signin`, {
    method: "POST",
    headers: { "Content-type": "application/json" },
    body: JSON.stringify(credentials)
  })

  if (!retryResponse.ok) {
    throw new Error(`Could not sign in ${credentials.username}`)
  }

  return (await retryResponse.json() as SigninResponse).token
}

async function fundBot(token: string) {
  const headers = {
    "Content-type": "application/json",
    authorization: token
  }

  await fetch(`${BACKEND_URL}/auth/onramp`, {
    method: "POST",
    headers,
    body: JSON.stringify({ amount: "10000000" })
  })

  await fetch(`${BACKEND_URL}/auth/onramp-base`, {
    method: "POST",
    headers,
    body: JSON.stringify({ amount: "10000000" })
  })
}

async function getOpenOrders(token: string): Promise<Order[]> {
  const response = await fetch(`${BACKEND_URL}/order/open-orders?symbol=${SYMBOL}`, {
    headers: {
      authorization: token
    }
  })
  const json: any = await response.json()
  return json.payload.payload.orders as Order[]
}

async function placeOrder(token: string, side: "buy" | "sell", price: number) {
  await fetch(`${BACKEND_URL}/order`, {
    method: "POST",
    headers: {
      "Content-type": "application/json",
      authorization: token
    },
    body: JSON.stringify({
      type: "market",
      symbol: SYMBOL,
      side,
      price: price.toFixed(2), // toFixed() makes number to string
      quantity: "1"
    })
  })
}

async function cancelOrder(token: string, orderId: string) {
  await fetch(`${BACKEND_URL}/order/cancel-order`, {
    method: "DELETE",
    headers: {
      "Content-type": "application/json",
      authorization: token
    },
    body: JSON.stringify({ symbol: SYMBOL, orderId })
  })
}

async function maintainSide(token: string, side: "buy" | "sell", midPrice: number, target: number) {
  const orders = await getOpenOrders(token)
  const sideOrders = orders.filter(order => order.side === side) // gets all the bids of bidBots or asks for askBot

  const ordersToCancel = sideOrders.filter(order =>
    side === "buy"
      ? order.price >= midPrice || Math.random() < 0.1 // cancel all bids which have price more than or equalt to new generated price. or 10 % chance
      : order.price <= midPrice || Math.random() < 0.1 // cancel all asks which have price less than to new generated price.
  )

  await Promise.all(ordersToCancel.map(order => cancelOrder(token, order.orderId)))

  const ordersStillOpen = sideOrders.length - ordersToCancel.length
  const ordersToAdd = Math.max(0, target - ordersStillOpen) // just to make sure this doenst go negative

  for (let index = 0; index < ordersToAdd; index++) {

    // level 1: 0.20–0.30 away
    // level 2: 0.40–0.50 away
    // level 3: 0.60–0.70 away
    const distanceFromMid = (index + 1) * 0.2 + Math.random() * 0.1 // each iteration increase the distance from the mid price.

    const price = side === "buy"
      ? midPrice - distanceFromMid
      : midPrice + distanceFromMid

    await placeOrder(token, side, price)
  }
}

async function maybeCreateTrade(bidToken: string, askToken: string, midPrice: number) { // to create trades
  if (Math.random() >= 0.10) return // 5% chance per cycle of trade happening

  // 25 % chance that this runs
  if (Math.random() < 0.5) {
    // The bid bot buys from the ask bot resting asks.
    await placeOrder(bidToken, "buy", midPrice + 5) // +5 to create a trade
  } else { // 12 % chance this runs
    // The ask bot sells into the bid bot resting bids.
    await placeOrder(askToken, "sell", midPrice - 5)
  }
}

async function main(bidToken: string, askToken: string) {
  const midPrice = 90 + Math.random() * 5 // 90 - 94.999

  await maybeCreateTrade(bidToken, askToken, midPrice)
  await maintainSide(bidToken, "buy", midPrice, TOTAL_BIDS)
  await maintainSide(askToken, "sell", midPrice, TOTAL_ASKS)

  await new Promise(resolve => setTimeout(resolve, 3000))
  await main(bidToken, askToken)
}

async function start() {
  const [bidToken, askToken] = await Promise.all([
    signInOrSignUp(bidBot),
    signInOrSignUp(askBot)
  ])

  await Promise.all([fundBot(bidToken), fundBot(askToken)])
  console.log("simulation started")
  await main(bidToken, askToken)
}

start().catch(console.error)
