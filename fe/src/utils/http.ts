import { BACKEND_URL } from "../utils";

interface Kline {
  time: string
  open: number
  high: number
  low: number
  close: number
}

export async function getKlines(market: string, interval: string, startTime: number, endTime: number): Promise<Kline[]> {

  const response = await fetch(`${BACKEND_URL}/klines?market=${market}&interval=${interval}&startTime=${startTime}&endTime=${endTime}`)

  const data: Kline[] = await response.json()

  console.log("klines data", data)
  return data
}
