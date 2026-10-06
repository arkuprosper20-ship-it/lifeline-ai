import { test, expect } from "@playwright/test";

test.describe("LIFELINE AI - Critical User Flows", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
  });

  test.describe("Report Flow", () => {
    test("should load report screen by default", async ({ page }) => {
      await expect(page.locator("h2:has-text('What\\'s happening?')")).toBeVisible();
      await expect(page.locator("#report-text")).toBeVisible();
      await expect(page.locator("#analyze-btn")).toBeVisible();
    });

    test("should enable analyze button after entering text", async ({ page }) => {
      const analyzeBtn = page.locator("#analyze-btn");
      await expect(analyzeBtn).toBeDisabled();

      await page.fill("#report-text", "Heavy smoke near the market building");
      await expect(analyzeBtn).toBeEnabled();
    });

    test("should navigate to analysis screen on analyze click", async ({ page }) => {
      await page.fill("#report-text", "Heavy smoke near the market building and road is blocked");
      await page.click("#analyze-btn");

      await page.waitForURL("**/#analysis");
      await expect(page.locator("h2:has-text('Analyzing report')")).toBeVisible();
    });
  });

  test.describe("Analysis Flow", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/#analysis?text=Heavy+smoke+near+the+market+building+and+road+is+blocked");
      await page.waitForLoadState("networkidle");
    });

    test("should show analysis progress steps", async ({ page }) => {
      await expect(page.locator(".progress-step")).toHaveCount(7);
    });

    test("should complete analysis and navigate to escalation", async ({ page }) => {
      await page.waitForURL("**/#escalation", { timeout: 30000 });
      await expect(page.locator("h2:has-text('Smart Escalation')")).toBeVisible();
    });
  });

  test.describe("Incident Brief", () => {
    test("should display incident brief with observations", async ({ page }) => {
      await page.goto("/#brief");
      await page.waitForLoadState("networkidle");

      await expect(page.locator(".incident-brief")).toBeVisible();
      await expect(page.locator("h3:has-text('Observations')")).toBeVisible();
    });

    test("should have smart escalation button", async ({ page }) => {
      await page.goto("/#brief");
      await page.waitForLoadState("networkidle");

      await expect(page.locator("button:has-text('SMART ESCALATION')")).toBeVisible();
    });
  });

  test.describe("Location Capture", () => {
    test("should show location screen with capture options", async ({ page }) => {
      await page.goto("/#location");
      await page.waitForLoadState("networkidle");

      await expect(page.locator("#capture-gps-btn")).toBeVisible();
      await expect(page.locator("#manual-location-btn")).toBeVisible();
    });

    test("should accept manual coordinates", async ({ page }) => {
      await page.goto("/#location");
      await page.waitForLoadState("networkidle");

      await page.fill("#manual-lat", "5.6037");
      await page.fill("#manual-lng", "-0.1870");
      await page.click("#save-manual-location");

      await expect(page.locator("text=Location captured")).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe("Escalation & Confirmation", () => {
    test("should show recommended contact on escalation screen", async ({ page }) => {
      await page.goto("/#escalation");
      await page.waitForLoadState("networkidle");

      await expect(page.locator("h3:has-text('Recommended response contact')")).toBeVisible();
    });

    test("should navigate to confirmation screen", async ({ page }) => {
      await page.goto("/#escalation");
      await page.waitForLoadState("networkidle");

      await page.click("button:has-text('REVIEW & CONFIRM')");
      await page.waitForURL("**/#confirm");
      await expect(page.locator("h2:has-text('Ready to send')")).toBeVisible();
    });
  });

  test.describe("Delivery Status", () => {
    test("should show delivery status screen", async ({ page }) => {
      await page.goto("/#delivery");
      await page.waitForLoadState("networkidle");

      await expect(page.locator("h2:has-text('Delivery status')")).toBeVisible();
    });

    test("should have copy message button", async ({ page }) => {
      await page.goto("/#delivery");
      await page.waitForLoadState("networkidle");

      await expect(page.locator("button:has-text('COPY INCIDENT MESSAGE')")).toBeVisible();
    });
  });

  test.describe("Map View", () => {
    test("should load map screen", async ({ page }) => {
      await page.goto("/#map");
      await page.waitForLoadState("networkidle");

      await expect(page.locator("#incident-map")).toBeVisible();
      await expect(page.locator("#locate-me-btn")).toBeVisible();
    });

    test("should have filter controls", async ({ page }) => {
      await page.goto("/#map");
      await page.waitForLoadState("networkidle");

      await expect(page.locator("#map-filter-category")).toBeVisible();
      await expect(page.locator("#map-filter-urgency")).toBeVisible();
      await expect(page.locator("#map-filter-status")).toBeVisible();
      await expect(page.locator("#map-search")).toBeVisible();
    });
  });

  test.describe("Offline Mode", () => {
    test("should show offline indicator when offline", async ({ page }) => {
      await page.goto("/");
      await page.waitForLoadState("networkidle");

      await page.context().setOffline(true);
      await page.reload();
      await page.waitForLoadState("networkidle");

      await expect(page.locator("text=OFFLINE")).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe("Settings", () => {
    test("should load settings screen", async ({ page }) => {
      await page.goto("/#settings");
      await page.waitForLoadState("networkidle");

      await expect(page.locator("h2:has-text('Settings')")).toBeVisible();
    });
  });

  test.describe("History", () => {
    test("should load history screen", async ({ page }) => {
      await page.goto("/#history");
      await page.waitForLoadState("networkidle");

      await expect(page.locator("h2:has-text('History')")).toBeVisible();
    });
  });
});

test.describe("API Endpoints", () => {
  test("GET /api/notify should return config", async ({ request }) => {
    const response = await request.get("/api/notify");
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data).toHaveProperty("configured");
    expect(data).toHaveProperty("smsProvider");
  });

  test("GET /api/analyze should return AI config", async ({ request }) => {
    const response = await request.get("/api/analyze");
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data).toHaveProperty("configured");
    expect(data).toHaveProperty("provider");
  });
});