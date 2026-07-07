// Plain client-only Vite build, bypassing @lovable.dev/vite-tanstack-config's
// TanStack Start + Nitro SSR pipeline entirely. That pipeline hit real, unresolved
// bugs trying to produce a static export (prerender path mismatches across three
// different preset configs). This app has no server data loaders — every route
// fetches its data client-side after mount — so a plain SPA build works fine.
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [react(), tailwindcss(), tsconfigPaths({ projects: ["./tsconfig.json"] })],
  build: {
    outDir: "dist-static",
  },
});
