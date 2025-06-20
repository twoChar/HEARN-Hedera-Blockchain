const express = require("express");
const { AssetTransaction } = require("../controllers/asset-transaction");
const { validateAssetHash } = require("../controllers/asset-validate");
const { getAssetTransactions } = require("../controllers/asset-trails");

const router = express.Router();

router.post("/bctransaction", AssetTransaction);
router.post("/bcvalidate", validateAssetHash);
router.post("/bctrail", getAssetTransactions);

module.exports = router;
