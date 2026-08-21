import { defineConfig, devices } from "@playwright/test";

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  /* Maximum time one test can run for. */
  timeout: 60000,
  expect: {
    /**
     * Maximum time expect() should wait for the condition to be met.
     */
    timeout: 10000,
  },
  /* Run tests in files in parallel */
  fullyParallel: false,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on local and CI since we are sharing a database and session state */
  workers: 1,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: "html",
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: "http://localhost:3000",

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: "on-first-retry",
    
    /* Take a screenshot only on failure */
    screenshot: "only-on-failure",
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: "desktop",
      use: {
        ...devices["Desktop Chrome"],
      },
    },
    {
      name: "mobile",
      use: {
        ...devices["iPhone 12"],
        /* iPhone 12 defaults are already mobile viewports */
      },
    },
  ],

  /* Run local dev server before starting the tests if not already running */
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    stdout: "ignore",
    stderr: "pipe",
    timeout: 120000,
  },
});
