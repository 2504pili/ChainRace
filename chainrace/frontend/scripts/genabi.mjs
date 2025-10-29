import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(process.cwd(), '..', 'fhevm-hardhat-template');
const deploymentsDir = resolve(root, 'deployments');

function loadDeployment(network, name) {
  const p = resolve(deploymentsDir, network, `${name}.json`);
  const raw = readFileSync(p, 'utf-8');
  return JSON.parse(raw);
}

function main() {
  const outDir = resolve(process.cwd(), 'abi');
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

  const abiPath = resolve(outDir, 'ChainRaceABI.ts');
  const addrPath = resolve(outDir, 'ChainRaceAddresses.ts');

  const networks = readdirSync(deploymentsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .filter((n) => ['localhost', 'sepolia'].includes(n));

  const addressMap = {};
  let abiWritten = false;
  for (const n of networks) {
    try {
      const dep = loadDeployment(n, 'ChainRace');
      if (!abiWritten) {
        writeFileSync(
          abiPath,
          `export const ChainRaceABI = ${JSON.stringify({ abi: dep.abi }, null, 2)} as const;\n`
        );
        abiWritten = true;
      }
      const chainId = dep.chainId ?? (n === 'localhost' ? 31337 : 11155111);
      addressMap[String(chainId)] = {
        address: dep.address,
        chainId,
        chainName: n === 'localhost' ? 'Hardhat Localhost' : 'Sepolia',
      };
    } catch {}
  }

  writeFileSync(
    addrPath,
    `export const ChainRaceAddresses = ${JSON.stringify(addressMap, null, 2)} as const;\n`
  );

  console.log('ABI & addresses generated for:', Object.keys(addressMap));
}

main();


