// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test} from "forge-std/Test.sol";
import {RecoveryLog} from "../src/RecoveryLog.sol";

/// @notice Full behavioural + invariant coverage for {RecoveryLog}. This suite
///         is what makes the one-shot mainnet deploy safe: every guard, every
///         counter, every event field, and the ownerless / non-payable
///         invariants are asserted here.
contract RecoveryLogTest is Test {
    RecoveryLog internal rlog;

    // Local mirror of the event for vm.expectEmit.
    event RecoveryRecorded(
        address indexed account,
        uint256 indexed recoveryId,
        bytes32 indexed sessionHash,
        bytes32 assetHash,
        uint8 diagnosisCode,
        uint8 recoveryLevel,
        uint256 timestamp
    );

    address internal alice = makeAddr("alice");
    address internal bob = makeAddr("bob");

    bytes32 internal constant S1 = keccak256("session-1");
    bytes32 internal constant S2 = keccak256("session-2");
    bytes32 internal constant A1 = keccak256("asset-1");
    bytes32 internal constant A2 = keccak256("asset-2");

    function setUp() public {
        rlog = new RecoveryLog();
        // A fixed, non-zero timestamp so event assertions are deterministic.
        vm.warp(1_700_000_000);
    }

    // ------------------------------------------------------------------
    // Happy path
    // ------------------------------------------------------------------

    function test_StartsEmpty() public view {
        assertEq(rlog.totalRecoveries(), 0);
        assertEq(rlog.recoveriesBy(alice), 0);
        assertFalse(rlog.hasRecorded(S1));
    }

    function test_RecordUpdatesAllState() public {
        vm.prank(alice);
        rlog.recordRecovery(S1, A1, 2, 80);

        assertEq(rlog.totalRecoveries(), 1);
        assertEq(rlog.recoveriesBy(alice), 1);
        assertTrue(rlog.hasRecorded(S1));
        assertFalse(rlog.hasRecorded(S2));
    }

    /// All seven event fields (3 topics + 4 data) are checked.
    function test_EmitsAllEventFields() public {
        vm.expectEmit(true, true, true, true, address(rlog));
        emit RecoveryRecorded(alice, 0, S1, A1, 3, 100, block.timestamp);

        vm.prank(alice);
        rlog.recordRecovery(S1, A1, 3, 100);
    }

    function test_RecoveryIdIncrementsFromZero() public {
        vm.expectEmit(true, true, true, true, address(rlog));
        emit RecoveryRecorded(alice, 0, S1, A1, 0, 1, block.timestamp);
        vm.prank(alice);
        rlog.recordRecovery(S1, A1, 0, 1);

        vm.expectEmit(true, true, true, true, address(rlog));
        emit RecoveryRecorded(bob, 1, S2, A2, 1, 50, block.timestamp);
        vm.prank(bob);
        rlog.recordRecovery(S2, A2, 1, 50);
    }

    // ------------------------------------------------------------------
    // Replay protection (load-bearing)
    // ------------------------------------------------------------------

    function test_DuplicateSessionReverts() public {
        vm.prank(alice);
        rlog.recordRecovery(S1, A1, 1, 40);

        // Same sessionHash again — even from a different caller / different
        // asset / different codes — must revert, and must not move any counter.
        vm.expectRevert(
            abi.encodeWithSelector(RecoveryLog.SessionAlreadyRecorded.selector, S1)
        );
        vm.prank(bob);
        rlog.recordRecovery(S1, A2, 2, 90);

        assertEq(rlog.totalRecoveries(), 1);
        assertEq(rlog.recoveriesBy(bob), 0);
    }

    function test_EmptySessionHashReverts() public {
        vm.expectRevert(RecoveryLog.EmptySessionHash.selector);
        rlog.recordRecovery(bytes32(0), A1, 1, 40);
        assertEq(rlog.totalRecoveries(), 0);
    }

    // ------------------------------------------------------------------
    // Bounds validation
    // ------------------------------------------------------------------

    function test_MaxDiagnosisCodeAccepted() public {
        vm.prank(alice);
        rlog.recordRecovery(S1, A1, rlog.MAX_DIAGNOSIS_CODE(), 50);
        assertEq(rlog.totalRecoveries(), 1);
    }

    function test_DiagnosisCodeAboveMaxReverts() public {
        uint8 bad = rlog.MAX_DIAGNOSIS_CODE() + 1;
        vm.expectRevert(
            abi.encodeWithSelector(RecoveryLog.InvalidDiagnosisCode.selector, bad)
        );
        rlog.recordRecovery(S1, A1, bad, 50);
    }

    function test_DiagnosisCodeMaxUint8Reverts() public {
        vm.expectRevert(
            abi.encodeWithSelector(RecoveryLog.InvalidDiagnosisCode.selector, type(uint8).max)
        );
        rlog.recordRecovery(S1, A1, type(uint8).max, 50);
    }

    function test_RecoveryLevelBoundariesAccepted() public {
        vm.prank(alice);
        rlog.recordRecovery(S1, A1, 0, rlog.MIN_RECOVERY_LEVEL());
        vm.prank(alice);
        rlog.recordRecovery(S2, A2, 0, rlog.MAX_RECOVERY_LEVEL());
        assertEq(rlog.totalRecoveries(), 2);
    }

    function test_RecoveryLevelZeroReverts() public {
        vm.expectRevert(
            abi.encodeWithSelector(RecoveryLog.InvalidRecoveryLevel.selector, uint8(0))
        );
        rlog.recordRecovery(S1, A1, 0, 0);
    }

    function test_RecoveryLevelAboveMaxReverts() public {
        uint8 bad = rlog.MAX_RECOVERY_LEVEL() + 1;
        vm.expectRevert(
            abi.encodeWithSelector(RecoveryLog.InvalidRecoveryLevel.selector, bad)
        );
        rlog.recordRecovery(S1, A1, 0, bad);
    }

    // ------------------------------------------------------------------
    // Multiple users / multiple sessions
    // ------------------------------------------------------------------

    function test_MultipleUsers() public {
        vm.prank(alice);
        rlog.recordRecovery(S1, A1, 0, 10);
        vm.prank(bob);
        rlog.recordRecovery(S2, A2, 1, 20);

        assertEq(rlog.totalRecoveries(), 2);
        assertEq(rlog.recoveriesBy(alice), 1);
        assertEq(rlog.recoveriesBy(bob), 1);
    }

    function test_MultipleSessionsPerUser() public {
        vm.startPrank(alice);
        rlog.recordRecovery(S1, A1, 0, 10);
        rlog.recordRecovery(S2, A2, 1, 20);
        rlog.recordRecovery(keccak256("session-3"), A1, 2, 30);
        vm.stopPrank();

        assertEq(rlog.totalRecoveries(), 3);
        assertEq(rlog.recoveriesBy(alice), 3);
        assertEq(rlog.recoveriesBy(bob), 0);
    }

    function test_TotalIncrementsAcrossManyRecords() public {
        for (uint256 i = 0; i < 5; i++) {
            rlog.recordRecovery(keccak256(abi.encode("s", i)), A1, 0, 50);
            assertEq(rlog.totalRecoveries(), i + 1);
        }
    }

    // ------------------------------------------------------------------
    // hasRecorded
    // ------------------------------------------------------------------

    function test_HasRecordedTrueFalse() public {
        assertFalse(rlog.hasRecorded(S1));
        rlog.recordRecovery(S1, A1, 0, 50);
        assertTrue(rlog.hasRecorded(S1));
        assertFalse(rlog.hasRecorded(S2));
    }

    // ------------------------------------------------------------------
    // Invariants: ownerless + non-payable + no withdrawal path
    // ------------------------------------------------------------------

    /// No admin/owner/upgrade/pause surface exists. We probe the selectors an
    /// owned or upgradeable contract would expose and assert every call fails
    /// (no such function => the call reverts / is not handled).
    function test_NoAdminSurface() public {
        string[9] memory sigs = [
            "owner()",
            "admin()",
            "transferOwnership(address)",
            "renounceOwnership()",
            "pause()",
            "unpause()",
            "upgradeTo(address)",
            "setOwner(address)",
            "initialize()"
        ];
        for (uint256 i = 0; i < sigs.length; i++) {
            (bool ok, ) = address(rlog).call(abi.encodeWithSignature(sigs[i]));
            assertFalse(ok, sigs[i]);
        }
    }

    /// The contract cannot receive value: no receive, no fallback, and
    /// recordRecovery is non-payable.
    function test_RejectsPlainValueTransfer() public {
        vm.deal(address(this), 1 ether);
        (bool ok, ) = address(rlog).call{value: 1 ether}("");
        assertFalse(ok);
        assertEq(address(rlog).balance, 0);
    }

    function test_RecordRecoveryIsNonPayable() public {
        vm.deal(address(this), 1 ether);
        (bool ok, ) = address(rlog).call{value: 1 wei}(
            abi.encodeWithSelector(RecoveryLog.recordRecovery.selector, S1, A1, uint8(0), uint8(50))
        );
        assertFalse(ok);
        assertEq(rlog.totalRecoveries(), 0);
        assertEq(address(rlog).balance, 0);
    }

    // ------------------------------------------------------------------
    // Gas sanity
    // ------------------------------------------------------------------

    /// A generous ceiling on the first (all-cold-storage) record. Reported so
    /// regressions are visible; the real figure prints in the test output.
    function test_GasSanity_FirstRecord() public {
        vm.prank(alice);
        uint256 before = gasleft();
        rlog.recordRecovery(S1, A1, 2, 80);
        uint256 used = before - gasleft();
        emit log_named_uint("recordRecovery gas (first, cold)", used);
        assertLt(used, 200_000);
    }

    // ------------------------------------------------------------------
    // Fuzz
    // ------------------------------------------------------------------

    function testFuzz_RecordValidInputs(
        bytes32 sessionHash,
        bytes32 assetHash,
        uint8 diagnosisCode,
        uint8 recoveryLevel
    ) public {
        vm.assume(sessionHash != bytes32(0));
        diagnosisCode = uint8(bound(diagnosisCode, 0, rlog.MAX_DIAGNOSIS_CODE()));
        recoveryLevel = uint8(bound(recoveryLevel, rlog.MIN_RECOVERY_LEVEL(), rlog.MAX_RECOVERY_LEVEL()));

        vm.prank(alice);
        rlog.recordRecovery(sessionHash, assetHash, diagnosisCode, recoveryLevel);

        assertTrue(rlog.hasRecorded(sessionHash));
        assertEq(rlog.totalRecoveries(), 1);
        assertEq(rlog.recoveriesBy(alice), 1);

        // Replaying the same fuzzed sessionHash must always revert.
        vm.expectRevert(
            abi.encodeWithSelector(RecoveryLog.SessionAlreadyRecorded.selector, sessionHash)
        );
        rlog.recordRecovery(sessionHash, assetHash, diagnosisCode, recoveryLevel);
    }
}
