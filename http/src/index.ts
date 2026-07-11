import express from "express"
import { mainRouter } from "./routes/mainRouter"
import cors from "cors"

const app = express()
app.use(cors())
app.use(express.json())

app.use('/api/v1', mainRouter)

// app.get('/test', async (req, res) => {
//
//   const a = RedisManager.getInstance()
//
//   let somehting = await a.checl("something")
//   console.log(somehting)
//
//   res.json({ msg: "hi" })
// })


app.listen(3000)
