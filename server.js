const express = require("express");
const app = express();
const projectRoutes = require("./routes/project-router");
const soulboundRoutes = require("./routes/soulbound-router");
const assetRoutes = require("./routes/asset-router");
const valuationRoutes = require("./routes/valuation-router");
const { deploy } = require("./helpers/deploy-contract");

app.use(express.json());

(async () => {
  try {
    const DEPLOYED_ASSET_CONTRACT_ID = process.env.DEPLOYED_ASSET_CONTRACT_ID;
    const DEPLOYED_PROJECT_CONTRACT_ID =
      process.env.DEPLOYED_PROJECT_CONTRACT_ID;
    const DEPLOYED_SOULBOUND_CONTRACT_ID =
      process.env.DEPLOYED_SOULBOUND_CONTRACT_ID;
    const DEPLOYED_VALUATION_CONTRACT_ID =
      process.env.DEPLOYED_VALUATION_CONTRACT_ID;
    if (
      !DEPLOYED_ASSET_CONTRACT_ID ||
      !DEPLOYED_PROJECT_CONTRACT_ID ||
      !DEPLOYED_SOULBOUND_CONTRACT_ID ||
      !DEPLOYED_VALUATION_CONTRACT_ID
    ) {
      console.log("Deploying contracts as they are missing...");
      await deploy();
    } else {
      console.log("All contracts are already deployed.");
    }

    require("dotenv").config();

    if (!process.env.DEPLOYED_ASSET_CONTRACT_ID) {
      throw new Error(
        "DEPLOYED_ASSET_CONTRACT_ID is missing in the environment variables"
      );
    }

    if (!process.env.DEPLOYED_PROJECT_CONTRACT_ID) {
      throw new Error(
        "DEPLOYED_PROJECT_CONTRACT_ID is missing in the environment variables"
      );
    }

    if (!process.env.DEPLOYED_SOULBOUND_CONTRACT_ID) {
      throw new Error(
        "DEPLOYED_SOULBOUND_CONTRACT_ID is missing in the environment variables"
      );
    }
    if (!process.env.DEPLOYED_VALUATION_CONTRACT_ID) {
      throw new Error(
        "DEPLOYED_VALUATION_CONTRACT_ID is missing in the environment variables"
      );
    }

    app.use(
      `/api/projects/${process.env.DEPLOYED_PROJECT_CONTRACT_ID}`,
      projectRoutes
    );
    app.use(
      `/api/soulbounds/${process.env.DEPLOYED_SOULBOUND_CONTRACT_ID}`,
      soulboundRoutes
    );

    app.use(
      `/api/assets/${process.env.DEPLOYED_ASSET_CONTRACT_ID}`,
      assetRoutes
    );

    app.use(
      `/api/valuation/${process.env.DEPLOYED_VALUATION_CONTRACT_ID}`,
      valuationRoutes
    );

    const PORT = 3004;
    app.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Error during contract deployment:", error);
    process.exit(1);
  }
})();
