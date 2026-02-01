<p align="center">
   <img src="https://img.shields.io/badge/Node.js-18%2B-brightgreen" alt="Node.js 18+" />
   <img src="https://img.shields.io/badge/Platform-Windows%20%7C%20Mac%20%7C%20Linux-blue" alt="Platform" />
   <img src="https://img.shields.io/badge/TypeScript-4.9%2B-3178c6?logo=typescript&logoColor=white" alt="TypeScript" />
   <img src="https://img.shields.io/badge/React-19.2%2B-61dafb?logo=react&logoColor=black" alt="React" />
   <img src="https://img.shields.io/badge/Electron-27%2B-47848F?logo=electron&logoColor=white" alt="Electron" />
   <img src="https://img.shields.io/badge/Security-Input%20Sanitization%2C%20Sandboxing-green" alt="Security" />
   <img src="https://img.shields.io/badge/PRs-welcome-blue" alt="PRs Welcome" />
   <img src="https://img.shields.io/badge/Made%20with-%E2%9D%A4-red" alt="Made with Love" />
</p>

- > © 2026 FNBubbles420 Org — Licensed under GPLv3

# BrowserStream Studio

BrowserStream Studio is a secure, local-first, web-based streaming application inspired by OBS. It supports multi-platform streaming (Twitch, YouTube, Kick), a live video preview, a plugin system, and strong security by default. All user data and plugins are stored locally.

---

## 🚀 Features
- Start/stop streaming to any RTMP endpoint (Twitch, YouTube, Kick, or custom)
- Live video preview in the browser
- Secure plugin system (install, remove, run plugins with sandboxing)
- User-friendly UI for stream settings and account management
- OAuth login/connect for Twitch, YouTube, and Kick
- Local storage per user (no cloud)
- Security: input sanitization, session security, rate limiting, plugin sandboxing

---


## 🖥️ For End Users

Welcome to BrowserStream Studio! This app lets you stream to Twitch, YouTube, Kick, or any RTMP server, right from your desktop—no cloud, no accounts required. All your data stays on your computer.

### What You Need
- **A computer with Windows, Mac, or Linux**
- **Node.js 18 or newer** (download from [nodejs.org](https://nodejs.org/))
- (Optional) **Git** if you want to get updates or contribute

### Getting Started (Step-by-Step)
1. **Download or Clone the App**
   - If you know Git: `git clone <repo-url>` and open the folder
   - Or, download the ZIP from GitHub and unzip it
2. **Install Everything**
   - Open a terminal/command prompt in the app folder
   - Run:
     ```
     npm install
     cd main/backend && npm install
     cd ../frontend && npm install
     cd ../../main && npm install
     ```
3. **Set Up Streaming Accounts (Optional, but recommended)**
   - Open `main/backend/.env` in a text editor
   - Add your Twitch, YouTube, and Kick client IDs/secrets (see the wiki or ask for help if unsure)
   - Set `RTMP_URL` to your stream server (for Twitch, see your dashboard for the right URL)

4. **Run the App**
    - In the app folder, open a terminal or command prompt and run:
       ```
       npm run dev
       ```
    - Wait for a few moments. The app will automatically open in a desktop window (Electron). If it doesn't, check your terminal for errors.
    - You can also open your web browser and go to [http://localhost:3000](http://localhost:3000) to use the app in your browser.
    - **Leave the terminal open while using the app!** Closing it will stop the app.
    - For more advanced options (like running backend/frontend/Electron separately), see the "For Developers" section below.

### Using BrowserStream Studio
1. **Open the App**
   - The app will open in a desktop window (Electron)
   - Or, visit http://localhost:3000 in your browser
2. **Preview Your Camera**
   - Go to the **Stream** page to see your live camera and mic
3. **Connect Your Streaming Accounts**
   - Go to **Settings**
   - Click "Connect Twitch", "Connect YouTube", or "Connect Kick" and follow the prompts
4. **Set Your Stream Settings**
   - In **Settings**, choose your bitrate, resolution, and output type (RTMP or HLS)
5. **Start Streaming!**
   - Go to the **Stream** page and click **Start Streaming**
   - To stop, click **Stop Streaming**
6. **Try Plugins**
   - Go to the **Plugins** page to install, run, or remove plugins

### Tips & Troubleshooting
- **All your data stays on your computer.** No cloud, no tracking.
- **If you see a blank window:** Make sure you ran `npm run dev` and left the terminal open.
- **Need help?** Open an issue on GitHub or ask a friend who knows Node.js.
- **Want to stream to a different platform?** Just set the correct RTMP URL in Settings or `.env`.

Enjoy streaming!

---

## 🤝 Contributing

We welcome contributions! To make BrowserStream Studio better:

### How to Contribute
1. **Fork the repo and clone your fork**
2. **Create a new branch** for your feature or fix
3. **Make your changes** (see code structure below)
4. **Test locally** (see Quick Start above)
5. **Submit a pull request** with a clear description

### Code Structure
- `main/frontend/` — React (Vite, TypeScript, MUI) UI
- `main/backend/` — Node.js/Express backend, plugin sandbox, OAuth, ffmpeg
- `main/` — Electron main process
- `db.json` — Local user/plugin data (auto-created)

### Guidelines
- Keep security in mind: sanitize all user input, never run untrusted code outside the plugin sandbox
- Write clear, user-friendly UI/UX
- Test your changes before submitting
- Document new features in this README

---

## 🔒 Security
- All user data and plugins are stored locally
- Plugins run in a Node.js VM sandbox with no access to the system
- Input/output is sanitized throughout
- Sessions, rate limiting, and CORS are enabled by default

---

## 📢 Feedback & Support
- Found a bug? Open an issue or pull request
- Want a new feature? Open an issue or contribute!

---

## Maintainers
- [FNBUBBLES420-ORG](https://github.com/FNBUBBLES420-ORG/BrowserStreamStudio)

---

Happy streaming and hacking!

## Prerequisites
- Node.js 18+ and npm
- (Optional) Yarn if you prefer
- (Optional) Git for version control

## Install Dependencies

From the project root:


```
npm install
cd main/backend
npm install
cd ../frontend
npm install
cd ../../main
npm install
```

## Environment Variables

Edit `backend/.env` and set your Twitch, YouTube, and Kick client IDs and secrets.

## Development


### Option 1: Manual (Recommended for Debugging)
1. **Start Backend:**
   ```
   cd main/backend
   npm run dev
   ```
2. **Start Frontend (in a new terminal):**
   ```
   cd main/frontend
   npm run dev
   ```
   > ⚠️ **Leave this terminal running!** The Electron app needs the frontend dev server to be running at http://localhost:3000.
3. **Start Electron App (in another terminal, from project root):**
   ```
   npm start
   ```
   > Electron will open and load the running frontend. If you see a blank window, make sure the frontend dev server is running.

### Option 2: All-in-One (Quick Start)
From the project root, run:
```
npm run dev
```
This will start the backend, frontend, and Electron app together (using concurrently). Useful for quick development, but you may need to scroll up to see all logs.

## User Interface

- The app now includes a user-friendly Settings page for adjusting stream settings (bitrate, resolution, output) and managing account connections (Twitch, YouTube, Kick).
- Access the Settings page from the Home screen or via the /settings route.

- The backend runs on http://localhost:4000
- The frontend runs on http://localhost:3000
- Electron loads the frontend and connects to the backend

## Usage Notes
- Local storage is per user (per machine)
- Plugins and user data are stored locally
- OAuth for Twitch, YouTube, and Kick is set up for local development
- Security and sanitization are enabled by default

## Next Steps
- Implement streaming controls and plugin logic
- Write a full end-user README.md before release

