# RecoveryLog — contract workspace

The on-chain half of [Green Candle Therapy](../README.md). A single,
permissionless ledger: [`RecoveryLog.sol`](./src/RecoveryLog.sol).

- `recordRecovery(bytes32 sessionHash, bytes32 assetHash, uint8 diagnosisCode, uint8 recoveryLevel)`
  — the optional final step. Rejects a replayed `sessionHash` and out-of-range
  codes (`diagnosisCode` 0..3, `recoveryLevel` 1..100), then stores the two
  opaque hashes, the two codes, the recorder's address and the block timestamp,
  and emits `RecoveryRecorded`.
- `totalRecoveries() → uint256` — read **live** by the landing counter. Stable
  signature; never renamed.
- `recoveriesBy(address) → uint256` and `hasRecorded(bytes32) → bool`.

Ownerless from inception: no owner, no admin, no upgrade path, no pause. No
token, no custody of funds, no payable path. Only non-sensitive hashes + codes
are stored — never personal, health, or portfolio data.

Target: **Monad mainnet — chain 143**. Config in [`foundry.toml`](./foundry.toml)
pins `solc 0.8.28` / `evm_version = "cancun"` and sets `bytecode_hash = "none"` +
`use_literal_content = true` for deterministic source verification.

## Build & test

```bash
forge test
```

## Deploy (Monad mainnet) — separate, gated session

Following the official guide: <https://docs.monad.xyz/guides/deploy-smart-contract/foundry>.
A funded deployer key is required (real MON for gas). Deployment is intentionally
**not** part of the build session — the commands below are the ones to run later.

[`script/Deploy.s.sol`](./script/Deploy.s.sol) reads the key from the environment,
never inline:

```bash
export DEPLOYER_PRIVATE_KEY=0x...        # deploy session only; never committed

forge script script/Deploy.s.sol:Deploy \
  --rpc-url https://rpc.monad.xyz \
  --broadcast
```

The script prints the deployed address; set it as `NEXT_PUBLIC_CONTRACT_ADDRESS`
so the landing counter reads the live total.

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
src/RecoveryLog.sol       the contract
test/RecoveryLog.t.sol    forge tests
script/Deploy.s.sol       deploy script (reads DEPLOYER_PRIVATE_KEY from env)
lib/forge-std/            vendored test library (plain files, no submodule)
```
