const path = require('path');
const fs = require('fs');
const { spawn, spawnSync } = require('child_process');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const session = require('express-session');
const rateLimit = require('express-rate-limit');
const passport = require('passport');
const TwitchStrategy = require('passport-twitch-new').Strategy;
const cookieParser = require('cookie-parser');
const { nanoid } = require('nanoid');
const OAuth2Strategy = require('passport-oauth2');
const sanitizeHtml = require('sanitize-html');

const { Low } = require('lowdb');
const { JSONFile } = require('lowdb/node');

const app = express();
let server = null;
const PORT = Number(process.env.PORT || 4000);
const HOST = process.env.HOST || '127.0.0.1';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const BACKEND_URL = process.env.BACKEND_URL || `http://localhost:${PORT}`;
const storageRoot = process.env.BROWSERSTREAM_USER_DATA || path.join(__dirname, '..');
const dbFilePath = path.join(storageRoot, 'db.json');
const recordingsRoot = path.join(storageRoot, 'recordings');
const ALLOWED_PROVIDERS = ['twitch', 'youtube', 'kick'];
const ALLOWED_PROVIDER_KEYS = [...ALLOWED_PROVIDERS, 'custom'];
const ALLOWED_OUTPUTS = ['rtmp', 'hls'];
const ALLOWED_RESOLUTIONS = ['1920x1080', '1280x720', '854x480'];
const ALLOWED_SCENES = ['Main Scene', 'Just Chatting', 'Gameplay', 'Coding Session', 'Break Screen'];

const defaultData = {
  users: [],
  plugins: [],
  activityLog: [],
  appConfig: {
    stream: {
      provider: 'custom',
      bitrate: 4500,
      resolution: '1920x1080',
      output: 'rtmp',
      scene: 'Main Scene',
      qualityPreset: 'Balanced',
      orientation: 'landscape',
      title: 'Live now',
      category: 'Software and Game Development',
      rtmpUrl: '',
      streamKey: '',
      destinations: [],
      outputPath: '',
      recordWhileStreaming: false,
      micEnabled: true,
      systemAudioEnabled: false,
      chatDockEnabled: true,
      videoDeviceId: '',
      audioInputDeviceId: '',
      audioOutputDeviceId: '',
      micVolume: 80,
      systemVolume: 80
    },
    desktop: {
      closeToTray: false,
      minimizeToTray: false,
      launchOnStartup: false,
      checkDependenciesOnLaunch: true
    },
    providers: {
      twitch: {
        clientId: '',
        clientSecret: '',
        accessToken: '',
        refreshToken: '',
        connected: false,
        connectedAt: '',
        profile: null
      },
      youtube: {
        clientId: '',
        clientSecret: '',
        accessToken: '',
        refreshToken: '',
        connected: false,
        connectedAt: '',
        profile: null
      },
      kick: {
        clientId: '',
        clientSecret: '',
        accessToken: '',
        refreshToken: '',
        connected: false,
        connectedAt: '',
        profile: null
      }
    }
  },
  scenes: [
    {
      id: 'scene-main',
      name: 'Main Scene',
      type: 'live',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      sources: [
        { id: 'src-webcam', type: 'webcam', name: 'Webcam', enabled: true, position: { x: 24, y: 24 }, size: { width: 360, height: 220 }, content: '' },
        { id: 'src-title', type: 'text', name: 'Title Overlay', enabled: true, position: { x: 24, y: 268 }, size: { width: 460, height: 80 }, content: 'Welcome to the stream' }
      ]
    }
  ],
  scheduler: {
    enabled: false,
    scheduledFor: '',
    countdownSeconds: 300,
    autoStart: false,
    autoApplyTitle: true,
    autoApplyCategory: true,
    title: 'Live now',
    category: 'Software and Game Development',
    checklistReminder: true
  },
  wizard: {
    completedSteps: [],
    lastCompletedAt: '',
    dismissed: false
  },
  chat: {
    messages: [],
    pinnedMessage: null,
    moderationShortcuts: ['Welcome!', 'Please keep chat respectful.', 'Links are not allowed right now.']
  },
  studio: {
    notes: '',
    sponsorBanner: '',
    brandedOverlayName: 'Sunset Glow',
    donationUrl: '',
    clipMarkers: [],
    bookmarks: [],
    analytics: [],
    lastRecoveryNotice: '',
    notifications: []
  }
};

const adapter = new JSONFile(dbFilePath);
const db = new Low(adapter, defaultData);
let ffmpegProcess = null;
let runtimeStatus = {
  streaming: false,
  lastStartedAt: '',
  lastStoppedAt: '',
  lastError: '',
  pluginLogs: [],
  reconnectAttempts: 0,
  droppedFrames: 0,
  bitrateKbps: 0,
  encoderStatus: 'Idle',
  networkQuality: 'Stable',
  cpuLoad: 18
};

function resolveBundledBinary(name) {
  const projectRoot = path.resolve(__dirname, '..', '..', '..');
  const candidates = [
    path.join(process.cwd(), `${name}.exe`),
    path.join(process.cwd(), name),
    path.join(projectRoot, 'build', `${name}.exe`),
    path.join(projectRoot, 'build', name),
    path.join(process.resourcesPath || '', 'bin', `${name}.exe`),
    path.join(process.resourcesPath || '', 'bin', name)
  ];

  return candidates.find((candidate) => candidate && fs.existsSync(candidate)) || name;
}

function cloneDefaultData() {
  return JSON.parse(JSON.stringify(defaultData));
}

function normalizeProvider(provider, saved) {
  return {
    ...cloneDefaultData().appConfig.providers[provider],
    ...(saved || {})
  };
}

function normalizePlugin(plugin) {
  return {
    name: plugin.name,
    code: plugin.code,
    description: plugin.description || '',
    version: plugin.version || '1.0.0',
    permissions: Array.isArray(plugin.permissions) ? plugin.permissions : ['overlay'],
    trusted: plugin.trusted === true,
    category: plugin.category || 'Utility',
    enabled: plugin.enabled !== false,
    createdAt: plugin.createdAt || new Date().toISOString(),
    lastRunAt: plugin.lastRunAt || '',
    permissionLevel: plugin.permissionLevel || 'sandboxed'
  };
}

async function ensureDb() {
  fs.mkdirSync(path.dirname(dbFilePath), { recursive: true });
  await db.read();

  const defaults = cloneDefaultData();
  db.data = db.data || defaults;
  db.data.users = Array.isArray(db.data.users) ? db.data.users : [];
  db.data.plugins = Array.isArray(db.data.plugins) ? db.data.plugins.map(normalizePlugin) : [];
  db.data.activityLog = Array.isArray(db.data.activityLog) ? db.data.activityLog : [];
  db.data.scenes = Array.isArray(db.data.scenes) && db.data.scenes.length ? db.data.scenes : defaults.scenes;
  db.data.scheduler = {
    ...defaults.scheduler,
    ...(db.data.scheduler || {})
  };
  db.data.wizard = {
    ...defaults.wizard,
    ...(db.data.wizard || {}),
    completedSteps: Array.isArray(db.data.wizard?.completedSteps) ? db.data.wizard.completedSteps : defaults.wizard.completedSteps
  };
  db.data.chat = {
    ...defaults.chat,
    ...(db.data.chat || {}),
    messages: Array.isArray(db.data.chat?.messages) ? db.data.chat.messages.slice(0, 40) : [],
    moderationShortcuts: Array.isArray(db.data.chat?.moderationShortcuts) ? db.data.chat.moderationShortcuts.slice(0, 10) : defaults.chat.moderationShortcuts
  };
  db.data.studio = {
    ...defaults.studio,
    ...(db.data.studio || {}),
    clipMarkers: Array.isArray(db.data.studio?.clipMarkers) ? db.data.studio.clipMarkers.slice(0, 100) : [],
    bookmarks: Array.isArray(db.data.studio?.bookmarks) ? db.data.studio.bookmarks.slice(0, 100) : [],
    analytics: Array.isArray(db.data.studio?.analytics) ? db.data.studio.analytics.slice(0, 60) : [],
    notifications: Array.isArray(db.data.studio?.notifications) ? db.data.studio.notifications.slice(0, 30) : []
  };

  const savedConfig = db.data.appConfig || {};
  db.data.appConfig = {
    stream: {
      ...defaults.appConfig.stream,
      ...(savedConfig.stream || {})
    },
    desktop: {
      ...defaults.appConfig.desktop,
      ...(savedConfig.desktop || {})
    },
    providers: {
      twitch: normalizeProvider('twitch', savedConfig.providers?.twitch),
      youtube: normalizeProvider('youtube', savedConfig.providers?.youtube),
      kick: normalizeProvider('kick', savedConfig.providers?.kick)
    }
  };

  await db.write();
}

function addActivity(type, details) {
  db.data.activityLog.unshift({
    id: nanoid(),
    type,
    details,
    createdAt: new Date().toISOString()
  });
  db.data.activityLog = db.data.activityLog.slice(0, 50);
}

function sanitizePlainText(value, maxLength = 255) {
  return sanitizeHtml(String(value ?? ''), { allowedTags: [], allowedAttributes: {} })
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .trim()
    .slice(0, maxLength);
}

function sanitizeSecret(value, maxLength = 512) {
  return String(value ?? '')
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .trim()
    .slice(0, maxLength);
}

function sanitizeNumber(value, fallback, min, max) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, Math.round(numeric)));
}

function sanitizeBoolean(value, fallback = false) {
  return typeof value === 'boolean' ? value : fallback;
}

function sanitizeEnum(value, allowedValues, fallback) {
  return allowedValues.includes(value) ? value : fallback;
}

function sanitizeBitrate(value, fallback = 4500) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return fallback;
  }

  return Math.min(20000, Math.max(500, Math.round(numeric)));
}

function sanitizeOutputPath(value, fallback = '') {
  const cleaned = sanitizePlainText(value, 260);
  if (!cleaned) {
    return fallback;
  }

  return path.isAbsolute(cleaned) ? path.normalize(cleaned) : fallback;
}

function sanitizeStreamUrl(value, fallback = '') {
  const cleaned = sanitizePlainText(value, 1024);
  if (!cleaned) {
    return fallback;
  }

  try {
    const parsed = new URL(cleaned);
    if (!['rtmp:', 'rtmps:', 'srt:', 'http:', 'https:'].includes(parsed.protocol)) {
      return fallback;
    }

    return parsed.toString().replace(/\/$/, '');
  } catch {
    return fallback;
  }
}

function sanitizeStreamKey(value, fallback = '') {
  return sanitizeSecret(value, 512) || fallback;
}

function sanitizeDestinations(destinations = []) {
  if (!Array.isArray(destinations)) {
    return [];
  }

  return destinations
    .slice(0, 4)
    .map((destination, index) => ({
      id: sanitizePlainText(destination?.id || `destination-${index + 1}`, 60) || `destination-${index + 1}`,
      provider: sanitizeEnum(destination?.provider, ALLOWED_PROVIDER_KEYS, 'custom'),
      label: sanitizePlainText(destination?.label || `Destination ${index + 1}`, 80) || `Destination ${index + 1}`,
      rtmpUrl: sanitizeStreamUrl(destination?.rtmpUrl || '', ''),
      streamKey: sanitizeStreamKey(destination?.streamKey || '', ''),
      enabled: sanitizeBoolean(destination?.enabled, true)
    }))
    .filter((destination) => destination.rtmpUrl);
}

function sanitizeProviderProfile(provider, profile) {
  if (!profile) {
    return null;
  }

  return {
    provider,
    id: sanitizePlainText(profile.id || profile._json?.id || '', 128),
    displayName: sanitizePlainText(profile.displayName || profile.username || profile._json?.display_name || profile._json?.name || '', 120),
    username: sanitizePlainText(profile.username || profile._json?.login || '', 120),
    avatar: sanitizeStreamUrl(profile.photos?.[0]?.value || profile._json?.profile_image_url || '', '')
  };
}

function sanitizeStreamConfig(stream = {}) {
  return {
    ...db.data.appConfig.stream,
    provider: sanitizeEnum(stream.provider, ALLOWED_PROVIDER_KEYS, db.data.appConfig.stream.provider),
    bitrate: sanitizeBitrate(stream.bitrate, db.data.appConfig.stream.bitrate),
    resolution: sanitizeEnum(stream.resolution, ALLOWED_RESOLUTIONS, db.data.appConfig.stream.resolution),
    output: sanitizeEnum(stream.output, ALLOWED_OUTPUTS, db.data.appConfig.stream.output),
    scene: sanitizeEnum(stream.scene, ALLOWED_SCENES, db.data.appConfig.stream.scene),
    qualityPreset: sanitizeEnum(stream.qualityPreset, ['Performance', 'Balanced', 'Quality'], db.data.appConfig.stream.qualityPreset),
    orientation: sanitizeEnum(stream.orientation, ['landscape', 'portrait'], db.data.appConfig.stream.orientation),
    title: sanitizePlainText(stream.title, 120),
    category: sanitizePlainText(stream.category, 120),
    rtmpUrl: sanitizeStreamUrl(stream.rtmpUrl, ''),
    streamKey: sanitizeStreamKey(stream.streamKey, ''),
    destinations: sanitizeDestinations(stream.destinations || []),
    outputPath: sanitizeOutputPath(stream.outputPath, ''),
    recordWhileStreaming: sanitizeBoolean(stream.recordWhileStreaming, db.data.appConfig.stream.recordWhileStreaming),
    micEnabled: sanitizeBoolean(stream.micEnabled, db.data.appConfig.stream.micEnabled),
    systemAudioEnabled: sanitizeBoolean(stream.systemAudioEnabled, db.data.appConfig.stream.systemAudioEnabled),
    chatDockEnabled: sanitizeBoolean(stream.chatDockEnabled, db.data.appConfig.stream.chatDockEnabled),
    videoDeviceId: sanitizePlainText(stream.videoDeviceId, 120),
    audioInputDeviceId: sanitizePlainText(stream.audioInputDeviceId, 120),
    audioOutputDeviceId: sanitizePlainText(stream.audioOutputDeviceId, 120),
    micVolume: sanitizeNumber(stream.micVolume, db.data.appConfig.stream.micVolume, 0, 100),
    systemVolume: sanitizeNumber(stream.systemVolume, db.data.appConfig.stream.systemVolume, 0, 100)
  };
}

function sanitizeDesktopConfig(desktop = {}) {
  return {
    ...db.data.appConfig.desktop,
    closeToTray: sanitizeBoolean(desktop.closeToTray, db.data.appConfig.desktop.closeToTray),
    minimizeToTray: sanitizeBoolean(desktop.minimizeToTray, db.data.appConfig.desktop.minimizeToTray),
    launchOnStartup: sanitizeBoolean(desktop.launchOnStartup, db.data.appConfig.desktop.launchOnStartup),
    checkDependenciesOnLaunch: sanitizeBoolean(desktop.checkDependenciesOnLaunch, db.data.appConfig.desktop.checkDependenciesOnLaunch)
  };
}

function sanitizeProviderCredentials(provider, updates = {}) {
  return {
    ...getStoredProvider(provider),
    clientId: sanitizeSecret(updates.clientId, 255),
    clientSecret: sanitizeSecret(updates.clientSecret, 255)
  };
}

function sanitizeStudioConfig(studio = {}) {
  return {
    ...db.data.studio,
    notes: sanitizePlainText(studio.notes, 2000),
    sponsorBanner: sanitizePlainText(studio.sponsorBanner, 200),
    brandedOverlayName: sanitizePlainText(studio.brandedOverlayName, 120),
    donationUrl: sanitizeStreamUrl(studio.donationUrl, '')
  };
}

function getStoredProvider(provider) {
  return db.data.appConfig.providers[provider];
}

function getConfiguredCredential(provider, field) {
  const envKey = `${provider.toUpperCase()}_${field === 'clientId' ? 'CLIENT_ID' : 'CLIENT_SECRET'}`;
  const stored = getStoredProvider(provider)[field];

  if (stored && !stored.startsWith('your_')) {
    return stored;
  }

  const fallback = process.env[envKey] || '';
  return fallback.startsWith('your_') ? '' : fallback;
}

function isProviderConfigured(provider) {
  return Boolean(getConfiguredCredential(provider, 'clientId') && getConfiguredCredential(provider, 'clientSecret'));
}

function buildFrontendRedirect(route) {
  return `${FRONTEND_URL.replace(/\/$/, '')}#${route}`;
}

function getPublicProvider(provider) {
  const config = getStoredProvider(provider);

  return {
    clientId: getConfiguredCredential(provider, 'clientId'),
    clientSecret: '',
    connected: Boolean(config.connected),
    connectedAt: config.connectedAt,
    profile: config.profile
  };
}

function getSanitizedExportData() {
  const exported = cloneDefaultData();
  exported.users = Array.isArray(db.data.users) ? [...db.data.users] : [];
  exported.plugins = Array.isArray(db.data.plugins) ? [...db.data.plugins] : [];
  exported.activityLog = Array.isArray(db.data.activityLog) ? [...db.data.activityLog] : [];
  exported.scenes = Array.isArray(db.data.scenes) ? [...db.data.scenes] : [];
  exported.scheduler = { ...(db.data.scheduler || exported.scheduler) };
  exported.wizard = { ...(db.data.wizard || exported.wizard) };
  exported.chat = { ...(db.data.chat || exported.chat) };
  exported.studio = { ...(db.data.studio || exported.studio) };
  exported.appConfig = {
    ...exported.appConfig,
    ...(db.data.appConfig || {}),
    stream: {
      ...exported.appConfig.stream,
      ...(db.data.appConfig?.stream || {}),
      streamKey: '',
      destinations: (db.data.appConfig?.stream?.destinations || []).map((destination) => ({
        ...destination,
        streamKey: ''
      }))
    },
    providers: {
      twitch: {
        ...normalizeProvider('twitch', db.data.appConfig?.providers?.twitch),
        clientSecret: '',
        accessToken: '',
        refreshToken: ''
      },
      youtube: {
        ...normalizeProvider('youtube', db.data.appConfig?.providers?.youtube),
        clientSecret: '',
        accessToken: '',
        refreshToken: ''
      },
      kick: {
        ...normalizeProvider('kick', db.data.appConfig?.providers?.kick),
        clientSecret: '',
        accessToken: '',
        refreshToken: ''
      }
    }
  };

  return exported;
}

function getPublicConfig() {
  return {
    stream: db.data.appConfig.stream,
    desktop: db.data.appConfig.desktop,
    scenes: db.data.scenes,
    scheduler: db.data.scheduler,
    wizard: db.data.wizard,
    chat: {
      ...db.data.chat,
      messages: db.data.chat.messages.slice(0, 20)
    },
    studio: db.data.studio,
    providers: {
      twitch: getPublicProvider('twitch'),
      youtube: getPublicProvider('youtube'),
      kick: getPublicProvider('kick')
    }
  };
}

function getProviderDefaults(provider) {
  switch (provider) {
    case 'twitch':
      return {
        provider,
        rtmpUrl: 'rtmp://live.twitch.tv/app',
        streamKey: getStoredProvider('twitch').connected ? getStoredProvider('twitch').streamKey || '' : '',
        streamKeyAvailable: Boolean(getStoredProvider('twitch').connected && getStoredProvider('twitch').streamKey)
      };
    case 'youtube':
      return {
        provider,
        rtmpUrl: 'rtmp://a.rtmp.youtube.com/live2',
        streamKey: '',
        streamKeyAvailable: false
      };
    case 'kick':
      return {
        provider,
        rtmpUrl: 'rtmp://fa723fc1b171.global-contribute.live-video.net:1935/app',
        streamKey: '',
        streamKeyAvailable: false
      };
    default:
      return {
        provider: 'custom',
        rtmpUrl: '',
        streamKey: '',
        streamKeyAvailable: false
      };
  }
}

async function getTwitchAppAccessToken() {
  const clientId = getConfiguredCredential('twitch', 'clientId');
  const clientSecret = getConfiguredCredential('twitch', 'clientSecret');

  if (!clientId || !clientSecret) {
    throw new Error('Twitch credentials are missing.');
  }

  const response = await fetch('https://id.twitch.tv/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'client_credentials'
    })
  });

  const data = await response.json();
  if (!response.ok || !data.access_token) {
    throw new Error(data.message || 'Unable to authenticate with Twitch.');
  }

  return { accessToken: data.access_token, clientId };
}

async function fetchTwitchCategories(search) {
  const { accessToken, clientId } = await getTwitchAppAccessToken();
  const query = (search || 'software').trim();
  const response = await fetch(`https://api.twitch.tv/helix/search/categories?query=${encodeURIComponent(query)}&first=25`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Client-Id': clientId
    }
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Unable to fetch Twitch categories.');
  }

  return (data.data || []).map((item) => ({
    id: item.id,
    name: item.name
  }));
}

async function fetchKickCategories(search) {
  const accessToken = getStoredProvider('kick').accessToken;
  if (!accessToken) {
    throw new Error('Connect a Kick account first to load live Kick categories.');
  }

  const url = new URL('https://api.kick.com/public/v2/categories');
  url.searchParams.set('limit', '25');
  if (search?.trim()) {
    url.searchParams.append('name', search.trim());
  }

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json'
    }
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Unable to fetch Kick categories.');
  }

  return (data.data || []).map((item) => ({
    id: String(item.id),
    name: item.name
  }));
}

async function fetchYouTubeCategories(search) {
  const accessToken = getStoredProvider('youtube').accessToken;
  if (!accessToken) {
    throw new Error('Connect a YouTube account first to load YouTube categories.');
  }

  const response = await fetch('https://www.googleapis.com/youtube/v3/videoCategories?part=snippet&regionCode=US', {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json'
    }
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error?.message || 'Unable to fetch YouTube categories.');
  }

  const lowered = (search || '').trim().toLowerCase();
  return (data.items || [])
    .map((item) => ({
      id: item.id,
      name: item.snippet?.title || item.id
    }))
    .filter((item) => !lowered || item.name.toLowerCase().includes(lowered));
}

async function fetchGoogleUserProfile(accessToken) {
  const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json'
    }
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error?.message || 'Unable to fetch Google profile.');
  }

  return {
    id: data.id,
    displayName: data.name,
    username: data.email,
    photos: data.picture ? [{ value: data.picture }] : [],
    _json: data
  };
}

function setProviderConnection(provider, values) {
  db.data.appConfig.providers[provider] = {
    ...db.data.appConfig.providers[provider],
    ...values
  };
}

function refreshStrategies() {
  ALLOWED_PROVIDERS.forEach((provider) => passport.unuse(provider));

  if (isProviderConfigured('kick')) {
    passport.use('kick', new OAuth2Strategy({
      authorizationURL: 'https://kick.com/oauth/authorize',
      tokenURL: 'https://kick.com/oauth/token',
      clientID: getConfiguredCredential('kick', 'clientId'),
      clientSecret: getConfiguredCredential('kick', 'clientSecret'),
      callbackURL: `${BACKEND_URL}/api/auth/kick/callback`,
      scope: 'user'
    }, async (accessToken, refreshToken, profile, done) => {
      setProviderConnection('kick', {
        accessToken,
        refreshToken: refreshToken || '',
        connected: true,
        connectedAt: new Date().toISOString(),
        profile: sanitizeProviderProfile('kick', profile) || { provider: 'kick', displayName: 'Kick account' }
      });
      addActivity('account-connected', { provider: 'kick' });
      await db.write();
      done(null, { provider: 'kick' });
    }));
  }

  if (isProviderConfigured('twitch')) {
    passport.use('twitch', new TwitchStrategy({
      clientID: getConfiguredCredential('twitch', 'clientId'),
      clientSecret: getConfiguredCredential('twitch', 'clientSecret'),
      callbackURL: `${BACKEND_URL}/api/auth/twitch/callback`,
      scope: 'user:read:email'
    }, async (accessToken, refreshToken, profile, done) => {
      setProviderConnection('twitch', {
        accessToken,
        refreshToken: refreshToken || '',
        connected: true,
        connectedAt: new Date().toISOString(),
        profile: sanitizeProviderProfile('twitch', profile)
      });
      setProviderConnection('twitch', {
        ...getStoredProvider('twitch'),
        streamKey: ''
      });
      addActivity('account-connected', { provider: 'twitch' });
      await db.write();
      done(null, { provider: 'twitch' });
    }));
  }

  if (isProviderConfigured('youtube')) {
    passport.use('youtube', new OAuth2Strategy({
      authorizationURL: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenURL: 'https://oauth2.googleapis.com/token',
      clientID: getConfiguredCredential('youtube', 'clientId'),
      clientSecret: getConfiguredCredential('youtube', 'clientSecret'),
      callbackURL: `${BACKEND_URL}/api/auth/youtube/callback`,
      scope: ['openid', 'profile', 'email', 'https://www.googleapis.com/auth/youtube.readonly'],
      state: true
    }, async (accessToken, refreshToken, params, profile, done) => {
      const googleProfile = profile && Object.keys(profile).length ? profile : await fetchGoogleUserProfile(accessToken);
      setProviderConnection('youtube', {
        accessToken,
        refreshToken: refreshToken || '',
        connected: true,
        connectedAt: new Date().toISOString(),
        profile: sanitizeProviderProfile('youtube', googleProfile)
      });
      addActivity('account-connected', { provider: 'youtube' });
      await db.write();
      done(null, { provider: 'youtube' });
    }));
  }
}

function ensureProviderReady(provider) {
  return (req, res, next) => {
    if (!isProviderConfigured(provider)) {
      return res.status(400).json({
        error: `${provider} credentials are missing.`,
        hint: `Open Settings and add ${provider} client credentials first.`
      });
    }

    next();
  };
}

function ensureValidProviderParam(req, res, next) {
  if (!ALLOWED_PROVIDERS.includes(req.params.provider)) {
    return res.status(404).json({ error: 'Provider not found.' });
  }

  next();
}

function ensureSafePluginCode(code) {
  try {
    extractPluginOutput(code);
    return true;
  } catch {
    return false;
  }
}

function extractPluginOutput(code) {
  const source = String(code ?? '').trim();
  const match = source.match(/^setOutput\s*\(([\s\S]+)\)\s*;?$/);
  if (!match) {
    throw new Error('Plugins must contain exactly one setOutput(JSON) call.');
  }

  return JSON.parse(match[1]);
}

function checkFfmpeg() {
  try {
    const ffmpegBinary = resolveBundledBinary('ffmpeg');
    const result = spawnSync(ffmpegBinary, ['-version'], { stdio: 'ignore' });
    return result.status === 0;
  } catch {
    return false;
  }
}

function getAppStatus() {
  const providers = ['twitch', 'youtube', 'kick'].map((provider) => ({
    provider,
    configured: isProviderConfigured(provider),
    connected: Boolean(getStoredProvider(provider).connected),
    profile: getStoredProvider(provider).profile
  }));

  const outputTargets = db.data.appConfig.stream.destinations?.filter((destination) => destination.enabled).length || 0;
  const ffmpegAvailable = checkFfmpeg();
  const hasStreamTarget = Boolean(
    db.data.appConfig.stream.rtmpUrl ||
    db.data.appConfig.stream.output === 'hls' ||
    outputTargets > 0
  );

  return {
    runtime: runtimeStatus,
    checks: {
      ffmpegAvailable,
      hasStreamTarget,
      packagedReady: true
    },
    providers,
    scheduler: db.data.scheduler,
    scenes: {
      total: db.data.scenes.length,
      active: db.data.appConfig.stream.scene
    },
    notifications: db.data.studio.notifications.slice(0, 8),
    activity: db.data.activityLog.slice(0, 8),
    pluginCount: db.data.plugins.length,
    enabledPluginCount: db.data.plugins.filter((plugin) => plugin.enabled).length
  };
}

function trackPluginLog(entry) {
  runtimeStatus.pluginLogs.unshift({
    id: nanoid(),
    createdAt: new Date().toISOString(),
    ...entry
  });
  runtimeStatus.pluginLogs = runtimeStatus.pluginLogs.slice(0, 20);
}

function pushNotification(type, message) {
  db.data.studio.notifications.unshift({
    id: nanoid(),
    type,
    message,
    createdAt: new Date().toISOString()
  });
  db.data.studio.notifications = db.data.studio.notifications.slice(0, 30);
}

function sanitizeScene(scene = {}, fallbackName = 'Scene') {
  const now = new Date().toISOString();
  return {
    id: sanitizePlainText(scene.id || nanoid(), 80) || nanoid(),
    name: sanitizePlainText(scene.name || fallbackName, 80) || fallbackName,
    type: sanitizeEnum(scene.type, ['live', 'break', 'vertical', 'countdown'], 'live'),
    createdAt: scene.createdAt || now,
    updatedAt: now,
    sources: Array.isArray(scene.sources)
      ? scene.sources.slice(0, 16).map((source, index) => ({
        id: sanitizePlainText(source?.id || nanoid(), 80) || nanoid(),
        type: sanitizeEnum(source?.type, ['webcam', 'screen', 'window', 'image', 'text', 'browser'], 'text'),
        name: sanitizePlainText(source?.name || `Source ${index + 1}`, 80) || `Source ${index + 1}`,
        enabled: sanitizeBoolean(source?.enabled, true),
        position: {
          x: sanitizeNumber(source?.position?.x, 0, 0, 4000),
          y: sanitizeNumber(source?.position?.y, 0, 0, 4000)
        },
        size: {
          width: sanitizeNumber(source?.size?.width, 320, 40, 4000),
          height: sanitizeNumber(source?.size?.height, 180, 40, 4000)
        },
        content: sanitizePlainText(source?.content || '', 400),
        url: source?.type === 'browser' ? sanitizeStreamUrl(source?.url || '', '') : '',
        opacity: sanitizeNumber(source?.opacity, 100, 0, 100)
      }))
      : []
  };
}

function sanitizeSchedulerConfig(scheduler = {}) {
  return {
    ...db.data.scheduler,
    enabled: sanitizeBoolean(scheduler.enabled, db.data.scheduler.enabled),
    scheduledFor: sanitizePlainText(scheduler.scheduledFor, 40),
    countdownSeconds: sanitizeNumber(scheduler.countdownSeconds, db.data.scheduler.countdownSeconds, 10, 7200),
    autoStart: sanitizeBoolean(scheduler.autoStart, db.data.scheduler.autoStart),
    autoApplyTitle: sanitizeBoolean(scheduler.autoApplyTitle, db.data.scheduler.autoApplyTitle),
    autoApplyCategory: sanitizeBoolean(scheduler.autoApplyCategory, db.data.scheduler.autoApplyCategory),
    title: sanitizePlainText(scheduler.title, 120),
    category: sanitizePlainText(scheduler.category, 120),
    checklistReminder: sanitizeBoolean(scheduler.checklistReminder, db.data.scheduler.checklistReminder)
  };
}

function buildHealthSummary() {
  const bitrateBase = Number(db.data.appConfig.stream.bitrate || 4500);
  runtimeStatus.bitrateKbps = runtimeStatus.streaming ? bitrateBase : 0;
  runtimeStatus.encoderStatus = runtimeStatus.streaming ? 'Streaming normally' : 'Idle';
  runtimeStatus.networkQuality = runtimeStatus.lastError ? 'Needs attention' : runtimeStatus.streaming ? 'Stable' : 'Standing by';
  runtimeStatus.cpuLoad = runtimeStatus.streaming ? Math.min(92, 22 + Math.round(bitrateBase / 250)) : 14;

  return {
    droppedFrames: runtimeStatus.droppedFrames,
    bitrateKbps: runtimeStatus.bitrateKbps,
    reconnectAttempts: runtimeStatus.reconnectAttempts,
    encoderStatus: runtimeStatus.encoderStatus,
    networkQuality: runtimeStatus.networkQuality,
    cpuLoad: runtimeStatus.cpuLoad,
    ffmpegMessage: runtimeStatus.lastError || 'No encoder warnings right now.'
  };
}

function getRecordingRoot() {
  return sanitizeOutputPath(db.data.appConfig.stream.outputPath, recordingsRoot);
}

function resolvePathInsideRoot(root, targetName) {
  const normalizedRoot = path.resolve(root);
  const candidate = path.resolve(normalizedRoot, targetName);
  const relative = path.relative(normalizedRoot, candidate);

  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error('Path escapes the allowed directory.');
  }

  return candidate;
}

function sanitizeRecordingName(value) {
  const cleaned = sanitizePlainText(value, 160);
  if (!cleaned) {
    return '';
  }

  return path.basename(cleaned) === cleaned ? cleaned : '';
}

function listRecordings() {
  const recordingRoot = getRecordingRoot();
  if (!fs.existsSync(recordingRoot)) {
    return [];
  }

  return fs.readdirSync(recordingRoot, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => {
      const fullPath = path.join(recordingRoot, entry.name);
      const stats = fs.statSync(fullPath);
      return {
        name: entry.name,
        path: fullPath,
        size: stats.size,
        modifiedAt: stats.mtime.toISOString()
      };
    })
    .sort((a, b) => new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime());
}

app.disable('x-powered-by');
app.use(helmet({
  crossOriginEmbedderPolicy: false
}));
app.use(cors({
  origin(origin, callback) {
    if (!origin) {
      callback(null, true);
      return;
    }

    if (origin === FRONTEND_URL) {
      callback(null, true);
      return;
    }

    callback(new Error('Origin not allowed by CORS'));
  },
  credentials: true
}));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 250 }));
app.use(session({
  name: 'browserstream.sid',
  secret: process.env.SESSION_SECRET || nanoid(),
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: BACKEND_URL.startsWith('https://'),
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 1000 * 60 * 60 * 12
  }
}));
app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

app.get('/api/health', (req, res) => {
  res.json({ ok: true, backendUrl: BACKEND_URL, frontendUrl: FRONTEND_URL });
});

app.get('/api/app/config', async (req, res) => {
  await ensureDb();
  res.json(getPublicConfig());
});

app.put('/api/app/config', async (req, res) => {
  await ensureDb();

  const incoming = req.body || {};
  db.data.appConfig.stream = sanitizeStreamConfig(incoming.stream || {});
  db.data.appConfig.desktop = sanitizeDesktopConfig(incoming.desktop || {});
  db.data.studio = sanitizeStudioConfig(incoming.studio || {});

  ALLOWED_PROVIDERS.forEach((provider) => {
    const updates = incoming.providers?.[provider];
    if (!updates) {
      return;
    }

    setProviderConnection(provider, sanitizeProviderCredentials(provider, updates));
  });

  addActivity('settings-saved', { section: 'app-config' });
  refreshStrategies();
  await db.write();

  res.json(getPublicConfig());
});

app.get('/api/app/status', async (req, res) => {
  await ensureDb();
  res.json(getAppStatus());
});

app.get('/api/scenes', async (req, res) => {
  await ensureDb();
  res.json(db.data.scenes);
});

app.put('/api/scenes', async (req, res) => {
  await ensureDb();
  const scenes = Array.isArray(req.body?.scenes) ? req.body.scenes : [];
  db.data.scenes = scenes.length
    ? scenes.slice(0, 12).map((scene, index) => sanitizeScene(scene, `Scene ${index + 1}`))
    : cloneDefaultData().scenes;
  addActivity('scenes-saved', { count: db.data.scenes.length });
  await db.write();
  res.json(db.data.scenes);
});

app.get('/api/scheduler', async (req, res) => {
  await ensureDb();
  res.json(db.data.scheduler);
});

app.put('/api/scheduler', async (req, res) => {
  await ensureDb();
  db.data.scheduler = sanitizeSchedulerConfig(req.body || {});
  addActivity('scheduler-saved', { enabled: db.data.scheduler.enabled });
  await db.write();
  res.json(db.data.scheduler);
});

app.get('/api/setup/wizard', async (req, res) => {
  await ensureDb();
  const appStatus = getAppStatus();
  res.json({
    wizard: db.data.wizard,
    steps: [
      { id: 'ffmpeg', label: 'Video tools check', complete: appStatus.checks.ffmpegAvailable },
      { id: 'credentials', label: 'Provider credentials', complete: appStatus.providers.some((provider) => provider.configured) },
      { id: 'accounts', label: 'Account connection', complete: appStatus.providers.some((provider) => provider.connected) },
      { id: 'target', label: 'Stream destination', complete: appStatus.checks.hasStreamTarget },
      { id: 'devices', label: 'Camera and mic test', complete: db.data.wizard.completedSteps.includes('devices') }
    ]
  });
});

app.post('/api/setup/wizard/complete', async (req, res) => {
  await ensureDb();
  const step = sanitizePlainText(req.body?.step || '', 40);
  if (!step) {
    return res.status(400).json({ error: 'Step is required.' });
  }

  db.data.wizard.completedSteps = Array.from(new Set([...db.data.wizard.completedSteps, step]));
  db.data.wizard.lastCompletedAt = new Date().toISOString();
  addActivity('wizard-step-complete', { step });
  await db.write();
  res.json(db.data.wizard);
});

app.get('/api/stream/health', async (req, res) => {
  await ensureDb();
  res.json(buildHealthSummary());
});

app.get('/api/recordings', async (req, res) => {
  await ensureDb();
  res.json({
    root: getRecordingRoot(),
    files: listRecordings()
  });
});

app.patch('/api/recordings/:name', async (req, res) => {
  await ensureDb();
  const currentName = sanitizeRecordingName(req.params.name);
  const nextName = sanitizeRecordingName(req.body?.nextName || '');
  if (!currentName || !nextName) {
    return res.status(400).json({ error: 'Recording names are required.' });
  }

  const root = getRecordingRoot();
  let currentPath;
  let nextPath;

  try {
    currentPath = resolvePathInsideRoot(root, currentName);
    nextPath = resolvePathInsideRoot(root, nextName);
  } catch {
    return res.status(400).json({ error: 'Invalid recording path.' });
  }

  if (!fs.existsSync(currentPath)) {
    return res.status(404).json({ error: 'Recording not found.' });
  }

  fs.renameSync(currentPath, nextPath);
  addActivity('recording-renamed', { from: currentName, to: nextName });
  res.json({ success: true });
});

app.get('/api/chat', async (req, res) => {
  await ensureDb();
  res.json(db.data.chat);
});

app.post('/api/chat/message', async (req, res) => {
  await ensureDb();
  const provider = sanitizeEnum(req.body?.provider, ALLOWED_PROVIDER_KEYS, 'custom');
  const author = sanitizePlainText(req.body?.author || 'Studio', 80);
  const message = sanitizePlainText(req.body?.message || '', 280);
  if (!message) {
    return res.status(400).json({ error: 'Message is required.' });
  }

  db.data.chat.messages.unshift({
    id: nanoid(),
    provider,
    author,
    message,
    createdAt: new Date().toISOString()
  });
  db.data.chat.messages = db.data.chat.messages.slice(0, 40);
  addActivity('chat-message-sent', { provider });
  await db.write();
  res.json(db.data.chat);
});

app.post('/api/chat/pin', async (req, res) => {
  await ensureDb();
  const message = sanitizePlainText(req.body?.message || '', 280);
  db.data.chat.pinnedMessage = message
    ? { message, createdAt: new Date().toISOString() }
    : null;
  await db.write();
  res.json(db.data.chat);
});

app.post('/api/stream/marker', async (req, res) => {
  await ensureDb();
  const label = sanitizePlainText(req.body?.label || 'Highlight marker', 120);
  const marker = {
    id: nanoid(),
    label,
    createdAt: new Date().toISOString()
  };
  db.data.studio.clipMarkers.unshift(marker);
  db.data.studio.bookmarks.unshift(marker);
  db.data.studio.clipMarkers = db.data.studio.clipMarkers.slice(0, 100);
  db.data.studio.bookmarks = db.data.studio.bookmarks.slice(0, 100);
  addActivity('stream-marker-added', { label });
  await db.write();
  res.json(marker);
});

app.get('/api/app/export', async (req, res) => {
  await ensureDb();
  res.json({
    exportedAt: new Date().toISOString(),
    data: getSanitizedExportData()
  });
});

app.post('/api/app/import', async (req, res) => {
  await ensureDb();
  if (!req.body?.data || typeof req.body.data !== 'object') {
    return res.status(400).json({ error: 'Invalid backup payload.' });
  }

  db.data = {
    ...cloneDefaultData(),
    ...req.body.data
  };
  await ensureDb();
  addActivity('backup-imported', {});
  refreshStrategies();
  await db.write();
  res.json({ success: true, config: getPublicConfig() });
});

app.post('/api/app/reset', async (req, res) => {
  db.data = cloneDefaultData();
  runtimeStatus = {
    streaming: false,
    lastStartedAt: '',
    lastStoppedAt: '',
    lastError: '',
    pluginLogs: [],
    reconnectAttempts: 0,
    droppedFrames: 0,
    bitrateKbps: 0,
    encoderStatus: 'Idle',
    networkQuality: 'Stable',
    cpuLoad: 18
  };
  addActivity('app-reset', {});
  refreshStrategies();
  await db.write();
  res.json({ success: true, config: getPublicConfig() });
});

app.get('/api/providers/defaults/:provider', async (req, res) => {
  await ensureDb();

  const provider = req.params.provider;
  if (!ALLOWED_PROVIDER_KEYS.includes(provider)) {
    return res.status(404).json({ error: 'Provider not found.' });
  }

  res.json(getProviderDefaults(provider));
});

app.get('/api/providers/categories/:provider', ensureValidProviderParam, async (req, res) => {
  await ensureDb();

  const provider = req.params.provider;
  const search = sanitizePlainText(req.query.q || '', 60);

  try {
    let categories = [];

    if (provider === 'twitch') {
      categories = await fetchTwitchCategories(search);
    } else if (provider === 'youtube') {
      categories = await fetchYouTubeCategories(search);
    } else if (provider === 'kick') {
      categories = await fetchKickCategories(search);
    } else {
      return res.status(404).json({ error: 'Provider not found.' });
    }

    res.json({ provider, categories });
  } catch (error) {
    res.status(400).json({ error: error.message || 'Unable to fetch categories.' });
  }
});

app.post('/api/app/config/test', async (req, res) => {
  await ensureDb();

  const provider = sanitizePlainText(req.body?.provider || '', 20);
  if (!provider || !ALLOWED_PROVIDERS.includes(provider)) {
    return res.status(400).json({ error: 'Unknown provider.' });
  }

  res.json({
    provider,
    configured: isProviderConfigured(provider),
    connected: Boolean(getStoredProvider(provider).connected)
  });
});

app.get('/api/auth/status', async (req, res) => {
  await ensureDb();
  res.json({
    twitch: getPublicProvider('twitch'),
    youtube: getPublicProvider('youtube'),
    kick: getPublicProvider('kick')
  });
});

app.delete('/api/auth/:provider', ensureValidProviderParam, async (req, res) => {
  await ensureDb();

  const provider = req.params.provider;

  setProviderConnection(provider, {
    accessToken: '',
    refreshToken: '',
    connected: false,
    connectedAt: '',
    profile: null
  });
  addActivity('account-disconnected', { provider });
  await db.write();
  res.json({ success: true });
});

app.get('/api/auth/kick', ensureProviderReady('kick'), passport.authenticate('kick'));
app.get('/api/auth/kick/callback', passport.authenticate('kick', { failureRedirect: buildFrontendRedirect('/account?auth=failed') }), (req, res) => {
  res.redirect(buildFrontendRedirect('/account?auth=success'));
});

app.get('/api/auth/twitch', ensureProviderReady('twitch'), passport.authenticate('twitch'));
app.get('/api/auth/twitch/callback', passport.authenticate('twitch', { failureRedirect: buildFrontendRedirect('/account?auth=failed') }), (req, res) => {
  res.redirect(buildFrontendRedirect('/account?auth=success'));
});

app.get('/api/auth/youtube', ensureProviderReady('youtube'), passport.authenticate('youtube'));
app.get('/api/auth/youtube/callback', passport.authenticate('youtube', { failureRedirect: buildFrontendRedirect('/account?auth=failed') }), (req, res) => {
  res.redirect(buildFrontendRedirect('/account?auth=success'));
});

app.get('/api/plugins/templates', (req, res) => {
  res.json([
    {
      name: 'Countdown Overlay',
      code: 'setOutput({"message":"Countdown ready","seconds":30});'
    },
    {
      name: 'Scene Note',
      code: 'setOutput({"note":"Remember to greet chat and verify audio levels."});'
    }
  ]);
});

app.get('/api/plugins', async (req, res) => {
  await ensureDb();
  res.json(db.data.plugins);
});

app.post('/api/plugins/install', async (req, res) => {
  await ensureDb();

  const name = sanitizePlainText(req.body?.name || '', 80);
  const code = String(req.body?.code || '').trim();
  if (!name || !code) {
    return res.status(400).json({ error: 'Missing fields.' });
  }
  if (code.length > 10000) {
    return res.status(400).json({ error: 'Plugin code is too large.' });
  }
  if (!ensureSafePluginCode(code)) {
    return res.status(400).json({ error: 'Plugin code contains blocked APIs.' });
  }

  const existingIndex = db.data.plugins.findIndex((plugin) => plugin.name.toLowerCase() === name.toLowerCase());
  const plugin = normalizePlugin({
    name,
    code,
    description: sanitizePlainText(req.body?.description || '', 180),
    version: sanitizePlainText(req.body?.version || '1.0.0', 20) || '1.0.0',
    permissions: Array.isArray(req.body?.permissions) ? req.body.permissions.map((item) => sanitizePlainText(item, 40)).filter(Boolean).slice(0, 8) : ['overlay'],
    trusted: sanitizeBoolean(req.body?.trusted, false),
    category: sanitizePlainText(req.body?.category || 'Utility', 40) || 'Utility',
    enabled: true,
    createdAt: new Date().toISOString()
  });

  if (existingIndex >= 0) {
    db.data.plugins[existingIndex] = {
      ...db.data.plugins[existingIndex],
      ...plugin
    };
  } else {
    db.data.plugins.push(plugin);
  }

  addActivity('plugin-saved', { name });
  await db.write();
  res.json({ success: true, plugin });
});

app.patch('/api/plugins/:name', async (req, res) => {
  await ensureDb();

  const pluginName = sanitizePlainText(req.params.name, 80);
  const plugin = db.data.plugins.find((item) => item.name === pluginName);
  if (!plugin) {
    return res.status(404).json({ error: 'Plugin not found.' });
  }

  if (typeof req.body?.enabled === 'boolean') {
    plugin.enabled = req.body.enabled;
  }

  addActivity('plugin-updated', { name: plugin.name, enabled: plugin.enabled });
  await db.write();
  res.json({ success: true, plugin });
});

app.delete('/api/plugins/:name', async (req, res) => {
  await ensureDb();
  const pluginName = sanitizePlainText(req.params.name, 80);
  db.data.plugins = db.data.plugins.filter((plugin) => plugin.name !== pluginName);
  addActivity('plugin-removed', { name: pluginName });
  await db.write();
  res.json({ success: true });
});

app.post('/api/plugins/execute', async (req, res) => {
  await ensureDb();

  const pluginName = sanitizePlainText(req.body?.name || '', 80);
  const plugin = db.data.plugins.find((item) => item.name === pluginName);
  if (!plugin) {
    return res.status(404).json({ error: 'Plugin not found.' });
  }
  if (!plugin.enabled) {
    return res.status(400).json({ error: 'Plugin is disabled.' });
  }
  if (!plugin.trusted) {
    return res.status(403).json({ error: 'Only trusted plugins can run.' });
  }

  try {
    const output = extractPluginOutput(plugin.code);
    plugin.lastRunAt = new Date().toISOString();
    trackPluginLog({ plugin: plugin.name, status: 'success', output });
    addActivity('plugin-ran', { name: plugin.name });
    await db.write();
    res.json({ success: true, output });
  } catch (error) {
    trackPluginLog({ plugin: plugin.name, status: 'error', error: error.message });
    res.status(400).json({ error: 'Plugin execution error', details: error.message });
  }
});

app.post('/api/stream/start', async (req, res) => {
  await ensureDb();

  if (ffmpegProcess) {
    return res.status(400).json({ success: false, message: 'Stream already running.' });
  }

  const stream = db.data.appConfig.stream;
  const bitrate = Number(stream.bitrate || 4500);
  const resolution = stream.resolution || '1280x720';
  const output = stream.output || 'rtmp';
  const rtmpBase = stream.rtmpUrl || process.env.RTMP_URL || 'rtmp://localhost/live';
  const streamKey = stream.streamKey || 'stream';
  const activeDestinations = (stream.destinations || []).filter((destination) => destination.enabled && destination.rtmpUrl);
  const primaryTarget = `${rtmpBase.replace(/\/$/, '')}/${streamKey}`;
  const outputTargets = activeDestinations.length
    ? activeDestinations.map((destination) => `${destination.rtmpUrl.replace(/\/$/, '')}/${destination.streamKey || 'stream'}`)
    : [primaryTarget];
  const targetUrl = output === 'hls'
    ? resolvePathInsideRoot(getRecordingRoot(), 'stream.m3u8')
    : outputTargets.length > 1
      ? outputTargets.join(' | ')
      : outputTargets[0];
  const [width, height] = resolution.split('x').map(Number);
  const ffmpegBinary = resolveBundledBinary('ffmpeg');
  const qualityPreset = stream.qualityPreset === 'Quality' ? 'medium' : stream.qualityPreset === 'Performance' ? 'superfast' : 'veryfast';

  const ffmpegArgs = [
    '-re',
    '-f', 'lavfi',
    '-i', `testsrc=size=${width}x${height}:rate=30`,
    '-f', 'lavfi',
    '-i', 'sine=frequency=1000',
    '-c:v', 'libx264',
    '-preset', qualityPreset,
    '-b:v', `${bitrate}k`,
    '-c:a', 'aac',
    '-b:a', '128k',
    ...(output === 'hls'
      ? ['-f', 'hls', targetUrl]
      : outputTargets.length > 1
        ? ['-f', 'tee', outputTargets.map((url) => `[f=flv]${url}`).join('|')]
        : ['-f', 'flv', targetUrl])
  ];

  ffmpegProcess = spawn(ffmpegBinary, ffmpegArgs);
  runtimeStatus.streaming = true;
  runtimeStatus.lastStartedAt = new Date().toISOString();
  runtimeStatus.lastError = '';
  runtimeStatus.droppedFrames = 0;
  runtimeStatus.reconnectAttempts = 0;
  db.data.studio.lastRecoveryNotice = '';
  db.data.studio.analytics.unshift({
    id: nanoid(),
    startedAt: runtimeStatus.lastStartedAt,
    title: stream.title,
    category: stream.category,
    scene: stream.scene,
    destinations: outputTargets.length,
    status: 'started'
  });
  addActivity('stream-started', { scene: stream.scene, output, destinations: outputTargets.length });

  ffmpegProcess.stderr.on('data', (data) => {
    runtimeStatus.lastError = String(data).trim();
    runtimeStatus.droppedFrames += 1;
    runtimeStatus.reconnectAttempts += 1;
  });

  ffmpegProcess.on('close', () => {
    runtimeStatus.streaming = false;
    runtimeStatus.lastStoppedAt = new Date().toISOString();
    runtimeStatus.encoderStatus = 'Stopped';
    if (db.data.studio.analytics[0]) {
      db.data.studio.analytics[0] = {
        ...db.data.studio.analytics[0],
        endedAt: runtimeStatus.lastStoppedAt,
        status: 'stopped'
      };
    }
    ffmpegProcess = null;
  });

  await db.write();
  res.json({ success: true, message: 'Stream started.', targetUrl });
});

app.post('/api/stream/stop', async (req, res) => {
  if (!ffmpegProcess) {
    return res.status(400).json({ success: false, message: 'No stream running.' });
  }

  ffmpegProcess.kill('SIGINT');
  ffmpegProcess = null;
  runtimeStatus.streaming = false;
  runtimeStatus.lastStoppedAt = new Date().toISOString();
  runtimeStatus.encoderStatus = 'Stopped';
  if (db.data?.studio?.analytics?.[0]) {
    db.data.studio.analytics[0] = {
      ...db.data.studio.analytics[0],
      endedAt: runtimeStatus.lastStoppedAt,
      status: 'stopped'
    };
  }
  addActivity('stream-stopped', {});
  await db.write();
  res.json({ success: true, message: 'Stream stopped.' });
});

app.get('/api/runtime/logs', (req, res) => {
  res.json(runtimeStatus.pluginLogs);
});

app.use((error, req, res, next) => {
  if (error?.message === 'Origin not allowed by CORS') {
    return res.status(403).json({ error: 'Origin not allowed.' });
  }

  console.error(error);
  res.status(500).json({ error: 'Internal server error.' });
});

async function startServer() {
  if (server) {
    return server;
  }

  await ensureDb();
  refreshStrategies();
  server = await new Promise((resolve) => {
    const instance = app.listen(PORT, HOST, () => {
      console.log(`Backend running on ${HOST}:${PORT}`);
      resolve(instance);
    });
  });

  return server;
}

async function stopServer() {
  if (!server) {
    return;
  }

  await new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });

  server = null;
}

if (require.main === module) {
  startServer();
}

module.exports = {
  app,
  startServer,
  stopServer
};
