import { chromium } from "playwright-core";
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const page = await b.newPage();
// Login si Demo-chef
await page.goto("http://localhost:3104/login");
await page.fill('input[name="email"]', "chef@demo.ch");
await page.fill('input[name="passwort"]', "demo1234");
await page.click("button");
await page.waitForURL("http://localhost:3104/");
// Dil
await page.click('button:has-text("Abmelden")');
await page.waitForURL(/login/);
console.log("5a. Abmelden ✓");
// Regjistro firmë të re (tenant 2)
await page.goto("http://localhost:3104/registrieren");
await page.fill('input[name="firmenname"]', "Testfirma Sanitär GmbH");
await page.fill('input[name="name"]', "Test Chef");
await page.fill('input[name="email"]', "test@testfirma.ch");
await page.fill('input[name="passwort"]', "test12345");
await page.click('button:has-text("Registrieren")');
await page.waitForURL("http://localhost:3104/");
console.log("5b. Regjistrimi i firmës së re ✓");
const kopf = await page.textContent("header");
console.log("5c. Header:", kopf.includes("Testfirma") ? "Testfirma shfaqet ✓" : "✗ " + kopf);
// Ndarja e tenantëve
await page.goto("http://localhost:3104/kunden");
const kunden = await page.textContent("main");
console.log("6. Ndarja:", kunden.includes("Familie Muster") ? "✗✗ SHEH TË DHËNAT E TJETRIT!" : "✓ të dhënat e Demo-firmës të padukshme");
// PDF i tenantit tjetër
const resp2 = await page.request.get("http://localhost:3104/api/rechnungen/cmuraantl00067dow5i3ttvu4/pdf");
console.log("7. PDF i tenantit tjetër:", resp2.status() === 404 ? "✓ 404 i refuzuar" : `✗ ${resp2.status()}`);
await b.close();
