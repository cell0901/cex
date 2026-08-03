import { useEffect, useState } from "react";
import { BACKEND_URL, DEFAULT_SYMBOL } from "../utils";
import { CircleX } from "lucide-react";

interface OpenOrders {
  price: number,
  quantity: number,
  side: "buy" | "sell",
  orderId: string
}

function CancelOrderToast() {
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50">
      <div className="flex items-center gap-2 text-red-400 text-[13.5px] font-mono px-4 py-2 ">
        {<CircleX className="size-4" />}Order cancelled
      </div>
    </div>
  );
}

export function OpenOrders() {
  const [orders, setOrders] = useState<OpenOrders[]>([])
  const [cancelToast, setCancelToast] = useState(false);

  useEffect(() => {
    async function getOpenOrders() {
      const response = await fetch(`${BACKEND_URL}/order/open-orders?symbol=SOL_USDC`, {
        headers: {
          'authorization': localStorage.getItem("token") ?? ""

        }
      });
      const json = await response.json();
      console.log("open-orders", json);

      setOrders(json.payload.payload.orders.map((o) => ({
        price: o.price,
        quantity: o.quantity,
        side: o.side,
        orderId: o.orderId
      })))
    }

    getOpenOrders();

    const interval = setInterval(getOpenOrders, 5000)

    return () => {
      clearInterval(interval)
    }
  }, [])

  const onCancelOrder = async (symbol: string, orderId: string) => {

    const body = {
      symbol: symbol,
      orderId: orderId
    }

    console.log("body to sent", body)
    try {
      const response = await fetch(`${BACKEND_URL}/order/cancel-order`, {
        method: "DELETE",
        headers: {
          "Content-type": "application/json",
          'authorization': localStorage.getItem("token") ?? ""
        },
        body: JSON.stringify(body)
      });

      const json = await response.json();

      console.log("cacnel order response", json.payload.type);

      if (json.payload.type == "ORDER_CANCELLED") {
        setCancelToast(true)

        setTimeout(() => {
          setCancelToast(false)
        }, 5000)
      }
    } catch (e) {
      console.log("error while canclling order", e)
    }
  }

  return (
    <div>
      {cancelToast && <CancelOrderToast />}
      < div className="overflow-hidden rounded-xl bg-[#1E1F23] font-mono " >
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
          <span className="w-[34%] text-right"></span>
        </div>

        {
          orders.length === 0 ? (
            <div className="px-4 py-6 text-center text-xs text-zinc-500">
              No open orders
            </div>
          ) : (
            orders.map((order, index) => (
              <div
                key={`${order.orderId}`}
                className="flex items-center  px-4 py-2 font-mono text-[13px]"
              >
                <div className="w-[42%]">
                  <div className="leading-tight text-zinc-100">
                    <span className="text-zinc-500 mr-2">{index + 1}.</span>
                    {DEFAULT_SYMBOL}
                  </div>
                </div>            <span
                  className={[
                    "w-[24%] text-[13px] font-mono",
                    order.side === "buy" ? "text-[#9dc049]" : "text-[#c06f5a]",
                  ].join(" ")}
                >
                  {order.side == "buy" ? "Buy" : "Sell"}
                </span>
                <span className="w-[34%] text-right tabular-nums text-zinc-200">
                  {order.price}
                </span>
                <button className="w-[34%] text-right tabular-nums text-red-300 cursor-pointer" onClick={() => {
                  onCancelOrder(DEFAULT_SYMBOL, order.orderId)
                }}>
                  Cancel
                </button>
              </div>
            ))
          )
        }
      </div >
    </div>
  );
}
