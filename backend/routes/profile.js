const express = require("express");

const {
  deleteProfile,
  getProfile,
  listProfiles,
  saveProfile,
} = require("../controllers/profileController");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

router.use(requireAuth);
router.get("/members", listProfiles);
router.get("/", getProfile);
router.post("/", saveProfile);
router.delete("/:profileId", deleteProfile);

module.exports = router;
