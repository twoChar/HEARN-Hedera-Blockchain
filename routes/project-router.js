const express = require("express");
const { ProjectTransaction } = require("../controllers/project-transaction");
const { validateProjectHash } = require("../controllers/project-validate");
const { getProjectTransactions } = require("../controllers/project-trails");

const router = express.Router();

router.post("/bctransaction", ProjectTransaction);
router.post("/bcvalidate", validateProjectHash);
router.post("/bctrail", getProjectTransactions);

module.exports = router;
