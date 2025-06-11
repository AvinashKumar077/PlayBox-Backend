import mongoose, { isValidObjectId } from "mongoose";
import { Comment } from "../models/comment.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"

const getVideoComments = asyncHandler(async (req, res) => {
    // Function to get comments for a specific video

    /*
      Step 1: Extract videoId from request parameters
      - req.params contains route parameters like videoId (e.g., /video/:videoId/comments)
    */
    const { videoId } = req.params

    /*
   Step 2: Extract pagination details from query parameters
   - If the client sends ?page=2&limit=5, then:
     - page = 2 (fetch second page of comments)
     - limit = 5 (fetch 5 comments per page)
   - If no values are provided, default to page 1 and limit 10
 */

    const { page = 1, limit = 10 } = req.query

    /*
    Step 3: Validate videoId
    - MongoDB uses ObjectId format, so we need to check if videoId is a valid ObjectId.
    - If the ID is invalid, we throw an error.
  */

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video ID")
    }

    /*
    Step 4: Convert videoId to ObjectId
    - MongoDB stores IDs as ObjectId, so we need to convert videoId (string) to ObjectId format.
    - This ensures correct matching in the database.
  */

    const videoObjectId = new mongoose.Types.ObjectId(videoId);

    /*
    Step 5: Fetch comments using aggregation

  */

    const comments = await Comment.aggregate([
        {
            /*
                Step 5.1: Match comments related to the specified video ID
                        - This filters out only comments that belong to the requested video.
            */
            $match: {
                video: videoObjectId // Match comments for the specific video
            }
        },
        {
            /*
                Step 5.2: Lookup video details
                   - Joins the "videos" collection to get details about the video which has the comment
                   - The result is stored as "CommentOnWhichVideo".
            */

            $lookup: {
                from: "videos",
                localField: "video",
                foreignField: "_id",
                as: "CommentOnWhichVideo"
            }
        },
        {
            /*
              Step 5.3: Lookup user details (comment owner)
              - Joins the "users" collection to get details about the user who posted the comment.
              - The result is stored as "OwnerOfComment".
            */

            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "OwnerOfComment"
            }
        },
        {
            /*
             Step 5.4: Restructure the output
             - $project is used to include only required fields.
             - $arrayElemAt extracts the first (and only) element from "OwnerOfComment" and "CommentOnWhichVideo".
             - This avoids unnecessary array nesting in the result.
            */

            $project: {
                content: 1,
                owner: {
                    _id: { $arrayElemAt: ["$OwnerOfComment._id", 0] },
                    username: { $arrayElemAt: ["$OwnerOfComment.username", 0] },
                    avatar: { $arrayElemAt: ["$OwnerOfComment.avatar", 0] }
                },
                video: {
                    _id: { $arrayElemAt: ["$CommentOnWhichVideo._id", 0] }
                },
                createdAt: 1,
            }
        },
        {
            /*
              Step 6: Apply pagination
              - $skip ignores comments from previous pages ((page - 1) * limit).
              - $limit restricts the number of comments per request to the specified limit.
            */
            $skip: (page - 1) * parseInt(limit),
        },

        {
            $limit: parseInt(limit),
        }


    ]);

    // step 7 check if comments exist
    if (!comments) {
        throw new ApiError(404, "No comments found for this video")
    }

    // step 8 : send response

    res.status(200).json(new ApiResponse(200, comments, "Comments fetched successfully"))


    /*
 Comment Fetching Notes:


👉 Why do we use $lookup twice?
 - First $lookup fetches video details (to know which video the comment is on).
 - Second $lookup fetches the user details (who wrote the comment).

👉 Why do we use $arrayElemAt inside $project?
 - $lookup returns an array, even if there's only one matching document.
 - $arrayElemAt extracts the first element, so we get a single object instead of an array.
 
👉 Why do we use pagination with $skip and $limit?
 - $skip ignores previous pages of comments ((page - 1) * limit).
 - $limit ensures we don't fetch too many comments at once, improving performance.
 - This prevents overwhelming the database and speeds up response time.
*/
})

const addComment = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    const { content } = req.body


    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video ID")
    }

    if (!req.user) {
        throw new ApiError(401, "Unauthorized")
    }

    if (!content) {
        throw new ApiError(400, "Content is required")
    }

    const addComment = await Comment.create({
        content,
        video: videoId, // linking comment to the video
        owner: req.user._id // linking the comment to the logged in user
    })

    if (!addComment) {
        throw new ApiError(500, "Failed to add comment")
    }
    res.status(201).json(new ApiResponse(201, { addComment, videoId }, "Comment added successfully"))

    /*
 Commenting System Notes:


  👉 Why check if the user is logged in?
     - Comments should only be made by registered users.
     - Imagine a chat where random anonymous people spam messages. Not fun, right?

  👉 Why check if content is empty?
     - A comment must have text, otherwise it wouldn't make sense!
     - It’s like sending a blank text message to a friend—they’d be confused!

  👉 Why store 'owner' and 'video' in the comment?
     - This allows us to track who made the comment and on which video.
     - If we didn't store this info, we'd have random comments with no way to know where they belong.
*/

})

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
    addComment,
    updateComment,
    deleteComment
}