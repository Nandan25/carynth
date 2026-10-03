import { test, expect } from "@playwright/test";

function uniqueEmail() {
  return `e2e-${Date.now()}-${Math.floor(Math.random() * 10000)}@example.com`;
}

async function registerAndLogin(page) {
  const email = uniqueEmail();
  await page.goto("/register");
  await page.getByPlaceholder("Jane Doe").fill("E2E Tester");
  await page.getByPlaceholder("you@example.com").fill(email);
  await page.getByPlaceholder("At least 6 characters").fill("password123");
  await page.getByRole("button", { name: /create account/i }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

test.describe("Resume editor", () => {
  test.beforeEach(async ({ page }) => {
    await registerAndLogin(page);
  });

  test("creates a resume and the live preview reflects typed content", async ({ page }) => {
    await page.getByRole("button", { name: /\+ new resume/i }).click();
    await expect(page).toHaveURL(/\/editor\//);

    await page.getByPlaceholder("Jane Doe").fill("Alex Rivera");
    await page.getByPlaceholder("Senior Product Designer").fill("Staff Engineer");

    await expect(page.getByText("Alex Rivera")).toBeVisible();
    await expect(page.getByText("Staff Engineer")).toBeVisible();
  });

  test("switching templates keeps content visible under the new layout", async ({ page }) => {
    await page.getByRole("button", { name: /\+ new resume/i }).click();
    await expect(page).toHaveURL(/\/editor\//);
    await page.getByPlaceholder("Jane Doe").fill("Alex Rivera");

    await page.locator("select").selectOption("modern");
    await expect(page.getByText("Alex Rivera")).toBeVisible();

    await page.locator("select").selectOption("technical");
    await expect(page.getByText("Alex Rivera")).toBeVisible();
  });

  test("adds a skill and sees it reflected in the preview", async ({ page }) => {
    await page.getByRole("button", { name: /\+ new resume/i }).click();
    await expect(page).toHaveURL(/\/editor\//);

    await page.getByRole("button", { name: "Skills" }).click();
    await page.getByPlaceholder(/e\.g\. react, figma, sql/i).fill("Kubernetes");
    await page.keyboard.press("Enter");

    await expect(page.getByText("Kubernetes")).toBeVisible();
  });

  test("checks the ATS score against a pasted job description (mocked AI response)", async ({ page }) => {
    await page.getByRole("button", { name: /\+ new resume/i }).click();
    await expect(page).toHaveURL(/\/editor\//);

    // Intercept at the browser network layer so this test doesn't depend on
    // a real Gemini key being configured on whichever backend it's pointed at.
    await page.route("**/api/ai/resumes/*/ats-score", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          score: 91,
          matchedKeywords: ["React"],
          missingKeywords: ["GraphQL"],
          notes: "Strong match. Consider adding GraphQL experience.",
          usesOwnKey: false,
        }),
      });
    });

    await page.getByRole("button", { name: /ai \/ ats/i }).click();
    await page
      .getByPlaceholder(/paste the job posting here/i)
      .fill("Looking for a React + GraphQL engineer.");
    await page.getByRole("button", { name: /check ats score/i }).click();

    await expect(page.getByText("91")).toBeVisible();
    await expect(page.getByText("GraphQL")).toBeVisible();
  });

  test("exports the resume as a PDF (mocked export response)", async ({ page }) => {
    await page.getByRole("button", { name: /\+ new resume/i }).click();
    await expect(page).toHaveURL(/\/editor\//);

    // Intercept the export call so this test doesn't need a real Puppeteer/
    // Chromium install on whichever backend it's pointed at.
    await page.route("**/api/resumes/*/export", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/pdf",
        body: Buffer.from("%PDF-1.4 fake pdf content"),
      });
    });

    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: /export pdf/i }).click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toMatch(/\.pdf$/);
  });
});
