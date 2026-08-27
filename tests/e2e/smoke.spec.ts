import { test, expect } from "@playwright/test";

/**
 * CI smoke: public auth surface + unauthenticated redirect (no demo credentials).
 */
test.describe("Smoke", () => {
  test("login page renders", async ({ page }) => {
    await page.goto("/auth/login");
    await expect(page.locator("h1")).toContainText("Sign in");
    await expect(page.locator("input#email")).toBeVisible();
    await expect(page.locator("input#password")).toBeVisible();
  });

  test("unauthenticated dashboard redirects to login", async ({ page }) => {
    await page.goto("/employee/dashboard");
    await expect(page).toHaveURL(/\/auth\/login/);
    await expect(page.locator("h1")).toContainText("Sign in");
  });
});
