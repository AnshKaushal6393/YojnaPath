const express = require("express");

const {
  getAllSchemesLightweight,
  getSchemeById,
  getTopSchemesByUserType,
  getUrgentSchemes,
  matchSchemes,
} = require("../controllers/schemesController");
const { attachUserIfPresent } = require("../middleware/auth");
const { matchLimiter } = require("../middleware/rateLimit");

const router = express.Router();

router.post("/match", attachUserIfPresent, matchLimiter, matchSchemes);
router.get("/all", getAllSchemesLightweight);
router.get("/urgent", getUrgentSchemes);
router.get("/top/:userType", getTopSchemesByUserType);
router.get("/:id", getSchemeById);

module.exports = router;
