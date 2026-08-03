import { scrollListClass, TRADES_SCROLL_HEIGHT_PX, type Trade } from "./Orderbook";

export function TradesRow({ price, quantity, side }: Trade) {
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

export function TradesList({ trades }: { trades: Trade[] }) {

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
