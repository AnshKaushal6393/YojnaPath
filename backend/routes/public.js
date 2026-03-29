const express = require("express");

const { getApiHealth, getImpact } = require("../controllers/publicController");

const router = express.Router();

router.get("/health", getApiHealth);
router.get("/impact", getImpact);

module.exports = router;
