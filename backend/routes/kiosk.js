const express = require("express");

const { kioskLogin, kioskMatch } = require("../controllers/kioskController");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

router.post("/login", kioskLogin);
router.post("/match", requireAuth, requireRole("kiosk"), kioskMatch);

module.exports = router;
