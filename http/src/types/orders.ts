import z from "zod"

// type- market / limit.
// market
// side
// price
// quatity
// userId

export const orderSchema = z.object({
  type: z.enum(["market", "limit"]),
  symbol: z.string().trim(), // BTC/USDC, SOL/USDC
  side: z.enum(["buy", "sell"]),
  // in market the price wil be decided based on last trade
  price: z.string(), // in string since we want to deal with precision error or we could use 100
  quantity: z.string()
})

export const cancelOrderSchema = z.object({
  symbol: z.string(),
  orderId: z.string(),
})
