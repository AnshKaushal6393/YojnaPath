const express = require("express");

const { login, verify } = require("../controllers/authController");
const { otpLimiter } = require("../middleware/rateLimit");

const router = express.Router();

router.post("/login", otpLimiter, login);
router.post("/verify", verify);

module.exports = router;
