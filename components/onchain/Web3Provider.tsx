"use client";

import "@rainbow-me/rainbowkit/styles.css";

import {
  connectorsForWallets,
  darkTheme,
  RainbowKitProvider,
} from "@rainbow-me/rainbowkit";
import {
  injectedWallet,
  metaMaskWallet,
  rainbowWallet,
  walletConnectWallet,
} from "@rainbow-me/rainbowkit/wallets";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { createConfig, http, WagmiProvider } from "wagmi";

import { monadMainnet } from "@/lib/monad";

/**
 * The on-chain provider stack (wagmi + react-query + RainbowKit), scoped to the
 * recovery route's on-chain seam so wallet code never loads on the emotional
 * beats. Targets ONLY Monad mainnet (chain 143, reused from lib/monad.ts), so a
 * connected wallet on any other network is prompted to add/switch to it.
 *
 * Connectors are CURATED (not RainbowKit's getDefaultConfig): the default set
 * pulls the Coinbase Base Account connector, whose transitive @coinbase/cdp-sdk
 * references an optional "@x402/core/client" that isn't installed and breaks the
 * build. We include injected / MetaMask / WalletConnect / Rainbow only.
 *
 * The WalletConnect project id is read from the env (never hardcoded); it is
 * public by design. RainbowKit is themed in restrained Monad PURPLE —
 * institutional permanence, deliberately distinct from the green recovery theme.
 */
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "";

const connectors = connectorsForWallets(
  [
    {
      groupName: "Recommended",
      wallets: [
        injectedWallet,
        metaMaskWallet,
        walletConnectWallet,
        rainbowWallet,
      ],
    },
  ],
  { appName: "Green Candle Therapy", projectId },
);

const config = createConfig({
  chains: [monadMainnet],
  connectors,
  transports: { [monadMainnet.id]: http() }, // keyless https://rpc.monad.xyz
  ssr: true,
});

const queryClient = new QueryClient();

const monadTheme = darkTheme({
  accentColor: "#836ef9", // --monad-purple
  accentColorForeground: "#ffffff",
  borderRadius: "medium",
  fontStack: "system",
});

export function Web3Provider({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider initialChain={monadMainnet} theme={monadTheme}>
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
