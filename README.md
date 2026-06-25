# BrowserStream Studio

🎥 BrowserStream Studio is a Windows desktop app built to help creators manage their stream setup from one place. It brings together stream controls, scenes, account connections, recordings, and setup tools so you do not have to jump between multiple apps just to go live.

## ✨ What BrowserStream Studio Does

BrowserStream Studio helps you:

- 🎬 preview your camera or screen before going live
- 🚀 start and stop streams from one desktop app
- 🎭 build scenes with webcam, screen, image, text, window, and browser sources
- 🔗 connect supported streaming providers like Twitch, YouTube, and Kick
- 🗓️ schedule upcoming streams
- 💾 browse local recordings
- ⚙️ manage bitrate, resolution, devices, and output destinations
- 🧩 install and run local plugins
- 🛟 export, import, or reset your app data when needed

## 🖥️ Windows Installer

To install BrowserStream Studio on Windows:

Download the installer from:

[GitHub Releases](https://github.com/FNBUBBLES420-ORG/BrowserStreamStudio/releases)

1. Download `BrowserStream Studio Setup 0.1.4.exe`
2. Double-click the installer file
3. Follow the setup steps on screen
4. Open BrowserStream Studio from your desktop or Start menu

If Windows asks for permission to run the installer, choose `Yes`.

## 🚀 How To Use The App

If you are opening BrowserStream Studio for the first time, this is the easiest flow:

1. Open the app and go through the setup wizard
2. Open `Settings` and choose your stream quality, devices, and output options
3. Add your provider details if you want to connect Twitch, YouTube, or Kick
4. Open `Accounts` and finish the account connection flow
5. Set your stream title, category, and destination
6. Preview your camera or screen in the `Stream` area
7. Start your stream when everything looks ready

You can also use a custom RTMP server if you do not want to connect a provider account.

## 🧭 Main Areas In The App

- 🏠 `Dashboard`
Shows setup progress, notifications, and account status

- 🧙 `Wizard`
Helps first-time users get through setup step by step

- 🎥 `Stream`
Lets you preview video and control when your stream starts or stops

- 🎭 `Scenes`
Lets you create and manage stream scenes and sources

- 🗓️ `Schedule`
Lets you prepare upcoming streams in advance

- 💾 `Recordings`
Lets you browse saved recordings on your device

- 👤 `Accounts`
Handles provider connections for supported platforms

- ⚙️ `Settings`
Controls stream quality, devices, preferences, and destinations

- 🧩 `Plugins`
Lets you install, view, run, and remove local plugins

## 🔗 Supported Provider Flow

BrowserStream Studio currently supports Twitch, YouTube, and Kick.

Typical setup:

1. Open `Settings`
2. Enter the provider client ID and client secret
3. Save your settings
4. Open `Accounts`
5. Complete the connection flow

You can also stream to a custom RTMP target without connecting a provider account.

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

- 🧱 renderer access is isolated through the preload bridge
- 🧼 backend input is sanitized before saving
- 🛡️ sessions, rate limiting, and security headers are enabled
- 🧩 plugins run in a restricted sandbox

See `SECURITY.md` for full reporting guidance and scope.

## 🧩 Plugin Notes

Plugins are local extensions that run in a restricted sandbox. They are designed for controlled in-app extensions, not unrestricted third-party code execution.

## 📄 License

This repository includes the GNU GPL v3 license text in `LICENSE`.
