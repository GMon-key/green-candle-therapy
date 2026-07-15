"use client";

import {
  CandlestickSeries,
  ColorType,
  createChart,
  CrosshairMode,
  type IChartApi,
  type UTCTimestamp,
} from "lightweight-charts";
import { useEffect, useRef } from "react";

import type { Candle } from "@/lib/diagnosis";

/**
 * The real, untouched market record rendered with Lightweight Charts (v5).
 * Reads its palette from the live clinic-* theme tokens so it sits inside the
 * beat's mood. This is the honest data — no treatment is applied here.
 */
export function RealityChart({ candles }: { candles: Candle[] }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const cs = getComputedStyle(el);
    const token = (name: string, fallback: string) =>
      cs.getPropertyValue(name).trim() || fallback;

    const text = token("--clinic-muted", "#8a5555");
    const line = token("--clinic-line", "#f3cfcf");
    const down = token("--clinic-alert", "#d83a3f");
    const up = "#2f9e6a"; // restrained green for up candles on the real record

    const chart: IChartApi = createChart(el, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: text,
        attributionLogo: false,
        fontFamily:
          "var(--font-ibm-mono), ui-monospace, monospace",
      },
      grid: {
        vertLines: { color: line },
        horzLines: { color: line },
      },
      rightPriceScale: { borderColor: line },
      timeScale: { borderColor: line, timeVisible: false },
      crosshair: { mode: CrosshairMode.Normal },
    });

    const series = chart.addSeries(CandlestickSeries, {
      upColor: up,
      downColor: down,
      wickUpColor: up,
      wickDownColor: down,
      borderVisible: false,
    });

    // Lightweight Charts requires strictly ascending, unique timestamps.
    const data = candles
      .map((c) => ({
        time: Math.floor(c.t / 1000) as UTCTimestamp,
        open: c.o,
        high: c.h,
        low: c.l,
        close: c.c,
      }))
      .sort((a, b) => (a.time as number) - (b.time as number))
      .filter((point, i, arr) => i === 0 || point.time !== arr[i - 1].time);

    series.setData(data);
    chart.timeScale().fitContent();

    return () => chart.remove();
  }, [candles]);

  return (
    <div
      ref={containerRef}
      className="h-[320px] w-full sm:h-[380px]"
      role="img"
      aria-label="30-day market record for the selected asset"
    />
  );
}
