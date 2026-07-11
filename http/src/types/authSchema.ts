import type { password } from "bun"
import z from "zod"

export const signupSchema = z.object({
  username: z.string().min(5),
  password: z.string().min(5)
})

export const signinSchema = z.object({
  username: z.string().min(5),
  password: z.string().min(5)
})


export const onRampSchema = z.object({
  amount: z.string(),
})
