import mongoose, { isValidObjectId } from "mongoose";
import { Comment } from "../models/comment.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"

const getVideoComments = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    const { page = 1, limit = 10, isOldest } = req.query;
    const sortOption = isOldest === 'true' ? 1 : -1;

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video ID");
    }

    const videoObjectId = new mongoose.Types.ObjectId(videoId);

    const comments = await Comment.aggregate([
        {
            $match: {
                video: videoObjectId,
                parentComment: null
            }
        },
        {
            $sort: { createdAt: sortOption }
        },
        {
            $lookup: {
                from: "videos",
                localField: "video",
                foreignField: "_id",
                as: "CommentOnWhichVideo"
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "OwnerOfComment"
            }
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "comment",
                as: "commentLikes"
            }
        },
        {
            $addFields: {
                likeCount: { $size: "$commentLikes" },
                isLiked: {
                    $in: [
                        { $toObjectId: req.user._id.toString() },
                        "$commentLikes.likedBy"
                    ]
                }
            }
        },
        {
            $lookup: {
                from: "comments",
                let: { parentId: "$_id" },
                pipeline: [
                    { $match: { $expr: { $eq: ["$parentComment", "$$parentId"] } } },
                    { $sort: { createdAt: -1 } },
                    { $limit: 2 },
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "OwnerOfReply"
                        }
                    },
                    {
                        $lookup: {
                            from: "likes",
                            localField: "_id",
                            foreignField: "comment",
                            as: "replyLikes"
                        }
                    },
                    {
                        $addFields: {
                            likeCount: { $size: "$replyLikes" },
                            isLiked: {
                                $in: [
                                    { $toObjectId: req.user._id.toString() },
                                    "$replyLikes.likedBy"
                                ]
                            }
                        }
                    },
                    {
                        $project: {
                            content: 1,
                            createdAt: 1,
                            likeCount: 1,
                            isLiked: 1,
                            owner: {
                                _id: { $arrayElemAt: ["$OwnerOfReply._id", 0] },
                                username: { $arrayElemAt: ["$OwnerOfReply.username", 0] },
                                avatar: { $arrayElemAt: ["$OwnerOfReply.avatar", 0] }
                            }
                        }
                    }
                ],
                as: "replies"
            }
        },
        {
            $lookup: {
                from: "comments",
                let: { parentId: "$_id" },
                pipeline: [
                    {
                        $match: {
                            $expr: { $eq: ["$parentComment", "$$parentId"] }
                        }
                    },
                    {
                        $count: "count"
                    }
                ],
                as: "replyMeta"
            }
        },
        {
            $addFields: {
                replyCount: {
                    $cond: [
                        { $gt: [{ $size: "$replyMeta" }, 0] },
                        { $arrayElemAt: ["$replyMeta.count", 0] },
                        0
                    ]
                }
            }
        },
        {
            $project: {
                content: 1,
                createdAt: 1,
                likeCount: 1,
                isLiked: 1,
                replyCount: 1,
                replies: 1,
                owner: {
                    _id: { $arrayElemAt: ["$OwnerOfComment._id", 0] },
                    username: { $arrayElemAt: ["$OwnerOfComment.username", 0] },
                    avatar: { $arrayElemAt: ["$OwnerOfComment.avatar", 0] }
                },
                video: {
                    _id: { $arrayElemAt: ["$CommentOnWhichVideo._id", 0] }
                }
            }
        },
        {
            $skip: (page - 1) * parseInt(limit)
        },
        {
            $limit: parseInt(limit)
        }
    ]);

    if (!comments) {
        throw new ApiError(404, "No comments found for this video");
    }

    res.status(200).json(new ApiResponse(200, comments, "Comments fetched successfully"));
});

const getCommentReplies = asyncHandler(async (req, res) => {
    const { commentId } = req.params;
    const { page = 1, limit = 2 } = req.query;

    if (!isValidObjectId(commentId)) {
        throw new ApiError(400, "Invalid parent comment ID");
    }

    const replies = await Comment.aggregate([
        {
            $match: {
                parentComment: new mongoose.Types.ObjectId(commentId)
            }
        },
        { $sort: { createdAt: -1 } },
        { $skip: (page - 1) * parseInt(limit) },
        { $limit: parseInt(limit) },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "OwnerOfReply"
            }
        },
        {
            $project: {
                content: 1,
                createdAt: 1,
                owner: {
                    _id: { $arrayElemAt: ["$OwnerOfReply._id", 0] },
                    username: { $arrayElemAt: ["$OwnerOfReply.username", 0] },
                    avatar: { $arrayElemAt: ["$OwnerOfReply.avatar", 0] }
                }
            }
        }
    ]);

    res.status(200).json(new ApiResponse(200, replies, "Replies fetched successfully"));
});


const addComment = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    const { content, parentComment } = req.body;

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video ID");
    }

    if (parentComment && !isValidObjectId(parentComment)) {
        throw new ApiError(400, "Invalid parent comment ID");
    }

    if (!req.user) {
        throw new ApiError(401, "Unauthorized");
    }

    if (!content) {
        throw new ApiError(400, "Content is required");
    }

    const newComment = await Comment.create({
        content,
        video: videoId,
        owner: req.user._id,
        parentComment: parentComment || null
    });

    if (!newComment) {
        throw new ApiError(500, "Failed to add comment");
    }

    res.status(201).json(new ApiResponse(201, newComment, "Comment added successfully"));
});

const updateComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params
    const { content } = req.body

    if (!isValidObjectId(commentId)) {
        throw new ApiError(400, "Invalid comment ID")
    }

    if (!req.user) {
        throw new ApiError(401, "Unauthorized")
    }

    if (!content) {
        throw new ApiError(400, "Content is required")
    }

    const updatedComment = await Comment.findByIdAndUpdate(
        {
            _id: commentId, // Find the comment by ID
            owner: req.user._id // Ensure the logged-in user is the owner of the comment
        },
        {
            $set: { content } // Update the content of the comment

        },
        {
            new: true // Return the updated comment
        }
    )

    if (!updatedComment) {
        throw new ApiError(500, "Something went wrong while updating the comment")
    }

    res.status(200).json(new ApiResponse(200, updatedComment, "Comment updated successfully"))

    /*
 Updating Comments Notes:

  
  👉 Why check if the user is logged in?
     - Only authenticated users should be able to modify their own comments.
     - Otherwise, someone could edit another user's comments — big security risk!

  👉 Why check for both '_id' and 'owner' when updating?
     - We don’t want users to edit other people’s comments.
     - This ensures that only the original commenter can update their comment.
*/
})

const deleteComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params

    if (!isValidObjectId(commentId)) {
        throw new ApiError(400, "Invalid comment ID")
    }
    if (!req.user) {
        throw new ApiError(401, "Unauthorized")
    }

    const deleteComment = await Comment.findOneAndDelete({
        _id: commentId, // Find the comment by ID
        owner: req.user._id // Ensure the logged-in user is the owner of the comment
    })

    if (!deleteComment) {
        throw new ApiError(500, "Something went wrong while deleting the comment")
    }
    res.status(200).json(new ApiResponse(200, deleteComment, "Comment deleted successfully"))

    /*
Comment Deletion Process Notes:

👉 Why do we use findOneAndDelete()?
   - It finds the comment and deletes it in one database query.
   - Ensures only the owner of the comment can delete it (security feature!).

👉 What happens if the comment doesn't exist or the user isn't the owner?
   - The operation fails safely without deleting anything.
   - The user gets a clear error message about what went wrong.

*/
})

export {
    getVideoComments,
    getCommentReplies,
    addComment,
    updateComment,
    deleteComment
}