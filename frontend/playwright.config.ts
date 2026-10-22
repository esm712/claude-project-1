import { defineConfig, devices } from "@playwright/test";

// Runs the real Spring Boot backend (fresh in-memory DB) and the Next.js dev server.
const BACKEND_PORT = 18080;
const FRONTEND_PORT = 3100;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  reporter: "list",
  use: {
    baseURL: `http://localhost:${FRONTEND_PORT}`,
    locale: "ko-KR",
    timezoneId: "Asia/Seoul",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        // lets environments with a preinstalled Chromium skip `playwright install`
        launchOptions: process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {},
      },
    },
  ],
  webServer: [
    {
      command: `./gradlew bootRun --args=--server.port=${BACKEND_PORT}`,
      cwd: "../backend",
      env: {
        SPRING_DATASOURCE_URL: "jdbc:h2:mem:e2e;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1",
        // the rewrite forwards the browser's Origin header, so the frontend's own origin must be allowed
        APP_CORS_ALLOWED_ORIGINS: `http://localhost:${FRONTEND_PORT}`,
      },
      url: `http://localhost:${BACKEND_PORT}/api/members`,
      timeout: 180_000,
      reuseExistingServer: false,
    },
    {
      command: `npx next dev --port ${FRONTEND_PORT}`,
      env: { BACKEND_URL: `http://localhost:${BACKEND_PORT}` },
      url: `http://localhost:${FRONTEND_PORT}`,
      timeout: 120_000,
      reuseExistingServer: false,
    },
  ],
});
