const { ContractCallQuery, Hbar } = require("@hashgraph/sdk");
const crypto = require("crypto");
const { Interface } = require("ethers");
const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: "../.env" });
const hederaClient = require("../configs/client");

async function validateProjectHash(req, res) {
  try {
    const requiredEnvVars = ["DEPLOYED_PROJECT_CONTRACT_ID", "HASH_SECRET_KEY"];
    requiredEnvVars.forEach((key) => {
      if (!process.env[key]) {
        throw new Error(`Missing required environment variable: ${key}`);
      }
    });

    const contractId = process.env.DEPLOYED_PROJECT_CONTRACT_ID;
    const abiPath = path.join(__dirname, "../contracts/ProjectSolidity.json");
    const abiFile = JSON.parse(fs.readFileSync(abiPath, "utf8"));
    const abi = abiFile.abi;
    const secretKey = process.env.HASH_SECRET_KEY;
    const client = hederaClient();
    const iface = new Interface(abi);

    const {
      prj_id,
      prj_name,
      prj_company,
      prj_description,
      prj_nft_id,
      prj_start_date,
      prj_end_date,
      transaction_id,
      transaction_hash,
      project_hash,
    } = req.body;

    if (!project_hash) {
      return res.status(400).json({
        status: "error",
        message: "Missing required field: project_hash",
      });
    }

    // Step 1: Retrieve the latest project hash from the smart contract
    const encodedFunctionCall = iface.encodeFunctionData("getProjects", []);
    const contractQuery = new ContractCallQuery()
      .setContractId(contractId)
      .setGas(6000000)
      .setFunctionParameters(Buffer.from(encodedFunctionCall.slice(2), "hex"));

    // Estimate query cost and set query payment
    const queryCost = await contractQuery.getCost(client);
    console.log(`Estimated Query Cost: ${queryCost.toString()} HBAR`);
    contractQuery.setQueryPayment(queryCost); // Dynamically set required cost

    const contractCallResult = await contractQuery.execute(client);
    const decodedData = iface.decodeFunctionResult(
      "getProjects",
      contractCallResult.bytes
    );

    if (!decodedData || !Array.isArray(decodedData[0])) {
      return res.status(404).json({
        status: "error",
        message: "No projects found in the contract",
      });
    }

    // Retrieve the latest project from the contract
    const latestProject = decodedData[0][decodedData[0].length - 1];
    if (!latestProject) {
      return res.status(404).json({
        status: "error",
        message: "No latest project found in the contract",
      });
    }

    const contractHash = latestProject.prj_hash;
    const normalizedContractHash = contractHash.startsWith("0x")
      ? contractHash.slice(2)
      : contractHash;

    // Step 2: Recreate hash from request body
    const projectDataForHash = {
      prj_id,
      prj_name,
      prj_company,
      prj_description,
      prj_nft_id,
      prj_start_date,
      prj_end_date,
    };

    const projectDetailsString = JSON.stringify(projectDataForHash);
    const calculatedHash = crypto
      .createHmac("sha256", secretKey)
      .update(projectDetailsString)
      .digest("hex");

    // Step 3: Compare all three hashes and determine the result
    if (
      project_hash !== normalizedContractHash &&
      project_hash !== calculatedHash
    ) {
      return res.status(200).json({
        status: "failed",
        message: "Project hash is tampered.",
        hashes: {
          provided_hash: project_hash,
          contract_hash: normalizedContractHash,
          calculated_hash: calculatedHash,
        },
      });
    } else if (
      calculatedHash !== project_hash ||
      calculatedHash !== normalizedContractHash
    ) {
      return res.status(200).json({
        status: "failed",
        message: "Project data is tampered.",
        hashes: {
          provided_hash: project_hash,
          contract_hash: normalizedContractHash,
          calculated_hash: calculatedHash,
        },
      });
    } else {
      return res.status(200).json({
        status: "success",
        message: "Project hash successfully validated.",
      });
    }
  } catch (error) {
    console.error("Error validating project hash:", error.message);
    return res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
}

module.exports = { validateProjectHash };
