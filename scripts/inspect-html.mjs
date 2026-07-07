import { chromium } from "playwright";

const browser = await chromium.launch();
const page = await browser.newPage();

const res = await page.goto("https://rfq-risk-navigator.butterbase.dev/dashboard", { waitUntil: "commit" });
console.log("status:", res.status());
console.log("headers:", JSON.stringify(res.headers(), null, 2));
const html = await page.content();
console.log("--- HTML (first 1000 chars of raw response, not DOM) ---");

const raw = await res.text().catch(() => "(already consumed)");
console.log(raw.slice(0, 1000));

await browser.close();
