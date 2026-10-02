# Materiali & Katalogët e Furnitorëve — Si funksionon dhe plani ynë

**Problemi i sotëm (si punojnë AINO & Wasserdichter):** hapin webshop-in e furnitorit
(Debrunner, Meier Tobler…), kërkojnë artikullin, **copy-paste** në Bexio, pastaj
përshtatin çmimin me dorë sipas zbritjes së tyre. Për çdo artikull, çdo herë.

**Zgjidhja standarde në Zvicër: ekosistemi IGH.** Nuk duhet shpikur asgjë — duhet lidhur.

---

## 1. Si funksionon realisht sistemi IGH

### Katalogët (DataExpert®)
Furnitorët e mëdhenj (Debrunner Acifer, Meier Tobler, Sanitas Troesch, Geberit…)
publikojnë katalogët e tyre elektronikë në formatin **DataExpert®** — artikuj me numra,
përshkrime, njësi dhe **çmime bruto**. Softueri i degës (Branchensoftware) i importon
dhe instalateri kërkon artikujt direkt në programin e vet.

### Zbritjet individuale (DataExpert® ikk — "individuelle Kundenkonditionen")
Kjo është përgjigjja e pyetjes kryesore: **çdo firmë ka zbritje të ndryshme për grupe
të ndryshme artikujsh** — dhe furnitori i dorëzon ato ELEKTRONIKISHT si listë çmimesh
neto personale:

1. Firma (p.sh. AINO) merr nga furnitori i saj një **login ikk**
2. Login-i futet NJË HERË në softuerin e degës (tek ne)
3. Prej andej, çmimet neto personale **sinkronizohen automatikisht** — kur furnitori
   ndryshon çmimet ose kushtet, update-i vjen vetë

> Pra: **asnjë skanim, asnjë "Mordsarbeit"** — zbritjet nuk futen artikull për artikull.
> Furnitorët i organizojnë zbritjet sipas **Rabattgruppen/Warengruppen** (grupe malli),
> kështu që një firmë ka disa dhjetëra kushte, jo mijëra. Dhe me ikk as këto s'futen
> me dorë — vijnë nga serveri i furnitorit.

### Porositë (IGH451 / WebService)
Niveli tjetër: lista e materialit nga oferta/rapporti eksportohet si **IGH451** ose
dërgohet me WebService direkt si porosi te furnitori. (Fazë e mëvonshme për ne.)

## 2. Sa kushton? (verifikuar tetor 2026, igh.ch)

| Kush | Çfarë | Kosto |
|---|---|---|
| **Instalateri** (AINO, Wasserdichter…) | TË GJITHA shërbimet IGH: katalogët DataExpert, DataSelect.ch, WebService | **FALAS** |
| **Anëtarët IGH** (furnitorët/ofruesit) | Pranim një herë CHF 1'500 + CHF 4'000/vit | ata e paguajnë vetë |
| Infrastruktura për përdorues katalogësh | CHF 300/vit | e vogël |
| **Ne si softueri i degës** | Qasja në format/dokumentacion — kushtet sakta i konfirmojmë me info@igh.ch | pritshëm modeste |

**Përfundim:** kostoja NUK është pengesë. Pengesa e vërtetë është puna e integrimit —
dhe pikërisht ajo është "moat"-i: kush e ka integrimin, s'zëvendësohet dot.

## 3. Plani ynë me 3 faza (pa pritur askënd)

### Faza A — Import i përgjithshëm + modeli i zbritjeve (PA IGH, direkt pas auth-it)
Furnitorët lejojnë tashmë shkarkim të listave të çmimeve si **Excel/CSV** nga e-shop-et
e tyre (shpesh edhe si listë neto). Ne ndërtojmë:

1. **Import CSV/Excel artikujsh**: ArtNr, përshkrim, njësi, çmim bruto, Rabattgruppe, furnitor
2. **Modeli i të dhënave**:
   - `Lieferant` (furnitori)
   - `Artikel` + `lieferantId`, `rabattgruppe`, `bruttoPreis`
   - `Kondition`: Betrieb × Lieferant × Rabattgruppe → zbritja % → **neto llogaritet vetë**
3. **Kërkim i shpejtë artikujsh** në Rapport/Offerte me çmimin neto TË FIRMËS

→ Vetëm kjo e vret workflow-in copy-paste që bëjnë sot. Vlera e demonstrueshme menjëherë.

### Faza B — Katalogët zyrtarë IGH (DataExpert)
Kontakt me **info@igh.ch**: dokumentacioni i formatit DataExpert, kushtet për ofrues
të rinj softueri. Ndërtojmë importuesin e formatit → katalogët e plotë të Debrunner,
Meier Tobler etj. me një klik, me update vjetor/periodik automatik.

### Faza C — ikk + porositë (diferencuesi përfundimtar)
- **DataExpert ikk**: firma fut login-in e furnitorit të saj te ne → çmimet neto
  personale sinkronizohen automatikisht (si OF-4000, por moderne)
- Më vonë: porosi direkt nga oferta (IGH451/WebService), disponibilitet live

## 4. Pse kjo është "moat"-i ynë

- Bexio: **zero** nga të gjitha këto — as kataloge, as zbritje, as porosi
- Konkurrentët gjermanë (HERO, Plancraft…): kanë Datanorm/IDS gjermane, **jo IGH** —
  integrimi zviceran u mungon strukturalisht
- OF-4000 e ka IGH-në, por me UX të vjetër desktop — ne e bëjmë cloud + mobile

**Pyetje për intervistat e pilotëve (shtoji listës):**
1. "Nga cilët furnitorë blini më shumë?" (renditja e integrimit)
2. "A keni përdorur ndonjëherë IGH-kataloge ose ikk-login?" (shumë firma të vogla s'e dinë fare!)
3. "Sa Rabattgruppen keni te furnitori juaj kryesor — e dini?" (→ sa punë ka Faza A)
4. "A mund të na jepni një eksport Excel të listës suaj neto nga e-shop-i i Debrunner/MT?"
   (→ të dhëna reale për prototipin e importit)
