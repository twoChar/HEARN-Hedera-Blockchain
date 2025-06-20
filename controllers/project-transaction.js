const { ContractExecuteTransaction } = require("@hashgraph/sdk");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { Interface } = require("ethers");
require("dotenv").config({ path: "../.env" });

async function ProjectTransaction(req, res) {
  try {
    const requiredEnvVars = ["DEPLOYED_PROJECT_CONTRACT_ID", "HASH_SECRET_KEY"];
    requiredEnvVars.forEach((key) => {
      if (!process.env[key]) {
        throw new Error(`Missing required environment variable: ${key}`);
      }
    });

    const contractId = process.env.DEPLOYED_PROJECT_CONTRACT_ID;
    const secretKey = process.env.HASH_SECRET_KEY;

    const abiPath = path.join(__dirname, "../contracts/ProjectSolidity.json");
    const abiFile = JSON.parse(fs.readFileSync(abiPath, "utf8"));
    const abi = abiFile.abi;

    const client = require("../configs/client")();
    const iface = new Interface(abi);

    const projectDataForHash = {
      prj_id: req.body.prj_id,
      prj_name: req.body.prj_name,
      prj_company: req.body.prj_company,
      prj_description: req.body.prj_description,
      prj_nft_id: req.body.prj_nft_id,
      prj_start_date: req.body.prj_start_date,
      prj_end_date: req.body.prj_end_date,
    };

    const projectDetailsString = JSON.stringify(projectDataForHash);

    const projectHashBuffer = crypto
      .createHmac("sha256", secretKey)
      .update(projectDetailsString)
      .digest();

    try {
      const submitProjectHashData = iface.encodeFunctionData(
        "submitProjectHash",
        [req.body.prj_id.toString(), projectHashBuffer]
      );

      const submitTx = await new ContractExecuteTransaction()
        .setContractId(contractId)
        .setGas(500000)
        .setFunctionParameters(
          Buffer.from(submitProjectHashData.slice(2), "hex")
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
          project_hash: projectHashBuffer.toString("hex"),
        });
      } else {
        console.warn(`Transaction failed for project: ${req.body.prj_id}`);
        return res.status(500).json({
          status: "error",
          message: `Transaction failed for project: ${req.body.prj_id}`,
        });
      }
    } catch (transactionError) {
      console.error(
        `Error processing transaction for project (${req.body.prj_id}):`,
        transactionError.message
      );
      return res.status(500).json({
        status: "error",
        message: `Error processing transaction: ${transactionError.message}`,
      });
    }
  } catch (error) {
    console.error("Error processing project:", error.message);
    return res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
}

module.exports = { ProjectTransaction };
