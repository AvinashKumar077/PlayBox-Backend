import mongoose, { isValidObjectId } from "mongoose"
import { Video } from "../models/video.model.js"
import { User } from "../models/user.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"


const getAllVideos = asyncHandler(async (req, res) => {
    const {
        page = 1, // Default page number is 1 if not provided
        limit = 10, // Default limit per page is 10
        query = "", // Default query is an empty string
        sortBy = "createdAt", // Default sorting field is "createdAt"
        sortType = "desc", // Default sorting order is descending
        userId, // User ID (optional, to filter videos by a specific user)
    } = req.query;

    if (!req.user) {
        throw new ApiError(401, "Unauthorized")
    }

    const match = {
        ...(query ? { title: { $regex: query, $options: "i" } } : {}),
        ...(userId ? { owner: mongoose.Types.ObjectId(userId) } : {}),
    };

    const videos = await Video.aggregate([
        {
            $match: match,
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "videosByOwner",
            },
        },
        {
            $project: {
                videoFile: 1,
                thumbnail: 1,
                title: 1,
                description: 1,
                duration: 1,
                views: 1,
                createdAt: 1,
                updatedAt: 1,
                owner: {
                    $ifNull: [{ $arrayElemAt: ["$videosByOwner", 0] }, null],
                },
                ownerExists: { $gt: [{ $size: "$videosByOwner" }, 0] }, // Check if owner exists
            },
        },
        {
            $sort: {
                [sortBy]: sortType === "desc" ? -1 : 1,
            },
        },
        {
            $skip: (page - 1) * parseInt(limit),
        },
        {
            $limit: parseInt(limit),
        },
    ]);

    if (!videos?.length) {
        return res.status(200).json(new ApiResponse(200, [], "No videos found"))
    }

    return res.status(200).json(
        new ApiResponse(200, videos, "Videos fetched successfully")
    )

})

const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description, owner } = req.body

    // Validate that the title is not empty
    if (!title) {
        throw new ApiError(400, "Title should not be empty");
    }
    // Validate that the description is not empty
    if (!description) {
        throw new ApiError(400, "Description should not be empty");
    }

    // Extract the video file path from the uploaded files
    const videoFileLocalPath = req.files?.videoFile[0]?.path;
    if (!videoFileLocalPath) {
        throw new ApiError(400, "Video file is required");
    }

    // Extract the thumbnail file path from the uploaded files
    const thumbnailLocalPath = req.files?.thumbnail[0]?.path;
    if (!thumbnailLocalPath) {
        throw new ApiError(400, "Thumbnail is required");
    }

    try {
        const videoFile = await uploadOnCloudinary(videoFileLocalPath);
        if (!videoFile) {
            throw new ApiError(400, "Cloudinary Error: Video file is required");
        }
        const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);
        if (!thumbnail) {
            throw new ApiError(400, "Cloudinary Error: Video file is required");
        }

        const duration = videoFile.duration // Get the duration of the video file
        if (!duration) {
            throw new ApiError(400, "Cloudinary Error: not able to get duration");
        }

        const videoDoc = await Video.create({
            videoFile: videoFile.url,
            thumbnail: thumbnail.url,
            title,
            description,
            owner: req.user?._id,
            duration,
        })

        console.log(` Title: ${title}, Owner: ${owner}, duration: ${duration}`);

        if (!videoDoc) {
            throw new ApiError(500, "Something went wrong while publishing a video");
        }
        return res
            .status(201)
            .json(new ApiResponse(201, videoDoc, "Video published successfully"));
    } catch (error) {

        throw new ApiError(500, error);

    }
    /*
    Video Publishing Notes:

    👉 Why do we upload the video and thumbnail to Cloudinary?
       - Storing large video files on the server isn't scalable.
       - Cloudinary provides a CDN, making videos load faster.
    
    👉 Why store the duration in the database?
       - Duration helps in displaying video length without reprocessing the file.
       - It improves user experience and optimizes video streaming.
    */
})

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video ID")
    }
    const video = await Video.findById(videoId).populate("owner", "name email")
    if (!video) {
        throw new ApiError(404, "Video not found")
    }
    return res.status(200).json(new ApiResponse(200, video, "Video fetched successfully"))
    /*
        Video Retrieval Notes:

        👉 What does `.populate("owner", "name email")` do?
        - By default, the `owner` field in the video document only contains the owner's `_id`.
        - `populate()` replaces this ID with an actual object containing the owner's `name` and `email`.
        - This reduces extra API calls from the frontend to fetch user details separately.
*/
})

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    const { title, description } = req.body

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video ID")
    }

    // Create an object to hold updateData for updating title, description and thumbnail(thumbnail will be appended later)
    let updateData = { title, description };

    /*
    If a new thumbnail is uploaded:
    - Extract the file path from request.
    - Ensure the file path is valid.
    - Upload the file to Cloudinary.
    - If the upload is successful, update the thumbnail URL.
  */
    if (req.file) {
        const thumbnailLocalPath = req.file.path
        if (!thumbnailLocalPath) {
            throw new ApiError(400, "Thumbnail is required")
        }
        const thumbnail = await uploadOnCloudinary(thumbnailLocalPath)
        if (!thumbnail) {
            throw new ApiError(400, "Cloudinary Error: Thumbnail is required")
        }
        // Add the new thumbnail URL to the updateData
        updateData.thumbnail = thumbnail.url
    }
    /*
    Update the video document in the database:
    - `findByIdAndUpdate` searches for the video by its ID.
    - `$set: updateData` updates only the provided fields.
    - `{ new: true, runValidators: true }`
      - `new: true` returns the updated document instead of the old one.
      - `runValidators: true` ensures data validation rules are applied.
  */
    const updatedVideo = await Video.findByIdAndUpdate(
        videoId,
        { $set: updateData },
        { new: true, runValidators: true }
    );

    if (!updatedVideo) {
        throw new ApiError(404, "Video not found");
    }

    // Send a success response with the updated video details.
    return res
        .status(200)
        .json(new ApiResponse(200, updatedVideo, "Video updated successfully"));

    /* 
  
      Video Update Notes:
  
  👉 Why do we use `findByIdAndUpdate` instead of `save()`?
     - `findByIdAndUpdate` allows us to update only specific fields, reducing unnecessary data writes.
     - `save()` is useful when we want to modify and validate an entire document.
  
  👉 Why do we check for `req.file` before updating the thumbnail?
     - Not all updates require a new thumbnail, so we update it only if a new file is provided.
     - This prevents unnecessary file uploads and saves storage space.
  
  👉 What happens if Cloudinary upload fails?
     - The function throws an error before making any database changes, ensuring data integrity.
     - This prevents storing an invalid or missing thumbnail URL in the database.
  
  👉 Why use `{ new: true, runValidators: true }`?
     - `new: true`: Returns the updated document immediately after modification.
     - `runValidators: true`: Ensures any schema validation rules (like required fields) are enforced. 
     
     */


})

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video ID")
    }

    const deletedVideo = await Video.findByIdAndDelete(videoId)
    if (!deletedVideo) {
        throw new ApiError(404, "Video not found")
    }

    return res
        .status(200)
        .json(new ApiResponse(200, deletedVideo, "Video deleted successfully"));


})

const togglePublishStatus = asyncHandler(async (req, res) => {
    /*
      Extract the videoId from the request parameters.
      - This is the ID of the video whose publish status we want to toggle.
    */
    const { videoId } = req.params;

    // Validate if the provided videoId is a valid MongoDB ObjectId.
    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video ID");
    }

    /*
      Find the video by its ID.
      - `findById(videoId)`: Fetches the video document if it exists.
      - If the video is not found, we throw a 404 error.
    */
    const video = await Video.findById(videoId);

    if (!video) {
        throw new ApiError(404, "Video not found");
    }

    /*
      Toggle the `isPublished` status of the video.
      - If it's `true`, set it to `false`.
      - If it's `false`, set it to `true`.
    */
    video.isPublished = !video.isPublished;

    // Save the updated video status in the database.
    await video.save();

    /*
      Send a success response with the updated video details.
      - `video` contains the updated publish status.
    */
    return res
        .status(200)
        .json(
            new ApiResponse(200, video, "Video publish status toggled successfully")
        );

    /* 
  
   Toggling Publish Status Notes:
  
  👉 What happens when `findById(videoId)` is called?
     - The function searches the database for a document with the given ID.
     - If found, it returns the video document.
     - If not found, we throw a `404` error to indicate the video doesn't exist.
  
  👉 How does toggling `isPublished` work?
     - `video.isPublished = !video.isPublished;`
     - This flips the boolean value (`true` → `false`, `false` → `true`).
     - It effectively acts as a switch between published and unpublished states.
  
  👉 Why do we call `video.save()`?
     - Changes made to a Mongoose document are not saved automatically.
     - `.save()` commits the updated status to the database.
  
  👉 Alternative ways to toggle a boolean field in MongoDB?
     - Using Mongoose's update function:
       ```
       await Video.findByIdAndUpdate(videoId, { $set: { isPublished: !video.isPublished } }, { new: true });
  
       ```
     - This method is more concise but requires re-fetching the document to get the updated value.
     
   */
});

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}