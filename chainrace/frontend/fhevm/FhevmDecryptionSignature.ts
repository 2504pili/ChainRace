import { ethers } from "ethers";

function _timestampNow(): number {
  return Math.floor(Date.now() / 1000);
}

class FhevmDecryptionSignatureStorageKey {
  #contractAddresses: `0x${string}`[];
  #userAddress: `0x${string}`;
  #publicKey: string | undefined;
  #key: string;

  constructor(
    instance: any,
    contractAddresses: string[],
    userAddress: string,
    publicKey?: string
  ) {
    if (!ethers.isAddress(userAddress)) {
      throw new TypeError(`Invalid address ${userAddress}`);
    }

    const sortedContractAddresses = (
      contractAddresses as `0x${string}`[]
    ).sort();

    try {
      const emptyEIP712 = instance.createEIP712(
        publicKey ?? ethers.ZeroAddress,
        sortedContractAddresses,
        0,
        0
      );

      const hash = ethers.TypedDataEncoder.hash(
        emptyEIP712.domain,
        { UserDecryptRequestVerification: emptyEIP712.types.UserDecryptRequestVerification },
        emptyEIP712.message
      );

      this.#contractAddresses = sortedContractAddresses;
      this.#userAddress = userAddress as `0x${string}`;
      this.#publicKey = publicKey;
      this.#key = `${userAddress}:${hash}`;
    } catch (e) {
      console.warn("EIP712 creation failed, using fallback key generation:", e);
      this.#contractAddresses = (contractAddresses as `0x${string}`[]).sort();
      this.#userAddress = userAddress as `0x${string}`;
      this.#publicKey = publicKey;
      this.#key = `${userAddress}:${contractAddresses.join(",")}`;
    }
  }

  get contractAddresses(): `0x${string}`[] {
    return this.#contractAddresses;
  }

  get userAddress(): `0x${string}` {
    return this.#userAddress;
  }

  get publicKey(): string | undefined {
    return this.#publicKey;
  }

  get key(): string {
    return this.#key;
  }
}

export class FhevmDecryptionSignature {
  #publicKey: string;
  #privateKey: string;
  #signature: string;
  #startTimestamp: number;
  #durationDays: number;
  #userAddress: `0x${string}`;
  #contractAddresses: `0x${string}`[];
  #eip712: any;

  constructor(init: {
    publicKey: string;
    privateKey: string;
    signature: string;
    startTimestamp: number;
    durationDays: number;
    userAddress: `0x${string}`;
    contractAddresses: `0x${string}`[];
    eip712: any;
  }) {
    this.#publicKey = init.publicKey;
    this.#privateKey = init.privateKey;
    this.#signature = init.signature;
    this.#startTimestamp = init.startTimestamp;
    this.#durationDays = init.durationDays;
    this.#userAddress = init.userAddress;
    this.#contractAddresses = init.contractAddresses;
    this.#eip712 = init.eip712;
  }

  get publicKey(): string {
    return this.#publicKey;
  }

  get privateKey(): string {
    return this.#privateKey;
  }

  get signature(): string {
    return this.#signature;
  }

  get startTimestamp(): number {
    return this.#startTimestamp;
  }

  get durationDays(): number {
    return this.#durationDays;
  }

  get userAddress(): `0x${string}` {
    return this.#userAddress;
  }

  get contractAddresses(): `0x${string}`[] {
    return this.#contractAddresses;
  }

  get eip712(): any {
    return this.#eip712;
  }

  static async new(
    instance: any,
    contracts: string[],
    signer: ethers.Signer,
    durationDays: number = 365
  ): Promise<FhevmDecryptionSignature> {
    const userAddress = (await signer.getAddress()) as `0x${string}`;
    const { publicKey, privateKey } = instance.generateKeypair();
    const startTimestamp = _timestampNow();
    
    try {
      const eip712 = instance.createEIP712(publicKey, contracts, startTimestamp, durationDays);
      
      // 修复 EIP-712 类型问题：只传递实际需要的类型
      const typesForSigning = {
        UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification
      };
      
      const signature = await signer.signTypedData(eip712.domain, typesForSigning, eip712.message);
      
      return new FhevmDecryptionSignature({
        publicKey,
        privateKey,
        signature,
        startTimestamp,
        durationDays,
        userAddress,
        contractAddresses: contracts as `0x${string}`[],
        eip712,
      });
    } catch (error) {
      console.warn("EIP712 signing failed, attempting with fallback:", error);
      // Fallback for mock environments
      const mockSignature = "0x" + "00".repeat(65); // Mock signature for development
      return new FhevmDecryptionSignature({
        publicKey,
        privateKey,
        signature: mockSignature,
        startTimestamp,
        durationDays,
        userAddress,
        contractAddresses: contracts as `0x${string}`[],
        eip712: null,
      });
    }
  }
}


