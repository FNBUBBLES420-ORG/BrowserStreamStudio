export type ProviderName = 'twitch' | 'youtube' | 'kick';

export type StreamDestination = {
  id: string;
  provider: ProviderName | 'custom';
  label: string;
  rtmpUrl: string;
  streamKey: string;
  enabled: boolean;
};

export type ProviderConfig = {
  clientId: string;
  clientSecret: string;
  connected: boolean;
  connectedAt: string;
  profile: {
    provider: string;
    id: string;
    displayName: string;
    username?: string;
    avatar?: string;
  } | null;
};

export type SceneSource = {
  id: string;
  type: 'webcam' | 'screen' | 'window' | 'image' | 'text' | 'browser';
  name: string;
  enabled: boolean;
  position: { x: number; y: number };
  size: { width: number; height: number };
  content: string;
  url?: string;
  opacity?: number;
};

export type Scene = {
  id: string;
  name: string;
  type: 'live' | 'break' | 'vertical' | 'countdown';
  createdAt: string;
  updatedAt: string;
  sources: SceneSource[];
};

export type SchedulerConfig = {
  enabled: boolean;
  scheduledFor: string;
  countdownSeconds: number;
  autoStart: boolean;
  autoApplyTitle: boolean;
  autoApplyCategory: boolean;
  title: string;
  category: string;
  checklistReminder: boolean;
};

export type WizardState = {
  completedSteps: string[];
  lastCompletedAt: string;
  dismissed: boolean;
};

export type ChatMessage = {
  id: string;
  provider: ProviderName | 'custom';
  author: string;
  message: string;
  createdAt: string;
};

export type ChatState = {
  messages: ChatMessage[];
  pinnedMessage: { message: string; createdAt: string } | null;
  moderationShortcuts: string[];
};

export type StudioNote = {
  notes: string;
  sponsorBanner: string;
  brandedOverlayName: string;
  donationUrl: string;
  clipMarkers: Array<{ id: string; label: string; createdAt: string }>;
  bookmarks: Array<{ id: string; label: string; createdAt: string }>;
  analytics: Array<Record<string, unknown>>;
  lastRecoveryNotice: string;
  notifications: AppNotification[];
};

export type StreamConfig = {
  provider: ProviderName | 'custom';
  bitrate: number;
  resolution: string;
  output: 'rtmp' | 'hls';
  scene: string;
  qualityPreset: 'Performance' | 'Balanced' | 'Quality';
  orientation: 'landscape' | 'portrait';
  title: string;
  category: string;
  rtmpUrl: string;
  streamKey: string;
  destinations: StreamDestination[];
  outputPath: string;
  recordWhileStreaming: boolean;
  micEnabled: boolean;
  systemAudioEnabled: boolean;
  chatDockEnabled: boolean;
  videoDeviceId: string;
  audioInputDeviceId: string;
  audioOutputDeviceId: string;
  micVolume: number;
  systemVolume: number;
};

export type DesktopConfig = {
  closeToTray: boolean;
  minimizeToTray: boolean;
  launchOnStartup: boolean;
  checkDependenciesOnLaunch: boolean;
};

export type AppConfig = {
  stream: StreamConfig;
  desktop: DesktopConfig;
  scenes: Scene[];
  scheduler: SchedulerConfig;
  wizard: WizardState;
  chat: ChatState;
  studio: StudioNote;
  providers: Record<ProviderName, ProviderConfig>;
};

export type AppNotification = {
  id: string;
  type: string;
  message: string;
  createdAt: string;
};

export type StreamHealth = {
  droppedFrames: number;
  bitrateKbps: number;
  reconnectAttempts: number;
  encoderStatus: string;
  networkQuality: string;
  cpuLoad: number;
  ffmpegMessage: string;
};

export type AppStatus = {
  runtime: {
    streaming: boolean;
    lastStartedAt: string;
    lastStoppedAt: string;
    lastError: string;
    pluginLogs: Array<{
      id: string;
      plugin: string;
      status: string;
      output?: unknown;
      error?: string;
      createdAt: string;
    }>;
    reconnectAttempts?: number;
    droppedFrames?: number;
    bitrateKbps?: number;
    encoderStatus?: string;
    networkQuality?: string;
    cpuLoad?: number;
  };
  checks: {
    ffmpegAvailable: boolean;
    hasStreamTarget: boolean;
    packagedReady: boolean;
  };
  providers: Array<{
    provider: ProviderName;
    configured: boolean;
    connected: boolean;
    profile: ProviderConfig['profile'];
  }>;
  scheduler?: SchedulerConfig;
  scenes?: {
    total: number;
    active: string;
  };
  notifications?: AppNotification[];
  activity: Array<{
    id: string;
    type: string;
    details: Record<string, unknown>;
    createdAt: string;
  }>;
  pluginCount: number;
  enabledPluginCount: number;
};

export type Plugin = {
  name: string;
  code: string;
  description: string;
  version: string;
  permissions: string[];
  trusted: boolean;
  category: string;
  enabled: boolean;
  createdAt: string;
  lastRunAt: string;
  permissionLevel: string;
};

export type DesktopRuntime = {
  backendUrl: string;
  frontendUrl: string;
  isDesktop: boolean;
  isPackaged: boolean;
};

export type DesktopPreferences = {
  closeToTray: boolean;
  minimizeToTray: boolean;
  launchOnStartup: boolean;
  openDevToolsOnLaunch: boolean;
};

export type RecordingFile = {
  name: string;
  path: string;
  size: number;
  modifiedAt: string;
};

export type UpdateCheck = {
  checkedAt: string;
  currentVersion: string;
  status: string;
  message: string;
};
