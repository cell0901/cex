import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { BACKEND_URL } from "../utils";


export function OrderEntry({
  availableBalance = "0",
  total = "0.00",
  orderSuccessToast
}: { availableBalance: string, total: string, orderSuccessToast: (side: "buy" | "sell") => void }) {
  const [orderType] = useState("Limit");
  const [price, setPrice] = useState('')
  const [quantity, setQuantity] = useState('')

  const token = localStorage.getItem('token')

  const mutationBuy = useMutation({
    mutationFn: async ({ type, symbol, side, price, quantity }: { type: string, symbol: string, side: string, price: string, quantity: string }) => {
      const body = {
        type,
        symbol,
        side,
        price,
        quantity
      }
      const response = await fetch(`${BACKEND_URL}/order`, {
        method: "POST",
        headers: {
          "Content-type": "application/json",
          'authorization': token ?? ""
        },
        body: JSON.stringify(body)
      })
      const data = await response.json()
      console.log(data)
      return data
    }
  })

  const mutationSell = useMutation({
    mutationFn: async ({ type, symbol, side, price, quantity }: { type: string, symbol: string, side: string, price: string, quantity: string }) => {
      const body = {
        type,
        symbol,
        side,
        price,
        quantity
      }
      const response = await fetch(`${BACKEND_URL}/order`, {
        method: "POST",
        headers: {
          "Content-type": "application/json",
          'authorization': token ?? ""
        },
        body: JSON.stringify(body)
      })
      const data = await response.json()
      console.log(data)
      return data
    }
  })

  return (
    <div className="rounded-xl bg-[#1E1F23] p-5 text-zinc-100 font-mono">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <span className="text-base ">Order</span>
        <button
          type="button"
          className="flex items-center gap-1 rounded-lg bg-[#27282F] px-3 py-1.5 text-sm font-semibold text-zinc-200 hover:bg-[#30313a]"
        >
          {orderType}
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
            <path
              d="M6 9l6 6 6-6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      {/* Available balance */}
      <div className="mb-2 flex items-center justify-between text-[13px] text-zinc-400">
        <span>Avbl - {"USDC"}</span>
        <span className="text-zinc-200">{availableBalance}</span>
      </div>

      {/* Price input */}
      <div className="mt-5">
        <span className="text-sm text-zinc-400">
          Price
        </span>
        <div className="mb-3 flex items-center justify-between rounded-lg bg-[#27282F] px-3 py-3">
          <input
            type="number"
            onChange={(e) => setPrice(e.target.value)}
            placeholder="0"
            className="w-full bg-transparent text-sm text-zinc-100 placeholder-zinc-500 outline-none
    [&::-webkit-outer-spin-button]:appearance-none
    [&::-webkit-inner-spin-button]:appearance-none
          "
          />
          <div className="flex items-center gap-2">
          </div>
        </div>

        <span className="text-sm text-zinc-400">
          Amount
        </span>
        {/* Amount input */}
        <div className="mb-3 mt-1.5 rounded-lg bg-[#27282F] px-3 py-3">
          <input
            type="number"
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="0"
            className="w-full bg-transparent text-sm text-zinc-100 placeholder-zinc-500 outline-none   
    [&::-webkit-outer-spin-button]:appearance-none
    [&::-webkit-inner-spin-button]:appearance-none"
          />
        </div>

      </div>
      {/* Buy / Sell buttons */}
      <div className="mb-4 grid grid-cols-2 gap-3 mt-10">
        <button
          type="button"
          onClick={() => {
            mutationBuy.mutate({
              type: "limit",
              symbol: "SOL_USDC",
              side: "buy",
              price,
              quantity
            }, {
              onSuccess: (data) => {
                if (data.payload.type == "ORDER_PLACED") {
                  orderSuccessToast("buy")
                }
              }
            })
          }}
          className="rounded-lg bg-[#9dc049] py-3 text-sm font-bold text-[#1a2606] hover:opacity-90"
        >
          Buy
        </button>
        <button
          type="button"
          onClick={() => {
            mutationSell.mutate({
              type: "limit",
              symbol: "SOL_USDC",
              side: "sell",
              price,
              quantity
            }, {
              onSuccess: (data) => {
                if (data.payload.type == "ORDER_PLACED") {
                  orderSuccessToast("sell")
                }
              }
            })
          }}
          className="rounded-lg bg-[#e8a98c] py-3 text-sm font-bold text-[#4a1d0e] hover:opacity-90"
        >
          Sell
        </button>
      </div>

      {/* Fee / Total summary */}
      <div className="space-y-1 rounded-lg bg-[#27282F] px-3 py-3 text-[13px] text-zinc-400">
        <div className="flex justify-between">
          <span>Total</span>
          <span className="text-zinc-200">
            {total} {"USDC"}
          </span>
        </div>
      </div>
    </div>
  );
}
