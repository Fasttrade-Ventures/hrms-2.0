import { test, expect } from "@playwright/test";

// Grant geolocation permission and mock a location to bypass any geofence blocks
test.use({
  permissions: ["geolocation"],
  geolocation: { latitude: 3.1390, longitude: 101.6869 }, // default Kuala Lumpur coordinates
});

test.describe("Employee Portal E2E Journeys", () => {
  // Run these tests sequentially to maintain stable DB state
  test.describe.configure({ mode: "serial" });

  const TEST_EMAIL = "employee@demo.hrms.local";
  const TEST_PASSWORD = "DemoPass123!";

  test("Verify Full Employee Portal Flow", async ({ page }) => {
    // ----------------------------------------------------
    // 1. LOGIN
    // ----------------------------------------------------
    console.log("Navigating to login page...");
    await page.goto("/auth/login");
    await expect(page.locator("h1")).toContainText("Sign in");

    console.log("Submitting login form...");
    await page.locator("input#email").fill(TEST_EMAIL);
    await page.locator("input#password").fill(TEST_PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();

    // ----------------------------------------------------
    // 2. DASHBOARD
    // ----------------------------------------------------
    console.log("Verifying dashboard redirection...");
    await page.waitForURL("**/employee/dashboard");
    await expect(page.locator("h1").filter({ hasText: /Good|Hello/ })).toBeVisible();
    await expect(page.getByRole("link", { name: "Apply Leave" }).first()).toBeVisible();

    // ----------------------------------------------------
    // 3. APPLY LEAVE
    // ----------------------------------------------------
    console.log("Navigating to Apply Leave page...");
    await page.getByRole("link", { name: "Apply Leave" }).first().click();
    await page.waitForURL("**/employee/leave");

    // Click the Annual Leave chip button if visible to select type, or select from dropdown
    const annualChip = page.getByRole("button", { name: "Annual" }).first();
    if (await annualChip.isVisible()) {
      await annualChip.click();
    } else {
      const select = page.locator("select#leaveTypeId");
      await expect(select.locator("option")).not.toHaveCount(0);
      await select.selectOption({ index: 1 });
    }

    // Set dates dynamically to future weekdays to avoid weekend validation errors
    const today = new Date();
    const getNextWorkday = (date: Date, offset = 1) => {
      const d = new Date(date);
      d.setDate(d.getDate() + offset);
      while (d.getDay() === 0 || d.getDay() === 6) {
        d.setDate(d.getDate() + 1);
      }
      return d;
    };
    const start = getNextWorkday(today, 1);
    const end = getNextWorkday(start, 0); // 1-day leave
    const startStr = start.toISOString().slice(0, 10);
    const endStr = end.toISOString().slice(0, 10);

    console.log(`Applying leave from ${startStr} to ${endStr}...`);
    await page.locator("input#startDate").fill(startStr);
    await page.locator("input#endDate").fill(endStr);
    await page.locator("input#reason").fill("Annual break - E2E Test");

    await page.getByRole("button", { name: "Submit Leave Request" }).click();

    // ----------------------------------------------------
    // 4. CHECK STATUS
    // ----------------------------------------------------
    console.log("Verifying leave submission status...");
    await page.waitForURL(/\/employee\/leave\/.*submitted=1/);
    await expect(page.locator("text=Leave request submitted and pending manager approval.")).toBeVisible();
    await expect(page.getByText("Pending", { exact: true })).toBeVisible();

    // ----------------------------------------------------
    // 5. CLOCK IN
    // ----------------------------------------------------
    console.log("Returning to dashboard for clock in/out test...");
    await page.goto("/employee/dashboard");
    await page.waitForURL("**/employee/dashboard");

    // If already clocked in from a previous test run, clock out first to reset state
    const clockOutButton = page.getByRole("button", { name: "Clock Out" });
    if (await clockOutButton.isVisible()) {
      console.log("Previous active shift found. Clocking out first...");
      await clockOutButton.click();
      await page.waitForTimeout(1000); // Wait for state transition
    }

    // Now Clock In
    console.log("Clicking Clock In...");
    const clockInButton = page.getByRole("button", { name: /Clock In/ });
    await expect(clockInButton).toBeVisible();
    await clockInButton.click();

    // Verify clock in succeeded by asserting Clock Out button appears
    await expect(page.getByRole("button", { name: "Clock Out" })).toBeVisible();
    await expect(page.locator("text=Active Shift")).toBeVisible();

    // Optionally clock out again to clean up the DB state
    console.log("Clocking out to reset state...");
    await page.getByRole("button", { name: "Clock Out" }).click();
    await expect(page.getByRole("button", { name: /Clock In/ })).toBeVisible();

    // ----------------------------------------------------
    // 6. VIEW PAYSLIP
    // ----------------------------------------------------
    console.log("Navigating to Payslips list page...");
    await page.goto("/employee/payslips");
    await page.waitForURL("**/employee/payslips");

    // Click on the first payslip link in the table/list
    const firstPayslipLink = page.locator('a[href*="/employee/payslips/"]').first();
    await expect(firstPayslipLink).toBeVisible();
    const payslipText = await firstPayslipLink.textContent();
    console.log(`Viewing payslip details for ${payslipText}...`);
    await firstPayslipLink.click();

    // Assert details loaded
    await page.waitForURL(/\/employee\/payslips\/.+/);
    await expect(page.locator("text=Gross pay")).toBeVisible();
    await expect(page.locator("text=Net pay")).toBeVisible();
    await expect(page.locator("text=Back to payslips")).toBeVisible();

    console.log("E2E Employee Portal journey completed successfully!");
  });
});
