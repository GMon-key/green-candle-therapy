"use client";

import { useSyncExternalStore } from "react";

import { isMuted, setMuted, subscribeMuted } from "@/lib/clinicAudio";

/**
 * React binding for the unified mute. `useSyncExternalStore` subscribes to the
 * singleton engine so every surface (the global toggle, the treatment screen)
 * reflects one source of truth and re-renders on change — no setState-in-effect,
 * SSR-safe (the server snapshot is "muted", since there is no audio there).
 */
export function useClinicMuted(): [boolean, (next: boolean) => void] {
  const muted = useSyncExternalStore(
    subscribeMuted,
    () => isMuted(),
    () => true,
  );
  return [muted, setMuted];
}
