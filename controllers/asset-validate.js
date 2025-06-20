const { ContractCallQuery } = require("@hashgraph/sdk");
const crypto = require("crypto");
const { Interface } = require("ethers");
const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: "../.env" });
const hederaClient = require("../configs/client");

async function validateAssetHash(req, res) {
  try {
    const requiredEnvVars = ["DEPLOYED_ASSET_CONTRACT_ID", "HASH_SECRET_KEY"];
    requiredEnvVars.forEach((key) => {
      if (!process.env[key]) {
        throw new Error(`Missing required environment variable: ${key}`);
      }
    });

    const contractId = process.env.DEPLOYED_ASSET_CONTRACT_ID;
    const abiPath = path.join(__dirname, "../contracts/AssetSolidity.json");
    const abiFile = JSON.parse(fs.readFileSync(abiPath, "utf8"));
    const abi = abiFile.abi;
    const secretKey = process.env.HASH_SECRET_KEY;
    const client = hederaClient();
    const iface = new Interface(abi);

    const {
      asset_id,
      asset_category,
      asset_name,
      description,
      asset_group,
      quantity,
      unit_price,
      uom,
      install_date,
      total_price,
      transaction_id,
      transaction_hash,
      asset_hash,
    } = req.body;

    if (!asset_hash) {
      return res.status(400).json({
        status: "error",
        message: "Missing required field: asset_hash",
      });
    }

    // Step 1: Retrieve the latest asset hash from the smart contract
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

    if (!decodedData || !Array.isArray(decodedData[0])) {
      return res.status(404).json({
        status: "error",
        message: "No assets found in the contract",
      });
    }

    const latestAsset = decodedData[0][decodedData[0].length - 1];
    if (!latestAsset) {
      return res.status(404).json({
        status: "error",
        message: "No latest asset found in the contract",
      });
    }

    const contractHash = latestAsset.asset_hash;
    const normalizedContractHash = contractHash.startsWith("0x")
      ? contractHash.slice(2)
      : contractHash;

    // Step 2: Recreate hash from request body
    const assetDataForHash = {
      asset_id,
      asset_category,
      asset_name,
      description,
      asset_group,
      quantity,
      unit_price,
      uom,
      install_date,
      total_price,
    };

    const assetDetailsString = JSON.stringify(assetDataForHash);
    const calculatedHash = crypto
      .createHmac("sha256", secretKey)
      .update(assetDetailsString)
      .digest("hex");

    // Step 3: Compare all three hashes and determine the result
    if (
      asset_hash !== normalizedContractHash &&
      asset_hash !== calculatedHash
    ) {
      return res.status(200).json({
        status: "failed",
        message: "Asset hash is tampered.",
        hashes: {
          provided_hash: asset_hash,
          contract_hash: normalizedContractHash,
          calculated_hash: calculatedHash,
        },
      });
    } else if (
      calculatedHash !== asset_hash ||
      calculatedHash !== normalizedContractHash
    ) {
      return res.status(200).json({
        status: "failed",
        message: "Asset data is tampered.",
        hashes: {
          provided_hash: asset_hash,
          contract_hash: normalizedContractHash,
          calculated_hash: calculatedHash,
        },
      });
    } else {
      return res.status(200).json({
        status: "success",
        message: "Asset hash successfully validated.",
      });
    }
  } catch (error) {
    console.error("Error validating asset hash:", error.message);
    return res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
}

module.exports = { validateAssetHash };
