# Verbindliche Sicherheitsanforderungen

Die Applikation muss jederzeit gegen die für sie relevanten Risiken der OWASP Top 10 abgesichert sein. Diese Anforderung gilt für jede Änderung an Quellcode, Abhängigkeiten, Konfiguration und Infrastruktur sowie für Entwicklung, Tests und Betrieb.

## Arbeitsregeln für Agenten

- Berücksichtige Sicherheit von Beginn an bei jeder Änderung. Führe keine bekannten Schwachstellen ein und schwäche bestehende Schutzmaßnahmen nicht ab.
- Verwende die aktuelle veröffentlichte OWASP Top 10 als Risikorahmen. Dokumentiere bei Sicherheitsprüfungen die verwendete Ausgabe. Nutze passende OWASP-ASVS-Anforderungen für konkrete, überprüfbare Kontrollen.
- Prüfe Eingaben serverseitig, verwende parametrisierte Datenbankzugriffe und kodiere Ausgaben passend zum Ausgabekontext. Vermeide unsichere Deserialisierung, Befehlsinjektion und unkontrollierte ausgehende Requests.
- Erzwinge Authentifizierung und Berechtigungsprüfungen serverseitig für jede geschützte Aktion und jedes betroffene Objekt. Verwende minimale Rechte und sichere Standardeinstellungen.
- Schütze Sitzungen, Zugangsdaten und personenbezogene Daten. Verwende bewährte Passwort-Hashverfahren, sichere Cookies und geeignete Transportverschlüsselung. Speichere keine Geheimnisse im Repository, in Clientcode oder in Logs.
- Schütze zustandsändernde, Cookie-authentifizierte Requests vor CSRF. Setze geeignete Sicherheitsheader, restriktives CORS und eine zur Anwendung passende Content Security Policy ein.
- Behandle Uploads, Dateipfade und externe Ressourcen als nicht vertrauenswürdig. Begrenze Dateitypen, Größen und Zugriffsrechte; verhindere die Ausführung hochgeladener Dateien.
- Prüfe Abhängigkeiten und ihre Herkunft. Verwende unterstützte Versionen und behebe relevante bekannte Schwachstellen. Deaktiviere keine Sicherheitsprüfungen, um Checks erfolgreich erscheinen zu lassen.
- Behandle Fehler sicher: keine internen Details an Benutzer ausgeben, sicherheitsrelevante Ereignisse ohne Geheimnisse protokollieren und bei Fehlern keine Schutzmechanismen umgehen.

## Prüfpflicht vor Abschluss jeder Änderung

1. Prüfe die Änderung auf relevante OWASP-Risiken, einschließlich ihrer Auswirkungen auf bestehende Funktionen.
2. Führe die verfügbaren passenden Sicherheitschecks aus, insbesondere relevante Tests, statische Analyse und Abhängigkeitsprüfung. Ergänze gezielte Regressionstests bei Sicherheitskorrekturen.
3. Dokumentiere knapp, was geprüft wurde, welche Ergebnisse vorliegen und welche Prüfungen nicht durchgeführt werden konnten.
4. Melde neu entdeckte Schwachstellen mit betroffener Stelle, Auswirkung und konkretem Behebungsvorschlag. Behebe sie innerhalb des autorisierten Umfangs; verschweige außerhalb liegende Befunde nicht.
5. Gib Änderungen mit bekannten, durch sie eingeführten oder verschärften Sicherheitslücken nicht als fertig oder freigabefähig aus. Kennzeichne fehlende Prüfmöglichkeiten ausdrücklich als offen.

## Kontinuierliche Sicherheit

Sicherheitsprüfungen müssen in CI/CD und Betrieb regelmäßig sowie bei neuen relevanten Schwachstellenmeldungen wiederholt werden. Eine Agentenanweisung ersetzt diese technischen und organisatorischen Maßnahmen nicht.

Behaupte niemals pauschal, die Anwendung sei „OWASP-sicher“, vollständig geprüft oder frei von Schwachstellen. Berichte ausschließlich durch tatsächliche Prüfungen belegte Ergebnisse einschließlich ihres Umfangs und ihrer Grenzen.
