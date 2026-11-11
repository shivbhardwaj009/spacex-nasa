import { test, expect } from "@playwright/test";

const VIEWPORTS = [
  { name: "mobile-small (360px)", width: 360, height: 740 },
  { name: "mobile-standard (390px)", width: 390, height: 844 },
  { name: "tablet (768px)", width: 768, height: 1024 },
  { name: "desktop (1280px)", width: 1280, height: 800 },
];

test.describe("SPHEREx Sky Diary - Multi-Viewport & Mobile Audits (Task 6)", () => {
  for (const vp of VIEWPORTS) {
    test(`renders without horizontal scroll at ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto("/?ra=269.4520&dec=66.5610&fov=0.20&demo=1");

      // Verify header rendered
      await expect(page.locator("header")).toContainText("SPHEREx Sky Diary");

      // Verify no horizontal document overflow
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2); // 2px margin for sub-pixel rendering
    });
  }

  test("runs full demo pitch sequence with zero external network requests", async ({ page }) => {
    // Intercept network and ensure no external endpoints are queried
    const externalRequests: string[] = [];
    page.on("request", (req) => {
      const url = req.url();
      if (!url.startsWith("http://localhost") && !url.startsWith("data:")) {
        externalRequests.push(url);
      }
    });

    // Load with demo=1
    await page.goto("/?demo=1");

    // Verify Demo mode honesty banner appears
    await expect(page.locator("body")).toContainText("DEMO MODE ACTIVE");

    // Launch automated 3-minute pitch tour
    const pitchBtn = page.getByRole("button", { name: /3-Min Pitch Tour/i });
    if (await pitchBtn.isVisible()) {
      await pitchBtn.click();
      await expect(page.locator("body")).toContainText("Target Region & Field of View");
    }

    // Assert zero external network calls occurred
    expect(externalRequests).toEqual([]);
  });
});
