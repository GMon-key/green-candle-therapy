/**
 * Empty stub used to sever an optional dependency subtree at build time.
 *
 * RainbowKit's barrel statically pulls @wagmi/connectors, whose Coinbase Base
 * Account connector does `await import('@base-org/account')` — a LAZY import that
 * drags in @coinbase/cdp-sdk and its optional, uninstalled @x402/* payment
 * modules, which break the Turbopack build. We never use that connector (see the
 * curated wallet list in components/onchain/Web3Provider.tsx), so next.config
 * aliases `@base-org/account` to this empty module. The import is never executed
 * at runtime, so resolving it to `{}` is safe.
 */
export {};
