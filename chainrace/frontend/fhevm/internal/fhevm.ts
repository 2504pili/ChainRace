import { Eip1193Provider, isAddress, JsonRpcProvider } from "ethers";

type FhevmWindow = Window & {
  relayerSDK: any & { __initialized__?: boolean };
};

const SDK_CDN_URL = "https://cdn.zama.ai/relayer-sdk-js/0.2.0/relayer-sdk-js.umd.cjs";

function isFhevmWindowType(w: any): w is FhevmWindow {
  return typeof w !== "undefined" && w && "relayerSDK" in w;
}

function loadSDK(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (isFhevmWindowType(window)) return resolve();
    const script = document.createElement("script");
    script.src = SDK_CDN_URL;
    script.type = "text/javascript";
    script.async = true;
    script.onload = () => (isFhevmWindowType(window) ? resolve() : reject(new Error("relayerSDK not found")));
    script.onerror = () => reject(new Error("Failed to load Relayer SDK"));
    document.head.appendChild(script);
  });
}

async function initSDK() {
  const w = window as unknown as FhevmWindow;
  if (!w.relayerSDK.__initialized__) {
    const ok = await w.relayerSDK.initSDK();
    if (!ok) throw new Error("initSDK failed");
    w.relayerSDK.__initialized__ = true;
  }
}

async function getChainId(providerOrUrl: Eip1193Provider | string): Promise<number> {
  if (typeof providerOrUrl === "string") {
    const p = new JsonRpcProvider(providerOrUrl);
    return Number((await p.getNetwork()).chainId);
  }
  const hex = await providerOrUrl.request({ method: "eth_chainId" });
  return Number.parseInt(hex as string, 16);
}

async function getWeb3Client(rpcUrl: string) {
  const rpc = new JsonRpcProvider(rpcUrl);
  const v = await rpc.send("web3_clientVersion", []);
  await rpc.destroy();
  return v as string;
}

async function getRelayerMetadata(rpcUrl: string) {
  const rpc = new JsonRpcProvider(rpcUrl);
  const meta = (await rpc.send("fhevm_relayer_metadata", [])) as any;
  await rpc.destroy();
  // 兼容旧版本地插件元数据缺少 KMSVerifierAddress 的情况
  if (!meta?.KMSVerifierAddress) {
    meta.KMSVerifierAddress = "0x1364cBBf2cDF5032C47d8226a6f6FBD2AFCDacAC";
  }
  return meta as { ACLAddress: `0x${string}`; InputVerifierAddress: `0x${string}`; KMSVerifierAddress: `0x${string}` };
}

export const createFhevmInstance = async (parameters: {
  provider: Eip1193Provider | string;
  mockChains?: Record<number, string>;
}) => {
  const { provider: providerOrUrl, mockChains } = parameters;
  const chainId = await getChainId(providerOrUrl);
  const mocks: Record<number, string> = { 31337: "http://localhost:8545", ...(mockChains ?? {}) };
  const rpcUrl = typeof providerOrUrl === "string" ? providerOrUrl : mocks[chainId];

  if (rpcUrl) {
    const version = await getWeb3Client(rpcUrl);
    if (version.toLowerCase().includes("hardhat")) {
      try {
        const meta = await getRelayerMetadata(rpcUrl);
        const { fhevmMockCreateInstance } = await import("./mock/fhevmMock");
        return fhevmMockCreateInstance({ rpcUrl, chainId, metadata: meta });
      } catch {
        // fallthrough to SDK path
      }
    }
  }

  await loadSDK();
  await initSDK();
  const w = window as unknown as FhevmWindow;
  const relayerSDK = w.relayerSDK;
  const cfg = {
    ...relayerSDK.SepoliaConfig,
    network: providerOrUrl,
  };
  return relayerSDK.createInstance(cfg);
};


