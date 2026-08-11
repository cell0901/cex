import z from "zod"

// type- market / limit.
// market
// side
// price
// quatity
// userId
const priceSchema = z.string() // rejects negative and 0 , 0.00 
  .regex(
    /^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/,
    "Price must have up to 2 decimal places"
  )
  .refine((value) => Number(value) > 0, {
    message: "Price must be greater than 0"
  });

const quantitySchema = z.string()// rejects negative and 0 , 0.00
  .regex(
    /^(?:0|[1-9]\d*)(?:\.\d{1,6})?$/,
    "Quantity must have up to 6 decimal places"
  )
  .refine((value) => Number(value) > 0, {
    message: "Quantity must be greater than 0"
  });

export const orderSchema = z.object({
  type: z.enum(["market", "limit"]),
  symbol: z.string().trim(), // BTC/USDC, SOL/USDC
  side: z.enum(["buy", "sell"]),
  // in market the price wil be decided based on last trade
  price: priceSchema, // in string since we want to deal with precision error or we could use 100
  quantity: quantitySchema
})

export const cancelOrderSchema = z.object({
  symbol: z.string(),
  orderId: z.string(),
})
