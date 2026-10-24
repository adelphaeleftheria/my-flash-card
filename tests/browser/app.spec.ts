import { test, expect } from "@playwright/test";
test("sample, study, persistence, statistics, export and mobile layout", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /Big things start/ }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Try a sample deck", exact: true })
    .click();
  await expect(
    page
      .getByRole("button", { name: "German essentials", exact: true })
      .first(),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Start studying", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Start studying", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Haus", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Space");
  await expect(
    page.getByRole("heading", { name: "house", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("3");
  await expect(
    page.getByRole("heading", { name: "Buch", exact: true }),
  ).toBeVisible();
  await page.reload();
  await page
    .getByRole("navigation", { name: "Main navigation", exact: true })
    .getByRole("button", { name: "Statistics" })
    .click();
  await expect(page.getByText("100%", { exact: true })).toBeVisible();
  await page
    .getByRole("navigation", { name: "Main navigation", exact: true })
    .getByRole("button", { name: "My library" })
    .click();
  await page
    .getByRole("button", { name: "German essentials", exact: true })
    .last()
    .click();
  await expect(
    page.getByRole("button", { name: /Haus/ }).first(),
  ).toBeVisible();
  await page.getByRole("button", { name: "Add card", exact: true }).click();
  await page.getByRole("textbox", { name: "German", exact: true }).fill("Baum");
  await page
    .getByRole("textbox", { name: "English", exact: true })
    .fill("tree");
  await page.getByRole("button", { name: "Save card", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Baum", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("navigation", { name: "Main navigation", exact: true })
    .getByRole("button", { name: "Settings", exact: true })
    .click();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export full backup" }).click();
  expect((await download).suggestedFilename()).toMatch(/flashcards-backup/);
  await page.getByLabel("Theme", { exact: true }).selectOption("dark");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.setViewportSize({ width: 375, height: 812 });
  await page
    .getByRole("navigation", { name: "Mobile navigation" })
    .getByRole("button", { name: "Overview" })
    .click();
  await expect(page.getByRole("heading", { name: /Good/ })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  await page.screenshot({ path: "/tmp/folio-mobile.png", fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1050 });
  await page.screenshot({ path: "/tmp/folio-desktop.png", fullPage: true });
  expect(errors).toEqual([]);
});
test("CSV upload mapping preview, duplicate protection and restore", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Import your first CSV", exact: true })
    .click();
  await page.locator("input[type=file]").setInputFiles({
    name: "Travel.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(
      'German,English,Memory trick\n"Häuser","houses","many, many houses"\nHaus,house,home\nHaus,house,duplicate\n,missing,invalid\n',
    ),
  });
  await expect(
    page.getByText("4 rows · 3 columns", { exact: false }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Preview cards" }).click();
  await expect(page.getByText("2 cards ready to import")).toBeVisible();
  await expect(
    page.getByText(/1 missing a front or back · 1 possible duplicates/),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Import 2 cards", exact: true })
    .click();
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("button", { name: "My library" })
    .click();
  await page
    .getByRole("button", { name: "Travel", exact: true })
    .last()
    .click();
  await expect(
    page.getByText("2 words, each one a little more familiar."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Häuser", exact: true }).click();
  await expect(
    page.getByRole("textbox", { name: "Memory trick", exact: false }),
  ).toHaveValue("many, many houses");
  await page.getByRole("button", { name: "Close dialog" }).click();
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("button", { name: "Settings", exact: true })
    .click();
  const event = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export full backup" }).click();
  const path = await (await event).path();
  await page.locator("input[type=file]").setInputFiles(path!);
  await expect(
    page.getByRole("heading", { name: "Bring your learning home" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Restore backup", exact: true })
    .last()
    .click();
  await expect(
    page.getByText("Your backup has been restored.", { exact: true }),
  ).toBeVisible();
});
test("accessible navigation, dialogs, contrast and narrow viewports", async ({
  page,
}) => {
  const { default: AxeBuilder } = await import("@axe-core/playwright");
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /Big things start/ }),
  ).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  for (const theme of ["light", "dark"]) {
    await page.evaluate((t) => {
      document.documentElement.dataset.theme = t;
      document.documentElement.dataset.motion = "reduced";
    }, theme);
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(
      result.violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => n.target),
      })),
    ).toEqual([]);
  }
  await page
    .getByRole("button", { name: "Try a sample deck", exact: true })
    .click();
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("button", { name: "My library" })
    .click();
  await page
    .getByRole("button", { name: "German essentials", exact: true })
    .last()
    .click();
  await page.getByRole("button", { name: "Add card", exact: true }).click();
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(
    result.violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => n.target),
    })),
  ).toEqual([]);
  await page.getByRole("button", { name: "Close dialog" }).click();
  for (const width of [320, 375, 430, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
  }
});
test("study modes, card difficulty, and page accessibility", async ({
  page,
}) => {
  const { default: AxeBuilder } = await import("@axe-core/playwright");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page
    .getByRole("button", { name: "Try a sample deck", exact: true })
    .click();
  for (const name of ["Statistics", "Settings"]) {
    await page
      .getByRole("navigation", { name: "Main navigation" })
      .getByRole("button", { name, exact: true })
      .click();
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(
      result.violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => n.target),
      })),
    ).toEqual([]);
  }
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("button", { name: "Study", exact: true })
    .click();
  await page.getByRole("button", { name: "Study options" }).click();
  await page.getByRole("combobox").nth(1).selectOption("typing");
  await page
    .getByRole("button", { name: "Start studying", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Your answer", exact: true })
    .fill("test answer");
  await page.getByRole("button", { name: "Check answer", exact: true }).click();
  await expect(page.getByText(/Keep practicing/)).toBeVisible();
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(
    result.violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => n.target),
    })),
  ).toEqual([]);
  await page.getByRole("button", { name: /Good 3/ }).click();
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("button", { name: "My library" })
    .click();
  await page
    .getByRole("button", { name: "German essentials", exact: true })
    .last()
    .click();
  await page.getByRole("button", { name: /Haus/ }).first().click();
  await page
    .getByRole("combobox", { name: "Difficulty", exact: true })
    .selectOption("difficult");
  await page.getByRole("button", { name: "Save card", exact: true }).click();
  await page.getByRole("button", { name: "Filters", exact: true }).click();
  await page.getByRole("combobox").nth(1).selectOption("difficult");
  await expect(
    page.getByRole("button", { name: /Haus/ }).first(),
  ).toBeVisible();
});

test("legacy Excel encoding and blocked worker fallback", async ({ page }) => {
  await page.route("**/*csv.worker*", (route) => route.abort());
  await page.goto("/");
  await page
    .getByRole("button", { name: "Import your first CSV", exact: true })
    .click();
  await page
    .getByRole("combobox", { name: "File encoding", exact: true })
    .selectOption("windows-1252");
  await page
    .locator("input[type=file]")
    .setInputFiles({
      name: "excel.csv",
      mimeType: "text/csv",
      buffer: Buffer.from("German,English\nHäuser,houses\n", "latin1"),
    });
  await page.getByRole("button", { name: "Preview cards" }).click();
  await expect(
    page.getByRole("heading", { name: "Häuser", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("1 cards ready to import")).toBeVisible();
});
