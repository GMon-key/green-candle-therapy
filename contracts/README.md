# RecoveryLog — contract workspace

The on-chain half of [Green Candle Therapy](../README.md). A single, permissionless
counter: [`RecoveryLog.sol`](./src/RecoveryLog.sol) exposes `totalRecoveries()`
(read live by the landing page) and `recordRecovery()` (called by the optional
final step). No token, no custody, no owner.

Target: **Monad mainnet — chain 143**. Config in [`foundry.toml`](./foundry.toml)
pins `solc 0.8.28` / `evm_version = "cancun"` and sets `bytecode_hash = "none"` +
`use_literal_content = true` for deterministic source verification.

## Build & test

```bash
forge test
```

## Deploy (Monad mainnet)

Following the official guide: <https://docs.monad.xyz/guides/deploy-smart-contract/foundry>.
A funded deployer key is required (real MON for gas). Prefer a keystore over a raw key:

```bash
# one-time: import the deployer key into an encrypted keystore
cast wallet import deployer --interactive

# deploy
forge create src/RecoveryLog.sol:RecoveryLog \
  --rpc-url https://rpc.monad.xyz \
  --account deployer \
  --broadcast
```

## Verify

Following <https://docs.monad.xyz/guides/verify-smart-contract/foundry>. Default path
is Sourcify (no API key):

```bash
forge verify-contract <DEPLOYED_ADDRESS> src/RecoveryLog.sol:RecoveryLog \
  --chain 143 \
  --verifier sourcify \
  --verifier-url https://sourcify-api-monad.blockvision.org/
```

Explorers: <https://monadscan.com> · <https://monadvision.com>

## Layout

```
src/RecoveryLog.sol     the contract
test/RecoveryLog.t.sol  forge tests
lib/forge-std/          vendored test library (plain files, no submodule)
```
