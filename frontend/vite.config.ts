import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { resolveViteProxyTarget } from "./src/api/apiUrl";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const target = resolveViteProxyTarget(env.VITE_API_BASE_URL);

  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        "/api": {
          target,
          changeOrigin: true,
        },
      },
    },
    test: {
      globals: true,
      environment: "jsdom",
      setupFiles: "./tests/setup.ts",
    },
  };
});

