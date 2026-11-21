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
- **Investitionen:** Jugendakademie, Trainingsplätze, Umfeld & Stadion (je 10 Stufen), fiktive Trainer, Sponsorverträge, Eintrittspreise.
- **Finanzen:** Zuschauer, Catering, Sponsoring, TV-Gelder, Prämien und Transfers stehen Gehältern, Spielbetrieb, Verwaltung, Unterhalt, Jugend sowie der 2./3. Mannschaft gegenüber. Zum Saisonumbruch gibt es einen Jahresabschluss.
- **Weitere Mannschaften:** 2. und 3. Mannschaft gehören zum Verein und werden nicht verwaltet. Nur ihre Kosten zählen. Sie lassen sich an- und abmelden.
- **Pokale:** Kreispokal → Bezirkspokal Hannover → 21 Landespokale → DFB-Pokal. Der Sieger spielt in der nächsten Saison zusätzlich im nächsthöheren Pokal.
- **Fairness:** Die Ergebnisse eines Tages hängen von einem geheimen Zufallswert ab, den der Server erst um 18:00 Uhr freigibt. Niemand kann vorher ausrechnen, wie ein Spiel ausgeht.

## Hinweise

- Jedes Gerät berechnet den Spielstand aus allen Aktionen selbst. Mit ca. 400 Spielen pro Tag dauert das auch nach vielen Saisons nur Sekundenbruchteile.
- Änderungen an `engine.js` während eines laufenden Spiels verändern rückwirkend alle Ergebnisse. Regeländerungen also am besten nur vor dem Start oder mit neuem Startdatum (`delete from actions;`).
- Daten: kicker.de, fussball.de, Wikipedia. Stand 21.11.2026, Reihenfolge entspricht dem damaligen Tabellenstand.
