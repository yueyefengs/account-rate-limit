# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install      # install dependencies (only express)
npm start        # start server at http://localhost:3000
PORT=8080 npm start  # custom port
```

No build step, no test suite, no linter configured.

## Architecture

Two-file stack: `server.js` (Express backend) + `public/index.html` (self-contained frontend).

**Why a backend exists**: Browser `fetch` cannot read custom response headers like `x-ratelimit-limit-tokens` from cross-origin requests unless the server explicitly includes them in `Access-Control-Expose-Headers`. The Express backend proxies each key's request to OpenAI server-side, where all headers are accessible, then returns the extracted values as JSON.

**Request flow**:
1. Frontend POSTs `{ apiKey }` to `/api/check` (local server)
2. `server.js` calls `https://api.openai.com/v1/chat/completions` with `model: gpt-4o`, `max_tokens: 1` (minimal cost), 15 s timeout
3. Server reads `x-ratelimit-limit-tokens` and `x-ratelimit-limit-requests` headers and returns `{ httpStatus, limitTokens, limitRequests }`
4. Frontend maps `limitTokens` → tier using range thresholds (≤30K=T1, ≤450K=T2, ≤800K=T3, ≤2M=T4, >2M=T5)

**Frontend concurrency**: The browser runs N parallel calls to `/api/check` using a hand-rolled worker-pool pattern (`runConcurrent` in `index.html`). Default concurrency = 5, max = 20. Results stream into the UI as each key completes — the DOM is updated incrementally, not batched.

**Result grouping**: Results are bucketed into groups `T5 > T4 > T3 > T2 > T1 > INVALID > ERROR` (highest tier shown first). `INVALID` = HTTP 401. `ERROR` = timeout, network failure, or missing header.

## Key details

- Requires Node.js ≥ 18 (uses built-in `fetch` and `AbortSignal.timeout`)
- No authentication or rate-limiting on the `/api/check` endpoint itself — intended for local use only
- The `PORT` env var overrides the default 3000
- All tier logic lives in `TIER_DEFS` at the top of `index.html`; to add models or change thresholds, edit there
