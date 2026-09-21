import express from "express"
import { mainRouter } from "./routes/mainRouter"
import cors from "cors"

const app = express()
app.use(cors())
app.use(express.json())

app.use('/api/v1', mainRouter)


app.listen(Number(process.env.PORT ?? 3000))
