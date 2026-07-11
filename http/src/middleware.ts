import type { NextFunction, Request, Response } from "express";
import jwt, { type JwtPayload } from "jsonwebtoken"

declare global {
  namespace Express {
    interface Request {
      userId: string
    }
  }
}

export async function authMiddleware(req: Request, res: Response, next: NextFunction) { // to check whether the user is sending valid jwt 
  const token = req.headers["authorization"] as string

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload

    req.userId = decoded.userId

    next() // continue the http route function

  } catch (e) {
    console.log(e)
    res.status(401).json({
      message: "unauthorized user"
    })
  }

}
