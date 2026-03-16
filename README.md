# SumTube

SumTube is a Manifest V3 browser extension scaffold built with Bun, Vite, Svelte 5, and TypeScript.
The current baseline is aimed at YouTube detox workflows:

- hide Shorts entry points
- gray out thumbnails
- replace feed thumbnails with text cards
- hide the watch-page player and inject article mode placeholders
- keep Gemini integration in the background worker rather than in page code

## Why this setup

SvelteKit is great for web apps, but for a browser extension you usually want a lighter Vite build with explicit entry points:

- popup UI: `index.html` + `src/main.ts`
- background service worker: `src/background/index.ts`
- content script: `src/content/index.ts`
- manifest: `public/manifest.json`

This keeps extension concerns clear and avoids forcing app-style routing into the project.

## Commands

```bash
bun install
bun run dev
bun run build
bun run build:watch
bun run check
```

`bun run dev` is useful for previewing the popup UI in a normal browser tab.

`bun run build` creates `dist/`, which is the folder you load as an unpacked extension in Chrome.

## Load in Chrome

1. Run `bun run build`.
2. Open `chrome://extensions`.
3. Enable Developer mode.
4. Click Load unpacked.
5. Select the `dist` folder.

## Current architecture

The content script already applies placeholder detox behavior on YouTube pages.
The background worker already exposes message handlers for summary and article requests.
Right now those handlers return deterministic placeholder text so the extension flow can be tested before Gemini wiring is added.

## Important constraint

Do not ship a hard-coded Gemini API key inside the extension bundle.
For local prototyping you can store a user-provided key in extension storage, but for anything serious you should proxy AI requests through your own backend.

## Suggested next step

The next meaningful task is to replace the placeholder background responses with real Gemini calls plus response caching keyed by YouTube video ID.
