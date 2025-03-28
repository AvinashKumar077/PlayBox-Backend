import express from "express"
import cookieParser from "cookie-parser"
import cors from "cors"

const app = express()
app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}))

app.use(express.json({ limit: "16kb" }))// to get json data from request body
app.use(express.urlencoded({ extended: true })) // to get form data from request body
app.use(express.static('public')) // to serve static files
app.use(cookieParser()) // to parse cookies from request headers


//routes import 
import userRouter from "./routes/user.routes.js"

//routes declaration
app.use("/api/v1/users", userRouter)
//http://localhost:3000/api/v1/users/register

export { app }