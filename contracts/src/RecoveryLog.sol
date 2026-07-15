// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

/// @title  RecoveryLog
/// @notice A global, permissionless ledger of completed Green Candle Therapy
///         sessions. The landing page reads {totalRecoveries} live from Monad
///         mainnet — it is the hero number and is never cached to a constant
///         client-side.
///
/// @dev    Design invariants, enforced by construction (see the test suite):
///         - Ownerless from inception: no owner, no admin, no upgrade path,
///           no pause. Nothing here can be reconfigured after deploy.
///         - No token. No custody of funds. No payable functions, no receive
///           or fallback, no withdrawal path — the contract can neither hold
///           nor move value.
///         - No personal, health, or portfolio data on-chain. Only opaque
///           hashes (computed client-side) and two small clinical codes are
///           stored; none of it is reversible to a person or a position.
///         - No external dependencies.
contract RecoveryLog {
    // -------------------------------------------------------------------------
    // Bounds — exposed as constants so the frontend and the tests read the same
    // source of truth. `diagnosisCode` is an enum index over the four clinical
    // regimes, in this exact order (mirrored by DIAGNOSIS_CODE in
    // lib/diagnosis.ts — the two MUST stay in lockstep, or a valid session
    // would revert here):
    //     0 = coma, 1 = euphoria, 2 = drawdown, 3 = chop
    // `recoveryLevel` is a discharge score on a 1..100 scale; 0 is rejected
    // because a recorded recovery always represents a completed session.
    // -------------------------------------------------------------------------

    /// @notice Highest valid diagnosis code (inclusive). Codes are 0..3, mapping
    ///         coma=0, euphoria=1, drawdown=2, chop=3.
    uint8 public constant MAX_DIAGNOSIS_CODE = 3;

    /// @notice Lowest valid recovery level (inclusive).
    uint8 public constant MIN_RECOVERY_LEVEL = 1;

    /// @notice Highest valid recovery level (inclusive).
    uint8 public constant MAX_RECOVERY_LEVEL = 100;

    // -------------------------------------------------------------------------
    // Storage
    // -------------------------------------------------------------------------

    /// @notice One recorded recovery. Packs into three storage slots: the two
    ///         hashes, then {account}/{timestamp}/{diagnosisCode}/{recoveryLevel}
    ///         together in a third.
    struct Recovery {
        bytes32 sessionHash;
        bytes32 assetHash;
        address account;
        uint64 timestamp;
        uint8 diagnosisCode;
        uint8 recoveryLevel;
    }

    /// @dev Append-only. A recovery's id is its index in this array.
    Recovery[] private _recoveries;

    /// @dev Replay protection: a sessionHash may be recorded at most once.
    mapping(bytes32 sessionHash => bool recorded) private _recorded;

    /// @dev Per-account count of recorded recoveries.
    mapping(address account => uint256 count) private _countByAccount;

    // -------------------------------------------------------------------------
    // Events
    // -------------------------------------------------------------------------

    /// @notice Emitted once per recorded recovery. Field order and indexing are
    ///         part of the stable ABI the certificate and indexers depend on.
    /// @param account       The address that recorded the recovery.
    /// @param recoveryId    The recovery's id (its index in the ledger).
    /// @param sessionHash   Opaque, client-computed session identifier.
    /// @param assetHash     Opaque, client-computed asset identifier.
    /// @param diagnosisCode The clinical regime code (0..3).
    /// @param recoveryLevel The discharge score (1..100).
    /// @param timestamp     Block timestamp at which it was recorded.
    event RecoveryRecorded(
        address indexed account,
        uint256 indexed recoveryId,
        bytes32 indexed sessionHash,
        bytes32 assetHash,
        uint8 diagnosisCode,
        uint8 recoveryLevel,
        uint256 timestamp
    );

    // -------------------------------------------------------------------------
    // Errors
    // -------------------------------------------------------------------------

    /// @dev A zero sessionHash is a degenerate/uninitialised value; rejecting it
    ///      keeps the replay-protection key space meaningful.
    error EmptySessionHash();

    /// @dev The sessionHash has already been recorded. Replay is not permitted.
    error SessionAlreadyRecorded(bytes32 sessionHash);

    /// @dev diagnosisCode exceeded {MAX_DIAGNOSIS_CODE}.
    error InvalidDiagnosisCode(uint8 diagnosisCode);

    /// @dev recoveryLevel fell outside [{MIN_RECOVERY_LEVEL}, {MAX_RECOVERY_LEVEL}].
    error InvalidRecoveryLevel(uint8 recoveryLevel);

    // -------------------------------------------------------------------------
    // Mutating
    // -------------------------------------------------------------------------

    /// @notice Record one completed therapy session. Anyone may call; it costs
    ///         only gas. Reverts on replay or out-of-range input so the ledger
    ///         and the counter can never be corrupted.
    /// @param sessionHash   Opaque session id. Must be non-zero and unrecorded.
    /// @param assetHash     Opaque asset id. Informational only — it is not a
    ///                      uniqueness key, so it is intentionally not zero- or
    ///                      range-checked and is stored exactly as provided.
    /// @param diagnosisCode Clinical regime code; must be <= {MAX_DIAGNOSIS_CODE}.
    /// @param recoveryLevel Discharge score; must be within
    ///                      [{MIN_RECOVERY_LEVEL}, {MAX_RECOVERY_LEVEL}].
    function recordRecovery(
        bytes32 sessionHash,
        bytes32 assetHash,
        uint8 diagnosisCode,
        uint8 recoveryLevel
    ) external {
        if (sessionHash == bytes32(0)) {
            revert EmptySessionHash();
        }
        if (_recorded[sessionHash]) {
            revert SessionAlreadyRecorded(sessionHash);
        }
        if (diagnosisCode > MAX_DIAGNOSIS_CODE) {
            revert InvalidDiagnosisCode(diagnosisCode);
        }
        if (recoveryLevel < MIN_RECOVERY_LEVEL || recoveryLevel > MAX_RECOVERY_LEVEL) {
            revert InvalidRecoveryLevel(recoveryLevel);
        }

        _recorded[sessionHash] = true;

        uint256 recoveryId = _recoveries.length;
        _recoveries.push(
            Recovery({
                sessionHash: sessionHash,
                assetHash: assetHash,
                account: msg.sender,
                timestamp: uint64(block.timestamp),
                diagnosisCode: diagnosisCode,
                recoveryLevel: recoveryLevel
            })
        );

        // Bounded by _recoveries.length, which cannot overflow a uint256.
        unchecked {
            _countByAccount[msg.sender] += 1;
        }

        emit RecoveryRecorded(
            msg.sender,
            recoveryId,
            sessionHash,
            assetHash,
            diagnosisCode,
            recoveryLevel,
            block.timestamp
        );
    }

    // -------------------------------------------------------------------------
    // Views — signatures are stable; the counter and certificate read these.
    // -------------------------------------------------------------------------

    /// @notice Total number of recoveries ever recorded. The hero counter reads
    ///         this. Do not rename.
    function totalRecoveries() external view returns (uint256) {
        return _recoveries.length;
    }

    /// @notice Number of recoveries recorded by `account`.
    function recoveriesBy(address account) external view returns (uint256) {
        return _countByAccount[account];
    }

    /// @notice Whether `sessionHash` has already been recorded.
    function hasRecorded(bytes32 sessionHash) external view returns (bool) {
        return _recorded[sessionHash];
    }
}
