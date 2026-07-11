import { useEffect, useState } from "react";
import { BACKEND_URL } from "../utils";

interface OpenOrders {
  price: number,
  quantity: number,
  side: "buy" | "sell",
  orderId: string
}

export function OpenOrders() {
  const [orders, setOrders] = useState<OpenOrders[]>([])

  useEffect(() => {
    async function getOpenOrders() {
      const response = await fetch(`${BACKEND_URL}/order/open-orders?symbol=SOL_USDC`, {
        headers: {
          'authorization': localStorage.getItem("token") ?? ""

        }
      });
      const json = await response.json();
      console.log("raw depth response", json);

      setOrders(json.payload.payload.orders.map((o) => ({
        price: o.price,
        quantity: o.quantity,
        side: o.side,
        orderId: o.orderId
      })))
    }

    getOpenOrders();

  }, [])


  return (
    <div className="overflow-hidden rounded-xl bg-[#1E1F23] font-mono ">
      <div className="flex items-center justify-between  px-4 py-3">
        <h2 className="text-base font-mono text-zinc-100">Positions</h2>
        <span className="rounded-md bg-white px-3 py-1 text-xs font-mono text-zinc-800">
          Open Orders
        </span>
      </div>

      <div className="flex px-4 py-2 text-[11px] font-medium uppercase tracking-wider text-zinc-500">
        <span className="w-[42%]">Position</span>
        <span className="w-[24%]">Type</span>
        <span className="w-[34%] text-right">Price</span>
      </div>

      {orders.length === 0 ? (
        <div className="px-4 py-6 text-center text-xs text-zinc-500">
          No open orders
        </div>
      ) : (
        orders.map((order) => (
          <div
            key={`${order.orderId}`}
            className="flex items-center  px-4 py-2 font-mono text-[13px]"
          >
            <div className="w-[42%]">
              <div className="leading-tight text-zinc-100">{"SOL-USD"}</div>
            </div>
            <span
              className={[
                "w-[24%] font-medium",
                order.side === "buy" ? "text-[#9dc049]" : "text-[#c06f5a]",
              ].join(" ")}
            >
              {order.side}
            </span>
            <span className="w-[34%] text-right tabular-nums text-zinc-200">
              {order.price}
            </span>
          </div>
        ))
      )}
    </div>
  );
}
