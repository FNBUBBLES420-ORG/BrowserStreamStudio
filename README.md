# BrowserStream Studio

BrowserStream Studio is a Windows desktop app for managing your stream setup in one place. You can connect accounts, prepare scenes, preview your camera or screen, manage recordings, and control your stream from a single app.

## What You Can Do

- Set up your streaming workspace with a guided first-run wizard
- Preview your camera or screen before going live
- Start and stop streams while watching stream status
- Build scenes with webcam, screen, image, text, window, and browser sources
- Schedule upcoming streams
- Browse local recordings inside the app
- Connect Twitch, YouTube, and Kick accounts
- Adjust bitrate, resolution, devices, and output destinations
- Install and run local plugins
- Export, import, or reset your app data

## Windows Installer

To install BrowserStream Studio on Windows:

1. Download `BrowserStream Studio Setup 0.1.3.exe`.
2. Double-click the file to open the installer.
3. Follow the setup steps on screen.
4. Open BrowserStream Studio from your desktop or Start menu when setup is finished.

If Windows asks for permission to run the installer, choose `Yes`.

## Main Areas In The App

- Dashboard: setup progress, notifications, and account status
- Wizard: first-time setup guidance
- Stream: preview and stream controls
- Scenes: manage scenes and sources
- Schedule: set up planned streams
- Recordings: browse saved recordings
- Accounts: connect supported providers
- Settings: manage stream, device, and desktop preferences
- Plugins: install, view, run, and remove plugins

## Supported Provider Flow

BrowserStream Studio currently supports Twitch, YouTube, and Kick.

Typical setup:

1. Open `Settings`.
2. Enter the provider client ID and client secret.
3. Save your settings.
4. Open `Accounts` and complete the connection flow.

You can also stream to a custom RTMP target without connecting a provider account.

## Local Data And Storage

BrowserStream Studio stores its working data on your device.

This can include:

- stream and desktop preferences
- connected account details
- scenes and scene sources
- scheduled stream information
- chat history and moderation shortcuts
- recordings and studio notes
- plugin definitions

## Security Snapshot

- Renderer access is isolated through the preload bridge
- Backend input is sanitized before saving
- Sessions, rate limiting, and security headers are enabled
- Plugins run in a restricted sandbox

See `SECURITY.md` for full reporting guidance and scope.

## Plugin Notes

Plugins are local extensions that run in a restricted sandbox. They are intended for controlled in-app extensions, not unrestricted third-party code execution.

## License

This repository currently includes the GNU GPL v3 license text in `LICENSE`.
