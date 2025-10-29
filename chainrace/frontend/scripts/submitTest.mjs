import { JsonRpcProvider, Wallet, Contract } from "ethers";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

async function getRelayerMetadata(rpcUrl) {
  const rpc = new JsonRpcProvider(rpcUrl);
  const meta = await rpc.send("fhevm_relayer_metadata", []);
  await rpc.destroy();
  if (!meta?.KMSVerifierAddress) {
    meta.KMSVerifierAddress = "0x1364cBBf2cDF5032C47d8226a6f6FBD2AFCDacAC";
  }
  return meta;
}

async function main() {
  const rpcUrl = "http://localhost:8545";
  const provider = new JsonRpcProvider(rpcUrl);
  const chainId = Number((await provider.getNetwork()).chainId);
  console.log("chainId=", chainId);

  const meta = await getRelayerMetadata(rpcUrl);
  console.log("meta=", meta);

  const { MockFhevmInstance } = await import("@fhevm/mock-utils");
  const instance = await MockFhevmInstance.create(provider, provider, {
    aclContractAddress: meta.ACLAddress,
    chainId,
    gatewayChainId: 55815,
    inputVerifierContractAddress: meta.InputVerifierAddress,
    kmsContractAddress: meta.KMSVerifierAddress,
    verifyingContractAddressDecryption: "0x5ffdaAB0373E62E2ea2944776209aEf29E631A64",
    verifyingContractAddressInputVerification: "0x812b06e1CDCE800494b79fFE4f925A504a9A9810",
  });

  const priv = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"; // hardhat account[0]
  const signer = new Wallet(priv, provider);

  const abiJson = JSON.parse(readFileSync(resolve(process.cwd(), "abi", "ChainRaceABI.ts"), "utf-8").replace(/^export const ChainRaceABI = /, "").replace(/ as const;\n?$/, ""));
  const addrJson = JSON.parse(readFileSync(resolve(process.cwd(), "abi", "ChainRaceAddresses.ts"), "utf-8").replace(/^export const ChainRaceAddresses = /, "").replace(/ as const;\n?$/, ""));
  const contractAddress = addrJson[String(chainId)].address;

  const input = instance.createEncryptedInput(contractAddress, signer.address);
  input.add32(1234);
  const enc = await input.encrypt();

  const contract = new Contract(contractAddress, abiJson.abi, signer);
  const tx = await contract.submitRaceTime(enc.handles[0], enc.inputProof, 1234, { gasLimit: 3_000_000 });
  console.log("tx=", tx.hash);
  const receipt = await tx.wait();
  console.log("receipt.status=", receipt.status);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});


