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
  - Wiedervorlage

### Ansichten
- **Listenansicht**: Übersicht aller Aufgaben mit Sortierung und Filterfunktionen
- **Detailansicht**: Vollständige Anzeige einer Aufgabe mit allen Informationen
- **Eingabe/Bearbeitungsmaske**: Formular zum Erstellen und Bearbeiten von Aufgaben

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
- **localStorage** für die Datenspeicherung

## Projektstruktur

```
src/
├── components/
│   ├── TodoForm.tsx      # Eingabe/Bearbeitungsmaske
│   ├── TodoDetail.tsx    # Detailansicht
│   └── TodoList.tsx      # Listenansicht
├── services/
│   └── todoService.ts    # API-Service für Datenverwaltung
├── types.ts              # TypeScript-Typdefinitionen
├── App.tsx               # Hauptanwendung
└── App.css               # Custom Styles

public/
└── todo.json             # JSON-Datei für Aufgaben (Fallback)
```

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
