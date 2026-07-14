# Handwerk — Plani i Përgatitjes dhe Nisjes

**Projekti:** Softuer i specializuar për zanatlinjtë zviceranë (alternativë ndaj Bexio, e fokusuar në zanate)
**Modeli:** B2B SaaS, treg lokal zviceran, Solo-Founder
**Data e planit:** Korrik 2026

---

## Parimi nr. 1 kundër dështimit

> **Arsyeja nr. 1 pse dështojnë projektet e tilla nuk është kodi i keq — është ndërtimi i një produkti që askush s'e blen.**

Prandaj ky plan e ndalon shkrimin e kodit deri në Fazën 1. Faza 0 (validimi) është e detyrueshme dhe
ka kritere të qarta kalimi. Nëse validimi dështon, kurseni 12 muaj punë — kjo është fitore, jo humbje.

---

## Çfarë dimë tashmë nga hulumtimi i tregut (Korrik 2026)

### Konkurrentët direkt në Zvicër

| Konkurrenti | Çmimi | Pozicionimi | Dobësia e mundshme |
|---|---|---|---|
| **Baunex** (baunex.ch) | CHF 24–34 / përdorues / muaj | All-in-one për ndërtim & zanate, app mobile, AI-planifikim | Gjeneralist për shumë zanate — jo i thelluar në asnjë |
| **Finito Pro** (Winterthur) | CHF 30 / përdorues / muaj | ERP për KMU: oferta, QR-fatura, orët, inventari | Më shumë KMU-gjenerik sesa zanat-specifik |
| **Bexio** | nga ~CHF 35 / muaj | Kontabilitet & administrim KMU | S'ka Regierapporte nga tereni, s'ka kataloge zanati, s'ka app të mirëfilltë terreni |
| **HERO, Plancraft, ToolTime** (DE) | të ndryshme | Handwerkersoftware gjermane me VC | Mungon lokalizimi CH: QR-Rechnung, IGH-kataloge, NPK, gjermanishtja zvicerane |
| **Sorba, Borm, pds** (legacy) | të larta, me instalim | ERP të vjetra për firma të mëdha | Të shtrenjta, të rënda, UI e vjetruar — të papërshtatshme për firma 1–10 vetash |

**Përfundimi:** Tregu NUK është bosh, por ka një boshllëk të qartë: **thellësi për një zanat të vetëm**,
me çmim rreth CHF 30–50, me UX moderne mobile-first. Askush nga të mësipërmit nuk është "softueri i
hidraulikut" apo "softueri i ngjyrosësit" — të gjithë janë "softuer për zanatlinjtë në përgjithësi".

### Infrastruktura teknike ekziston — s'duhet shpikur asgjë

- **QR-Rechnung:** librari open-source të gatshme — [SwissQRBill për Node.js](https://github.com/schoero/swissqrbill),
  [qrbill](https://pypi.org/project/qrbill/) dhe [chqr](https://github.com/balsigergil/chqr) për Python
  (spec v2.3, validim i plotë, DE/FR/IT/EN). Kjo veçori "e frikshme" zgjidhet për një javë.
- **Katalogët e furnitorëve (Sanitär/Heizung):** standardi **IGH** ([igh.ch](https://www.igh.ch/en/die-igh/kurzportrait/)) —
  113 furnitorë kryesorë (Debrunner Acifer, Geberit, etj.) + suissetec + EIT.swiss. Qasje përmes
  **DataSelect.ch API** (eksport CSV/XLSX) dhe standardit BMDG/DataExpert® që nga 2024. Kontakt: info@igh.ch.
  Kjo është "moat"-i afatgjatë — konkurrentët gjermanë nuk e kanë.
- **Gatishmëria për të paguar:** zanatlinjtë zviceranë paguajnë CHF 50–150/muaj për softuer, ROI 3–4 muaj.

---

## FAZA 0 — Validimi (Muaji 1–2, zero kod)

### 0.1 Zgjidhni NJË zanat të vetëm

Mos filloni me "të gjithë zanatlinjtë". Kriteri vendimtar: **ku keni qasje personale te 10+ firma reale?**
(familje, miq, komuniteti shqiptar në Zvicër — shumë zanatlinj shqiptarë punojnë në Maler/Gips/Sanitär,
ky është avantazh i juaji real që Baunex s'e ka).

| Kriteri | Maler/Gipser | Sanitär/Heizung |
|---|---|---|
| Thjeshtësia e domenit për MVP | ✅ E lartë (sipërfaqe, orë, material i thjeshtë) | ⚠️ Mesatare (artikuj kompleksë, kataloge) |
| Moat-i afatgjatë | ⚠️ Më i ulët | ✅ I lartë (IGH-katalogët) |
| Urgjenca e dhimbjes (Regierapporte) | ✅ E lartë | ✅ E lartë |
| Rekomandimi | **Filloni këtu nëse s'keni rrjet të fortë** | **Filloni këtu nëse keni kontakte në sektor** |

Strategjia e zgjuar: filloni me njërin, arkitektura e lejon shtimin e të dytit në vitin 2.

### 0.2 Intervistat e validimit (15 copë, të detyrueshme)

- Vizitoni 15 firma të zanatit të zgjedhur (1–15 punonjës). Jo pyetësor online — **kafe dhe bisedë**.
- Pyetjet kyçe (mos shisni asgjë, vetëm dëgjoni):
  1. "Si e regjistron sot punën në teren?" (letër? WhatsApp? Excel?)
  2. "Sa kohë kalon nga puna e kryer deri te fatura e dërguar?" (nëse >2 javë → dhimbje reale)
  3. "Sa para humb në vit nga orët/materiali i paregjistruar?" (zakonisht 5–10% e qarkullimit!)
  4. "Çfarë softueri ke provuar? Pse e le?"
  5. "Nëse një vegël ta zgjidh këtë, sa do paguaje në muaj?"
- **Regjistroni gjithçka** në një dokument (`validim/interviste-NN.md` në këtë repo).

### 0.3 Kriteret e kalimit në Fazën 1 (Go / No-Go)

- [ ] ≥ 10 nga 15 firmat e konfirmojnë të njëjtën dhimbje kryesore
- [ ] ≥ 5 firma thonë "po, do e provoja" dhe pranojnë të jenë pilotë
- [ ] ≥ 3 firma pranojnë çmim ≥ CHF 30/muaj pa hezitim
- [ ] Keni identifikuar SAKTËSISHT rrjedhën e parë të punës që do digjitalizoni

**Nëse këto s'plotësohen: ndryshoni zanatin ose dhimbjen — MOS filloni të kodoni.**

---

## FAZA 1 — MVP-ja "Wedge" (Muaji 3–5)

### Parimi: një rrjedhë e vetme, nga fillimi në fund

**MVP = "Regierapport nga tereni → Faturë me QR brenda 5 minutash"**

Përfshihet (dhe ASGJË më shumë):
1. **Regierapport mobil** (punonjësi në teren): orët, materiali, foto, nënshkrimi i klientit në ekran
2. **Menaxhim i thjeshtë klientësh e projektesh** (CRM minimal)
3. **Gjenerimi i faturës** nga rapportet e mbledhura — PDF me **QR-Rechnung** konform SIX v2.3
4. **Eksport për Treuhänder** (PDF/CSV) — kontabilistin s'e zëvendësoni, e furnizoni

NUK përfshihet në MVP (rezistojini tundimit): kontabilitet i plotë, paga, planifikim ekipesh,
lager/inventar, oferta komplekse me NPK, integrimi IGH (vjen në Fazën 3).

### Stack-u teknik i rekomanduar për Solo-Founder

- **Frontend:** PWA (web-app që instalohet si app) — **jo** native iOS/Android në fillim.
  Një kod, të gjitha platformat, pa Apple/Google review. Duhet të punojë **offline** (bodrume pa sinjal!)
  → React/Vue + IndexedDB/local-first sync.
- **Backend:** Node.js ose Python — çfarë njihni më mirë. PostgreSQL. Multi-tenant që nga dita 1.
- **QR-Rechnung:** libraria [schoero/swissqrbill](https://github.com/schoero/swissqrbill) (Node) ose
  [qrbill](https://pypi.org/project/qrbill/) (Python).
- **Hosting:** në Zvicër ose EU (Infomaniak CH, Exoscale CH) — "të dhënat në Zvicër" është argument shitjeje
  real te klientët tuaj dhe ju thjeshton nDSG-në.
- **Gjuha e produktit:** Gjermanisht (Hochdeutsch me terminologji CH: "Offerte" jo "Angebot",
  "Rapport" jo "Bericht"). Frëngjishtja vjen më vonë.

### Kriteret e kalimit në Fazën 2

- [ ] 3–5 firmat pilote e përdorin MVP-në në punë reale (jo demo) për ≥ 4 javë
- [ ] Të paktën 1 faturë reale me QR e dërguar dhe e paguar përmes sistemit
- [ ] Feedback-u i pilotëve i regjistruar dhe prioritetizuar

---

## FAZA 2 — Klientët e parë me pagesë (Muaji 6–9)

### Çmimi

- **CHF 39 / përdorues / muaj** (mes Baunex 24–34 dhe vlerës premium), ose CHF 390/vit (2 muaj falas).
- Pilotët e Fazës 1: 6 muaj falas → pastaj 50% zbritje përjetë (në këmbim të referencave e dëshmive).
- Mos konkurroni me çmim të ulët — konkurroni me **thellësi zanati**. Zanatlinjtë s'ndërrojnë softuer
  për CHF 10 diferencë, ndërrojnë kur diçka "i kupton" punën e tyre.

### Kanalet e shitjes (radhitur sipas efektivitetit për ju)

1. **Rekomandimi gojë-më-gojë** — zanatlinjtë i besojnë vetëm kolegut. Çdo klient i lumtur = 2–3 të rinj.
   Ofroni bonus referimi (1 muaj falas për çdo firmë të sjellë).
2. **Rrjeti shqiptar në Zvicër** — komunitet i madh në zanate; avantazhi juaj i padrejtë. Suporti edhe
   shqip mund të jetë diferencues unik që asnjë konkurrent s'e ofron.
3. **Treuhänder-ët (kontabilistët)** — çdo Treuhänder ka 20–50 klientë zanatlinj. Eksporti juaj i pastër
   u kursen orë pune → ata ju rekomandojnë. Partneriteti më i nënvlerësuar në këtë treg.
4. **Panairet lokale** (Bauen+Wohnen, panaire rajonale të zanateve) dhe shoqatat
   (**SMGV** për Maler/Gipser, **suissetec** për Sanitär/Heizung).
5. **SEO lokal në gjermanisht** — Baunex-i rritet pikërisht me blog-krahasime; bëjeni edhe ju
   ("Regierapport App Maler Schweiz", "QR-Rechnung Handwerker" etj.).

### Realiteti i shitjes B2B

Llogaritni: **50% e kohës suaj = shitje e suport, jo kod.** Nëse kjo ju duket e padurueshme,
gjeni herët një bashkëpunëtor për shitje (edhe me komision, pa e ndarë firmën).

### Kriteret e kalimit në Fazën 3

- [ ] 20 klientë me pagesë (≈ CHF 800–1'500 MRR)
- [ ] Churn mujor < 2%
- [ ] ≥ 50% e klientëve të rinj vijnë nga rekomandimet

---

## FAZA 3 — Thellimi dhe moat-i (Muaji 10–18)

1. **Integrimi IGH / katalogët e furnitorëve** (nëse Sanitär/Heizung): kontaktoni info@igh.ch,
   qasje përmes DataSelect.ch. Kjo e bën produktin të pazëvendësueshëm dhe të pakopjueshëm nga jashtë.
2. **Oferta (Offerten) me kataloge pozicionesh** sipas zanatit — hapi natyror pas rapporteve e faturave.
3. **Planifikimi i ekipeve** (Einsatzplanung) — kërkesa më e shpeshtë e dytë.
4. **Frëngjishtja** → hap Romandinë (+25% treg).
5. Vetëm PAS 50+ klientësh: mendoni zanatin e dytë.

**Objektivi i vitit të parë të plotë:** 30–50 klientë → CHF 15'000–25'000 ARR në rritje.
**Objektivi i vitit të dytë:** 100–150 klientë → CHF 50'000–70'000 ARR → i mjaftueshëm për t'u fokusuar 100%.

---

## Ligjore & administrative (paralel me Fazën 1)

- **Forma juridike:** filloni si **Einzelfirma** (falas, e thjeshtë); kaloni në **GmbH** (CHF 20'000 kapital)
  kur të keni klientët e parë me pagesë — për mbrojtje përgjegjësie dhe besueshmëri B2B.
- **TVSH (MWST):** e detyrueshme vetëm mbi CHF 100'000 qarkullim/vit — në fillim s'ju prek.
- **nDSG (ligji zviceran i të dhënave):** kontratë përpunimi të dhënash (AVV) me klientët, hosting në CH/EU,
  një faqe e qartë privatësie. Për B2B të kësaj shkalle është plotësisht i menaxhueshëm.
- **Kontratat me klientët:** AGB të thjeshta + SLA bazik. Mos investoni mijëra franga në avokatë ditën e parë.

---

## 7 mënyrat më të mundshme si dështon ky projekt — dhe kundërmasat

| # | Mënyra e dështimit | Kundërmasa në këtë plan |
|---|---|---|
| 1 | Ndërtoni 12 muaj pa folur me klientë | Faza 0 e detyrueshme me kritere Go/No-Go |
| 2 | MVP tenton të bëjë gjithçka (ERP i plotë) | Scope i ngrirë: vetëm Rapport→Faturë |
| 3 | Nënvlerësoni shitjen ("produkti shitet vetë") | 50% e kohës e planifikuar për shitje; kanale konkrete |
| 4 | Konkurroni ballë-për-ballë me Baunex si gjeneralist | Diferencim me thellësi në NJË zanat + rrjet personal |
| 5 | App që s'punon offline / UX e ndërlikuar për terenin | PWA offline-first; testim me punëtorë realë, jo me veten |
| 6 | Mbaroni parat/durimin para tërheqjes (traction) | Mbajeni punën/të ardhurat aktuale deri në ~CHF 3–4k MRR |
| 7 | Një konkurrent i madh e kopjon veçorinë tuaj | Moat: IGH-integrimi, marrëdhëniet lokale, suporti personal (edhe shqip) |

**Kill-criteria të ndershme** (që të mos zvarriteni vite në diçka të vdekur):
nëse pas 9 muajsh nga nisja e shitjes keni < 10 klientë me pagesë dhe churn > 5%/muaj — ndaluni,
analizoni, ose ndryshoni drejtim. Vendoseni këtë prag që tani, sa jeni objektiv.

---

## Hapat tuaj konkretë për 30 ditët e para

1. **Java 1:** Zgjidhni zanatin (Maler apo Sanitär) sipas rrjetit tuaj personal. Listoni 20 firma që mund t'i kontaktoni.
2. **Java 1–2:** Regjistrohuni për demo/trial te Baunex, Finito Pro dhe Bexio — mësojini përmendsh. Shënoni çdo dobësi.
3. **Java 2–4:** Kryeni 15 intervistat. Dokumentojini në këtë repo (`validim/`).
4. **Java 4:** Vlerësoni kriteret Go/No-Go të Fazës 0. Vetëm pastaj vendosni për arkitekturën.

---

*Burimet kryesore: baunex.ch, finitopro.ch, igh.ch, dataselect.ch, github.com/schoero/swissqrbill,
pypi.org/project/qrbill — hulumtuar korrik 2026.*
