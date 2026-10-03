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

test.describe("PDF resume import", () => {
  test.beforeEach(async ({ page }) => {
    await registerAndLogin(page);
  });

  test("imports a PDF and lands in the editor with the parsed data", async ({ page }) => {
    // Intercepted at the network layer so this test doesn't depend on a real
    // Gemini key or a working OCR pipeline on whichever backend it's pointed at.
    await page.route("**/api/resumes/import", async (route) => {
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          resume: {
            _id: "imported-resume-id",
            title: "Imported Resume",
            templateId: "classic",
            personalInfo: { fullName: "Imported Person", title: "Imported Title", summary: "" },
            experience: [],
            education: [],
            skills: ["Imported Skill"],
            projects: [],
            certifications: [],
          },
          usedOcr: false,
          usesOwnKey: false,
        }),
      });
    });

    const fileChooserPromise = page.waitForEvent("filechooser");
    await page.getByRole("button", { name: /import from pdf/i }).click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles({
      name: "resume.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.4 fake pdf content"),
    });

    await expect(page).toHaveURL(/\/editor\/imported-resume-id/);
    await expect(page.getByText("Imported Person")).toBeVisible();
  });

  test("shows an error when the backend can't parse the PDF", async ({ page }) => {
    await page.route("**/api/resumes/import", async (route) => {
      await route.fulfill({
        status: 422,
        contentType: "application/json",
        body: JSON.stringify({ message: "Couldn't extract readable text from this PDF." }),
      });
    });

    const fileChooserPromise = page.waitForEvent("filechooser");
    await page.getByRole("button", { name: /import from pdf/i }).click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles({
      name: "resume.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.4 fake pdf content"),
    });

    await expect(page.getByText(/couldn't extract readable text/i)).toBeVisible();
    await expect(page).toHaveURL(/\/dashboard/);
  });
});
