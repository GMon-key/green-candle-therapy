// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title RecoveryLog
/// @notice Global, permissionless tally of completed Green Candle Therapy sessions.
/// @dev The landing page reads {totalRecoveries} live from Monad mainnet. This is the
///      hero number and is never cached to a constant client-side. There is no token,
///      no custody of funds, and no owner/admin — the contract only counts.
contract RecoveryLog {
    /// @dev Running count of recorded recoveries.
    uint256 private _total;

    /// @notice Emitted once per recorded recovery.
    /// @param patient The address that recorded the recovery.
    /// @param total   The running total after this recovery.
    event RecoveryRecorded(address indexed patient, uint256 total);

    /// @notice Total number of recoveries ever recorded on-chain.
    function totalRecoveries() external view returns (uint256) {
        return _total;
    }

    /// @notice Record one completed therapy session. Anyone may call; costs only gas.
    /// @return total The running total after this recovery.
    function recordRecovery() external returns (uint256 total) {
        unchecked {
            _total += 1;
        }
        total = _total;
        emit RecoveryRecorded(msg.sender, total);
    }
}
