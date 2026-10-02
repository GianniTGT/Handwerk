# Analiza e Bexio-s — Si funksionon, çfarë bën, ku e mundim

**Qëllimi:** Ta njohim Bexio-n më mirë se vetë shitësit e tij, që të dimë saktësisht çfarë
të kopjojmë, çfarë të thjeshtojmë dhe ku të godasim.
**Burimi:** llogaria trial e AINO Haustechnik GmbH (office.bexio.com) + hulumtim korrik–tetor 2026.

---

## 1. Çmimet e Bexio-s 2026 (pas rritjes së marsit)

| Paketa | CHF/muaj (vjetor) | CHF/muaj (mujor) | Përdorues | Shënime |
|---|---|---|---|---|
| Basic | 35 | 45 | 1 | pa AI-skanim faturash |
| Advanced (ish-Starter) | 42 | 52 | 2 | **+20% rritje çmimi mars 2026!** |
| Optima | 69 | 79 | 5 | 100 AI-skanime/muaj |
| Ultimate | 119 | 129 | 25 | skanime pa limit |
| Lohn (pagat) | add-on me pagesë | | | jo i përfshirë |

**Pse është lajm i mirë për ne:** rritja e çmimit +20% ka krijuar pakënaqësi të dokumentuar
(blogjet zvicerane janë plot artikuj "Bexio Alternative 2026"). Firmat e vogla me 1–2 veta
zyre paguajnë CHF 500–950/vit për një vegël që s'e mbulon fare terenin e tyre.

## 2. Modulet e Bexio-s (nga eksplorimi i llogarisë AINO)

| Moduli | Çfarë bën | Vlerësimi për një firmë SHK |
|---|---|---|
| **Dashboard** | Përmbledhje, "Erste Schritte", Schnelleinstellungen | OK, gjenerik |
| **Kontakte** | Klientë + furnitorë në një listë | S'ka koncept **Objekt/Anlage** (kaldaja, bojleri)! |
| **Verkauf** | Offerte → Auftrag → Rechnung (**Belegfluss**) | Rrjedha e dokumenteve është e mirë — ta kopjojmë konceptin |
| **Ausgaben** | Shpenzime, fatura furnitorësh, AI-skanim | E fortë, por jo prioritet për MVP-në tonë |
| **Produkte** | Artikuj me çmime | Ka, por pa kataloge dege (IGH/NPK) |
| **Banking** | Lidhje e-banking, pagesa, abgleich | E fortë — kjo është "moat"-i i Bexio-s; ne e lëmë për më vonë |
| **Buchhaltung** | Kontabilitet i dyfishtë, MwSt-raporte | E fortë — ne NUK e ndërtojmë; eksport te Treuhänder |
| **Posteingang** | Inbox dokumentesh | Nice-to-have |
| **Dokumenten-Designer** | Vorlage: logo, ngjyra, Druck-Layout | E thjeshtë dhe e mirë — na duhet një version minimal |
| **bexio network** | Shkëmbim dokumentesh mes firmave bexio | Lock-in-strategji e tyre |

## 2a. Fatura reale e bexio AG (referencë e analizuar, korrik 2026)

Kemi në dorë një faturë reale të bexio-s drejt një firme të vogël kliente. Mësimet:

**Sa paguan realisht një firmë e vogël:**
- Package Advanced, Yearly Fee: **CHF 504.00/vit** (= 42/muaj, konfirmon çmimoren 2026)
- Zbritje promocionale **-30% vitin e parë** (bx30, "alle Pakete") → pra bexio blen klientë
  me zbritje agresive; viti 2 kushton plot. Kjo krijon momentin e zhgënjimit në rinovim —
  **koha ideale për t'i ofruar alternativën tonë është para rinovimit të vitit 2**.
- Option Lohnbuchhaltung: **CHF 300/vit** për 5 punonjës (CHF 60/punonjës/vit) — add-on.
- Total me MwSt 8.1%: **CHF 705.70/vit** — pa asnjë funksion terreni/servisi brenda.

**Standardi i layoutit që duhet ta arrijmë (dhe ta kalojmë):**
- Logo lart djathtas; blloku i dërguesit/marrësit; tabela informative:
  Datum, **Zahlbar bis** (afati i pagesës), MwSt-Nr (CHE-…), Ansprechpartner, **Kundennummer**
- Pozicionet të grupuara sipas periudhës, rreshta zbritjeje të qartë
- Total → Zzgl. MwSt. 8.1% → **Betrag inkl. MwSt.**
- Shënimi: *"Ihre QR-Rechnung befindet sich auf der nächsten Seite"* —
  **QR-pjesa (Empfangsschein + Zahlteil) në faqe të veçantë**, me QR-IBAN dhe
  **QR-Referenz** 27-shifrore (për abgleich automatik të pagesave në e-banking)

**Detyrë teknike për ne:** mbështetje opsionale për QR-IBAN + QR-Referenz (jo vetëm IBAN
të thjeshtë) — kështu firmat tona i njohin pagesat automatikisht, si bexio.

## 2b. Fatura reale e AINO-s me Bexio (klienti ynë pilot nr. 1) — prova e tezës

AINO Haustechnik GmbH **e përdor Bexio-n në prodhim** (jo trial). Analiza e një fature
reale servisi (klima/kompresor, 2 faqe + QR) nxjerr gjetjet më të forta deri tani:

**Prova kryesore — workaround-i "objekt:":** meqë Bexio s'ka koncept objekti/pajisjeje,
AINO e shkruan ME DORË te pozicionet e faturës një bllok tekst të lirë:
`objekt:`, `Rechnungsadresse:`, `Referenz: V800 Kompressor Kälte`. Çdo faturë servisi,
çdo herë, me dorë. **Tek ne Objekt-i është fushë strukturore** — plotësohet një herë,
shfaqet vetë në çdo dokument, dhe mban historinë e servisit. Ky është demo-momenti
vendimtar për AINO-n: "Ju e shkruani objektin me dorë në çdo faturë — te ne ai ekziston."

**Të dhëna tregu nga fatura (tarifat reale të një firme SHK në Bern):**
- Orë pune servisi: **CHF 150/h** · Anfahrtspauschale: **CHF 50**
- Material me **Art-Nr të furnitorit** (p.sh. Primofit-Kupplung, Art: 511740) —
  konfirmon nevojën e katalogut të artikujve me numra artikujsh (→ IGH)
- QR-pjesa e tyre përdor IBAN të thjeshtë me Referenz zero — pra **asnjë abgleich
  automatik**; as këtu Bexio s'u jep avantazh. Pariteti ynë është i mjaftueshëm.

**Elementet e layoutit që i morëm (implementuar në PDF-në tonë v3):**
titull fature + emër auftragu, tekst përshëndetjeje ("Guten Tag … / Danke für Ihr
Vertrauen…"), kolona Pos., Rundungsdifferenz si rresht i veçantë, tekst mbyllës me
përshëndetje, footer në çdo faqe (adresa, email, telefon, Bank/BIC/IBAN, MWST-Nr),
numërim faqesh "Seite X von Y", QR në faqe të veçantë. **E vetmja gjë që na mungon
ende: logo e firmës në krye** (vjen me ngarkimin e logos në konfigurim — Faza 2).

## 3. Dobësitë e Bexio-s për zanatlinjtë (vërejtje nga trial-i)

1. **Zero funksione terreni:** asnjë Regierapport, asnjë app montatori, asnjë nënshkrim
   klienti në vend, asnjë foto-dokumentim. Gjithçka supozon një person që rri në zyrë.
2. **Kompleksitet kontabiliteti i detyruar:** te çdo pozicion oferte duhet zgjedhur
   **Konto (3200 Handelserlös)** dhe **Steuersatz (UN81 8.10%)** — shih screenshot-in e
   ofertës "Test". Një montator s'duhet ta shohë KURRË këtë. Te ne: kontoja/tatimi
   vendosen një herë në konfigurim, pozicionet janë vetëm "çfarë, sa, me çfarë çmimi".
3. **Pa objekte/pajisje:** historia e servisit të një kaldaje nuk ekziston si koncept.
4. **Pa Wartungsverträge:** asnjë rikujtesë servisi — pikërisht ari i biznesit SHK.
5. **Pa kataloge dege:** asnjë lidhje IGH/Debrunner/Meier Tobler; artikujt futen dorazi.
6. **Çmimi u rrit, besimi u lëkund** — dritarja e kalimit është e hapur tani.

## 4. Çfarë bën MIRË Bexio dhe duhet ta kopjojmë (me masë)

- **Belegfluss-i** Offerte → Auftrag → Rechnung me statuse — koncept i shkëlqyer;
  tek ne bëhet Auftrag → Rapport → Rechnung (dhe më vonë Offerte përpara).
- **Onboarding "Erste Schritte"** — lista me 3 hapa në dashboard; e thjeshtë, efektive.
- **Dokumenten-Designer i thjeshtë** — logo + ngjyra + layout; mjafton kaq, jo më shumë.
- **QR-Rechnung native** — e kemi tashmë ✅
- **E-Mail-dërgimi i dokumenteve direkt nga sistemi** — na duhet herët (SMTP).

## 5. Pozicionimi ynë përballë Bexio-s

> **Bexio është zyra. Ne jemi tereni + zyra e vogël.**
> Për firmën SHK 1–10 vetash: rapporti bëhet te klienti, fatura del para se montatori
> të kthehet në furgon, dhe kaldaja e ka historinë e vet.

Çmimi ynë CHF 39/përdorues/muaj qëndron nën "Advanced" (42) me funksione që Bexio
s'i ka fare. Argumenti i shitjes: *"Më pak se Bexio, por bën atë që juve ju duhet vërtet."*

## 6. Checklist për eksplorimin e mëtejshëm të trial-it (AINO-llogaria)

Dokumentoni me screenshots në `docs/bexio-screenshots/`:
- [ ] Krijo një ofertë të plotë → kthe në Auftrag → kthe në Rechnung (Belegfluss: sa klikime?)
- [ ] Gjenero PDF-në e faturës me QR — si duket? (krahasim me tonën)
- [ ] Provo Zeiterfassung-un: a lidhet me faturim? Sa hapa?
- [ ] Provo të regjistrosh një "servis kaldaje" — ku ngec modeli i tyre i të dhënave?
- [ ] Shiko eksportet (Buchhaltung): çfarë formati merr Treuhänder-i?
- [ ] Numëro klikimet për rrjedhën "punë e kryer → faturë e dërguar" (tek ne synojmë < 10)
