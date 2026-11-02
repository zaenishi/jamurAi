# Upgrade notes

## Frontend
- Replaced the basic chat screen with a responsive dark glass UI.
- Preserved chat, image analysis, and image generation endpoints.
- Added safe Markdown rendering, code blocks, syntax highlighting, copy controls, and status callouts.
- Added typing animation, system status, speech input/output, and voice-call mode.
- TTS strips Markdown/code/status syntax and reads a concise plain-text version.

## Server
- Removed wildcard CORS headers; frontend and API are same-origin.
- Added security headers and CSP.
- Added process-local per-route rate limiting.
- Added message/history/prompt validation and image MIME/size checks.
- Added path validation for static/download routes and document IDs.
- Replaced raw internal exception messages in HTTP 500 responses with a generic message.

## Deliberately not implemented
- DevTools blocking, debugger loops, right-click blocking, and console cleansing. These are bypassable and do not protect shipped client code or API secrets.
- Multi-instance distributed rate limiting, user authentication, and durable quotas; those require Redis/KV and an account/session model.

## Vercel compatibility patch
- Added `api/[...path].js` as the Vercel Node Serverless Function entry point.
- Exported the existing HTTP handler from `server.js`; standalone `listen()` now runs only outside Vercel.
- Added `vercel.json` rewrite for `/` to `public/index.html`.
- Reduced request body ceiling for serverless deployment and added browser-side image compression for vision uploads.
- Image generation returns a data URL on Vercel instead of writing to ephemeral function storage; local behavior remains unchanged.
- Added `VERCEL-DEPLOY.md` with GitHub import and deployment instructions.

- Added root `index.html` so Vercel can serve the static entry page directly while the local server continues using `public/index.html`.
