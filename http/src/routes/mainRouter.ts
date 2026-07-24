import { Router } from "express";
import { authRouter } from "./auth";
import { orderRouter } from "./order";
import { depthRouter } from "./depth";
import { klineRouter } from "./klineRouter";


export const mainRouter = Router()


mainRouter.use("/auth", authRouter)
mainRouter.use("/order", orderRouter)
mainRouter.use("/depth", depthRouter)
mainRouter.use("/klines", klineRouter)
