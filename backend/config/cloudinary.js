require("./env");

const cloudinary = require("cloudinary").v2;

let isConfigured = false;

function configureCloudinary() {
  if (isConfigured) {
    return cloudinary;
  }

  const cloudName = String(process.env.CLOUDINARY_CLOUD_NAME || "").trim();
  const apiKey = String(process.env.CLOUDINARY_API_KEY || "").trim();
  const apiSecret = String(process.env.CLOUDINARY_API_SECRET || "").trim();

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error("Cloudinary is not configured");
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
  });

  isConfigured = true;
  return cloudinary;
}

module.exports = {
  configureCloudinary,
};
