import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ command }) => ({
  base: './',
  plugins: [
    react(),
    {
      name: 'browserstream-csp',
      transformIndexHtml(html) {
        if (command !== 'build') {
          return html;
        }

        const csp = [
          "default-src 'self'",
          "base-uri 'self'",
          "object-src 'none'",
          "form-action 'self'",
          "frame-ancestors 'none'",
          "script-src 'self'",
          "style-src 'self' 'unsafe-inline'",
          "img-src 'self' data: https:",
          "font-src 'self' data:",
          "connect-src 'self' http://127.0.0.1:4000 http://localhost:4000 https:",
          "media-src 'self' blob: data:",
          "frame-src 'self' https://www.twitch.tv https://player.twitch.tv https://www.youtube.com https://www.youtube-nocookie.com https://kick.com"
        ].join('; ');

        return html.replace(
          '</head>',
          `    <meta http-equiv="Content-Security-Policy" content="${csp}" />\n  </head>`
        );
      }
    }
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  },
  server: {
    port: 3000,
    open: false,
    proxy: {
      '/api': 'http://localhost:4000'
    }
  },
  build: {
    outDir: 'dist'
  }
}));
