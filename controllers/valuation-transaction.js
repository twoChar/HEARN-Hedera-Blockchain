const {
  ContractExecuteTransaction,
  TransactionId,
  Hbar,
} = require("@hashgraph/sdk");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { Interface } = require("ethers");
require("dotenv").config({ path: "../.env" });

// Maximum number of retry attempts
const MAX_RETRIES = 3;
// Base delay for exponential backoff (in milliseconds)
const BASE_DELAY = 1000;

// Helper function to wait
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function ValuationTransaction(req, res) {
  try {
    const requiredEnvVars = [
      "DEPLOYED_VALUATION_CONTRACT_ID",
      "HASH_SECRET_KEY",
    ];
    requiredEnvVars.forEach((key) => {
      if (!process.env[key]) {
        throw new Error(`Missing required environment variable: ${key}`);
      }
    });

    const contractId = process.env.DEPLOYED_VALUATION_CONTRACT_ID;
    const secretKey = process.env.HASH_SECRET_KEY;

    console.log("contractid", contractId);

    const abiPath = path.join(__dirname, "../contracts/Valuation.json");
    const abiFile = JSON.parse(fs.readFileSync(abiPath, "utf8"));
    const abi = abiFile.abi;

    const client = require("../configs/client")();
    const iface = new Interface(abi);

    const valuationDataForHash = {
      prj_id: req.body.prj_id,
      valuation_company: req.body.valuation_company,
      valuation_time_period: req.body.valuation_time_period,
      total_asset_value: req.body.total_asset_value,
      expected_revenue: req.body.expected_revenue,
      expected_carbon_credits_value: req.body.expected_carbon_credits_value,
      total_valuation: req.body.total_valuation,
      valuation_date: req.body.valuation_date,
    };

    const valuationDetailsString = JSON.stringify(valuationDataForHash);

    const valuationHashBuffer = crypto
      .createHmac("sha256", secretKey)
      .update(valuationDetailsString)
      .digest();

    let lastError = null;

    // Implement retry logic with exponential backoff
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const submitValuationHashData = iface.encodeFunctionData(
          "submitValuationHash",
          [req.body.prj_id.toString(), valuationHashBuffer]
        );

        // Create transaction with explicit node account ID and transaction ID
        // This helps with the INVALID_TRANSACTION_START error
        const transactionId = TransactionId.generate(client.operatorAccountId);

        const submitTx = await new ContractExecuteTransaction()
          .setContractId(contractId)
          .setGas(500000)
          .setTransactionId(transactionId)
          // Set a longer validity duration (2 minutes)
          .setTransactionValidDuration(120)
          // Set max transaction fee to avoid INSUFFICIENT_TX_FEE errors
          .setMaxTransactionFee(new Hbar(2))
          .setFunctionParameters(
            Buffer.from(submitValuationHashData.slice(2), "hex")
          )
          .execute(client);

        const TransactionID = submitTx.transactionId.toString();
        const TransactionHash = submitTx.transactionHash.toString("hex");
        const submitReceipt = await submitTx.getReceipt(client);

        if (submitReceipt.status.toString() === "SUCCESS") {
          console.log(`Successfully submitted for project: ${req.body.prj_id}`);

          return res.status(200).json({
            transaction_id: TransactionID,
            transaction_hash: TransactionHash,
            valuation_hash: valuationHashBuffer.toString("hex"),
          });
        } else {
          console.warn(`Transaction failed for project: ${req.body.prj_id}`);
          throw new Error(
            `Transaction failed with status: ${submitReceipt.status.toString()}`
          );
        }
      } catch (transactionError) {
        lastError = transactionError;
        console.error(
          `Attempt ${attempt + 1}/${MAX_RETRIES} failed for project (${
            req.body.prj_id
          }):`,
          transactionError.message
        );

        // If this is not the last attempt, wait before retrying
        if (attempt < MAX_RETRIES - 1) {
          // Exponential backoff with jitter
          const delay =
            BASE_DELAY * Math.pow(2, attempt) * (0.5 + Math.random() * 0.5);
          console.log(`Retrying in ${Math.round(delay / 1000)} seconds...`);
          await sleep(delay);
        }
      }
    }

    // If we've exhausted all retries
    return res.status(500).json({
      status: "error",
      message: `Failed after ${MAX_RETRIES} attempts: ${lastError.message}`,
    });
  } catch (error) {
    console.error("Error processing project:", error.message);
    return res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
}

module.exports = { ValuationTransaction };
