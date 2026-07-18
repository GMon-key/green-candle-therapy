"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useReadContract } from "wagmi";

import { monadMainnet, recoveryLogAbi } from "@/lib/monad";

/**
 * Beat 8, Stage 1 — the on-chain seam. Institutional PURPLE (permanence), a
 * deliberate tonal shift from the green emotional recovery above: restrained and
 * clinical, never celebratory. This stage proves the chain config end-to-end —
 * wallet connect (RainbowKit, prompting add/switch to Monad 143) and a LIVE read
 * of totalRecoveries() from the RecoveryLog contract. No write is built here;
 * "Record my recovery" is a disabled Stage-2 seam.
 */

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as
  | `0x${string}`
  | undefined;

function LedgerCount() {
  const configured = Boolean(CONTRACT_ADDRESS);
  const { data, isLoading, isError, refetch, isRefetching } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: recoveryLogAbi,
    functionName: "totalRecoveries",
    chainId: monadMainnet.id,
    query: { enabled: configured },
  });

  return (
    <div className="flex flex-col gap-1">
      <span className="readout text-[0.7rem] font-medium uppercase tracking-[0.2em] text-monad">
        Recoveries recorded
      </span>

      {!configured && (
        <span className="text-sm text-clinic-muted">
          Ledger address not configured.
        </span>
      )}

      {configured && isLoading && (
        <span
          className="h-8 w-24 animate-pulse rounded-md bg-monad/15"
          role="status"
          aria-label="Reading the on-chain ledger…"
        />
      )}

      {configured && isError && (
        <span className="flex flex-col gap-1">
          <span className="text-sm font-medium text-clinic-alert">
            Ledger unreachable
          </span>
          <button
            type="button"
            onClick={() => refetch()}
            className="self-start text-xs font-medium text-monad underline underline-offset-2 hover:text-monad-strong"
          >
            {isRefetching ? "Retrying…" : "Retry"}
          </button>
        </span>
      )}

      {configured && data !== undefined && !isError && (
        <span className="readout text-3xl font-semibold tabular-nums text-monad">
          {Number(data).toLocaleString("en-US")}
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
  );
}

export function OnChainRecord() {
  return (
    <section className="mt-10 rounded-2xl border border-monad/30 bg-monad/[0.05] p-6 sm:p-8">
      <span className="readout text-xs font-medium uppercase tracking-[0.24em] text-monad">
        On-chain record
      </span>
      <h2 className="mt-3 text-xl font-semibold tracking-tight text-clinic-fg sm:text-2xl">
        Make this recovery permanent
      </h2>
      <p className="mt-3 max-w-xl text-sm leading-relaxed text-clinic-muted">
        The clinic keeps a public ledger of completed treatments on Monad. Adding
        yours writes a permanent, irreversible record — no personal data, no
        funds, only an opaque entry. Entirely optional.
      </p>

      {/* Live proof the chain + contract read work end-to-end. */}
      <div className="mt-6">
        <LedgerCount />
      </div>

      {/* Connect (prompts add/switch to Monad) + the disabled Stage-2 write seam. */}
      <div className="mt-6 flex flex-col gap-3 border-t border-monad/20 pt-6 sm:flex-row sm:items-center">
        <ConnectButton
          chainStatus="icon"
          showBalance={false}
          accountStatus="address"
        />
        <button
          type="button"
          disabled
          aria-disabled="true"
          className="inline-flex cursor-not-allowed items-center gap-2 rounded-lg border border-dashed border-monad/40 bg-monad/[0.06] px-6 py-3 text-sm font-semibold text-monad/70 opacity-80"
        >
          Record my recovery
          <span className="readout text-[0.65rem] uppercase tracking-[0.16em]">
            coming shortly
          </span>
        </button>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-clinic-muted">
        Connect a wallet to prepare. Recording opens shortly; it costs only gas.
      </p>
    </section>
  );
}
