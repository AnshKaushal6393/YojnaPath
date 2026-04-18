const express = require("express");

const {
  deleteUserById,
  exportUsers,
  getActivity,
  getDashboard,
  getFunnel,
  getStats,
  getUserById,
  getUserLiveMatches,
  getUserMatches,
  getUsers,
} = require("../controllers/adminController");
const { requireAdminAuth } = require("../middleware/adminAuth");

const router = express.Router();

router.use(requireAdminAuth);
router.get("/dashboard", getDashboard);
router.get("/stats", getStats);
router.get("/activity", getActivity);
router.get("/funnel", getFunnel);
router.get("/users/export", exportUsers);
router.get("/users", getUsers);
router.get("/users/:id", getUserById);
router.get("/users/:id/live-matches", getUserLiveMatches);
router.delete("/users/:id", deleteUserById);
router.get("/users/:id/matches", getUserMatches);

module.exports = router;
