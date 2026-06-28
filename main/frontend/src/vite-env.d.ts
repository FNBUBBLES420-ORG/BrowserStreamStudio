/// <reference types="vite/client" />

interface Window {
  electronAPI?: {
    getRuntime: () => Promise<unknown>;
    getPreferences: () => Promise<unknown>;
    savePreferences: (preferences: unknown) => Promise<unknown>;
    openExternal: (url: string) => Promise<boolean>;
    openRecordingFolder: (targetPath: string) => Promise<boolean>;
    revealRecordingFile: (targetPath: string) => Promise<boolean>;
    checkForUpdates: () => Promise<unknown>;
  };
}
