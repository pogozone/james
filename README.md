# James – Todo & Scrum Anwendung

Eine vollständige Todo- und Scrum-Anwendung mit React, TypeScript und MongoDB.

[English version](README.en.md)

## Funktionen

### Aufgaben-Management
- **Titel**: Freitext-Eingabe (erforderlich)
- **Beschreibung**: Optionaler Freitext für zusätzliche Details
- **Fälligkeitsdatum**: HTML5 Date-Picker zur Auswahl des Datums
- **Punkte**: Story Points (1, 2, 3, 5, 8)
- **Priorität**: Super wichtig, Bald erledigen, Hat Zeit
- **Epic-Zuordnung**: Aufgaben können Epics zugeordnet werden
- **Wiederholung**: Wöchentliche oder monatliche wiederkehrende Aufgaben
- **Status**: Auswahl aus vier Status-Optionen:
  - Neu
  - In Bearbeitung
  - Erledigt
  - Unerledigt geschlossen

### Sprint-Verwaltung
Sprints sind eigenständige Objekte mit eindeutiger ID, Sprintnummer, Start-/Enddatum und Status (`current`, `next`, `future`, `closed`). Ein Sprint dauert immer eine Kalenderwoche von Sonntag bis Samstag (Europe/Berlin).

**Sprint-Lebenszyklus**
1. Beim Start der Anwendung wird automatisch ein aktueller Sprint angelegt, falls keiner existiert.
2. Neue Aufgaben werden automatisch dem aktuellen Sprint zugeordnet.
3. Ab Samstag (Endtag) erscheint im Scrum Board der Button **Sprint beenden**.
4. Beim Beenden:
   - Der aktuelle Sprint wird auf `closed` gesetzt.
   - Nicht erledigte Aufgaben werden in den Folgesprint verschoben (`scrumStatus` und `status` werden auf `Ready`/`Neu` zurückgesetzt).
   - Erledigte Aufgaben bleiben dauerhaft im abgeschlossenen Sprint.
   - Ein Folgesprint mit Status `next` wird bevorzugt übernommen. Existiert keiner, wird ein neuer `next`-Sprint erzeugt. Vorhandene `future`-Sprints bleiben unverändert.
5. Mehrfaches Beenden ist idempotent.

### Ansichten
- **Backlog**: Übersicht aller Aufgaben mit Sortierung und Filterfunktionen
- **Kalender**: Monatsansicht der Aufgaben
  - Einfacher Klick auf eine Aufgabe öffnet die Detailansicht
  - Klicken und Ziehen verschiebt eine Aufgabe auf ein anderes Datum per Drag & Drop – Datum und Sprint-Zuordnung werden automatisch angepasst
- **Scrum Board**: Kanban-Ansicht des aktuellen Sprints mit Drag & Drop (Ready, In Progress, Review, Done); Klick auf eine Aufgabe öffnet die Detailansicht
- **Done**: Erledigte Aufgaben aus allen Sprints, mit Button für die Detailansicht und Rücknahme ins Backlog
- **Epics**: Verwaltung von Epics mit zugeordneten Aufgaben
- **Auswertung**: Übersicht vergangener Sprints mit:
  - Erledigten und nicht erledigten Aufgaben & Punkten pro Sprint
  - Durchschnittliche Punkte pro Sprint
  - Balkendiagramm der Punkte der letzten 10 Sprints
  - Liste der erledigten Aufgaben mit Punkten pro Sprint
- **Detailansicht**: Vollständige Anzeige einer Aufgabe mit allen Informationen
- **Eingabe/Bearbeitungsmaske**: Formular zum Erstellen und Bearbeiten von Aufgaben

### Spezielle Features
- Überfällige Aufgaben werden rot markiert, fällige Aufgaben grün
- Aufgaben mit Priorität „Super wichtig" blinken
- Automatische Sortierung nach Status und Fälligkeitsdatum
- Responsive Design für Desktop und Mobile
- Datenspeicherung in MongoDB über eine Express-REST-API
- JSON-Export aller Aufgaben

## Technologie-Stack

- **React 18** mit TypeScript
- **Bootstrap 5** für das UI-Design
- **@hello-pangea/dnd** für Drag & Drop auf dem Scrum Board
- **Lucide React** für Icons
- **MongoDB** mit Mongoose für die Datenspeicherung
- **Express** für die REST-API

## Projektstruktur

```
src/
├── components/
│   ├── TodoForm.tsx      # Eingabe/Bearbeitungsmaske
│   ├── TodoDetail.tsx    # Detailansicht
│   ├── TodoList.tsx      # Backlog-Listenansicht
│   ├── TodoCalendar.tsx  # Kalenderansicht mit Drag & Drop
│   ├── ScrumBoard.tsx    # Kanban-Board des aktuellen Sprints
│   ├── DoneList.tsx      # Erledigte Aufgaben
│   ├── EpicList.tsx      # Epic-Verwaltung
│   ├── SprintStats.tsx   # Auswertung vergangener Sprints
│   └── PageHeader.tsx    # Gemeinsamer Seitenkopf
├── services/
│   ├── todoService.ts    # API-Service für Aufgaben
│   ├── sprintService.ts  # API-Service für Sprints
│   └── epicService.ts    # API-Service für Epics
├── styles/               # Themen- und Seiten-Stylesheets
├── utils/
│   └── dateOnly.ts       # Zeitzonen-sichere Datumshelfer
├── types.ts              # TypeScript-Typdefinitionen
├── App.tsx               # Hauptanwendung
└── index.tsx             # Einstiegspunkt

server-mongo.js           # Express-Backend (API + Datenmodell)
```

## API

### Sprints
- `GET /james-todos/api/sprints` – Liste aller Sprints
- `GET /james-todos/api/sprints/current` – Aktueller Sprint
- `POST /james-todos/api/sprints` – Neuen zukünftigen Sprint anlegen
- `POST /james-todos/api/sprints/:id/close` – Sprint beenden (atomar, idempotent)

### Aufgaben & Epics
Die Aufgaben- und Epic-Endpunkte sind unter `/james-todos/api/todos` bzw. `/james-todos/api/epics` verfügbar (siehe `server-mongo.js`).

## Installation und Start

### Voraussetzungen
- Node.js (>= 16.20.2) und npm (>= 8)
- Laufende MongoDB-Instanz (Standard: `mongodb://127.0.0.1:27017`)

### Installation

1. Repository klonen oder in das Projektverzeichnis wechseln
2. Abhängigkeiten installieren:
```bash
npm install
```

### Anwendung starten

Backend und Frontend gemeinsam im Entwicklungsmodus starten:
```bash
npm run dev
```

- Frontend: [http://localhost:3000](http://localhost:3000)
- Backend-API: [http://localhost:3003](http://localhost:3003/james-todos/api/)

Alternativ einzeln:
```bash
npm run server   # nur Backend (Port 3003)
npm start        # nur Frontend (Port 3000)
```

Die MongoDB-Verbindung kann über die Umgebungsvariable `MONGODB_URI` angepasst werden, die API-Basis-URL des Frontends über `REACT_APP_API_BASE_URL`.

### Produktions-Build

```bash
npm run build
```

Die optimierte Anwendung wird im `build`-Verzeichnis erstellt.

## Verwendung

### Aufgabe erstellen
1. Klicken Sie auf den Button „Neue Aufgabe"
2. Füllen Sie das Formular aus (Titel erforderlich, Rest optional)
3. Klicken Sie auf „Speichern"

### Aufgabe bearbeiten oder löschen
1. In der Detailansicht auf „Bearbeiten" klicken bzw. in der Listenansicht das Löschen-Icon verwenden
2. Änderungen speichern bzw. Löschbestätigung bestätigen

### Aufgabenstatus ändern
Der Status kann in der Bearbeitungsmaske geändert werden, durch direkte Interaktion in der Listenansicht oder per Drag & Drop auf dem Scrum Board.

### Aufgabe im Kalender verschieben
Aufgabe anklicken, gedrückt halten und auf das gewünschte Datum ziehen. Datum und Sprint-Zuordnung werden automatisch aktualisiert.

## Entwicklung

### Tests starten
```bash
npm test
```

### Integrationstests (MongoDB erforderlich)
```bash
npm run test:integration
```

### Anpassungen
Die Anwendung kann leicht erweitert werden:
- Neue Status-Optionen in `types.ts` hinzufügen
- Zusätzliche Felder im `TodoForm` implementieren
- Neue Ansichten als Komponente in `src/components/` ergänzen und in `App.tsx` registrieren

## Lizenz

Dieses Projekt wurde zu Lernzwecken erstellt und kann frei verwendet und angepasst werden.
