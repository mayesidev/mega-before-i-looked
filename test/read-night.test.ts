import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { readNight } from '../src/digest/read-night.js';

const night = '2026-10-28';
const valid = { at: '2026-10-28T23:00:00+01:00', job: 'test/job', owner: 'test-owner', status: 'ok' };
let runsDir: string;

function writeEvents(events: unknown[]) {
  writeFileSync(join(runsDir, `${night}.jsonl`), events.map(event => JSON.stringify(event)).join('\n'));
}

beforeEach(() => { runsDir = mkdtempSync(join(tmpdir(), 'rig-digest-')); });
afterEach(() => { rmSync(runsDir, { recursive: true, force: true }); });

describe('readNight', () => {
  it('reads the unchanged fixture with five jobs and one bad line', () => {
    const result = readNight('runs', night);
    expect(result?.rows).toHaveLength(5);
    expect(result?.badLines).toBe(1);
    expect(result?.counts).toEqual({ ok: 10, retry: 4, fail: 1 });
    expect(result?.rows.reduce((total, row) => total + row.runs, 0)).toBe(15);
    expect(result?.rows.reduce((total, row) => total + row.retries, 0)).toBe(4);
    expect(result?.rows.some(row => row.owner === null)).toBe(true);
  });

  it('orders instants across offsets and retains the newest error through success', () => {
    writeEvents([
      { ...valid, at: '2026-10-29T00:00:00+02:00', status: 'fail', error: 'earlier error' },
      { ...valid, at: '2026-10-28T22:30:00Z', status: 'retry', error: 'newest error' },
      { ...valid, at: '2026-10-28T18:00:00-05:00', owner: null },
      { ...valid, at: '2026-10-29T00:15:00+02:00', status: 'retry', error: 'older error written last' },
    ]);
    expect(readNight(runsDir, night)).toEqual({
      rows: [{
        job: valid.job, owner: null, runs: 4, retries: 2, lastStatus: 'ok',
        lastError: 'newest error', firstAt: '2026-10-29T00:00:00+02:00', lastAt: '2026-10-28T18:00:00-05:00',
      }],
      badLines: 0, counts: { ok: 1, retry: 2, fail: 1 },
    });
  });

  it('finds the first event even when it is written last', () => {
    writeEvents([valid, { ...valid, at: '2026-10-28T20:00:00Z', owner: 'earlier-owner', status: 'retry' }]);
    expect(readNight(runsDir, night)?.rows[0]).toEqual({
      job: valid.job, owner: valid.owner, runs: 2, retries: 1, lastStatus: 'ok',
      lastError: null, firstAt: '2026-10-28T20:00:00Z', lastAt: valid.at,
    });
  });

  it('breaks equal-instant ties by file order for first, latest and error', () => {
    writeEvents([
      { ...valid, error: 'first error' },
      { ...valid, at: '2026-10-28T22:00:00Z', owner: null, status: 'retry', error: 'last error' },
      { ...valid, at: '2026-10-28T17:00:00-05:00', owner: 'last-owner', status: 'fail' },
    ]);
    expect(readNight(runsDir, night)?.rows[0]).toEqual({
      job: valid.job, owner: 'last-owner', runs: 3, retries: 1, lastStatus: 'fail',
      lastError: 'last error', firstAt: valid.at, lastAt: '2026-10-28T17:00:00-05:00',
    });
  });

  it('keeps null owners, empty error strings, and sorts by simple string comparison', () => {
    writeEvents(['z', 'a', 'Z', 'A', '__proto__'].map(job => ({ ...valid, job, owner: null, error: '' })));
    const rows = readNight(runsDir, night)?.rows;
    expect(rows?.map(row => row.job)).toEqual(['A', 'Z', '__proto__', 'a', 'z']);
    expect(rows?.every(row => row.owner === null && row.lastError === '')).toBe(true);
  });

  it('counts malformed nonblank JSON and schema violations without losing valid events', () => {
    const { at, ...withoutAt } = valid;
    const { job, ...withoutJob } = valid;
    const { owner, ...withoutOwner } = valid;
    const { status, ...withoutStatus } = valid;
    const malformed = [
      null, [], 1, true, 'event', {}, withoutAt, withoutJob, withoutOwner, withoutStatus,
      { ...valid, at: 123 }, { ...valid, job: null }, { ...valid, owner: 123 },
      { ...valid, status: 'unknown' }, { ...valid, error: null }, { ...valid, error: 123 },
      ...['not a date', '2026-10-28', '2026-10-28T23:00:00', '2026-13-28T00:00:00Z',
        '2026-10-28T25:00:00Z', '2026-10-28T23:00:00+25:00'].map(at => ({ ...valid, at })),
    ];
    const lines = [JSON.stringify(valid), '', ' \t\r', '{broken', ...malformed.map(event => JSON.stringify(event)), JSON.stringify(valid)];
    writeFileSync(join(runsDir, `${night}.jsonl`), lines.join('\n'));
    const result = readNight(runsDir, night);
    expect(result?.badLines).toBe(malformed.length + 1);
    expect(result?.rows).toHaveLength(1);
    expect(result?.rows[0].runs).toBe(2);
    expect(result?.counts).toEqual({ ok: 2, retry: 0, fail: 0 });
  });

  it('accepts fractional seconds, leap days and timezone offsets', () => {
    writeEvents([
      { ...valid, at: '2024-02-29T12:30:45.123Z' },
      { ...valid, at: '2024-02-29T12:30+0530' },
    ]);
    expect(readNight(runsDir, night)?.badLines).toBe(0);
    expect(readNight(runsDir, night)?.rows[0].runs).toBe(2);
  });

  it('returns null only for a missing file, including a missing runs directory', () => {
    expect(readNight(runsDir, night)).toBeNull();
    expect(readNight(join(runsDir, 'missing'), night)).toBeNull();
  });

  it.each(['', '\n \t\r\n'])('returns an empty digest for an existing blank file', contents => {
    writeFileSync(join(runsDir, `${night}.jsonl`), contents);
    expect(readNight(runsDir, night)).toEqual({ rows: [], badLines: 0, counts: { ok: 0, retry: 0, fail: 0 } });
  });

  it.each(['../2026-10-28', '/2026-10-28', '2026-10-28/child', '2026-10-28\\child',
    '2026-10-28.jsonl', '2026-1-28', '', '2026-10-28\n', '2026-10-28\0'])('rejects unsafe or malformed night %j', value => {
    expect(() => readNight(runsDir, value)).toThrow(TypeError);
  });

  it('propagates actual filesystem errors', () => {
    const file = join(runsDir, 'not-a-directory');
    writeFileSync(file, '');
    expect(() => readNight(file, night)).toThrow(expect.objectContaining({ code: 'ENOTDIR' }));
  });
});
