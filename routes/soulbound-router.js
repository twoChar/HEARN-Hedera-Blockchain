const express = require("express");
const {
  SoulboundTransaction,
} = require("../controllers/soulbound-transaction");
const { validateSoulboundHash } = require("../controllers/soulbound-validate");
const { getSoulboundTransactions } = require("../controllers/soulbound-trails");

const soulboundRouter = express.Router();
soulboundRouter.post("/bctransaction", SoulboundTransaction);
soulboundRouter.post("/bcvalidate", validateSoulboundHash);
soulboundRouter.post("/bctrail", getSoulboundTransactions);

module.exports = soulboundRouter;
