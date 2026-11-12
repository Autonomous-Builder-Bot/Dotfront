# Dotfront — Playgama release build

The Playgama work lives ONLY on feature/playgama-monetization. Main and the public GitHub Pages PWA remain unchanged.

## Free ZIP download

1. Open https://github.com/Autonomous-Builder-Bot/Dotfront/actions/workflows/playgama-build.yml
2. Choose the latest green run on feature/playgama-monetization.
3. Under Artifacts, download dotfront-playgama-upload.
4. Extract GitHub's outer artifact ZIP to obtain dotfront-playgama.zip.
5. Upload that INNER dotfront-playgama.zip to Playgama. index.html is at the root of this archive.

To build locally with Node.js 18+:

    node --test tests/playgama.test.cjs
    node scripts/build-playgama.mjs

The upload archive will be generated as dist/dotfront-playgama.zip. No paid software or domain is required.

## Features

- Official Playgama Bridge v2 stable CDN, with a version requirement of 2.2.0 or newer.
- Bridge cloud/local progress and tutorial saves, loaded before the game launches.
- Platform pause, audio and lifecycle messages, including game_ready.
- Original Web Audio cues and a Sound On / Muted button.
- Interstitial opportunities after levels 5, 10, 15, etc., first-time completion only.
- Minimum eight minutes between opened ads and a limit of two opened ads per session.
- No ads at launch, while fighting or on replay.
- No block on progression if an ad fails, is unsupported or cannot load.
- No Google Ads code, PWA service worker or install manifest in the Playgama ZIP.

## Manual Playgama submission

1. Sign in at https://developer.playgama.com/ and first check for existing Dotfront drafts. Codex may already have staged a build and uploaded covers.
2. Create or edit the draft; fill in the information in playgama/submission-notes.md.
3. Upload the inner ZIP. Wait for extraction and Bridge validation.
4. Confirm three square, portrait, landscape PNG/JPEG covers are attached: 800x800, 1080x1920, and 1920x1080. Codex claimed to have uploaded them; reuse them if present.
5. Run Test Game / QA Tool: check both orientations, touch selection, tutorial upgrades, replay, progress, muting, resume after failed ad.
6. Publish sandbox only when you are comfortable with a publicly accessible test URL.
7. Submit to moderation yourself when ready. Final moderation submission is a human-only step.
8. Request or check monetization eligibility; ads are not guaranteed simply because Bridge is integrated.

## What is NOT proven yet

Passing Node tests and a valid ZIP do not prove actual iPhone interactions, hosted Playgama QA, active ad fill or revenue. Test those on the hosted build.

Official docs: https://wiki.playgama.com/playgama/mcp.md and https://wiki.playgama.com/playgama/game-requirements.md.

Do not merge into main until the Playgama release is validated.