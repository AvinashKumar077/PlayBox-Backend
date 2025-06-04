import mongoose, { Schema } from "mongoose"

const likeSchema = new Schema({
    video: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Video",
    },
    comment: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Comment",
    },
    tweet: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Tweet",
    },
    likedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        require: true,
    }
}, { timestamps: true }
)

export const Like = mongoose.model("Like", likeSchema)