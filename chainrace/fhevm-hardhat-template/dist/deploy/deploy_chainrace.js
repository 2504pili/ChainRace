"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const func = async function (hre) {
    const { deployer } = await hre.getNamedAccounts();
    const { deploy, log } = hre.deployments;
    const deployed = await deploy("ChainRace", {
        from: deployer,
        log: true,
    });
    log(`ChainRace contract deployed at ${deployed.address}`);
};
exports.default = func;
func.id = "deploy_chainrace";
func.tags = ["ChainRace"];
