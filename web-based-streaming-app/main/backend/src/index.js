const vm = require('vm');
const { spawn } = require('child_process');
let ffmpegProcess = null;
require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const session = require('express-session');
const rateLimit = require('express-rate-limit');
const passport = require('passport');
const TwitchStrategy = require('passport-twitch-new').Strategy;
const YouTubeStrategy = require('passport-youtube-v3').Strategy;
const { nanoid } = require('nanoid');
const OAuth2Strategy = require('passport-oauth2');
const sanitizeHtml = require('sanitize-html');

const { Low } = require('lowdb');
const { JSONFile } = require('lowdb/node');

const app = express();

const getAvailablePort = require('./getAvailablePort');
let PORT = process.env.PORT || 4000;

// Local DB per user

const adapter = new JSONFile('db.json');
const db = new Low(adapter, { users: [], plugins: [] }); // Pass defaultData here
// Initialize db
const dbReady = (async function initDb() {
  await db.read();
  await db.write();
})();

app.use(helmet());
app.use(cors({ origin: 'http://localhost:3000', credentials: true }));
app.use(express.json());
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));
app.use(session({
  secret: process.env.SESSION_SECRET || nanoid(),
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // Only send cookie over HTTPS in production
    httpOnly: true // Prevent client-side JS from accessing the cookie
  }
}));
app.use(passport.initialize());
app.use(passport.session());

// --- All route definitions must be after this point ---

// User settings API (per user, local DB)
app.post('/api/user/settings', (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: 'Not authenticated' });
  const { bitrate, resolution, output } = req.body;
  if (!bitrate || !resolution || !output) return res.status(400).json({ error: 'Missing fields' });
  db.get('users').find({ id: req.user.id }).assign({ settings: { bitrate, resolution, output } }).write();
  res.json({ success: true });
});

app.get('/api/user/settings', (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: 'Not authenticated' });
  const user = db.get('users').find({ id: req.user.id }).value();
  res.json(user?.settings || {});
});

app.post('/api/plugins/execute', (req, res) => {
  const { name, input } = req.body;
  const plugin = db.get('plugins').find({ name }).value();
  if (!plugin) return res.status(404).json({ error: 'Plugin not found' });
  // Sandbox API: only allow limited access
  const sandbox = {
    input,
    output: null,
    setOutput: (val) => { sandbox.output = val; },
    console: { log: (...args) => {} }, // disable console.log
  };
  try {
    vm.createContext(sandbox);
    vm.runInContext(`(function(){ ${plugin.code} })()`, sandbox, { timeout: 1000 });
    res.json({ success: true, output: sandbox.output });
  } catch (e) {
    res.status(400).json({ error: 'Plugin execution error', details: e.message });
  }
});

app.post('/api/stream/start', async (req, res) => {
  if (ffmpegProcess) {
    return res.status(400).json({ success: false, message: 'Stream already running.' });
  }
  let bitrate = 2500, resolution = '1280x720', output = 'rtmp';
  let rtmpUrl = process.env.RTMP_URL || 'rtmp://localhost/live/stream';
  if (req.isAuthenticated()) {
    const user = db.get('users').find({ id: req.user.id }).value();
    if (user?.settings) {
      bitrate = user.settings.bitrate || bitrate;
      resolution = user.settings.resolution || resolution;
      output = user.settings.output || output;
    }
  }
  // Parse resolution
  let [width, height] = resolution.split('x').map(Number);
  // Example uses testsrc, replace with real video/audio capture for production
  const ffmpegArgs = [
    '-re',
    '-f', 'lavfi',
    `-i`, `testsrc=size=${width}x${height}:rate=30`,
    '-f', 'lavfi',
    '-i', 'sine=frequency=1000',
    '-c:v', 'libx264',
    '-preset', 'veryfast',
    '-b:v', `${bitrate}k`,
    '-c:a', 'aac',
    '-b:a', '128k',
    '-f', output === 'hls' ? 'hls' : 'flv',
    rtmpUrl
  ];
  ffmpegProcess = spawn('ffmpeg', ffmpegArgs);
  ffmpegProcess.stderr.on('data', data => {
    console.log(`[ffmpeg] ${data}`);
  });
  ffmpegProcess.on('close', code => {
    console.log(`ffmpeg exited with code ${code}`);
    ffmpegProcess = null;
  });
  res.json({ success: true, message: 'Stream started (ffmpeg running).' });
});

app.post('/api/stream/stop', (req, res) => {
  if (!ffmpegProcess) {
    return res.status(400).json({ success: false, message: 'No stream running.' });
  }
  ffmpegProcess.kill('SIGINT');
  ffmpegProcess = null;
  res.json({ success: true, message: 'Stream stopped (ffmpeg killed).' });
});

// Passport strategies (Twitch, YouTube, Kick)
// Kick OAuth2 Strategy (customize endpoints as needed)
passport.use('kick', new OAuth2Strategy({
  authorizationURL: 'https://kick.com/oauth/authorize', // Replace with actual Kick OAuth2 URL
  tokenURL: 'https://kick.com/oauth/token', // Replace with actual Kick OAuth2 URL
  clientID: process.env.KICK_CLIENT_ID,
  clientSecret: process.env.KICK_CLIENT_SECRET,
  callbackURL: '/api/auth/kick/callback',
  scope: 'user', // Adjust scope as needed
}, async (accessToken, refreshToken, profile, done) => {
  await dbReady;
  // Kick does not provide profile by default, so fetch user info if needed
  // For now, store accessToken only
  let user = db.data.users.find(u => u.provider === 'kick' && u.accessToken === accessToken);
  if (!user) {
    user = { id: accessToken, provider: 'kick', profile: {}, accessToken };
    db.data.users.push(user);
    await db.write();
  }
  return done(null, user);
}));
passport.use(new TwitchStrategy({
  clientID: process.env.TWITCH_CLIENT_ID,
  clientSecret: process.env.TWITCH_CLIENT_SECRET,
  callbackURL: '/api/auth/twitch/callback',
  scope: 'user:read:email'
}, async (accessToken, refreshToken, profile, done) => {
  await dbReady;
  // Save or update user in db
  let user = db.data.users.find(u => u.id === profile.id);
  if (!user) {
    user = { id: profile.id, provider: 'twitch', profile, accessToken };
    db.data.users.push(user);
    await db.write();
  }
  return done(null, user);
}));

passport.use(new YouTubeStrategy({
  clientID: process.env.YOUTUBE_CLIENT_ID,
  clientSecret: process.env.YOUTUBE_CLIENT_SECRET,
  callbackURL: '/api/auth/youtube/callback'
}, async (accessToken, refreshToken, profile, done) => {
  await dbReady;
  let user = db.data.users.find(u => u.id === profile.id);
  if (!user) {
    user = { id: profile.id, provider: 'youtube', profile, accessToken };
    db.data.users.push(user);
    await db.write();
  }
  return done(null, user);
}));

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  await dbReady;
  const user = db.data.users.find(u => u.id === id);
  done(null, user);
});

// Auth routes
app.get('/api/auth/kick', passport.authenticate('kick'));
app.get('/api/auth/kick/callback', passport.authenticate('kick', { failureRedirect: '/' }), (req, res) => {
  res.redirect('http://localhost:3000/account');
});
app.get('/api/auth/twitch', passport.authenticate('twitch'));
app.get('/api/auth/twitch/callback', passport.authenticate('twitch', { failureRedirect: '/' }), (req, res) => {
  res.redirect('http://localhost:3000/account');
});
app.get('/api/auth/youtube', passport.authenticate('youtube'));
app.get('/api/auth/youtube/callback', passport.authenticate('youtube', { failureRedirect: '/' }), (req, res) => {
  res.redirect('http://localhost:3000/account');
});


// Plugin API (secure, sanitized)
app.post('/api/plugins/install', async (req, res) => {
  await dbReady;
  const { name, code } = req.body;
  if (!name || !code) return res.status(400).json({ error: 'Missing fields' });
  const safeName = sanitizeHtml(name);
  const safeCode = sanitizeHtml(code);
  db.data.plugins.push({ name: safeName, code: safeCode });
  await db.write();
  res.json({ success: true });
});

app.get('/api/plugins', async (req, res) => {
  await dbReady;
  res.json(db.data.plugins);
});
app.delete('/api/plugins/:name', async (req, res) => {
  await dbReady;
  const safeName = sanitizeHtml(req.params.name);
  db.data.plugins = db.data.plugins.filter(p => p.name !== safeName);
  await db.write();
  res.json({ success: true });
});


// User info (secure)
app.get('/api/user', async (req, res) => {
  await dbReady;
  if (!req.isAuthenticated()) return res.status(401).json({ error: 'Not authenticated' });
  res.json(req.user);
});


// Start server on available port
(async () => {
  PORT = await getAvailablePort(PORT);
  app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));
})();
