import { ethers } from "ethers";
import hre from "hardhat";

async function main() {
  // Initialize FHEVM plugin
  await hre.fhevm.initializeCLIApi();
  
  const [signer] = await hre.ethers.getSigners();
  const dep = await hre.deployments.get("ChainRace");
  const input = await hre.fhevm.createEncryptedInput(dep.address, signer.address);
  input.add32(1234);
  const enc = await input.encrypt();
  const contract = await hre.ethers.getContractAt("ChainRace", dep.address, signer);
  
  try {
    const tx = await contract.submitRaceTime(enc.handles[0], enc.inputProof, 1234, {
      gasLimit: 3000000
    });
    console.log("tx=", tx.hash);
    const rcpt = await tx.wait();
    console.log("status=", rcpt?.status);
    console.log("gasUsed=", rcpt?.gasUsed?.toString());
  } catch (error) {
    console.error("Transaction failed:", error);
    if (error.data) {
      console.error("Error data:", error.data);
    }
    if (error.reason) {
      console.error("Error reason:", error.reason);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});


