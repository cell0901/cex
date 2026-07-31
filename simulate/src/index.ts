
const BACKEND_URL = "http://localhost:3000/api/v1"
const TOTAL_BIDS = 15
const TOTAL_ASKS = 15

interface SigninResponse {
  token: string
}

export interface Order {
  userId: string,
  price: number,
  quantity: number,
  side: "buy" | "sell",
  filled: number,
  orderId: string
}


async function generateUser() {
  let token;
  const body = {
    username: "simulateorderbook",
    password: "12345"
  }

  try {
    const response = await fetch(`${BACKEND_URL}/auth/signin`, {
      method: "POST",
      headers: {
        "Content-type": "application/json",
      },
      body: JSON.stringify(body)
    })

    if (response.status == 401) {
      throw new Error("account already exists")
    }

    const data = await response.json() as SigninResponse
    token = data.token

  } catch (e) {
    const response = await fetch(`${BACKEND_URL}/auth/signup`, {
      method: "POST",
      headers: {
        "Content-type": "application/json",
      },
      body: JSON.stringify(body)
    })

    const signinResponse = await fetch(`${BACKEND_URL}/auth/signin`, {
      method: "POST",
      headers: {
        "Content-type": "application/json",
      },
      body: JSON.stringify(body)
    })

    const data = await signinResponse.json() as SigninResponse
    token = data.token

    console.log("inside signup", data)
  }
  console.log("token in generateuser", token)
  return token
}

async function onRampUser(token: string) {

  const response = await fetch(`${BACKEND_URL}/auth/onramp`, {
    method: 'POST',
    headers: {
      "Content-type": "application/json",
      'authorization': token ?? ""
    },
    body: JSON.stringify({ amount: "10000000" })
  })
  const json = await response.json()

  const response2 = await fetch(`${BACKEND_URL}/auth/onramp-base`, {
    method: 'POST',
    headers: {
      "Content-type": "application/json",
      'authorization': token ?? ""
    },
    body: JSON.stringify({ amount: "10000000" })
  })

  const json2 = await response2.json()


  console.log("onramp for base", json2)
}

async function main(token: string) {

  const price = (Math.random() * 5) + 90
  // const price = 1000 + Math.random() * 10;


  console.log("token in main ", token)
  const response = await fetch(`${BACKEND_URL}/order/open-orders?symbol=SOL_USDC`, {
    headers: {
      'authorization': token ?? ""
    }
  })

  const json: any = await response.json();

  console.log("open orders reposnse", json);
  // we need to add or cancel based on number os current open bids and asks
  const openOrders = json.payload.payload; // current total ordres

  const totalBids = openOrders.orders.filter((o) => o.side == "buy").length;
  const totalAsks = openOrders.orders.filter((o) => o.side == "sell").length

  const canceledBids = await cancelBidsMoreThan(openOrders.orders, price, token)
  const canceledAsks = await cancelAsksLessThan(openOrders.orders, price, token)

  let bidsToAdd = TOTAL_BIDS - totalBids - canceledBids
  let asksToAdd = TOTAL_ASKS - totalAsks - canceledAsks

  while (bidsToAdd > 0 || asksToAdd > 0) {

    if (bidsToAdd > 0) {
      await fetch(`${BACKEND_URL}/order`, {
        method: "POST",
        headers: {
          "Content-type": "application/json",
          "authorization": token
        },
        body: JSON.stringify({
          type: "market",
          symbol: "SOL_USDC",
          side: "buy",
          price: (price - Math.random()).toFixed(1).toString(), // bid price bit less than the price generated this time
          quantity: "1"
        })
      })

      bidsToAdd--;
    }

    if (asksToAdd > 0) {
      await fetch(`${BACKEND_URL}/order`, {
        method: "POST",
        headers: {
          "Content-type": "application/json",
          "authorization": token
        },
        body: JSON.stringify({
          type: "market",
          symbol: "SOL_USDC",
          side: "sell",
          price: (price + Math.random()).toFixed(1).toString(), // bid price bit less than the price generated this time
          quantity: "1"
        })
      })

      asksToAdd--;
    }
  }

  await new Promise((resolve) => { // hold this async block for 1sec
    setTimeout(resolve, 2000)
  })

  main(token)
}

async function cancelBidsMoreThan(openOrders: Order[], price: number, token: string) {
  let promises: any[] = [];

  openOrders.map((o) => {
    if (o.side == "buy" && (o.price > price || Math.random() < 0.1)) {
      promises.push(
        fetch(`${BACKEND_URL}/order/cancel-order`, {
          method: "DELETE",
          headers: {
            "Content-type": "application/json",
            'authorization': token ?? ""
          },
          body: JSON.stringify({
            symbol: "SOL_USDC",
            orderId: o.orderId
          })
        })
      )
    }
  })

  await Promise.all(promises)

  return promises.length // to get the actual number of bids to add the orderbook out of 15
}

async function cancelAsksLessThan(openOrders: Order[], price: number, token: string) { //  cancel the asks who price is less than new price generated
  const promises: any[] = [];

  openOrders.map((o) => {
    if (o.side == "sell" && (o.price < price || Math.random() < 0.5)) {
      promises.push(
        fetch(`${BACKEND_URL}/order/cancel-order`, {
          method: "DELETE",
          headers: {
            "Content-type": "application/json",
            'authorization': token ?? ""
          },
          body: JSON.stringify({
            symbol: "SOL_USDC",
            orderId: o.orderId
          })
        })
      )
    }
  })

  await Promise.all(promises)
  return promises.length
}

async function start() {
  const token = await generateUser();
  await onRampUser(token);
  await main(token);
}

start()




