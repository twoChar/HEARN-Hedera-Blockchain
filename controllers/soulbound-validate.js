const { ContractCallQuery, Hbar } = require("@hashgraph/sdk");
const crypto = require("crypto");
const { Interface } = require("ethers");
const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: "../.env" });
const hederaClient = require("../configs/client");

async function validateSoulboundHash(req, res) {
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
    const abiPath = path.join(__dirname, "../contracts/ProjectSolidity.json");
    const abiFile = JSON.parse(fs.readFileSync(abiPath, "utf8"));
    const abi = abiFile.abi;
    const secretKey = process.env.HASH_SECRET_KEY;
    const client = hederaClient();
    const iface = new Interface(abi);

    const {
      prj_id,
      prj_sba_address,
      prj_sba_landmark,
      prj_sba_lat,
      prj_sba_long,
      prj_sba_description,
      transaction_id,
      transaction_hash,
      soulbound_hash,
    } = req.body;

    if (!soulbound_hash) {
      return res.status(400).json({
        status: "error",
        message: "Missing required field: soulbound_hash",
      });
    }

    // Step 1: Retrieve the latest soulbound hash from the smart contract
    const encodedFunctionCall = iface.encodeFunctionData("getProjects", []);
    const contractQuery = new ContractCallQuery()
      .setContractId(contractId)
      .setGas(3000000)
      .setFunctionParameters(Buffer.from(encodedFunctionCall.slice(2), "hex"));

    // **Fix: Get query cost dynamically and set max payment**
    const queryCost = await contractQuery.getCost(client);
    const contractCallResult = await contractQuery
      .setMaxQueryPayment(queryCost) // Set max payment to actual cost
      .execute(client);

    const decodedData = iface.decodeFunctionResult(
      "getProjects",
      contractCallResult.bytes
    );

    // Ensure data exists and is an array
    if (!decodedData || !Array.isArray(decodedData[0])) {
      return res.status(404).json({
        status: "error",
        message: "No soulbound projects found in the contract",
      });
    }

    // Retrieve the latest soulbound project from the contract
    const latestProject = decodedData[0][decodedData[0].length - 1];
    if (!latestProject) {
      return res.status(404).json({
        status: "error",
        message: "No latest soulbound project found in the contract",
      });
    }

    const contractHash = latestProject.prj_hash;

    const normalizedContractHash = contractHash.startsWith("0x")
      ? contractHash.slice(2)
      : contractHash;

    // Step 2: Recreate hash from request body
    const soulboundDataForHash = {
      prj_id,
      prj_sba_address,
      prj_sba_landmark,
      prj_sba_lat,
      prj_sba_long,
      prj_sba_description,
    };

    const soulboundDetailsString = JSON.stringify(soulboundDataForHash);
    const calculatedHash = crypto
      .createHmac("sha256", secretKey)
      .update(soulboundDetailsString)
      .digest("hex");

    // Step 3: Compare all three hashes and determine the result
    if (
      soulbound_hash !== normalizedContractHash &&
      soulbound_hash !== calculatedHash
    ) {
      return res.status(200).json({
        status: "failed",
        message: "Soulbound hash is tampered.",
        hashes: {
          provided_hash: soulbound_hash,
          contract_hash: normalizedContractHash,
          calculated_hash: calculatedHash,
        },
      });
    } else if (
      calculatedHash !== soulbound_hash ||
      calculatedHash !== normalizedContractHash
    ) {
      return res.status(200).json({
        status: "failed",
        message: "Soulbound data is tampered.",
        hashes: {
          provided_hash: soulbound_hash,
          contract_hash: normalizedContractHash,
          calculated_hash: calculatedHash,
        },
      });
    } else {
      return res.status(200).json({
        status: "success",
        message: "Soulbound hash successfully validated.",
      });
    }
  } catch (error) {
    console.error("Error validating soulbound hash:", error.message);
    return res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
}

module.exports = { validateSoulboundHash };
