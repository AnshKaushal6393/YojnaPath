const express = require("express");

const {
  getAllSchemesLightweight,
  getSchemeById,
  getTopSchemesByUserType,
  getUrgentSchemes,
  matchSchemes,
} = require("../controllers/schemesController");

const router = express.Router();

router.post("/match", matchSchemes);
router.get("/all", getAllSchemesLightweight);
router.get("/urgent", getUrgentSchemes);
router.get("/top/:userType", getTopSchemesByUserType);
router.get("/:id", getSchemeById);

module.exports = router;
