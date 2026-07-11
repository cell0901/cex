import { Router } from "express";
import { authRouter } from "./auth";
import { orderRouter } from "./order";
import { depthRouter } from "./depth";


export const mainRouter = Router()



// auth/ singup / signin

mainRouter.use("/auth", authRouter)
mainRouter.use("/order", orderRouter)
mainRouter.use("/depth", depthRouter)
