import type { DeployFunction } from "hardhat-deploy/types";
import type { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy, log } = hre.deployments as unknown as {
    deploy: (name: string, options: any) => Promise<{ address: string }>;
    log: (msg: string) => void;
  };

  const deployed = await deploy("ChainRace", {
    from: deployer,
    log: true,
  });

  log(`ChainRace contract deployed at ${deployed.address}`);
};

export default func;
func.id = "deploy_chainrace";
func.tags = ["ChainRace"];



