import { useState, useEffect } from "react";
import { BACKEND_URL } from "../utils";
import { SignalingManager } from "../utils/SignalingManager";

interface Trade {
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
const TRADES_SCROLL_HEIGHT_PX = bookSideHeightPx * 2 + PRICE_SECTION_HEIGHT_PX;

const scrollListClass =
  "scrollbar-hide overflow-y-auto overflow-x-hidden space-y-1";

function Row({ price, size, total, tone }: {
  price: string,
  size: string,
  total: number,
  tone: "buy" | "sell",
}) {
  const isBuy = tone === "buy";
  return (
    <div
      className={[
        "flex min-h-[24px] shrink-0 items-center justify-between rounded-2xl px-1.5 text-[13px] tabular-nums",
        isBuy
          ? "bg-[#9dc049]/10 text-[#9dc049]"
          : "bg-[#c06f5a]/10 text-[#c06f5a]",
      ].join(" ")}
    >
      <span className="w-1/3 text-left ">{price}</span>
      <span className="w-1/3 text-center text-zinc-200">{size}</span>
      <span className="w-1/3 text-right  text-zinc-200">{total}</span>
    </div>
  );
}

function TradesRow({ price, quantity, side }: Trade) {
  const isBuy = side === "buy";
  return (
    <div
      className={[
        "flex min-h-[24px] shrink-0 items-center justify-between rounded-2xl px-1.5 text-[13px] tabular-nums",
        isBuy
          ? "bg-[#9dc049]/10 text-[#9dc049]"
          : "bg-[#c06f5a]/10 text-[#c06f5a]",
      ].join(" ")}
    >
      <span className="w-1/2 text-left">{price}</span>
      <span className="w-1/2 text-right text-zinc-200">{quantity}</span>
    </div>
  );
}

function TradesList({ trades }: { trades: Trade[] }) {

  return (
    <>
      <div className="flex justify-between mx-1 text-sm">
        <div>Price</div>
        <div>Qty</div>
      </div>
      <div
        className={scrollListClass}
        style={{ height: `${TRADES_SCROLL_HEIGHT_PX}px` }}
      >
        {trades.map((row, i) => (
          <TradesRow key={`trade-${i}`} {...row} />
        ))}
      </div>
      <div className="mt-3 h-5" aria-hidden />
    </>
  );
}

export function Orderbook() {

  const [activeTab, setActiveTab] = useState("book");
  const [trades, setTrades] = useState<Trade[]>([])
  const [bids, setBids] = useState<[string, string][]>([["", ""]])
  const [asks, setAsks] = useState<[string, string][]>([["", ""]])
  const [currentPrice, setCurrentPrice] = useState<{ price: number, side: "buy" | "sell" }>({ price: 0, side: "buy" });

  // const [buy, setBuy] = useState(50)
  // const [sell, setSell] = useState(50)


  // useEffect(() => {
  // }, [])
  //

  useEffect(() => {
    async function fetchDepth() {
      const response = await fetch(`${BACKEND_URL}/depth?symbol=SOL_USDC`);
      const json = await response.json();
      console.log("raw depth response", json);

      // set the bids total and max
      setBids(json.payload.payload.bids.slice().sort((a, b) => Number(b[0]) - Number(a[0])));
      setAsks(json.payload.payload.asks.slice().sort((a, b) => Number(b[0]) - Number(a[0])));
    }

    fetchDepth();

    SignalingManager.getInstance().registerCallback('DEPTH_UPDATE', (data: any) => {
      console.log("depth", data)
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
      console.log("trade", data);

      setTrades((prev) => [...prev, { price: data.trade.price, quantity: data.trade.quantity, side: data.trade.side }])
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

  // useEffect(() => {
  //   if (activeTab !== "trades") return;
  //
  //   return () => {
  //
  //   };
  //
  // }, [activeTab])
  //

  return (
    <div className="w-full max-w-sm rounded-xl bg-[#1E1F23] p-3 text-zinc-100 font-mono">
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
        <div
          className="scrollbar-hide flex flex-col justify-end overflow-y-auto overflow-x-hidden gap-1"
          style={{ height: `${bookSideHeightPx}px` }}
        >
          {asks.map((row, i) => (
            <Row key={`ask-${i}`} tone="sell" price={row[0]} size={row[1]} total={0} />
          ))}
        </div>

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
        <div
          className={scrollListClass}
          style={{ height: `${bookSideHeightPx}px` }}
        >
          {bids.map((row, i) => (
            <Row key={`bid-${i}`} tone="buy" price={row[0]} size={row[1]} total={0} />
          ))}
        </div>

        {/* Buy/Sell pressure bar */}
        <div className="mt-3">
          <div className="flex h-5 w-full">
            <div
              className="relative inline-flex pl-2 items-center h-full rounded-l-xs text-[#006609] transition-[width] duration-400 ease-in-out"
              style={{
                width: `${60}%`,
                backgroundColor: "#9dc049",
                opacity: 0.7,
                clipPath: "polygon(0 0, 100% 0, calc(100% - 5px) 100%, 0 100%)"
              }}
            >
              {60}%
            </div>
            <div
              className="relative inline-flex flex justify-end pr-2 items-center h-full rounded-r-xs text-[#8e1300] transition-[width] duration-400 ease-in-out"
              style={{
                width: `${40}%`,
                backgroundColor: "#c06f5a",
                opacity: 0.7,
                clipPath: "polygon(5px 0, 100% 0, 100% 100%, 0 100%)"
              }}
            >
              {40}%
            </div>
          </div>

        </div>
      </> : (
        <TradesList trades={trades} />
      )}
    </div>
  );
}
