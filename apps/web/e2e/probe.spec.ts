import { test, expect } from "@playwright/test";

test("react 19 mount probe", async ({ page }) => {
  const errors: string[] = [];
  const consoles: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message + "\n" + (e.stack ?? "")));
  page.on("console", (m) => consoles.push(`[${m.type()}] ${m.text()}`));

  // Try a minimal React 19 hello with no app code
  await page.goto("http://127.0.0.1:4174/", { waitUntil: "load" });
  await page.waitForTimeout(2000);

  console.log("ERRORS:", errors);
  console.log("CONSOLES:", consoles);

  // Probe with raw react
  const probeResult = await page.evaluate(() => {
    try {
      // @ts-ignore
      const win = window;
      // Use ESM dynamic import
      return import("https://esm.sh/react@19.0.0").then(() => "ok-import-react").catch((e) => "err-import-react:" + e.message);
    } catch (e) {
      return "err-eval:" + (e as Error).message;
    }
  });
  console.log("PROBE:", probeResult);
});
