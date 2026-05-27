# Sunlit Sudoku

A daily 9×9 Sudoku game — pencil notes, hints, peer/number highlighting, a
rainbow palette, light/dark themes, and per-difficulty best-time tracking.
Installable as a PWA.

**Live:** https://games.beric.ca/sudoku/

## Stack

- Vanilla HTML/CSS/JS — no framework (`index.html`, `app.js`, `styles.css`)
- Installable PWA (`manifest.webmanifest` + `service-worker.js`)
- [bun](https://bun.sh) for the icon build script
- Hosted on **Cloudflare Pages** (project `games-portal`, domain `games.beric.ca`)

## Project layout

```
index.html / app.js / styles.css   # game source (root = dev copy)
scripts/
  build-icons.mjs                   # generates PWA icons via sharp
  deploy.sh                         # deploys deploy/ to Cloudflare Pages
  list-deployments.sh               # lists recent Pages deployments
deploy/                             # what actually ships to games.beric.ca
  index.html                        # games portal landing page  →  /
  sudoku/                           # the Sudoku app             →  /sudoku/
    index.html, app.js, styles.css  # kept in sync with the root copies
    manifest.webmanifest, service-worker.js, icon-*.png, apple-touch-icon.png
```

The `games.beric.ca` Pages project is a multi-game portal: the landing page is
served at `/` and this game is mounted at `/sudoku/` (the PWA `scope` and
`start_url` are both `/sudoku/`).

## Develop

Open `index.html` directly, or serve the folder for correct PWA/service-worker
behavior:

```bash
bunx serve .          # then visit the printed localhost URL
```

Regenerate PWA icons after changing the source art:

```bash
bun run build:icons   # scripts/build-icons.mjs (uses sharp)
```

## Deploy

```bash
bun run deploy              # production (branch=main) → https://games.beric.ca/sudoku/
./scripts/deploy.sh preview # preview branch
./scripts/list-deployments.sh
```

`deploy.sh` deploys the `deploy/` directory to the Cloudflare Pages project
`games-portal`. Each deploy:

- appends `?v=<git-short-sha>` to local CSS/JS refs (browser cache-bust), and
- stamps the service-worker cache version (`__SW_VERSION__` → SHA) so the PWA
  cache invalidates per release.

Requires a Cloudflare **Global API Key** in `~/Arik/dev/.env` (override the
path with `ENV_FILE=/path/to/.env`).

> When editing the game, update both the root copies **and** `deploy/sudoku/`
> (`index.html`, `app.js`, `styles.css`) — they must stay in sync; only the
> `deploy/` tree is shipped.
