import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// The dev server proxies /api to a Kwickbot backend, so login, the refresh
// cookie and every API call behave exactly as they do in the dashboard.
//   VITE_API_PROXY=http://localhost:5002        local backend on the local DB copy (default)
//   VITE_API_PROXY=https://admin.kwickbot.in    live API, real merchants
//   VITE_SA_API_PROXY=http://localhost:5003     new super admin API (default)
// The backend only accepts super admin logins from the admin host, so requests
// are presented as coming from VITE_PROXY_ORIGIN (default https://admin.kwickbot.in).
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const target = (env.VITE_API_PROXY || 'http://localhost:5002').replace(/\/$/, '');
  const remote = !/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(target);
  const presentAs = (env.VITE_PROXY_ORIGIN || 'https://admin.kwickbot.in').replace(/\/$/, '');

  const proxy = {
    target,
    changeOrigin: true,
    secure: true,
    // CORS/CSRF checks and the super admin domain check read Origin/Referer
    headers: { origin: presentAs, referer: `${presentAs}/` },
    // Keep the live API's cookies on localhost so the refresh cookie works here
    ...(remote && { cookieDomainRewrite: { '*': '' } })
  };

  return {
    plugins: [react()],
    server: {
      port: 5173, // already on the backend dev allow-list (middleware/originSecurity.js)
      strictPort: true,
      proxy: {
        // New super admin API (plans, coupons, offers): local by default
        '/sa-api': {
          target: (env.VITE_SA_API_PROXY || 'http://localhost:5003').replace(/\/$/, ''),
          changeOrigin: true
        },
        '/api': proxy,
        '/socket.io': { ...proxy, ws: true }
      }
    },
    build: { outDir: 'dist', sourcemap: false }
  };
});
