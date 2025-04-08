import mongoose from "mongoose"
import { Video } from "../models/video.model.js"
import { Tweet } from "../models/tweet.model.js"
import { Subscription } from "../models/subscription.model.js"
import { Like } from "../models/like.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"

const getChannelStats = asyncHandler(async (req, res) => {
    const userId = req.user._id

    /*
     Fetch Total Videos Count:
      - Using `countDocuments()` to count all videos where the `owner` field matches `userId`.
      - This tells us how many videos the user has uploaded.
    */

    const totalVideos = await Video.countDocuments({ owner: userId });

    if (totalVideos == null || totalVideos == undefined) {
        throw new ApiError(500, "Something went wrong while displaying total videos")
    }

    /*
   Fetch Total Subscribers Count:
    - Counting all subscription records where the `channel` field matches `userId`.
    - This gives us the total number of subscribers for the channel.
  */

    const totalSubscribers = await Subscription.countDocuments({ channel: userId });
    if (totalSubscribers == null || totalSubscribers == undefined) {
        throw new ApiError(500, "Something went wrong while displaying total subscribers")
    }

    /*
     Fetch total tweets count:
      - Using `countDocuments()` to count all tweets where the `owner` field matches `userId`.
      - This tells us how many tweets the user has uploaded.

    */

    const totalTweets = await Tweet.countDocuments({ owner: userId });
    if (totalTweets == null || totalTweets == undefined) {
        throw new ApiError(500, "Something went wrong while displaying total tweets")
    }

    return res.status(200).json(
        new ApiResponse(200, {
            totalVideos,
            totalSubscribers,
            totalTweets
        }, "Channel stats fetched successfully")
    );

})

const getChannelVideos = asyncHandler(async (req, res) => {
    const userId = req.user._id
    /*
   Fetching All Videos Uploaded by the User (Channel Owner)
    -----------------------------------------------------------
    - We use `Video.find({ owner: userId })` to search for all videos where the `owner` field matches `userId`.
    - `userId` represents the currently logged-in user, meaning we are getting only THEIR videos.
  */

    const videos = await Video.find({
        owner: userId,
    }).sort({
        createdAt: -1, // Sorting videos in descending order (newest first)
    });

    // - This ensures that the client knows when a channel has no videos.
    if (!videos || videos.length === 0) {
        return res.status(200).json(new ApiResponse(200, [], "No videos found for this channel"));
    }

    res.status(200).json(new ApiResponse(200, videos, "Channel videos fetched successfully"));
});

export {
    getChannelStats,
    getChannelVideos
}