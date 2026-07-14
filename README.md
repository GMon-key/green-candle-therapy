# Green Candle Therapy

A satirical "therapy clinic" for crypto traders. You describe a coin that hurt you;
the clinic pulls its **real** price chart, diagnoses the damage, and then — for
visual purposes only — *treats* the chart: red candles turn green, wicks
straighten, the trend rotates upward, and one final absurd god candle breaks the
frame. You leave with a certificate and a share card. The market is unchanged.

> Visual treatment only. Market unchanged.

The whole experience is **free and works with no wallet**. Connecting a wallet is
optional and only appears at the very end, to record your "recovery" on Monad.

---

## What's real vs. what's the joke

- **Real:** the chart and every stat come from live market data (CoinGecko). The
  landing page's recovery counter is read **live from a Monad mainnet contract** —
  never a hardcoded number.
- **The joke:** the "treatment" animation and the wellness metrics (measured in
  *Cope Coins, CC* — a fictional unit, not a token) are theatre. The treated chart
  is always labelled **TREATED VIEW** so it can never be mistaken for real data.

## The flow (8 beats)

1. **Landing** — the premise, plus the live on-chain recovery counter.
2. **Assessment** — three quick questions (skippable).
3. **Diagnosis** — a deadpan verdict + fictional CC metrics.
4. **Intake** — search for the asset that hurt you.
5. **Reality** — the real chart, real data, an honest data-derived diagnosis.
6. **Treatment** — the money shot: the chart is healed on a `<canvas>`.
7. **Recovery** — certificate + shareable card (generated client-side).
8. **Optional** — connect a wallet to record the recovery on Monad.

## Tech stack

- **Next.js** (App Router) + **TypeScript** + **Tailwind**
- **Lightweight Charts** — the real chart (beat 5)
- **Custom `<canvas>` renderer** — the treatment animation (beat 6)
- **viem** — Monad mainnet reads + the optional record transaction
- **Foundry** — the `RecoveryLog` contract (see [`contracts/`](./contracts))
- **Data:** CoinGecko only, proxied through a cached Next.js API route
  (no database, no backend storage, nothing uploaded)

## Quick start

```bash
npm install
cp .env.example .env.local   # then fill in the values (see below)
npm run dev                  # http://localhost:3000
```

### Environment

See [`.env.example`](./.env.example). At minimum you need a free CoinGecko Demo
API key (server-side), a Monad RPC URL, and the deployed contract address.

### Contract

The on-chain counter lives in [`contracts/`](./contracts) and targets **Monad
mainnet (chain 143)**. Build & test:

```bash
cd contracts
forge test
```

Deploy/verify instructions (following the official Monad guides) are in
[`contracts/README.md`](./contracts/README.md).

---

Data provided by CoinGecko.
