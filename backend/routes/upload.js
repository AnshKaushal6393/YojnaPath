const express = require("express");
const multer = require("multer");

const { configureCloudinary } = require("../config/cloudinary");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

router.post("/photo", requireAuth, upload.single("photo"), async (req, res) => {
  if (!req.file?.buffer) {
    return res.status(400).json({ message: "Photo file is required" });
  }

  try {
    const cloudinary = configureCloudinary();
    const folder = String(req.body?.folder || "yojnapath/profiles").trim() || "yojnapath/profiles";
    const publicIdBase =
      String(req.body?.publicId || "").trim() || `user_${req.user.id}_${Date.now()}`;

    const result = await new Promise((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          {
            folder,
            public_id: publicIdBase,
            overwrite: true,
            resource_type: "image",
            transformation: [
              { width: 400, height: 400, crop: "fill", gravity: "face" },
              { quality: "auto", fetch_format: "auto" },
            ],
          },
          (error, uploadResult) => {
            if (error) {
              reject(error);
              return;
            }

            resolve(uploadResult);
          }
        )
        .end(req.file.buffer);
    });

    return res.json({
      photoUrl: result.secure_url,
      publicId: result.public_id,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Upload failed" });
  }
});

module.exports = router;
