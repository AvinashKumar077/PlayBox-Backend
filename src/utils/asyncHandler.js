

//method 2 :- m2 of making async handler using promise

const asyncHandler = (requestHandler) => {
    return (req, res, next) => {
        Promise.resolve(requestHandler(req, res, next)).catch((error) => next(error));
    }
}

export { asyncHandler }



//method 1 :- m1 of making async handler using try catch block

// const asyncHandler = (fn) => async (req, res, next) => {
//     try {

//         await fn(req,res,next)

//     } catch (error) {
//         res.status(error.code || 500).json({
//             success: false,
//             message: error.message
//         })

//     }
// }



