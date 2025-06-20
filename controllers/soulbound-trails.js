const { ContractCallQuery, Hbar } = require("@hashgraph/sdk");
const hederaClient = require("../configs/client");
const fs = require("fs");
const path = require("path");
const { Interface } = require("ethers");
require("dotenv").config({ path: "../.env" });

async function getSoulboundTransactions(req, res) {
  try {
    const requiredEnvVars = ["DEPLOYED_SOULBOUND_CONTRACT_ID"];
    requiredEnvVars.forEach((key) => {
      if (!process.env[key]) {
        throw new Error(`Missing required environment variable: ${key}`);
      }
    });

    const contractId = process.env.DEPLOYED_SOULBOUND_CONTRACT_ID;

    const abiPath = path.join(__dirname, "../contracts/ProjectSolidity.json");
    const abiFile = JSON.parse(fs.readFileSync(abiPath, "utf8"));
    const abi = abiFile.abi;

    const client = hederaClient();
    const iface = new Interface(abi);

    const { prj_id } = req.body;
    if (!prj_id || (typeof prj_id !== "string" && typeof prj_id !== "number")) {
      return res.status(400).json({
        status: "error",
        message:
          "Invalid prj_id in request body. It must be a string or number.",
      });
    }

    const encodedFunctionCall = iface.encodeFunctionData("getProjects", []);

    const contractQuery = new ContractCallQuery()
      .setContractId(contractId)
      .setGas(3000000)
      .setFunctionParameters(Buffer.from(encodedFunctionCall.slice(2), "hex"))
      .setQueryPayment(new Hbar(2)); // Increase the max query payment to 2 HBAR

    const contractCallResult = await contractQuery.execute(client);

    const decodedData = iface.decodeFunctionResult(
      "getProjects",
      contractCallResult.bytes
    );

    const projects = decodedData[0];
    const filteredProjects = projects.filter(
      (project) => project.prj_id === prj_id.toString()
    );

    if (filteredProjects.length === 0) {
      return res.status(404).json({
        status: "error",
        message: `No Soul Bound transactions found for project ID: ${prj_id}`,
      });
    }

    const transactions = filteredProjects.map((project, index) => {
      const projectHashHex = Buffer.from(project.prj_hash).toString("utf8");

      let submissionTimeFormatted;
      try {
        submissionTimeFormatted = new Date(
          Number(project.submission_time) * 1000
        ).toISOString();
      } catch (err) {
        console.error(
          "Invalid submission_time value:",
          project.submission_time
        );
        submissionTimeFormatted = "Invalid Timestamp";
      }

      return {
        transaction_index: index + 1,
        project_hash: projectHashHex.slice(2),
        submission_time: submissionTimeFormatted,
      };
    });

    return res.status(200).json({
      success: true,
      prj_id: prj_id,
      transactions: transactions,
    });
  } catch (error) {
    console.error("Error retrieving project transactions:", error.message);
    return res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
}

module.exports = { getSoulboundTransactions };
