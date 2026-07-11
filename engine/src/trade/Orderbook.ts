import type { OrderType } from "../types/messageFromApi";

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

export class Orderbook {
  bids: Order[];
  asks: Order[];
  baseAsset: string;
  quoteAsset: string = "USDC"; // curently setting all quoteAsset to usdc
  currentPrice: string
  lastTradeId: number; // to show the trades section in frontend

  constructor(bids: Order[], asks: Order[], baseAsset: string, currentPrice: string, lastTradeId: number) {
    this.bids = bids
    this.asks = asks
    this.baseAsset = baseAsset
    this.currentPrice = currentPrice // this will be last trade price
    this.lastTradeId = lastTradeId || 0
  }

  getTicker() {
    return `${this.baseAsset}_${this.quoteAsset}`
  }

  // inside addOrder based on the side add 
  // match Bid fundtion and match Ask fundtion
  // later add cancelBid and cancelAsk for cancelOrder 

  addOrder(order: Order, type: OrderType): { fills: Fill[], executedQuantity: number } {
    if (order.side == "buy") {
      const { fills, executedQuantity } = this.matchBid(order)
      order.filled = executedQuantity
      if (executedQuantity === order.quantity) { // if all quantity executedQuantity then return fills
        return {
          fills,
          executedQuantity
        }
      }

      // else push the order to bids 
      this.bids.push({
        userId: order.userId,
        price: order.price,
        quantity: order.quantity,
        side: order.side,
        filled: executedQuantity,
        orderId: order.orderId
      })


      return {
        fills,
        executedQuantity
      }

    } else {
      const { fills, executedQuantity } = this.matchAsk(order)

      if (executedQuantity == order.quantity) {
        return {
          fills,
          executedQuantity
        }
      }

      // else push the order to asks
      this.asks.push({
        userId: order.userId,
        price: order.price,
        quantity: order.quantity,
        side: order.side,
        filled: executedQuantity,
        orderId: order.orderId
      })

      return {
        fills,
        executedQuantity
      }
    }
  }

  //   interface Order {
  //   userId: string,
  //   price: string,
  //   quantity: string,
  //   side: "buy" | "sell",
  // }
  matchBid(order: Order) { // returns fills and return quantity
    let fills: Fill[] = []
    let executedQuantity = 0;

    // For bids, highest price first:
    this.asks.sort((a, b) => a.price - b.price);

    for (const [i, ask] of this.asks.entries()) { // this should sort price lowesst to highest
      if (ask.price <= order.price && executedQuantity < order.quantity) {
        // clear this ask and reduce the quantity
        // for every ask. get the quantity add it in fills and check on other loop
        fills.push({
          price: ask.price,
          quantity: Math.min((order.quantity - executedQuantity), ask.quantity), // since if ask.quantity is 10 and rreminaing is 3 then 3 should 
          //be in the fills
          side: order.side,
          otherUserId: ask.userId,
          tradeId: this.lastTradeId++
        })
        // increase the filled quantity of this ask order that was sitting on the orderbook 
        this.asks[i]!.filled += Math.min((order.quantity - executedQuantity), ask.quantity)
        executedQuantity += Math.min((order.quantity - executedQuantity), ask.quantity)
      }
    }

    // now remove every ask that has same filled and quantity

    for (let i = 0; i < this.asks.length; i++) { // 1 8 
      if (this.asks[i]?.quantity === this.asks[i]?.filled) {
        this.asks.splice(i, 1) // this is gonna remove the ask at this exact index
        // only reduce the index if we need to remove the element from the array
        i-- // since shift to left. and we dont skip the new element that shiftee to left we added this 
      }
    }

    return {
      fills,
      executedQuantity
    }
  }

  matchAsk(order: Order) {
    let fills: Fill[] = []
    let executedQuantity = 0;

    this.bids.sort((a, b) => b.price - a.price); // best price of bids. which is highest to lowest 

    for (const [i, bid] of this.bids.entries()) { // 140 140 > 
      if (bid.price >= order.price && executedQuantity < order.quantity) {

        fills.push({
          price: bid.price,
          quantity: Math.min((order.quantity - executedQuantity), bid.quantity),
          side: order.side,
          otherUserId: bid.userId,
          tradeId: this.lastTradeId++
        })
        this.bids[i]!.filled += Math.min((order.quantity - executedQuantity), bid.quantity)
        executedQuantity += Math.min((order.quantity - executedQuantity), bid.quantity)
      }
    }

    for (let i = 0; i < this.bids.length; i++) {
      if (this.bids[i]?.quantity === this.bids[i]?.filled) {
        this.bids.splice(i, 1)
        i--;
      }
    }

    return {
      fills,
      executedQuantity
    }
  }

  cancelBid(cancelOrder: Order) {
    let index = this.bids.findIndex(o => o.orderId == cancelOrder.orderId)

    // getting the price also this will come in handy for updating depth Ws before deleting
    let price = this.bids[index]?.price
    this.bids.splice(index, 1)

    return price
  }

  cancelAsk(cancelOrder: Order) {
    let index = this.asks.findIndex(o => o.orderId == cancelOrder.orderId)

    let price = this.asks[index]?.price
    this.asks.splice(index, 1)

    return price
  }

  getOpenOrders(userId: string): Order[] {
    const asks = this.asks.filter(o => o.userId === userId)
    const bids = this.bids.filter(o => o.userId === userId)


    return [...asks, ...bids] // destructing them to one Order[] array
  }

  getDepth() {
    let getBids = this.bids
    let getasks = this.asks


    let temp: Map<string, string> = new Map()
    let temp2: Map<string, string> = new Map()

    getBids.forEach(bid => { // for each bid

      if (temp.get(bid.price.toString())) { // if the price already exist
        let prev = temp.get(bid.price.toString()) // then get the prev quantity
        temp.set(bid.price.toString(), (Number(prev) + (bid.quantity - bid.filled)).toString()) // add this bid reminaing quantity to it
      } else {
        // if doesnt exist create a new entry with this bid price and this bid reminaing quantity
        temp.set(bid.price.toString(), (bid.quantity - bid.filled).toString())
      }

    })

    getasks.forEach(ask => { // for each ask
      if (temp2.get(ask.price.toString())) { // if the ask price already exist
        let prev = temp2.get(ask.price.toString())
        temp2.set(ask.price.toString(), (Number(prev) + (ask.quantity - ask.filled)).toString()) // then get prev ask quantity and add current ask 
        //quantity as well
      } else {
        // if doesnt exist create a new entry with this ask price
        temp2.set(ask.price.toString(), (ask.quantity - ask.filled).toString())
      }
    })

    const bids: [string, string][] = Array.from(temp).map( // array from converts any iteratable like object to array
      // performs an function to convert each element to string and returning the new array
      x => [x[0], x[1]]// price, quantity
    )

    const asks: [string, string][] = Array.from(temp2).map(
      x => [x[0], x[1]]// price, quantity
    )

    console.log("bids in getDepth", bids)
    console.log("asks in getDepth", asks)
    return {
      bids,
      asks
    }
  }
}
