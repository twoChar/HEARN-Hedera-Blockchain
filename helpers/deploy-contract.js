require("dotenv").config();
const { ContractCreateFlow, AccountBalanceQuery } = require("@hashgraph/sdk");
const fs = require("fs");
const path = require("path");
const hederaClient = require("../configs/client");

const COMPILED_FILES = {
  asset: path.join(__dirname, "../contracts/AssetSolidity.json"),
  project: path.join(__dirname, "../contracts/ProjectSolidity.json"),
  soulbound: path.join(__dirname, "../contracts/Soulbound.json"),
  valuation: path.join(__dirname, "../contracts/Valuation.json"),
  // neft: path.join(__dirname, "../contracts/NEFT.json"),
};

const ENV_PATH = path.join(__dirname, "../.env");

function updateEnv(key, value) {
  try {
    const envVars = fs.existsSync(ENV_PATH)
      ? fs.readFileSync(ENV_PATH, "utf8")
      : "";
    const envLines = envVars.split("\n");

    const existingIndex = envLines.findIndex((line) =>
      line.startsWith(`${key}=`)
    );
    if (existingIndex !== -1) {
      envLines[existingIndex] = `${key}=${value}`;
    } else {
      envLines.push(`${key}=${value}`);
    }

    fs.writeFileSync(ENV_PATH, envLines.join("\n"));
    console.log(`Updated .env with ${key}`);
  } catch (error) {
    console.error(`Failed to update .env file: ${error.message}`);
  }
}

async function getBytecodeFromFile(filePath) {
  try {
    const compiledData = fs.readFileSync(filePath, "utf8");
    const json = JSON.parse(compiledData);
    if (!json || !json.bytecode || !json.bytecode.object) {
      throw new Error("Invalid compiled file format: Missing bytecode.");
    }
    return json.bytecode.object;
  } catch (error) {
    throw new Error(
      `Error loading bytecode from ${filePath}: ${error.message}`
    );
  }
}

async function deployContract(type) {
  const client = hederaClient();
  const filePath = COMPILED_FILES[type];
  const deployedKey = `DEPLOYED_${type.toUpperCase()}_CONTRACT_ID`;

  if (!filePath || !fs.existsSync(filePath)) {
    throw new Error(`Compiled file not found for ${type}: ${filePath}`);
  }

  if (process.env[deployedKey]) {
    console.log(
      `Contract for ${type} already deployed with ID: ${process.env[deployedKey]}`
    );
    return;
  }

  console.log(
    `Deploying ${type} contract to Hedera using ContractCreateFlow...`
  );

  try {
    const balance = await new AccountBalanceQuery()
      .setAccountId(client.operatorAccountId)
      .execute(client);
    console.log(`Account HBAR Balance: ${balance.hbars}`);

    if (balance.hbars.toTinybars() < 100000000) {
      throw new Error("Insufficient HBAR balance to deploy the contract.");
    }

    const bytecode = await getBytecodeFromFile(filePath);

    console.log("Bytecode Size:", bytecode.length);
    console.log("Bytecode Preview:", bytecode.substring(0, 50));

    const contractFlow = await new ContractCreateFlow()
      .setGas(300000)
      .setBytecode(bytecode)
      .execute(client);

    const contractReceipt = await contractFlow.getReceipt(client);
    const contractId = contractReceipt.contractId;

    console.log(
      `${
        type.charAt(0).toUpperCase() + type.slice(1)
      } contract deployed with ID: ${contractId}`
    );

    updateEnv(deployedKey, contractId.toString());
    process.env[deployedKey] = contractId.toString();
  } catch (error) {
    console.error(`Error deploying ${type} contract:`, error.message);
    console.error(error);
  }
}

async function deploy() {
  try {
    console.log("Starting contract deployment...");
    const types = ["asset", "project", "soulbound", "valuation"];

    for (const type of types) {
      const deployedKey = `DEPLOYED_${type.toUpperCase()}_CONTRACT_ID`;
      if (!process.env[deployedKey]) {
        await deployContract(type);
      }
    }
    console.log("Contract deployment complete.");
  } catch (error) {
    console.error("Error running deployment script:", error.message);
    console.error(error);
  }
}

if (require.main === module) {
  (async () => {
    try {
      await deploy();
    } catch (error) {
      console.error("Fatal error in deployment:", error);
      process.exit(1);
    }
  })();
}

module.exports = { deploy };
