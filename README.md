# BrowserStream Studio

<p align="center">
   <img src="https://img.shields.io/badge/Electron-42-47848F?logo=electron&logoColor=white" alt="Electron 42" />
   <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black" alt="React 19" />
   <img src="https://img.shields.io/badge/TypeScript-Vite-3178C6?logo=typescript&logoColor=white" alt="TypeScript and Vite" />
   <img src="https://img.shields.io/badge/Node.js-18%2B-339933?logo=node.js&logoColor=white" alt="Node.js 18+" />
   <img src="https://img.shields.io/badge/Desktop-Windows%20first-FF7A59" alt="Windows first" />
   <img src="https://img.shields.io/badge/License-GPLv3-blue" alt="GPLv3" />
</p>

🎥 BrowserStream Studio is a desktop-first streaming control room built with Electron, React, and Node.js. It bundles a local backend with a desktop shell so you can set up stream destinations, connect creator accounts, preview your camera or screen, manage scenes, schedule go-live sessions, review recordings, and run sandboxed plugins from one place.

## ✨ What You Can Do

- 🖥️ Launch a desktop streaming workspace with a built-in local backend
- 🧙 Walk through first-time setup with the built-in setup wizard
- 🎬 Preview your camera or share your screen before going live
- 🚀 Start and stop streams while watching stream health and runtime status
- 🎭 Build and manage scenes with webcam, screen, image, text, window, and browser sources
- 🗓️ Schedule a stream with countdown and auto-apply options
- 💾 Browse local recordings from inside the app
- 🔐 Connect Twitch, YouTube, and Kick accounts with OAuth flows
- ⚙️ Tune bitrate, resolution, orientation, devices, and extra output destinations
- 🧩 Install and run sandboxed local plugins
- 📦 Export, import, or reset your local app data

## 🚀 Quick Start

### What you need

- Node.js 18+
- npm 9+
- FFmpeg available on your machine for live encoding and stream start

### Install

From the project root:

```bash
npm install
```

The root workspace install also covers the frontend and backend workspaces.

### Start the app in development

```bash
npm run dev
```

This starts:

- the local backend
- the Vite frontend
- the Electron desktop shell

Default local addresses:

- frontend: `http://localhost:3000`
- backend: `http://localhost:4000`

### Run the built desktop flow

```bash
npm start
```

This builds the frontend, starts the backend, and launches Electron.

## 🧭 Main Areas In The App

- 🏠 Dashboard: setup progress, notifications, provider status, and session overview
- 🧙 Wizard: first-run guidance for FFmpeg, provider credentials, account connection, and stream target setup
- 🎥 Stream: camera preview, screen preview, start and stop controls, chat tools, and highlight markers
- 🎭 Scenes: manage scenes and their sources
- 🗓️ Schedule: configure go-live countdowns and schedule details
- 💾 Recordings: browse locally stored recordings
- 👤 Accounts: connect supported providers
- ⚙️ Settings: stream preferences, devices, destinations, and desktop preferences
- 🧩 Plugins: install, view, execute, and remove local plugins

## 🔗 Supported Provider Flow

BrowserStream Studio currently supports Twitch, YouTube, and Kick setup.

Typical flow:

1. Open `Settings`.
2. Add the provider client ID and client secret.
3. Save your settings.
4. Open `Accounts` and finish the connection flow.

You can also stream to a custom RTMP target without connecting a provider account.

## 🛠️ Build And Package

Build the frontend bundle:

```bash
npm run build
```

Open the app from a local build:

```bash
npm run desktop
```

Create an unpacked Electron build:

```bash
npm run pack
```

Create a Windows installer:

```bash
npm run dist:win
```

## 📁 Project Structure

```text
build/
   installer.nsh
main/
   backend/
      src/
   frontend/
      src/
   main.js
   preload.js
   splash.html
scripts/
   start-electron.js
package.json
```

## 🧠 Local Data And Storage

The app stores its working data locally.

This includes:

- stream and desktop preferences
- provider connection metadata
- scenes and scene sources
- scheduler state
- chat history and moderation shortcuts
- studio notes, notifications, analytics, and markers
- plugin definitions

In development, the backend uses local files under `main/backend` unless overridden. In packaged desktop mode, Electron points storage at the app user-data directory.

Ignored local runtime data:

- `main/backend/db.json`

## 🔒 Security Snapshot

- Electron uses `contextIsolation: true`
- Electron disables renderer `nodeIntegration`
- Renderer desktop access goes through the preload bridge
- Backend input is sanitized before persistence
- Helmet, CORS, sessions, and rate limiting are enabled
- Production frontend builds include a Content Security Policy
- Plugin execution is sandboxed and time-limited

See `SECURITY.md` for full reporting guidance and scope.

## 🧩 Plugin Notes

Plugins are stored locally and run through a restricted VM-based sandbox. Common escape paths such as `require`, `eval`, `Function`, dynamic import, direct network calls, and access to Node globals are blocked.

This plugin system is for controlled in-app extensions, not unrestricted third-party code execution.

## 🏗️ Tech Stack

- Electron 42
- React 19
- Vite
- TypeScript
- Express 5
- LowDB
- Passport OAuth strategies
- Electron Builder

## 🤝 Contributing

See `CONTRIBUTING.md` for contribution guidelines.

## 📄 License

This repository currently includes the GNU GPL v3 license text in `LICENSE`.
