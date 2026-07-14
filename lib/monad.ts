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

/** Minimal ABI — only what the landing counter needs. */
export const recoveryLogAbi = [
  {
    type: "function",
    name: "totalRecoveries",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

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
