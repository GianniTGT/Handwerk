import { chromium } from "playwright-core";
const S = "/tmp/claude-0/-home-user-Handwerk/53f2e626-1e8e-5e80-94b0-564d715c0e59/scratchpad";
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const page = await b.newPage();
await page.goto("http://localhost:3107/login");
await page.fill('input[name="email"]', "chef@demo.ch");
await page.fill('input[name="passwort"]', "demo1234");
await page.click("button");
await page.waitForURL("http://localhost:3107/");
console.log("Login ✓ (tema TIFF, header:", (await page.textContent("header")).includes("by Tiff") ? "«by Tiff» ✓)" : "pa brand ✗)");

// 1. Designer: ngarko logo + ndrysho ngjyrën e titullit
await page.goto("http://localhost:3107/einstellungen");
await page.setInputFiles('input[name="logo"]', S + "/testlogo.png");
await page.fill('input[name="farbeTitel"]', "#16653c");
await page.fill('input[name="farbeLinien"]', "#c9a053");
await page.click('button:has-text("Speichern")');
await page.waitForURL(/gespeichert=1/);
const hatLogo = await page.$('img[alt="Logo"]');
console.log("1. Designer: logo + ngjyra TIFF të ruajtura", hatLogo ? "✓" : "✗");

// 2. Krijo ofertë
await page.goto("http://localhost:3107/offerten");
await page.selectOption('select[name="kundeId"]', { label: "Immobilien AG Seeblick" });
await page.fill('input[name="titel"]', "Anschlüsse neue Pumpen");
await page.click('button:has-text("Offerte erstellen")');
await page.waitForURL(/offerten\/.+/);
console.log("2. Oferta AN e krijuar ✓");

// 3. Grupi 1 me pozicione (përshkrim shumërreshtor si Wasserdichter)
await page.fill('textarea[name="bezeichnung"]', "Demontage:\nPumpe 1\nRohre");
await page.fill('input[name="menge"]', "4");
await page.selectOption('select[name="einheit"]', "h");
await page.fill('input[name="ansatz"]', "95");
await page.click('button:has-text("Position hinzufügen")');
await page.waitForLoadState("networkidle");
// 4. Grupi i dytë
await page.fill('form:has(button:has-text("+ Gruppe")) input[name="titel"]', "Neuanschluss Pumpen");
await page.click('button:has-text("+ Gruppe")');
await page.waitForLoadState("networkidle");
const forma2 = page.locator("form").filter({ hasText: "Position hinzufügen" }).nth(1);
await forma2.locator('textarea[name="bezeichnung"]').fill("Neuanschluss Pumpe 1: MCP3/125-250\nAnschluss Saugseite DN150 PN16\ninkl. Material INOX");
await forma2.locator('input[name="menge"]').fill("1");
await forma2.locator('input[name="ansatz"]').fill("2600");
await forma2.locator('button:has-text("Position hinzufügen")').click();
await page.waitForLoadState("networkidle");
const trup = await page.textContent("main");
console.log("3+4. Grupe hierarkike:", trup.includes("1.1") && trup.includes("2.1") && trup.includes("380.00") && trup.includes("2'600.00") ? "✓ (1.1 + 2.1, totale të sakta)" : "✗");

// 5. PDF e ofertës me logo + ngjyra
const pdfResp = await page.request.get(page.url().replace("/offerten/", "/api/offerten/") + "/pdf");
console.log("5. PDF e ofertës:", pdfResp.status() === 200 && pdfResp.headers()["content-type"] === "application/pdf" ? "✓" : "✗ " + pdfResp.status());
const fs = await import("fs");
fs.writeFileSync(S + "/angebot-test.pdf", Buffer.from(await pdfResp.body()));

// 6. Konverto në Auftrag
await page.click('button:has-text("In Auftrag umwandeln")');
await page.waitForURL(/auftraege\/.+/);
const auftragTekst = await page.textContent("main");
console.log("6. Konvertimi → Auftrag:", auftragTekst.includes("Demontage:") && auftragTekst.includes("2'600.00") ? "✓ pozicionet u kopjuan" : "✗");

// 7. Fshirja e klientit: i riu fshihet, me dokumente bllokohet
await page.goto("http://localhost:3107/kunden");
await page.fill('input[name="name"]', "Test Fshirje AG");
await page.click('button:has-text("Speichern")');
await page.waitForLoadState("networkidle");
await page.click('a:has-text("Test Fshirje AG")');
await page.click('button:has-text("Kunde löschen")');
await page.waitForURL("http://localhost:3107/kunden");
console.log("7a. Klienti pa dokumente u fshi ✓");
await page.click('a:has-text("Immobilien AG Seeblick")');
await page.click('button:has-text("Kunde löschen")');
await page.waitForURL(/fehler=hat-dokumente/);
console.log("7b. Klienti me ofertë NUK fshihet (mbrojtje) ✓");
await b.close();
