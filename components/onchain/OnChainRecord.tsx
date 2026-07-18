"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useEffect, useMemo, useState } from "react";
import { parseEventLogs } from "viem";
import {
  useAccount,
  useChainId,
  useReadContract,
  useSwitchChain,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";

import type { FlowState } from "@/lib/flow";
import {
  addressExplorerUrl,
  monadMainnet,
  recoveryLogAbi,
  txExplorerUrl,
} from "@/lib/monad";
import {
  classifyRecordError,
  computeRecordArgs,
  type RecordError,
} from "@/lib/record";
import { useCountUp } from "@/lib/useCountUp";

/**
 * Beat 8, Stage 2 — the permanence moment. The RESTRAINED purple opposite of
 * beat 6's green explosion: sign → pending (tx hash shown, MonadScan link) →
 * confirmed (the counter ticks up, the recoveryId resolves, one soft purple
 * bloom, then the thesis line). No green, no confetti — restraint is the gravity.
 * Reduced-motion drops the pulse/bloom to plain state text. The recordRecovery
 * write uses the verified ABI + constraint-satisfying args from lib/record.
 */

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as
  | `0x${string}`
  | undefined;

type Status =
  | "idle"
  | "signing"
  | "pending"
  | "confirmed"
  | "already"
  | "error";

const PRIMARY_BTN =
  "inline-flex items-center justify-center rounded-lg bg-monad px-6 py-3 text-sm font-semibold text-monad-on transition-colors hover:bg-monad-strong focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-monad disabled:cursor-not-allowed disabled:opacity-40";

/** A slow, steady purple pulse — no spinner drama, no percentage. */
function Pulse({ label }: { label: string }) {
  return (
    <span className="readout flex items-center gap-2.5 text-sm text-monad">
      <span
        aria-hidden
        className="gct-breathe inline-block h-2 w-2 rounded-full bg-monad"
      />
      {label}
    </span>
  );
}

function ExplorerLink({ href, children }: { href: string; children: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-sm font-medium text-monad underline underline-offset-2 hover:text-monad-strong"
    >
      {children}
    </a>
  );
}

export function OnChainRecord({
  flow,
  nonce,
}: {
  flow: FlowState;
  nonce: string;
}) {
  const { address, isConnected } = useAccount();
  const walletChainId = useChainId();
  const onMonad = walletChainId === monadMainnet.id;
  const { switchChain, isPending: switching } = useSwitchChain();

  // Local flags set ONLY from the click handler (never in an effect) — the rest
  // of the status is DERIVED from the wagmi hooks below.
  const [already, setAlready] = useState(false);
  const [manualError, setManualError] = useState<RecordError>();

  // Live counter (also ticks up on confirmation, via the refetch effect below).
  const {
    data: total,
    isLoading: totalLoading,
    isError: totalError,
    refetch: refetchTotal,
  } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: recoveryLogAbi,
    functionName: "totalRecoveries",
    chainId: monadMainnet.id,
    query: { enabled: Boolean(CONTRACT_ADDRESS) },
  });
  const shownTotal = useCountUp(total !== undefined ? Number(total) : null);

  // The four record args — computed reactively once the wallet is known.
  const recordArgs = useMemo(
    () => (address ? computeRecordArgs(flow, address, nonce) : null),
    [flow, address, nonce],
  );

  // hasRecorded pre-check — fetched on demand (at click), never a doomed tx.
  const { refetch: refetchHasRecorded } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: recoveryLogAbi,
    functionName: "hasRecorded",
    args: recordArgs ? [recordArgs.sessionHash] : undefined,
    chainId: monadMainnet.id,
    query: { enabled: false },
  });

  const {
    writeContract,
    data: txHash,
    isPending: isSigning,
    error: writeError,
    reset: resetWrite,
  } = useWriteContract();
  const {
    data: receipt,
    isSuccess: isConfirmed,
    error: receiptError,
  } = useWaitForTransactionReceipt({
    hash: txHash,
    chainId: monadMainnet.id,
    query: { enabled: Boolean(txHash) },
  });

  // recoveryId is DERIVED from the receipt (best-effort) — no state, no effect.
  const recoveryId = useMemo(() => {
    if (!receipt) return undefined;
    try {
      const logs = parseEventLogs({
        abi: recoveryLogAbi,
        logs: receipt.logs,
        eventName: "RecoveryRecorded",
      });
      return logs[0]?.args?.recoveryId;
    } catch {
      return undefined;
    }
  }, [receipt]);

  // Status is DERIVED, not stored — avoids setState-in-effect entirely.
  const chainWriteError = writeError ?? receiptError;
  const error: RecordError | undefined =
    manualError ??
    (chainWriteError ? classifyRecordError(chainWriteError) : undefined);
  const status: Status = already
    ? "already"
    : error
      ? error.kind === "already"
        ? "already"
        : "error"
      : isConfirmed
        ? "confirmed"
        : txHash
          ? "pending"
          : isSigning
            ? "signing"
            : "idle";

  // The ONE side effect: tick the counter up when the record confirms. This
  // calls refetch (not setState), so it's not a set-state-in-effect.
  useEffect(() => {
    if (isConfirmed) void refetchTotal();
  }, [isConfirmed, refetchTotal]);

  async function handleRecord() {
    if (!address || !CONTRACT_ADDRESS) return;
    if (!onMonad) {
      switchChain({ chainId: monadMainnet.id });
      return;
    }
    const args = recordArgs ?? computeRecordArgs(flow, address, nonce);
    if (!args) {
      setManualError({ kind: "generic", message: "Session data is unavailable." });
      return;
    }
    setManualError(undefined);
    setAlready(false);
    // Pre-check: skip a guaranteed SessionAlreadyRecorded revert.
    const pre = await refetchHasRecorded();
    if (pre.data === true) {
      setAlready(true);
      return;
    }
    // Fires the wallet signature; the write hook drives signing → pending, and
    // useWaitForTransactionReceipt drives confirmed. Errors surface via writeError.
    writeContract({
      address: CONTRACT_ADDRESS,
      abi: recoveryLogAbi,
      functionName: "recordRecovery",
      args: [
        args.sessionHash,
        args.assetHash,
        args.diagnosisCode,
        args.recoveryLevel,
      ],
      chainId: monadMainnet.id,
    });
  }

  function retry() {
    setManualError(undefined);
    setAlready(false);
    resetWrite();
  }

  return (
    <section className="relative mt-10 overflow-hidden rounded-2xl border border-monad/30 bg-monad/[0.05] p-6 sm:p-8">
      {/* One soft purple bloom on confirmation (reduced-motion: none). */}
      {status === "confirmed" && (
        <span
          aria-hidden
          className="gct-bloom pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(131,110,249,0.35), transparent 70%)",
          }}
        />
      )}

      <div className="relative">
        <span className="readout text-xs font-medium uppercase tracking-[0.24em] text-monad">
          On-chain record
        </span>
        <h2 className="mt-3 text-xl font-semibold tracking-tight text-clinic-fg sm:text-2xl">
          Make this recovery permanent
        </h2>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-clinic-muted">
          The clinic keeps a public ledger of completed treatments on Monad.
          Adding yours writes a permanent, irreversible record — no personal data,
          no funds, only an opaque entry. Entirely optional.
        </p>

        {/* Live counter — ticks up on confirmation. */}
        <div className="mt-6 flex flex-col gap-1">
          <span className="readout text-[0.7rem] font-medium uppercase tracking-[0.2em] text-monad">
            Recoveries recorded
          </span>
          {!CONTRACT_ADDRESS && (
            <span className="text-sm text-clinic-muted">
              Ledger address not configured.
            </span>
          )}
          {CONTRACT_ADDRESS && totalLoading && (
            <span
              className="h-8 w-24 animate-pulse rounded-md bg-monad/15"
              role="status"
              aria-label="Reading the on-chain ledger…"
            />
          )}
          {CONTRACT_ADDRESS && totalError && (
            <span className="text-sm font-medium text-clinic-alert">
              Ledger unreachable
            </span>
          )}
          {CONTRACT_ADDRESS && total !== undefined && !totalError && (
            <span className="readout text-3xl font-semibold tabular-nums text-monad">
              {shownTotal.toLocaleString("en-US")}
            </span>
          )}
          <span className="readout mt-1 flex items-center gap-1.5 text-[0.65rem] uppercase tracking-[0.18em] text-monad-soft">
            <span
              aria-hidden
              className="gct-breathe inline-block h-1.5 w-1.5 rounded-full bg-monad"
            />
            Live · Monad mainnet
          </span>
        </div>

        {/* The action / lifecycle block. */}
        <div className="mt-6 border-t border-monad/20 pt-6">
          {status === "idle" && (
            <div className="flex flex-col gap-4">
              <p className="text-sm font-medium leading-relaxed text-clinic-fg">
                Your recovery was visual. This makes it permanent.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <ConnectButton
                  chainStatus="icon"
                  showBalance={false}
                  accountStatus="address"
                />
                {isConnected && !onMonad ? (
                  <button
                    type="button"
                    onClick={() => switchChain({ chainId: monadMainnet.id })}
                    disabled={switching}
                    className={PRIMARY_BTN}
                  >
                    {switching ? "Switching…" : "Switch to Monad"}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleRecord}
                    disabled={!isConnected}
                    className={PRIMARY_BTN}
                  >
                    Record my recovery
                  </button>
                )}
              </div>
              <p className="text-xs leading-relaxed text-clinic-muted">
                {isConnected
                  ? "It costs only gas — no fee, no value transferred."
                  : "Connect a wallet to record. It costs only gas."}
              </p>
            </div>
          )}

          {status === "signing" && <Pulse label="Awaiting signature…" />}

          {status === "pending" && (
            <div className="flex flex-col gap-3">
              <Pulse label="Recording on Monad…" />
              {txHash && (
                <ExplorerLink href={txExplorerUrl(txHash)}>
                  View transaction on Monad ↗
                </ExplorerLink>
              )}
            </div>
          )}

          {status === "confirmed" && (
            <div className="flex flex-col gap-2">
              <p className="text-lg font-semibold text-clinic-fg">
                Recovery permanently recorded.
              </p>
              <p className="readout text-sm text-monad">
                {recoveryId !== undefined
                  ? `Recovery #${recoveryId.toString()} · Monad`
                  : "Recorded · Monad"}
              </p>
              {txHash && (
                <ExplorerLink href={txExplorerUrl(txHash)}>
                  View on Monad ↗
                </ExplorerLink>
              )}
              <p className="mt-3 text-sm leading-relaxed text-clinic-muted">
                The chart can relapse. This cannot.
              </p>
            </div>
          )}

          {status === "already" && (
            <div className="flex flex-col gap-2">
              <p className="text-base font-semibold text-clinic-fg">
                This recovery is already on-chain.
              </p>
              <p className="text-sm leading-relaxed text-clinic-muted">
                It is already permanent — nothing more to record.
              </p>
              {address && (
                <ExplorerLink href={addressExplorerUrl(address)}>
                  View your records on Monad ↗
                </ExplorerLink>
              )}
            </div>
          )}

          {status === "error" && error && (
            <div className="flex flex-col gap-3">
              <p className="text-sm font-medium text-clinic-alert">
                {error.message}
              </p>
              {error.kind === "chain" ? (
                <button
                  type="button"
                  onClick={() => switchChain({ chainId: monadMainnet.id })}
                  className={PRIMARY_BTN}
                >
                  Switch to Monad
                </button>
              ) : (
                <button
                  type="button"
                  onClick={retry}
                  className="self-start text-sm font-medium text-monad underline underline-offset-2 hover:text-monad-strong"
                >
                  Try again
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
