# Handwerk-App — MVP për firmat Sanitär/Heizung (CH)

Rrjedha kryesore: **Serviceauftrag → Rapport nga tereni → Faturë PDF me QR-Rechnung** brenda 5 minutash.

## Si ta nisni lokalisht

```bash
cd handwerk-app
npm install
npx prisma migrate dev   # krijon databazën SQLite + seed me të dhëna demo
npm run dev              # hap http://localhost:3000
```

## Çfarë përmban tani (v0.1)

- **Kunden** — klientët me objektet/pajisjet e tyre (kaldaja, bojleri…)
- **Aufträge** — urdhrat e punës me status (OFFEN → IN_ARBEIT → ERLEDIGT → VERRECHNET)
- **Rapport** — pozicionet Arbeit/Material (nga katalogu i artikujve ose të lira),
  nënshkrimi i klientit me gisht/maus direkt në ekran
- **Rechnungen** — gjenerohen me një klik nga rapporti; PDF me **Swiss QR-bill**
  (libraria `swissqrbill`, spec SIX v2.3), MwSt 8.1%, rrumbullakim 5-Rappen
- Multi-tenant në modelin e të dhënave (tabela `Betrieb`) që nga dita 1

## Stack

Next.js (App Router, TypeScript, Tailwind) · Prisma + SQLite (dev) · pdfkit + swissqrbill

## Hapat e ardhshëm (sipas PLANI-I-NISJES.md)

1. Login & ndarje e vërtetë tenantësh (auth)
2. Foto-upload në rapport
3. Wartungsverträge me rikujtesa automatike
4. Import artikujsh CSV → më vonë IGH/DataSelect
5. PWA offline-first për montatorët në teren
6. PostgreSQL në prodhim + hosting CH (Infomaniak/Exoscale)

## Shënime

- IBAN-i në seed është IBAN-i zyrtar i testit të SIX — zëvendësohet me IBAN-in real
  të firmës pilote në `Betrieb.iban`.
- Gjuha e UI-së është gjermanisht (tregu i synuar); komentet e kodit shqip/gjermanisht.
