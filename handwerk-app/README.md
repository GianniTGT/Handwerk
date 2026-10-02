# Handwerk-App — MVP për firmat Sanitär/Heizung (CH)

Rrjedha kryesore: **Serviceauftrag → Rapport nga tereni → Faturë PDF me QR-Rechnung** brenda 5 minutash.

## Si ta nisni lokalisht

Databaza tani është **PostgreSQL** (gati për prodhim/multi-tenant). Lokalisht niset
më lehtë me Docker.

### Windows (laptopi juaj — pa server cloud, pa Linux)

1. Instaloni **Node.js LTS** nga [nodejs.org](https://nodejs.org) (default-et mjaftojnë)
2. Instaloni **Git** nga [git-scm.com](https://git-scm.com/download/win)
3. Instaloni **Docker Desktop** nga [docker.com](https://www.docker.com/products/docker-desktop/)
   (vetëm për PostgreSQL-në lokale; pas instalimit niseni një herë)
4. Hapni **PowerShell** dhe ekzekutoni:

```powershell
git clone https://github.com/GianniTGT/Handwerk.git
cd Handwerk
git checkout claude/business-ideas-evaluation-3pqnqg
cd handwerk-app
copy .env.example .env
docker compose up -d        # nis PostgreSQL në sfond
npm install
npx prisma migrate dev      # krijon tabelat + seed me të dhëna demo
npm run dev
```

5. Hapni **http://localhost:3000** → ridrejtoheni te **/login**.

**Llogaritë demo** (nga seed-i):
- Chef: `chef@demo.ch` / `demo1234`
- Monteur: `monteur@demo.ch` / `demo1234`

Ose regjistroni firmë të re te **/registrieren** — çdo firmë sheh VETËM të dhënat e veta.

**Testim nga telefoni (rrjedha e montatorit):** niseni me
`npm run dev -- -H 0.0.0.0`, gjeni IP-në e laptopit me `ipconfig` (p.sh. 192.168.1.20)
dhe hapni në telefon `http://192.168.1.20:3000` — telefoni dhe laptopi duhet të jenë
në të njëjtin Wi-Fi (lejojeni në Windows Firewall nëse pyet).

### Mac/Linux

```bash
cd handwerk-app
cp .env.example .env
docker compose up -d
npm install
npx prisma migrate dev
npm run dev              # hap http://localhost:3000
```

Serveri cloud (Infomaniak etj., shih `docs/cloud-strategjia.md`) duhet VETËM kur
firmat pilote të punojnë me të dhëna reale nga jashtë — jo për zhvillim e testim.

## Çfarë përmban tani (v0.1)

- **Login & multi-tenant** — çdo firmë (Betrieb) me përdoruesit e vet, sheh vetëm të dhënat e veta; regjistrim i firmave të reja në /registrieren
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

1. ~~Login & ndarje tenantësh~~ ✅ · ~~PostgreSQL~~ ✅
2. Foto-upload në rapport
3. Wartungsverträge me rikujtesa automatike
4. Import artikujsh CSV → më vonë IGH/DataSelect
5. PWA offline-first për montatorët në teren
6. PostgreSQL në prodhim + hosting CH (Infomaniak/Exoscale)

## Shënime

- IBAN-i në seed është IBAN-i zyrtar i testit të SIX — zëvendësohet me IBAN-in real
  të firmës pilote në `Betrieb.iban`.
- Gjuha e UI-së është gjermanisht (tregu i synuar); komentet e kodit shqip/gjermanisht.
