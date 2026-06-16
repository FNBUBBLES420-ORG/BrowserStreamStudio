const fs = require('fs');
const path = require('path');
const { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, shell } = require('electron');

app.disableHardwareAcceleration();
if (!app.isPackaged) {
  app.setPath('userData', path.join(__dirname, '..', '.electron-user-data'));
} else {
  app.setPath('userData', path.join(app.getPath('appData'), 'BrowserStream Studio Data'));
}

const isDev = Boolean(process.env.ELECTRON_RENDERER_URL);
const backendUrl = process.env.ELECTRON_BACKEND_URL || 'http://127.0.0.1:4000';
const bundledIndexPath = path.join(__dirname, 'frontend', 'dist', 'index.html');
const splashPath = path.join(__dirname, 'splash.html');
const frontendUrl = isDev
  ? process.env.ELECTRON_RENDERER_URL
  : `file://${bundledIndexPath.replace(/\\/g, '/')}`;
const minimumSplashDurationMs = 3200;
const desktopPrefsPath = path.join(app.getPath('userData'), 'desktop-preferences.json');
const defaultDesktopPrefs = {
  closeToTray: false,
  minimizeToTray: false,
  launchOnStartup: false,
  openDevToolsOnLaunch: false,
  prefsVersion: 2
};

let mainWindow = null;
let splashWindow = null;
let tray = null;
let backendServerModule = null;
let backendServerStarted = false;
let desktopPrefs = loadDesktopPrefs();
let splashOpenedAt = 0;
let mainWindowShown = false;
let startupError = null;
const gotSingleInstanceLock = app.requestSingleInstanceLock();

if (!gotSingleInstanceLock) {
  app.quit();
}

function shouldUseTrayFeatures() {
  return app.isPackaged;
}

function loadDesktopPrefs() {
  try {
    if (fs.existsSync(desktopPrefsPath)) {
      const parsed = JSON.parse(fs.readFileSync(desktopPrefsPath, 'utf8'));
      if (!parsed.prefsVersion) {
        return { ...defaultDesktopPrefs };
      }

      return {
        ...defaultDesktopPrefs,
        ...parsed
      };
    }
  } catch {}

  return { ...defaultDesktopPrefs };
}

function saveDesktopPrefs(nextPrefs) {
  desktopPrefs = {
    ...desktopPrefs,
    ...nextPrefs,
    prefsVersion: defaultDesktopPrefs.prefsVersion
  };
  fs.mkdirSync(path.dirname(desktopPrefsPath), { recursive: true });
  fs.writeFileSync(desktopPrefsPath, JSON.stringify(desktopPrefs, null, 2));
  app.setLoginItemSettings({ openAtLogin: desktopPrefs.launchOnStartup });
  return desktopPrefs;
}

function createTrayIcon() {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16">
      <rect width="16" height="16" rx="4" fill="#173f35"/>
      <polygon points="6,4 13,8 6,12" fill="#f2e8cf"/>
    </svg>
  `;
  return nativeImage.createFromDataURL(`data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`);
}

function createTray() {
  if (!shouldUseTrayFeatures()) {
    return;
  }

  tray = new Tray(createTrayIcon());
  tray.setToolTip('BrowserStream Studio');
  tray.setContextMenu(Menu.buildFromTemplate([
    {
      label: 'Open BrowserStream Studio',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      }
    },
    {
      label: 'Quit',
      click: () => {
        app.isQuitting = true;
        app.quit();
      }
    }
  ]));
  tray.on('click', () => {
    if (mainWindow?.isVisible()) {
      mainWindow.hide();
    } else if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

function startBackend() {
  if (process.env.ELECTRON_BACKEND_URL || backendServerStarted) {
    return Promise.resolve(true);
  }

  process.env.PORT = '4000';
  process.env.BACKEND_URL = backendUrl;
  process.env.FRONTEND_URL = frontendUrl;
  process.env.BROWSERSTREAM_USER_DATA = app.getPath('userData');

  try {
    backendServerModule = require(path.join(__dirname, 'backend', 'src', 'index.js'));
  } catch (error) {
    startupError = error;
    console.error('Failed to load bundled backend:', error);
    return Promise.resolve(false);
  }

  backendServerStarted = true;
  return Promise.resolve(backendServerModule.startServer()).then(() => true).catch((error) => {
    backendServerStarted = false;
    startupError = error;
    console.error('Failed to start bundled backend:', error);
    return false;
  });
}

function createSplashWindow() {
  splashOpenedAt = Date.now();
  splashWindow = new BrowserWindow({
    width: 440,
    height: 300,
    frame: false,
    resizable: false,
    transparent: false,
    alwaysOnTop: true,
    show: false,
    backgroundColor: '#081018',
    webPreferences: {
      contextIsolation: true
    }
  });

  splashWindow.loadFile(splashPath);
  splashWindow.once('ready-to-show', () => {
    splashWindow?.show();
  });
}

function createWindow() {
  mainWindowShown = false;
  mainWindow = new BrowserWindow({
    width: 1360,
    height: 860,
    minWidth: 1120,
    minHeight: 720,
    show: false,
    backgroundColor: '#0f1720',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  const revealMainWindow = () => {
    if (!mainWindow || mainWindowShown) {
      return;
    }

    mainWindowShown = true;
    splashWindow?.close();
    splashWindow = null;
    mainWindow.show();
    if (desktopPrefs.openDevToolsOnLaunch) {
      mainWindow.webContents.openDevTools({ mode: 'detach' });
    }
  };

  mainWindow.once('ready-to-show', revealMainWindow);
  mainWindow.webContents.once('did-finish-load', () => {
    setTimeout(revealMainWindow, 250);
  });

  mainWindow.on('minimize', (event) => {
    if (shouldUseTrayFeatures() && desktopPrefs.minimizeToTray) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.on('close', (event) => {
    if (!app.isQuitting && shouldUseTrayFeatures() && desktopPrefs.closeToTray && tray) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    const message = `
      <html>
        <body style="margin:0;padding:32px;background:#160f1e;color:#fff;font-family:Segoe UI,sans-serif;">
          <h1 style="margin-top:0;">BrowserStream Studio could not load</h1>
          <p>The Electron window opened, but the renderer failed to load.</p>
          <pre style="white-space:pre-wrap;background:#24182f;padding:16px;border-radius:12px;">URL: ${validatedURL}\nCode: ${errorCode}\nMessage: ${errorDescription}</pre>
        </body>
      </html>
    `;
    mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(message)}`);
  });
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function showStartupError(details) {
  if (!mainWindow) {
    return;
  }

  const message = `
    <html>
      <body style="margin:0;padding:32px;background:#160f1e;color:#fff;font-family:Segoe UI,sans-serif;">
        <h1 style="margin-top:0;">BrowserStream Studio could not finish launching</h1>
        <p>The desktop shell opened, but a startup service failed before the app could finish loading.</p>
        <pre style="white-space:pre-wrap;background:#24182f;padding:16px;border-radius:12px;">${escapeHtml(details)}</pre>
      </body>
    </html>
  `;

  mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(message)}`);
}

async function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function isReachable(url) {
  try {
    const response = await fetch(url, { method: 'GET' });
    return response.ok;
  } catch {
    return false;
  }
}

async function waitForStartupTargets() {
  const attempts = isDev ? 90 : 40;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const backendReady = await isReachable(`${backendUrl}/api/health`);
    const rendererReady = isDev ? await isReachable(frontendUrl) : true;

    if (backendReady && rendererReady) {
      return true;
    }

    await wait(350);
  }

  return false;
}

async function initializeMainWindow() {
  const ready = await waitForStartupTargets();
  const elapsed = Date.now() - splashOpenedAt;
  if (elapsed < minimumSplashDurationMs) {
    await wait(minimumSplashDurationMs - elapsed);
  }

  if (isDev) {
    if (ready) {
      mainWindow.loadURL(frontendUrl);
    } else {
      mainWindow.loadURL(frontendUrl);
    }
    setTimeout(() => {
      if (mainWindow && !mainWindowShown) {
        mainWindow.show();
        splashWindow?.close();
        splashWindow = null;
        mainWindowShown = true;
      }
    }, 2500);
    return;
  }

  if (startupError) {
    showStartupError(startupError.stack || startupError.message || String(startupError));
    setTimeout(() => {
      if (mainWindow && !mainWindowShown) {
        mainWindow.show();
        splashWindow?.close();
        splashWindow = null;
        mainWindowShown = true;
      }
    }, 250);
    return;
  }

  mainWindow.loadFile(bundledIndexPath);
  setTimeout(() => {
    if (mainWindow && !mainWindowShown) {
      mainWindow.show();
      splashWindow?.close();
      splashWindow = null;
      mainWindowShown = true;
    }
  }, 2500);
}

ipcMain.handle('desktop:getRuntime', async () => ({
  backendUrl,
  frontendUrl,
  isDesktop: true,
  isPackaged: app.isPackaged
}));

ipcMain.handle('desktop:getPreferences', async () => desktopPrefs);
ipcMain.handle('desktop:savePreferences', async (event, nextPrefs) => saveDesktopPrefs(nextPrefs || {}));
ipcMain.handle('desktop:openExternal', async (event, url) => {
  if (typeof url === 'string' && /^https?:\/\//i.test(url)) {
    await shell.openExternal(url);
    return true;
  }
  return false;
});
ipcMain.handle('desktop:openPath', async (event, targetPath) => {
  if (typeof targetPath !== 'string' || !targetPath.trim()) {
    return false;
  }

  const result = await shell.openPath(targetPath);
  return result === '';
});
ipcMain.handle('desktop:showItemInFolder', async (event, targetPath) => {
  if (typeof targetPath !== 'string' || !targetPath.trim()) {
    return false;
  }

  shell.showItemInFolder(targetPath);
  return true;
});
ipcMain.handle('desktop:checkForUpdates', async () => ({
  checkedAt: new Date().toISOString(),
  currentVersion: app.getVersion(),
  status: 'up-to-date',
  message: 'You are on the latest desktop build available to this installer.'
}));

app.whenReady().then(async () => {
  saveDesktopPrefs(desktopPrefs);
  createTray();
  createSplashWindow();
  createWindow();
  await startBackend();
  await initializeMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createSplashWindow();
      createWindow();
      startBackend().finally(() => {
        initializeMainWindow();
      });
    } else if (mainWindow) {
      mainWindow.show();
    }
  });
});

app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) {
      mainWindow.restore();
    }
    mainWindow.show();
    mainWindow.focus();
  }
});

app.on('before-quit', () => {
  app.isQuitting = true;
  if (splashWindow) {
    splashWindow.destroy();
  }
  if (backendServerModule?.stopServer) {
    backendServerModule.stopServer().catch((error) => {
      console.error('Failed to stop bundled backend:', error);
    });
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin' || !shouldUseTrayFeatures()) {
    app.quit();
  }
});
