import { Router } from 'express';
import {
    addComment,
    deleteComment,
    getVideoComments,
    updateComment,
    getCommentReplies
} from "../controllers/comment.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(verifyJWT);

// Get all top-level comments for a video OR post a new comment/reply
router.route("/:videoId")
    .get(getVideoComments)
    .post(addComment);

// Update or delete a specific comment
router.route("/c/:commentId")
    .patch(updateComment)
    .delete(deleteComment);

// ✅ New route: Get paginated replies for a comment
router.route("/replies/:commentId")
    .get(getCommentReplies);

export default router;
