import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"


const healthcheck = asyncHandler(async (req, res) => {
    //TODO: build a healthcheck response that simply returns the OK status as json with a message
    /*
     - This API is meant to check if the service is running properly.
      - If everything is good, we send a response with status "OK".
      - If anything goes wrong we handle the error gracefully
    */

    try {
        return res.status(200).json(new ApiResponse(200, { ststus: "OK" }, "Server is running smoothly"));
    } catch (error) {
        throw new ApiError(500, "Healthcheck failed", error.message);
    }
});

export {
    healthcheck
}
