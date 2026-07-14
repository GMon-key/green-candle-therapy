// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {RecoveryLog} from "../src/RecoveryLog.sol";

contract RecoveryLogTest is Test {
    RecoveryLog internal recoveryLog;

    event RecoveryRecorded(address indexed patient, uint256 total);

    function setUp() public {
        recoveryLog = new RecoveryLog();
    }

    function test_StartsAtZero() public view {
        assertEq(recoveryLog.totalRecoveries(), 0);
    }

    function test_RecordIncrements() public {
        assertEq(recoveryLog.recordRecovery(), 1);
        assertEq(recoveryLog.totalRecoveries(), 1);
        assertEq(recoveryLog.recordRecovery(), 2);
        assertEq(recoveryLog.totalRecoveries(), 2);
    }

    function test_EmitsRecoveryRecorded() public {
        vm.expectEmit(true, false, false, true);
        emit RecoveryRecorded(address(this), 1);
        recoveryLog.recordRecovery();
    }
}
