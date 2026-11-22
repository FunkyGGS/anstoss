// Ämter im Verein: je 5 Stufen (1 = Ehrenamt ohne Gehalt … 5 = Vollprofi), 0 = unbesetzt
export const STAFF_LEVELS = ["unbesetzt", "Ehrenamt", "Minijob", "Teilzeit", "Profi", "Vollprofi"];
export const SAL_LVL = [0, 0, 8000, 25000, 60000, 140000];
export const SPORT_ROLES = ["headcoach", "cotrainer", "taktik", "athletik", "twtrainer", "scout", "nlz", "arzt", "physio", "reha", "psycho", "betreuer"];

export const ROLES = {
  praesident: {
    name: "Präsident", area: "Vereinsführung", w: 1.2, effect: "Stärkt alle Bereiche ein wenig: Sponsoren, Zuschauer, Training, Spielstärke und Gesundheit.",
    lv: [
      ["Der Dorfälteste", "Kennt jeden Grashalm persönlich, eröffnet die Jahreshauptversammlung mit einem Gedicht von 1974 und hält Excel für einen Waschmittelhersteller."],
      ["Der Vereinsvorsitzende", "Hat ein Klemmbrett, einen Schlüssel fürs Vereinsheim und die Telefonnummer vom Bürgermeister. Mehr braucht es manchmal nicht."],
      ["Der Macher", "Erster am Platz, Letzter am Tresen. Hat schon drei Flutlichtmasten organisiert, ohne dass jemand weiß, woher."],
      ["Der Patron", "Spricht nur in Interviews, trägt Kaschmirschal im Juli und kennt Leute, die Leute kennen. Türen öffnen sich, bevor er klopft."],
      ["Der Visionär", "Hat einen Zehnjahresplan, eine eigene Stiftung und angeblich die Nummer vom Bundestrainer. Der Verein wächst, sobald er den Raum betritt."],
    ],
  },
  gf: {
    name: "Geschäftsführer Sport", area: "Vereinsführung", w: 1.8, effect: "Verwaltet ein Budget und übernimmt auf Wunsch sportliche Aufgaben: Personal einstellen, Kader auffüllen, Rotation steuern. Je höher die Stufe, desto klüger seine Entscheidungen.",
    lv: [
      ["Der Kassenwart mit Ambitionen", "Verwaltet das Budget in einer Schuhschachtel und entscheidet nach Bauchgefühl – sein Bauch hat allerdings schon bessere Tage gesehen."],
      ["Der Sportliche Leiter", "Hat zwei Handys und einen Notizblock voller Namen. Die Hälfte davon spielt längst Tennis."],
      ["Der Manager", "Kennt Marktwerte auswendig und verhandelt mit Kaffee statt Bier. Fehlgriffe werden seltener."],
      ["Der Direktor Sport", "Arbeitet mit Datenbanken, Netzwerk und einem sechsten Sinn für Schnäppchen. Spieleragenten fürchten seinen Rückruf."],
      ["Der Kaderarchitekt", "Plant drei Transferperioden im Voraus und weiß vor dem Spieler, dass dieser wechseln will. Jeder Euro arbeitet doppelt."],
    ],
  },
  scout: {
    name: "Scouts", area: "Sport", w: 0.8, effect: "Mehr und bessere Spieler auf dem Transfermarkt. Ab Stufe 1 gibt es Empfehlungen, und das Potenzial wird je Stufe genauer eingeschätzt.",
    lv: [
      ["Der Spielfeldrand-Experte", "Steht bei jedem Kreisligaspiel mit Bratwurst am Zaun. Seine Empfehlungen: „Der Lange da, der läuft gut.“"],
      ["Der Hobby-Scout", "Hat ein Abo bei einem Fußballportal und eine Tabelle mit Ampelfarben. Die Farben stimmen meistens."],
      ["Das Scouting-Team", "Drei Leute, ein Kombi, 40.000 Kilometer im Jahr. Sie sehen Potenzial, wo andere nur Grätschen sehen."],
      ["Die Scouting-Abteilung", "Video-Datenbank, Laufwerte, Charaktergutachten. Talente werden nicht mehr entdeckt, sondern berechnet."],
      ["Das globale Netzwerk", "Hat Augen in jedem Dorfverein zwischen Flensburg und Füssen. Wenn irgendwo ein Talent hustet, liegt der Bericht schon auf dem Tisch."],
    ],
  },
  nlz: {
    name: "Leiter NLZ", area: "Sport", w: 1, effect: "Bessere Talente aus der eigenen Jugend und schnellere Entwicklung junger Spieler (unter 21).",
    lv: [
      ["Der Jugendwart", "Organisiert Fahrgemeinschaften, Trikotwäsche und das Sommerfest. Talentförderung heißt bei ihm: „Lauft mal ’ne Runde.“"],
      ["Der Jugendkoordinator", "Hat einen Trainingsplan für alle Jahrgänge – auf Papier, laminiert, leicht vergilbt."],
      ["Der Ausbildungsleiter", "Lizenzierte Trainer, feste Abläufe, Elternabende ohne Tränen. Die Talente werden sichtbar besser."],
      ["Der NLZ-Direktor", "Internat, Schulkooperation, Leistungsdiagnostik. Aus jedem Jahrgang wächst mindestens ein Rohdiamant."],
      ["Der Talentflüsterer", "Seine Schützlinge spielen mit 17 wie mit 25. Die großen Klubs rufen an – er legt freundlich auf."],
    ],
  },
  headcoach: {
    name: "Headcoach", area: "Trainerteam", w: 2, effect: "Verantwortlich für die Leistung auf dem Platz: Bonus auf die Spielstärke, ohne Headcoach gibt es Abzüge.",
    lv: [
      ["Der Spielertrainer", "Coacht von der Seitenlinie und spielt bei Personalnot selbst mit. Taktikbesprechung: „Hinten dicht, vorne hilft der liebe Gott.“"],
      ["Der Übungsleiter", "C-Lizenz, Trillerpfeife, Hütchen in vier Farben. Die Viererkette steht – meistens."],
      ["Der Fußballlehrer", "Analysiert, motiviert, wechselt mit Plan. Die Mannschaft weiß endlich, was sie tun soll."],
      ["Der Taktikfuchs", "Stellt in der Halbzeit um und dreht Spiele. Pressekonferenzen sind seine zweite Bühne."],
      ["Der Meistermacher", "Hat Titel gewonnen, wo andere nicht mal den Klassenerhalt geschafft hätten. Spieler würden für ihn durch Wände laufen."],
    ],
  },
  cotrainer: {
    name: "Co-Trainer", area: "Trainerteam", w: 1, effect: "Steigert die Stärkeentwicklung der Spieler im Training.",
    lv: [
      ["Der Hütchenaufsteller", "Stellt Hütchen auf, sammelt Hütchen ein, zählt Hütchen. Ab und zu fällt ihm eine Übung ein."],
      ["Der Assistent", "Leitet das Aufwärmen und die Standardsituationen. Die Spieler mögen ihn, weil er sie duzt."],
      ["Der Trainingsplaner", "Periodisierung, Belastungssteuerung, individuelle Übungen. Spieler werden messbar besser."],
      ["Der Entwickler", "Erkennt jede Schwäche und hat für jede eine Übung. Verbesserung ist bei ihm kein Zufall."],
      ["Die rechte Hand", "Könnte selbst Cheftrainer sein, will aber lieber Spieler besser machen. Und das tut er."],
    ],
  },
  taktik: {
    name: "Taktiktrainer", area: "Trainerteam", w: 0.9, effect: "Liefert vor jedem Spiel eine Gegneranalyse – je Stufe genauer – und bringt einen kleinen Bonus durch gute Vorbereitung.",
    lv: [
      ["Der Hobby-Analyst", "Schaut sich den Gegner auf dem Handy an, Hochformat, mit 3G. Erkenntnis: „Die haben auch elf Mann.“"],
      ["Der Videoschnipsler", "Hat drei Spiele des Gegners geschnitten. Die Szenen sind kurz, die Erkenntnisse auch."],
      ["Der Spielanalyst", "Laufwege, Pressingzonen, Schwachstellen. Die Mannschaft geht vorbereitet ins Spiel."],
      ["Der Datenfuchs", "Heatmaps, Expected Goals, Standardvarianten. Er weiß, wohin der Gegner beim Eckball läuft."],
      ["Der Schachgroßmeister", "Kennt den Plan des Gegners, bevor der gegnerische Trainer ihn kennt. Und hat drei Gegenpläne."],
    ],
  },
  athletik: {
    name: "Athletiktrainer", area: "Trainerteam", w: 0.8, effect: "Verbessert Speed und Fitness der Spieler und senkt den Fitnessverbrauch in Spielen.",
    lv: [
      ["Der Waldlauf-Fan", "Glaubt an Steigungsläufe und frische Luft. Die Spieler glauben an Seitenstiche."],
      ["Der Fitnesscoach", "Zirkeltraining, Medizinbälle, Sprints. Hat eine Stoppuhr und ist nicht ängstlich, sie zu benutzen."],
      ["Der Athletikspezialist", "Sprungkraft, Antritt, Ausdauer – individuell dosiert. Die Mannschaft läuft länger und schneller."],
      ["Der Performance-Coach", "GPS-Westen, Laktattests, Regenerationspläne. Seine Spieler sind in der 90. Minute die frischeren."],
      ["Der Turbolader", "Macht aus Dieseln Sportwagen. Gegenspieler sehen nur noch Rückennummern."],
    ],
  },
  twtrainer: {
    name: "Torwarttrainer", area: "Trainerteam", w: 0.7, effect: "Fördert die Entwicklung der Torhüter und verbessert ihre Leistung im Spiel.",
    lv: [
      ["Der Ex-Keeper vom Stammtisch", "Hat 1989 einen Elfmeter gehalten und erzählt jede Woche davon. Wirft noch ganz ordentlich Bälle."],
      ["Der Bälleschießer", "Schießt eine Stunde lang aufs Tor. Präzise ist anders, aber die Reflexe werden besser."],
      ["Der Torwartcoach", "Stellungsspiel, Strafraumbeherrschung, Spieleröffnung. Die Nummer eins wird zur Bank."],
      ["Der Reflexmeister", "Trainiert mit Tennisbällen und Lichtsignalen. Seine Keeper halten Dinger, die keiner halten kann."],
      ["Die Krake", "Macht aus jedem Torwart eine Wand. Gegnerische Stürmer bekommen Albträume."],
    ],
  },
  arzt: {
    name: "Mannschaftsarzt", area: "Medizin", w: 1.2, effect: "Senkt das Verletzungsrisiko und gibt Einsatzempfehlungen – je Stufe genauer. Auf Wunsch werden seine Empfehlungen bei der Aufstellung befolgt.",
    lv: [
      ["Der Hausarzt aus dem Ort", "Kommt nach der Sprechstunde, hat Eisspray und Pflaster dabei. Diagnose bei allem: „Erst mal kühlen.“"],
      ["Der Sportmediziner", "Erkennt Zerrungen, bevor sie zu Rissen werden – zumindest manchmal."],
      ["Der Vereinsarzt", "Regelmäßige Checks, Belastungswerte im Blick. Seine Empfehlungen sind meistens richtig."],
      ["Der Orthopäde mit Praxis", "MRT auf Abruf, Netzwerk zu Spezialisten. Verletzungen werden früh erkannt und vermieden."],
      ["Der Wunderdoktor", "Seine Prognosen sind auf den Tag genau. Spieler kommen zu ihm, bevor sie wissen, dass sie etwas haben."],
    ],
  },
  physio: {
    name: "Physiotherapeut", area: "Medizin", w: 0.8, effect: "Beschleunigt die Regeneration: Spieler gewinnen schneller Fitness zurück.",
    lv: [
      ["Die Franzbranntwein-Fee", "Reibt alles ein, was nicht wegläuft. Riecht man drei Kabinen weiter."],
      ["Der Masseur", "Hat eine Liege, gute Hände und das beste Radio im Vereinsheim."],
      ["Der Physiotherapeut", "Lymphdrainage, Tapes, Faszienrolle. Die Beine sind am nächsten Tag wieder frisch."],
      ["Das Physio-Team", "Eisbecken, Kompressionshosen, individuelle Pläne. Regeneration ist hier Wissenschaft."],
      ["Der Regenerationsmagier", "Nach seiner Behandlung fühlen sich Spieler fünf Jahre jünger – und laufen auch so."],
    ],
  },
  reha: {
    name: "Reha-Trainer", area: "Medizin", w: 0.7, effect: "Verletzte kehren schneller zurück. Ohne Reha-Trainer dauern Ausfälle länger.",
    lv: [
      ["Der Trostspender", "Bringt Verletzten Obst und Zeitschriften. Die Heilung beschleunigt das nicht, aber die Stimmung."],
      ["Der Aufbautrainer", "Ein paar Gummibänder, ein Gymnastikball und viel Geduld. Es geht voran – langsam."],
      ["Der Reha-Coach", "Strukturierter Wiederaufbau, klare Phasen. Comebacks werden planbar."],
      ["Der Rückkehr-Experte", "Unterwassertraining, Antigravitationslaufband. Ausfallzeiten schrumpfen spürbar."],
      ["Der Phönix-Macher", "Seine Patienten kommen stärker zurück, als sie gegangen sind. Kreuzbandriss? Das wird schon."],
    ],
  },
  psycho: {
    name: "Sportpsychologe", area: "Medizin", w: 0.8, effect: "Stärkt die mentale Stärke der Spieler, verbessert Disziplin (weniger Karten) und bringt einen kleinen Spielbonus.",
    lv: [
      ["Der Kabinenphilosoph", "Ein älterer Herr mit Kalendersprüchen: „Wer nicht kämpft, hat schon verloren.“ Manchmal hilft es."],
      ["Der Motivator", "Bringt Lautsprecher und Eye of the Tiger mit. Die Stimmung ist gut, die Nerven auch."],
      ["Der Mentalcoach", "Atemübungen, Visualisierung, Einzelgespräche. Elfmeter werden plötzlich verwandelt."],
      ["Der Sportpsychologe", "Hilft bei Druck, Krisen und Formtiefs. Das Team bleibt auch beim 0:1 ruhig."],
      ["Der Kopfmonteur", "Seine Spieler haben Nerven aus Drahtseil. Gelbe Karten? Nur noch aus Versehen."],
    ],
  },
  betreuer: {
    name: "Betreuer", area: "Organisation", w: 0.4, effect: "Sorgt für reibungslose Abläufe rund ums Spiel – höhere Stufen bringen einen kleinen Bonus und gute Stimmung.",
    lv: [
      ["Der gute Kumpel", "Vergisst mal ein Trikot, hat aber immer eine Kiste Bier im Kofferraum. Der Bus fährt trotzdem pünktlich – fast immer."],
      ["Der Zeugwart", "Jedes Trikot gewaschen, jeder Schuh geputzt, jede Trinkflasche beschriftet. Ordnung ist das halbe Spiel."],
      ["Der Teammanager", "Organisiert Reisen, Hotels und Mahlzeiten. Spieler müssen nur noch an Fußball denken."],
      ["Die gute Seele", "Kennt Geburtstage, Lieblingsessen und Sorgen jedes Spielers. Der Teamgeist blüht."],
      ["Der Logistikkönig", "Charterflug, Ersatztrikots in drei Größen, Rasenschuhe für jeden Untergrund. Nichts geht schief. Wirklich nichts."],
    ],
  },
  kasse: {
    name: "Kassenwart", area: "Wirtschaft", w: 0.6, effect: "Gibt Tipps für die Eintrittspreise und senkt die Verwaltungskosten. Auf Wunsch legt er die Preise selbst fest – je höher die Stufe, desto näher am optimalen Erlös.",
    lv: [
      ["Der Schuhkarton-Buchhalter", "Führt die Vereinskasse in einem Schuhkarton, Belege stehen auf Bierdeckeln. Seine Preistipps kommen aus dem Bauch – meistens aus dem vollen."],
      ["Der Sparkassen-Rentner", "40 Jahre am Schalter, zählt das Wechselgeld dreimal und weiß immerhin, ob der Eintritt eher rauf oder runter muss."],
      ["Die Steuerfachangestellte", "Excel mit Farbcode, Belege im Ordner, Kassenprüfung ohne Schweißausbrüche. Ihre Preisvorschläge liegen meist nah dran."],
      ["Der Controller", "Liquiditätsplanung, Zuschauerprognosen, Deckungsbeiträge. Rechnet aus, was der Stehplatz wirklich wert ist."],
      ["Die Finanzchefin mit Revenue-Management", "Dynamische Preise nach Gegner, Tabellenplatz und Wetterbericht. Kein Euro bleibt auf der Tribüne liegen."],
    ],
  },
  marketing: {
    name: "Marketing", area: "Wirtschaft", w: 1, effect: "Bessere Sponsorenangebote und höhere Einnahmen aus Werbung.",
    lv: [
      ["Der Flyer-Verteiler", "Druckt Plakate im Copyshop und hängt sie an jeden Laternenpfahl. Sponsoren: die Bäckerei seiner Tante."],
      ["Der Vereinsgrafiker", "Hat ein neues Logo gebastelt und einen Instagram-Account. Die ersten Banner hängen."],
      ["Der Marketingleiter", "Sponsorenmappen, Business-Club, Bandenwerbung mit Konzept. Die Angebote werden besser."],
      ["Die Marketingagentur", "Markenstrategie, Merchandising, Social-Media-Kampagnen. Firmen stehen Schlange."],
      ["Der Markenmagier", "Verkauft Namensrechte für die Eckfahne und das zu Höchstpreisen. Der Verein ist eine Marke."],
    ],
  },
  presse: {
    name: "Pressesprecher", area: "Wirtschaft", w: 0.8, effect: "Bessere Außendarstellung: mehr Zuschauer und schneller wachsende Beliebtheit.",
    lv: [
      ["Der Stadionsprecher mit Nebenjob", "Schreibt den Spielbericht fürs Gemeindeblatt, Rechtschreibung nach Gefühl. Jeder kennt ihn."],
      ["Der Social-Media-Praktikant", "Postet Torjubel, Kabinenvideos und Memes. Die Jugend des Ortes ist begeistert."],
      ["Der Pressesprecher", "Pressemitteilungen, Stadionheft, Kontakt zur Lokalzeitung. Die Hütte wird voller."],
      ["Der Kommunikationschef", "TV-Interviews, Podcast, Fan-Events. Der Verein ist Gesprächsthema in der Region."],
      ["Der Spin-Doktor", "Verwandelt ein 0:5 in eine „mutige Lernerfahrung“. Fans lieben ihn, Journalisten fürchten ihn."],
    ],
  },
};
export const ROLE_ORDER = ["praesident", "gf", "headcoach", "cotrainer", "taktik", "athletik", "twtrainer", "scout", "nlz", "arzt", "physio", "reha", "psycho", "betreuer", "kasse", "marketing", "presse"];
export const GF_TASKS = {
  staff: ["Sportliches Personal verwalten", "Stellt sportliche Mitarbeiter ein, entlässt sie und legt ihre Stufen innerhalb des Budgets fest."],
  squad: ["Kader auffüllen", "Kauft Spieler nach, wenn Positionen fehlen oder zu viele ausfallen – je nach Stufe mit mehr oder weniger Treffsicherheit."],
  rotation: ["Rotation & Intensität steuern", "Passt Intensität und Rotationsschwelle täglich an Fitness und Verletzungslage an."],
};
const LEAGUE_MULT = { 1: 4, 2: 2.5, 3: 1.7, 4: 1.3, 5: 1, 6: 0.8, 7: 0.6, 8: 0.5, 9: 0.45, 10: 0.4, 11: 0.4, 12: 0.4 };
export function staffSalary(role, lvl, leagueLevel) {
  return Math.round(SAL_LVL[lvl] * ROLES[role].w * (LEAGUE_MULT[leagueLevel] || 0.4));
}
