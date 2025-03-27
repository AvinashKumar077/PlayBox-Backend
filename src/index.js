import 'dotenv/config'
import connectDB from "./db/index.js";

connectDB()








//aaproach 1 (basic approach) :-
/*
import express from "express"
const app = express()
    (async () => {
        try {
            await mongoose.connect(`${process.env.MONGO_URI}/${DB_NAME}`)
            app.on("error", (error) => console.error(error))
            app.listen(process.env.PORT, () => console.log(`Server is running on port ${process.env.PORT}`))
        } catch (error) {
            console.error(error)
            throw error
        }
    })()
    */