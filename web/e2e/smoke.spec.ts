import { test, expect } from "@playwright/test";

test.describe("SPHEREx Sky Diary - Module 7 Smoke Test", () => {
  test("loads URL coordinates, plays time-lapse, and selects a mover candidate", async ({
    page,
  }) => {
    // 1. Load exact deep link with RA, Dec, FoV, and Epoch
    await page.goto("/?ra=269.4520&dec=66.5610&fov=0.20&epoch=1");

    // Verify main brand & reticle loaded
    await expect(page.locator("header")).toContainText("SPHEREx Sky Diary");

    // Verify coordinates overlay
    await expect(page.locator("main")).toContainText("POINTING (J2000)");
    await expect(page.locator("main")).toContainText("269.4520°");

    // 2. Play Time-Lapse
    const playBtn = page.getByRole("button", { name: /Play Time-Lapse/i });
    if (await playBtn.isVisible()) {
      await playBtn.click();
      // Wait for playback to start
      await page.waitForTimeout(1200);
      // Pause
      await page.getByRole("button", { name: /Pause/i }).click();
    }

    // 3. Select Mover Candidate
    const moverCard = page.locator("aside").getByText("Inspect →").first();
    await moverCard.click();

    // Verify details panel opened
    await expect(page.locator("aside")).toContainText("Astrometry");
    await expect(page.locator("aside")).toContainText("Spectrum");
  });
});

