import jwt, { type JwtPayload } from "jsonwebtoken"

export function verifyJwt(token: string): string | null {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload
    return decoded.userId
  } catch (e) {
    console.log(e)
    return null
  }
}
