const express = require("express");

const {
  getAllSchemesLightweight,
  getSchemeById,
  getTopSchemesByUserType,
  getUrgentSchemes,
  matchSchemes,
  explainScheme,
  reportSchemeIssue,
} = require("../controllers/schemesController");
const { attachUserIfPresent } = require("../middleware/auth");
const { matchLimiter } = require("../middleware/rateLimit");

const router = express.Router();

router.post("/match", attachUserIfPresent, matchLimiter, matchSchemes);
router.post("/:id/explain", attachUserIfPresent, explainScheme);
router.post("/:id/report", attachUserIfPresent, reportSchemeIssue);
router.get("/all", getAllSchemesLightweight);
router.get("/urgent", getUrgentSchemes);
router.get("/top/:userType", getTopSchemesByUserType);
router.get("/:id", getSchemeById);

module.exports = router;
