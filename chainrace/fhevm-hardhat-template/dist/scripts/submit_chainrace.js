"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const hardhat_1 = require("hardhat");
async function main() {
    const [signer] = await hardhat_1.ethers.getSigners();
    const dep = await hardhat_1.deployments.get("ChainRace");
    const hreAny = require("hardhat");
    const input = await hreAny.fhevm.createEncryptedInput(dep.address, signer.address);
    input.add32(1234);
    const enc = await input.encrypt();
    const contract = await hardhat_1.ethers.getContractAt("ChainRace", dep.address, signer);
    const tx = await contract.submitRaceTime(enc.handles[0], enc.inputProof, 1234);
    console.log("tx=", tx.hash);
    const rcpt = await tx.wait();
    console.log("status=", rcpt?.status);
}
main().catch((e) => {
    console.error(e);
    process.exit(1);
});
