import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, extname } from "node:path";
import assert from "node:assert/strict";
import { chromium } from "@playwright/test";
const root = resolve("dist");
const types = {
  ".js": "text/javascript",
  ".css": "text/css",
  ".html": "text/html",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".webmanifest": "application/manifest+json",
};
const server = createServer(async (req, res) => {
  try {
    let pathname = decodeURIComponent(
      new URL(req.url, "http://localhost").pathname,
    );
    if (!pathname.startsWith("/my-flash-card/")) throw Error();
    pathname = pathname.slice("/my-flash-card/".length) || "index.html";
    const path = resolve(root, pathname);
    if (!path.startsWith(root + "/")) throw Error();
    res.setHeader(
      "Content-Type",
      types[extname(path)] || "application/octet-stream",
    );
    res.end(await readFile(path));
  } catch {
    res.writeHead(404);
    res.end("Not found");
  }
});
await new Promise((resolve) => server.listen(4174, "127.0.0.1", resolve));
let browser;
try {
  browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
    args: ["--no-sandbox"],
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1040 },
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("http://127.0.0.1:4174/my-flash-card/");
  await page
    .getByRole("button", { name: "Try a sample deck", exact: true })
    .click();
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller)
      await new Promise((resolve) =>
        navigator.serviceWorker.addEventListener("controllerchange", resolve, {
          once: true,
        }),
      );
  });
  await page.getByRole("button", { name: "Dismiss notification" }).click();
  await page.screenshot({ path: "/tmp/folio-light.png", fullPage: true });
  await context.setOffline(true);
  await page.reload();
  await page
    .getByRole("button", { name: "Start studying", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Start studying", exact: true })
    .click();
  await page.getByRole("button", { name: "Reveal answer" }).click();
  await page.getByRole("button", { name: /Good 3/ }).click();
  await page.getByRole("heading", { name: "Buch", exact: true }).waitFor();
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("button", { name: "Overview" })
    .click();
  await page.getByRole("button", { name: "Import CSV", exact: true }).click();
  await page.locator("input[type=file]").setInputFiles({
    name: "offline.csv",
    mimeType: "text/csv",
    buffer: Buffer.from("German,English\nBaum,tree\n"),
  });
  await page.getByRole("button", { name: "Preview cards" }).click();
  await page
    .getByRole("button", { name: "Import 1 cards", exact: true })
    .click();
  await page
    .getByText("Your words have a new home. Deck imported.", { exact: true })
    .waitFor();
  await page.reload();
  await page
    .getByRole("button", { name: "offline", exact: true })
    .first()
    .waitFor();
  assert.equal(
    await page.getByRole("button", { name: "offline", exact: true }).count(),
    2,
  );
  assert.deepEqual(errors, []);
  console.log(
    "PASS: GitHub Pages subpath, service worker, offline reload, offline study, offline CSV worker, and persistent imported data.",
  );
} finally {
  await browser?.close();
  await new Promise((resolve) => server.close(resolve));
}
