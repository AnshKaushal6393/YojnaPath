const express = require("express");

const { googleLogin, login, me, register, verify } = require("../controllers/authController");
const { requireAuth } = require("../middleware/auth");
const { otpLimiter } = require("../middleware/rateLimit");

const router = express.Router();

router.post("/login", otpLimiter, login);
router.post("/google", googleLogin);
router.post("/verify", verify);
router.get("/me", requireAuth, me);
router.post("/register", requireAuth, register);

module.exports = router;
