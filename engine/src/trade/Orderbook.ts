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
    this.lastTradeId = lastTradeId || 0 // for snapshot purpose
  }
  getSnapshot() {
    return {
      bids: this.bids,
      asks: this.asks,
      baseAsset: this.baseAsset,
      currentPrice: this.currentPrice,
      lastTradeId: this.lastTradeId
    }
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
      if (executedQuantity < order.quantity) { // if still reminaing quantity then push to bids
        insertBid(this.bids, { ...order, filled: executedQuantity })
      }
      return {
        fills,
        executedQuantity
      }

    } else {
      const { fills, executedQuantity } = this.matchAsk(order)

      if (executedQuantity < order.quantity) {
        insertAsk(this.asks, { ...order, filled: executedQuantity })

      }
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
  matchBid(order: Order) {
    let fills: Fill[] = [];
    let executedQuantity = 0;
    let removeIndices: any[] = [];


    for (let i = 0; i < this.asks.length; i++) {
      const ask = this.asks[i];
      if (!ask) {
        throw new Error("ask doenst exist");
      };
      if (executedQuantity >= order.quantity) break; // fully filled — stop scanning
      if (ask.price > order.price) break; // sorted ascending: everything after this is also too expensive. so break early instead of scanning everything

      const fillQty = Math.min(order.quantity - executedQuantity, ask.quantity - ask.filled);
      fills.push({
        price: ask.price,
        quantity: fillQty,
        side: order.side,
        otherUserId: ask.userId,
        tradeId: this.lastTradeId++,
      });
      ask.filled += fillQty;
      executedQuantity += fillQty;

      if (ask.filled >= ask.quantity) removeIndices.push(i); // this ask should be removed from array
    }

    // Remove fully-filled asks. Splice from highest index down to lowest so
    // removing one doesn't shift the position of indices we haven't handled yet.
    for (let j = removeIndices.length - 1; j >= 0; j--) {
      this.asks.splice(removeIndices[j], 1);
    }

    return { fills, executedQuantity };
  }

  matchAsk(order: Order) {
    let fills: Fill[] = [];
    let executedQuantity = 0;
    let removeIndices: any[] = [];

    for (let i = 0; i < this.bids.length; i++) {
      const bid = this.bids[i];
      if (!bid) {
        throw new Error("no bid found");
      }

      if (executedQuantity >= order.quantity) break;
      if (bid.price < order.price) break; // sorted descending: everything after this is too cheap

      const fillQty = Math.min(order.quantity - executedQuantity, bid.quantity - bid.filled);
      fills.push({
        price: bid.price,
        quantity: fillQty,
        side: order.side,
        otherUserId: bid.userId,
        tradeId: this.lastTradeId++,
      });
      bid.filled += fillQty;
      executedQuantity += fillQty;

      if (bid.filled >= bid.quantity) removeIndices.push(i);

    }

    for (let j = removeIndices.length - 1; j >= 0; j--) {
      this.bids.splice(removeIndices[j], 1);
    }

    return { fills, executedQuantity };
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

    // console.log("asks in getDepth", asks)
    return {
      bids,
      asks
    }
  }

  searchAsksForUser(incomingBidUserId: string, buyPrice: string) {
    const found = this.asks.some(ask => ask.userId == incomingBidUserId && ask.price <= Number(buyPrice))
    return found
  }

  searchBidsForUser(incomingAskUserId: string, sellPrice: string) {
    const found = this.bids.some(bid => bid.userId == incomingAskUserId && bid.price >= Number(sellPrice))
    return found
  }
}

// Binary search for the correct insertion index to keep the array sorted.
// compareFn should return negative if a belongs before b.
function findInsertIndex(arr: Order[], price: number, compareFn: any) {
  let lo = 0, hi = arr.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (compareFn(arr[mid]!.price, price) < 0) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

// bids: sorted descending (highest price first)
function insertBid(bids: Order[], order: Order) {
  const idx = findInsertIndex(bids, order.price, (a: number, b: number) => b - a);
  bids.splice(idx, 0, order);
}

// asks: sorted ascending (lowest price first)
function insertAsk(asks: Order[], order: Order) {
  const idx = findInsertIndex(asks, order.price, (a: number, b: number) => a - b);
  asks.splice(idx, 0, order);
}
