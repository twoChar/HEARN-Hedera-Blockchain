const { ContractExecuteTransaction } = require("@hashgraph/sdk");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { Interface } = require("ethers");
require("dotenv").config({ path: "../.env" });

async function AssetTransaction(req, res) {
  try {
    const requiredEnvVars = ["DEPLOYED_ASSET_CONTRACT_ID", "HASH_SECRET_KEY"];
    requiredEnvVars.forEach((key) => {
      if (!process.env[key]) {
        throw new Error(`Missing required environment variable: ${key}`);
      }
    });

    const contractId = process.env.DEPLOYED_ASSET_CONTRACT_ID;
    const secretKey = process.env.HASH_SECRET_KEY;

    const abiPath = path.join(__dirname, "../contracts/AssetSolidity.json");
    const abiFile = JSON.parse(fs.readFileSync(abiPath, "utf8"));
    const abi = abiFile.abi;

    const client = require("../configs/client")();
    const iface = new Interface(abi);

    const assetDataForHash = {
      asset_id: req.body.asset_id,
      asset_category: req.body.asset_category,
      asset_name: req.body.asset_name,
      description: req.body.description,
      asset_group: req.body.asset_group,
      quantity: req.body.quantity,
      unit_price: req.body.unit_price,
      uom: req.body.uom,
      install_date: req.body.install_date,
      total_price: req.body.total_price,
    };

    const assetDetailsString = JSON.stringify(assetDataForHash);

    const assetHashBuffer = crypto
      .createHmac("sha256", secretKey)
      .update(assetDetailsString)
      .digest();

    try {
      const submitAssetHashData = iface.encodeFunctionData("submitAssetHash", [
        req.body.asset_id.toString(),
        assetHashBuffer,
      ]);
      const submitTx = await new ContractExecuteTransaction()
        .setContractId(contractId)
        .setGas(500000)
        .setFunctionParameters(Buffer.from(submitAssetHashData.slice(2), "hex"))
        .execute(client);

      const TransactionID = submitTx.transactionId.toString();
      const TransactionHash = submitTx.transactionHash.toString("hex");
      const submitReceipt = await submitTx.getReceipt(client);

      if (submitReceipt.status.toString() === "SUCCESS") {
        console.log(`Successfully submitted for asset: ${req.body.asset_id}`);

        return res.status(200).json({
          transaction_id: TransactionID,
          transaction_hash: TransactionHash,
          asset_hash: assetHashBuffer.toString("hex"),
        });
      } else {
        console.warn(`Transaction failed for asset: ${req.body.asset_id}`);
        return res.status(500).json({
          status: "error",
          message: `Transaction failed for asset: ${req.body.asset_id}`,
        });
      }
    } catch (transactionError) {
      console.error(
        `Error processing transaction for asset (${req.body.asset_id}):`,
        transactionError.message
      );
      return res.status(500).json({
        status: "error",
        message: `Error processing transaction: ${transactionError.message}`,
      });
    }
  } catch (error) {
    console.error("Error processing asset:", error.message);
    return res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
}

module.exports = { AssetTransaction };
