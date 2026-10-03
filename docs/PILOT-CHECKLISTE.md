# Pilot-Checkliste — Handwerk by TIFF

Stand: 2026-10-03. Ziel: ein Haustechnik-Betrieb arbeitet produktiv mit der App, ohne dass TIFF jeden Tag eingreifen muss.
Abhaken mit `[x]`. Technische Schritte im Detail: [DEPLOY-INFOMANIAK.md](DEPLOY-INFOMANIAK.md).

---

## 0. Vorab entscheiden (nur TIFF)

- [ ] **Support-Kontakt festlegen.** Die App zeigt aktuell Platzhalter (`support@tiff-software.ch`, `+41 00 000 00 00`).
      Echte Werte in `.env.prod` bei `TIFF_SUPPORT_EMAIL` / `TIFF_SUPPORT_TELEFON` eintragen.
- [ ] **Pilotbetrieb und Umfang festlegen:** Welcher Betrieb, wie viele Benutzer (Büro/Monteure), ab welchem Datum, wie lange (z. B. 3 Monate kostenlos)?
- [ ] **Vertragliches:** Pilotvereinbarung, Datenschutz (siehe Abschnitt 5), Support-Zeiten, was nach dem Pilot passiert.
- [ ] **Wer ist bei TIFF der Ansprechpartner** für Fehler (Telefon, Reaktionszeit)? Wer vertritt bei Abwesenheit?

## 1. Server und Betrieb (einmalig, ca. 1–2 Stunden)

- [ ] VPS bei Infomaniak bestellt (Ubuntu 24.04, Schweiz), IP notiert.
- [ ] Domain / A-Record gesetzt (z. B. `app.tiff-software.ch`), DNS ist erreichbar.
- [ ] Docker installiert, Repo auf dem Server (`/opt/Handwerk`), richtigen Branch ausgecheckt.
- [ ] `.env.prod` ausgefüllt (nie in Git):
  - [ ] `DOMAIN`, `DB_PASSWORT` (stark, zufällig)
  - [ ] `APP_URL=https://<domain>` (**Pflicht**, sonst gibt es keine Passwort-Reset-Links)
  - [ ] `TIFF_ADMIN_EMAILS=<ihre E-Mail>`
  - [ ] `REGISTRIERUNG` **leer** lassen (öffentliche Registrierung geschlossen)
  - [ ] `TIFF_SUPPORT_EMAIL`, `TIFF_SUPPORT_TELEFON`
  - [ ] SMTP-Daten (siehe Abschnitt 2)
- [ ] Gestartet: `docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build`
- [ ] Alle drei Container laufen (`ps`), `app` ist **healthy**.
- [ ] `https://<domain>/api/health` zeigt `{"ok":true}`, Zertifikat gültig (Schloss im Browser).
- [ ] **Erstes Admin-Konto angelegt** (Registrierung ist zu):
      `docker compose -f docker-compose.prod.yml --env-file .env.prod exec app npm run admin:anlegen -- "TIFF Software Solutions" "Ihr Name" ihre@mail.ch`
      Start-Passwort notieren, beim ersten Login ändern.
- [ ] Mit diesem Konto angemeldet; unten im Menü erscheint «⚙ Kunden-Betriebe verwalten».
- [ ] Keine Demo-Daten im Produktivsystem (`chef@demo.ch` / `demo1234` existiert dort **nicht**; es wird nie `prisma db seed` ausgeführt).
- [ ] Firewall: `ufw` offen nur für SSH, 80, 443; `fail2ban` installiert.
- [ ] **Backup:** Cron-Job für `scripts/backup.sh` eingerichtet (nachts) **und Restore einmal getestet** (auf einer Kopie, nicht auf dem Live-System).
- [ ] **Backups ausserhalb des Servers** (Swiss Backup von Infomaniak oder regelmässiger Download). Ein Backup auf demselben Server schützt nicht vor Serverausfall.
- [ ] Monitoring: `https://<domain>/api/health` in einen Uptime-Dienst eintragen (z. B. UptimeRobot, Benachrichtigung per E-Mail/SMS).
- [ ] Speicherplatz im Blick: Fotos und Unterschriften liegen in der Datenbank — Plattenplatz und Backup-Grösse nach 2 Wochen prüfen.

## 2. E-Mail (SMTP)

Ohne SMTP wird **keine** E-Mail versendet (weder Offerten/Rechnungen/Mahnungen noch Passwort-Reset).

- [ ] Absenderadresse bei Infomaniak angelegt (z. B. `noreply@tiff-software.ch`).
- [ ] SPF/DKIM für die Domain eingerichtet (sonst landen Mails im Spam).
- [ ] `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` in `.env.prod`, App neu gestartet.
- [ ] **Test:** «Passwort vergessen» mit einer eigenen Adresse — Mail kommt an (Posteingang, nicht Spam), Link funktioniert.
- [ ] **Test:** Rechnung per E-Mail an eine eigene Adresse senden — PDF mit QR-Zahlteil ist angehängt.

## 3. Betrieb des Piloten einrichten (pro Kunde, ca. 1–2 Stunden)

Als TIFF-Admin unter «Kunden-Betriebe verwalten» anlegen; der Chef bekommt Zugangsdaten und muss beim ersten Login das Passwort ändern.

**Firmendaten** (Einstellungen)
- [ ] Firmenname, Adresse, Telefon, E-Mail, MwSt-Nr.
- [ ] **IBAN** (CH/LI) und Bank — ohne gültige IBAN lässt sich keine QR-Rechnung erstellen.
- [ ] Logo (PNG/JPEG, max. 500 KB) und Dokumentfarben.
- [ ] Zahlungsfrist (Standard 30 Tage), Mahnfristen (Standard 14 / 10 / 7 Tage).
- [ ] Kopf-/Fusstexte für Rechnung und Offerte, Mailvorlagen prüfen und anpassen.

**Nummernkreise** (wichtig, wenn der Betrieb schon Rechnungen hat)
- [ ] Format und **nächste Nummer** so setzen, dass sie an das bisherige System anschliessen (keine doppelten Rechnungsnummern!).
- [ ] Entscheiden: Nummer pro Jahr neu beginnen ja/nein.

**Benutzer & Rechte**
- [ ] Büro-Benutzer und Monteure angelegt, Rollen geprüft (Chef alles; Büro ohne Benutzerverwaltung; Monteur nur Kontakte/Aufträge/Projekte-Zeiten).
- [ ] Jeder Benutzer hat das Start-Passwort geändert.
- [ ] Stundensätze pro Mitarbeiter eingetragen (für Zeiterfassung → Rechnung).

**Stammdaten übernehmen**
- [ ] Kontakte per CSV importiert (Spalten: Name/Firma, Strasse, PLZ, Ort, Telefon, E-Mail, Kategorie), Stichprobe geprüft.
- [ ] Lieferanten angelegt, **Konditionen (Rabatte)** pro Rabattgruppe erfasst.
- [ ] Artikel per CSV vom Lieferanten importiert; Zuschläge/Verkaufspreise für die wichtigsten Artikel und Stundensätze als Dienstleistungen geprüft.
- [ ] Objekte/Anlagen der wichtigsten Kunden erfasst; Wartungsverträge samt Intervall, Preis, nächstem Termin eingetragen.
- [ ] Offene Rechnungen aus dem Altsystem: festlegen, wie sie geführt werden (z. B. weiter im Altsystem bis bezahlt, nur neue Rechnungen in der App).

## 4. Abnahmetest mit dem Betrieb (Szenarien durchspielen)

Mit echten (oder realistischen) Daten, am besten gemeinsam vor Ort. Jedes Szenario einmal komplett.

- [ ] **Monteur am Handy:** Auftrag öffnen, Material und Arbeitszeit erfassen, Foto machen, Kundenunterschrift, Auftrag abschliessen. Funktioniert auch im Keller mit schwachem Netz (Offline-Hinweis, spätere Synchronisation)?
- [ ] **App auf dem Handy installieren** («Zum Startbildschirm hinzufügen») und danach benutzen.
- [ ] **Büro:** Offerte erstellen → als PDF/E-Mail senden → annehmen → in Auftrag umwandeln.
- [ ] **Rechnung:** aus dem Auftrag erstellen, PDF öffnen, **QR-Zahlteil mit der Banking-App scannen** (Betrag, IBAN, Empfänger stimmen?). Rechnung als versendet markieren.
- [ ] **Teilrechnung (Akonto)** und Schlussrechnung mit Abzug an einem Beispielauftrag.
- [ ] **Zahlung erfassen/importieren:** Eingang in Höhe einer Rechnung markiert diese als bezahlt.
- [ ] **Mahnwesen:** überfällige Testrechnung → Mahnlauf → Mahn-PDF prüfen.
- [ ] **Gutschrift** zu einer Rechnung erstellen.
- [ ] **Zeiterfassung:** Zeiten erfassen → im Auftrag in den Rapport übernehmen → in Rechnung.
- [ ] **Wartung:** fälliger Vertrag → Auftrag; Rechnungslauf für Pauschalverträge.
- [ ] **Ausgaben/Bestellungen/Posteingang:** je ein Beispiel; Lieferantenrechnung als Ausgabe erfassen.
- [ ] **Export:** Rechnungen als CSV in Excel öffnen (Umlaute, Beträge, Datum korrekt).
- [ ] **Rechte:** als Monteur anmelden — sieht er nur seine Bereiche? Keine Rechnungen/Preise?
- [ ] **Mehrere Benutzer gleichzeitig** (Büro + 2 Monteure) arbeiten ohne Probleme.
- [ ] Dokumente vom Steuerberater/Treuhänder prüfen lassen (MwSt-Ausweis, QR-Rechnung, Pflichtangaben auf Rechnung).

## 5. Recht, Datenschutz, Buchhaltung

- [ ] **Datenschutz (nDSG):** Datenschutzerklärung für die App, Auftragsverarbeitungsvertrag (AVV) zwischen Pilotbetrieb und TIFF. Daten liegen in der Schweiz (Infomaniak) — das so in den Unterlagen festhalten.
- [ ] **Aufbewahrung:** Geschäftsunterlagen müssen 10 Jahre aufbewahrt werden. Die App hat **kein GeBüV-zertifiziertes Archiv**; Backups und regelmässige PDF-/CSV-Exporte sind dafür kein vollwertiger Ersatz. Mit dem Treuhänder klären, ob Rechnungs-PDFs zusätzlich archiviert werden.
- [ ] **Buchhaltung:** Die App führt **keine Finanzbuchhaltung** (nur Übersicht). Klären, wie der Treuhänder die Daten bekommt (CSV-Export, Seite «Export») und wer die MwSt-Abrechnung macht.
- [ ] **MwSt:** In Rechnungen und Offerten gilt aktuell **fest 8.1 %**. Betriebe mit anderen Sätzen oder Saldosteuersatz sind (noch) nicht abgedeckt — beim Piloten prüfen.
- [ ] **Haftungsausschluss/Pilotstatus** schriftlich: Die App ist im Pilot, keine Garantie auf Fehlerfreiheit; der Betrieb prüft Rechnungen vor dem Versand.

## 6. Bekannte Einschränkungen (dem Piloten offen sagen)

| Thema | Stand |
|---|---|
| Währung | nur CHF |
| MwSt | nur 8.1 % in Rechnung/Offerte |
| Sprache | nur Deutsch (Oberfläche und Dokumente) |
| Lager / Lagerbestände | nicht vorhanden |
| Banking | manuell oder CSV-Import, kein Bank-Direktabgleich, kein ISO-20022-Zahlungsauftrag |
| Buchhaltung | nur Auswertung, keine Buchungen/Kontenplan |
| E-Mail | nur mit konfiguriertem SMTP; Zustellbarkeit hängt von SPF/DKIM ab |
| Archiv | kein GeBüV-zertifiziertes Archiv |
| Anmeldung | Passwort mit Sperre; **keine Zwei-Faktor-Authentifizierung** |
| Dokumenten-Designer | Logo, Farben, Kopf-/Fusstext — kein freier Layout-Editor |
| Offline | Ansehen bereits besuchter Seiten und Foto-/Unterschrift-Erfassung; keine freie Bearbeitung ohne Netz |

## 7. Betrieb im Pilot

- [ ] **Updates:** `git pull` + `docker compose … up -d --build` (Migrationen laufen automatisch). Vorher Backup auslösen. Updates ausserhalb der Arbeitszeit (nicht 7–17 Uhr).
- [ ] **Fehler melden:** einen festen Kanal vereinbaren (E-Mail/Telefon). Pro Meldung notieren: Datum, Benutzer, Seite, was passiert ist, Screenshot.
- [ ] **Wöchentlich (erste 4 Wochen):** kurzes Gespräch mit dem Betrieb — was nervt, was fehlt? Liste führen (am besten direkt als Aufgaben).
- [ ] **Monatlich:** Restore-Test, `docker system prune`, Plattenplatz, Updates des Servers (`apt upgrade`).
- [ ] Zwischen den Rechnungen im Pilot und der Buchhaltung des Betriebs **stichprobenartig abgleichen** (Summen stimmen?).

## 8. Go / No-Go am Starttag

**Go**, wenn alles erfüllt ist:
- [ ] Abschnitt 1 komplett (insbesondere HTTPS, Health-Check, Backup + Restore-Test, Admin-Konto).
- [ ] SMTP-Test erfolgreich (oder bewusst verzichtet und dem Betrieb gesagt).
- [ ] Abnahmetest (Abschnitt 4): QR-Rechnung per Banking-App geprüft, Monteur-Ablauf am Handy erfolgreich, Rechte geprüft.
- [ ] Nummernkreise passen zu bisherigen Nummern.
- [ ] Support-Kontakt echt und der Betrieb kennt ihn.

**No-Go**, wenn: QR-Rechnung nicht scanbar/falsche Beträge, Backup nicht wiederherstellbar, Rechte nicht korrekt, oder der Steuerberater beanstandet Pflichtangaben auf der Rechnung.

**Rollback:** Das Altsystem des Betriebs bleibt in den ersten 4 Wochen parallel nutzbar. Bei schwerem Fehler: App-Zugang sperren (`docker compose … stop app`), Betrieb arbeitet im Altsystem weiter, Fehler beheben, Backup einspielen falls Daten betroffen.

## 9. Offene Punkte aus der Entwicklung (für TIFF)

- Support-Kontakt (Abschnitt 0) — **echte Daten fehlen**.
- Ob der Pilot das nächste grosse Paket braucht (Lager, Mehrwährung, Mehrsprachigkeit, Buchhaltungsschnittstelle) — erst nach den ersten zwei Wochen Pilotbetrieb entscheiden, nach realen Rückmeldungen.
- Dokumenten-Editor (Offerte/Rechnung) von bexio wurde nicht detailliert geprüft — falls der Pilotbetrieb bexio-Vorlagen kennt, Layoutwünsche früh sammeln.
- Nach dem Pilot: Zwei-Faktor-Anmeldung und ein GeBüV-konformes Archiv prüfen.
