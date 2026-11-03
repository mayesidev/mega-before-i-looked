# Morning digest review preview

Plan: `plan.md` §§ 3–4. Tracking: issues [#7](https://github.com/mayesidev/mega-before-i-looked/issues/7) and [#8](https://github.com/mayesidev/mega-before-i-looked/issues/8).

## Prepare locally

Set the course-provided marker in the ignored `.env`, then run:

```sh
pnpm install --frozen-lockfile
pnpm test
pnpm typecheck
pnpm preview
```

The command starts the service, fetches `/digest/2026-10-28`, saves one self-contained HTML file at `var/preview/index.html`, and stops the service. `var/` is ignored. It uses the template's sample data. Never commit the HTML or `.env`, or put either in issues or chat attachments.

## Publish only with human approval

After approval, enable GitHub Pages with GitHub Actions as its source, and set the course marker as the repository secret `LANE_MARKER` so workflow logs mask it. Dispatch the **Review preview** workflow on `main` with `with_marker=true`. Pushes never trigger publication.

Read back the public HTTPS page, verify its marker and five digest rows, then submit that exact URL and this repository through the course's `claim_challenge` tool. Preserve the response and follow its next action. Keep issue #7 open until the course confirms that the reviewer actually looked. Submission acceptance alone does not complete review; the course rejected the first attempt because this issue was closed too early.

## Replace only after review and separate approval

Wait for the actual course review. After the human approves replacement, dispatch the same workflow with `with_marker=false`. This overrides even a local `.env` marker with an empty environment value. Read back the exact same public URL and confirm that the banner says `no marker set` and that the marker is absent. Remove any remaining marked deployment artifact and the marker repository secret. Archive the plan with its issue list only when cleanup is verified.

The artifact expires after one day. Expiration is not a substitute for checking the live page. To take the site down, unpublish GitHub Pages in repository settings; the repository can remain.

The challenge is solved only when the course accepts the claim, followed by its debrief and a refreshed challenge-status check.
