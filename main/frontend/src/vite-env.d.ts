/// <reference types="vite/client" />

interface Window {
  electronAPI?: {
    send: (channel: string, data?: unknown) => void;
    receive: (channel: string, callback: (...args: unknown[]) => void) => void;
    invoke: <T = unknown>(channel: string, data?: unknown) => Promise<T>;
  };
}
