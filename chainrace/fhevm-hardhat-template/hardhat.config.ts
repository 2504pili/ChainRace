import "@fhevm/hardhat-plugin";
import "@nomicfoundation/hardhat-chai-matchers";
import "@nomicfoundation/hardhat-ethers";
import "@nomicfoundation/hardhat-verify";
import "@typechain/hardhat";
import "hardhat-deploy";
import "hardhat-gas-reporter";
import type { HardhatUserConfig } from "hardhat/config";
import { vars } from "hardhat/config";
import "solidity-coverage";

const MNEMONIC: string = vars.get("MNEMONIC", "test test test test test test test test test test test junk");
const INFURA_API_KEY: string = vars.get("INFURA_API_KEY", "zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz");
const ENV_PRIVATE_KEY: string | undefined = process.env.PRIVATE_KEY;
const ENV_SEPOLIA_RPC_URL: string | undefined = process.env.SEPOLIA_RPC_URL;
const PRIVATE_KEY: string = (ENV_PRIVATE_KEY ?? vars.get("PRIVATE_KEY", "")).trim();
const SEPOLIA_RPC_URL: string = (ENV_SEPOLIA_RPC_URL ?? vars.get("SEPOLIA_RPC_URL", `https://sepolia.infura.io/v3/${INFURA_API_KEY}`)).trim();

const config: HardhatUserConfig = {
  defaultNetwork: "hardhat",
  namedAccounts: { deployer: 0 },
  etherscan: {
    apiKey: { sepolia: vars.get("ETHERSCAN_API_KEY", "") },
  },
  gasReporter: { currency: "USD", enabled: process.env.REPORT_GAS ? true : false, excludeContracts: [] },
  networks: {
    hardhat: {
      accounts: { mnemonic: MNEMONIC },
      chainId: 31337,
    },
    localhost: {
      accounts: { mnemonic: MNEMONIC },
      chainId: 31337,
      url: "http://localhost:8545",
    },
    sepolia: {
      accounts: PRIVATE_KEY
        ? [PRIVATE_KEY.startsWith("0x") ? PRIVATE_KEY : `0x${PRIVATE_KEY}`]
        : { mnemonic: MNEMONIC, path: "m/44'/60'/0'/0/", count: 10 },
      chainId: 11155111,
      url: SEPOLIA_RPC_URL,
    },
  },
  paths: {
    artifacts: "./artifacts",
    cache: "./cache",
    sources: "./contracts",
    tests: "./test",
    deployments: "./deployments",
  },
  solidity: {
    version: "0.8.27",
    settings: {
      optimizer: { enabled: true, runs: 800 },
      evmVersion: "cancun",
    },
  },
  typechain: { outDir: "types", target: "ethers-v6" },
};

export default config;



