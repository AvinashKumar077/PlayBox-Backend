import mongoose, { isValidObjectId } from "mongoose"
import { User } from "../models/user.model.js"
import { Subscription } from "../models/subscription.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"


const toggleSubscription = asyncHandler(async (req, res) => {
    const { channelId } = req.params
    const subscriberId = req.user._id

    if (!isValidObjectId(channelId)) {
        throw new ApiError(400, "Invalid channel ID")
    }
    if (subscriberId.toString() === channelId.toString()) {
        throw new ApiError(400, "You cannot subscribe to your own channel")
    }
    const existingSubscription = await Subscription.findOne({
        channel: channelId,
        subscriber: subscriberId
    })

    if (existingSubscription) {
        // unsubscribe
        await Subscription.findByIdAndDelete(existingSubscription._id)
        return res.status(200).json(new ApiResponse(200, {}, "Unsubscribed successfully"))
    }
    /*
     Toggling Subscription - Notes: 
 
     👉 What does `Subscription.findOne()` do?
        - Searches for an existing subscription in the database.
        - If found, we remove it (unsubscribe). Otherwise, we create a new one (subscribe).
   
     👉 Why use `findByIdAndDelete()` instead of `deleteOne()`?
        - `findByIdAndDelete()` finds a document by its `_id` and removes it in one step.
        - `deleteOne({ ... })` works too, but we already have the exact `_id`, so it's faster.
   
     👉 Why use `.toString()` when comparing ObjectIds?
        - MongoDB IDs are objects, so `===` won’t work directly.
        - `.toString()` ensures they can be compared properly.
        
   */

    // If no subscription exists, create a new one (subscribe)
    await Subscription.create({ subscriber: subscriberId, channel: channelId });
    return res
        .status(201)
        .json(new ApiResponse(201, {}, "Subscribed successfully"));
})

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    const channelId = req.user._id;

    if (!isValidObjectId(channelId)) {
        throw new ApiError(400, "Invalid channel ID")
    }

    const subscribersDocs = await Subscription.find({
        channel: channelId,
    }).populate("subscriber", "_id name email");


    if (!subscribersDocs) {
        throw new ApiError(404, "No subscribers found for this channel");
    }
    return res
        .status(200)
        .json(
            new ApiResponse(200, subscribersDocs, "Subscribers fetched successfully")
        );
    /*
     Subscriber List Fetching - Notes:
 
     👉 Why do we use `populate()`?
        - To replace the `subscriber` field (which is an ID) with actual user details.
        - This makes it easier to see who the subscribers are.
 
     👉 Why do we use `"_id name email"` in `populate()`?
        - To specify which fields we want from the `User` model.
        - We only need `_id`, `name`, and `email` for our response.
 
     👉 Why do we check if `subscribers` is empty?
        - To handle cases where no subscribers are found for the given channel.
        - This prevents sending back an empty response and helps with error handling.
    */
})

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
    // Controller to get the list of channels a user has subscribed to

    // Extract the subscriber ID from the authenticated user
    const subscriberId = req.user._id;

    /* 
  
       - `Subscription.find({ subscriber: subscriberId })`: Finds all records where this user which is coming from "req.user._id " is the subscriber.
       - `populate("channel", "_id name email")`: Fetches the channel details (_id, name, email) for each subscription.
       - Why? Because subscriptions store only IDs. Populating converts them into actual channel objects. */

    const subscribedChannels = await Subscription.find({
        subscriber: subscriberId,
    }).populate("channel", "_id name email");

    // If no subscribed channels found, return an error
    if (!subscribedChannels || subscribedChannels.length === 0) {
        throw new ApiError(404, "No subscribed channels found");
    }

    /*  Why are we checking `subscribedChannels.length === 0`?
       - `.find()` always returns an array. If empty, that means no subscriptions exist.
       - Without this check, the user might receive an empty array instead of a proper message.
    */

    // Return a success response with the list of subscribed channels
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                subscribedChannels,
                "Subscribed channels fetched successfully"
            )
        );

});

export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
}