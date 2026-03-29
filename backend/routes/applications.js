const express = require("express");

const {
  getApplications,
  patchApplication,
  saveApplication,
} = require("../controllers/applicationsController");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

router.use(requireAuth);
router.get("/", getApplications);
router.post("/", saveApplication);
router.patch("/:schemeId", patchApplication);

module.exports = router;
