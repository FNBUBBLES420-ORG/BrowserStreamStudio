# Windows EXE Build Guide

This guide is only for building the Windows installer for BrowserStream Studio.

## What this makes

- 📦 Unpacked desktop app: `npm run pack`
- 🪟 Windows installer EXE: `npm run dist:win`

## Before you build

Make sure these files are in the `build` folder:

- `build/ffmpeg.exe`
- `build/ffprobe.exe`
- `build/installer.nsh`

These are used when packaging the Windows app.

## One-time setup

Install the project dependencies:

```bash
npm install
```

## Build steps

### 1. Prepare the app

This builds the frontend for desktop packaging:

```bash
npm run prepare
```

### 2. Create the unpacked desktop app

This gives you a local packaged app folder for testing:

```bash
npm run pack
```

### 3. Create the Windows installer EXE

This creates the installer you can share:

```bash
npm run dist:win
```

## Where your EXE will be

After the build finishes, check the `dist` folder.

You should see:

- 📁 the unpacked app from `npm run pack`
- 🧾 the Windows installer `.exe` from `npm run dist:win`

## Installer details

- 🪟 Installer type: NSIS
- 👤 Install mode: per-user
- 📂 Install location: `%APPDATA%\BrowserStream Studio`
- ⚙️ Custom installer script: `build/installer.nsh`

## What to test before uploading

Before uploading the EXE to GitHub, test these:

1. ✅ The installer opens normally
2. ✅ The app installs under `%APPDATA%`
3. ✅ The app launches without a blank screen
4. ✅ FFmpeg is detected automatically
5. ✅ The app closes fully when you exit
6. ✅ The app opens again after relaunch
7. ✅ Uninstall works properly

## Fast build flow

If everything is already set up, this is the normal order:

```bash
npm run prepare
npm run pack
npm run dist:win
```

## Uploading to GitHub

When you upload the EXE release, include:

- 🏷️ app version
- 📝 short changelog
- 📦 installer filename
- 🎥 note that `ffmpeg.exe` and `ffprobe.exe` are bundled for Windows users

## Simple reminder

If the EXE build fails, check:

- the `build` folder still contains `ffmpeg.exe`
- the `build` folder still contains `ffprobe.exe`
- the `build` folder still contains `installer.nsh`
- `npm install` finished successfully

