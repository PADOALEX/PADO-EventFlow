import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./specs",
  use: { baseURL: "http://localhost:8080", browserName: "chromium" },
  reporter: "list",
  timeout: 30000,
  retries: process.env.CI ? 1 : 0,
});
