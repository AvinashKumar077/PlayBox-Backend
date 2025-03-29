import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

// Configuration
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadOnCloudinary = async (localFilePath) => {
    try {

        console.log(`Uploading file on cloudinary with local file path ${localFilePath}`);
        // Upload file on Cloudinary
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto"
        })
        // file has been uploaded successfully
        if (fs.existsSync(localFilePath)) {
            fs.unlinkSync(localFilePath);
        } // remove file from local storage
        return response;
    } catch (error) {
        console.error("Cloudinary Error:", error.error || error.message || error);
        if (fs.existsSync(localFilePath)) {
            fs.unlinkSync(localFilePath);
        }
    }

}

export { uploadOnCloudinary }