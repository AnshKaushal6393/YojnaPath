const express = require("express");

const { kioskLogin, kioskMatch, kioskPdfDownload } = require("../controllers/kioskController");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

router.post("/login", kioskLogin);
router.post("/match", requireAuth, requireRole("kiosk"), kioskMatch);
router.post("/pdf-download", requireAuth, requireRole("kiosk"), kioskPdfDownload);

module.exports = router;
