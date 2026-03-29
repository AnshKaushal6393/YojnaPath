const express = require("express");

const { getProfile, saveProfile } = require("../controllers/profileController");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

router.use(requireAuth);
router.get("/", getProfile);
router.post("/", saveProfile);

module.exports = router;
