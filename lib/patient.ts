/**
 * The patient's identity for the discharge artifacts — their handle, or an
 * anonymous case ID if they'd rather not say. This is personal data, so it lives
 * in localStorage ONLY (the Jungle Passport pattern): never sent to a server,
 * never transmitted, never POSTed. It is read client-side to label the recovery
 * card + on-screen summary, and is DELIBERATELY never placed in the tweet text
 * (the post comes from the user's own account already).
 *
 * All functions are client-only; on the server they degrade to empty/defaults.
 */

const KEY = "gct.patient";
const MAX_HANDLE_LEN = 30;

export interface PatientRecord {
  /** The handle, stored WITHOUT a leading "@" (rendered with one). */
  handle?: string;
  /** 4-digit anonymous case number, e.g. "4471". Used when no handle is given. */
  caseId?: string;
}

/**
 * Reduce raw input to a safe handle. Uses an ALLOWLIST — X usernames are exactly
 * [A-Za-z0-9_], so keeping only those characters inherently strips a leading
 * "@", whitespace, control characters, emoji, and any markup/injection-risky
 * character that could break the canvas card or inject into markup. Length is
 * capped. Returns "" when nothing usable remains, which the caller treats as
 * "prefer not to say".
 */
export function sanitizeHandle(raw: string): string {
  return (raw ?? "")
    .normalize("NFKC")
    .replace(/[^A-Za-z0-9_]/g, "")
    .slice(0, MAX_HANDLE_LEN);
}

function read(): PatientRecord {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as PatientRecord) : {};
  } catch {
    return {};
  }
}

function write(rec: PatientRecord): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(rec));
  } catch {
    /* storage unavailable (private mode / quota) — labels fall back in-memory */
  }
}

/** A stable 4-digit case number (1000–9999), always exactly four digits. */
function generateCaseId(): string {
  return String(1000 + Math.floor(Math.random() * 9000));
}

export function getPatient(): PatientRecord {
  return read();
}

/**
 * Record the handle. A blank/uselessly-sanitized value is treated as "prefer not
 * to say" and falls back to a (stable) case ID. Returns the stored record.
 */
export function setHandle(raw: string): PatientRecord {
  const handle = sanitizeHandle(raw);
  if (!handle) return skipHandle();
  const next: PatientRecord = { handle };
  write(next);
  return next;
}

/** Prefer-not-to-say: ensure a stable case ID and drop any handle. */
export function skipHandle(): PatientRecord {
  const prev = read();
  const next: PatientRecord = { caseId: prev.caseId ?? generateCaseId() };
  write(next);
  return next;
}

/** The display label from a record: "@handle", else "Patient #4471", else "". */
export function patientLabelFrom(rec: PatientRecord): string {
  if (rec.handle) return `@${rec.handle}`;
  if (rec.caseId) return `Patient #${rec.caseId}`;
  return "";
}

/**
 * The patient label for the discharge artifacts, guaranteeing one exists: if the
 * intake step was skipped entirely (direct navigation), a stable case ID is
 * minted and persisted so the card/summary always name a patient.
 */
export function ensurePatientLabel(): string {
  const rec = read();
  const label = patientLabelFrom(rec);
  return label || patientLabelFrom(skipHandle());
}
