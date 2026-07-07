import { chromium } from "playwright";

const browser = await chromium.launch();
const page = await browser.newPage();

page.on("console", (msg) => { if (msg.type() === "error") console.log("[console.error]", msg.text()); });
page.on("pageerror", (err) => console.log("[pageerror]", err.message));

await page.goto("https://rfq-risk-navigator.butterbase.dev/dashboard", { waitUntil: "networkidle", timeout: 30000 });
await page.waitForTimeout(2000);

await page.locator(".cursor-grab").first().click();
await page.waitForTimeout(500);

console.log("Clicking 'Parse Email (Nebius)'...");
await page.getByText("Parse Email (Nebius)").click();
await page.waitForTimeout(8000);

const bodyText = await page.locator('[role="dialog"]').textContent();
console.log("Drawer content after parse (first 500 chars):");
console.log(bodyText.slice(0, 500));

await page.screenshot({ path: "scripts/action-screenshot.png" });
await browser.close();
console.log("Done.");
