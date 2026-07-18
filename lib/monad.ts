import { createPublicClient, defineChain, http, type Address } from "viem";

/**
 * Monad mainnet read layer. The counter route calls {@link readTotalRecoveries}
 * server-side. If the contract address or RPC is not configured, these throw —
 * and the caller must surface an honest failure, never a substitute number.
 */

export const monadMainnet = defineChain({
  id: 143,
  name: "Monad",
  nativeCurrency: { name: "Monad", symbol: "MON", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.monad.xyz"] } },
  blockExplorers: {
    default: { name: "MonadScan", url: "https://monadscan.com" },
  },
});

/**
 * RecoveryLog ABI — the exact interface of the verified deployed contract
 * (contracts/src/RecoveryLog.sol). Includes the counter read, the write path
 * (recordRecovery + the hasRecorded pre-check), the RecoveryRecorded event (for
 * the recoveryId), and the four custom errors so viem can decode reverts.
 */
export const recoveryLogAbi = [
  {
    type: "function",
    name: "totalRecoveries",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "hasRecorded",
    stateMutability: "view",
    inputs: [{ name: "sessionHash", type: "bytes32" }],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "recordRecovery",
    stateMutability: "nonpayable",
    inputs: [
      { name: "sessionHash", type: "bytes32" },
      { name: "assetHash", type: "bytes32" },
      { name: "diagnosisCode", type: "uint8" },
      { name: "recoveryLevel", type: "uint8" },
    ],
    outputs: [],
  },
  {
    type: "event",
    name: "RecoveryRecorded",
    inputs: [
      { name: "account", type: "address", indexed: true },
      { name: "recoveryId", type: "uint256", indexed: true },
      { name: "sessionHash", type: "bytes32", indexed: true },
      { name: "assetHash", type: "bytes32", indexed: false },
      { name: "diagnosisCode", type: "uint8", indexed: false },
      { name: "recoveryLevel", type: "uint8", indexed: false },
      { name: "timestamp", type: "uint256", indexed: false },
    ],
    anonymous: false,
  },
  { type: "error", name: "EmptySessionHash", inputs: [] },
  {
    type: "error",
    name: "SessionAlreadyRecorded",
    inputs: [{ name: "sessionHash", type: "bytes32" }],
  },
  {
    type: "error",
    name: "InvalidDiagnosisCode",
    inputs: [{ name: "diagnosisCode", type: "uint8" }],
  },
  {
    type: "error",
    name: "InvalidRecoveryLevel",
    inputs: [{ name: "recoveryLevel", type: "uint8" }],
  },
] as const;

/** The RecoveryLog block-explorer base (Monad mainnet, verified monadscan.com). */
export const MONAD_EXPLORER_URL = monadMainnet.blockExplorers.default.url;

/** MonadScan link for a transaction hash. */
export function txExplorerUrl(hash: string): string {
  return `${MONAD_EXPLORER_URL}/tx/${hash}`;
}

/** MonadScan link for an address (contract or account). */
export function addressExplorerUrl(address: string): string {
  return `${MONAD_EXPLORER_URL}/address/${address}`;
}

const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;

/** Configured contract address, or throw if missing/placeholder. */
export function contractAddress(): Address {
  const value = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
  if (!value || !ADDRESS_RE.test(value)) {
    throw new Error("NEXT_PUBLIC_CONTRACT_ADDRESS is not a valid address");
  }
  return value as Address;
}

/** Public client bound to the server-side RPC URL. */
export function serverPublicClient() {
  const rpc = process.env.MONAD_RPC_URL;
  if (!rpc) throw new Error("MONAD_RPC_URL is not configured");
  return createPublicClient({ chain: monadMainnet, transport: http(rpc) });
}

/** Read the live on-chain recovery total. Throws if not yet deployed/reachable. */
export async function readTotalRecoveries(): Promise<bigint> {
  const client = serverPublicClient();
  return client.readContract({
    address: contractAddress(),
    abi: recoveryLogAbi,
    functionName: "totalRecoveries",
  });
}
