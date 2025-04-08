import mongoose, { isValidObjectId } from "mongoose"
import { Playlist } from "../models/playlist.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"


const createPlaylist = asyncHandler(async (req, res) => {
    const { name, description } = req.body

    if (!name || !description) {
        throw new ApiError(400, "Name and description are required")
    }

    const playlist = await Playlist.create({
        name,
        description,
        owner: req.user._id
    })

    if (!playlist) {
        throw new ApiError(500, "Something went wrong while creating the playlist")
    }
    res.status(201).json(new ApiResponse(201, playlist, "Playlist created successfully"))
})

const getUserPlaylists = asyncHandler(async (req, res) => {
    const { userId } = req.params
    if (!isValidObjectId(userId)) {
        throw new ApiError(400, "Invalid user ID")
    }
    const playlists = await Playlist.find({ owner: userId })

    if (!playlists || playlists.length === 0) {
        throw new ApiError(404, "No playlists found for this user")
    }

    res.status(200).json(new ApiResponse(200, playlists, "User playlists fetched successfully"))
})

const getPlaylistById = asyncHandler(async (req, res) => {
    const { playlistId } = req.params
    if (!isValidObjectId(playlistId)) {
        throw new ApiError(400, "Invalid playlist ID")
    }
    const playlist = await Playlist.findById(playlistId).populate("videos")
    if (!playlist) {
        throw new ApiError(404, "Playlist not found")
    }
    res.status(200).json(new ApiResponse(200, playlist, "Playlist fetched successfully"))
})

const addVideoToPlaylist = asyncHandler(async (req, res) => {
    const { playlistId, videoId } = req.params
    if (!isValidObjectId(playlistId) || !isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid playlist or video ID");
    }
    const updatedPlaylist = await Playlist.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(playlistId)
            }

        },
        {
            $addFields: {
                videos: {
                    $setUnion: ["$videos", [new mongoose.Types.ObjectId(videoId)]]
                }
            }
        },
        {
            $merge: {
                into: "playlists",
            }
        }
    ])
    if (!updatedPlaylist) {
        throw new ApiError(500, "Something went wrong while adding video to the playlist")
    }
    res.status(200).json(new ApiResponse(200, updatedPlaylist, "Video added to playlist successfully"))

    /*

 Adding a Video to a Playlist - Notes:

👉 What does `$setUnion` do?
   - Ensures that the `videos` array only contains unique values.
   - If the video is already in the playlist, it won’t be added again.
   - Helps prevent duplicate entries.

👉 How does `$merge` work?
   - Takes the modified playlist and updates the `playlists` collection.
   - If the document exists, it updates it.
   - If the document doesn’t exist, it creates a new one (though in this case, it’s always an update).

👉 Alternative method using `findByIdAndUpdate`
   ```
   const updatedPlaylist = await Playlist.findByIdAndUpdate(
     playlistId,
     { $addToSet: { videos: videoId } }, // $addToSet ensures uniqueness
     { new: true }
   );

   ```
 */
})

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    const { playlistId, videoId } = req.params

    if (!isValidObjectId(playlistId) || !isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid playlist or video ID")
    }
    const updatedPlaylist = await Playlist.findByIdAndUpdate(
        playlistId,
        {
            $pull: {
                videos: new mongoose.Types.ObjectId(videoId),
            },
        },
        {
            new: true,
        }
    );

    if (!updatedPlaylist) {
        throw new ApiError(404, "Playlist not found")
    }
    res.status(200).json(new ApiResponse(200, updatedPlaylist, "Video removed from playlist successfully"))

    /*

Removing a Video from a Playlist - Notes:

👉 How does `$pull` work in MongoDB?
 - `$pull` is a MongoDB operator used to remove specific items from an array.
 - It searches for the given value inside the array and removes it.
 - If the value isn’t found, nothing happens (no errors!).

👉 Why use `findByIdAndUpdate` instead of `.save()`?
 - It’s a direct database update → no need to fetch, modify, then save.
 - More efficient when dealing with large datasets.
 
*/

})

const deletePlaylist = asyncHandler(async (req, res) => {
    const { playlistId } = req.params
    if (!isValidObjectId(playlistId)) {
        throw new ApiError(400, "Invalid playlist ID")
    }
    const deletedPlaylist = await Playlist.findByIdAndDelete(playlistId)
    if (!deletedPlaylist) {
        throw new ApiError(404, "Playlist not found")
    }
    res.status(200).json(new ApiResponse(200, deletedPlaylist, "Playlist deleted successfully"))
    /* 

Deleting a Playlist - Notes:

👉 How does `findByIdAndDelete` work?
   - It finds a document by its ID and removes it from the database.
   - If the ID exists, it deletes the document and returns it.
   - If the ID is invalid or not found, it returns `null`.

👉 Alternative ways to delete a playlist?
   - `Playlist.deleteOne({ _id: playlistId })`: Deletes only one matching playlist.
   - `Playlist.findOneAndDelete({ _id: playlistId })`: Similar but allows additional query conditions.

 */
})

const updatePlaylist = asyncHandler(async (req, res) => {
    const { playlistId } = req.params
    const { name, description } = req.body

    if (!isValidObjectId(playlistId)) {
        throw new ApiError(400, "Invalid playlist ID")
    }
    if (!name || !description) {
        throw new ApiError(400, "Name and description are required")
    }
    const updatedPlaylist = await Playlist.findByIdAndUpdate(
        playlistId,
        {
            $set: {
                name,
                description,
            },
        },
        {
            new: true,
        }
    )
    if (!updatedPlaylist) {
        throw new ApiError(404, "Playlist not found")
    }
    res.status(200).json(new ApiResponse(200, updatedPlaylist, "Playlist updated successfully"))

    /*

Updating a Playlist - Notes:

 👉 How does `findByIdAndUpdate` work?
    - It finds a document by ID and updates it in a single operation.
    - `{ new: true }` makes sure the updated document is returned instead of the old one.

 👉 What’s an alternative way to update?
    - `Playlist.findOneAndUpdate({ _id: playlistId }, { name, description }, { new: true })`
    - This works similarly but allows more complex queries.
    
*/
})


export {
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist
}