const express = require("express");

const {
  deleteSavedScheme,
  getSavedSchemes,
  saveScheme,
} = require("../controllers/savedSchemesController");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

router.use(requireAuth);
router.get("/", getSavedSchemes);
router.post("/:schemeId", saveScheme);
router.delete("/:schemeId", deleteSavedScheme);

module.exports = router;
