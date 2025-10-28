"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ethers } from "ethers";
import { createFhevmInstance } from "../fhevm/internal/fhevm";
import { FhevmDecryptionSignature } from "../fhevm/FhevmDecryptionSignature";
import { ChainRaceABI } from "../abi/ChainRaceABI";
import { ChainRaceAddresses } from "../abi/ChainRaceAddresses";

export function useChainRace(params: {
  provider: ethers.Eip1193Provider | string | undefined;
  chainId: number | undefined;
  signer: ethers.JsonRpcSigner | undefined;
}) {
  const { provider, chainId, signer } = params;
  const [instance, setInstance] = useState<any>();
  const [contractAddress, setContractAddress] = useState<`0x${string}` | undefined>();
  const [message, setMessage] = useState<string>("");
  const [participantsTotal, setParticipantsTotal] = useState<number>(0);
  const [records, setRecords] = useState<Array<{ user: string; best?: bigint; attempts?: bigint }>>([]);

  // resolve contract
  useEffect(() => {
    if (!chainId) return setContractAddress(undefined);
    const entry = (ChainRaceAddresses as any)[String(chainId)] as { address?: `0x${string}` } | undefined;
    setContractAddress(entry?.address);
  }, [chainId]);

  // create instance
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!provider) return;
      try {
        const inst = await createFhevmInstance({ provider, mockChains: { 31337: "http://localhost:8545" } });
        if (!cancelled) setInstance(inst);
      } catch (e: any) {
        setMessage("FHEVM init failed: " + (e?.message ?? e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [provider]);

  const canSubmit = useMemo(() => Boolean(instance && signer && contractAddress), [instance, signer, contractAddress]);
  const canRead = useMemo(() => Boolean(contractAddress && provider), [contractAddress, provider]);

  const submitEncryptedTime = useCallback(async (timeMs: number) => {
    if (!canSubmit || !contractAddress || !signer) return;
    try {
      const normalizedContract = ethers.getAddress(contractAddress);
      const user = (signer as any).address ?? (await signer.getAddress());
      const input = instance.createEncryptedInput(normalizedContract, user);
      input.add32(Number(timeMs));
      const enc = await input.encrypt();
      const contract = new ethers.Contract(normalizedContract, ChainRaceABI.abi, signer);
      let tx: ethers.TransactionResponse;
      try {
        tx = await contract.submitRaceTime(enc.handles[0], enc.inputProof, timeMs);
      } catch (e: any) {
        // 某些本地节点在 estimateGas 阶段会回滚，尝试显式 gasLimit 重试
        tx = await contract.submitRaceTime(enc.handles[0], enc.inputProof, timeMs, { gasLimit: 3_000_000 });
      }
      setMessage("submit tx=" + tx.hash);
      await tx.wait();
      setMessage("submit ok");
    } catch (e: any) {
      setMessage(
        "submit failed: " + (e?.message ?? e)
      );
    }
  }, [canSubmit, contractAddress, signer, instance]);

  const refreshParticipants = useCallback(async () => {
    if (!canRead || !contractAddress || !provider) return;
    const read = new ethers.Contract(contractAddress, ChainRaceABI.abi, new ethers.BrowserProvider(provider));
    const total: bigint = await read.getParticipantsLength(1);
    setParticipantsTotal(Number(total));
  }, [canRead, contractAddress, provider]);

  const loadAndDecryptMyRecord = useCallback(async () => {
    if (!contractAddress || !signer || !instance) return;
    const c = new ethers.Contract(contractAddress, ChainRaceABI.abi, signer);
    const [bestHandle, attemptsHandle] = await (async () => {
      const r = await c.getMyRecord(1);
      return [r[0] as string, r[1] as string];
    })();

    const sig = await FhevmDecryptionSignature.new(instance, [contractAddress], signer);
    const res = await instance.userDecrypt(
      [
        { handle: bestHandle, contractAddress },
        { handle: attemptsHandle, contractAddress },
      ],
      sig.privateKey,
      sig.publicKey,
      sig.signature,
      sig.contractAddresses,
      sig.userAddress,
      sig.startTimestamp,
      sig.durationDays
    );
    return { best: res[bestHandle] as bigint, attempts: res[attemptsHandle] as bigint };
  }, [contractAddress, signer, instance]);

  return {
    instance,
    contractAddress,
    message,
    canSubmit,
    submitEncryptedTime,
    refreshParticipants,
    participantsTotal,
    loadAndDecryptMyRecord,
  };
}


