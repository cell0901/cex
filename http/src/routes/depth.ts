import { Router } from "express";
import { authMiddleware } from "../middleware";
import { RedisManager } from "../redis/RedisManager";
import { asyncHandler } from "../../utils/asyncHandler";

export const depthRouter = Router()

depthRouter.get('/', asyncHandler(async (req, res) => {
  const symbol = req.query.symbol

  console.log("depth for symbol", symbol)

  const response = await RedisManager.getInstance().send({
    type: "GET_DEPTH",
    data: {
      symbol: symbol!.toString(),
    }
  })

  res.status(200).json({
    payload: response
  })

}))



