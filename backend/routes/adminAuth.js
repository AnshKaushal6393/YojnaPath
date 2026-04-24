const express = require("express");

const { login, me } = require("../controllers/adminAuthController");
const { requireAdminAuth } = require("../middleware/adminAuth");
const { adminLoginLimiter } = require("../middleware/rateLimit");

const router = express.Router();

router.post("/login", adminLoginLimiter, login);
router.get("/me", requireAdminAuth, me);

module.exports = router;
