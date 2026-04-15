import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiBaseUrl = env.VITE_API_BASE_URL || env.VITE_API_URL || "";
  let apiOrigin = "";

  try {
    apiOrigin = apiBaseUrl ? new URL(apiBaseUrl).origin : "";
  } catch {
    apiOrigin = "";
  }

  const escapedApiOrigin = apiOrigin.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const apiPrefix = apiOrigin ? `^${escapedApiOrigin}` : "";
  const schemesAllPattern = new RegExp(`${apiPrefix}/api/schemes/all$`);
  const schemeDetailPattern = new RegExp(`${apiPrefix}/api/schemes/[^/]+$`);
  const staticDataPattern = new RegExp(`${apiPrefix}/api/(health|impact)$`);
  const apiRequestPattern = new RegExp(`${apiPrefix}/api/`);

  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: "autoUpdate",
        injectRegister: "auto",
        includeAssets: ["yojnapath-favicon.svg"],
        manifest: {
          name: "YojnaPath",
          short_name: "YojnaPath",
          description: "Offline-ready civic tech app for finding government schemes.",
          theme_color: "#1D9E75",
          background_color: "#F5F7F2",
          display: "standalone",
          start_url: "/",
          scope: "/",
          icons: [
            {
              src: "/yojnapath-favicon.svg",
              sizes: "any",
              type: "image/svg+xml",
              purpose: "any",
            },
          ],
        },
        workbox: {
          cleanupOutdatedCaches: true,
          navigateFallback: "/index.html",
          runtimeCaching: [
            {
              urlPattern: schemesAllPattern,
              method: "GET",
              handler: "CacheFirst",
              options: {
                cacheName: "schemes-v1",
                cacheableResponse: {
                  statuses: [0, 200],
                },
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 7 * 24 * 60 * 60,
                },
              },
            },
            {
              urlPattern: schemeDetailPattern,
              method: "GET",
              handler: "StaleWhileRevalidate",
              options: {
                cacheName: "scheme-detail-v1",
                cacheableResponse: {
                  statuses: [0, 200],
                },
                expiration: {
                  maxEntries: 60,
                  maxAgeSeconds: 7 * 24 * 60 * 60,
                },
              },
            },
            {
              urlPattern: staticDataPattern,
              method: "GET",
              handler: "NetworkFirst",
              options: {
                cacheName: "app-meta-v1",
                cacheableResponse: {
                  statuses: [0, 200],
                },
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 24 * 60 * 60,
                },
                networkTimeoutSeconds: 3,
              },
            },
            {
              urlPattern: apiRequestPattern,
              method: "GET",
              handler: "NetworkFirst",
              options: {
                cacheName: "api-fallback-v1",
                cacheableResponse: {
                  statuses: [0, 200],
                },
                expiration: {
                  maxEntries: 50,
                  maxAgeSeconds: 24 * 60 * 60,
                },
                networkTimeoutSeconds: 3,
              },
            },
          ],
        },
      }),
    ],
    server: {
      proxy: {
        "/api": "http://localhost:4000",
      },
    },
  };
});
