import { ApiError } from "../utils/ApiError.js";

const errorMiddleware = (err, req, res, next) => {
    let statusCode = err.statusCode || 500;
    let message = err.message || "Internal Server Error";

    if (!(err instanceof ApiError)) {
        console.error("Unexpected Error:", err);
    }

    return res.status(statusCode).json({
        statusCode,
        success: false,
        message,
        errors: err.errors || [],
        data: null,
    });
};

export { errorMiddleware };
