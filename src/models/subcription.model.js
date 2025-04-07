import mongoose, { Schema } from "mongoose"

const subscriptionSchema = new Schema({
    subscriber: {
        type: mongoose.Schema.Types.ObjectId, // one who is subscribing
        ref: "User"
    },
    channel: {
        type: mongoose.Schema.Types.ObjectId, // channel being subscribed to
        ref: "User"
    }

}, {
    timestamps: true
})

const Subscription = mongoose.model("Subscription", subscriptionSchema)