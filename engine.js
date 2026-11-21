// Fußball-Manager – deterministische Spiel-Engine
// Alle Mitspieler berechnen aus denselben Daten (Welt + Tages-Seeds + Aktionen) denselben Spielstand.
// Keine Math.random-Aufrufe: alle Zufallszahlen kommen aus Seeds.

export const SEASON_DAYS = 35;          // 34 Spieltage + 1 Tag Saisonumbruch
export const MATCHDAYS = 34;
export const LEAGUE_SIZE = 18;
export const MIN_KK3 = 18;          // 3. Kreisklasse nur mit vollen 18 Teams, sonst entfällt sie

// ---------------------------------------------------------------- Zufall
export function hash32(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return h >>> 0;
}
export function rngFrom(...parts) {
  let a = hash32(parts.join("|"));
  return function () {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const r2 = (x) => Math.round(x * 100) / 100;
const r4 = (x) => Math.round(x * 10000) / 10000;
const eur = (x) => Math.round(x);
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

// ---------------------------------------------------------------- Ebenen
// str: Mannschaftsstärke (Schnitt der Startelf) von Tabellenplatz 1 bis letzter Platz
export const LV = {
  1: { name: "Bundesliga", top: 88, bot: 69, tv: 60e6, sponsor: 40e6, att: 42000, price: 38, cap: 50000, fixed: 15e6, match: 120000, prize: 8e6, value: 0, fac: 8 },
  2: { name: "2. Bundesliga", top: 70, bot: 59, tv: 14e6, sponsor: 7e6, att: 21000, price: 24, cap: 30000, fixed: 4e6, match: 45000, prize: 1.5e6, value: 0, fac: 6 },
  3: { name: "3. Liga", top: 60, bot: 50, tv: 3e6, sponsor: 2e6, att: 7500, price: 17, cap: 15000, fixed: 1.2e6, match: 12000, prize: 3e5, value: 0, fac: 5 },
  4: { name: "Regionalliga", top: 52, bot: 41, tv: 3e5, sponsor: 5e5, att: 1600, price: 11, cap: 8000, fixed: 2.5e5, match: 2500, prize: 4e4, value: 0, fac: 4 },
  5: { name: "Oberliga", top: 42, bot: 31, tv: 0, sponsor: 1.5e5, att: 380, price: 8, cap: 3000, fixed: 5e4, match: 700, prize: 1e4, value: 2.5e6, fac: 3 },
  6: { name: "Landesliga", top: 32, bot: 24, tv: 0, sponsor: 6e4, att: 180, price: 6, cap: 2000, fixed: 2e4, match: 300, prize: 4e3, value: 6e5, fac: 2 },
  7: { name: "Bezirksliga", top: 25, bot: 18, tv: 0, sponsor: 2.5e4, att: 110, price: 5, cap: 1000, fixed: 9e3, match: 150, prize: 1500, value: 2e5, fac: 2 },
  8: { name: "Kreisliga", top: 19, bot: 13, tv: 0, sponsor: 1e4, att: 75, price: 3, cap: 800, fixed: 4500, match: 80, prize: 600, value: 7e4, fac: 1 },
  9: { name: "1. Kreisklasse", top: 13.5, bot: 8.5, tv: 0, sponsor: 5000, att: 50, price: 2, cap: 500, fixed: 2800, match: 50, prize: 300, value: 3e4, fac: 1 },
  10: { name: "2. Kreisklasse", top: 9.5, bot: 5.5, tv: 0, sponsor: 2500, att: 35, price: 1, cap: 300, fixed: 1800, match: 35, prize: 150, value: 1.2e4, fac: 0 },
  11: { name: "3. Kreisklasse", top: 6.5, bot: 3, tv: 0, sponsor: 1500, att: 25, price: 0, cap: 300, fixed: 1200, match: 25, prize: 80, value: 6e3, fac: 0 },
};
export const levelMid = (l) => (LV[l].top + LV[l].bot) / 2;
const DOWN = { 1: 2, 2: 2, 3: 4, 4: 3, 5: 2, 6: 2, 7: 2, 8: 2, 9: 2, 10: 2, 11: 1 };

// Gehalt pro Saison (= Spieljahr) abhängig von der Stärke
export const wageOf = (s) => eur(60 * Math.pow(1.135, s));
export function valueOf(p) {
  const f = p.age < 22 ? 3.2 : p.age < 25 ? 2.7 : p.age < 29 ? 2.1 : p.age < 32 ? 1.3 : 0.7;
  const potBonus = 1 + Math.max(0, (p.pot || p.str) - p.str) / 40;
  return eur(wageOf(p.str) * f * potBonus);
}

export const FORMATIONS = { "4-4-2": [4, 4, 2], "4-3-3": [4, 3, 3], "3-5-2": [3, 5, 2], "4-5-1": [4, 5, 1], "5-3-2": [5, 3, 2] };
export const TACTICS = { defensiv: [0.85, 0.82], normal: [1, 1], offensiv: [1.14, 1.1] };

// Pokale: Spieltage (es werden die letzten n Termine für n Runden genutzt)
const CUP_DAYS = {
  dfb: [4, 9, 15, 21, 27, 32],
  lp: [2, 6, 10, 14, 18, 23, 28, 33],
  bz: [3, 7, 11, 16, 20, 25, 30],
  kp: [1, 5, 8, 12, 17, 22, 26, 29, 31],
};
const CUP_PRIZE = {
  dfb: [210000, 420000, 840000, 1680000, 3360000, 4320000],
  lp: [1000, 2000, 4000, 8000, 15000, 25000, 40000, 60000],
  bz: [300, 600, 1200, 2500, 5000, 8000, 12000],
  kp: [100, 200, 400, 800, 1500, 2500, 4000, 6000, 9000],
};
export const VERBAENDE = {
  BAY: "Bayern", BAD: "Baden", SBD: "Südbaden", WUE: "Württemberg", HES: "Hessen", SW: "Südwest", RHL: "Rheinland",
  SAA: "Saarland", MRH: "Mittelrhein", NRH: "Niederrhein", WFL: "Westfalen", NDS: "Niedersachsen", HB: "Bremen",
  HH: "Hamburg", SH: "Schleswig-Holstein", B: "Berlin", BB: "Brandenburg", MV: "Mecklenburg-Vorpommern",
  SN: "Sachsen", ST: "Sachsen-Anhalt", TH: "Thüringen",
};


// Investoren-Profile (Startkapital = Privatvermögen)
export const INVESTORS = [
  { id: "kiosk", title: "Kioskbesitzer", desc: "Kennt jeden im Viertel, sponsert seit Jahren die Trikots der Alten Herren.", capital: 25000 },
  { id: "doener", title: "Besitzer eines Döner-Imbiss", desc: "Bester Döner der Stadt, Stammplatz am Vereinsheim, große Pläne.", capital: 60000 },
  { id: "pizza", title: "Pizzeria-Besitzer", desc: "Zwei Lokale, ein Lieferdienst und ein Herz für den Amateurfußball.", capital: 90000 },
  { id: "dach", title: "Dachdeckermeister", desc: "Eigener Betrieb mit 15 Leuten, spielt selbst noch in der Ü40.", capital: 250000 },
  { id: "steuer", title: "Steuerberater", desc: "Kennt jede Zahl und will endlich, dass die Kasse im Verein stimmt.", capital: 300000 },
  { id: "apotheke", title: "Lokaler Apotheker", desc: "Zwei Apotheken in der Innenstadt, seit 20 Jahren Vereinsmitglied.", capital: 350000 },
  { id: "getraenke", title: "Getränkehändler", desc: "Beliefert halb den Landkreis – und bald das eigene Vereinsheim.", capital: 400000 },
  { id: "zahnarzt", title: "Zahnärztin mit eigener Praxis", desc: "Erfolgreiche Praxis, ehemalige Torjägerin der Frauenmannschaft.", capital: 450000 },
  { id: "landwirt", title: "Landwirt mit Biogasanlage", desc: "Strom vom Acker, Rasen vom Feinsten – der Platz ist schon da.", capital: 700000 },
  { id: "makler", title: "Immobilienmakler", desc: "Verkauft Neubaugebiete und träumt vom eigenen Stadion.", capital: 900000 },
  { id: "baecker", title: "Inhaberin einer Bäckereikette", desc: "Zwölf Filialen, Brötchen für jedes Heimspiel inklusive.", capital: 1200000 },
  { id: "influencer", title: "Fußball-Influencerin", desc: "1,2 Mio. Follower und eine Mission: Kreisliga wird Kult.", capital: 1500000 },
  { id: "autohaus", title: "Autohaus-Inhaber", desc: "Drei Marken, fünf Standorte, der Mannschaftsbus ist schon reserviert.", capital: 1800000 },
  { id: "fitness", title: "Gründer einer Fitnessstudio-Kette", desc: "Acht Studios – die Mannschaft wird die fitteste der Liga.", capital: 2500000 },
  { id: "lotto", title: "Lottogewinner", desc: "Sechs Richtige plus Superzahl. Und jetzt: ein eigener Verein.", capital: 3500000 },
  { id: "exprofi", title: "Ehemaliger Bundesligaprofi", desc: "200 Erstligaspiele, gutes Gespür für Talente, wenig Geduld.", capital: 4000000 },
  { id: "bau", title: "Bauunternehmer", desc: "Baut Straßen, Brücken – und demnächst eine neue Tribüne.", capital: 6000000 },
  { id: "brauerei", title: "Regionale Privatbrauerei", desc: "Familienbrauerei in fünfter Generation, Bierstand inklusive.", capital: 8000000 },
  { id: "startup", title: "Tech-Gründerin nach Firmenverkauf", desc: "App verkauft, Millionen auf dem Konto, Datenanalyse im Blut.", capital: 12000000 },
  { id: "logistik", title: "Logistikunternehmer", desc: "400 Lkw auf Europas Straßen – Effizienz ist alles.", capital: 15000000 },
  { id: "maschinenbau", title: "Mittelständischer Maschinenbauer", desc: "Weltmarktführer in einer Nische, die niemand kennt.", capital: 25000000 },
  { id: "moebel", title: "Erbe eines Möbelhaus-Imperiums", desc: "Hat nie gearbeitet, aber viel Zeit für Fußball.", capital: 30000000 },
  { id: "wind", title: "Windpark-Betreiberin", desc: "Grüner Strom für 200.000 Haushalte, grüner Rasen fürs Team.", capital: 40000000 },
  { id: "supermarkt", title: "Regionale Supermarktkette", desc: "120 Märkte im Norden – Werbefläche gibt es reichlich.", capital: 60000000 },
  { id: "pe", title: "Private-Equity-Fonds", desc: "Renditeorientiert, mit Fünfjahresplan und Beraterteam.", capital: 150000000 },
  { id: "sportwagen", title: "Sportwagenhersteller", desc: "Schnelle Autos, schneller Aufstieg – so der Plan.", capital: 200000000 },
  { id: "pharma", title: "Pharmakonzern", desc: "Werksclub-Tradition neu gedacht. Medizinische Abteilung top.", capital: 300000000 },
  { id: "sportartikel", title: "Globaler Sportartikelhersteller", desc: "Ausrüster von Weltmeistern sucht ein Herzensprojekt.", capital: 400000000 },
  { id: "brause", title: "Globaler Brauselieferant", desc: "Zuckerwasser in 170 Ländern – und Flügel für den Dorfverein.", capital: 750000000 },
  { id: "techmilliardaer", title: "Tech-Milliardär", desc: "Raketen, Netzwerke, KI – und jetzt die 3. Kreisklasse.", capital: 1000000000 },
];
export const CUSTOM_CAPITAL = { min: 10000, max: 1000000000 };

// ---------------------------------------------------------------- Namen
const FIRST = ["Lukas","Leon","Finn","Jonas","Paul","Luis","Felix","Elias","Noah","Ben","Tim","Jan","Max","Nico","Moritz","Tom","Erik","Linus","David","Simon","Fabian","Julian","Marvin","Kevin","Dennis","Florian","Sebastian","Tobias","Marcel","Dominik","Patrick","Christian","Daniel","Philipp","Kai","Sven","Lars","Malte","Ole","Hannes","Mats","Till","Jannik","Yannick","Niklas","Robin","Pascal","Mehmet","Emre","Can","Deniz","Yusuf","Ali","Kerem","Arda","Luca","Matteo","Marco","Alessandro","Mateo","Diego","Rafael","Tiago","João","Ivan","Luka","Marko","Nikola","Stefan","Milan","Adam","Kacper","Jakub","Mateusz","Oskar","Emil","Anton","Henrik","Mikkel","Lasse","Kofi","Kwame","Samuel","Ibrahim","Moussa","Amadou","Youssef","Omar","Karim","Jamal","Tyler","Ryan","Liam","Aaron","Joel","Levin","Bastian","Dustin","Torben","Henning"];
const LAST = ["Müller","Schmidt","Schneider","Fischer","Weber","Meyer","Wagner","Becker","Schulz","Hoffmann","Koch","Richter","Klein","Wolf","Schröder","Neumann","Schwarz","Zimmermann","Braun","Krüger","Hofmann","Hartmann","Lange","Schmitt","Werner","Krause","Meier","Lehmann","Schmid","Schulze","Maier","Köhler","Herrmann","König","Walter","Mayer","Huber","Kaiser","Fuchs","Peters","Lang","Scholz","Möller","Weiß","Jung","Hahn","Vogel","Friedrich","Keller","Günther","Frank","Berger","Winkler","Roth","Beck","Lorenz","Baumann","Franke","Albrecht","Schuster","Simon","Ludwig","Böhm","Winter","Kraus","Martin","Schumacher","Krämer","Vogt","Stein","Jäger","Otto","Sommer","Groß","Seidel","Heinrich","Brandt","Haas","Schreiber","Graf","Dietrich","Ziegler","Kuhn","Kühn","Pohl","Engel","Horn","Busch","Bergmann","Thomas","Voigt","Sauer","Arnold","Wolff","Pfeiffer","Yılmaz","Kaya","Demir","Şahin","Çelik","Öztürk","Aydın","Rossi","Bianchi","Ferrari","Novak","Kovač","Horvat","Jovanović","Petrović","Nowak","Kowalski","Wiśniewski","Hansen","Nielsen","Jensen","Larsen","Diallo","Traoré","Mensah","Owusu","Haddad","Benali","Silva","Santos","Costa","Pereira","García","López","Martínez"];
function nameFrom(rng) { return FIRST[Math.floor(rng() * FIRST.length)] + " " + LAST[Math.floor(rng() * LAST.length)]; }

// ---------------------------------------------------------------- Welt aufbauen
export function createState(world, seasonSeed1) {
  const S = {
    season: 1, day: 0, teams: new Map(), clubs: new Map(), leagues: new Map(), groups: new Map(),
    pools: new Map(), cups: [], users: new Map(), news: [], history: [], taken: new Set(), freeAgents: [],
    seasonSeed: seasonSeed1, cupWinners: {}, prevThird: [], lastTables: new Map(), nextId: 1,
    trophies: new Map(), eternal: new Map(), scorers: new Map(), squadCache: new Map(), records: { maxPts: null, bigWin: null, maxGoals: null },
  };
  for (const l of world.leagues) {
    S.leagues.set(l.id, { id: l.id, name: l.name, level: l.level, group: l.group, teams: [] });
    if (!S.groups.has(l.group)) S.groups.set(l.group, { id: l.group, level: l.level, leagues: [] });
    S.groups.get(l.group).leagues.push(l.id);
  }
  const counts = {};
  for (const t of world.teams) counts[t.league] = (counts[t.league] || 0) + 1;
  const nameToTeam = new Map();
  world.teams.forEach((wt, i) => {
    const lg = S.leagues.get(wt.league);
    const id = "t" + i;
    const n = counts[wt.league];
    const pr = n > 1 ? wt.pos / (n - 1) : 0;
    const noise = (rngFrom("init", wt.name)() - 0.5) * 0.06;
    const str = r2((LV[lg.level].top - (LV[lg.level].top - LV[lg.level].bot) * pr) * (1 + noise));
    const home = {}; for (const k in wt.home) home[k] = wt.home[k];
    const t = { id, name: wt.name, clubId: null, rank: 1, str, home, verband: wt.verband, bezirk: wt.bezirk, kreis: wt.kreis,
      league: wt.league, group: lg.group, level: lg.level, status: "active", initPos: wt.pos, parentName: wt.parent };
    S.teams.set(id, t); nameToTeam.set(wt.name, t);
    lg.teams.push(id);
  });
  // Vereine
  for (const t of S.teams.values()) {
    if (t.parentName && nameToTeam.has(t.parentName)) continue;
    const c = newClub(S, "c" + t.id.slice(1), t.name, t);
    t.clubId = c.id;
  }
  for (const t of S.teams.values()) {
    if (!t.parentName || !nameToTeam.has(t.parentName)) continue;
    const p = nameToTeam.get(t.parentName);
    const c = S.clubs.get(p.clubId);
    t.clubId = c.id;
    t.rank = /\bIV\b/.test(t.name) ? 4 : /\bIII\b|\s3$/.test(t.name) ? 3 : 2;
    c.teams.push(t.id);
  }
  // Startaufstellung: auf 18 normalisieren (Überzählige steigen ab, Fehlende werden von unten aufgefüllt)
  const rank = new Map();
  for (const t of S.teams.values()) rank.set(t.id, { pos: t.initPos, ppg: 0 });
  const moves = normalize(S, rank, false);
  S.initialMoves = moves;
  startSeason(S);
  return S;
}

function newClub(S, id, name, firstTeam) {
  const c = { id, name, verband: firstTeam.verband, bezirk: firstTeam.bezirk, kreis: firstTeam.kreis, teams: [firstTeam.id],
    owner: null, h: null };
  S.clubs.set(id, c);
  return c;
}
export const firstTeam = (S, club) => S.teams.get(club.teams[0]);

// Fiktiver Unterbau: Ligen ohne echte Liga darunter bekommen Aufsteiger aus erfundenen Vereinen (echte Orte)
const TOWNS = {
  ol_hh: ["Bergedorf","Wilhelmsburg","Rahlstedt","Barmbek","Harburg","Lurup","Billstedt","Volksdorf","Eidelstedt","Wedel","Finkenwerder","Lokstedt"],
  ol_hb: ["Huchting","Arsten","Lesum","Vahr","Osterholz","Gröpelingen","Habenhausen","Walle","Findorff","Borgfeld","Obervieland","Hastedt"],
  ol_sh: ["Itzehoe","Husum","Bad Segeberg","Elmshorn","Schleswig","Rendsburg","Preetz","Plön","Ratzeburg","Mölln","Bad Oldesloe","Brunsbüttel"],
  ol_nofvn: ["Prenzlau","Güstrow","Pasewalk","Eberswalde","Oranienburg","Spandau","Köpenick","Neuruppin","Waren","Parchim","Wittstock","Bernau"],
  ol_nofvs: ["Gotha","Zeitz","Döbeln","Torgau","Merseburg","Sangerhausen","Pirna","Ilmenau","Altenburg","Riesa","Grimma","Sonneberg"],
  ol_wfl: ["Ahlen","Hamm","Lünen","Unna","Iserlohn","Soest","Arnsberg","Beckum","Gronau","Coesfeld","Warendorf","Meschede"],
  ol_nrh: ["Kleve","Moers","Wesel","Dinslaken","Kempen","Goch","Emmerich","Viersen","Langenfeld","Remscheid","Geldern","Xanten"],
  ol_mrh: ["Euskirchen","Bergheim","Kerpen","Brühl","Eschweiler","Stolberg","Troisdorf","Wesseling","Erftstadt","Overath","Gummersbach","Heinsberg"],
  ol_rps: ["Bad Kreuznach","Neuwied","Landau","Speyer","Zweibrücken","Merzig","St. Wendel","Mayen","Andernach","Bingen","Saarlouis","Idar-Oberstein"],
  ol_hes: ["Wetzlar","Limburg","Bad Hersfeld","Gelnhausen","Bensheim","Dieburg","Korbach","Eschwege","Bad Vilbel","Idstein","Alsfeld","Büdingen"],
  ol_bw: ["Ludwigsburg","Göppingen","Ellwangen","Offenburg","Lörrach","Tuttlingen","Sinsheim","Bruchsal","Biberach","Waiblingen","Rastatt","Crailsheim"],
  ol_byn: ["Amberg","Erlangen","Forchheim","Kulmbach","Coburg","Schwabach","Kitzingen","Lichtenfels","Marktredwitz","Bad Kissingen","Haßfurt","Neustadt an der Aisch"],
  ol_bys: ["Dachau","Freising","Erding","Kaufbeuren","Kempten","Traunstein","Starnberg","Weilheim","Mühldorf","Neu-Ulm","Rosenheim-Süd","Pfaffenhofen-West"],
  ll_bs: ["Peine","Salzgitter-Bad","Goslar","Osterode","Einbeck","Wittingen","Helmstedt","Seesen","Duderstadt","Hann. Münden","Clausthal","Meinersen"],
  ll_lg: ["Stade","Buxtehude","Winsen","Soltau","Uelzen","Walsrode","Zeven","Bremervörde","Achim","Lilienthal","Tostedt","Dannenberg"],
  ll_we: ["Aurich","Leer","Cloppenburg","Vechta","Quakenbrück","Lingen","Westerstede","Varel","Brake","Norden","Haselünne","Damme"],
};
const PREFIX = ["SV","TSV","FC","VfL","SC","TuS","SpVgg","VfB","Eintracht","Germania","Union","Viktoria"];
const RL_OF = { ol_hh:"rl_n", ol_hb:"rl_n", ol_sh:"rl_n", ol_nofvn:"rl_no", ol_nofvs:"rl_no", ol_wfl:"rl_w", ol_nrh:"rl_w", ol_mrh:"rl_w",
  ol_rps:"rl_sw", ol_hes:"rl_sw", ol_bw:"rl_sw", ol_byn:"rl_by", ol_bys:"rl_by", ll_bs:"rl_n", ll_lg:"rl_n", ll_we:"rl_n" };
const VB_OF = { ol_hh:"HH", ol_hb:"HB", ol_sh:"SH", ol_nofvn:"B", ol_nofvs:"SN", ol_wfl:"WFL", ol_nrh:"NRH", ol_mrh:"MRH", ol_rps:"SW",
  ol_hes:"HES", ol_bw:"WUE", ol_byn:"BAY", ol_bys:"BAY", ll_bs:"NDS", ll_lg:"NDS", ll_we:"NDS" };
function makeFictional(S, G) {
  const rng = rngFrom(S.seasonSeed, S.season, "fict", G.id, S.nextId);
  const towns = TOWNS[G.id];
  let name = null;
  for (let k = 0; k < 40 && !name; k++) {
    const n = PREFIX[Math.floor(rng() * PREFIX.length)] + " " + towns[Math.floor(rng() * towns.length)];
    if (![...S.teams.values()].some((t) => t.name === n)) name = n;
  }
  if (!name) name = "SV " + towns[0] + " " + S.nextId;
  const id = "tf" + S.nextId++;
  const next = G.level + 1;
  const top = next <= 11 ? LV[next].top : LV[11].top;
  const home = { 1: "bl", 2: "2bl", 3: "3l", 4: RL_OF[G.id] };
  if (G.level === 5) home[5] = G.id; else { home[5] = "ol_nds"; home[6] = G.id; }
  const t = { id, name, clubId: "c" + id, rank: 1, str: r2(top * (0.95 + rng() * 0.1)), home, verband: VB_OF[G.id], bezirk: null, kreis: null,
    league: null, group: null, level: 12, status: "pool", poolOf: G.id, fict: true };
  S.teams.set(id, t);
  newClub(S, t.clubId, name, t);
  return id;
}

// ---------------------------------------------------------------- Normalisierung (Auf-/Abstieg, 18er-Ligen)
// rank: teamId -> {pos (0 = Erster), ppg}. standard=true: reguläre Absteiger je Liga.
export function normalize(S, rank, standard, forcedIn = new Map()) {
  const assign = new Map(); // teamId -> group id | "pool:<gid>"
  for (const t of S.teams.values()) {
    if (t.status === "active") assign.set(t.id, t.group);
    else if (t.status === "pool") assign.set(t.id, "pool:" + t.poolOf);
  }
  for (const [tid, gid] of forcedIn) assign.set(tid, gid);
  const moves = [];
  const levelOfAssign = (a) => (a && !a.startsWith("pool:") ? S.groups.get(a).level : 99);
  const clubFirstLevel = (t) => {
    const c = S.clubs.get(t.clubId); if (!c) return 99;
    return levelOfAssign(assign.get(c.teams[0]));
  };
  const rk = (id) => rank.get(id) || { pos: 99, ppg: 0 };
  const worstFirst = (a, b) => (rk(b).pos - rk(a).pos) || (rk(a).ppg - rk(b).ppg) || (S.teams.get(a).str - S.teams.get(b).str) || (a < b ? -1 : 1);
  const bestFirst = (a, b) => (rk(a).pos - rk(b).pos) || (rk(b).ppg - rk(a).ppg) || (S.teams.get(b).str - S.teams.get(a).str) || (a < b ? -1 : 1);
  const relegate = (tid, fromGid, L) => {
    const t = S.teams.get(tid);
    let to = null;
    for (let k = L + 1; k <= 11; k++) { const h = t.home[k]; if (h && S.groups.has(h)) { to = h; break; } }
    if (!to) to = "pool:" + fromGid;
    assign.set(tid, to);
    moves.push({ team: tid, from: fromGid, to, type: "down" });
  };
  const groupsByLevel = [...S.groups.values()].sort((a, b) => a.level - b.level || (a.id < b.id ? -1 : 1));
  const justRelegated = new Set();
  for (const G of groupsByLevel) {
    const L = G.level;
    const cap = LEAGUE_SIZE * G.leagues.length;
    let members = [...assign.entries()].filter(([, g]) => g === G.id).map(([id]) => id);
    const original = new Set(G.leagues.flatMap((lid) => S.leagues.get(lid).teams));
    // Zweitmannschaften dürfen nicht auf/über der Ebene der ersten Mannschaft spielen
    for (const tid of [...members]) {
      const t = S.teams.get(tid);
      if (t.rank > 1 && clubFirstLevel(t) >= L) { relegate(tid, G.id, L); justRelegated.add(tid); members = members.filter((x) => x !== tid); }
    }
    // Kandidaten von unten
    const candidates = () => {
      const real = [...assign.entries()].filter(([id, g]) => {
        if (!g || g.startsWith("pool:") || justRelegated.has(id)) return false;
        const gr = S.groups.get(g); if (gr.level <= L) return false;
        const t = S.teams.get(id); if (t.home[L] !== G.id) return false;
        if (t.rank > 1 && clubFirstLevel(t) >= L) return false;
        return gr.level === L + 1 || !hasGroupAt(S, t, L + 1);
      }).map(([id]) => id).sort(bestFirst);
      const pool = [...assign.entries()].filter(([id, g]) => g === "pool:" + G.id && !justRelegated.has(id))
        .map(([id]) => id).filter((id) => { const t = S.teams.get(id); return !(t.rank > 1 && clubFirstLevel(t) >= L); })
        .sort((a, b) => (S.teams.get(b).str - S.teams.get(a).str) || (a < b ? -1 : 1));
      return real.concat(pool);
    };
    const kk3Off = G.id.endsWith("_kk2") && [...assign.values()].filter((g) => g === G.id.replace("_kk2", "_kk3")).length < MIN_KK3;
    if (standard && !kk3Off) {
      const k = DOWN[L] * G.leagues.length;
      const avail = TOWNS[G.id] ? 99 : candidates().length;
      let x = Math.min(k, Math.max(0, avail + members.length - cap));
      const perLeague = G.leagues.map((lid) => S.leagues.get(lid).teams.filter((id) => assign.get(id) === G.id).sort(worstFirst));
      for (let i = 0; x > 0 && i < DOWN[L]; i++) {
        for (const own of perLeague) {
          if (x <= 0) break;
          const tid = own[i]; if (!tid || !members.includes(tid)) continue;
          relegate(tid, G.id, L); justRelegated.add(tid); members = members.filter((m) => m !== tid); x--;
        }
      }
    }
    // Überzählige
    if (members.length > cap) {
      const sorted = members.slice().sort((a, b) => {
        const ao = original.has(a) ? 0 : 1, bo = original.has(b) ? 0 : 1;
        return (ao - bo) || worstFirst(a, b);
      });
      const extra = sorted.slice(0, members.length - cap);
      for (const tid of extra) { relegate(tid, G.id, L); justRelegated.add(tid); }
      members = members.filter((x) => !extra.includes(x));
    }
    // Auffüllen
    if (members.length < cap) {
      const need = cap - members.length;
      const cand = candidates().slice(0, need);
      if (TOWNS[G.id]) while (cand.length < need) { const fid = makeFictional(S, G); assign.set(fid, "pool:" + G.id); cand.push(fid); }
      for (const tid of cand) {
        moves.push({ team: tid, from: assign.get(tid), to: G.id, type: "up" });
        assign.set(tid, G.id); members.push(tid);
      }
    }
  }
  // 3. Kreisklasse weglassen, wenn zu wenige Teams: diese bleiben in der Klasse darüber, sofern dort Platz ist
  for (const G of S.groups.values()) {
    if (!G.id.endsWith("_kk3")) continue;
    const mem = [...assign.entries()].filter(([, g]) => g === G.id).map(([id]) => id);
    if (!mem.length || mem.length >= MIN_KK3) continue;
    const upId = G.id.replace("_kk3", "_kk2"); const up = S.groups.get(upId); if (!up) continue;
    const capUp = LEAGUE_SIZE * up.leagues.length;
    let n = [...assign.values()].filter((g) => g === upId).length;
    for (const tid of mem.sort((a, b) => (S.teams.get(b).str - S.teams.get(a).str) || (a < b ? -1 : 1))) {
      if (n >= capUp) break;
      const t = S.teams.get(tid); if (t.rank > 1 && clubFirstLevel(t) >= up.level) continue;
      assign.set(tid, upId); n++;
    }
    // wer keinen Platz mehr findet, pausiert im Unterbau und rückt nach, sobald in der 2. Kreisklasse Platz ist
    for (const tid of mem) if (assign.get(tid) === G.id) assign.set(tid, "pool:" + upId);
  }
  // Anwenden: Teams auf Ligen der Gruppe verteilen
  for (const G of S.groups.values()) {
    const members = [...assign.entries()].filter(([, g]) => g === G.id).map(([id]) => id);
    let per = G.leagues.map((lid) => ({ lid, teams: S.leagues.get(lid).teams.filter((id) => assign.get(id) === G.id) }));
    const k = Math.max(1, Math.ceil(members.length / LEAGUE_SIZE));
    const active = per.slice().sort((a, b) => b.teams.length - a.teams.length || (a.lid < b.lid ? -1 : 1)).slice(0, k).map((p) => p.lid);
    for (const p of per) if (!active.includes(p.lid)) { S.leagues.get(p.lid).teams = []; p.teams = []; }
    per = per.filter((p) => active.includes(p.lid));
    // gleichmäßig verteilen: aus vollen Staffeln an leere abgeben
    const placed = new Set(per.flatMap((p) => p.teams));
    const target = Math.ceil(members.length / per.length);
    for (const p of per) while (p.teams.length > target) { const x = p.teams.pop(); placed.delete(x); }
    // zu volle Ligen entlasten
    for (const p of per) while (p.teams.length > LEAGUE_SIZE) { const x = p.teams.pop(); placed.delete(x); }
    const newcomers = members.filter((id) => !placed.has(id)).sort((a, b) => (a < b ? -1 : 1));
    for (const id of newcomers) {
      per.sort((a, b) => a.teams.length - b.teams.length || (a.lid < b.lid ? -1 : 1));
      per[0].teams.push(id);
    }
    for (const p of per) {
      S.leagues.get(p.lid).teams = p.teams;
      for (const id of p.teams) { const t = S.teams.get(id); t.league = p.lid; t.group = G.id; t.level = G.level; t.status = "active"; t.poolOf = null; }
    }
  }
  for (const [id, a] of assign) {
    if (a.startsWith("pool:")) { const t = S.teams.get(id); t.status = "pool"; t.poolOf = a.slice(5); t.league = null; t.group = null; t.level = 12; }
  }
  return moves;
}
function hasGroupAt(S, t, L) { const h = t.home[L]; return !!(h && S.groups.has(h)); }

// ---------------------------------------------------------------- Saisonstart
function seasonRng(S, ...p) { return rngFrom(S.seasonSeed, S.season, ...p); }

function roundRobin(ids, rng) {
  const a = ids.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  if (a.length % 2) a.push(null);
  const n = a.length, rounds = [];
  const arr = a.slice();
  for (let r = 0; r < n - 1; r++) {
    const pairs = [];
    for (let i = 0; i < n / 2; i++) {
      const x = arr[i], y = arr[n - 1 - i];
      if (x && y) pairs.push(r % 2 === 0 ? [x, y] : [y, x]);
    }
    rounds.push(pairs);
    arr.splice(1, 0, arr.pop());
  }
  const second = rounds.map((p) => p.map(([h, g]) => [g, h]));
  return rounds.concat(second);
}

export function startSeason(S) {
  S.scorers = new Map(); S.squadCache = new Map();
  for (const lg of S.leagues.values()) {
    const rng = seasonRng(S, "sched", lg.id);
    const rounds = roundRobin(lg.teams, rng);
    lg.fixtures = {}; // day -> [[h,a,gh,ga]]
    rounds.forEach((pairs, r) => {
      const day = Math.floor((r * MATCHDAYS) / rounds.length) + 1;
      lg.fixtures[day] = pairs.map(([h, a]) => ({ h, a, gh: null, ga: null }));
    });
    lg.table = new Map(lg.teams.map((id) => [id, { id, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 }]));
  }
  for (const t of S.teams.values()) { t.fatigue = 0; t.form = 0; }
  setupCups(S);
  for (const c of S.clubs.values()) if (c.h) seasonStartHuman(S, c);
}

// ---------------------------------------------------------------- Pokale
function eligibleFirst(S, t) { return t && t.status === "active" && t.rank === 1; }
function setupCups(S) {
  S.cups = [];
  const prev = S.cupWinners; // {cupId: {winner, runnerUp}}
  const firsts = [...S.teams.values()].filter((t) => eligibleFirst(S, t));
  const byStanding = (a, b) => a.level - b.level || (S.lastRank?.get(a.id)?.pos ?? a.initPos ?? 99) - (S.lastRank?.get(b.id)?.pos ?? b.initPos ?? 99) || b.str - a.str;
  // Kreispokale
  const kp = {};
  for (const k of ["RH", "HM"]) {
    const ent = firsts.filter((t) => t.level >= 8 && t.kreis === k).map((t) => t.id);
    kp[k] = makeCup(S, "kp_" + k, k === "RH" ? "Kreispokal Region Hannover" : "Kreispokal Hameln-Pyrmont", "kp", ent);
  }
  // Bezirkspokal Hannover
  const bzEnt = new Set(firsts.filter((t) => t.level === 6 && t.group === "ll_han" || t.level === 7 && t.group === "bzl_han").map((t) => t.id));
  for (const k of ["RH", "HM"]) {
    let w = prev["kp_" + k]?.winner;
    if (!w || !eligibleFirst(S, S.teams.get(w))) w = firsts.filter((t) => t.level >= 8 && t.kreis === k).sort(byStanding)[0]?.id;
    if (w) bzEnt.add(w);
  }
  makeCup(S, "bz_HAN", "Bezirkspokal Hannover", "bz", [...bzEnt]);
  // Landespokale
  const lpWin = {};
  for (const v of Object.keys(VERBAENDE)) {
    const ent = new Set(firsts.filter((t) => t.verband === v && t.level >= 3 && (t.level <= 5 || (v === "NDS" && t.level === 6 && t.group !== "ll_han"))).map((t) => t.id));
    if (v === "NDS") {
      let w = prev["bz_HAN"]?.winner;
      if (!w || !eligibleFirst(S, S.teams.get(w)) || S.teams.get(w).level <= 2) w = firsts.filter((t) => t.group === "ll_han").sort(byStanding)[0]?.id;
      if (w) ent.add(w);
    }
    if (ent.size >= 2) makeCup(S, "lp_" + v, "Landespokal " + VERBAENDE[v], "lp", [...ent]);
  }
  // DFB-Pokal
  const dfb = new Set(firsts.filter((t) => t.level <= 2).map((t) => t.id));
  const addIf = (id) => { const t = S.teams.get(id); if (t && eligibleFirst(S, t) && !dfb.has(id) && dfb.size < 64) dfb.add(id); };
  for (const v of Object.keys(VERBAENDE)) {
    let w = prev["lp_" + v]?.winner;
    const cand = firsts.filter((t) => t.verband === v && t.level >= 3 && t.level <= 6).sort(byStanding);
    if (!w) w = cand.find((t) => !dfb.has(t.id))?.id;
    if (w) addIf(w);
  }
  for (const v of ["BAY", "NDS", "WFL"]) {
    let r = prev["lp_" + v]?.runnerUp;
    const cand = firsts.filter((t) => t.verband === v && t.level >= 3 && t.level <= 6).sort(byStanding);
    if (!r || dfb.has(r)) r = cand.find((t) => !dfb.has(t.id))?.id;
    if (r) addIf(r);
  }
  const third = firsts.filter((t) => t.level === 3).sort(byStanding);
  for (const t of third) { if (dfb.size >= 64) break; addIf(t.id); }
  makeCup(S, "dfb", "DFB-Pokal", "dfb", [...dfb]);
}

function makeCup(S, id, name, type, entrants) {
  const n = entrants.length;
  const R = Math.max(1, Math.ceil(Math.log2(n)));
  const days = CUP_DAYS[type].slice(-R);
  const cup = { id, name, type, entrants: entrants.slice(), days, rounds: [], alive: entrants.slice(), winner: null, runnerUp: null };
  S.cups.push(cup);
  drawRound(S, cup, 0, seasonRng(S, "draw", id, 0));
  return cup;
}

function drawRound(S, cup, ri, rng) {
  if (ri >= cup.days.length || cup.alive.length < 2) return;
  const alive = cup.alive.slice().sort((a, b) => (a < b ? -1 : 1));
  for (let i = alive.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [alive[i], alive[j]] = [alive[j], alive[i]]; }
  const slots = Math.pow(2, cup.days.length - ri);
  const byes = Math.max(0, slots - alive.length);
  // Freilose an die stärksten (höchste Spielklasse)
  const strong = alive.slice().sort((a, b) => S.teams.get(a).level - S.teams.get(b).level || S.teams.get(b).str - S.teams.get(a).str || (a < b ? -1 : 1));
  const byeSet = new Set(strong.slice(0, byes));
  const rest = alive.filter((x) => !byeSet.has(x));
  const matches = [];
  for (let i = 0; i + 1 < rest.length; i += 2) {
    let h = rest[i], a = rest[i + 1];
    if (S.teams.get(a).level > S.teams.get(h).level) [h, a] = [a, h]; // Unterklassiger hat Heimrecht
    matches.push({ h, a, gh: null, ga: null, et: false, pen: null, winner: null });
  }
  cup.rounds[ri] = { day: cup.days[ri], matches, byes: [...byeSet] };
}

// ---------------------------------------------------------------- Spiel
export function teamStrength(S, t) {
  const c = S.clubs.get(t.clubId);
  if (t.rank === 1 && c && c.h) return humanXI(S, c).str;
  return t.str;
}
function playMatch(S, h, a, rng, neutral = false) {
  const th = S.teams.get(h), ta = S.teams.get(a);
  let sh = teamStrength(S, th) * (1 - (th.fatigue || 0)), sa = teamStrength(S, ta) * (1 - (ta.fatigue || 0));
  const ch = S.clubs.get(th.clubId), ca = S.clubs.get(ta.clubId);
  const tacH = th.rank === 1 && ch?.h ? TACTICS[ch.h.tactic] : TACTICS.normal;
  const tacA = ta.rank === 1 && ca?.h ? TACTICS[ca.h.tactic] : TACTICS.normal;
  const rel = ((sh - sa) / Math.max(1, (sh + sa) / 2)) * 100 + (neutral ? 0 : 6);
  const f = (x) => clamp(x <= -60 ? 0.08 : Math.pow(1 + x / 60, 2), 0.08, 4.5);
  let lh = r4(1.35 * f(rel) * tacH[0] * tacA[1] * (0.85 + 0.3 * rng()));
  let la = r4(1.1 * f(-rel) * tacA[0] * tacH[1] * (0.85 + 0.3 * rng()));
  const goals = (l) => { let g = 0; const p = Math.min(0.85, l / 10); for (let i = 0; i < 10; i++) if (rng() < p) g++; return g; };
  return { gh: goals(lh), ga: goals(la), lh, la, rel };
}

// ---------------------------------------------------------------- Menschliche Vereine
function genPlayer(rng, pos, str, age, idPrefix, i) {
  const pot = r2(clamp(str * (age < 21 ? 1.25 + rng() * 0.35 : age < 25 ? 1.08 + rng() * 0.2 : 1 + rng() * 0.05), str, 99.99));
  return { id: idPrefix + ":" + i, name: nameFrom(rng), pos, age, str: r2(clamp(str, 0.5, 99.99)), pot, wage: wageOf(str) };
}
const POS_PLAN = ["TW", "TW", "AB", "AB", "AB", "AB", "AB", "AB", "AB", "MF", "MF", "MF", "MF", "MF", "MF", "MF", "ST", "ST", "ST", "ST", "ST", "MF"];
export function aiSquad(S, t) {
  const rng = rngFrom(S.seasonSeed, S.season, "squad", t.id);
  const out = [];
  POS_PLAN.forEach((pos, i) => {
    const starter = i === 0 || (i >= 2 && i <= 5) || (i >= 9 && i <= 12) || (i >= 16 && i <= 17);
    let m = starter ? 0.94 + rng() * 0.12 : 0.74 + rng() * 0.2;
    if (rng() < 0.012 && t.level <= 2) m *= 1.07;
    const age = 18 + Math.floor(rng() * 17);
    const p = genPlayer(rng, pos, t.str * m, age, t.id + ":" + S.season, i);
    if (!S.taken.has(p.id)) out.push(p);
  });
  return out;
}

export function humanXI(S, c) {
  const h = c.h;
  const [nab, nmf, nst] = FORMATIONS[h.formation] || FORMATIONS["4-4-2"];
  const ps = h.players.slice().sort((a, b) => b.str - a.str || (a.id < b.id ? -1 : 1));
  const used = new Set(), xi = [];
  const take = (pos, n) => { for (const p of ps) { if (n <= 0) break; if (!used.has(p.id) && p.pos === pos) { used.add(p.id); xi.push({ p, eff: p.str }); n--; } } return n; };
  const missing = take("TW", 1) + take("AB", nab) + take("MF", nmf) + take("ST", nst);
  for (const p of ps) { if (xi.length >= 11) break; if (!used.has(p.id) && p.pos !== "TW") { used.add(p.id); xi.push({ p, eff: p.str * 0.8 }); } }
  while (xi.length < 11) xi.push({ p: null, eff: 0.5 });
  let str = xi.reduce((s, x) => s + x.eff, 0) / 11;
  if (h.trainer) str *= 1 + clamp((h.trainer.q / Math.max(1, str) - 1) * 0.03, -0.04, 0.04);
  return { str: r2(str), xi, missing };
}

function ledger(h, kind, cat, amount) {
  amount = eur(amount);
  if (!amount) return;
  const L = h.ledger[kind]; L[cat] = (L[cat] || 0) + amount;
  h.cash += kind === "in" ? amount : -amount;
}
function newLedger() { return { in: {}, out: {} }; }

function takeOver(S, c, userId, cash) {
  const t = firstTeam(S, c);
  const L = t.level <= 11 ? t.level : 11;
  const players = aiSquad(S, t).map((p) => ({ ...p, id: "h" + c.id + ":" + p.id }));
  const fac = LV[L].fac;
  c.owner = userId;
  c.h = {
    cash: eur(cash), players, trainer: null, fac: { jugend: fac, training: fac, umfeld: fac }, formation: "4-4-2", tactic: "normal",
    ticket: 1, sponsor: null, offers: [], reserves: {}, popularity: 1, ledger: newLedger(), annual: [], youthSeq: 0,
    trainers: [],
  };
  for (const tid of c.teams.slice(1)) c.h.reserves[S.teams.get(tid).rank] = { team: tid, active: true };
  seasonStartHuman(S, c, true);
}

function seasonStartHuman(S, c, initial = false) {
  const h = c.h, t = firstTeam(S, c);
  const L = Math.min(t.level, 11);
  const rng = rngFrom(S.seasonSeed, S.season, "offers", c.id);
  const base = LV[L].sponsor * (1 + 0.04 * h.fac.umfeld) * h.popularity;
  h.offers = [
    { id: "o1", name: sponsorName(rng), base: eur(base * (1.05 + rng() * 0.1)), win: 0, typ: "Sicherheit" },
    { id: "o2", name: sponsorName(rng), base: eur(base * (0.85 + rng() * 0.1)), win: eur((base / 34) * (0.6 + rng() * 0.4)), typ: "Ausgewogen" },
    { id: "o3", name: sponsorName(rng), base: eur(base * (0.55 + rng() * 0.1)), win: eur((base / 34) * (1.4 + rng() * 0.6)), typ: "Leistung" },
  ];
  h.sponsor = null;
  h.trainers = trainerPool(S, c);
  if (!initial) h.ledger = newLedger();
}
const SP1 = ["Autohaus", "Bäckerei", "Sparkasse", "Stadtwerke", "Brauerei", "Getränke", "Elektro", "Bau", "Versicherung", "Optik", "Logistik", "Immobilien", "Pflegedienst", "Dachdecker", "Fahrschule", "Energie", "IT-Systeme", "Möbelhaus"];
const SP2 = ["Nord", "Süd", "Weser", "Leine", "Hansa", "Union", "Krüger", "Meyer", "Schulte", "Hoffmann", "Becker", "Lange", "Brandt", "Vogel", "Heide", "Sonne", "Delta", "Kronen"];
function sponsorName(rng) { return SP1[Math.floor(rng() * SP1.length)] + " " + SP2[Math.floor(rng() * SP2.length)]; }
function trainerPool(S, c) {
  const rng = rngFrom(S.seasonSeed, S.season, "trainer", c.id);
  const L = Math.min(firstTeam(S, c).level, 11);
  const mid = levelMid(L);
  const out = [];
  for (let i = 0; i < 8; i++) {
    const q = r2(clamp(mid * (0.75 + rng() * 0.7), 1, 99));
    out.push({ id: "tr" + S.season + ":" + c.id + ":" + i, name: nameFrom(rng), q, wage: eur(wageOf(q) * 0.9), age: 32 + Math.floor(rng() * 30) });
  }
  return out.sort((a, b) => b.q - a.q);
}
export function marketFor(S, c, rngSeedDay) {
  const t = firstTeam(S, c);
  const rng = rngFrom(rngSeedDay, "market", c.id);
  const pool = [...S.teams.values()].filter((x) => x.status === "active" && Math.abs(x.level - t.level) <= 1 && x.clubId !== c.id && !S.clubs.get(x.clubId)?.h);
  const out = [];
  for (let i = 0; i < 6 && pool.length; i++) {
    const tm = pool[Math.floor(rng() * pool.length)];
    const sq = aiSquad(S, tm);
    for (let k = 0; k < 3 && sq.length; k++) {
      const p = sq[Math.floor(rng() * sq.length)];
      if (!out.find((x) => x.id === p.id)) out.push({ ...p, from: tm.id, price: valueOf(p) });
    }
  }
  for (const p of S.freeAgents.slice(-6)) out.push({ ...p, from: null, price: eur(valueOf(p) * 0.3) });
  return out.sort((a, b) => b.str - a.str);
}

export function facilityCost(S, c, kind) {
  const L = Math.min(firstTeam(S, c).level, 11);
  const lvl = c.h.fac[kind];
  if (lvl >= 10) return null;
  const scale = LV[L].fixed * 0.6;
  return eur(scale * (lvl + 1) * (lvl + 1) * (kind === "umfeld" ? 1.3 : 1));
}
export function clubPrice(S, c) {
  const t = firstTeam(S, c);
  if (t.level < 5 || t.status !== "active") return null;
  const L = t.level;
  const s = (t.str - LV[L].bot) / Math.max(1, LV[L].top - LV[L].bot);
  return eur(LV[L].value * (0.7 + 0.6 * clamp(s, 0, 1.2)));
}
export function reserveCost(S, c, rank) {
  const h = c.h; const t = firstTeam(S, c); const L = Math.min(t.level, 11);
  const wages = h.players.reduce((s, p) => s + p.wage, 0);
  const share = rank === 2 ? 0.06 : 0.03;
  const lvl = Math.min(11, L + (rank === 2 ? 3 : 5));
  return eur(wages * share + LV[lvl].fixed * 0.6 + LV[lvl].match * 17);
}
export function youthCost(S, c) {
  const L = Math.min(firstTeam(S, c).level, 11);
  return eur(LV[L].fixed * (0.1 + 0.06 * c.h.fac.jugend));
}

// ---------------------------------------------------------------- Aktionen
export function applyAction(S, a, userName, daySeed) {
  const fail = (msg) => { userNews(S, a.user_id, "Abgelehnt: " + msg); return false; };
  const P = a.payload || {};
  let u = S.users.get(a.user_id);
  if (!u) { u = { id: a.user_id, name: userName || "Spieler", clubId: null, wallet: 0, role: null, news: [] }; S.users.set(a.user_id, u); }
  if (userName) u.name = userName;
  const club = u.clubId ? S.clubs.get(u.clubId) : null;
  const h = club?.h;
  switch (a.type) {
    case "found": {
      if (club || u.pendingFound) return fail("Du hast bereits einen Verein.");
      const kreis = P.kreis === "HM" ? "HM" : "RH";
      const name = String(P.name || "").trim().slice(0, 40);
      if (name.length < 3) return fail("Vereinsname zu kurz.");
      if ([...S.teams.values()].some((t) => t.name.toLowerCase() === name.toLowerCase())) return fail("Name bereits vergeben.");
      const id = "n" + a.id;
      const g = kreis.toLowerCase() + "_kk3";
      const t = { id: "t" + id, name, clubId: "c" + id, rank: 1, str: r2(LV[11].bot * 0.9), home: { 1: "bl", 2: "2bl", 3: "3l", 4: "rl_n", 5: "ol_nds", 6: "ll_han", 7: "bzl_han", 8: kreis.toLowerCase() + "_kl", 9: kreis.toLowerCase() + "_kk1", 10: kreis.toLowerCase() + "_kk2", 11: g },
        verband: "NDS", bezirk: "HAN", kreis, league: null, group: null, level: 12, status: "pending", poolOf: g, founded: true };
      S.teams.set(t.id, t);
      const c = newClub(S, t.clubId, name, t);
      c.colors = P.colors || null;
      u.clubId = c.id; u.role = "Gründer"; u.wallet = 0;
      c.owner = a.user_id;
      const rng = rngFrom(daySeed, "found", id);
      c.h = { cash: 50000, players: [], trainer: null, fac: { jugend: 0, training: 0, umfeld: 0 }, formation: "4-4-2", tactic: "normal", ticket: 1,
        sponsor: null, offers: [], reserves: {}, popularity: 0.8, ledger: newLedger(), annual: [], youthSeq: 0, trainers: [] };
      POS_PLAN.slice(0, 18).forEach((pos, i) => c.h.players.push(genPlayer(rng, pos, LV[11].bot * (0.75 + rng() * 0.5), 17 + Math.floor(rng() * 16), "h" + id, i)));
      seasonStartHuman(S, c, true);
      news(S, `Neugründung: ${name} (${kreis === "RH" ? "Region Hannover" : "Hameln-Pyrmont"}) startet zur nächsten Saison in der untersten Spielklasse.`);
      userNews(S, a.user_id, `${name} ist gegründet. Ihr startet zur nächsten Saison in der untersten Spielklasse eures Kreises.`);
      return true;
    }
    case "investor": {
      if (club || u.role) return fail("Du hast bereits eine Rolle.");
      let inv;
      if (P.custom) {
        const title = String(P.title || "").trim().slice(0, 40);
        if (title.length < 3) return fail("Bitte eine Bezeichnung für deinen Investor angeben.");
        inv = { id: "custom", title, desc: String(P.desc || "").trim().slice(0, 120), capital: eur(clamp(Number(P.capital) || 0, CUSTOM_CAPITAL.min, CUSTOM_CAPITAL.max)), custom: true };
      } else {
        inv = INVESTORS.find((x) => x.id === P.id);
        if (!inv) return fail("Unbekanntes Investorenprofil.");
      }
      u.role = "Investor"; u.investor = inv; u.wallet = inv.capital;
      userNews(S, a.user_id, `Du startest als ${inv.title} mit ${fmt(inv.capital)} Privatvermögen.`);
      return true;
    }
    case "buy": {
      if (club) return fail("Du besitzt bereits einen Verein.");
      if (u.role !== "Investor") return fail("Nur Investoren können Vereine kaufen.");
      const c = S.clubs.get(P.clubId);
      if (!c || c.h || c.owner) return fail("Verein nicht verfügbar.");
      const price = clubPrice(S, c);
      if (price == null) return fail("Nur Vereine ab Liga 5 abwärts sind käuflich.");
      if (u.wallet < price) return fail("Privatvermögen reicht nicht.");
      u.wallet -= price; u.clubId = c.id;
      const t = firstTeam(S, c);
      takeOver(S, c, a.user_id, LV[Math.min(t.level, 11)].sponsor * 0.4);
      news(S, `${u.name} übernimmt ${c.name} für ${fmt(price)}.`);
      userNews(S, a.user_id, `Du bist jetzt Investor bei ${c.name}.`);
      return true;
    }
    case "deposit": {
      if (!h) return fail("Kein Verein.");
      const amt = eur(Number(P.amount) || 0);
      if (amt <= 0 || amt > u.wallet) return fail("Betrag ungültig.");
      u.wallet -= amt; ledger(h, "in", "Einlagen Investor", amt);
      return true;
    }
    case "tactic": {
      if (!h) return fail("Kein Verein.");
      if (P.formation && FORMATIONS[P.formation]) h.formation = P.formation;
      if (P.tactic && TACTICS[P.tactic]) h.tactic = P.tactic;
      return true;
    }
    case "ticket": {
      if (!h) return fail("Kein Verein.");
      h.ticket = clamp(Number(P.factor) || 1, 0.5, 2);
      return true;
    }
    case "facility": {
      if (!h) return fail("Kein Verein.");
      if (!["jugend", "training", "umfeld"].includes(P.kind)) return fail("Unbekannt.");
      const cost = facilityCost(S, club, P.kind);
      if (cost == null) return fail("Maximalstufe erreicht.");
      if (h.cash < cost) return fail("Nicht genug Geld auf dem Vereinskonto.");
      ledger(h, "out", "Investitionen", cost);
      h.fac[P.kind]++;
      h.facInvest = (h.facInvest || 0) + cost;
      return true;
    }
    case "hireTrainer": {
      if (!h) return fail("Kein Verein.");
      const tr = h.trainers.find((x) => x.id === P.id);
      if (!tr) return fail("Trainer nicht verfügbar.");
      if (h.trainer) ledger(h, "out", "Abfindungen", h.trainer.wage * 0.3);
      h.trainer = tr; h.trainers = h.trainers.filter((x) => x.id !== tr.id);
      userNews(S, a.user_id, `${tr.name} ist neuer Trainer (Qualität ${tr.q.toFixed(2)}).`);
      return true;
    }
    case "fireTrainer": {
      if (!h || !h.trainer) return fail("Kein Trainer.");
      ledger(h, "out", "Abfindungen", h.trainer.wage * 0.3); h.trainer = null; return true;
    }
    case "buyPlayer": {
      if (!h) return fail("Kein Verein.");
      if (h.players.length >= 30) return fail("Kader voll (max. 30).");
      const m = marketFor(S, club, daySeed).find((p) => p.id === P.id);
      if (!m) return fail("Spieler nicht mehr auf dem Markt.");
      if (h.cash < m.price) return fail("Nicht genug Geld.");
      ledger(h, "out", "Transfers", m.price);
      S.taken.add(m.id); S.freeAgents = S.freeAgents.filter((x) => x.id !== m.id);
      h.players.push({ id: "h" + club.id + ":" + m.id, name: m.name, pos: m.pos, age: m.age, str: m.str, pot: m.pot, wage: wageOf(m.str) });
      if (m.from) { const ft = S.teams.get(m.from); ft.str = r2(ft.str * 0.997); }
      userNews(S, a.user_id, `${m.name} (${m.pos}, ${m.str.toFixed(2)}) verpflichtet für ${fmt(m.price)}.`);
      return true;
    }
    case "sellPlayer": {
      if (!h) return fail("Kein Verein.");
      const p = h.players.find((x) => x.id === P.id); if (!p) return fail("Spieler nicht gefunden.");
      if (h.players.length <= 14) return fail("Mindestens 14 Spieler nötig.");
      const price = eur(valueOf(p) * 0.8);
      ledger(h, "in", "Transfers", price);
      h.players = h.players.filter((x) => x !== p);
      userNews(S, a.user_id, `${p.name} verkauft für ${fmt(price)}.`);
      return true;
    }
    case "releasePlayer": {
      if (!h) return fail("Kein Verein.");
      const p = h.players.find((x) => x.id === P.id); if (!p) return fail("Spieler nicht gefunden.");
      if (h.players.length <= 14) return fail("Mindestens 14 Spieler nötig.");
      ledger(h, "out", "Abfindungen", p.wage * 0.5);
      h.players = h.players.filter((x) => x !== p);
      S.freeAgents.push({ ...p, id: "fa:" + a.id });
      return true;
    }
    case "sponsor": {
      if (!h) return fail("Kein Verein.");
      if (h.sponsor) return fail("Für diese Saison ist bereits ein Sponsor unterschrieben.");
      const o = h.offers.find((x) => x.id === P.id); if (!o) return fail("Angebot nicht gefunden.");
      h.sponsor = o; userNews(S, a.user_id, `Sponsorvertrag mit ${o.name} unterschrieben.`);
      return true;
    }
    case "reserve": {
      if (!h) return fail("Kein Verein.");
      const rank = P.rank === 3 ? 3 : 2;
      if (rank === 3 && !(h.reserves[2]?.active)) return fail("Erst eine zweite Mannschaft anmelden.");
      if (P.on) {
        if (h.reserves[rank]?.active) return fail("Mannschaft bereits gemeldet.");
        h.reserves[rank] = { team: h.reserves[rank]?.team || null, active: true, pendingNew: !h.reserves[rank]?.team };
        userNews(S, a.user_id, `${rank}. Mannschaft gemeldet – startet zur nächsten Saison.`);
      } else {
        if (!h.reserves[rank]?.active) return fail("Mannschaft nicht gemeldet.");
        h.reserves[rank].active = false;
        if (rank === 2 && h.reserves[3]?.active) h.reserves[3].active = false;
        userNews(S, a.user_id, `${rank}. Mannschaft zum Saisonende abgemeldet.`);
      }
      return true;
    }
    case "leave": {
      if (!club) return fail("Kein Verein.");
      news(S, `${u.name} gibt ${club.name} ab.`);
      if (firstTeam(S, club).founded && firstTeam(S, club).status === "pending") { S.teams.delete(club.teams[0]); S.clubs.delete(club.id); }
      else { club.h = null; club.owner = null; }
      u.clubId = null; u.role = null; u.wallet = 0; u.investor = null;
      return true;
    }
    default: return fail("Unbekannte Aktion.");
  }
}

function fmt(x) { return Math.round(x).toLocaleString("de-DE") + " €"; }
function news(S, text) { S.news.push({ g: S.gday || 0, text }); if (S.news.length > 400) S.news.shift(); }
function userNews(S, uid, text) { const u = S.users.get(uid); if (!u) return; u.news.push({ g: S.gday || 0, text }); if (u.news.length > 80) u.news.shift(); }

// ---------------------------------------------------------------- Tagesablauf
export function playDay(S, g, daySeed) {
  S.gday = g;
  const d = ((g - 1) % SEASON_DAYS) + 1;
  S.day = d;
  if (d === SEASON_DAYS) { seasonEnd(S, daySeed); return; }
  const rng = rngFrom(daySeed, "day");
  // Liga
  for (const lg of S.leagues.values()) {
    const fx = lg.fixtures[d]; if (!fx) continue;
    for (const m of fx) {
      const r = playMatch(S, m.h, m.a, rngFrom(daySeed, lg.id, m.h, m.a));
      m.gh = r.gh; m.ga = r.ga;
      const th = lg.table.get(m.h), ta = lg.table.get(m.a);
      th.p++; ta.p++; th.gf += r.gh; th.ga += r.ga; ta.gf += r.ga; ta.ga += r.gh;
      if (r.gh > r.ga) { th.w++; th.pts += 3; ta.l++; } else if (r.gh < r.ga) { ta.w++; ta.pts += 3; th.l++; } else { th.d++; ta.d++; th.pts++; ta.pts++; }
      matchFinance(S, m.h, m.a, r, lg.level, false, null);
      if (lg.level === 1) blStats(S, m, daySeed);
    }
  }
  for (const t of S.teams.values()) t.fatigue = 0;
  // Pokale
  for (const cup of S.cups) {
    const ri = cup.rounds.findIndex((r) => r && r.day === d);
    if (ri < 0) continue;
    const rd = cup.rounds[ri];
    const winners = [...rd.byes];
    for (const m of rd.matches) {
      const rr = rngFrom(daySeed, cup.id, m.h, m.a);
      const r = playMatch(S, m.h, m.a, rr, ri === cup.days.length - 1 && cup.type === "dfb");
      m.gh = r.gh; m.ga = r.ga;
      if (m.gh === m.ga) {
        m.et = true;
        const p1 = Math.min(0.8, r.lh / 3 / 4), p2 = Math.min(0.8, r.la / 3 / 4);
        for (let i = 0; i < 4; i++) { if (rr() < p1) m.gh++; if (rr() < p2) m.ga++; }
        if (m.gh === m.ga) { const hw = rr() < 0.5 + clamp(r.rel / 400, -0.15, 0.15); m.pen = hw ? "h" : "a"; }
      }
      m.winner = m.pen ? (m.pen === "h" ? m.h : m.a) : m.gh > m.ga ? m.h : m.a;
      winners.push(m.winner);
      S.teams.get(m.h).fatigue = 0.02; S.teams.get(m.a).fatigue = 0.02;
      matchFinance(S, m.h, m.a, r, Math.min(S.teams.get(m.h).level, 11), true, cup);
      cupPrize(S, m.h, cup, ri); cupPrize(S, m.a, cup, ri);
    }
    for (const b of rd.byes) cupPrize(S, b, cup, ri);
    cup.alive = winners;
    if (ri === cup.days.length - 1 || winners.length === 1) {
      const fin = rd.matches[rd.matches.length - 1];
      cup.winner = winners[0]; cup.runnerUp = fin ? (fin.winner === fin.h ? fin.a : fin.h) : null;
      cupPrize(S, cup.winner, cup, ri + 1);
      news(S, `${cup.name}: ${S.teams.get(cup.winner).name} gewinnt den Pokal!`);
    } else drawRound(S, cup, ri + 1, rngFrom(daySeed, "draw", cup.id, ri + 1));
  }
  // Menschliche Vereine: Tageskosten, Training
  for (const c of S.clubs.values()) if (c.h) humanDaily(S, c, daySeed);
  // KI-Form: leichte Schwankung
  for (const t of S.teams.values()) {
    if (t.status !== "active") continue;
    const c = S.clubs.get(t.clubId);
    if (t.rank === 1 && c?.h) t.str = humanXI(S, c).str;
  }
}

function cupPrize(S, tid, cup, ri) {
  const t = S.teams.get(tid); const c = S.clubs.get(t?.clubId);
  if (!c?.h || t.rank !== 1) return;
  const v = CUP_PRIZE[cup.type][Math.min(ri, CUP_PRIZE[cup.type].length - 1)];
  if (v) ledger(c.h, "in", "Pokalprämien", v);
}

function attendance(S, c, t, opp, cup) {
  const h = c.h; const L = Math.min(t.level, 11);
  const lg = t.league ? S.leagues.get(t.league) : null;
  let posRatio = 0.5;
  if (lg) { const sorted = sortedTable(lg); const i = sorted.findIndex((x) => x.id === t.id); posRatio = sorted.length > 1 ? i / (sorted.length - 1) : 0.5; }
  const oppF = opp ? clamp(1 + (L - opp.level) * 0.25, 0.7, 3) : 1;
  let att = LV[L].att * h.popularity * (1 + 0.06 * h.fac.umfeld) * (1.25 - 0.5 * posRatio) * oppF * Math.pow(h.ticket, -0.8) * (cup ? 1.3 : 1);
  const cap = LV[L].cap * (1 + 0.15 * h.fac.umfeld);
  return Math.round(clamp(att, 10, cap));
}
function matchFinance(S, hid, aid, r, level, isCup, cup) {
  for (const [tid, oid, home] of [[hid, aid, true], [aid, hid, false]]) {
    const t = S.teams.get(tid); const c = S.clubs.get(t.clubId);
    if (!c?.h || t.rank !== 1) continue;
    const h = c.h; const L = Math.min(t.level, 11);
    const won = home ? r.gh > r.ga : r.ga > r.gh;
    if (home) {
      const att = attendance(S, c, t, S.teams.get(oid), isCup);
      const price = LV[L].price * h.ticket;
      let ticket = att * price; if (isCup) ticket *= 0.5;
      ledger(h, "in", "Zuschauer", ticket);
      ledger(h, "in", "Catering & Fanartikel", att * (1 + 0.4 * h.fac.umfeld) * (L <= 3 ? 6 : L <= 6 ? 2.5 : 1.2));
      ledger(h, "out", "Spielbetrieb", LV[L].match);
      h.lastAtt = att;
    } else ledger(h, "out", "Spielbetrieb", LV[L].match * 0.4);
    if (!isCup && won && h.sponsor?.win) ledger(h, "in", "Sponsoring", h.sponsor.win);
    h.popularity = clamp(h.popularity + (won ? 0.004 : -0.002), 0.5, 2.5);
  }
}

function humanDaily(S, c, daySeed) {
  const h = c.h; const t = firstTeam(S, c);
  if (t.status === "pending") return;
  const L = Math.min(t.level, 11);
  const per = 1 / MATCHDAYS;
  ledger(h, "out", "Gehälter Spieler", h.players.reduce((s, p) => s + p.wage, 0) * per);
  if (h.trainer) ledger(h, "out", "Gehalt Trainer", h.trainer.wage * per);
  ledger(h, "out", "Verwaltung & Platz", LV[L].fixed * per);
  ledger(h, "out", "Unterhalt Anlagen", (h.facInvest || 0) * 0.08 * per);
  ledger(h, "out", "Jugendabteilung", youthCost(S, c) * per);
  for (const rk of [2, 3]) if (h.reserves[rk]?.active) ledger(h, "out", rk + ". Mannschaft", reserveCost(S, c, rk) * per);
  if (LV[L].tv) ledger(h, "in", "TV-Gelder", LV[L].tv * per);
  ledger(h, "in", "Sponsoring", (h.sponsor ? h.sponsor.base : LV[L].sponsor * 0.35) * per);
  // Training
  const rng = rngFrom(daySeed, "train", c.id);
  const trainerF = h.trainer ? clamp(0.6 + (h.trainer.q / Math.max(1, levelMid(L))) * 0.5, 0.6, 1.8) : 0.5;
  for (const p of h.players) {
    let delta = 0;
    if (p.str < p.pot && p.age < 30) delta += (p.pot - p.str) * 0.006 * (1 + 0.1 * h.fac.training) * trainerF * (0.5 + rng());
    if (p.age >= 30) delta -= p.str * 0.0006 * (p.age - 29) * (0.5 + rng());
    p.str = r2(clamp(p.str + delta, 0.5, 99.99));
  }
}


// ---------------------------------------------------------------- Bundesliga: Torschützen & Rekorde
function scorerPool(S, t) {
  const c = S.clubs.get(t.clubId);
  if (t.rank === 1 && c?.h) return c.h.players.map((p) => ({ id: p.id, name: p.name, pos: p.pos, str: p.str }));
  let sq = S.squadCache.get(t.id);
  if (!sq) { sq = aiSquad(S, t); S.squadCache.set(t.id, sq); }
  return sq;
}
const POS_W = { TW: 0, AB: 0.2, MF: 0.9, ST: 5 };
function pickScorer(rng, pool) {
  const ranked = pool.slice().sort((a, b) => b.str - a.str || (a.id < b.id ? -1 : 1));
  const top = ranked[0]?.str || 1;
  const w = ranked.map((p, i) => POS_W[p.pos] * Math.pow(p.str / top, 6) * (i < 14 ? 1 : 0.15));
  const tot = w.reduce((a, b) => a + b, 0); if (!tot) return null;
  let x = rng() * tot;
  for (let i = 0; i < ranked.length; i++) { x -= w[i]; if (x <= 0) return ranked[i]; }
  return ranked[ranked.length - 1];
}
function blStats(S, m, daySeed) {
  const rng = rngFrom(daySeed, "scorer", m.h, m.a);
  for (const [tid, goals] of [[m.h, m.gh], [m.a, m.ga]]) {
    const t = S.teams.get(tid); const pool = scorerPool(S, t);
    for (let g = 0; g < goals; g++) {
      const p = pickScorer(rng, pool); if (!p) continue;
      const e = S.scorers.get(p.id) || { id: p.id, name: p.name, team: tid, goals: 0 };
      e.goals++; S.scorers.set(p.id, e);
    }
  }
  const diff = Math.abs(m.gh - m.ga), tot = m.gh + m.ga;
  const rec = { season: S.season, day: S.day, h: S.teams.get(m.h).name, a: S.teams.get(m.a).name, gh: m.gh, ga: m.ga };
  if (!S.records.bigWin || diff > Math.abs(S.records.bigWin.gh - S.records.bigWin.ga)) S.records.bigWin = rec;
  if (!S.records.maxGoals || tot > S.records.maxGoals.gh + S.records.maxGoals.ga) S.records.maxGoals = rec;
}
export function topScorers(S, n = 25) {
  return [...S.scorers.values()].sort((a, b) => b.goals - a.goals || (a.name < b.name ? -1 : 1)).slice(0, n);
}
function addTrophy(S, clubId, tr) {
  if (!clubId) return;
  if (!S.trophies.has(clubId)) S.trophies.set(clubId, []);
  S.trophies.get(clubId).push(tr);
}

// ---------------------------------------------------------------- Saisonende
export function sortedTable(lg) {
  return [...lg.table.values()].sort((a, b) => b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga) || b.gf - a.gf || (a.id < b.id ? -1 : 1));
}
function seasonEnd(S, daySeed) {
  const rank = new Map();
  const champions = [];
  for (const lg of S.leagues.values()) {
    const tab = sortedTable(lg);
    tab.forEach((r, i) => rank.set(r.id, { pos: i, ppg: r.p ? r.pts / r.p : 0 }));
    if (tab[0]) champions.push({ league: lg.name, level: lg.level, team: S.teams.get(tab[0].id).name });
    // Ligaprämien
    tab.forEach((r, i) => {
      const t = S.teams.get(r.id); const c = S.clubs.get(t.clubId);
      if (c?.h && t.rank === 1) ledger(c.h, "in", "Ligaprämie", LV[lg.level].prize * (tab.length - i) / tab.length);
    });
    S.lastTables.set(lg.id, tab.map((r) => ({ ...r, name: S.teams.get(r.id).name })));
  }
  S.lastRank = rank;
  S.cupWinners = {};
  for (const cup of S.cups) S.cupWinners[cup.id] = { winner: cup.winner, runnerUp: cup.runnerUp };
  // Trophäen
  for (const lg of S.leagues.values()) {
    const tab = S.lastTables.get(lg.id); if (!tab?.length) continue;
    const t = S.teams.get(tab[0].id);
    addTrophy(S, t.clubId, { season: S.season, kind: "liga", level: lg.level, title: "Meister " + lg.name, team: t.name });
  }
  for (const cup of S.cups) if (cup.winner) {
    const t = S.teams.get(cup.winner);
    addTrophy(S, t.clubId, { season: S.season, kind: "pokal", level: { dfb: 1, lp: 4, bz: 7, kp: 9 }[cup.type], title: cup.name, team: t.name });
  }
  // Bundesliga: ewige Tabelle, Torschützenkönig, Rekorde
  const blTab = S.lastTables.get("bl") || [];
  blTab.forEach((r, i) => {
    const e = S.eternal.get(r.id) || { id: r.id, name: r.name, seasons: 0, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0, titles: 0 };
    e.name = r.name; e.seasons++; e.p += r.p; e.w += r.w; e.d += r.d; e.l += r.l; e.gf += r.gf; e.ga += r.ga; e.pts += r.pts; if (i === 0) e.titles++;
    S.eternal.set(r.id, e);
    if (!S.records.maxPts || r.pts > S.records.maxPts.pts) S.records.maxPts = { season: S.season, name: r.name, pts: r.pts };
  });
  const king = topScorers(S, 1)[0];
  S.history.push({ season: S.season, champions, blChampion: blTab[0]?.name || null, topScorer: king ? { name: king.name, team: S.teams.get(king.team)?.name, goals: king.goals } : null, cups: S.cups.map((c) => ({ name: c.name, winner: c.winner ? S.teams.get(c.winner)?.name : null })) });
  // Jahresabschluss menschlicher Vereine
  for (const c of S.clubs.values()) {
    if (!c.h || firstTeam(S, c).status === "pending") continue;
    const L = c.h.ledger;
    const tin = Object.values(L.in).reduce((a, b) => a + b, 0), tout = Object.values(L.out).reduce((a, b) => a + b, 0);
    const t = firstTeam(S, c);
    c.h.annual.push({ season: S.season, in: L.in, out: L.out, result: tin - tout, cash: c.h.cash, league: t.league ? S.leagues.get(t.league).name : "–", pos: rank.get(t.id)?.pos });
  }
  // KI-Stärke driftet Richtung Ligamittel, leichte Zufallsänderung
  const rng = rngFrom(daySeed, "drift");
  for (const t of S.teams.values()) {
    if (t.status !== "active") continue;
    const c = S.clubs.get(t.clubId);
    if (t.rank === 1 && c?.h) continue;
    const pr = rank.get(t.id);
    const lgLen = t.league ? S.leagues.get(t.league).teams.length : 18;
    const perf = pr ? 1 - (pr.pos / Math.max(1, lgLen - 1)) * 2 : 0; // +1 Meister … -1 Letzter
    t.str = r2(clamp(t.str * (1 + perf * 0.02 + (rng() - 0.5) * 0.05), 0.8, 92));
  }
  // Zweitmannschaften menschlicher Vereine
  const forcedIn = new Map();
  for (const c of S.clubs.values()) {
    if (!c.h) continue;
    for (const rk of [2, 3]) {
      const r = c.h.reserves[rk]; if (!r) continue;
      if (!r.active && r.team) {
        const t = S.teams.get(r.team);
        const lg = t.league ? S.leagues.get(t.league) : null;
        if (lg) lg.teams = lg.teams.filter((x) => x !== t.id);
        t.status = "retired"; t.league = null; t.group = null;
        c.teams = c.teams.filter((x) => x !== r.team); delete c.h.reserves[rk];
      }
      else if (r.active && r.pendingNew) {
        const ft = firstTeam(S, c);
        if (ft.kreis === "RH" || ft.kreis === "HM") {
          const tid = "t" + c.id + "_" + rk;
          const g = ft.kreis.toLowerCase() + "_kk3";
          const t = { id: tid, name: c.name + " " + (rk === 2 ? "II" : "III"), clubId: c.id, rank: rk, str: r2(LV[11].bot), home: { ...ft.home, 11: g }, verband: ft.verband, bezirk: ft.bezirk, kreis: ft.kreis, league: null, group: null, level: 12, status: "pool", poolOf: g };
          S.teams.set(tid, t); c.teams.push(tid); r.team = tid; forcedIn.set(tid, g);
        }
        r.pendingNew = false;
      }
    }
  }
  // Neugründungen kommen in die 3. Kreisklasse
  for (const t of S.teams.values()) if (t.status === "pending") { t.status = "pool"; forcedIn.set(t.id, t.poolOf); }
  for (const [tid] of forcedIn) if (!rank.has(tid)) rank.set(tid, { pos: -1, ppg: 9 });
  // Auf- und Abstieg
  const before = new Map([...S.teams.values()].map((t) => [t.id, t.level]));
  normalize(S, rank, true, forcedIn);
  for (let i = 0; i < 2; i++) normalize(S, rank, false);
  for (const t of S.teams.values()) {
    const b = before.get(t.id); if (b == null || t.status !== "active") continue;
    const c = S.clubs.get(t.clubId);
    if (c?.owner && t.rank === 1 && b !== t.level && b <= 11) userNews(S, c.owner, t.level < b ? `Aufstieg! ${t.name} spielt jetzt in der ${S.leagues.get(t.league).name}.` : `Abstieg: ${t.name} spielt jetzt in der ${S.leagues.get(t.league).name}.`);
  }
  // Menschliche Vereine: Altern, Jugend, Verträge
  for (const c of S.clubs.values()) {
    if (!c.h) continue;
    const h = c.h, t = firstTeam(S, c); const L = Math.min(t.level, 11);
    const rr = rngFrom(daySeed, "youth", c.id);
    for (const p of h.players) { p.age++; p.wage = wageOf(p.str); }
    const retire = h.players.filter((p) => p.age >= 36 || (p.age >= 33 && rr() < 0.25));
    if (retire.length) userNews(S, c.owner, "Karriereende: " + retire.map((p) => p.name).join(", "));
    h.players = h.players.filter((p) => !retire.includes(p));
    const n = 2 + Math.floor(h.fac.jugend / 3);
    for (let i = 0; i < n; i++) {
      const base = levelMid(L) * (0.32 + 0.035 * h.fac.jugend) * (0.8 + rr() * 0.4);
      const pos = ["TW", "AB", "MF", "ST", "AB", "MF"][Math.floor(rr() * 6)];
      const p = genPlayer(rr, pos, base, 17 + Math.floor(rr() * 2), "y" + c.id + ":" + S.season, h.youthSeq++);
      p.pot = r2(clamp(base * (1.5 + 0.09 * h.fac.jugend + rr() * 0.4), base, 99.99));
      h.players.push(p);
    }
    userNews(S, c.owner, `${n} Talente aus der eigenen Jugend rücken in den Kader auf.`);
    while (h.players.length < 14) h.players.push(genPlayer(rr, "MF", levelMid(L) * 0.6, 20, "f" + c.id + ":" + S.season, h.youthSeq++));
    // Reservestärke
    for (const rk of [2, 3]) { const r = h.reserves[rk]; if (r?.team) { const rt = S.teams.get(r.team); rt.str = r2(humanXI(S, c).str * (rk === 2 ? 0.55 : 0.4) * (1 + 0.02 * h.fac.jugend)); } }
  }
  S.freeAgents = S.freeAgents.slice(-30);
  S.season++;
  S.seasonSeed = daySeed;
  startSeason(S);
  news(S, `Saison ${S.season} beginnt.`);
}

// ---------------------------------------------------------------- Gesamt-Simulation
// seeds: Array, seeds[g] = Hex-String für globalen Tag g (0 = Vorsaison). actions: [{id,user_id,type,payload,eff_day}]
export function simulate(world, seeds, actions, members = {}) {
  const S0 = hex32(seeds[0]);
  const S = createState(world, S0);
  const byDay = new Map();
  for (const a of actions.slice().sort((x, y) => x.id - y.id)) {
    const d = Math.max(1, a.eff_day | 0);
    if (!byDay.has(d)) byDay.set(d, []);
    byDay.get(d).push(a);
  }
  for (const [uid, name] of Object.entries(members)) if (!S.users.has(uid)) S.users.set(uid, { id: uid, name, clubId: null, wallet: 0, role: null, news: [] });
  const D = seeds.length - 1;
  for (let g = 1; g <= D + 1; g++) {
    const prevSeed = hex32(seeds[g - 1]);
    for (const a of byDay.get(g) || []) applyAction(S, a, members[a.user_id], prevSeed);
    if (g <= D) playDay(S, g, hex32(seeds[g]));
  }
  S.revealed = D;
  S.lastSeed = hex32(seeds[D]);
  return S;
}
export function hex32(h) { return h ? parseInt(String(h).slice(0, 8), 16) >>> 0 : 0; }
export function dayInfo(g) { return { season: Math.floor((g - 1) / SEASON_DAYS) + 1, day: ((g - 1) % SEASON_DAYS) + 1 }; }
