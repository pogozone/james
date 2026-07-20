# Todo Anwendung

Eine vollständige Todo-Anwendung erstellt mit React und Bootstrap.

## Funktionen

### Aufgaben-Management
- **Titel**: Freitext-Eingabe (erforderlich)
- **Beschreibung**: Optionaler Freitext für zusätzliche Details
- **Fälligkeitsdatum**: HTML5 Date-Picker zur Auswahl des Datums
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
- **Listenansicht**: Übersicht aller Aufgaben mit Sortierung und Filterfunktionen
- **Detailansicht**: Vollständige Anzeige einer Aufgabe mit allen Informationen
- **Eingabe/Bearbeitungsmaske**: Formular zum Erstellen und Bearbeiten von Aufgaben
- **Scrum Board**: Kanban-Ansicht des aktuellen Sprints mit Drag & Drop
- **Done-Liste**: Erledigte Aufgaben aus allen Sprints

### Spezielle Features
- Überfällige Aufgaben werden rot markiert
- Automatische Sortierung nach Status und Fälligkeitsdatum
- Status-Icons für bessere visuelle Unterscheidung
- Responsive Design für Desktop und Mobile
- Datenspeicherung im localStorage

## Technologie-Stack

- **React 18** mit TypeScript
- **Bootstrap 5** für das UI-Design
- **Lucide React** für Icons
- **MongoDB** mit Mongoose für die Datenspeicherung
- **Express** für die REST-API

## Projektstruktur

```
src/
├── components/
│   ├── TodoForm.tsx      # Eingabe/Bearbeitungsmaske
│   ├── TodoDetail.tsx    # Detailansicht
│   ├── TodoList.tsx      # Listenansicht
│   ├── ScrumBoard.tsx    # Kanban-Board des aktuellen Sprints
│   ├── DoneList.tsx      # Erledigte Aufgaben
│   └── EpicList.tsx      # Epic-Übersicht
├── services/
│   ├── todoService.ts    # API-Service für Aufgaben
│   └── sprintService.ts  # API-Service für Sprints
├── utils/
│   └── dateOnly.ts       # Zeitzonen-sichere Datumshelfer
├── types.ts              # TypeScript-Typdefinitionen
├── App.tsx               # Hauptanwendung
└── App.css               # Custom Styles

server-mongo.js           # Express-Backend (API + Datenmodell)
```

## Sprint-API

- `GET /james-todos/api/sprints` – Liste aller Sprints
- `GET /james-todos/api/sprints/current` – Aktueller Sprint
- `POST /james-todos/api/sprints` – Neuen zukünftigen Sprint anlegen
- `POST /james-todos/api/sprints/:id/close` – Sprint beenden (atomar, idempotent)

## Installation und Start

### Voraussetzungen
- Node.js (Version 14 oder höher)
- npm oder yarn

### Installation

1. Repository klonen oder in das Projektverzeichnis wechseln
2. Abhängigkeiten installieren:
```bash
npm install
```

### Anwendung starten

Entwicklungsmodus starten:
```bash
npm start
```

Die Anwendung ist dann unter [http://localhost:3000](http://localhost:3000) erreichbar.

### Produktions-Build

Für den Produktions-Einsatz:
```bash
npm run build
```

Die optimierte Anwendung wird im `build`-Verzeichnis erstellt.

## Verwendung

### Aufgabe erstellen
1. Klicken Sie auf "Neue Aufgabe" Button
2. Füllen Sie das Formular aus:
   - Titel (erforderlich)
   - Beschreibung (optional)
   - Fälligkeitsdatum
   - Status
3. Klicken Sie auf "Speichern"

### Aufgabe bearbeiten
1. In der Listenansicht auf das Bearbeiten-Icon klicken
2. Änderungen im Formular vornehmen
3. "Speichern" klicken

### Aufgabe löschen
1. In der Listenansicht auf das Löschen-Icon klicken
2. Löschbestätigung im Dialog bestätigen

### Aufgabenstatus ändern
Der Status kann entweder in der Bearbeitungsmaske geändert werden oder durch direkte Interaktion in der Listenansicht.

## Datenverwaltung

Die Aufgaben werden standardmäßig im localStorage des Browsers gespeichert. Dies stellt sicher, dass die Daten auch nach einem Neustart der Anwendung erhalten bleiben.

Für eine vollständige serverseitige Speicherung müsste der `todoService` um eine echte API-Anbindung erweitert werden.

## Entwicklung

### Tests starten
```bash
npm test
```

### Code-Analyse
```bash
npm run build
```

### Anpassungen
Die Anwendung kann leicht erweitert werden:
- Neue Status-Optionen in `types.ts` hinzufügen
- Zusätzliche Felder im TodoForm implementieren
- Backend-API im todoService integrieren

## Lizenz

Dieses Projekt wurde zu Lernzwecken erstellt und kann frei verwendet und angepasst werden.
