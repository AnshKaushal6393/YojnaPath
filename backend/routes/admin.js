const express = require("express");

const { getActivity, getDashboard, getFunnel, getStats } = require("../controllers/adminController");
const { requireAdminAuth } = require("../middleware/adminAuth");

const router = express.Router();

router.use(requireAdminAuth);
router.get("/dashboard", getDashboard);
router.get("/stats", getStats);
router.get("/activity", getActivity);
router.get("/funnel", getFunnel);

module.exports = router;
