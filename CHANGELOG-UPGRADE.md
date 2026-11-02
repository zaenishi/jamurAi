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
