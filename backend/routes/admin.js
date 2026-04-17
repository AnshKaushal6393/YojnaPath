const express = require("express");

const { getDashboard, getStats } = require("../controllers/adminController");
const { requireAdminAuth } = require("../middleware/adminAuth");

const router = express.Router();

router.use(requireAdminAuth);
router.get("/dashboard", getDashboard);
router.get("/stats", getStats);

module.exports = router;
