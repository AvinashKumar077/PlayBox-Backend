import mongoose, { isValidObjectId } from "mongoose"
import { Tweet } from "../models/tweet.model.js"
import { User } from "../models/user.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"

const createTweet = asyncHandler(async (req, res) => {
    const { content } = req.body
    const ownerId = req.user._id

    if (!content) {
        throw new ApiError(400, "Content is required")
    }

    const newTweet = await Tweet.create({ content, owner: ownerId })

    if (!newTweet) {
        throw new ApiError(500, "Failed to create tweet")
    }

    return res.status(201).json(new ApiResponse(201, newTweet, "Tweet created successfully"))

    /*
How does this work in an app? - Notes:

👉 When a user submits a tweet via a frontend app (like a form or a button press):
  - The frontend sends a `POST` request to the backend with `content`.
  - This controller checks if content exists, then creates a new tweet.
  - The tweet is saved in MongoDB, associated with the logged-in user.
  - A success response is sent back with the newly created tweet.
*/

})

const getUserTweets = asyncHandler(async (req, res) => {
    const { userId } = req.params

    if (!isValidObjectId(userId)) {
        throw new ApiError(400, "Invalid user ID")
    }
    const tweets = await Tweet.find({ owner: userId }).sort({ createdAt: -1 });

    if (!tweets || tweets.length === 0) {
        return res.status(200).json(new ApiResponse(200, [], "No tweets found for this user"));
    }

    return res
        .status(200)
        .json(new ApiResponse(200, tweets, "User tweets fetched successfully"));
})

const updateTweet = asyncHandler(async (req, res) => {
    const { tweetId } = req.params
    const { content } = req.body
    const userId = req.user._id

    if (!isValidObjectId(tweetId)) {
        throw new ApiError(400, "Invalid tweet ID")
    }
    if (!content) {
        throw new ApiError(400, "Content is required")
    }

    const tweet = await Tweet.findById(tweetId)
    if (!tweet) {
        throw new ApiError(404, "Tweet not found")
    }

    if (tweet.owner.toString() !== userId.toString()) {
        throw new ApiError(403, "You are not authorized to update this tweet")
    }

    const updateTweet = await Tweet.findByIdAndUpdate(
        tweetId,
        {
            $set: { content }
        },
        {
            new: true
        }
    );

    if (!updateTweet) {
        throw new ApiError(500, "Failed to update tweet")
    }
    return res.status(200).json(new ApiResponse(200, updateTweet, "Tweet updated successfully"))
})

const deleteTweet = asyncHandler(async (req, res) => {
    const { tweetId } = req.params
    const userId = req.user._id
    if (!isValidObjectId(tweetId)) {
        throw new ApiError(400, "Invalid tweet ID")
    }
    const tweet = await Tweet.findById(tweetId)
    if (!tweet) {
        throw new ApiError(404, "Tweet not found")
    }

    if (tweet.owner.toString() !== userId.toString()) {
        throw new ApiError(403, "You are not authorized to delete this tweet")
    }

    const deletedTweet = await Tweet.findByIdAndDelete(tweetId);

    if (!deletedTweet) {
        throw new ApiError(500, "Something went wrong while deleting a tweet");
    }


    return res.status(200).json(new ApiResponse(200, deletedTweet, "Tweet deleted successfully"));
})

export {
    createTweet,
    getUserTweets,
    updateTweet,
    deleteTweet
}