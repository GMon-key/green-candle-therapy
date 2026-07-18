"use client";

import { useEffect } from "react";

import { startAudioFromGesture } from "@/lib/clinicAudio";
import { useClinicMuted } from "@/components/audio/useClinicMuted";

/**
 * The app-wide audio control, mounted once in the root layout.
 *
 *  • Arms a ONE-TIME first-gesture listener that starts the engine (autoplay-safe
 *    — the AudioContext resumes inside a real user interaction, never before).
 *  • Renders the persistent, unobtrusive mute toggle present on every screen.
 *    The toggle governs everything through the unified engine flag, including the
 *    beat-6 heartbeat (which subscribes to the same flag).
 *
 * Fixed bottom-right so it clears the sticky BeatShell header, the full-screen
 * canvas badges (top corners) and the centred captions on the treatment /
 * relapse beats. It reused the treatment screen's proven mute position, which
 * now hosts the single global control.
 */
export function AudioController() {
  const [muted, setMuted] = useClinicMuted();

  useEffect(() => {
    // Start on the FIRST interaction. startAudioFromGesture creates + resumes a
    // native AudioContext synchronously inside this handler (mobile Safari
    // requires the unlock to happen in the gesture; Tone is imported after and
    // adopts it). No AudioContext exists until this runs — autoplay-safe.
    // `touchend` sits alongside `pointerdown` for older mobile engines, and we
    // keep listening until a start actually succeeds so no tap is wasted.
    const events = ["pointerdown", "touchend", "keydown"] as const;
    const onGesture = () => {
      if (startAudioFromGesture()) {
        for (const e of events) window.removeEventListener(e, onGesture);
      }
    };
    for (const e of events) window.addEventListener(e, onGesture);
    return () => {
      for (const e of events) window.removeEventListener(e, onGesture);
    };
  }, []);

  return (
    <button
      type="button"
      onClick={() => setMuted(!muted)}
      aria-pressed={muted}
      aria-label={muted ? "Unmute clinic audio" : "Mute clinic audio"}
      title={muted ? "Sound off" : "Sound on"}
      className="fixed bottom-4 right-4 z-[60] grid h-10 w-10 place-items-center rounded-lg border border-white/15 bg-black/45 text-white/90 backdrop-blur transition-colors hover:border-white/35 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/60"
    >
      {muted ? <SpeakerOff /> : <SpeakerOn />}
      <span className="sr-only">{muted ? "Sound off" : "Sound on"}</span>
    </button>
  );
}

function SpeakerOn() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 9v6h4l5 4V5L8 9H4z" />
      <path d="M16.5 8.5a5 5 0 0 1 0 7" />
      <path d="M19 6a8 8 0 0 1 0 12" />
    </svg>
  );
}

function SpeakerOff() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 9v6h4l5 4V5L8 9H4z" />
      <path d="M22 9l-6 6" />
      <path d="M16 9l6 6" />
    </svg>
  );
}
