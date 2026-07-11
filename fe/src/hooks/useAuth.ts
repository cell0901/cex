import { useMutation } from "@tanstack/react-query"
import { BACKEND_URL } from "../utils"

export const useSigninMutation = () => {
  return useMutation({
    mutationFn: async ({ username, password }: { username: string, password: string }) => {
      const response = await fetch(`${BACKEND_URL}/auth/signin`, {
        method: 'POST',
        headers: {
          "Content-type": "application/json"
        },
        body: JSON.stringify({ username, password })
      })

      if (!response.ok) {
        throw new Error("error while signing up")
      }

      const data = await response.json()
      console.log(data)
      return data
    }
  })

}


export const useSignupMutation = () => {
  return useMutation({
    mutationFn: async ({ username, password }: { username: string, password: string }) => {
      const response = await fetch(`${BACKEND_URL}/auth/signup`, {
        method: 'POST',
        headers: {
          "Content-type": "application/json"
        },
        body: JSON.stringify({ username, password })
      })

      if (!response.ok) {
        throw new Error("error while signing up")
      }

      const data = await response.json()
      console.log(data)
      return data
    }
  })
}


export const useDepositMutation = () => {
  const token = localStorage.getItem("token")

  return useMutation({
    mutationFn: async ({ amount }: { amount: string }) => {
      const response = await fetch(`${BACKEND_URL}/auth/onramp`, {
        method: 'POST',
        headers: {
          "Content-type": "application/json",
          'authorization': token ?? ""
        },
        body: JSON.stringify({ amount })
      })

      if (!response.ok) {
        throw new Error("something went wrong")
      }

      const data = await response.json()
      console.log(data)
    }
  })
}
