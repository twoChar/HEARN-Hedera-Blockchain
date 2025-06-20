const {
  ContractExecuteTransaction,
  TransactionId,
  Hbar,
} = require("@hashgraph/sdk");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { Interface } = require("ethers");
const hederaClient = require("../configs/client");
require("dotenv").config({ path: "../.env" });

const MAX_RETRIES = 3;
const BASE_DELAY = 1000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function SoulboundTransaction(req, res) {
  try {
    const requiredEnvVars = [
      "DEPLOYED_SOULBOUND_CONTRACT_ID",
      "HASH_SECRET_KEY",
    ];
    requiredEnvVars.forEach((key) => {
      if (!process.env[key]) {
        throw new Error(`Missing required environment variable: ${key}`);
      }
    });

    const contractId = process.env.DEPLOYED_SOULBOUND_CONTRACT_ID;
    const secretKey = process.env.HASH_SECRET_KEY;
    const abiPath = path.join(__dirname, "../contracts/Soulbound.json");
    const abiFile = JSON.parse(fs.readFileSync(abiPath, "utf8"));
    const abi = abiFile.abi;

    const client = hederaClient();
    const iface = new Interface(abi);

    const soulboundDataForHash = {
      prj_id: req.body.prj_id,
      prj_sba_address: req.body.prj_sba_address,
      prj_sba_landmark: req.body.prj_sba_landmark,
      prj_sba_lat: req.body.prj_sba_lat,
      prj_sba_long: req.body.prj_sba_long,
      prj_sba_description: req.body.prj_sba_description,
    };

    const soulboundDetailsString = JSON.stringify(soulboundDataForHash);
    const soulboundHashBuffer = crypto
      .createHmac("sha256", secretKey)
      .update(soulboundDetailsString)
      .digest();

    let lastError = null;
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const submitSoulboundHashData = iface.encodeFunctionData(
          "submitSoulboundHash",
          [req.body.prj_id.toString(), soulboundHashBuffer]
        );

        const transactionId = TransactionId.generate(client.operatorAccountId);
        const submitTx = await new ContractExecuteTransaction()
          .setContractId(contractId)
          .setGas(500000)
          .setTransactionId(transactionId)
          .setTransactionValidDuration(120)
          .setMaxTransactionFee(new Hbar(2))
          .setFunctionParameters(
            Buffer.from(submitSoulboundHashData.slice(2), "hex")
          )
          .execute(client);

        const TransactionID = submitTx.transactionId.toString();
        const TransactionHash = submitTx.transactionHash.toString("hex");
        const submitReceipt = await submitTx.getReceipt(client);

        if (submitReceipt.status.toString() === "SUCCESS") {
          console.log(
            `Successfully submitted for soulbound project: ${req.body.prj_id}`
          );

          return res.status(200).json({
            transaction_id: TransactionID,
            transaction_hash: TransactionHash,
            soulbound_hash: soulboundHashBuffer.toString("hex"),
          });
        } else {
          console.warn(
            `Transaction failed for soulbound project: ${req.body.prj_id}`
          );
          throw new Error(
            `Transaction failed with status: ${submitReceipt.status.toString()}`
          );
        }
      } catch (transactionError) {
        lastError = transactionError;
        console.error(
          `Attempt ${
            attempt + 1
          }/${MAX_RETRIES} failed for soulbound project (${req.body.prj_id}):`,
          transactionError.message
        );

        if (attempt < MAX_RETRIES - 1) {
          const delay =
            BASE_DELAY * Math.pow(2, attempt) * (0.5 + Math.random() * 0.5);
          console.log(`Retrying in ${Math.round(delay / 1000)} seconds...`);
          await sleep(delay);
        }
      }
    }

    return res.status(500).json({
      status: "error",
      message: `Failed after ${MAX_RETRIES} attempts: ${lastError.message}`,
    });
  } catch (error) {
    console.error("Error processing soulbound project:", error.message);
    return res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
}

module.exports = { SoulboundTransaction };

// DEPLOYED_SOULBOUND_CONTRACT_ID=0.0.5441519
