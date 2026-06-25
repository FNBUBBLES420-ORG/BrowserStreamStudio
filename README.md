# BrowserStream Studio

🎥 BrowserStream Studio is a Windows desktop streaming control app for creators who want one place to manage their setup before going live.

Instead of juggling separate tools for stream settings, scenes, account connections, and recordings, BrowserStream Studio puts those pieces into a single desktop app. You can set up your stream destination, prepare scenes, preview your camera or screen, connect supported platforms, and manage your local streaming workflow from one interface.

## ✨ What This App Is For

BrowserStream Studio is designed for people who want to:

- 🚀 get a stream ready faster
- 🎬 preview video before going live
- 🎭 organize scenes and source layouts
- 🔗 connect creator accounts in one place
- 💾 keep track of recordings locally
- ⚙️ change quality, device, and output settings without digging through multiple apps

## 🧩 What You Can Do In BrowserStream Studio

- 🎥 Preview your camera before starting a stream
- 🖥️ Preview screen sharing before going live
- 🎭 Create scenes with webcam, screen, image, text, window, and browser sources
- 🛜 Stream to a custom RTMP destination
- 🔗 Connect Twitch, YouTube, and Kick
- 🗓️ Schedule stream sessions ahead of time
- 💾 Browse recordings saved on your device
- ⚙️ Adjust bitrate, resolution, devices, and output options
- 🧰 Use built-in setup and management tools
- 🧩 Install and run local plugins
- 🛟 Export, import, or reset app data if needed

## 🖥️ Download And Install

Download the Windows installer from:

[GitHub Releases](https://github.com/FNBUBBLES420-ORG/BrowserStreamStudio/releases)

Installer name:

`BrowserStream Studio Setup 0.1.4.exe`

To install:

1. Download `BrowserStream Studio Setup 0.1.4.exe`
2. Double-click the installer
3. Follow the setup steps on screen
4. Open BrowserStream Studio from your desktop or Start menu

If Windows asks for permission to run the installer, choose `Yes`.

## 🚀 First-Time Setup

If this is your first time using the app, the simplest flow is:

1. Open BrowserStream Studio
2. Go through the built-in setup wizard
3. Open `Settings`
4. Choose your resolution, bitrate, devices, and output type
5. Add your provider details if you want to connect Twitch, YouTube, or Kick
6. Open `Accounts` and complete the connection flow
7. Set your stream title, category, and destination
8. Open `Stream` and preview your camera or screen
9. Start your stream when everything looks ready

If you do not want to connect a provider account, you can still use a custom RTMP target.

## 🧭 Main Sections Of The App

- 🏠 `Dashboard`
Shows setup progress, notifications, and account status

- 🧙 `Wizard`
Guides first-time setup step by step

- 🎥 `Stream`
Lets you preview video and control starting or stopping a stream

- 🎭 `Scenes`
Lets you create and manage scenes and their sources

- 🗓️ `Schedule`
Lets you prepare upcoming streams ahead of time

- 💾 `Recordings`
Lets you browse saved recordings on your device

- 👤 `Accounts`
Handles supported provider account connections

- ⚙️ `Settings`
Controls stream quality, devices, preferences, and destinations

- 🧩 `Plugins`
Lets you install, view, run, and remove local plugins

## 🔗 Supported Platforms

BrowserStream Studio currently supports:

- Twitch
- YouTube
- Kick
- Custom RTMP targets

Typical connected-account setup:

1. Open `Settings`
2. Enter the provider client ID and client secret
3. Save your settings
4. Open `Accounts`
5. Complete the connection flow

## 📦 What Gets Stored Locally

BrowserStream Studio stores its working data on your device.

This can include:

- stream and desktop preferences
- connected account details
- scenes and scene sources
- scheduled stream information
- chat history and moderation shortcuts
- recordings and studio notes
- plugin definitions

## 🔒 Security Snapshot

- 🧱 Renderer access is isolated through the preload bridge
- 🧼 Backend input is sanitized before saving
- 🛡️ Sessions, rate limiting, and security headers are enabled
- 🧩 Plugins run in a restricted sandbox

See `SECURITY.md` for full reporting guidance and scope.

## 🧩 Plugin Notes

Plugins are local extensions that run in a restricted sandbox. They are intended for controlled in-app extensions, not unrestricted third-party code execution.

## 📄 License

This repository includes the GNU GPL v3 license text in `LICENSE`.
