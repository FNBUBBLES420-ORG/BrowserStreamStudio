import type { DesktopPreferences, DesktopRuntime, UpdateCheck } from './types';

let runtimePromise: Promise<DesktopRuntime> | null = null;

const fallbackRuntime: DesktopRuntime = {
  backendUrl: '',
  frontendUrl: window.location.origin,
  isDesktop: false,
  isPackaged: false
};

export async function getDesktopRuntime(): Promise<DesktopRuntime> {
  if (!runtimePromise) {
    runtimePromise = (async () => {
      if (window.electronAPI?.getRuntime) {
        try {
          return await window.electronAPI.getRuntime() as DesktopRuntime;
        } catch {
          return fallbackRuntime;
        }
      }

      return fallbackRuntime;
    })();
  }

  return runtimePromise;
}

export async function buildApiUrl(endpoint: string): Promise<string> {
  const runtime = await getDesktopRuntime();
  if (!runtime.backendUrl) {
    return endpoint;
  }

  return `${runtime.backendUrl}${endpoint}`;
}

export async function apiRequest<T>(endpoint: string, init?: RequestInit): Promise<T> {
  const url = await buildApiUrl(endpoint);
  let lastError: unknown = null;

  for (let attempt = 0; attempt < 10; attempt += 1) {
    try {
      const response = await fetch(url, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(init?.headers || {})
        },
        ...init
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || data.message || 'Request failed');
      }

      return data as T;
    } catch (error) {
      lastError = error;

      if (attempt === 9) {
        throw error;
      }

      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Request failed');
}

export async function openProviderAuth(provider: string) {
  const url = await buildApiUrl(`/api/auth/${provider}`);
  window.location.href = url;
}

export async function openExternalUrl(url: string) {
  let safeUrl = '';

  try {
    const parsed = new URL(url);
    if (!['https:', 'http:'].includes(parsed.protocol)) {
      return;
    }
    safeUrl = parsed.toString();
  } catch {
    return;
  }

  if (window.electronAPI?.openExternal) {
    try {
      const opened = await window.electronAPI.openExternal(safeUrl);
      if (opened) {
        return;
      }
    } catch {}
  }

  window.open(safeUrl, '_blank', 'noopener,noreferrer');
}

export async function getDesktopPreferences(): Promise<DesktopPreferences | null> {
  if (!window.electronAPI?.getPreferences) {
    return null;
  }

  try {
    return await window.electronAPI.getPreferences() as DesktopPreferences;
  } catch {
    return null;
  }
}

export async function saveDesktopPreferences(preferences: Partial<DesktopPreferences>): Promise<DesktopPreferences | null> {
  if (!window.electronAPI?.savePreferences) {
    return null;
  }

  try {
    return await window.electronAPI.savePreferences(preferences) as DesktopPreferences;
  } catch {
    return null;
  }
}

export async function openDesktopPath(targetPath: string): Promise<boolean> {
  if (!window.electronAPI?.openRecordingFolder) {
    return false;
  }

  try {
    return await window.electronAPI.openRecordingFolder(targetPath);
  } catch {
    return false;
  }
}

export async function showItemInFolder(targetPath: string): Promise<boolean> {
  if (!window.electronAPI?.revealRecordingFile) {
    return false;
  }

  try {
    return await window.electronAPI.revealRecordingFile(targetPath);
  } catch {
    return false;
  }
}

export async function checkForDesktopUpdates(): Promise<UpdateCheck | null> {
  if (!window.electronAPI?.checkForUpdates) {
    return null;
  }

  try {
    return await window.electronAPI.checkForUpdates() as UpdateCheck;
  } catch {
    return null;
  }
}
