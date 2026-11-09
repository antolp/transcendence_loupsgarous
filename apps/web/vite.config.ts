import { fileURLToPath } from "node:url";
import { defineConfig, loadEnv } from "vite";

//Locating the root environment file
const root = fileURLToPath(new URL("../../", import.meta.url));

//Configuring development proxy
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, root, "VITE_");
  const target = env.VITE_DEV_PROXY_TARGET || "http://127.0.0.1:3001";


  return {
    envDir: root,
    server: {
      port: 5173,
      strictPort: true,
      proxy: {
        "/api": { target, changeOrigin: true },
      },
    },
  };
});
