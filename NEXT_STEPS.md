# SumTube Next Steps

## 1. Complete OAuth configuration

- Create a Google OAuth client of type Chrome Extension.
- Replace `oauth2.client_id` in `public/manifest.json`.
- Reload extension in `chrome://extensions` and verify sign-in/sign-out works.

## 2. Add real Gemini summarization

- Replace placeholder handlers in `src/background/index.ts` with Gemini API calls.
- Add request helpers for:
  - short card summaries (feed)
  - article mode summaries (watch page)
- Handle rate limits and API failures with readable fallback messages.

## 3. Build transcript/content extraction

- Extract video metadata and transcript signals from YouTube page context.
- Send compact input payloads from `src/content/index.ts` to background.
- Support no-transcript videos with graceful degradation.

## 4. Add caching

- Cache summaries by video ID and mode (card vs article).
- Store cache in `chrome.storage.local` with TTL.
- Add invalidation logic for stale entries.

## 5. Improve YouTube UI coverage

- Validate behavior across home, search, subscriptions, watch, and channel pages.
- Tighten selectors for dynamic navigation and lazy-loaded sections.
- Ensure Shorts suppression covers all major entry points.

## 6. Add privacy and controls

- Add a clear in-popup disclosure of what data is sent for summarization.
- Add toggle to disable AI features per page/session.
- Add a one-click cache clear action in popup.

## 7. Stabilize release workflow

- Add lightweight tests for message handlers and selector transformations.
- Add lint/check/build to CI.
- Add release notes and version bump flow for extension updates.