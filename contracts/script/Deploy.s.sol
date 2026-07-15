// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {RecoveryLog} from "../src/RecoveryLog.sol";

/// @title  Deploy
/// @notice One-shot deployer for {RecoveryLog} on Monad mainnet (chain 143).
/// @dev    The deployer key is read from the environment — NEVER inline and
///         never committed. Set it in the shell for the (separate, gated)
///         deploy session only:
///
///             export DEPLOYER_PRIVATE_KEY=0x...
///             forge script script/Deploy.s.sol:Deploy \
///                 --rpc-url https://rpc.monad.xyz --broadcast
///
///         RecoveryLog has no constructor arguments and takes no funds, so this
///         script only broadcasts the creation transaction. Running it spends
///         real MON for gas and is intentionally out of scope for this session.
contract Deploy is Script {
    function run() external returns (RecoveryLog recoveryLog) {
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");

        vm.startBroadcast(deployerKey);
        recoveryLog = new RecoveryLog();
        vm.stopBroadcast();

        console.log("RecoveryLog deployed at:", address(recoveryLog));
    }
}
