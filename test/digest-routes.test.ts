import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

const night = '2026-10-28';
const firstAt = '2026-10-28T23:00:00+01:00';
const lastAt = '2026-10-29T00:30:00+02:00';
const configBase = { adapter: 'shim', installed: '2026-10-29T14:06:00+01:00', beatEverySeconds: 60 };
let runsDir: string;

function writeNight(lines: string[], name = night) {
  writeFileSync(join(runsDir, `${name}.jsonl`), lines.join('\n'));
}

function event(job: string, at: string, status: 'ok' | 'retry' | 'fail', extra: Record<string, unknown> = {}) {
  return JSON.stringify({ owner: 'owner-a', at, job, status, ...extra });
}

beforeEach(() => { runsDir = mkdtempSync(join(tmpdir(), 'rig-digest-routes-')); });
afterEach(() => { rmSync(runsDir, { recursive: true, force: true }); });

describe('digest routes', () => {
  it('serves HTML and JSON from the same sorted digest rows with every field intact', async () => {
    const beta = [
      event('zeta', firstAt, 'retry', { owner: null }),
      event('alpha', firstAt, 'retry', { error: 'first failure' }),
      event('zeta', lastAt, 'fail', { owner: null, error: '<script>alert("x")</script>' }),
      event('alpha', lastAt, 'retry', { error: 'latest error' }),
      event('alpha', '2026-10-29T00:45:00+02:00', 'retry'),
      event('alpha', '2026-10-29T01:00:00+02:00', 'ok'),
      '{bad json',
    ];
    writeNight(beta);
    const app = createApp({ ...configBase, runsDir });
    const [htmlRes, jsonRes] = await Promise.all([
      app.request(`/digest/${night}`), app.request(`/api/digest/${night}`),
    ]);
    const html = await htmlRes.text();
    const json = await jsonRes.json();

    expect(htmlRes.status).toBe(200);
    expect(jsonRes.status).toBe(200);
    expect(json).toEqual({
      rows: [
        { job: 'alpha', owner: 'owner-a', runs: 4, retries: 3, lastStatus: 'ok', lastError: 'latest error', firstAt, lastAt: '2026-10-29T01:00:00+02:00' },
        { job: 'zeta', owner: null, runs: 2, retries: 1, lastStatus: 'fail', lastError: '<script>alert("x")</script>', firstAt, lastAt },
      ],
      badLines: 1,
      counts: { ok: 1, retry: 4, fail: 1 },
    });
    expect(html).toContain('malformed lines: 1');
    expect(html).toContain('—');
    expect(html.indexOf('alpha')).toBeLessThan(html.indexOf('zeta'));
    expect(html).toContain('latest error');
    expect(html).toContain(firstAt);
    expect(html).toContain(lastAt);
    expect(html).toContain('2026-10-29T01:00:00+02:00');
    expect(html).toContain('&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;');
    expect(html).not.toContain('<script>alert("x")</script>');
    expect(html).toContain('<td class="warn">3</td>');
    expect(html).toContain('<td class="warn">fail</td>');
  });

  it('serves the exact same job order and fields for the public fixture nights', async () => {
    const app = createApp({ ...configBase, runsDir: 'runs' });
    for (const fixtureNight of ['2026-10-28', '2026-10-27']) {
      const [htmlRes, jsonRes] = await Promise.all([
        app.request(`/digest/${fixtureNight}`), app.request(`/api/digest/${fixtureNight}`),
      ]);
      const html = await htmlRes.text();
      const digest = await jsonRes.json();
      expect(htmlRes.status).toBe(200);
      expect(jsonRes.status).toBe(200);
      const cells = [...html.matchAll(/<tr>([\s\S]*?)<\/tr>/g)]
        .map((row) => [...row[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((cell) => cell[1]))
        .filter((row) => row.length > 0);
      expect(cells).toEqual(digest.rows.map((row: {
        job: string; owner: string | null; runs: number; retries: number;
        lastStatus: string; lastError: string | null; firstAt: string; lastAt: string;
      }) => [row.job, row.owner, row.runs, row.retries, row.lastStatus, row.lastError, row.firstAt, row.lastAt]
        .map((value) => value === null || value === '' ? '—' : String(value))));
      let previous = -1;
      for (const row of digest.rows) {
        const position = html.indexOf(row.job);
        expect(position).toBeGreaterThan(previous);
        previous = position;
        for (const value of Object.values(row)) {
          if (value !== null && value !== '') expect(html).toContain(String(value));
        }
      }
      expect(digest.rows).toEqual([...digest.rows].sort((a: { job: string }, b: { job: string }) => a.job < b.job ? -1 : a.job > b.job ? 1 : 0));
    }
  });

  it('returns 404 for absent files and malformed or encoded trailing-newline nights', async () => {
    const app = createApp({ ...configBase, runsDir });
    const paths = ['/digest/2026-10-29', '/api/digest/2026-10-29', '/digest/nope', '/api/digest/nope',
      '/digest/2026-10-28%0A', '/api/digest/2026-10-28%0A'];
    for (const path of paths) expect((await app.request(path)).status).toBe(404);
  });

  it('renders an existing empty night in both formats', async () => {
    writeNight([]);
    const app = createApp({ ...configBase, runsDir });
    const [htmlRes, jsonRes] = await Promise.all([
      app.request(`/digest/${night}`), app.request(`/api/digest/${night}`),
    ]);
    expect(htmlRes.status).toBe(200);
    expect(await htmlRes.text()).toContain('nothing ran');
    expect(jsonRes.status).toBe(200);
    expect(await jsonRes.json()).toEqual({ rows: [], badLines: 0, counts: { ok: 0, retry: 0, fail: 0 } });
  });
});
