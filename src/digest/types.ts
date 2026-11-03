export type DigestStatus = 'ok' | 'retry' | 'fail';

export type DigestRow = {
  job: string;
  // Owner from the latest valid event by time, including null; ties use file order.
  owner: string | null;
  // All valid events count as runs; retry events also count as retries.
  runs: number;
  retries: number;
  // Status from that same latest event.
  lastStatus: DigestStatus;
  // Latest provided error by time (ties use file order), or null if none.
  // Retained through later events without an error, including successes.
  lastError: string | null;
  // Earliest/latest event instants; preserve their original strings and offsets.
  // Equal instants use file order: first occurrence for firstAt, last for lastAt.
  firstAt: string;
  lastAt: string;
};

export type DigestCounts = Record<DigestStatus, number>;

export type DigestNight = {
  // One row per job, sorted by job ascending using string comparison.
  // HTML and JSON consumers use these same rows without regrouping or reordering.
  rows: DigestRow[];
  // Nonblank lines that are invalid JSON or do not match the event schema.
  badLines: number;
  // Totals for every valid event, not just each job's last status.
  // The board uses these counts instead of parsing the file independently.
  counts: DigestCounts;
};

/**
 * Read runsDir/<night>.jsonl synchronously; night is a YYYY-MM-DD basename.
 * A missing file returns null. A present empty file returns rows: [], badLines: 0,
 * and counts: { ok: 0, retry: 0, fail: 0 }. Blank lines are ignored; malformed
 * events increment badLines without preventing valid events from being returned.
 */
export type ReadNight = (runsDir: string, night: string) => DigestNight | null;
