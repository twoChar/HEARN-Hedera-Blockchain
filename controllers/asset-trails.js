const { ContractCallQuery } = require("@hashgraph/sdk");
const hederaClient = require("../configs/client");
const { Interface } = require("ethers");
const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: "../.env" });

async function getAssetTransactions(req, res) {
  try {
    const requiredEnvVars = ["DEPLOYED_ASSET_CONTRACT_ID"];
    requiredEnvVars.forEach((key) => {
      if (!process.env[key]) {
        throw new Error(`Missing required environment variable: ${key}`);
      }
    });

    const contractId = process.env.DEPLOYED_ASSET_CONTRACT_ID;
    const abiPath = path.join(__dirname, "../contracts/AssetSolidity.json");
    const abiFile = JSON.parse(fs.readFileSync(abiPath, "utf8"));
    const abi = abiFile.abi;
    const client = hederaClient();
    const iface = new Interface(abi);

    const { asset_id } = req.body;
    if (
      !asset_id ||
      (typeof asset_id !== "string" && typeof asset_id !== "number")
    ) {
      return res.status(400).json({
        status: "error",
        message:
          "Invalid asset_id in request body. It must be a string or number.",
      });
    }

    const encodedFunctionCall = iface.encodeFunctionData("getAssets", []);

    const contractQuery = new ContractCallQuery()
      .setContractId(contractId)
      .setGas(3000000)
      .setFunctionParameters(Buffer.from(encodedFunctionCall.slice(2), "hex"));

    const contractCallResult = await contractQuery.execute(client);

    const decodedData = iface.decodeFunctionResult(
      "getAssets",
      contractCallResult.bytes
    );

    const assets = decodedData[0];
    const filteredAssets = assets.filter(
      (asset) => asset.asset_id === asset_id.toString()
    );

    if (filteredAssets.length === 0) {
      return res.status(404).json({
        status: "error",
        message: `No transactions found for asset ID: ${asset_id}`,
      });
    }

    const transactions = filteredAssets.map((asset, index) => {
      const assetHashHex = Buffer.from(asset.asset_hash).toString("utf8");

      let submissionTimeFormatted;
      try {
        submissionTimeFormatted = new Date(
          Number(asset.submission_time) * 1000
        ).toISOString();
      } catch (err) {
        console.error("Invalid submission_time value:", asset.submission_time);
        submissionTimeFormatted = "Invalid Timestamp";
      }

      return {
        transaction_index: index + 1,
        asset_hash: assetHashHex.slice(2),
        submission_time: submissionTimeFormatted,
      };
    });

    return res.status(200).json({
      success: true,
      asset_id: asset_id,
      transactions: transactions,
    });
  } catch (error) {
    console.error("Error retrieving asset transactions:", error.message);
    return res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
}

module.exports = { getAssetTransactions };
