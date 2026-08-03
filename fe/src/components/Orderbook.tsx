import { useState, useEffect, useMemo, useRef } from "react";
import { BACKEND_URL } from "../utils";
import { SignalingManager } from "../utils/SignalingManager";
import { TradesList } from "./TradesRow";

export interface Trade {
  price: number,
  quantity: string,
  side: "buy" | "sell"
}

const VISIBLE_BOOK_ROWS = 8;
const BOOK_ROW_HEIGHT_PX = 24;
const BOOK_ROW_GAP_PX = 4;
const bookSideHeightPx =
  VISIBLE_BOOK_ROWS * BOOK_ROW_HEIGHT_PX +
  (VISIBLE_BOOK_ROWS - 1) * BOOK_ROW_GAP_PX;
const PRICE_SECTION_HEIGHT_PX = 36;
export const TRADES_SCROLL_HEIGHT_PX = bookSideHeightPx * 2 + PRICE_SECTION_HEIGHT_PX;

export const scrollListClass =
  "scrollbar-hide overflow-y-auto overflow-x-hidden space-y-1";

function Row({ price, size, total, tone, maxTotal }: {
  price: string,
  size: string,
  total: number,
  tone: "buy" | "sell",
  maxTotal: number
}) {
  const isBuy = tone === "buy";
  const pct = (100 * total) / maxTotal;

  return (
    <div className="relative flex min-h-[24px] shrink-0 items-center justify-between rounded-2xl px-1.5 text-[13px] tabular-nums">
      {/* depth bar, sized independently, doesn't affect text layout */}
      <div
        className={[
          "absolute inset-y-0 right-0 rounded-md transition-[width] duration-300 ease-out",
          isBuy ? "bg-[#9dc049]/10" : "bg-[#c06f5a]/10",
        ].join(" ")}
        style={{ width: `${pct}%` }}
      />

      {/* text layer, always full width, sits above the bar */}
      <span className={`relative z-10 w-1/3 text-left ${isBuy ? "text-[#9dc049]" : "text-[#c06f5a]"}`}>
        {price}
      </span>
      <span className="relative z-10 w-1/3 text-center text-zinc-200">{size}</span>
      <span className="relative z-10 w-1/3 text-right text-zinc-200">{total.toFixed(2)}</span>
    </div>
  );
}

function BidsTable({ bids }: { bids: [string, string][] }) {

  const relevantBids = bids.slice(0, 15);
  const bidsWithTotal: [string, string, number][] = [];

  let runningTotal = 0;

  for (const [price, quantity] of relevantBids) {
    runningTotal += Number(quantity);
    bidsWithTotal.push([price, quantity, runningTotal]);
  }

  // total of all the relaventBids to show the buy sell pressure bar
  const maxTotal = runningTotal

  return <div
    className={scrollListClass}
    style={{ height: `${bookSideHeightPx}px` }}
  >
    {bidsWithTotal.map((row, i) => (
      <Row key={`bid-${i}`} tone="buy" price={row[0]} size={row[1]} total={row[2]} maxTotal={maxTotal} />
    ))}
  </div>
}

function AsksTable({ asks }: { asks: [string, string][] }) {

  const asksScrollRef = useRef<HTMLDivElement>(null);
  const followsBestAskRef = useRef(true);

  useEffect(() => {
    const container = asksScrollRef.current;
    if (container && followsBestAskRef.current) {
      container.scrollTop = container.scrollHeight;
    }
  }, [asks]);

  const handleAskScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = event.currentTarget;
    followsBestAskRef.current = scrollHeight - scrollTop - clientHeight < 4;
  };

  const relevantAsks = asks.slice(0, 15);
  relevantAsks.reverse() // since asks are highest price to lowest. since the lowest once is in the middle
  // so we first reverse them

  // get the correct size total  and put them in array
  const asksWithTotal: [string, string, number][] = [];

  let runningTotal = 0;

  for (const [price, qty] of relevantAsks) {
    runningTotal += Number(qty)
    asksWithTotal.push([price, qty, runningTotal])
  }

  // then finally to render lowest price to highest from middle we reverse it
  asksWithTotal.reverse()

  const maxTotal = runningTotal

  return <div
    ref={asksScrollRef}
    onScroll={handleAskScroll}
    className="scrollbar-hide overflow-y-auto overflow-x-hidden" style={{ height: `${bookSideHeightPx}px` }}
  >
    <div className="flex min-h-full flex-col justify-end gap-1">
      {asksWithTotal.map((row, i) => (
        <Row key={`ask-${i}`} tone="sell" price={row[0]} size={row[1]} total={row[2]} maxTotal={maxTotal} />
      ))}
    </div>
  </div>
}


export function Orderbook() {

  const [activeTab, setActiveTab] = useState("book");
  const [trades, setTrades] = useState<Trade[]>([])
  const [bids, setBids] = useState<[string, string][]>([["", ""]])
  const [asks, setAsks] = useState<[string, string][]>([["", ""]])
  const [currentPrice, setCurrentPrice] = useState<{ price: number, side: "buy" | "sell" }>({ price: 0, side: "buy" });

  const { buyPct, sellPct } = useMemo(() => {
    const topBids = bids.slice(0, 15);
    const topAsks = asks.slice(0, 15);

    const bidTotal = topBids.reduce((acc, [, qty]) => acc + Number(qty), 0);
    const askTotal = topAsks.reduce((acc, [, qty]) => acc + Number(qty), 0);

    const total = bidTotal + askTotal;

    if (total === 0) {
      return { buyPct: 50, sellPct: 50 }; // fallback so bar isn't 0-width on load
    }

    const buyPct = Math.floor((bidTotal / total) * 100); // to percentage
    return { buyPct, sellPct: 100 - buyPct };
  }, [bids, asks]);


  useEffect(() => {
    async function fetchDepth() {
      const response = await fetch(`${BACKEND_URL}/depth?symbol=SOL_USDC`);
      const json = await response.json();

      // set the bids total and max
      //
      setBids(json.payload.payload.bids.slice().sort((a, b) => Number(b[0]) - Number(a[0])));
      setAsks(json.payload.payload.asks.slice().sort((a, b) => Number(b[0]) - Number(a[0])));
    }

    fetchDepth();

    SignalingManager.getInstance().registerCallback('DEPTH_UPDATE', (data: any) => {
      setBids((originalBids) => {
        const bidsAfterUpdate = [...(originalBids || [])] // if originalBids is empty then instead of error use empty arr

        for (let i = 0; i < bidsAfterUpdate.length; i++) { // for every bids in the array
          // iterate all the new bids on each bid already in array
          for (let j = 0; j < data.bids.length; j++) {
            if (data.bids[j][0] == bidsAfterUpdate[i][0]) {
              bidsAfterUpdate[i][1] = data.bids[j][1] // update the incoming quantity for that price
              if (Number(bidsAfterUpdate[i][1]) == 0) {
                // this means the price bid has no quantity so remvoe this from the depth or array
                bidsAfterUpdate.splice(i, 1)
              }
              break; // this means for this bid we have got an match from the incoming bids so break;
            }
          }
        }

        // if the price doesnt match in existing bids then add the bid to the array

        for (const bid of data.bids) {
          const qty = bid[1];
          if (Number(qty) !== 0 && !bidsAfterUpdate.some(x => x[0] === bid[0])) { // since on every loop there might be chance that we 
            // add the new bid to array with same same price. so we add a check
            bidsAfterUpdate.push(bid);
          }
        }

        bidsAfterUpdate.sort((a, b) => Number(b[0]) - Number(a[0])); // sorting since we might push any price that doesnt exist in starting of array

        return bidsAfterUpdate
      })

      setAsks((originalAsks) => {
        const asksAfterUpdate = [...(originalAsks || [])]

        for (let i = 0; i < asksAfterUpdate.length; i++) {
          for (let j = 0; j < data.asks.length; j++) {
            if (data.asks[j][0] == asksAfterUpdate[i][0]) {
              asksAfterUpdate[i][1] = data.asks[j][1] // update the incoming quantity for that price
              if (Number(asksAfterUpdate[i][1]) === 0) {
                asksAfterUpdate.splice(i, 1)
              }
              break;
            }
          }
        }


        for (const ask of data.asks) {
          const qty = ask[1];
          if (Number(qty) !== 0 && !asksAfterUpdate.some(x => x[0] === ask[0])) {
            asksAfterUpdate.push(ask);
          }
        }


        asksAfterUpdate.sort((a, b) => Number(b[0]) - Number(a[0]));
        return asksAfterUpdate
      })


    }, "depth@SOL_USDC")

    SignalingManager.getInstance().sendMessage({ type: "SUBSCRIBE", params: ["depth@SOL_USDC"] })


    SignalingManager.getInstance().registerCallback("TRADE_PUBLISH", (data: any) => {
      setTrades((prev) => [{ price: data.trade.price, quantity: data.trade.quantity, side: data.trade.side }, ...prev])
      setCurrentPrice({ price: data.trade.price, side: data.trade.side })
    }, "trade@SOL_USDC");

    SignalingManager.getInstance().sendMessage({
      type: "SUBSCRIBE",
      params: ["trade@SOL_USDC"],
    });


    return () => {
      SignalingManager.getInstance().sendMessage({ type: "UNSUBSCRIBE", params: ["depth@SOL_USDC"] })
      SignalingManager.getInstance().deRegisterCallback("DEPTH_UPDATE", "depth@SOL_USDC")

      SignalingManager.getInstance().sendMessage({ type: "UNSUBSCRIBE", params: ["trade@SOL_USDC"] });
      SignalingManager.getInstance().deRegisterCallback("TRADE_PUBLISH", "trade@SOL_USDC");
    }

  }, [])


  return (
    <div className="w-[255px] rounded-xl bg-[#1E1F23] p-3 text-zinc-100 font-mono">
      <div className="mb-2 flex items-center gap-2">
        <div className="w-15 h-10">

        </div>
        <div className="rounded-lg p-1">
          <button
            type="button"
            onClick={() => setActiveTab("book")}
            className={[
              "rounded-lg px-3 py-1 text-sm font-semibold transition-colors",
              activeTab === "book"
                ? "bg-[#BAA3FF] text-gray-700 text-bold"
                : "bg-transparent text-[#c7c7c7] hover:text-zinc-200",
            ].join(" ")}
          >
            Book
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("trades")}
            className={[
              "rounded-lg px-3 py-1 text-sm font-semibold transition-colors",
              activeTab === "trades"
                ? "bg-[#BAA3FF] text-gray-700 text-bold"
                : "bg-transparent text-[#c7c7c7] hover:text-zinc-200",
            ].join(" ")}
          >
            Trades
          </button>
        </div>
      </div>

      {activeTab === "book" ? <>
        <div className="flex justify-between text-sm mx-1">
          <div>
            Price
          </div>
          <div>
            Size
          </div>
          <div>
            Total
          </div>

        </div>

        {/* Asks (sell side) */}
        <AsksTable asks={asks} />

        {/* Current price / NAV */}
        <div
          className="flex shrink-0 items-center justify-between"
          style={{ height: `${PRICE_SECTION_HEIGHT_PX}px` }}
        >
          <div>
            <div className={`flex items-center gap-1 text-md ml-1 font-semibold ${currentPrice.side == 'buy' ? 'text-[#9dc049]' : 'text-[#c06f5a]'} `}>
              <span className="min-h-[1.4em]">{currentPrice.price}</span>
            </div>
          </div>
        </div>

        {/* Bids (buy side) */}
        <BidsTable bids={bids} />

        {/* Buy/Sell pressure bar */}
        <div className="mt-3">
          <div className="flex h-5 w-full">
            <div
              className="relative inline-flex pl-2 items-center h-full rounded-l-xs text-[#006609] transition-[width] duration-400 ease-in-out"
              style={{
                width: `${buyPct}%`,
                backgroundColor: "#9dc049",
                opacity: 0.7,
                clipPath: "polygon(0 0, 100% 0, calc(100% - 5px) 100%, 0 100%)"
              }}
            >
              {buyPct}%
            </div>
            <div
              className="relative inline-flex flex justify-end pr-2 items-center h-full rounded-r-xs text-[#8e1300] transition-[width] duration-400 ease-in-out"
              style={{
                width: `${sellPct}%`,
                backgroundColor: "#c06f5a",
                opacity: 0.7,
                clipPath: "polygon(5px 0, 100% 0, 100% 100%, 0 100%)"
              }}
            >
              {sellPct}%
            </div>
          </div>

        </div>
      </> : (
        <TradesList trades={trades} />
      )}
    </div>
  );
}
