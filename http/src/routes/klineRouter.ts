import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { Client } from "pg";


const pgClient = new Client({
  user: 'postgres',
  host: "localhost",
  database: "postgres", //  container name
  password: "postgrespass",
  port: 5433
})

pgClient.connect()


export const klineRouter = Router()


klineRouter.get('/', asyncHandler(async (req, res) => {
  const { market, interval, startTime, endTime } = req.query;


  let query;
  switch (interval) {
    case "1m":
      console.log("case 1m", interval)
      query = `SELECT * FROM klines_1m WHERE market = $1 AND bucket >= $2 AND bucket <= $3 ORDER BY bucket ASC;`;
      break
    case "1h":
      query = `SELECT * FROM klines_1h WHERE market = $1 AND bucket >= $2 AND bucket <= $3 ORDER BY bucket ASC;`;
      break
    case "1w":
      query = `SELECT * FROM klines_1w WHERE market = $1 AND bucket >= $2 AND bucket <= $3 ORDER BY bucket ASC;`;
      break
    default:
      res.status(400).send("invalid interval")
      return
  }


  try {
    const end = endTime ? new Date(Number(endTime) * 1000) : new Date()
    console.log("before sending query")

    // from frontend we get seconds Date() needs miliseconds to convert it to timestamptz
    const result = await pgClient.query(query!, [market, new Date(Number(startTime) * 1000), end])

    console.log("klines result timedb", result)

    res.status(200).json(result.rows.map((row) => ({
      time: row.bucket,
      open: row.open,
      high: row.high,
      low: row.low,
      close: row.close,
      volume: row.volume,
    })))

  } catch (e) {
    console.log("error while getting klines")
    res.status(400).send("error while getting klines")
  }

}))
