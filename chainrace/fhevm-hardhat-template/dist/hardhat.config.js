"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("@fhevm/hardhat-plugin");
require("@nomicfoundation/hardhat-chai-matchers");
require("@nomicfoundation/hardhat-ethers");
require("@nomicfoundation/hardhat-verify");
require("@typechain/hardhat");
require("hardhat-deploy");
require("hardhat-gas-reporter");
const config_1 = require("hardhat/config");
require("solidity-coverage");
const MNEMONIC = config_1.vars.get("MNEMONIC", "test test test test test test test test test test test junk");
const INFURA_API_KEY = config_1.vars.get("INFURA_API_KEY", "zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz");
const config = {
    defaultNetwork: "hardhat",
    namedAccounts: { deployer: 0 },
    etherscan: {
        apiKey: { sepolia: config_1.vars.get("ETHERSCAN_API_KEY", "") },
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
            accounts: { mnemonic: MNEMONIC, path: "m/44'/60'/0'/0/", count: 10 },
            chainId: 11155111,
            url: `https://sepolia.infura.io/v3/${INFURA_API_KEY}`,
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
exports.default = config;
