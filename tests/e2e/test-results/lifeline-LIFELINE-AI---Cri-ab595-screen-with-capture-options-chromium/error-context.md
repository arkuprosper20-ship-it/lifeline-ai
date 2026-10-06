# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: lifeline.spec.ts >> LIFELINE AI - Critical User Flows >> Location Capture >> should show location screen with capture options
- Location: tests\lifeline.spec.ts:67:9

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('#capture-gps-btn')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" locator('#capture-gps-btn') with timeout 5000ms
  - waiting for locator('#capture-gps-btn')

```

```yaml
- navigation "Main navigation":
  - heading "LIFELINE AI" [level=1]
  - button "Close navigation": ×
  - navigation:
    - button "Report":
      - img
      - text: Report
    - button "Map":
      - img
      - text: Map
    - button "History":
      - img
      - text: History
    - button "Coordination":
      - img
      - text: Coordination
    - button "Settings":
      - img
      - text: Settings
  - paragraph: LIFELINE AI v1.0.0
```

# Test source

```ts
  1   | import { test, expect } from "@playwright/test";
  2   | 
  3   | test.describe("LIFELINE AI - Critical User Flows", () => {
  4   |   test.beforeEach(async ({ page }) => {
  5   |     await page.goto("/");
  6   |     await page.waitForLoadState("networkidle");
  7   |   });
  8   | 
  9   |   test.describe("Report Flow", () => {
  10  |     test("should load report screen by default", async ({ page }) => {
  11  |       await expect(page.locator("h2:has-text('What\\'s happening?')")).toBeVisible();
  12  |       await expect(page.locator("#report-text")).toBeVisible();
  13  |       await expect(page.locator("#analyze-btn")).toBeVisible();
  14  |     });
  15  | 
  16  |     test("should enable analyze button after entering text", async ({ page }) => {
  17  |       const analyzeBtn = page.locator("#analyze-btn");
  18  |       await expect(analyzeBtn).toBeDisabled();
  19  | 
  20  |       await page.fill("#report-text", "Heavy smoke near the market building");
  21  |       await expect(analyzeBtn).toBeEnabled();
  22  |     });
  23  | 
  24  |     test("should navigate to analysis screen on analyze click", async ({ page }) => {
  25  |       await page.fill("#report-text", "Heavy smoke near the market building and road is blocked");
  26  |       await page.click("#analyze-btn");
  27  | 
  28  |       await page.waitForURL("**/#analysis");
  29  |       await expect(page.locator("h2:has-text('Analyzing report')")).toBeVisible();
  30  |     });
  31  |   });
  32  | 
  33  |   test.describe("Analysis Flow", () => {
  34  |     test.beforeEach(async ({ page }) => {
  35  |       await page.goto("/#analysis?text=Heavy+smoke+near+the+market+building+and+road+is+blocked");
  36  |       await page.waitForLoadState("networkidle");
  37  |     });
  38  | 
  39  |     test("should show analysis progress steps", async ({ page }) => {
  40  |       await expect(page.locator(".progress-step")).toHaveCount(7);
  41  |     });
  42  | 
  43  |     test("should complete analysis and navigate to escalation", async ({ page }) => {
  44  |       await page.waitForURL("**/#escalation", { timeout: 30000 });
  45  |       await expect(page.locator("h2:has-text('Smart Escalation')")).toBeVisible();
  46  |     });
  47  |   });
  48  | 
  49  |   test.describe("Incident Brief", () => {
  50  |     test("should display incident brief with observations", async ({ page }) => {
  51  |       await page.goto("/#brief");
  52  |       await page.waitForLoadState("networkidle");
  53  | 
  54  |       await expect(page.locator(".incident-brief")).toBeVisible();
  55  |       await expect(page.locator("h3:has-text('Observations')")).toBeVisible();
  56  |     });
  57  | 
  58  |     test("should have smart escalation button", async ({ page }) => {
  59  |       await page.goto("/#brief");
  60  |       await page.waitForLoadState("networkidle");
  61  | 
  62  |       await expect(page.locator("button:has-text('SMART ESCALATION')")).toBeVisible();
  63  |     });
  64  |   });
  65  | 
  66  |   test.describe("Location Capture", () => {
  67  |     test("should show location screen with capture options", async ({ page }) => {
  68  |       await page.goto("/#location");
  69  |       await page.waitForLoadState("networkidle");
  70  | 
> 71  |       await expect(page.locator("#capture-gps-btn")).toBeVisible();
      |                                                      ^ Error: expect(locator).toBeVisible() failed
  72  |       await expect(page.locator("#manual-location-btn")).toBeVisible();
  73  |     });
  74  | 
  75  |     test("should accept manual coordinates", async ({ page }) => {
  76  |       await page.goto("/#location");
  77  |       await page.waitForLoadState("networkidle");
  78  | 
  79  |       await page.fill("#manual-lat", "5.6037");
  80  |       await page.fill("#manual-lng", "-0.1870");
  81  |       await page.click("#save-manual-location");
  82  | 
  83  |       await expect(page.locator("text=Location captured")).toBeVisible({ timeout: 5000 });
  84  |     });
  85  |   });
  86  | 
  87  |   test.describe("Escalation & Confirmation", () => {
  88  |     test("should show recommended contact on escalation screen", async ({ page }) => {
  89  |       await page.goto("/#escalation");
  90  |       await page.waitForLoadState("networkidle");
  91  | 
  92  |       await expect(page.locator("h3:has-text('Recommended response contact')")).toBeVisible();
  93  |     });
  94  | 
  95  |     test("should navigate to confirmation screen", async ({ page }) => {
  96  |       await page.goto("/#escalation");
  97  |       await page.waitForLoadState("networkidle");
  98  | 
  99  |       await page.click("button:has-text('REVIEW & CONFIRM')");
  100 |       await page.waitForURL("**/#confirm");
  101 |       await expect(page.locator("h2:has-text('Ready to send')")).toBeVisible();
  102 |     });
  103 |   });
  104 | 
  105 |   test.describe("Delivery Status", () => {
  106 |     test("should show delivery status screen", async ({ page }) => {
  107 |       await page.goto("/#delivery");
  108 |       await page.waitForLoadState("networkidle");
  109 | 
  110 |       await expect(page.locator("h2:has-text('Delivery status')")).toBeVisible();
  111 |     });
  112 | 
  113 |     test("should have copy message button", async ({ page }) => {
  114 |       await page.goto("/#delivery");
  115 |       await page.waitForLoadState("networkidle");
  116 | 
  117 |       await expect(page.locator("button:has-text('COPY INCIDENT MESSAGE')")).toBeVisible();
  118 |     });
  119 |   });
  120 | 
  121 |   test.describe("Map View", () => {
  122 |     test("should load map screen", async ({ page }) => {
  123 |       await page.goto("/#map");
  124 |       await page.waitForLoadState("networkidle");
  125 | 
  126 |       await expect(page.locator("#incident-map")).toBeVisible();
  127 |       await expect(page.locator("#locate-me-btn")).toBeVisible();
  128 |     });
  129 | 
  130 |     test("should have filter controls", async ({ page }) => {
  131 |       await page.goto("/#map");
  132 |       await page.waitForLoadState("networkidle");
  133 | 
  134 |       await expect(page.locator("#map-filter-category")).toBeVisible();
  135 |       await expect(page.locator("#map-filter-urgency")).toBeVisible();
  136 |       await expect(page.locator("#map-filter-status")).toBeVisible();
  137 |       await expect(page.locator("#map-search")).toBeVisible();
  138 |     });
  139 |   });
  140 | 
  141 |   test.describe("Offline Mode", () => {
  142 |     test("should show offline indicator when offline", async ({ page }) => {
  143 |       await page.goto("/");
  144 |       await page.waitForLoadState("networkidle");
  145 | 
  146 |       await page.context().setOffline(true);
  147 |       await page.reload();
  148 |       await page.waitForLoadState("networkidle");
  149 | 
  150 |       await expect(page.locator("text=OFFLINE")).toBeVisible({ timeout: 10000 });
  151 |     });
  152 |   });
  153 | 
  154 |   test.describe("Settings", () => {
  155 |     test("should load settings screen", async ({ page }) => {
  156 |       await page.goto("/#settings");
  157 |       await page.waitForLoadState("networkidle");
  158 | 
  159 |       await expect(page.locator("h2:has-text('Settings')")).toBeVisible();
  160 |     });
  161 |   });
  162 | 
  163 |   test.describe("History", () => {
  164 |     test("should load history screen", async ({ page }) => {
  165 |       await page.goto("/#history");
  166 |       await page.waitForLoadState("networkidle");
  167 | 
  168 |       await expect(page.locator("h2:has-text('History')")).toBeVisible();
  169 |     });
  170 |   });
  171 | });
```