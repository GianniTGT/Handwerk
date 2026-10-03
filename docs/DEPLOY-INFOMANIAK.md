# Deploy në Infomaniak — udhëzues hap-pas-hapi (foolproof)

**Qëllimi:** aplikacioni live në internet, me HTTPS, në server zviceran — që AINO,
Wasserdichter dhe Derguti të hyjnë nga zyrat/terenet e tyre.
**Kosto:** VPS ~CHF 10–30/muaj + domain ~CHF 10/vit. **Kohë:** ~1 orë herën e parë.

Gjithçka teknike është e gatshme në repo (`Dockerfile`, `docker-compose.prod.yml`,
`deploy/Caddyfile`, `scripts/backup.sh`) — ju bëni vetëm hapat më poshtë.

---

## HAPI 1 — Blini serverin (vetëm ju mund ta bëni)

1. Shkoni te **infomaniak.com** → krijoni llogari (me email-in e firmës TIFF)
2. Porositni **VPS Cloud / VPS Lite**:
   - Madhësia: më e vogla mjafton për pilotët (2 vCPU / 2–4 GB RAM / 40 GB SSD)
   - Sistemi operativ: **Ubuntu 24.04 LTS**
   - Lokacioni: Zvicër 🇨🇭
3. Gjatë porosisë ju jepet mundësia të vendosni **çelës SSH** ose fjalëkalim rreth
   qasjes — zgjidhni fjalëkalim nëse çelësat SSH ju duken të panjohur (e thjeshtë),
   dhe ruajeni diku të sigurt.
4. Pas aktivizimit merrni **IP-adresën** e serverit (p.sh. `185.xx.xx.xx`) — shënojeni.

## HAPI 2 — Domain-i

1. Te Infomaniak (ose ku e keni domain-in e TIFF): shtoni një **A-Record**:
   - Emri: `app` (→ bëhet `app.tiff-software.ch` ose çfarë të doni)
   - Vlera: IP-ja e serverit nga Hapi 1
2. Prisni 5–30 minuta që DNS të përhapet.

## HAPI 3 — Lidhuni me serverin (nga PowerShell i Windows-it)

```powershell
ssh ubuntu@185.xx.xx.xx        # ose root@… — sipas email-it të Infomaniak
```
Shkruani `yes` në pyetjen e parë, pastaj fjalëkalimin. Tani jeni NË server —
komandat e mëposhtme ekzekutohen aty (jo në laptop!).

## HAPI 4 — Instaloni Docker + merrni kodin (copy-paste, rresht pas rreshti)

```bash
sudo apt update && sudo apt -y upgrade
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
exit
```
Lidhuni përsëri me `ssh …` (që grupi docker të aktivizohet), pastaj:

```bash
sudo mkdir -p /opt && cd /opt
sudo git clone https://github.com/GianniTGT/Handwerk.git
sudo chown -R $USER:$USER Handwerk
cd Handwerk && git checkout claude/business-ideas-evaluation-3pqnqg
cd handwerk-app
```

## HAPI 5 — Konfigurimi i prodhimit

```bash
cp .env.prod.example .env.prod
openssl rand -base64 24        # ← kopjojeni rezultatin si fjalëkalim DB
nano .env.prod
```
Në editor plotësoni: `DOMAIN=app.tiff-software.ch` (domain-i juaj nga Hapi 2),
`DB_PASSWORT=` (rezultati i openssl), `APP_URL=https://app.tiff-software.ch` (e detyrueshme —
përdoret te linqet në email, p.sh. "Passwort vergessen") dhe `TIFF_ADMIN_EMAILS=` me email-in tuaj.
SMTP lëreni bosh në fillim. Ruani me `Ctrl+O`, `Enter`, dilni me `Ctrl+X`.
(Regjistrimi publik mbetet i mbyllur — `REGISTRIERUNG` lëreni bosh.)

## HAPI 6 — Nisja 🚀

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
```
Hera e parë zgjat 3–5 minuta (build + shkarkime). Pastaj hapni në browser:
**https://app.tiff-software.ch** — HTTPS vjen automatikisht nga Caddy/Let's Encrypt.
Regjistrimi publik është i mbyllur — llogaria e parë krijohet me një komandë (jep fjalëkalim fillestar
të rastësishëm që duhet ndryshuar në hyrjen e parë):

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod exec app \
  npm run admin:anlegen -- "TIFF Software Solutions" "Emri Juaj" email@juaj.ch
```
Pastaj hyni, dhe te "Kunden-Betriebe verwalten" krijoni firmat-klientë. Detajet e plota: `docs/PILOT-CHECKLISTE.md`.

Kontroll shëndeti: `docker compose -f docker-compose.prod.yml ps` (të tre "running")
dhe `docker compose -f docker-compose.prod.yml logs app --tail 50` për logs.

## HAPI 7 — Backup-et (MOS e anashkaloni)

```bash
crontab -e      # zgjidhni nano (1) nëse pyet
```
Shtoni në fund këtë rresht (backup çdo natë në 02:15, retention 30 ditë):
```
15 2 * * * cd /opt/Handwerk/handwerk-app && sh scripts/backup.sh >> backups/backup.log 2>&1
```
**Një herë në muaj**: testoni restore-in (komanda është brenda `scripts/backup.sh`).
Backup-et janë në `/opt/Handwerk/handwerk-app/backups/` — tërhiqini herë pas here
edhe në laptop (`scp`) ose aktivizoni Swiss Backup të Infomaniak.

## Përditësimet e ardhshme (kur unë shtoj veçori)

```bash
ssh ubuntu@IP
cd /opt/Handwerk && git pull
cd handwerk-app
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
```
Migrimet e databazës ekzekutohen vetë në nisje (`prisma migrate deploy` në CMD).

## Siguria bazike (5 minuta, njëherësh)

```bash
sudo ufw allow OpenSSH && sudo ufw allow 80 && sudo ufw allow 443 && sudo ufw enable
sudo apt -y install fail2ban
```

## Kur të vijë email-i (SMTP)

Te Infomaniak keni **Mail Service** me domain-in: krijoni p.sh. `noreply@tiff-software.ch`,
pastaj te `.env.prod`: `SMTP_HOST=mail.infomaniak.com`, `SMTP_PORT=587`,
`SMTP_USER=noreply@…`, `SMTP_PASS=…`, `SMTP_FROM=noreply@…` dhe rinisni me
komandën e përditësimit. Email-et e ofertave/faturave atëherë dërgohen realisht.

---

## Çfarë mund të shkojë keq (dhe zgjidhja)

| Simptoma | Shkaku | Zgjidhja |
|---|---|---|
| https nuk hapet, "connection refused" | DNS ende s'ka u përhap / porti i mbyllur | prisni 30 min; `sudo ufw status`; `docker compose … ps` |
| Caddy-logs: "challenge failed" | A-Record i gabuar | kontrolloni IP-në te DNS-ja e domain-it |
| "no space left on device" | imazhe të vjetra docker | `docker system prune -af` |
| App-i bie pas update | gabim në migrim/kod | `docker compose … logs app`; më dërgoni log-un |
