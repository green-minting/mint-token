import * as dotenv from "dotenv";
dotenv.config();
import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.28",
    settings: { optimizer: { enabled: true } },
  },
  networks: {
    sepolia: {
      url: `${process.env.SEPOLIA_RPC_URL}`,
      accounts: [`${process.env.DEPLOYER_PRIVATE_KEY}`],
    },
    ethereum_mainnet: {
      url: `${process.env.MAINNET_RPC_URL}`,
      accounts: [`${process.env.DEPLOYER_PRIVATE_KEY}`],
    },
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY || "",
  },
  sourcify: {
    enabled: true,
  },
};

export default config;
