# Anstoß – Fußball-Manager für dich und deine Freunde

Eigenständige Web-App, die ohne Claude-Konto läuft. Jeder echte Kalendertag ist ein Spieltag mit Anpfiff um 18:00 Uhr. Eine Saison dauert 34 Spieltage plus 1 Tag Saisonumbruch.

## Inhalt

| Datei | Zweck |
|---|---|
| `site/index.html`, `site/app.js` | Oberfläche (für Handy optimiert) |
| `site/engine.js` | Spiel-Engine: Spiele, Pokale, Finanzen, Auf-/Abstieg |
| `site/backend.js` | Anbindung an Supabase bzw. Solo-Testmodus |
| `site/world.json` | 783 echte Mannschaften (Stand 21.11.2026) |
| `site/config.js` | **Hier deine Supabase-Zugangsdaten eintragen** |
| `supabase.sql` | Datenbank-Einrichtung |
| `tools/` | Datenaufbereitung und Tests (nicht hochladen nötig) |

## Sofort ausprobieren (Solo-Modus)

Solange `config.js` leer ist, läuft das Spiel nur in deinem Browser. Lade den Ordner `site` auf GitHub Pages hoch (siehe unten, Schritt 2) und öffne die Seite. Zum Testen vergangener Spieltage kannst du in der Browser-Konsole `__fm.backend.shift(40)` eingeben und die Seite neu laden. Dann tut das Spiel so, als hätte es vor 40 Tagen begonnen.

## Einrichtung für Mehrspieler (einmalig, ca. 15 Minuten)

### 1. Supabase (kostenlose Datenbank)
1. Auf <https://supabase.com> ein kostenloses Konto anlegen und ein neues Projekt erstellen (Region: Frankfurt).
2. Links auf **SQL Editor**, den Inhalt von `supabase.sql` einfügen und auf **Run** klicken.
3. Startdatum und Einladungscode festlegen, ebenfalls im SQL Editor:
   ```sql
   update public.game set start_date = '2026-11-23', invite_code = 'DEINCODE', name = 'Anstoß' where id = 1;
   ```
   Die Vorsaison beginnt um 18:00 Uhr am Vortag des Startdatums, der 1. Spieltag ist am Startdatum um 18:00 Uhr.
4. **Authentication → Sign In / Providers → Email**: „Confirm email“ ausschalten. Dann können sich Freunde ohne Bestätigungsmail registrieren.
5. **Project Settings → API**: „Project URL“ und den „anon public“-Schlüssel kopieren und in `site/config.js` eintragen. Der anon-Schlüssel darf öffentlich sein, die Datenbank ist durch Regeln geschützt.

### 2. GitHub Pages (kostenloses Hosting)
1. Auf GitHub ein neues öffentliches Repository anlegen, z. B. `anstoss`.
2. Den **Inhalt** des Ordners `site` hochladen (in diesem Repository liegt er bereits im Hauptverzeichnis) („Add file → Upload files“).
3. **Settings → Pages → Branch: main / root → Save**. Nach 1–2 Minuten ist das Spiel unter `https://DEINNAME.github.io/anstoss/` erreichbar.

### 3. Freunde einladen
Link und Einladungscode schicken. Jeder legt mit E-Mail und Passwort ein Konto an, gibt einen Namen und den Code ein und wählt dann **Verein gründen** oder **Investor werden**.

## Spielregeln im Überblick

- **Ligen:** 1.–5. Liga bundesweit mit echten Vereinen, 6. Liga (Landesligen) in Niedersachsen, darunter Bezirksliga Hannover sowie Kreis Region Hannover und Kreis Hameln-Pyrmont bis zur 3. Kreisklasse. Alle Ligen haben höchstens 18 Teams. Überzählige steigen ab, fehlende Plätze werden von unten aufgefüllt. Ligen ohne echte Liga darunter bekommen Aufsteiger aus fiktiven Vereinen mit echten Ortsnamen (markiert mit „fiktiv“).
- **Spieler:** fiktiv, Stärke 0,50–99,99 mit zwei Nachkommastellen. Bundesliga-Topspieler liegen bei 85–95, Ausnahmespieler über 95, Kreisklasse unter 10.
- **Einstieg:** Jeder Spieler wird gefragt: „Wie möchtest du starten?“ Zur Wahl stehen eine Neugründung mit 50.000 € in der untersten Spielklasse von Region Hannover oder Hameln-Pyrmont (zur nächsten Saison) oder der Einstieg als Investor. Es gibt 30 Investorenprofile vom Kioskbesitzer (25.000 €) bis zum Tech-Milliardär (1 Mrd. €) oder einen selbst erstellten Investor mit frei wählbarem Startkapital (10.000 € bis 1 Mrd. €). Kaufen lassen sich Klubs ab Liga 5 abwärts.
- **Investitionen:** Jugendakademie, Trainingsplätze, Umfeld & Stadion (je 10 Stufen), Sponsorverträge, Eintrittspreise.
- **Personal & Ämter (Tab „Personal“):** 16 Ämter in je 5 Stufen (1 = Ehrenamt ohne Gehalt … 5 = Vollprofi): Präsident, Geschäftsführer Sport (Budget; Aufgaben wählbar: sportliches Personal verwalten, Kader auffüllen, Rotation steuern), Scouts (Marktgröße, Potenzialschätzung, Empfehlungen), Leiter NLZ, Headcoach, Co-, Taktik-, Athletik-, Torwarttrainer, Mannschaftsarzt (Einsatzempfehlungen, optional befolgen), Physio, Reha-Trainer, Sportpsychologe, Betreuer, Marketing, Pressesprecher. Taktiktrainer liefert eine Gegneranalyse auf der Übersicht.
- **Finanzen:** Zuschauer, Catering, Sponsoring, TV-Gelder, Prämien und Transfers stehen Gehältern, Spielbetrieb, Verwaltung, Unterhalt, Jugend sowie der 2./3. Mannschaft gegenüber. Zum Saisonumbruch gibt es einen Jahresabschluss.
- **Weitere Mannschaften:** 2. und 3. Mannschaft gehören zum Verein und werden nicht verwaltet. Nur ihre Kosten zählen. Sie lassen sich an- und abmelden.
- **Pokale:** Kreispokal → Bezirkspokal Hannover → 21 Landespokale → DFB-Pokal. Der Sieger spielt in der nächsten Saison zusätzlich im nächsthöheren Pokal.
- **Fairness:** Die Ergebnisse eines Tages hängen von einem geheimen Zufallswert ab, den der Server erst um 18:00 Uhr freigibt. Niemand kann vorher ausrechnen, wie ein Spiel ausgeht.

- **Spieler:** 10 Positionen (TW, IV, AV, DM, ZM, AM, OM, AS, ST, MS) und 11 Fähigkeiten (0–100), die je Position unterschiedlich gewichtet in die Maximalstärke eingehen. Die aktuelle Stärke hängt vom Fitnessstand (0 = nicht spielfit, 100 = topfit) ab.
- **Fitness & Verletzungen:** Einsätze kosten Fitness (abhängig von der Intensität in 5 Stufen und der Fitness-Fähigkeit), Pausen bauen sie auf. Das Verletzungsrisiko steigt mit Müdigkeit, Intensität, Alter und der Härte des Gegners; Krankheiten häufen sich im Winter und stecken an. Ausfälle dauern je nach Art realistisch lange.
- **Aggressivität (5 Stufen):** mehr gewonnene Zweikämpfe, aber mehr Karten und Sperren (5 Gelbe = 1 Spiel, Gelb-Rot = 1, Rot = 2).
- **Statistik:** Spielberichte mit Ballbesitz, Schüssen, Fouls, Karten und Torschützen, Saisonstatistik, Saisonhistorie, ewige Torschützenliste des eigenen Vereins je Wettbewerb, Torschützenliste jeder Liga und Abschlusstabellen aller vergangenen Saisons.
- **Chat:** Nachrichten an alle oder privat an einzelne Mitspieler (Tabelle `messages`, siehe `supabase_chat.sql`).
- **Erfolge:** Trophäenschrank je Verein (Meisterschaften aller Ligen, alle Pokale) und Bestenliste der Bundesliga mit Torjägerliste, Meistern, Torschützenkönigen, Rekorden und ewiger Tabelle.

## Hinweise

- Jedes Gerät berechnet den Spielstand aus allen Aktionen selbst. Mit ca. 400 Spielen pro Tag dauert das auch nach vielen Saisons nur Sekundenbruchteile.
- Änderungen an `engine.js` während eines laufenden Spiels verändern rückwirkend alle Ergebnisse. Regeländerungen also am besten nur vor dem Start oder mit neuem Startdatum (`delete from actions;`).
- Daten: kicker.de, fussball.de, Wikipedia. Stand 21.11.2026, Reihenfolge entspricht dem damaligen Tabellenstand.
- **Chat:** eigene Nachrichten bearbeiten (Hinweis „bearbeitet“) und löschen – dafür einmalig `supabase_chat_edit.sql` ausführen.
- **Namen ändern:** Spieler im eigenen Kader (Kader → Spieler antippen) und Personal (✎ im Reiter Personal) lassen sich umbenennen.
- **Aufstellungen (Liga / Pokal):** Formation, Spielweise, Intensität, Aggressivität, Rotation und feste Spieler je Position – im Pokal optional mit eigener Aufstellung.
- **Form:** Tägliche Formschwankung (±8 % Leistung), beeinflusst durch Ergebnisse, Tore, Vorlagen und Platzverweise – Spieler mit hoher mentaler Stärke schwanken weniger.
- **Stärkeverlust:** Ab 30 Jahren sinkt die Maximalstärke schrittweise; schwere Verletzungen (ab 4 Wochen) hinterlassen bleibende Einbußen – je besser Arzt, Physio und Reha-Trainer, desto geringer.
- **Verträge:** Laufzeit 1–5 Jahre bis Saisonende, drei Angebote je Laufzeit (Festgehalt, Ausgewogen, Leistung mit Prämien für Einsätze, gewonnene Zweikämpfe, Vorlagen und Tore). Auslaufende Verträge → Spieler gehen ablösefrei; Verlängerung im Kader.
- **Karriereende:** Wahrscheinlichkeit je Alter aus einer Normalverteilung (Ø ~33 Jahre, Spitzenspieler und Torhüter später, schwere Verletzungen früher); Ankündigung am 25. Spieltag.
- **Europapokal:** Champions League, Europa League und Conference League (je 36 Teams, Ligaphase + K.-o.-Runden mit Hin- und Rückspiel, Finale). Deutsche Teilnehmer aus Bundesliga und DFB-Pokal, ausländische Teams jede Saison nach UEFA-Verbandskoeffizient aus allen Klubs der letzten fünf Europapokal-Jahre (Daten: kassiesa.net, Stand 11/2026, `euro.js`).
- **Nationalitäten:** Länderspezifische Namen (rund 45 Namenspools von Brasilien bis Japan). Ausländeranteil: Bundesliga ~55 %, 2. Liga ~42 %, 3. Liga ~30 %, Regionalliga ~22 %, Oberliga ~15 %, ab Landesliga 5–10 %; ausländische Europapokal-Klubs 50–80 %. Echte Starnamen sind aus den Pools entfernt, damit die Spieler fiktiv bleiben.
