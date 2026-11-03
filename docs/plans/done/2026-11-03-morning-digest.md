---
plan: morning-digest
status: done
owner: rook
opened: 2026-10-29
closed: 2026-11-03
---

# Morning digest

The night's run log is a JSONL file nobody reads. By breakfast someone has to know what ran,
what retried, what failed, and whose it was, without opening `runs/`. rig already serves the
status board; the digest is one more page on it.

Out of scope: notifications, history across nights, auth (rig only listens on localhost).

## 1. Run log reader

Read `runs/<night>.jsonl` into one row per job: job, owner, runs, retries, last status, last
error, first and last time. One JSON object per line (`at`, `job`, `status`: `ok | retry | fail`,
`owner`, optional `error`).

- A line that doesn't parse is counted, never thrown. The night still renders.
- `owner` can be `null`. Keep the row; show the owner as `—`.
- Lives in `src/digest/`. Commit `src/digest/types.ts` first (the `DigestRow` type and the
  `readNight(runsDir, night)` signature), so every part of section 2 can start against it.

Done when: reader tests pass on `runs/2026-10-28.jsonl` (5 jobs, 1 bad line).

## 2. Digest page

Four small parts. Each needs only `src/digest/types.ts` from section 1, so once that is in they
can go to four workers at once. Small, well-specified work: a cheaper model is fine here.

### 2a. Page

`GET /digest/:night` renders the rows with the usual layout: one table, sorted by job, retries of
3 or more and any `fail` marked. A night with no file returns 404; an empty file renders
"nothing ran".

Done when: `/digest/2026-10-28` renders locally.

### 2b. JSON

`GET /api/digest/:night` returns the same rows as JSON. Agents read this one; the page and the
JSON must never disagree (ADR 0001).

Done when: the JSON for 2026-10-28 has the same jobs, in the same order, as the page.

### 2c. Board link

The status board links each night on disk to its digest, with its ok / retry / fail counts beside
it.

Done when: both nights on disk link to a digest that renders.

### 2d. Route tests

Route tests for 2a and 2b: 200, 404 for a night with no file, the empty night, a night with a bad
line. Use a temp runs dir; `runs/` is read-only.

Done when: `pnpm test` is green with the new tests.

## 3. Preview for review

The reviewer reads the page from a copy, not from the lane. Run rig and save `/digest/2026-10-28` as
one HTML file, lane banner included (a command, not a browser's "save as"; the page is
self-contained, ADR 0001). Put it on your own public host, one where you can upload over it later (any bucket
or static host, ADR 0003), so it opens from a public HTTPS link. Send the reviewer the link and the
issues for this plan.

Done when: the preview link is sent to the reviewer and the course confirms that the reviewer has actually looked.

Course clarification after the first submission: keep the preview issue open while review is pending. Acceptance of the link alone does not complete review.

## 4. Clean up

The preview carries this lane's marker on a public link (ADR 0003). Take the marker off: save the
page again with `LANE_MARKER` unset (the banner reads "no marker set") and upload it over the same
link. Move this plan to `docs/plans/done/` with its issue list.

Done when: the preview link no longer shows the lane marker.

## Issues

| Issue | Source section | Blocked by | Primary worker | Completed |
| --- | --- | --- | --- | --- |
| [#1 Digest contract](https://github.com/mayesidev/mega-before-i-looked/issues/1) | § 1 | — | Codex · gpt-6-astra · high | 2026-11-03 |
| [#2 Run-log reader](https://github.com/mayesidev/mega-before-i-looked/issues/2) | § 1 | #1 | Codex · gpt-6-astra · high | 2026-11-03 |
| [#3 Digest page](https://github.com/mayesidev/mega-before-i-looked/issues/3) | § 2a | #1; #2 for completion | Codex · gpt-6-luna · low | 2026-11-03 |
| [#4 Digest JSON](https://github.com/mayesidev/mega-before-i-looked/issues/4) | § 2b | #1; #2 for completion | Codex · gpt-6-luna · low | 2026-11-03 |
| [#5 Board links](https://github.com/mayesidev/mega-before-i-looked/issues/5) | § 2c | #1; #2/#3 for completion | Codex · gpt-6-luna · low | 2026-11-03 |
| [#6 Route tests](https://github.com/mayesidev/mega-before-i-looked/issues/6) | § 2d | #1; #2–#4 for completion | Codex · gpt-6-luna · low | 2026-11-03 |
| [#7 Preview and actual review](https://github.com/mayesidev/mega-before-i-looked/issues/7) | § 3 | #2–#6; publication approval | Codex · gpt-6.1-sol · high | 2026-11-03 |
| [#8 Preview cleanup](https://github.com/mayesidev/mega-before-i-looked/issues/8) | § 4 | #7; actual review; overwrite approval | Codex · gpt-6.1-sol · high | 2026-11-03 |

Each issue was implemented on its own branch. Review fixes for #3 and #6 were made by Codex · gpt-6.1-sol · high; their issue comments record both the primary worker commits and the follow-up commits.

## Completion evidence

- All 27 tests and the TypeScript check passed locally and in both deployment runs. Original run fixtures are unchanged.
- The first attempt was rejected because the preview issue was closed before actual review. It was reopened; its acceptance condition and this plan were corrected, then the course explicitly confirmed that the reviewer had seen the page before #7 closed.
- [Marked deployment](https://github.com/mayesidev/mega-before-i-looked/actions/runs/41589265444) and [approved unmarked replacement](https://github.com/mayesidev/mega-before-i-looked/actions/runs/41645185224) succeeded.
- [The same public preview URL](https://mayesidev.github.io/mega-before-i-looked/) returns the same digest with only the banner changed to `no marker set`. The marker is absent. The original marked artifact and temporary Actions marker secret were deleted. No preview or marker was committed.
- The course claim and debrief are separate from plan completion; private response records stay outside this repository.
