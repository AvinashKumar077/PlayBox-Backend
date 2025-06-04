import mongoose, { isValidObjectId } from "mongoose"
import { Like } from "../models/like.model.js"
import { Video } from "../models/video.model.js";
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"

const toggleVideoLike = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    const userId = req.user._id;
    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video ID");
    }

    const video = await Video.findById(videoId);
    if (!video) {
        throw new ApiError(404, "Video not found");
    }

    const existingLike = await Like.findOne({
        video: videoId,
        likedBy: userId
    });


    let liked;

    if (existingLike) {
        await existingLike.deleteOne();
        video.likeCount = Math.max(0, video.likeCount - 1);
        liked = false;
    } else {
        await Like.create({ video: videoId, likedBy: userId });
        video.likeCount += 1;
        liked = true;
    }

    await video.save();

    return res.status(200).json(new ApiResponse(200, {
        liked,
        totalLikes: video.likeCount
    }, liked ? "Video liked successfully" : "Video unliked successfully"));
});


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
    }).populate("video")

    return res.status(200).json(new ApiResponse(200, likedVideos, "liked videos fetched successfully"))

})

export {
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike,
    getLikedVideos
}