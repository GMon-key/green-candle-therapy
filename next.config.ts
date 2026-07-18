import type { NextConfig } from "next";

// RainbowKit's barrel statically pulls @wagmi/connectors, whose baseAccount
// (Coinbase Base Account) connector does `await import('@base-org/account')` —
// dragging in @coinbase/cdp-sdk and its optional, uninstalled @x402/* payment
// modules, which break the Turbopack build. We never use that connector (see the
// curated list in components/onchain/Web3Provider.tsx) and the import is lazy, so
// aliasing this one specifier to an empty stub severs the whole subtree safely.
const nextConfig: NextConfig = {
  turbopack: {
    resolveAlias: {
      "@base-org/account": "./lib/x402-stub.ts",
    },
  },
};

export default nextConfig;
