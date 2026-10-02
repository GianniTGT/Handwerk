# Strategjia Cloud & Infrastruktura — "asgjë të mos harrohet"

**Vendimi bazë:** Softueri dorëzohet si **Cloud-SaaS multi-tenant** — një instalim qendror,
të gjitha firmat klientë në të njëjtin sistem, të ndara me `betriebId` (dhe auth).
Asnjë Excel, asnjë instalim lokal, asnjë version desktop.

## Pse Cloud (dhe jo Excel/lokal)

| Kriteri | Cloud SaaS ✅ | Excel/lokal ❌ |
|---|---|---|
| Montatori në teren | app në telefon, kudo | e pamundur |
| Përditësime | njëherësh për të gjithë | kaos versionesh |
| Të ardhura | abonim mujor i përsëritshëm | shitje një herë |
| Backup/siguri | qendror, i kontrolluar | te klienti, i pakontrolluar |
| Suport | shohim të njëjtën gjë që sheh klienti | "te unë funksionon" |
| Shitja | trial link në 30 sekonda | vizitë instalimi |

E vetmja kërkesë speciale: **offline-aftësi në app-in e terenit** (PWA me sync) —
sepse bodrumet s'kanë rrjet. Kjo zgjidhet në klient (local-first), jo me instalim lokal.

## Arkitektura — Faza pilote (3 firmat, muajt 1–6)

**Parimi: sa më thjesht që të mbahet nga një person i vetëm. Pa Kubernetes, pa mikroservise.**

```
[Montatori: telefon/tablet]──┐
[Zyra: browser]──────────────┤ HTTPS
                             ▼
                   ┌──────────────────────┐
                   │ VPS në Zvicër        │
                   │ Caddy (TLS auto)     │
                   │ Next.js (node)       │
                   │ PostgreSQL 16        │
                   └──────────────────────┘
                             │ backup natën, i enkriptuar
                             ▼
                   [Object Storage / bucket i ndarë]
```

### Komponentët konkretë

| Komponenti | Zgjedhja | Pse | Kosto/muaj |
|---|---|---|---|
| Hosting | **Infomaniak VPS** (CH) | zviceran, nDSG, i lirë, i besueshëm | ~CHF 10–30 |
| Alternativa | Exoscale (CH, më enterprise) | managed Postgres i gatshëm | ~CHF 50+ |
| Web server | **Caddy** | TLS automatik, config 5 rreshta | 0 |
| App | **Next.js** (ekzistuese) si Node-proces me `systemd` ose Docker Compose | e kemi | 0 |
| DB | **PostgreSQL** në të njëjtin VPS (pilot) → managed DB kur të kemi 20+ klientë | thjeshtësi tani, rrugë rritjeje e qartë | 0 → ~CHF 25 |
| Skedarët (foto rapportesh, PDF) | Object Storage (Infomaniak Swiss Backup / S3-compatible) | jo në disk të VPS-së | ~CHF 2–5 |
| Domain | p.sh. `*.ch` + subdomain per-tenant më vonë | besim lokal | ~CHF 10/vit |
| E-Mail (dërgim faturash) | SMTP i Infomaniak ose Postmark | deliverability | 0–10 |
| Monitorim | UptimeRobot (falas) + Sentry (falas tier) | të mësojmë ne të parët kur bie | 0 |
| CI/CD | GitHub Actions → deploy me SSH/Docker | push = deploy | 0 |

**Total pilot: ~CHF 15–45/muaj.** Një klient i vetëm me pagesë e mbulon gjithë infrastrukturën.

### Migrimi i nevojshëm në kod (para pilotit)

1. **SQLite → PostgreSQL** (Prisma e bën me ndërrim të `datasource` + migrate) — 1 ditë.
2. **Auth + tenant-ndarje reale**: login (p.sh. Auth.js), çdo query e filtruar nga
   `betriebId` i sesionit (themeli ekziston në skemë) — 3–5 ditë. **Pa këtë, asnjë
   klient real nuk hyn në sistem.**
3. **Backups të automatizuara + restore i TESTUAR** (pg_dump natën → object storage,
   enkriptim, retention 30 ditë; një herë në muaj: provo restore-in!) — 1 ditë.
4. HTTPS kudo, security headers, rate limiting bazik — 1 ditë.

## Siguria & nDSG (lista "mos harro")

- [ ] Të dhënat vetëm në Zvicër (VPS + backup CH)
- [ ] TLS kudo (Caddy automatik); enkriptim i backup-eve
- [ ] Fjalëkalime: hash me argon2/bcrypt; 2FA për rolin CHEF (faza 2)
- [ ] AVV/Auftragsverarbeitungsvertrag i thjeshtë për çdo firmë kliente (template një herë nga avokati)
- [ ] Datenschutzerklärung në faqe
- [ ] Logs pa të dhëna personale të tepërta; retention i definuar
- [ ] Off-boarding: klienti largohet → eksport i plotë i të dhënave të tij + fshirje e dokumentuar
- [ ] Llogari admin të ndara (jo root për gjithçka), çelësa SSH, fail2ban

## Mjediset (environments)

| Mjedisi | Ku | Përdorimi |
|---|---|---|
| **dev** | lokalisht (SQLite ose Postgres në Docker) | zhvillim ditor |
| **staging** | në të njëjtin VPS, port/subdomain tjetër, DB e veçantë | test para deploy-it; demo të guximshme |
| **prod** | VPS, DB prod | 3 firmat pilote → klientët |

Rregull: **asnjë eksperiment direkt në prod** sapo firma e parë të fusë të dhëna reale.

## Rruga e rritjes (që të mos projektojmë tepër që tani)

- **0–20 klientë:** 1 VPS siç më lart. Mjafton plotësisht.
- **20–100 klientë:** DB → managed PostgreSQL (Exoscale/Infomaniak), VPS më i madh ose
  2 VPS (app + DB të ndarë), staging në server të vet.
- **100+ klientë:** load balancer, replika DB, on-call-zinxhir — problem i bukur për atëherë.

## Vendime të hapura (për t'u marrë gjatë pilotit)

1. Emri i produktit + domain-i (para demo-s së parë te Wasserdichter/AINO/Derguti).
2. Postmark vs SMTP Infomaniak për email transaksional.
3. Docker Compose vs systemd i thjeshtë (rekomandimi im: Docker Compose — staging/prod identike).
