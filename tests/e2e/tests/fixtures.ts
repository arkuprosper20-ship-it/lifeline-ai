import { test as base, Page } from "@playwright/test";

interface TestFixtures {
  pageWithIncident: Page;
}

export const test = base.extend<TestFixtures>({
  pageWithIncident: async ({ page }, use) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const incident = {
      id: "LF-TEST123-ABCD",
      type: "fire_smoke",
      typeLabel: "Fire / Smoke",
      urgency: "urgent",
      status: "reported",
      observations: ["Heavy smoke visible", "Building involved", "Road appears blocked"],
      missingInfo: ["Exact location", "Number of people affected", "Known cause", "Time of occurrence"],
      summary: "Fire/Smoke. Heavy smoke visible, Building involved, Road appears blocked.",
      location: {
        latitude: 5.6037,
        longitude: -0.1870,
        accuracy: 18,
        timestamp: Date.now(),
        source: "gps",
        sourceLabel: "EXACT GPS",
      },
      timestamp: Date.now(),
      provider: "rules",
      model: null,
      confidence: 0.6,
      aiClassification: "Fire/Smoke. Heavy smoke visible, Building involved, Road appears blocked.",
      source: "local",
      safetyOverrideApplied: true,
      hasImage: false,
      enhanced: false,
      synced: false,
      isDemo: false,
    };

    await page.evaluate((inc) => {
      localStorage.setItem("lifeline.incidents.v1", JSON.stringify([inc]));
      localStorage.setItem("lifeline.ui.v1", JSON.stringify({
        selectedIncident: inc,
        currentView: "brief",
      }));
    }, incident);

    await page.reload();
    await page.waitForLoadState("networkidle");

    await use(page);
  },
});

export { expect } from "@playwright/test";