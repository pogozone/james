# Scrum Board — James

## Board-Spalten (Workflow)
- Backlog
- Ready
- In Progress
- Review
- Done

## Epics
- E1: Datenmodell & Persistenz (MongoDB)
- E2: API/Backend (CRUD, Validierung)
- E3: UI Views (Form, Detail, Liste)
- E4: Listen-UX (Inline-Status, Sortierung, Wiedervorlage-Flow)
- E5: Kalenderansicht (Monat, Montag-first, Filter)
- E6: Export (Google Kalender Import)
- E7: Produkt-Polish (Favicon, Node-Version)

## Backlog (priorisiert)

### 1) [E1/E2] MongoDB-Anbindung: Connection + Konfiguration
- Ziel: Persistenz läuft über MongoDB (kein localStorage, kein todo.json).
- Akzeptanzkriterien:
  - App/Server kann sich gegen MongoDB verbinden
  - Connection-String kommt aus Env (kein Hardcoding)
  - Fehlerfälle sind sauber behandelt (z.B. DB nicht erreichbar)

### 2) [E1] Todo-Schema (MongoDB) festlegen
- Felder:
  - `title` (string, required)
  - `description` (string, optional)
  - `dueDate` (date, required)
  - `priority` (enum: `Super wichtig`, `Bald erledigen`, `Hat Zeit`)
  - `status` (enum: `Neu`, `In Bearbeitung`, `Erledigt`, `Wiedervorlage`, `Unerledigt geschlossen`)
- Regeln:
  - `Wiedervorlage` wird fachlich wie `Neu` behandelt (insb. Sortierung & Kalenderfilter)

### 3) [E2] API: CRUD-Endpunkte für Todos
- Akzeptanzkriterien:
  - Create Todo
  - Read all Todos
  - Read single Todo
  - Update Todo
  - Delete Todo
  - Response-Formate sind konsistent (inkl. `id`)

### 4) [E2] Validierung & Fehlerhandling (API)
- Akzeptanzkriterien:
  - Ungültige Payloads liefern klare Fehler (HTTP Status + Message)
  - Pflichtfelder werden geprüft
  - Enums werden geprüft

### 5) [E3] UI: Eingabe- und Bearbeitungsmaske
- Akzeptanzkriterien:
  - Titel Pflichtfeld
  - Beschreibung optional
  - Datum via Datepicker
  - Priorität/Status via Select
  - Speichern triggert Create/Update via API

### 6) [E3] UI: Listenansicht (Basis)
- Akzeptanzkriterien:
  - Todos werden aus API geladen
  - Standard-Operationen erreichbar (Edit/Delete/Details)

### 7) [E4] Inline-Statusänderung in der Liste
- Akzeptanzkriterien:
  - Status ist in der Liste als Select änderbar
  - Select steht links neben den Icons
  - Änderung wird sofort persistiert (API Update)

### 8) [E4] Wiedervorlage-Flow
- Akzeptanzkriterien:
  - Wenn Status in der Liste auf `Wiedervorlage` gesetzt wird:
    - UI springt in den Bearbeiten-Modus
    - Datepicker öffnet sich automatisch

### 9) [E4] Sortierung der Liste
- Sortierung:
  1. Status (Reihenfolge): `Neu` + `Wiedervorlage`, `In Bearbeitung`, `Erledigt`, `Unerledigt geschlossen`
  2. Datum
  3. Priorität (Reihenfolge muss fest definiert sein)
- Akzeptanzkriterien:
  - `Wiedervorlage` wird für Sortierung wie `Neu` behandelt

### 10) [E5] Kalenderansicht: Monatsübersicht + Umschalten
- Akzeptanzkriterien:
  - Umschaltbar zwischen Liste und Kalender
  - Monatsgrid

### 11) [E5] Kalender: Montag als erster Wochentag
- Akzeptanzkriterien:
  - Wochen starten Montag

### 12) [E5] Kalender: Filter nach Status
- Akzeptanzkriterien:
  - Kalender zeigt nur Todos mit Status `Neu`, `In Bearbeitung`, `Wiedervorlage`

### 13) [E7] Favicon integrieren
- Akzeptanzkriterien:
  - Favicon wird im Tab angezeigt

### 14) [E6] Export: Google Kalender Import
- Akzeptanzkriterien:
  - Pro Todo gibt es einen Download-Button
  - Export ist importierbar (i.d.R. `.ics`)

### 15) [E7] Node-Version fixieren
- Akzeptanzkriterien:
  - Projekt ist kompatibel mit Node `v16.20.2`
  - Dokumentiert/konfiguriert (z.B. engines / nvm)

## Sprint-Vorschlag

### Sprint 1 (End-to-End lauffähig mit MongoDB)
- 1) MongoDB-Anbindung
- 2) Todo-Schema
- 3) CRUD API
- 5) Form (Create/Update)
- 6) Liste (Read)

### Sprint 2 (Produktivität & Views)
- 7) Inline-Status
- 8) Wiedervorlage-Flow
- 9) Sortierung
- 10-12) Kalenderansicht komplett
- 13) Favicon
- 14) Export
- 15) Node-Version fixieren
