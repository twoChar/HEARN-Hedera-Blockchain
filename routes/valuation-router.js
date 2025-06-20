const express = require("express");
const {
  ValuationTransaction,
} = require("../controllers/valuation-transaction");
const { validateValuation } = require("../controllers/valuation-validate");
const { getValuationTransactions } = require("../controllers/valuation-trails");

const ProposalRouter = express.Router();

ProposalRouter.post("/bctransaction", ValuationTransaction);
ProposalRouter.post("/bcvalidate", validateValuation);
ProposalRouter.post("/bctrail", getValuationTransactions);

module.exports = ProposalRouter;
