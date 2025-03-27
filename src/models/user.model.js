import mongoose, { Schema } from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

const userSchema = new Schema(
    {
        username: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            index: true // to make search faster
        },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },
        fullname: {
            type: String,
            required: true,
            trim: true,
            index: true
        },
        avatar: {
            type: String, // cloudinary url
            default: "https://www.gravatar.com/avatar/000?d=mp"
        },
        coverImage: {
            type: String, // cloudinary url
        },
        watchHistory: [{
            type: Schema.Types.ObjectId,
            ref: "Video"
        }],
        password: {
            type: String,
            required: [true, "Password is required"],
        },
        refreshToken: {
            type: String,
        }

    },
    {
        timestamps: true
    }
)

userSchema.pre("save", async function (next) {

    if (this.isModified("password")) return next()

    this.password = await bcrypt.hash(this.password, 10)
    next()

})

userSchema.methods.isPasswordMatch = async function (password) {
    return await bcrypt.compare(password, this.password)
}

export const User = mongoose.model("User", userSchema)