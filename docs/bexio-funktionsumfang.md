# bexio – Funktionsumfang (Funktionsinventar)

- **Datum:** 2026-10-02
- **Quelle:** Live-Ansicht eines bexio-Testmandanten (Firma «frigemo AG», 30-Tage-Test, nur lesend; nichts erstellt/gespeichert) auf office.bexio.com.
- **Hinweis:** Funktionsinventar, **kein Design-Klon**. Beschrieben werden Funktionen, Felder, Status, Workflows – keine Texte/Branding/Designs 1:1.
- **Einschränkung:** Der Testmandant ist fast leer (1 Kontakt «bexio AG», keine Dokumente). Dokument-Editoren (Angebot/Rechnung) starten mit einem Assistenten, der beim «Weiter» einen Entwurf anlegen würde → dort nicht weitergeklickt; Editor-Inhalt ist daher teils aus Allgemeinwissen/Menüstruktur ergänzt und als «(nicht verifiziert)» markiert.

## 0. Navigationsstruktur (Hauptmenü, verifiziert)

| Menü | Unterpunkte |
|---|---|
| Dashboard | Widgets, «Dashboard bearbeiten» |
| Kontakte | Liste, Neuer Kontakt |
| Verkauf | Angebote, Aufträge, Rechnungen, Gutschriften, Analyse, Weitere (Optionen) |
| Ausgaben | Bestellungen, Lieferantenrechnungen, Lieferantengutschriften, Aufwendungen |
| Projekte | Projekte, Zeiten |
| Produkte | Produkte, Eingänge/Ausgänge, Lagerbestände |
| Banking | Bankkonten |
| Buchhaltung | im Test nur «Buchhaltung einrichten» (Onboarding) sichtbar |
| Posteingang | Belegeingang |
| Mehr | Apps, Aufgaben, Posteingang (jeweils «in Navigation verankern» möglich) |
| Löhne | externe App (payroll.bexio.com), eigener Login-Handshake |
| Topbar | Firmenwechsler (Firma wechseln / verwalten / neu erstellen), Suche (Ctrl+K), Hilfe, Einstellungen (Zahnrad), Marketplace, Benutzermenü (Profil bearbeiten, Logout), App-Switcher |
| Sonstiges | Banner «Jetzt bestellen» (Paketwahl, nicht angeklickt), Chat-Support, Button «Erste Schritte» |

Listen-Konvention (alle Verkaufslisten): Reiter-Statusfilter + «Eigene Filter» (gespeicherte Filter) + «Filtern»; Bulk-Aktion per Dropdown «Wählen Sie eine Aktion aus» → Multi-PDF (mit/ohne Logopapier), Excel-Export → «GO». Leere Liste zeigt Hinweis mit Direktlink zum Erstellen.

---

## 1. Dashboard

- **Zweck:** Überblick über Firma, konfigurierbar.
- **Widgets (verifiziert):** «Erste Schritte» (Kontakt erstellen, Produkt/Dienstleistung, Angebot/Rechnung, Projekt, Zeiterfassung), «Schnelleinstellungen» (Firmenprofil & Logo, Druck-Layout, Datenimport), «Brauchen Sie Hilfe?» (Support, Webinar, Fernwartung), **Liquidität** (Flüssige Mittel Ein-/Ausgänge als Säulendiagramm je Monat, Summen Einnahmen/Ausgaben, Zeitraum-Picker: letzte 12/6 Monate, Geschäftsjahr, eigener Von/Bis), **Offene Rechnungen (Debitoren)** (offen vs. überfällig, Total), **Offene Lieferantenrechnungen (Kreditoren)** (offen vs. überfällig).
- **Dashboard bearbeiten:** Widgets per Checkbox sichtbar/unsichtbar, «Widgets hinzufügen», «Fertig». Mit Beispieldaten-Kennzeichnung bei leerem Mandanten.
- **Besonderheiten:** Demodaten werden gekennzeichnet, solange keine echten Daten existieren.
- **Relevanz SHK: mittel.** Offene Posten/Überfällige = hoch nützlich; Rest niedrig.

---

## 2. Kontakte

- **Zweck:** Zentrale Adressverwaltung (Kunden, Lieferanten, Privat/Firma).
- **Liste:** Spalten Typ, Name, PLZ, Ort, Land, E-Mail, Telefon; Spaltenwähler («Spalten»); Spaltenfilter direkt unter Kopfzeile (Typ-Dropdown, Textfelder); Suchfeld; Reiter «Alle» / «Archiviert»; Sortierung (Name); Zeilen-Aktionsmenü; Favoriten-Stern. Bulk: Auswahl-Checkboxen, Filter löschen.
- **Listen-Menü (⋮):** «Kontakte importieren» (CSV/Excel-Import), «Adressen aufteilen» (Assistent: Adresse → Strasse + Haus-Nr., wegen strukturierter Adressen seit 21.11.2025 für Bankzahlungen/QR; nicht ausgeführt).
- **Formular «Neuer Kontakt» (verifiziert):**
  - Stammdaten: Import von Search.ch (Adresssuche/Verzeichnis-Import), Kontakt-Nr. (automatisch hochgezählt), Typ Firma/Privat, Firma (Pflicht) bzw. Name/Vorname bei Privat, Firmennamen-Zusatz, Strasse, Haus-Nr., Adresszusatz, PLZ, Ort, Land (Default Schweiz).
  - Kommunikation: E-Mail, E-Mail 2, Telefon, Telefon 2, Mobile, Fax, Website, Skype.
  - Zusatzinformationen: Ansprechpartner (intern, Pflicht), Besitzer (Pflicht), Korrespondenzweg (Mail/Post, Pflicht), Sprache, Bemerkungen, Kategorie (Kontaktkategorien), Branche, Rabatt.
  - Weitere Kontaktinformationen: Anzahl Mitarbeitende, Handelsregister-Nr., MWST-Nr., UID.
  - Buttons: Speichern, Abbrechen.
- **Besonderheiten:** Detailansicht (nicht geöffnet, kein echter Kontakt ausser bexio AG) hat laut Aufbau Reiter u.a. Finanzen (Kontoauszug), Kontaktpersonen, Dokumente (nicht verifiziert). Kontaktkategorien und Geschäftstätigkeiten in Einstellungen.
- **Relevanz SHK: hoch** (Kunden, Objekt-/Rechnungsadresse, Kontaktpersonen/Hausverwaltungen, Kategorien). Priorität hoch.

---

## 3. Verkauf

### 3.1 Angebote
- Listenreiter: Alle, Entwürfe, Offen, Bestätigt, Abgelehnt, Eigene Filter. Bulk: Multi-PDF (mit/ohne Logopapier), Excel-Export.
- **Status-Lebenszyklus:** Entwurf → Offen (versendet/ausgestellt) → Bestätigt / Abgelehnt. Aus Angebot → Auftrag oder Rechnung überführen.

### 3.2 Aufträge
- Reiter: Alle, Offen, Teilweise, Erledigt. Aus Auftrag: Lieferschein, (Teil-)Rechnung, wiederkehrende Verrechnung. Hinweis auf der Seite: Auftrag erfassen oder aus Angebot überführen.

### 3.3 Rechnungen
- Reiter: Übersicht, Alle, Entwürfe, Offen, Teilweise, Bezahlt, Überfällig.
- **Neu-Assistent (verifiziert):** Schritt 1 Pflicht: Kontakt, Kontaktperson, Projekt (optional), Titel, Datum, Währung (CHF, EUR, USD, GBP, BRL, JPY, CNY) → «Weiter» (legt Entwurf an; nicht ausgeführt).
- Hinweis-Banner: MWST-Grundeinstellungen vorab prüfen; nach erster Buchung nicht mehr änderbar.

### 3.4 Gutschriften
- Reiter: Alle, Entwürfe, Offen, Teilweise, Abgerechnet. Erstellung automatisiert aus vorhandener Rechnung möglich; Verrechnung mit offenen Rechnungen.

### 3.5 Analyse
- Verkaufsanalyse: Zeitraum wählen, Excel-Download der Positionsdaten von Rechnungen, Aufträgen, Angeboten inkl. vorbereiteter Pivot-Tabellen.

### 3.6 Weitere (Optionen-Übersicht, verifiziert)
| Funktion | Inhalt |
|---|---|
| Lieferungen (Lieferscheine) | Liste Alle/Eigene Filter, Multi-PDF; Entstehen aus Aufträgen |
| Kontoauszüge | Kundenkonto-Auszüge, erzeugt aus Kontakt → Reiter «Finanzen» |
| Zahlungen erfassen (manuell) | Assistent: Betrag, Währung, Belegtext, Buchungsdatum, Suche nach Rechnungsnr./Kontakt → Ausziffern (Auszifferungsbetrag), Buchungsstapel → «Buchen»; Verrechnung Gutschrift/offene Rechnung |
| Wiederkehrende Rechnungen | «Neuer Lauf»: erzeugt Rechnungen aus Aufträgen mit wiederkehrender Verrechnung nach Fälligkeit; Lauf-Journal |
| Mahnläufe | «Neuer Mahnlauf»: überfällige Rechnungen in nächste Mahnstufe; Journal der Läufe; auch einzeln mahnen |
| Rechnungen mit Kundenguthaben | Rechnungen, auf die offene Gutschriften/Guthaben angewendet werden können |
| Daten exportieren | Export-Assistent: Zeitraum Von/Bis, Format xls / xlsx / csv; nächster Schritt Auswahl Angebote/Aufträge/Lieferungen/Rechnungen/Gutschriften/Zahlungseingänge |

- **Dokument-Editor (nicht verifiziert, branchenüblich bei bexio):** Positionstypen Artikel/Dienstleistung, Freitext, Zwischentotal, Rabatt, Seitenumbruch, Titel; MwSt pro Position; Konditionen (Zahlungsfrist, Skonto), Kopf-/Fusstext, Vorlagen; Versand per E-Mail/PDF/Post, QR-Rechnung, Mahnstufen. → Im Folgenden ggf. ergänzt.
- **Relevanz SHK: hoch** (Offerte → Auftrag → Teil-/Schlussrechnung, Gutschrift, Mahnwesen, Wiederkehrende Rechnungen für Wartungsverträge, Lieferschein). Priorität hoch.


---

## 4. Ausgaben

- **Zweck:** Einkauf/Kreditoren: Bestellungen, Lieferantenrechnungen, -gutschriften, Spesen/Aufwendungen.
- **Bestellungen:** Reiter Alle + Eigene Filter; Bulk Multi-PDF, Excel-Export. Liefereingang zu Einkaufsbestellung bucht Lager automatisch.
- **Lieferantenrechnungen (Spalten):** Buchungsdatum, Lieferant, Fälligkeit, Nr., Referenz, Titel, Status, Währung, Brutto; Spaltenwähler. Reiter: Alle, Entwurf, ToDo, Bezahlt, Überfällig. Beleg-Verknüpfung (Posteingang) sichtbar.
- **Lieferantengutschriften:** Spalten Datum, Lieferant, Nr., Referenz, Titel, Status, Währung, Brutto, Verfügbar.
- **Aufwendungen (Spesen):** Spalten Nr., Datum, Bezahlt am, Titel/Buchungstext, Status (Entwurf/erledigt), Währung, Brutto.
- **Formulare:** «Neue Lieferantenrechnung» / «Neuer Aufwand» liessen sich im Test **nicht öffnen** («Zugriff verweigert», vermutlich Buchhaltung noch nicht eingerichtet bzw. Rechte/Paket) → Felder nicht verifiziert.
- **Einstellungen:** Dokumententyp-Defaults für Bestellung, Lieferantenrechnung, Aufwendung, Lieferantengutschrift (Kopf-/Fusstext, Nummernkreis, Formate, Konditionen).
- **Relevanz SHK: hoch** (Lieferantenrechnungen Grosshandel, Bestellungen an Lieferanten, Material-Zuordnung zu Projekt). Priorität hoch (Bestellung + Lieferantenrechnung), Aufwendungen mittel.

---

## 5. Projekte

- **Liste:** Reiter Alle, Offen, Aktiv, Archiviert, Meine, Eigene Filter; Bulk: Projekte löschen, Excel-Export.
- **Formular (verifiziert):** Projektstatus (Offen/Aktiv/Archiviert), **Substatus** (frei definierbar; Standard: 10 Akquirierung, 20 Offertphase, 25 Projekt verloren, 30 Projektvorbereitung, 40 Projekt in Arbeit, 50 Endphase, 60 Dokumentation, 70 Projektabgabe, 80 Nachbearbeitung, 90 Ablage), Projekttyp (Internes Projekt / Kundenprojekt), Name, Kontakt, Kontaktperson, Start, Ende, Ansprechpartner (intern), Beschreibung.
- **Einstellungen:** Substatus, Dokumenten-Nummernkreis/-format, **Stundensätze pro Benutzer**.
- **Besonderheiten:** Projekt verknüpft Angebote/Aufträge/Rechnungen/Zeiten/Lieferantenrechnungen; Arbeitspakete (siehe Zeiterfassung) gliedern das Projekt.
- **Relevanz SHK: hoch** (Baustelle/Objekt = Projekt, Phasen, Nachkalkulation). Priorität hoch.

---

## 6. Zeiterfassung (Projekte → Zeiten)

- **Liste:** Reiter Alle, Heute, Aktuelle Woche, Aktueller Monat, Meine, Eigene Filter; Bulk: Einträge löschen, Excel-Export, **«Status & Verrechenbarkeit ändern»**.
- **Formular (verifiziert):** Tätigkeit (Geschäftstätigkeiten, Default: Administration, Allgemein, Meeting, Projekt Management, Umsetzung), Ansprechpartner (Mitarbeiter), Status (Offen, In Arbeit, Erledigt, Fakturiert, Geschlossen), Dauer als Von/Bis, **Stoppuhr** oder Dauer HH:MM, Datum, Bemerkungen, «Eintrag ist abrechenbar» + Betrag, Verknüpfung: Kontakt, Kontaktperson, Projekt, Arbeitspaket.
- **Workflow:** erfassen → abrechenbar → in Rechnung übernehmen → Status Fakturiert.
- **Export:** Zeiterfassungseinträge als CSV (Einstellungen → Export).
- **Relevanz SHK: hoch** (Regiearbeiten/Stunden pro Monteur → Rechnung). Priorität hoch.

---

## 7. Produkte

- **Produkte (Liste):** Reiter Alle + Eigene Filter; Bulk: Löschen, **Mehrfach-Editieren**, Excel-Export; Import aus externen Quellen.
- **Formular (verifiziert):** Produktart (Ware / Dienstleistung), Produktcode, Produktname, Ansprechpartner, Gruppe (+Untergruppen), Beschreibung; Preise: Einkaufspreis, Zuschlag %, Verkaufspreis, Profitmarge %, Währung; Ertragskonto (z.B. 3200 Handelserlös), Aufwandkonto (z.B. 4200 Einkauf Handelsware), Einheit (Stk, h, frei definierbar), MwSt Umsatzsteuer (Codes UN81 8.1%, UR26 2.6%, UEX u.a.) und MwSt Vorsteuer (V00, VM81, VM26, VB81, Import/Zoll); Lieferantendaten: Lieferant, Produktname/-code/-beschreibung Lieferant; Bemerkungen. Bei Ware zusätzlich Lagerverwaltung (Lagerort/-platz; Details nicht verifiziert).
- **Eingänge/Ausgänge:** Lagerbewegungen, «Neue Buchung» (manueller Liefereingang/Lagerausgang); automatisch aus Lieferungen (Ausgang) und Bestellungen (Eingang). Excel-Export.
- **Lagerbestände:** nur Produkte mit Lagerverwaltung; Mengen automatisch aktualisiert.
- **Einstellungen:** Produkteinheiten, Produktgruppen, Lagerorte, Lagerplätze, Rabatte.
- **Preislisten:** keine eigene Preislisten-Seite im Menü gefunden (nur Preis pro Produkt, Rabatte als Stammdaten).
- **Relevanz SHK: hoch** (Artikelstamm mit EK/VK/Marge, Lieferantenartikelnummer, Dienstleistungen/Stundensätze; Lager mittel). Priorität hoch (Artikel), mittel (Lager).

---

## 8. Banking

- **Seite:** Liste von Bankkonten (im Test «Muster Bank» mit Status «Kontodaten vervollständigen»; Konto kann auch als **Kasse** gesetzt werden). Aktionen: «Bankkonto hinzufügen», Konto bearbeiten (⋮).
- **Funktionen (Detail ohne vollständiges Konto nicht verifiziert):** Kontoauszug-Import/Bankanbindung, Zuordnung/Abstimmung von Transaktionen zu Rechnungen, Zahlungsaufträge (ISO 20022). IBAN/QR-IBAN in den Kontodaten wird für QR-Rechnung genutzt.
- **Relevanz SHK: mittel** (Zahlungsabgleich spart Zeit; für MVP manuelles Zahlungserfassen reicht). Priorität mittel.

---

## 9. Buchhaltung

- **Menü im Test:** nur «Buchhaltung einrichten» (Onboarding): Vorjahresdaten (Bilanz, Erfolgsrechnung, offene Posten) übernehmen, Treuhänder einladen. Weitere Punkte (Journal, Kontenblätter, Bilanz/Erfolgsrechnung, MWST-Abrechnung, Abschluss) erscheinen erst nach Einrichtung → **nicht gesehen / bis Einrichtung gesperrt**.
- **Einstellungen (verifiziert, Einstellungen → Buchhaltung):** Kontenplan Finanzbuchhaltung (Vorlage auf Basis Kontenrahmen KMU je Rechtsform, Sprache, Excel-Import); Mehrwertsteuer: Grundeinstellungen je Steuerperiode (MWST-pflichtig, MWST-Nr., Abrechnungsart vereinbartes/vereinnahmtes Entgelt, Methode effektiv/Saldosteuersatz, jährliche Abrechnung, Standard-MwSt-Sätze Umsatz/Vorsteuer), Steuersätze (Liste mit Code, Beschreibung, Satz, Typ, Ziffer, Konto, gültig von/bis, aktiv; «Neuer Steuersatz»), MWST-Standards für Dokumente, Geschäftsjahr (Beginn/Ende, alte Jahre). Hinweis: MwSt-Grundeinstellungen nach erster Buchung gesperrt.
- **Relevanz SHK: mittel/niedrig** (Schnittstelle/Export zur Treuhand wichtiger als eigene Buchhaltung). MwSt-Sätze und Kontierung pro Artikel: hoch; Buchhaltung selbst: niedrig.

---

## 10. Posteingang

- **Zweck:** Belegeingang: Upload per «Hochladen» oder Weiterleitung an eine firmeneigene Posteingangs-E-Mail-Adresse (Kürzel im Firmenprofil einstellbar).
- **Liste:** Reiter Im Posteingang / Im Archiv / Alle; Suche; Spalten Datum, Dateiname, Hochgeladen von, Status, Verwendet; rechts Vorschau (JPG, PNG, GIF, PDF).
- **Besonderheit:** Belege werden Lieferantenrechnungen/Aufwendungen zugeordnet.
- **Relevanz SHK: mittel** (Beleg-Upload/Foto vom Monteur → Lieferantenrechnung). Priorität mittel.

---

## 11. Mehr / Löhne / Aufgaben / Apps

- **Mehr:** Apps, Aufgaben, Posteingang (je «in Navigation verankern»).
- **Aufgaben:** Liste Alle/Offen/Erledigt/Eigene Filter; Bulk: löschen, als erledigt markieren, Excel-Export; Zuweisung an Mitarbeiter; Kategorien in Stammdaten. Priorität mittel.
- **Apps / Marketplace:** Verbundene Apps (Beispiel Webshop, gratis), Marketplace mit Partner-Apps (u.a. Zapier). Priorität niedrig.
- **Löhne:** separates Produkt (payroll.bexio.com, eigener Auth-Handshake, als Option buchbar; nicht geöffnet). Priorität niedrig.

---

## 12. Topbar / Einstellungen

- **Topbar:** Firmenwechsler (mehrere Firmen, «Meine Firma verwalten», «Neue Firma erstellen»), globale Suche (Ctrl+K), Hilfe & Support, Zahnrad Einstellungen, Marketplace, Benutzermenü (Profil bearbeiten, Logout), Hinweisbanner zur Testdauer.
- **Benutzerprofil:** Profil & Sprache, Sicherheit (Authentifizierungsmethoden), Passwort.
- **Einstellungen – Bereiche (verifiziert):**
  - **Meine Firma:** Firmenprofil (Firmenname, Rechtsform AG/GmbH/Einzelfirma/Personengesellschaft/Stiftung/Verein, Adresse, Land, Posteingangs-Mail + Kürzel, UID, Beschreibung u.a.), Grundeinstellungen, Logo; Dokumenten-Vorlagen (Dokumentendesigner: «Neue Vorlage»; Standardvorlage gilt für Angebot, Auftrag, Rechnung, Lieferung, Gutschrift, Kontoauszug, Bestellung; eigenes Briefpapier).
  - **Benutzer:** Benutzer verwalten (Rechte je Benutzer), Treuhänder einladen, Daten löschen und Test-Zugang kündigen (destruktiv, nicht ausgeführt).
  - **Stammdaten:** Geschäftstätigkeiten, Produkteinheiten, Rabatte; Kontakte: Kategorien, Branchen, Titel, Anreden; Aufgaben: Kategorien; Projekte: Substatus, Nummernkreis, Stundensätze pro Benutzer; Produkte: Lagerorte, Lagerplätze, Gruppen.
  - **Paket und Optionen:** Paketwahl/Optionen (z.B. Lohn); nicht angeklickt.
  - **Funktionen & Module:** Übersetzungen (Dokument-Überschriften), Zahlungsvorlagen (Standard «30 Tage»), Mahnstufen (Standard: Zahlungserinnerung 14 Tage, Mahnung 1 nach 10 Tagen, Mahnung 2 nach 7 Tagen; Texte pro Stufe), Zahlungsservices (Online-Zahlung in der Onlineansicht), Mailvorlagen (Rechnung, Angebot, Auftrag, je Mahnstufe; je 4 Sprachen DE/EN/FR/IT), E-Mail-Absender, Ansprechpartner ohne Login, Sprachformate, Länder, Währungen & Kurse (Basis CHF, Rundungsfaktor 0.05, CHF/EUR/USD/GBP/BRL/JPY/CNY, Kurs manuell), **Dokumententyp-Standards** je Typ (Angebot, Auftrag, Rechnung, Lieferung, Gutschrift, Kontoauszug, Bestellung, Lieferantenrechnung, Aufwendung, Lieferantengutschrift): Vorlage, Sprache, Bankkonto, Währung, Steuer bei Positionen anzeigen, Dezimalstellen Menge/Preis, Standard-Erfolgskonto, Standard-Zahlungskondition, automatische Nummerierung (Format, jährlich neu beginnen, Startnummer, Mindestlänge), Kopf-/Fusstext je Sprache.
  - **Sendezentrale:** Protokoll aller versendeten Dokumente (Versandart, Status).
  - **Dokumenten-Archiv:** GeBüV-zertifiziertes Archiv (separat einzurichten/optional).
  - **Buchhaltung:** siehe Abschnitt 9.
  - **Export:** Kontaktliste/Serienbrief (csv/xlsx), Ausgaben, Verkauf-Export-Assistent (xls/xlsx/csv), Lagerprodukte, Lagerbewegung, Aufgabenliste, Zeiterfassungseinträge; Empfehlung: «Aktuelle Liste exportieren» in jeder Liste. Datenimport: Kontakte, Produkte.
  - **Integrationen/API:** über Marketplace/«Verbundene Apps»; eine eigene API-/Token-Seite wurde in den Einstellungen nicht gefunden (nicht verifiziert).
- **Relevanz SHK: hoch** für Dokument-Standards (Nummernkreise, Konditionen, Kopf-/Fusstexte), Mahnstufen, Mailvorlagen, MwSt, Benutzerrechte, Vorlage/Logo. Priorität hoch.

---

## 13. Zusammenfassung: Relevanz und Priorität für SHK-Betriebe

| Bereich | Relevanz | Prio |
|---|---|---|
| Kontakte (Kategorien, Kontaktpersonen, Import) | Kunden/Hausverwaltungen/Lieferanten | hoch |
| Offerte → Auftrag → Rechnung (Teilrechnung, Gutschrift, Status) | Kerngeschäft | hoch |
| Mahnwesen (3 Stufen, Mahnlauf) | Debitorenmanagement | hoch |
| Wiederkehrende Rechnungen | Wartungsverträge | hoch |
| Lieferschein | Materiallieferung/Regie | mittel |
| Projekte (Substatus, Stundensätze) | Baustellen | hoch |
| Zeiterfassung (Stoppuhr, abrechenbar, Arbeitspakete) | Regie/Monteure | hoch |
| Produkte/Dienstleistungen (EK/VK/Marge, Lieferantenartikel) | Artikelstamm | hoch |
| Lager (Orte/Plätze) | Werkstattlager | mittel |
| Bestellungen / Lieferantenrechnungen | Einkauf | hoch |
| Aufwendungen | Spesen | mittel |
| Posteingang | Belegerfassung | mittel |
| Banking (Import, Abgleich, ISO 20022) | Zahlungsabgleich | mittel |
| Buchhaltung (Kontenplan, MwSt, Abschluss) | Treuhand-Schnittstelle | niedrig-mittel |
| Dokumentenvorlagen, Mailvorlagen, Sendezentrale | Professioneller Auftritt | mittel-hoch |
| Analyse/Excel-Exporte | Auswertung | mittel |
| Löhne, Marketplace/Apps, GeBüV-Archiv | extern/optional | niedrig |

## 14. Nicht erreichbar / nicht verifiziert

- Editor-Inhalte der Dokumente (Angebot/Auftrag/Rechnung/Gutschrift/Bestellung): Assistent legt beim «Weiter» einen Entwurf an → nicht fortgesetzt.
- Lieferantenrechnung/Aufwendung-Formulare: «Zugriff verweigert».
- Buchhaltung-Untermenüs (Journal, Berichte, MWST-Abrechnung, Abschluss): erst nach Einrichtung sichtbar.
- Banking-Import/Abgleich/Zahlungen: Konto unvollständig.
- Kontakt-Detailansicht (Kontaktpersonen, Gruppen), Benutzer-/Rechte-Matrix, Dokumentendesigner-Editor, Löhne: nicht geöffnet. Preislisten: nicht vorhanden.
- Hinweis: Der Assistent «Adressen aufteilen» wurde versehentlich geöffnet, aber nicht ausgeführt (nichts geändert).

---

## 15. Umsetzungsstand in der Handwerk-App (Stand 2026-10-03)

| Bereich | Status |
|---|---|
| Dashboard (Liquidität, Debitoren, Kreditoren), Betriebs-Umschalter, Support-Kontakt | umgesetzt |
| Kontakte (Typ, Kategorie, Kontaktpersonen, Archiv, CSV-Import) | umgesetzt |
| Offerte → Auftrag → Rechnung, Teilrechnung (Akonto) + Schlussrechnung | umgesetzt |
| Gutschriften, Fälligkeit/Überfällig, Mahnwesen (3 Stufen, Mahnlauf, PDF, Mail) | umgesetzt |
| Projekte (Substatus, Nachkalkulation), Zeiterfassung (Stoppuhr, Stundensätze, → Rapport) | umgesetzt |
| Produkte (EK/Zuschlag/VK/Marge, Ware/Dienstleistung, Gruppe, MwSt) | umgesetzt |
| Ausgaben, Bestellungen, Posteingang, Banking (Import + Abgleich), Buchhaltung (Übersicht) | umgesetzt (einfach) |
| Nummernkreise, Kopf-/Fusstexte, Mailvorlagen, Zahlungsfrist, Mahnfristen | umgesetzt |
| Benutzer & Rechte (Rollen, Bereichsrechte, Benutzerverwaltung) | umgesetzt |
| Lieferscheine | umgesetzt |
| Wiederkehrende Rechnungen als Lauf, Aufgaben, Analyse/Excel-Export | offen |
| Lager, Mehrwährung, Mehrsprachigkeit der Dokumente, Dokumentendesigner-Editor | offen |
| Buchhaltung im engeren Sinn (Kontenplan, Journal, MWST-Abrechnung), Löhne, Marketplace | offen / nicht geplant |
