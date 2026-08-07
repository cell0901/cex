import { RedisManager } from "../RedisManager";
import type { MessageFromApi, OrderType } from "../types/messageFromApi"
import { Orderbook, type Fill, type Order } from "./Orderbook";
import { check } from "../..";
import fs from "fs"


interface UserBalance {
  [key: string]: { // here key is quoteAsset
    available: number,
    locked: number
  }
}
export class Engine {
  private orderbooks: Orderbook[] // array of orderbook(class) with methods to make it easy
  private balances: Map<string, UserBalance> = new Map() // key will be useId

  constructor() {
    // add snapshot logic later
    // first check whether there is snapshot then reach the orderbook state

    let snapshot;
    try {
      snapshot = fs.readFileSync("./snapshot.json")
    } catch (e) {
      console.log("no snapshot found")
    }

    if (snapshot) { // means this is recovery state. replay all the 2 mins orders from the redis stream to reach the state just before crashing
      // {orderbooks: [], balances: }
      const parsed = JSON.parse(snapshot.toString()); // this will have snapshot of all or single orderbook
      this.orderbooks = parsed.orderbooks.map(o => new Orderbook(o.bids, o.asks, o.baseAsset, o.currentPrice, o.lastTradeId));
      this.balances = new Map(parsed.balances)
    } else { // means this is the first time  running the app
      this.orderbooks = []
      this.orderbooks.push(check())
    }

    setInterval(() => {
      this.saveSnapshot()
    }, 1000 * 60 * 2) // every 2 min
  }

  saveSnapshot() {
    const snapshot = {
      orderbooks: this.orderbooks.map(o => o.getSnapshot()), // getSnaphost function to only get bids asks and other needed things while creating new orderbook 
      balances: Array.from(this.balances) // since balances are in map
    }
    fs.writeFileSync('./snapshot.json', JSON.stringify(snapshot))
  }

  process(message: MessageFromApi, clientId: string) { // public by default
    switch (message.type) {

      case "CREATE_ORDER":
        try {
          this.preventSelfTrade(message.data.symbol, message.data.side, message.data.price, message.data.userId)

          const { fills, executedQuantity, orderId } = this.createOrder(message.data.symbol, message.data.type, message.data.side, message.data.price, message.data.quantity, message.data.userId)

          RedisManager.getInstance().sendToApi(clientId, {
            type: "ORDER_PLACED",
            payload: {
              orderId: orderId,
              executedQuantity,
              fills
            }
          })
          // send reponse to redis to api on succesfull order creation
        } catch (e) { // send api message with 0 fills and 0 executed quantity
          console.log(e) // clientId is something our api request subscribed to and whenever something with this clientId comes. it gets api
          RedisManager.getInstance().sendToApi(clientId, {
            type: "ORDER_CANCELLED",
            payload: {
              orderId: "",
              executedQuantity: 0,
              remainingQuantity: 0
            }
          })
        }
        break;
      case "CANCEL_ORDER":
        // remove the order sitting in the orderbook 
        try {
          let cancelOrderbook = this.orderbooks.find(o => o.getTicker() === message.data.symbol)
          if (!cancelOrderbook) {
            throw new Error("orderbook doesnt exist")
          }

          let executed = this.cancelOrder(message.data.orderId, cancelOrderbook, message.data.symbol)

          RedisManager.getInstance().sendToApi(clientId, {
            type: "ORDER_CANCELLED",
            payload: {
              orderId: message.data.orderId,
              executedQuantity: executed,
              remainingQuantity: 0
            }
          })
        } catch (e) {
          console.log(e)
        }
        break;

      case "GET_OPEN_ORDERS":
        // get open orders for this symbol/market
        try {
          let orderbook = this.orderbooks.find(o => o.getTicker() === message.data.symbol)

          if (!orderbook) {
            throw new Error("no orderbook found")
          }

          let orders = orderbook.getOpenOrders(message.data.userId)

          RedisManager.getInstance().sendToApi(clientId, {
            type: "GET_OPEN_ORDERS",
            payload: {
              orders
            }
          })
        } catch (e) {
          console.log(e)
        }
        break;
      case "GET_DEPTH":
        // get depth meaning all sitting asks and bids in this orderbook
        try {
          const orderbook = this.orderbooks.find(o => o.getTicker() === message.data.symbol)

          if (!orderbook) {
            throw new Error("no orderbook found for depth")
          }

          let { bids, asks } = orderbook.getDepth()

          RedisManager.getInstance().sendToApi(clientId, {
            type: 'GET_DEPTH',
            payload: {
              bids,
              asks
            }
          })
        } catch (e) {
          console.log(e)
          RedisManager.getInstance().sendToApi(clientId, {
            type: "GET_DEPTH",
            payload: {
              bids: [],
              asks: []
            }
          })
        }
        break;
      case "ON_RAMP":
        this.onRamp(message.data.userId, Number(message.data.amount))

        RedisManager.getInstance().sendToApi(clientId, {
          type: "ON_RAMP",
          payload: {
            message: "onramp succesfull"
          }
        })
        break;
      case "ON_RAMP_BASE":
        this.onRampBase(message.data.userId, Number(message.data.amount))

        RedisManager.getInstance().sendToApi(clientId, {
          type: "ON_RAMP_BASE",
          payload: {
            message: "onramp succesfull for base"
          }
        })

        break;
    }
  }

  createOrder(symbol: string, type: OrderType, side: "buy" | "sell", price: string, quantity: string, userId: string) {
    // check balances

    const orderbook = this.orderbooks.find(o => o.getTicker() === symbol) // this will return the instance of orderbook class with this ticker

    if (!orderbook) {
      throw new Error("no orderbook found")
    }


    // this.balances.set("sometuserID", {
    //   ["SOL"]: {
    //     available: 0,
    //     locked: 0
    //   },
    //   ["USDC"]: {
    //     available: 2000,
    //     locked: 360
    //   }
    // })
    //
    // let ask: Order = {
    //   userId: "sometuserID",
    //   price: 120,
    //   quantity: 3,
    //   side: "buy",
    //   filled: 0,
    //   orderId: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
    // }

    // this.orderbooks.find(o => o.getTicker() === symbol)?.bids.push(ask)


    const temp = this.balances.get(userId)

    if (side == "buy" && temp![orderbook.quoteAsset]!.available < Number(price) * Number(quantity)) { // we will let the user hit this if they Signed up which means the userId exists
      throw new Error("insufficent funds")
    }

    // lock the balances first

    this.checkAndLockBalance(userId, price, quantity, orderbook, side)

    // create the order

    const order: Order = {
      userId,
      price: Number(price),
      quantity: Number(quantity),
      side,
      filled: 0,
      orderId: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
    }

    const { fills, executedQuantity } = orderbook.addOrder(order, type)

    // after this there is update balance function 
    this.updateUserFunds(userId, orderbook, side, fills, price)

    console.log(this.balances.get(userId))
    console.log(this.balances)
    console.log("orderbook after creatOrder", this.orderbooks.find(o => o.getTicker() == symbol))

    // then some worker for update db balances. db trades. publistradestoWs. publicdepthtows

    this.createDbTrades(fills, symbol)
    // this.updateDbOrder(order, executedQuantity, symbol)

    this.publishWsDepth(fills, price, symbol, orderbook, side)
    this.publishWsTrades(fills, symbol, userId)
    this.publishWsBalance(userId)
    return { fills, executedQuantity, orderId: order.orderId }
  }

  checkAndLockBalance(userId: string, price: string, quantity: string, orderbook: Orderbook, side: "buy" | "sell") {

    // in the userBalance. deduct amount from the available and put it in the lock

    if (side == "buy") { // lokc the quote asset like usdc, inr
      if (this.balances.get(userId)![orderbook.quoteAsset]!.available < Number(price) * Number(quantity)) {
        throw new Error("insufficent quote asset")
      }

      // instead to updating hte UserBalance directly we weill need to change update the all asset balances. so we access and update the single field
      // this updates the object stored in our map directly
      this.balances.get(userId)![orderbook.quoteAsset]!.available -= Number(price) * Number(quantity)
      this.balances.get(userId)![orderbook.quoteAsset]!.locked += Number(price) * Number(quantity)

    } else { // if he wants to sell. we will lock hte base asset. BTC/SOL/SOME
      if (this.balances.get(userId)![orderbook.baseAsset]!.available < Number(quantity)) {
        throw new Error("insufficent base asset")
      }
      this.balances.get(userId)![orderbook.baseAsset]!.available = this.balances.get(userId)![orderbook.baseAsset]!.available - Number(quantity)
      this.balances.get(userId)![orderbook.baseAsset]!.locked += Number(quantity) // this quantity is locked to sell on the orderbook
    }
  }

  updateUserFunds(userId: string, orderbook: Orderbook, side: "buy" | "sell", fills: Fill[], price: string) {
    if (side == "buy") { // if side is buy remove the lock quote asset
      // from alls fills increase  the baseAsset amount balances of user
      let totalFilllAmount = 0;
      let actualySpent = 0;
      for (const fill of fills) {
        totalFilllAmount += fill.quantity
        this.balances.get(fill.otherUserId)![orderbook.baseAsset]!.locked -= fill.quantity
        this.balances.get(fill.otherUserId)![orderbook.quoteAsset]!.available += (fill.quantity * fill.price)


        actualySpent += fill.quantity * fill.price
      }
      const reserved = totalFilllAmount * Number(price) // total locked amount used

      const balance = this.balances.get(userId)!;

      if (!balance[orderbook.baseAsset]) {
        balance[orderbook.baseAsset] = {
          available: 0,
          locked: 0
        }
      }
      console.log("quoteAsset locked", this.balances.get(userId))

      this.balances.get(userId)![orderbook.baseAsset]!.available += totalFilllAmount
      this.balances.get(userId)![orderbook.quoteAsset]!.locked -= reserved
      this.balances.get(userId)![orderbook.quoteAsset]!.available += reserved - actualySpent

      // update the other user balances as well (their baseAsset decrement and quoteAsset increment)
    } else { // if side if sell remove the lock base asset
      // from alls fills increase  the quoteAsset amount balances of user
      let totalFilllAmount = 0;
      let actualySpent = 0; // baseAsset actualySpent
      const balance = this.balances.get(userId)!;

      if (!balance[orderbook.quoteAsset]) {
        balance[orderbook.quoteAsset] = {
          available: 0,
          locked: 0
        }
      }
      for (const fill of fills) {
        totalFilllAmount += fill.quantity
        // for every fill increase the baseAsset of otherUserId and decrease their quote
        this.balances.get(fill.otherUserId)![orderbook.quoteAsset]!.locked -= (fill.quantity * fill.price)
        this.balances.get(fill.otherUserId)![orderbook.baseAsset]!.available += fill.quantity

        actualySpent += fill.quantity
      }

      this.balances.get(userId)![orderbook.quoteAsset]!.available += (totalFilllAmount * Number(price)) // every baseAsset he matched * price
      this.balances.get(userId)![orderbook.baseAsset]!.locked -= totalFilllAmount
    }
  }

  onRamp(userId: string, amount: number) { // currently we have set the onRamp asset to be usdc only
    this.creditAsset(userId, "USDC", amount)
  }

  createDbTrades(fills: Fill[], symbol: string) { // this will push all the trades to timescale db. (currently not pushing to userId main db)

    // we need to upadate the db trades. for each fill the buyer/seller gets
    fills.forEach((fill) => {
      RedisManager.getInstance().pushMessage({
        type: "TRADE_ADDED",
        data: {
          id: fill.tradeId.toString(),
          market: symbol,
          price: fill.price.toString(),
          quantity: fill.quantity.toString(), // quantity he got filled for this single fill 
          quoteQuantity: (fill.quantity * fill.price).toString(), // the total quantity of quoteAsset for this fill
          timestamp: Date.now()
        }
      })
    })

  }

  updateDbOrder(order: Order, executedQuantity: number, symbol: string) {
    RedisManager.getInstance().pushMessage({
      type: "ORDER_UPDATE",
      data: {
        orderId: order.orderId,
        executedQuantity: executedQuantity.toString(),
        market: symbol
      }
    })
  }

  cancelOrder(orderId: string, cancelOrderbook: Orderbook, symbol: string) {

    // consdering orderbook exists here
    // order in the orderbook using the orderid

    const cancelOrder = (cancelOrderbook.asks.find(o => o.orderId == orderId) || cancelOrderbook.bids.find(o => o.orderId == orderId))

    if (!cancelOrder) {
      throw new Error("no order exist")
    }

    if (cancelOrder.side == "buy") {
      // remove it from the asks
      let price = cancelOrderbook.cancelBid(cancelOrder)
      let leftQtyPrice = (cancelOrder.quantity - cancelOrder.filled) * cancelOrder.price

      // increase the available balance and reduce the locked balance
      this.balances.get(cancelOrder.userId)![cancelOrderbook.quoteAsset]!.available += leftQtyPrice
      this.balances.get(cancelOrder.userId)![cancelOrderbook.quoteAsset]!.locked -= leftQtyPrice

      if (price) {
        this.sendWsDepthUpdateOnCancel(price.toString(), symbol)
      }
      this.publishWsBalance(cancelOrder.userId)

      return cancelOrder.filled // returning executedQuantity back to the apoi
    } else {
      let price = cancelOrderbook.cancelAsk(cancelOrder)
      let leftQty = (cancelOrder.quantity - cancelOrder.filled)

      this.balances.get(cancelOrder.userId)![cancelOrderbook.baseAsset]!.available += leftQty
      this.balances.get(cancelOrder.userId)![cancelOrderbook.baseAsset]!.locked -= leftQty

      if (price) {
        this.sendWsDepthUpdateOnCancel(price.toString(), symbol)
      }
      this.publishWsBalance(cancelOrder.userId)
      return cancelOrder.filled
    }

  }

  publishWsTrades(fills: Fill[], symbol: string, userId: string) { // publish the fills with the symbol
    // but figure out why useId needed
    // for each fill publis the trade to the redis channel
    fills.forEach((fill) => {
      RedisManager.getInstance().publishMessage(`trade@${symbol}`, { // first arg is channel id. second one is the data
        type: "TRADE_PUBLISH",
        data: {
          price: fill.price,
          quantity: fill.quantity.toString(),
          tradeId: fill.tradeId.toString(),
          otherUserId: fill.otherUserId,
          symbol: symbol, // market
          side: fill.side
        }
      })
    })
  }

  // should be all bids and asks. we call this on every new order after createOrder
  publishWsDepth(fills: Fill[], price: string, symbol: string, orderbook: Orderbook, side: "buy" | "sell") { // when user does createOrder update the depth to ws.
    // for this userId and the price
    const depth = orderbook.getDepth() // old depth

    if (side == "buy") {

      // get the updatedAsks. where if the ask price matches in any of one fill price array

      const fillPrices = fills.map(fill => fill.price.toString())

      const updatedAsks: [string, string][] = fillPrices.map(fillprice => { // updatedAsks that have filled means 0 quantity
        // we send to frontend to remove it in UI
        const existing = depth.asks.find(x => x[0] == fillprice)
        return existing || [fillprice, "0"]
      })

      // find the element where the price matches with the order. and we return the updated quantity for that price
      const updatedBid = depth.bids.find(x => x[0] === price);

      RedisManager.getInstance().publishMessage(`depth@${symbol}`, {
        type: "DEPTH_UPDATE",
        data: {
          asks: updatedAsks,
          bids: updatedBid ? [updatedBid] : []
        }
      })
    } else {

      const fillPrices = fills.map(fill => fill.price.toString())

      const updatedBids: [string, string][] = fillPrices.map(fillprice => {
        const existing = depth.bids.find(x => x[0] == fillprice)
        return existing || [fillprice, "0"]
      })

      const updatedAsk = depth.asks.find(x => x[0] === price)

      RedisManager.getInstance().publishMessage(`depth@${symbol}`, {
        type: "DEPTH_UPDATE",
        data: {
          asks: updatedAsk ? [updatedAsk] : [],
          bids: updatedBids
        }
      })
    }
  }

  sendWsDepthUpdateOnCancel(price: string, symbol: string) {

    const orderbook = this.orderbooks.find(o => o.getTicker() === symbol)

    if (!orderbook) {
      throw new Error("no orderbook exists")
    }

    const depth = orderbook.getDepth()

    const updatedAsks = depth.asks.filter(x => x[0] === price) // get the asks. for this price that are being cancelled
    const updatedBids = depth.bids.filter(x => x[0] === price)

    RedisManager.getInstance().publishMessage(`depth@${symbol}`, {
      type: "DEPTH_UPDATE",
      data: {
        // understand the logic here why [[price, ""]] with empty qty
        asks: updatedAsks.length > 0 ? updatedAsks : [[price, "0"]], // if no asks with the price then empty qty for that price 
        //(remove that price level in FE)

        bids: updatedBids.length > 0 ? updatedBids : [[price, "0"]]
      }
    })
  }

  publishWsBalance(userId: string) {
    const balance = this.balances.get(userId)

    if (!balance || !balance['USDC']) {
      return RedisManager.getInstance().publishMessage(`balance@${userId}`, {
        type: "BALANCE_UPDATE",
        data: {
          balance: 0
        }
      })
    }

    RedisManager.getInstance().publishMessage(`balance@${userId}`, {
      type: "BALANCE_UPDATE",
      data: {
        balance: balance["USDC"].available
      }
    })
  }

  onRampBase(userId: string, amount: number) {
    this.creditAsset(userId, "SOL", amount)
  }

  private creditAsset(userId: string, asset: string, amount: number) {
    let balance = this.balances.get(userId) // get the balance 

    if (!balance) { // if new user nothing exist then create empty balance obj for him
      balance = {}
      this.balances.set(userId, balance)
    }

    if (!balance[asset]) { // if balance exist then check whether this key already exist . if not then initialize with 0 balance
      balance[asset] = {// e.g "USDC" or "SOL"
        available: 0,
        locked: 0
      }
    }

    // increase the balance.
    balance[asset].available += amount
  }

  preventSelfTrade(symbol: string, side: "buy" | "sell", price: string, userId: string) {
    const orderbook = this.orderbooks.find(o => o.getTicker() === symbol) // this will return the instance of orderbook class with this ticker
    if (!orderbook) {
      throw new Error("no orderbook found")
    }

    if (side == "buy") {
      // then check oppose asks sitting for this same userId
      const found = orderbook.searchAsksForUser(userId, price)

      if (found) {
        throw new Error("User is trying to self Trade. Buy cancelled")
      }
    } else {

      const found = orderbook.searchBidsForUser(userId, price)
      if (found) {
        throw new Error("User is trying to self Trade. Sell cancelled")
      }
    }
  }
}

