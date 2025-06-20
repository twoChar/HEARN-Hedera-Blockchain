const { Client, AccountId, PrivateKey } = require("@hashgraph/sdk");
require("dotenv").config({ path: "../.env" });

const hederaClient = (
  accountId = process.env.ACCOUNT_ID_1,
  privateKey = process.env.PRIVATE_KEY_1
) => {
  if (!accountId || !privateKey) {
    throw new Error(
      "Missing accountId or privateKey. Please provide them as arguments or set them in the environment variables."
    );
  }

  try {
    const client = Client.forTestnet();
    client.setOperator(
      AccountId.fromString(accountId),
      PrivateKey.fromStringECDSA(privateKey)
    );

    // console.log("Hedera client initialized for account:", accountId);
    return client;
  } catch (error) {
    console.error("Failed to initialize Hedera client:", error.message);
    throw error;
  }
};

module.exports = hederaClient;
