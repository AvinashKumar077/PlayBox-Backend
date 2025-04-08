import mongoose, { isValidObjectId } from "mongoose"
import { Like } from "../models/like.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"

const toggleVideoLike = asyncHandler(async (req, res) => {
    const { videoId } = req.params

    const userId = req.user._id

    //check if the user is authenticated and has a valid ID
    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video ID")
    }

    // check if user already liked the video
    const existingLike = await Like.findOne({
        video: videoId,
        likedBy: userId,
    });

    // if the user already liked the video, remove the like

    if (existingLike) {
        await Like.findByIdAndDelete(existingLike._id)
        return res.status(200).json(new ApiResponse(200, existingLike, "video unliked successfully"))
    }

    // if the user has not liked the video, create a new like
    const newLike = await Like.create({
        video: videoId,
        likedBy: userId,
    })

    return res.status(201).json(new ApiResponse(201, newLike, "video liked successfully"))


    /*
Toggling Likes - Notes: 

👉 Why use `findOne()` before creating a new like?
- We need to check if the user has already liked the video.
- Prevents duplicate likes, ensuring one user can only like a video once.

👉 Why use `findByIdAndDelete()` instead of `deleteOne()`?
- `findByIdAndDelete()` directly removes a document by `_id` in one step.
- `deleteOne({ ... })` works too, but we already have the exact `_id`, so it's faster.

*/
})

const toggleCommentLike = asyncHandler(async (req, res) => {
    const { commentId } = req.params

    // get the user ID from the request object
    const userId = req.user._id
    // check if the comment ID is valid
    if (!isValidObjectId(commentId)) {
        throw new ApiError(400, "Invalid comment ID")
    }
    // check if user already liked the comment
    const existingLike = await Like.findOne({
        comment: commentId,
        likedBy: userId,
    });

    // if the user already liked the comment, remove the like
    if (existingLike) {
        await Like.findByIdAndDelete(existingLike._id)
        return res.status(200).json(new ApiResponse(200, existingLike, "comment unliked successfully"))
    }

    // if the user has not liked the comment, create a new like
    const likeComment = await Like.create({
        comment: commentId,
        likedBy: userId,
    });

    return res.status(201).json(new ApiResponse(201, likeComment, "comment liked successfully"))

})

const toggleTweetLike = asyncHandler(async (req, res) => {
    const { tweetId } = req.params

    const userId = req.user._id

    if (!isValidObjectId(tweetId)) {
        throw new ApiError(400, "Invalid tweet ID")
    }

    const existingLike = await Like.findOne({
        tweet: tweetId,
        likedBy: userId,
    })

    if (existingLike) {
        await Like.findByIdAndDelete(existingLike._id)
        return res.status(200).json(new ApiResponse(200, existingLike, "tweet unliked successfully"))
    }

    const likeTweet = await Like.create({
        tweet: tweetId,
        likedBy: userId,
    })

    return res.status(201).json(new ApiResponse(201, likeTweet, "tweet liked successfully"))
}
)

const getLikedVideos = asyncHandler(async (req, res) => {
    //extract the user ID from the request object
    const userId = req.user._id

    /*
    
    -we are querying the like model to find all the likes where:
    -the likedBy field matches the userId

    */

    const likedVideos = await Like.find({
        likedBy: userId,
        video: { $exists: true } // filter for video likes only
    }).populate("video", "_id title url")

    return res.status(200).json(new ApiResponse(200, likedVideos, "liked videos fetched successfully"))

})

export {
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike,
    getLikedVideos
}