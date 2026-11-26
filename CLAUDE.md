# HSE Vision — team instructions for Claude

Shared by the whole team. **Anyone may edit this file**: when you learn something the next person (or their Claude) should know, add it here in the relevant section, in the same PR as your work. Keep entries short and delete anything that stops being true.

## What this project is

Visual HSE: a Health, Safety and Environment monitoring product for factories.

| Path | Role |
|---|---|
| `src/`, `build.py`, `fonts/` | Static prototype. `python build.py` inlines it into one offline `Visual HSE.html`. |
| `web/` | The main Next.js app (pages under `web/app`, UI in `web/components`, data/config in `web/lib`). Includes the HeatShield heat-risk module, the live 3D spatial site view, and Camera analysis (`/camera`, `/camera/setup`). |
| `HSE_Camera_Module_Docs/` | Plan for the camera module: PPE detection, person tracking, restricted-zone alerts and spill detection on recorded factory video. |
| `vision-service/` | Python FastAPI service for Camera analysis uploads: converts the clip, detects and tracks people (YOLO + ByteTrack). Setup in its README. |
| `DESIGN.md` | Visual language for the prototype. Read before changing UI. |
| `_backup/` | Original HTML. Do not edit. |

## Git workflow

- Everyone works on their **own branch** (for example `arham/dev`). Never commit or push directly to `main`.
- Before starting any work: `git checkout <your-branch> && git pull origin main`.
- When work is ready: push your branch and open a **pull request into `main`**. The admin reviews and merges. Do not merge your own PR.
- Commit and push as yourself: your own GitHub account and your own configured name and email. Never use a shared account or SSH key, and never override identity with `git -c user.name=` or `-c user.email=`.
- Remote is `usman531509-beep/HSE-vision`, reached over SSH through the `github-qubit` host alias (key `id_ed25519_qubit`). Check `ssh -T git@github-qubit` greets your own account before pushing.

## Tooling rules

- Package manager is **pnpm** only. Never npm, npx, yarn or bun. `web/pnpm-lock.yaml` is the lockfile; commit it with dependency changes.
- Verify with `pnpm run typecheck` (run inside `web/`; it runs `next typegen` first so route types exist). Do not run a production build to hunt for errors, and do not open a browser or take screenshots unless asked.
- `web/` uses a Next.js version with breaking changes. Read the relevant guide in `web/node_modules/next/dist/docs/` before writing Next.js code. See `web/AGENTS.md`.

## Code and UI conventions

- DRY, KISS, YAGNI. Declare each route, color, API path and constant once and reference it everywhere.
- One responsibility per file. Feature modules must not import from each other; shared code goes in a common location (`web/lib`, `web/components`).
- async/await over callbacks, early returns over nesting, explicit error handling, comments explain why not what.
- Containers are separated by background contrast and shadow, not borders. Interactive states change background color. Focus styles must always be visible; icon-only controls need accessible labels.
- Modals go through one global provider, trap focus, close on Escape and overlay click, and have an accessible title.

## Notes from the team

Add dated, one-line learnings below (gotchas, decisions, "don't do X because Y").

- 2026-11-26 · Camera module data lives in SQLite (`node:sqlite`, Node ≥ 22.13) at `web/data/`, git-ignored and seeded with sample clips on first run. On Vercel (read-only disk) it runs as a read-only preview from memory; set `CAMERA_STORAGE=local` on a server with a disk to save.
- 2026-11-26 · With `cacheComponents` on, GET route handlers that read SQLite must call `await connection()` first, or they are prerendered at build. API handlers are wrapped by `web/lib/server/route.ts`, which calls `unstable_rethrow` so Next's own signals pass through.
- 2026-11-26 · `error.tsx` in this Next version receives `retry`, not `reset`.
- 2026-11-26 · Load third-party model weights as ONNX, not `.pt`: a `.pt` file is a pickle and can run code. Pin the download to a revision and check its SHA-256 (see `vision-service/ppe.py`).
- 2026-11-26 · Camera events are stored server-side (`events` table) and rebuilt by `refreshEvents` in `camera-db.ts` whenever a video completes or a camera, area or gear rule changes. Any new write that can change events must call it (outside a transaction). Reviews stay in their own table keyed by the deterministic event id.
- 2026-11-26 · Live cameras: the vision service (`live.py`) cuts each stream into clips and calls `/api/cameras/[id]/live/[clipId]`; the app imports a clip like an upload and keeps it only if it produced events. Test locally with `vision-service/fake_camera.py`. When testing the API from Git Bash, send non-ASCII text (for example "·") with Node, not curl: curl sends it in the Windows code page and corrupts it.
- 2026-11-26 · Heat tab's 7-day outlook uses the live Open-Meteo forecast (free, no key) through `/api/heat/outlook`: fetched server-side in a `'use cache'` helper (`cacheLife('hours')`), and the route calls `await connection()` so a build never bakes in a failed fetch. Site coordinates live in `web/lib/heat/outlook/config.ts`.
- 2026-11-26 · Tailwind v4 does not pick between two classes for the same property by their order (`bg-sunk` plus `bg-paper`, `h-11` plus `h-7`). Use the `!` override (as `Card` does with `bg-sage!`) or let the caller replace the default class.
