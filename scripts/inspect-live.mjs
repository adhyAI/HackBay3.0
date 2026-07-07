import { chromium } from "playwright";

const url = "https://rfq-risk-navigator.butterbase.dev/dashboard";

const browser = await chromium.launch();
const page = await browser.newPage();

page.on("console", (msg) => console.log(`[console.${msg.type()}]`, msg.text()));
page.on("pageerror", (err) => console.log("[pageerror]", err.message, "\n", err.stack));
page.on("requestfailed", (req) => console.log("[requestfailed]", req.url(), req.failure()?.errorText));
page.on("response", (res) => {
  if (res.status() >= 400) console.log("[bad response]", res.status(), res.url());
});

console.log("Navigating to", url);
await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
console.log("Loaded. Waiting for cards to render...");
await page.waitForTimeout(3000);

const cardCount = await page.locator(".cursor-grab").count();
console.log("Card elements found:", cardCount);

if (cardCount > 0) {
  console.log("Clicking first card...");
  await page.locator(".cursor-grab").first().click();
  await page.waitForTimeout(3000);
  const sheetVisible = await page.locator('[role="dialog"]').count();
  console.log("Dialog/sheet elements after click:", sheetVisible);
  console.log("Current URL after click:", page.url());
}

await page.screenshot({ path: "scripts/live-screenshot.png", fullPage: true });
console.log("Screenshot saved.");

await browser.close();
