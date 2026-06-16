# Security Policy

## Supported versions

Security fixes are only guaranteed for the latest code on the `main` branch and the most recent tagged release, if one exists.

Older snapshots, forks, and unpublished local builds should be treated as unsupported.

## Report a vulnerability

Do not open a public GitHub issue for a suspected security vulnerability.

Use a private reporting channel if one is available on the repository. If no private advisory flow is configured yet, contact the maintainers directly before publishing details and include:

- a short description of the issue
- affected area or file
- reproduction steps
- expected impact
- any suggested remediation

If you are unsure whether something is security-sensitive, report it privately first.

## What is in scope

The current app includes these security-relevant areas:

- Electron desktop shell and preload bridge
- local Express backend APIs
- OAuth provider connection flows for Twitch, YouTube, and Kick
- local JSON persistence and import or export flows
- plugin installation and plugin execution sandboxing
- stream start and stop orchestration through FFmpeg
- frontend pages that collect or display provider, stream, chat, and recording data

## Current security controls

The repository currently implements these baseline controls:

- Electron renderer isolation with `contextIsolation: true`
- Electron renderer `nodeIntegration: false`
- desktop functionality exposed through a preload bridge instead of direct renderer Node access
- backend request hardening with Helmet
- backend CORS restrictions for the configured frontend origin
- request rate limiting
- session middleware for auth state
- input sanitization for plain text, URLs, stream keys, scene data, scheduler data, and provider profile data
- provider allow-lists for supported integrations
- plugin code screening against blocked patterns such as `require`, `eval`, `Function`, dynamic import, and direct network primitives
- plugin execution inside a VM sandbox with disabled string and WebAssembly code generation and a timeout
- production frontend Content Security Policy

## Security assumptions and limits

- The backend is intended to run locally with the desktop app, not as a hardened multi-tenant internet service.
- Provider credentials and local app state are stored on the user machine. Machine compromise is out of scope for app-level protections.
- The plugin system is restricted, but it should still be treated as a higher-risk area than ordinary UI configuration.
- FFmpeg availability and stream destination validity are checked, but safe streaming still depends on user-supplied provider and RTMP configuration.

## Recommended responsible disclosure timeline

- allow a reasonable private remediation window before public disclosure
- avoid posting proof-of-concept details publicly until a fix or mitigation is available
- coordinate disclosure notes with maintainers when possible

## User guidance

If you run this app locally:

- keep provider credentials out of screenshots and screen recordings
- do not commit `.env` files or local runtime data
- review plugins carefully before installing or executing them
- prefer the latest `main` branch or latest release when testing security-sensitive fixes
