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

test.describe("SaaS register surface", () => {
  test.skip(
    () => process.env.DEPLOYMENT_MODE !== "saas",
    "Register UI only when DEPLOYMENT_MODE=saas",
  );

  test("register page shows plan picker and interval", async ({ page }) => {
    await page.goto("/auth/register");
    await expect(page.locator("h1")).toContainText("Register organization");
    await expect(page.getByText("Professional")).toBeVisible();
    await expect(page.getByText("Annual (2 months free)")).toBeVisible();
    await expect(page.getByRole("button", { name: /Start 14-day trial/i })).toBeVisible();
  });
});
