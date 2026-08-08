import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { authMiddleware } from "../middleware";
import { cancelOrderSchema, orderSchema } from "../types/orders";
import { RedisManager } from "../redis/RedisManager";

export const orderRouter = Router()


// message to engine through queue
// type- market / limit. // currently all are limit
// market
// side
// price
// quatity
// userId
orderRouter.post('/', authMiddleware, asyncHandler(async (req, res) => {
  // create order
  const { data, success } = orderSchema.safeParse(req.body)
  console.log("userid", req.userId)

  if (!success) {
    res.status(401).json({
      message: "invalid arguments"
    })
    return
  }
  // now the engine should tell send the fills to user frontend if it happened we subscribe to a pub sub to which engine will publish the trade
  const response = await RedisManager.getInstance().send({
    type: "CREATE_ORDER",
    data: {
      type: data.type,
      symbol: data.symbol,
      side: data.side,
      price: data.price,
      quantity: data.quantity,
      userId: req.userId,
      orderId: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
      // generating orderId here so CANCEL_ORDER doesnt stops working in recovery state of engine
    }
  })

  res.status(200).json({ payload: response })
})
)

orderRouter.delete('/cancel-order', authMiddleware, asyncHandler(async (req, res) => {
  console.log(req.body)

  const { data, success } = cancelOrderSchema.safeParse(req.body)

  if (!success) {
    res.status(400).json({
      message: "invalid arguments"
    })
    return
  }

  // TODO CHECK if indeed the userId from the middleware matches the order he trying to cancel from the db

  const response = await RedisManager.getInstance().send({
    type: "CANCEL_ORDER",
    data: {
      symbol: data.symbol,
      orderId: data.orderId
    }
  })

  res.status(200).json({ payload: response })
}))

orderRouter.get('/open-orders', authMiddleware, asyncHandler(async (req, res) => {
  const symbol = req.query.symbol

  const response = await RedisManager.getInstance().send({
    type: "GET_OPEN_ORDERS",
    data: {
      symbol: symbol?.toString()!,
      userId: req.userId
    }
  })

  res.status(200).json({ payload: response })
}))

