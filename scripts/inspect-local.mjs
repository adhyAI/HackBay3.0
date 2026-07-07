import { chromium } from "playwright";

const url = "http://localhost:5199/";

const browser = await chromium.launch();
const page = await browser.newPage();

page.on("console", (msg) => console.log(`[console.${msg.type()}]`, msg.text()));
page.on("pageerror", (err) => console.log("[pageerror]", err.message));
page.on("requestfailed", (req) => console.log("[requestfailed]", req.url(), req.failure()?.errorText));
page.on("response", (res) => {
  if (res.status() >= 400) console.log("[bad response]", res.status(), res.url());
  if (res.url().includes("butterbase")) console.log("[response]", res.status(), res.url());
});
page.on("request", (req) => {
  if (req.url().includes("butterbase")) console.log("[request]", req.method(), req.url());
});

await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
await page.waitForTimeout(1000);
console.log("Clicking 'Open pipeline' link...");
await page.getByText("Open pipeline").click();
await page.waitForTimeout(3000);
console.log("URL after nav:", page.url());

const cardCount = await page.locator(".cursor-grab").count();
console.log("Card elements found:", cardCount);

if (cardCount > 0) {
  console.log("Clicking first card...");
  await page.locator(".cursor-grab").first().click({ timeout: 5000 });
  await page.waitForTimeout(2000);
  const sheetVisible = await page.locator('[role="dialog"]').count();
  console.log("Dialog/sheet elements after click:", sheetVisible);
}

await browser.close();
console.log("Done.");
