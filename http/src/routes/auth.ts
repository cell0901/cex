import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { onRampSchema, signinSchema, signupSchema } from "../types/authSchema";
import jwt from "jsonwebtoken"
import { prisma } from "../../db";
import { authMiddleware } from "../middleware";
import { RedisManager } from "../redis/RedisManager";
import console from "node:console";

export const authRouter = Router()

authRouter.post('/signup', asyncHandler(async (req, res) => {

  const { data, success } = signupSchema.safeParse(req.body)

  if (!success) {
    res.status(401).json({
      message: "wrong inputs"
    })
    return
  }

  // else create the user
  const hashedPassword = await Bun.password.hash(data.password);

  const user = await prisma.user.create({
    data: {
      username: data.username,
      password: hashedPassword,
    }
  })
  // asyncHandler  should handle show error if creating unique field

  res.status(200).json({
    id: user.id
  })
}

))


authRouter.post('/signin', asyncHandler(async (req, res) => {

  const { data, success } = signinSchema.safeParse(req.body)


  if (!success) {
    res.status(401).json({
      message: "wrong inputs"
    })
    return
  }

  // Find by username first; passwords cannot be queried after hashing.
  const user = await prisma.user.findFirst({
    where: {
      username: data?.username,
    }
  })

  if (!user || !(await Bun.password.verify(data.password, user.password))) {
    res.status(401).json({
      message: "invalid username or password"
    })
    return
  }

  const payload = { userId: user.id }
  const token = jwt.sign(payload, process.env.JWT_SECRET!)

  res.status(200).json({
    token: token
  })
}
))

authRouter.post('/onramp', authMiddleware, asyncHandler(async (req, res) => {

  const { data, success } = onRampSchema.safeParse(req.body)


  if (!success) {
    res.status(401).json({
      message: "wrong inputs"
    })
    return
  }
  console.log("inside onramp route")

  const response = await RedisManager.getInstance().send({
    type: "ON_RAMP",
    data: {
      amount: data.amount,
      userId: req.userId
    }
  })

  res.status(200).json({
    message: response
  })
  // also increase the balance in the db

}))

authRouter.post('/onramp-base', authMiddleware, asyncHandler(async (req, res) => {

  const { data, success } = onRampSchema.safeParse(req.body)

  if (!success) {
    res.status(401).json({
      message: "wrong inputs"
    })
    return
  }

  const response = await RedisManager.getInstance().send({
    type: "ON_RAMP_BASE",
    data: {
      amount: data.amount,
      userId: req.userId
    }
  })

  res.status(200).json({
    message: response
  })
  // also increase the balance in the db

}))
