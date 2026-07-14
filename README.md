# sudoku

Sunlit Sudoku — a zero-dependency, framework-free 9x9 Sudoku web game with pencil notes, hints, peer/number highlighting, a rainbow palette, light/dark themes, per-difficulty best times, and PWA install, live at games.beric.ca/sudoku.

## TL;DR

- **What:** "Sunlit Sudoku" — a single-page 9x9 Sudoku game with easy / medium / hard difficulty, pencil notes, hints, undo, peer + same-number highlighting, a rainbow cell palette, light/dark/auto themes, a pause overlay, and best-time tracking per difficulty. Installable as a PWA.
- **How:** Pure vanilla HTML/CSS/JS — no framework, no bundler. One base solution plus three difficulty clue masks are hard-coded in `app.js`; each "New" game applies a random Sudoku-preserving transform so the board looks fresh. State persists in `localStorage`.
- **Stack:** Vanilla JS · HTML · CSS · PWA (`manifest.webmanifest` + `service-worker.js`) · bun + `sharp` for the icon-build script.
- **Run it:** `bunx serve .` then open the printed localhost URL (a server is needed so the service worker / PWA registers).
- **Deploy:** `bun run deploy` → Cloudflare Pages project `games-portal`, live at **https://games.beric.ca/sudoku/**.

## Overview

A self-contained browser Sudoku game with no framework and no build step for the game itself. The single correct `SOLUTION` and the easy/medium/hard clue masks (`PUZZLES`) are defined directly in `app.js`. Gameplay features:

- **Difficulty** — Easy / Medium / Hard segmented control; each level has its own hard-coded clue mask.
- **Fresh boards** — the **New** button re-generates a puzzle. Rather than solving from scratch, it applies a random *Sudoku-preserving* transform to the base puzzle + solution: digit relabeling, row permutation within bands, column permutation within stacks, and an optional transpose (`createTransformPlan` / `transformBoardString`). Same underlying puzzle, different-looking board each time.
- **Pencil notes** — toggle candidate digits per cell (Notes mode).
- **Hints** — reveal one correct value; **Check** flags errors; **Reveal** fills the whole solution.
- **Undo** — step back through moves.
- **Highlighting** — peers (row/column/box) and all cells sharing the selected number light up.
- **Rainbow palette** — optional per-digit color accents.
- **Pause** — hides the board behind an overlay while the timer holds.
- **Themes** — light / dark / auto (follows `prefers-color-scheme`).
- **Stats** — live timer, mistakes count, filled/correct/notes counters, a progress meter, and per-difficulty best times persisted in `localStorage`.
- **PWA** — installable and offline-capable via a service worker scoped to `/sudoku/`; a completion celebration card appears on solve.

## Tech stack

| Layer | Technology |
|-------|-----------|
| Game | Vanilla HTML / CSS / JS (`index.html`, `app.js`, `styles.css`) — no framework, no build step |
| PWA | `manifest.webmanifest`, `service-worker.js` (scope + `start_url` = `/sudoku/`) |
| Tooling | bun runs `scripts/build-icons.mjs`; `sharp` (the only devDependency) generates the PWA icons |
| Hosting | Cloudflare Pages — project `games-portal`, domain `games.beric.ca` |

`localStorage` keys: `sunlit-sudoku:save:v1` (in-progress game), `sunlit-sudoku:theme:v1` (theme choice), `sunlit-sudoku:best-times:v1` (best time per difficulty).

## Getting started

```bash
bunx serve .        # serve the repo root, then open the printed localhost URL
bun install         # only needed for the icon script (installs sharp)
bun run build:icons # regenerate the PWA icons
```

A plain HTTP server (not `file://`) is required so the service worker registers and PWA install works.

## Architecture

Everything is client-side and hand-rolled in `app.js`:

- `SOLUTION` — one hard-coded valid 81-char board.
- `PUZZLES` — easy/medium/hard clue masks over that solution (`.` = blank).
- `createTransformPlan` + `transformBoardString` — build and apply a random isomorphism (digit map, band/stack permutations, optional transpose); `createPuzzle(difficulty, fixed)` returns either the base board (`fixed`) or a transformed variant.
- The board, keypad, notes, highlighting, timer, progress, and celebration UI are rendered/updated by direct DOM manipulation — no virtual DOM, no dependencies.

```
index.html / app.js / styles.css   # game source (repo root = dev/working copy)
package.json                       # bun scripts: build:icons, deploy
scripts/
  build-icons.mjs                  # generate PWA icons via sharp
  deploy.sh                        # deploy deploy/ to Cloudflare Pages
  list-deployments.sh             # list recent Pages deployments
deploy/                            # what actually ships to games.beric.ca
  index.html                       # games-portal landing page   ->  /
  sudoku/                          # the Sudoku app + PWA assets  ->  /sudoku/
```

The `games.beric.ca` Pages project is a multi-game portal: the landing page serves at `/` and this game is mounted at `/sudoku/`.

> **Sync gotcha (load-bearing):** when editing the game, update **both** the root copies **and** `deploy/sudoku/` (`index.html`, `app.js`, `styles.css`) — they must stay in sync. Only the `deploy/` tree ships; the repo root is the dev/working copy.

## Deployment

`scripts/deploy.sh` deploys the `deploy/` directory to the Cloudflare Pages project `games-portal` (account `4aaa700a…`) via `wrangler pages deploy`. It copies `deploy/` to a temp build dir and, per release:

- appends `?v=<git-short-sha>` to local CSS/JS refs in every HTML file (browser cache-bust), and
- stamps the service-worker cache version (`__SW_VERSION__` → SHA) so the PWA cache invalidates per deploy.

```bash
bun run deploy                   # production (branch=main)
./scripts/deploy.sh preview      # preview-branch deploy
./scripts/list-deployments.sh    # list recent Pages deployments
```

Credentials: the script reads the Cloudflare Global API Key from `~/Arik/dev/.env` (override with `ENV_FILE=…`).

## Status

Live and playable in production at **https://games.beric.ca/sudoku/**. Puzzles all derive from a single hard-coded solution — variety comes from symmetry transforms, not a constraint-solving generator, and no automated solver verifies uniqueness of transformed boards (it isn't needed, since transforms preserve validity). No test suite; the game is verified by playing it in the browser. `github-publish-repo/` and the `.codex-*` / `codex-write-test.tmp` / `.hidden-write-test` files are stray scratch artifacts, not part of the game.
