// Fußball-Manager – deterministische Spiel-Engine
// Alle Mitspieler berechnen aus denselben Daten (Welt + Tages-Seeds + Aktionen) denselben Spielstand.
// Keine Math.random-Aufrufe: alle Zufallszahlen kommen aus Seeds.

import { UEFA_CLUBS, UEFA_COUNTRIES, UEFA_QUOTA, UEFA_COMPS, GER_SEASON1 } from "./euro.js?v=202611221301";
import { pickNat, natName, NATS } from "./names.js?v=202611221301";
import { ROLES, SPORT_ROLES, ROLE_ORDER, staffSalary } from "./staff.js?v=202611221301";
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
// ---------------------------------------------------------------- Catering & Security
export const CATERING = [
  ["kein Angebot", "Wer Durst hat, bringt sich was mit."],
  ["Bratwurststand", "Der Vorsitzende grillt persönlich, Senf aus dem Eimer, Bier aus dem Kasten. Kult, aber überschaubar."],
  ["Vereinsheim-Theke", "Frisch gezapftes Bier, Kuchen von den Spielerfrauen und Pommes aus der Fritteuse im Vereinsheim."],
  ["Imbisswagen & Bierstand", "Mehrere Stände, Kartenzahlung, Currywurst mit Pommes und ein Bierwagen hinter dem Tor."],
  ["Gastro-Partner", "Ein Caterer betreibt mehrere Kioske, dazu Fanartikel-Shop und ein kleiner Sponsorenbereich."],
  ["Professionelle Konzession", "Stadion-Catering mit Großkonzession, VIP-Logen, Hospitality-Pakete und eigener Bierpartner."],
];
export const CAT_EUR = [0, 1, 2.5, 4.5, 7, 11];            // Erlös je Zuschauer
export const CAT_BUILD = [0, 500, 5000, 30000, 150000, 800000];
export const CAT_UPKEEP = [0, 0, 1500, 8000, 40000, 200000];
export const SECURITY = [
  ["keine Ordner", "Jeder kommt, wie er will."],
  ["Türsteher aus der Dorfdisco", "Zwei breite Kerle vom „Tanzpalast Krone“, die jeden beim Vornamen kennen. Reicht für den Kreis."],
  ["Ordnerdienst aus dem Verein", "Zehn Ehrenamtliche mit Warnwesten und Funkgerät. Genug für Bezirks- und Landesliga."],
  ["Lokale Sicherheitsfirma", "Geschulte Ordner, Einlasskontrolle und Sanitäter vor Ort – Oberliga-tauglich."],
  ["Ordnungsdienst mit Sicherheitskonzept", "Fantrennung, Videoüberwachung, Abstimmung mit der Polizei – wie es die Regionalliga verlangt."],
  ["Professionelles Sicherheitsunternehmen", "Hunderte Ordner, Stadionverbote, Sicherheitsbeauftragter und Polizeiabsprachen – Pflicht in den Profiligen."],
];
export const SEC_REQ = { 1: 5, 2: 5, 3: 5, 4: 4, 5: 3, 6: 2, 7: 2, 8: 1, 9: 1, 10: 1, 11: 1, 12: 1 };   // Mindeststufe je Spielklasse (Lizenz)
export const SEC_COST = [0, 300, 3000, 25000, 150000, 900000];                 // je Saison
export const SEC_CAP = [0, 300, 1500, 6000, 20000, Infinity];                   // Zuschauer, die ohne Probleme betreut werden
const catDefault = (L) => (L <= 2 ? 5 : L <= 3 ? 4 : L <= 4 ? 3 : L <= 6 ? 2 : 1);
export function ensureVenue(S, c) {
  const h = c.h; if (!h) return;
  const L = Math.min(firstTeam(S, c).level || 11, 11);
  if (h.cat == null) h.cat = catDefault(L);
  if (h.sec == null) h.sec = SEC_REQ[L];
  if (h.ticketAuto == null) h.ticketAuto = false;
}
export const licensedFor = (S, t, L) => { const c = S.clubs.get(t.clubId); return !c?.h || licenseIssues(S, c, L).length === 0; };
// ---------------------------------------------------------------- Verträge
export const CT_KINDS = { fest: "Festgehalt", mix: "Ausgewogen", flex: "Leistung" };
const CT_SPLIT = { fest: [1, 0], mix: [0.7, 0.38], flex: [0.4, 0.75] };   // Anteil fix, erwarteter Prämienanteil (bezogen auf Forderung)
const EXP_APPS = 26;
function expectedEvents(p) {
  const pos = p.pos;
  return { apps: EXP_APPS, zw: EXP_APPS * DUEL_BASE[pos] * (p.a.zwk / 60), as: EXP_APPS * 0.09 * (ASSIST_W[pos] ?? 1) * ((p.a.pas + p.a.vis) / 120), g: EXP_APPS * 0.07 * (SCORE_W[pos] ?? 1) * ((p.a.abs + 20) / 80) };
}
export function contractDemand(p, years) {
  const base = wageOf(p.max) * (1 + Math.max(0, (p.pot || p.max) - p.max) / 60);
  const yf = p.age >= 31 ? 1 + 0.05 * (years - 1) : p.age <= 23 ? 1 - 0.02 * (years - 1) : 1 + 0.02 * (years - 1);
  return base * yf;
}
export function contractOffers(p, years) {
  const D = contractDemand(p, years), e = expectedEvents(p);
  return Object.keys(CT_KINDS).map((kind) => {
    const [fix, bon] = CT_SPLIT[kind];
    const pool = D * bon;
    const share = p.pos === "TW" ? { app: 0.85, duel: 0.15, ast: 0, goal: 0 } : { app: 0.4, duel: 0.2, ast: 0.15, goal: 0.25 };
    const bonus = { app: eur(pool * share.app / e.apps), duel: eur(pool * share.duel / Math.max(1, e.zw)), ast: eur(pool * share.ast / Math.max(0.5, e.as)), goal: eur(pool * share.goal / Math.max(0.5, e.g)) };
    return { kind, years, base: eur(D * fix), bonus, expected: eur(D * fix + pool) };
  });
}
export function ctUntil(S, years) { return S.season + years - 1 + (S.day > 17 ? 1 : 0); }
function setContract(p, o, until) { p.ct = { kind: o.kind, until, base: o.base, bonus: o.kind === "fest" ? null : o.bonus }; p.wage = o.base; }
function ensureContract(S, p) {
  if (p.ct) return;
  const o = contractOffers(p, 1).find((x) => x.kind === "fest");
  setContract(p, { ...o, base: p.wage || o.base }, S.season + (hash32("ct:" + p.id) % 3));
}
const DOWN = { 1: 2, 2: 2, 3: 4, 4: 3, 5: 2, 6: 2, 7: 2, 8: 2, 9: 2, 10: 2, 11: 1 };

// Gehalt pro Saison (= Spieljahr) abhängig von der Stärke
export const wageOf = (s) => eur(60 * Math.pow(1.135, s));
export function valueOf(p) {
  const f = p.age < 22 ? 3.2 : p.age < 25 ? 2.7 : p.age < 29 ? 2.1 : p.age < 32 ? 1.3 : 0.7;
  const st = p.max ?? p.str;
  const potBonus = 1 + Math.max(0, (p.pot || st) - st) / 40;
  return eur(wageOf(st) * f * potBonus);
}

export const FORMATIONS = {
  "4-4-2": ["TW", "AV", "IV", "IV", "AV", "AM", "DM", "ZM", "AM", "ST", "MS"],
  "4-3-3": ["TW", "AV", "IV", "IV", "AV", "DM", "ZM", "OM", "AS", "MS", "AS"],
  "4-2-3-1": ["TW", "AV", "IV", "IV", "AV", "DM", "DM", "AS", "OM", "AS", "MS"],
  "3-5-2": ["TW", "IV", "IV", "IV", "AM", "DM", "ZM", "OM", "AM", "ST", "MS"],
  "5-3-2": ["TW", "AV", "IV", "IV", "IV", "AV", "DM", "ZM", "ZM", "ST", "MS"],
  "4-5-1": ["TW", "AV", "IV", "IV", "AV", "AM", "DM", "ZM", "OM", "AM", "MS"],
};
export const INTENSITY = ["locker", "leicht", "normal", "hoch", "maximal"];
export const AGGRESSION = ["passiv", "zurückhaltend", "normal", "robust", "sehr aggressiv"];
const INT_DRAIN = [5, 7, 9, 12, 15];         // Fitnessverbrauch pro Einsatz
const INT_REC = [15, 13, 12, 11, 10];         // Erholung pro Tag (nach Einsatz die Hälfte)
const INT_RISK = [0.6, 0.8, 1, 1.3, 1.7];    // Verletzungsrisiko
const INT_PERF = [-0.05, -0.025, 0, 0.025, 0.05];
const INT_GROW = [0.6, 0.8, 1, 1.2, 1.4];
const AGG_CARD = [0.45, 0.7, 1, 1.45, 2.1];
const AGG_HURT = [0.8, 0.9, 1, 1.2, 1.5];    // Verletzungsrisiko für den Gegner
export const sl = (h, role) => h?.staff?.[role]?.lvl || 0;
const HC_B = [-0.03, 0, 0.01, 0.02, 0.035, 0.05];
const REHA_F = [1.2, 1, 0.92, 0.85, 0.75, 0.65];
const DOC_REST = [0, 25, 35, 42, 48, 55];
export const fitFactor = (f) => 0.5 + 0.5 * clamp(f, 0, 100) / 100;
const AI_FIT = 0.85;  // KI-Teams spielen im Schnitt mit Fitnessstand 70
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
    trophies: new Map(), eternal: new Map(), lscorers: new Map(), squadCache: new Map(), archive: [], startDate: null, records: { maxPts: null, bigWin: null, maxGoals: null },
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
  S.fteams = new Map(UEFA_CLUBS.map((c) => [c.id, { id: c.id, name: c.name, cc: c.cc, base: c.str, str: c.str, level: 1, rank: 1, clubId: null, foreign: true, status: "foreign" }]));
  S.euro = { comps: {}, next: null, hist: [] };
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
        if (!licensedFor(S, t, L)) return false;
        return gr.level === L + 1 || !hasGroupAt(S, t, L + 1);
      }).map(([id]) => id).sort(bestFirst);
      const pool = [...assign.entries()].filter(([id, g]) => g === "pool:" + G.id && !justRelegated.has(id))
        .map(([id]) => id).filter((id) => { const t = S.teams.get(id); return !(t.rank > 1 && clubFirstLevel(t) >= L) && licensedFor(S, t, L); })
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
  S.lscorers = new Map(); S.squadCache = new Map();
  for (const c of S.clubs.values()) if (c.h) { c.h.tstats = {}; for (const p of c.h.players) { p.s = newStats(); } }
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
  if (S.fteams) setupEuro(S);
  for (const c of S.clubs.values()) if (c.h) seasonStartHuman(S, c);
}



// ---------------------------------------------------------------- Vereinsgelände: Plätze, Flutlicht, Tribünen
export const PITCH = {
  tenne: { name: "Hartplatz (Asche)", cost: 30000, upkeep: 2000, train: 0.6, desc: "Staubig im Sommer, Schlamm im Herbst – aber immer bespielbar." },
  rasen: { name: "Rasenplatz", cost: 150000, upkeep: 12000, train: 1, desc: "Schönster Belag, aber von November bis Februar meist gesperrt." },
  kunst: { name: "Kunstrasenplatz", cost: 600000, upkeep: 8000, train: 1.2, desc: "Ganzjährig bespielbar, ideal für Training und Jugend." },
};
export const LIGHT = [
  ["kein Flutlicht", "Im Winter endet das Training mit der Dämmerung."],
  ["Trainingsbeleuchtung", "Vier Masten mit 80 Lux – reicht zum Kicken, nicht für Punktspiele."],
  ["Flutlicht für den Spielbetrieb", "200 Lux, Abendspiele unter der Woche sind möglich."],
  ["TV-taugliches Flutlicht", "1.200 Lux, flackerfrei – Fernsehkameras willkommen."],
];
export const LIGHT_COST = [0, 25000, 120000, 1200000];
export const LIGHT_UPKEEP = [0, 800, 4000, 40000];
export const STAND = { steh: { name: "Stehplätze", block: 250, perSeat: 250, upkeep: 0.5 }, sitz: { name: "Sitzplätze", block: 100, perSeat: 1500, upkeep: 3 } };
// Stadionanforderungen je Spielklasse (Lizenz): Kapazität, Sitzplätze, Flutlicht
export const STADIUM_REQ = { 1: { cap: 15000, sitz: 8000, light: 3 }, 2: { cap: 10000, sitz: 2000, light: 3 }, 3: { cap: 10000, sitz: 2000, light: 3 }, 4: { cap: 2500, sitz: 200, light: 2 }, 5: { cap: 500, sitz: 0, light: 1 } };
const GROUND_DEF = { 1: [["rasen", "rasen", "rasen", "kunst", "kunst"], 3, 15000, 35000], 2: [["rasen", "rasen", "kunst", "kunst"], 3, 10000, 20000], 3: [["rasen", "rasen", "kunst"], 3, 9000, 6000],
  4: [["rasen", "kunst"], 2, 6500, 1500], 5: [["rasen", "kunst"], 2, 2700, 300], 6: [["rasen", "tenne"], 1, 1850, 150], 7: [["rasen", "tenne"], 1, 920, 80], 8: [["rasen"], 1, 750, 50],
  9: [["rasen"], 1, 450, 0], 10: [["rasen"], 0, 300, 0], 11: [["rasen"], 0, 300, 0] };
export function ensureGround(S, c) {
  const h = c.h; if (!h || h.ground) return;
  const t = firstTeam(S, c), L = Math.min(t.level || 11, 11);
  const [pt, light, steh, sitz] = t.founded || L > 11 ? [["rasen"], 0, 200, 0] : GROUND_DEF[L];
  h.ground = { pitches: pt.map((x, i) => ({ t: x, main: i === 0 })), light, steh, sitz };
}
export const capacity = (h) => (h.ground ? h.ground.steh + h.ground.sitz : 300);
export const sitzShare = (h) => (h.ground ? h.ground.sitz / Math.max(1, capacity(h)) : 0);
// Ersatz für die frühere Stufe "Umfeld": Komfort des Stadions (0–10)
export const venueScore = (h) => (h.ground ? clamp(h.ground.light * 1.5 + sitzShare(h) * 8, 0, 10) : h.fac?.umfeld || 0);
export const isWinter = (S) => [11, 12, 1, 2].includes(gameMonth(S) || 0);
export function seniorTeams(h) { return 1 + [2, 3].filter((rk) => h.reserves?.[rk]?.active).length; }
export function youthTeams(h) {
  const g = h.ground; if (!g) return 2 + Math.floor((h.fac?.jugend || 0) / 2);
  const pitches = g.pitches.reduce((a, p) => a + (p.t === "tenne" ? 0.5 : 1), 0);
  return clamp(Math.min(2 + (h.fac?.jugend || 0), Math.floor(pitches * 3) - seniorTeams(h)), 0, 12);
}
// Trainingsqualität: genug Platz für alle Teams? Im Winter fallen Rasenplätze weg.
export function trainingCapacity(S, h) {
  const g = h.ground; if (!g) return 1;
  const w = isWinter(S);
  const slots = g.pitches.reduce((a, p) => a + (w && p.t === "rasen" ? 0 : PITCH[p.t].train), 0) * 3;
  const need = seniorTeams(h) + youthTeams(h);
  return clamp(slots / Math.max(1, need), 0.25, 1.25);
}
export function groundUpkeep(S, c) {
  const h = c.h, g = h.ground; if (!g) return 0;
  const L = Math.min(firstTeam(S, c).level, 11), muni = L >= 7 ? 0.2 : L >= 5 ? 0.4 : 1;   // Kommune trägt im Amateurbereich viel mit
  return eur(g.pitches.reduce((a, p) => a + PITCH[p.t].upkeep, 0) * muni + LIGHT_UPKEEP[g.light] + g.steh * STAND.steh.upkeep + g.sitz * STAND.sitz.upkeep);
}
export const subsidy = (S, c) => (Math.min(firstTeam(S, c).level, 11) >= 5 ? 0.5 : 0);   // Zuschuss Kommune/Landessportbund
// Lizenzprüfung für eine Spielklasse: Liste der fehlenden Voraussetzungen
export function licenseIssues(S, c, L) {
  const h = c.h; if (!h) return [];
  ensureVenue(S, c); ensureGround(S, c);
  const out = [];
  if ((h.sec ?? 5) < SEC_REQ[Math.min(L, 12)]) out.push(`Security-Stufe ${SEC_REQ[Math.min(L, 12)]}`);
  const R = STADIUM_REQ[L];
  if (R) {
    if (capacity(h) < R.cap) out.push(`${R.cap.toLocaleString("de-DE")} Plätze`);
    if (h.ground.sitz < R.sitz) out.push(`${R.sitz.toLocaleString("de-DE")} Sitzplätze`);
    if (h.ground.light < R.light) out.push(LIGHT[R.light][0]);
  }
  return out;
}

// ---------------------------------------------------------------- Europapokal (CL, EL, ECL)
export const tm = (S, id) => S.teams.get(id) || S.fteams?.get(id);
export const UEFA_NAMES = Object.fromEntries(Object.entries(UEFA_COUNTRIES).map(([k, v]) => [k, v[0]]));
function gauss(rng) { return (rng() + rng() + rng() - 1.5) * 2; }
function setupEuro(S) {
  const rng = seasonRng(S, "euro");
  for (const t of S.fteams.values()) t.str = r2(clamp(t.base + gauss(rng) * 1.5, 30, 95));
  let ger = S.euro.next;
  if (!ger) {
    const byName = (n) => [...S.teams.values()].find((t) => t.name === n && t.status === "active" && t.level === 1 && t.rank === 1)?.id;
    ger = Object.fromEntries(Object.entries(GER_SEASON1).map(([k, v]) => [k, v.map(byName).filter(Boolean)]));
  }
  const order = {};
  for (const t of S.fteams.values()) (order[t.cc] = order[t.cc] || []).push({ id: t.id, k: t.str + gauss(rng) * 1.5 });
  for (const cc in order) order[cc] = order[cc].sort((a, b) => b.k - a.k || (a.id < b.id ? -1 : 1)).map((x) => x.id);
  const used = new Set();
  const take = (cc) => { const id = (order[cc] || []).find((x) => !used.has(x)); if (id) used.add(id); return id; };
  const ranked = Object.entries(UEFA_COUNTRIES).filter(([cc]) => cc !== "Ger" && order[cc]).sort((a, b) => b[1][1] - a[1][1]).map(([cc]) => cc);
  const pickCountry = (cands) => {
    const live = cands.filter((cc) => (order[cc] || []).some((x) => !used.has(x)));
    if (!live.length) return null;
    const w = live.map((cc) => UEFA_COUNTRIES[cc][1]); let x = rng() * w.reduce((a, b) => a + b, 0);
    for (let i = 0; i < live.length; i++) { x -= w[i]; if (x <= 0) return live[i]; }
    return live[live.length - 1];
  };
  S.euro.comps = {};
  for (const comp of UEFA_COMPS) {
    const Q = UEFA_QUOTA[comp.id];
    const list = (ger[comp.id] || []).slice();
    for (const id of list) used.add(id);
    for (const [cc, n] of Object.entries(Q.quota)) for (let i = 0; i < n; i++) { const id = take(cc); if (id) list.push(id); }
    for (let i = 0; i < Q.eps; i++) { const cc = pickCountry(ranked.slice(0, 5)); const id = cc && take(cc); if (id) list.push(id); }
    while (list.length < 36) {
      const cc = pickCountry(ranked.slice(Q.freeFrom - 1)) || pickCountry(ranked);
      if (!cc) break;
      list.push(take(cc));
    }
    S.euro.comps[comp.id] = makeEuroComp(S, comp, list.slice(0, 36), seasonRng(S, "euroDraw", comp.id));
  }
}
function makeEuroComp(S, comp, teams, rng) {
  const rounds = roundRobin(teams, rng).slice(0, comp.lpDays.length);
  return {
    id: comp.id, name: comp.name, short: comp.short, teams: teams.slice(),
    lp: rounds.map((pairs, i) => ({ day: comp.lpDays[i], matches: pairs.map(([h, a]) => ({ h, a, gh: null, ga: null })) })),
    table: new Map(teams.map((id) => [id, { id, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 }])),
    ko: comp.ko.map((days, i) => ({ days, name: ["K.-o.-Playoffs", "Achtelfinale", "Viertelfinale", "Halbfinale", "Finale"][i], ties: [] })),
    winner: null, runnerUp: null,
  };
}
export function euroTable(C) { return [...C.table.values()].sort((a, b) => b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga) || b.gf - a.gf || (a.id < b.id ? -1 : 1)); }
function euroPrize(S, tid, amount, what) {
  const t = tm(S, tid); const c = t?.clubId ? S.clubs.get(t.clubId) : null;
  if (!c?.h || t.rank !== 1 || !amount) return;
  ledger(c.h, "in", "UEFA-Prämien", amount);
  if (what) userNews(S, c.owner, what);
}
function euroFinance(S, m, r) {
  for (const [tid, oid, home] of [[m.h, m.a, true], [m.a, m.h, false]]) {
    const t = tm(S, tid); const c = t?.clubId ? S.clubs.get(t.clubId) : null;
    if (!c?.h || t.rank !== 1) continue;
    const h = c.h, L = Math.min(t.level, 11);
    const won = home ? r.gh > r.ga : r.ga > r.gh;
    if (home && !m.neutral) {
      const att = Math.round(Math.min(capacity(h), attendance(S, c, t, tm(S, oid), true) * 1.4));
      ledger(h, "in", "Zuschauer", att * LV[L].price * h.ticket * 1.6);
      ledger(h, "in", "Catering & Fanartikel", att * CAT_EUR[h.cat ?? 2] * 1.3 * (1 + 0.1 * venueScore(h)));
      secCheck(S, c, att);
      ledger(h, "out", "Spielbetrieb", LV[L].match * 1.2);
      h.lastAtt = att;
    } else ledger(h, "out", "Reisekosten Europa", LV[L].match * 0.9);
    h.popularity = clamp(h.popularity + (won ? 0.008 : -0.002), 0.5, 2.5);
  }
}
function euroMatch(S, C, h, a, rr, daySeed, neutral) {
  const r = playMatch(S, h, a, rr, neutral, "europa");
  const m = { h, a, gh: r.gh, ga: r.ga, st: r.st, neutral };
  recordLeagueGoals(S, { id: C.id }, r);
  if (r.H.human) afterMatchHuman(S, r.H, r.A, r, 0, C.name, false, daySeed);
  if (r.A.human) afterMatchHuman(S, r.A, r.H, r, 1, C.name, false, daySeed);
  euroFinance(S, m, r);
  return { m, r };
}
function euroDay(S, d, daySeed) {
  for (const comp of UEFA_COMPS) {
    const C = S.euro.comps[comp.id]; if (!C) continue;
    const P = comp.prize;
    // Ligaphase
    const li = C.lp.findIndex((x) => x.day === d);
    if (li >= 0) {
      if (li === 0) for (const id of C.teams) euroPrize(S, id, P.start, `${C.name}: Startprämie ${fmt(P.start)} überwiesen.`);
      for (const mm of C.lp[li].matches) {
        const { m } = euroMatch(S, C, mm.h, mm.a, rngFrom(daySeed, C.id, mm.h, mm.a), daySeed, false);
        Object.assign(mm, m);
        const th = C.table.get(mm.h), ta = C.table.get(mm.a);
        th.p++; ta.p++; th.gf += mm.gh; th.ga += mm.ga; ta.gf += mm.ga; ta.ga += mm.gh;
        if (mm.gh > mm.ga) { th.w++; th.pts += 3; ta.l++; euroPrize(S, mm.h, P.win); }
        else if (mm.gh < mm.ga) { ta.w++; ta.pts += 3; th.l++; euroPrize(S, mm.a, P.win); }
        else { th.d++; ta.d++; th.pts++; ta.pts++; euroPrize(S, mm.h, P.draw); euroPrize(S, mm.a, P.draw); }
      }
      if (li === C.lp.length - 1) {
        const tab = euroTable(C);
        const ties = [];
        for (let i = 8; i < 16; i++) ties.push({ a: tab[i].id, b: tab[31 - i].id, legs: [], winner: null });
        C.ko[0].ties = ties;
        C.direct = tab.slice(0, 8).map((x) => x.id);
        for (const x of tab.slice(24)) euroPrize(S, x.id, 0, `${C.name}: Aus nach der Ligaphase.`);
        for (const t of ties) { euroPrize(S, t.a, P.ko[0]); euroPrize(S, t.b, P.ko[0]); }
        news(S, `${C.name}: Ligaphase beendet – ${tm(S, tab[0].id).name} ist Erster.`);
      }
    }
    // K.-o.-Runden
    C.ko.forEach((rd, ri) => {
      const leg = rd.days.indexOf(d);
      if (leg < 0 || !rd.ties.length) return;
      const final = rd.days.length === 1;
      for (const tie of rd.ties) {
        const [h, a] = final ? [tie.a, tie.b] : leg === 0 ? [tie.b, tie.a] : [tie.a, tie.b];
        const rr = rngFrom(daySeed, C.id, "ko", ri, h, a);
        const { m, r } = euroMatch(S, C, h, a, rr, daySeed, final);
        tie.legs[leg] = m;
        if (final || leg === 1) {
          const goals = (id) => tie.legs.reduce((s2, x) => s2 + (x.h === id ? x.gh : x.ga), 0);
          let ga = goals(tie.a), gb = goals(tie.b);
          if (ga === gb) {
            m.et = true;
            const p1 = Math.min(0.8, r.lh / 3 / 4), p2 = Math.min(0.8, r.la / 3 / 4);
            for (let i = 0; i < 4; i++) { if (rr() < p1) m.gh++; if (rr() < p2) m.ga++; }
            ga = goals(tie.a); gb = goals(tie.b);
            if (ga === gb) { const hw = rr() < 0.5 + clamp(r.rel / 400, -0.15, 0.15); m.pen = hw ? "h" : "a"; }
          }
          tie.winner = m.pen ? (m.pen === "h" ? m.h : m.a) : ga > gb ? tie.a : tie.b;
        }
      }
      if (!final && leg === 0) return;
      const winners = rd.ties.map((t) => t.winner);
      if (final) {
        const t = rd.ties[0];
        C.winner = t.winner; C.runnerUp = t.winner === t.a ? t.b : t.a;
        euroPrize(S, C.winner, P.title, `🏆 ${C.name} gewonnen! Siegprämie ${fmt(P.title)}.`);
        news(S, `${C.name}: ${tm(S, C.winner).name} gewinnt das Finale gegen ${tm(S, C.runnerUp).name}!`);
        return;
      }
      const rng = rngFrom(daySeed, "euroDraw", C.id, ri + 1);
      const next = C.ko[ri + 1];
      let pool = ri === 0 ? C.direct.slice() : winners.slice();
      let others = ri === 0 ? winners.slice() : null;
      for (const arr of [pool, others]) if (arr) for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; }
      next.ties = [];
      if (others) for (let i = 0; i < pool.length; i++) next.ties.push({ a: pool[i], b: others[i], legs: [], winner: null });
      else for (let i = 0; i + 1 < pool.length; i += 2) next.ties.push({ a: pool[i], b: pool[i + 1], legs: [], winner: null });
      for (const t of next.ties) { euroPrize(S, t.a, P.ko[ri + 1], `${C.name}: ${next.name} erreicht!`); euroPrize(S, t.b, P.ko[ri + 1], `${C.name}: ${next.name} erreicht!`); }
    });
  }
}
function euroSeasonEnd(S) {
  const rec = { season: S.season };
  for (const comp of UEFA_COMPS) {
    const C = S.euro.comps[comp.id]; if (!C?.winner) continue;
    const w = tm(S, C.winner), ru = tm(S, C.runnerUp);
    rec[comp.id] = { winner: w.name, cc: w.cc || "Ger", runnerUp: ru?.name, ruCc: ru?.cc || "Ger" };
    if (w.clubId) addTrophy(S, w.clubId, { season: S.season, kind: "europa", level: 0, title: C.name, team: w.name });
  }
  S.euro.hist.push(rec);
  // Deutsche Teilnehmer der nächsten Saison: Plätze 1–4 CL, 5 + Pokalsieger EL, 6 (bzw. nächster) ECL
  const tab = (S.lastTables.get("bl") || []).map((r) => r.id).filter((id) => S.teams.get(id)?.rank === 1);
  const cl = tab.slice(0, 4), used = new Set(cl);
  const nextFree = () => { const id = tab.find((x) => !used.has(x)); if (id) used.add(id); return id; };
  const el = [nextFree()];
  const cw = S.cupWinners.dfb?.winner;
  if (cw && !used.has(cw) && S.teams.get(cw)?.rank === 1 && S.teams.get(cw)?.status === "active") { used.add(cw); el.push(cw); } else el.push(nextFree());
  const ecl = [nextFree()];
  S.euro.next = { cl, el: el.filter(Boolean), ecl: ecl.filter(Boolean) };
  for (const [k, ids] of Object.entries(S.euro.next)) for (const id of ids) {
    const t = S.teams.get(id), c = S.clubs.get(t.clubId);
    if (c?.owner) userNews(S, c.owner, `Europa ruft: ${t.name} spielt nächste Saison in der ${UEFA_COMPS.find((x) => x.id === k).name}!`);
  }
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

// ---------------------------------------------------------------- Spieler
export const ATTRS = ["fit", "spd", "tec", "pas", "zwk", "kop", "dri", "vis", "tak", "abs", "men"];
export const ATTR_NAMES = { fit: "Fitness", spd: "Speed", tec: "Technik", pas: "Passspiel", zwk: "Zweikampf", kop: "Kopfball", dri: "Dribbling", vis: "Vision", tak: "Taktik", abs: "Abschluss", men: "Mentale Stärke" };
export const POSITIONS = ["TW", "IV", "AV", "DM", "ZM", "AM", "OM", "AS", "ST", "MS"];
export const POS_NAMES = { TW: "Torwart", IV: "Innenverteidiger", AV: "Außenverteidiger", DM: "Defensives Mittelfeld", ZM: "Zentrales Mittelfeld", AM: "Außenmittelfeld", OM: "Offensives Mittelfeld", AS: "Außenstürmer", ST: "Hängende Spitze", MS: "Mittelstürmer" };
export const POS_WEIGHTS = {
  TW: { tak: 0.25, men: 0.25, spd: 0.15, kop: 0.15, pas: 0.1, zwk: 0.05, fit: 0.05 },
  IV: { zwk: 0.25, kop: 0.2, tak: 0.15, spd: 0.1, men: 0.1, pas: 0.08, fit: 0.07, tec: 0.05 },
  AV: { spd: 0.18, zwk: 0.17, fit: 0.13, pas: 0.12, tak: 0.1, tec: 0.08, dri: 0.07, men: 0.07, kop: 0.04, vis: 0.04 },
  DM: { zwk: 0.2, tak: 0.18, pas: 0.15, fit: 0.1, men: 0.1, vis: 0.08, tec: 0.07, kop: 0.06, spd: 0.06 },
  ZM: { pas: 0.2, vis: 0.15, tec: 0.13, tak: 0.12, fit: 0.1, zwk: 0.08, men: 0.08, dri: 0.06, abs: 0.05, spd: 0.03 },
  AM: { spd: 0.18, dri: 0.15, pas: 0.13, fit: 0.12, tec: 0.12, vis: 0.08, abs: 0.07, zwk: 0.06, men: 0.05, tak: 0.04 },
  OM: { vis: 0.2, tec: 0.17, pas: 0.15, dri: 0.13, abs: 0.12, tak: 0.08, men: 0.08, spd: 0.07 },
  AS: { spd: 0.2, dri: 0.2, abs: 0.15, tec: 0.15, fit: 0.08, pas: 0.08, vis: 0.07, men: 0.07 },
  ST: { abs: 0.22, tec: 0.15, dri: 0.13, spd: 0.12, vis: 0.1, men: 0.1, pas: 0.1, kop: 0.08 },
  MS: { abs: 0.3, kop: 0.18, men: 0.12, spd: 0.1, tec: 0.1, zwk: 0.08, dri: 0.06, fit: 0.06 },
};
const POS_GROUP = { TW: "T", IV: "D", AV: "D", DM: "M", ZM: "M", AM: "M", OM: "O", AS: "O", ST: "O", MS: "O" };
const SCORE_W = { TW: 0, IV: 0.25, AV: 0.2, DM: 0.35, ZM: 0.7, AM: 1, OM: 1.6, AS: 2.4, ST: 3.2, MS: 4.2 };
const ASSIST_W = { TW: 0.05, IV: 0.25, AV: 0.9, DM: 0.6, ZM: 1.1, AM: 1.4, OM: 1.8, AS: 1.6, ST: 1.3, MS: 0.8 };
const DUEL_BASE = { TW: 0.5, IV: 7, AV: 6, DM: 8, ZM: 6, AM: 5, OM: 4, AS: 5, ST: 4, MS: 5 };
const AGG_DUEL = [0.8, 0.9, 1, 1.08, 1.15];
const CARD_W = { TW: 0.3, IV: 1.5, AV: 1.2, DM: 1.6, ZM: 1, AM: 0.8, OM: 0.7, AS: 0.6, ST: 0.7, MS: 0.8 };
export function posStrength(p, pos) {
  const w = POS_WEIGHTS[pos]; let s = 0;
  for (const k in w) s += w[k] * (p.a?.[k] ?? 0);
  if (pos !== p.pos) {
    if (pos === "TW" || p.pos === "TW") s *= 0.5;
    else s *= POS_GROUP[pos] === POS_GROUP[p.pos] ? 0.96 : 0.86;
  }
  return s;
}
export const FORM_AMP = 0.08;
export const curStrength = (p, pos) => posStrength(p, pos || p.pos) * fitFactor(p.fit ?? 100) * (1 + FORM_AMP * (p.form || 0));
// Formschwankung: je höher die mentale Stärke, desto ruhiger die Form
export const formSwing = (p) => 0.55 - 0.42 * ((p.a?.men ?? 50) / 100);
export function formLabel(f = 0) { return f >= 0.5 ? "Topform" : f >= 0.15 ? "gut" : f > -0.15 ? "normal" : f > -0.5 ? "schwach" : "Formtief"; }
function makeAttrs(rng, pos, target) {
  const w = POS_WEIGHTS[pos]; const mx = Math.max(...Object.values(w));
  const a = {};
  for (const k of ATTRS) a[k] = target * (0.72 + 0.42 * ((w[k] || 0) / mx)) * (0.88 + 0.24 * rng());
  const o = Object.entries(w).reduce((s2, [k, v]) => s2 + v * a[k], 0) || 1;
  const f = target / o;
  for (const k of ATTRS) a[k] = r2(clamp(a[k] * f, 0.5, 99.99));
  return a;
}
const newStats = () => ({ apps: 0, g: 0, y: 0, r: 0, as: 0, zw: 0 });
export const NAT_NAMES = Object.fromEntries(Object.entries(NATS).map(([k, v]) => [k, v[1]]));
function genPlayer(rng, pos, str, age, idPrefix, i, ctx) {
  str = clamp(str, 0.5, 99.99);
  rng(); rng();   // Platzhalter: hält die übrige Zufallsfolge stabil
  const nr = rngFrom("nat", idPrefix, i);
  const nat = pickNat(nr, ctx || {});
  const p = { id: idPrefix + ":" + i, name: natName(nr, nat), nat, pos, age, a: makeAttrs(rng, pos, str), fit: 100, inj: null, ban: 0, s: newStats(), c: newStats() };
  p.max = r2(posStrength(p, pos));
  p.pot = r2(clamp(p.max * (age < 21 ? 1.25 + rng() * 0.35 : age < 25 ? 1.08 + rng() * 0.2 : 1 + rng() * 0.05), p.max, 99.99));
  p.wage = wageOf(p.max);
  return p;
}
function refreshPlayer(p) { p.max = r2(posStrength(p, p.pos)); }
const POS_PLAN = ["TW", "TW", "IV", "IV", "IV", "IV", "AV", "AV", "AV", "DM", "DM", "ZM", "ZM", "AM", "AM", "OM", "OM", "AS", "AS", "ST", "MS", "MS"];
const AI_STARTERS = new Set([0, 2, 3, 6, 7, 9, 11, 13, 14, 19, 20]);
const FOUND_PLAN = ["TW", "TW", "IV", "IV", "IV", "AV", "AV", "DM", "ZM", "ZM", "AM", "AM", "OM", "AS", "AS", "ST", "MS", "MS"];
export function aiSquad(S, t) {
  const key = t.id + ":" + S.season;
  if (S.squadCache?.has(key)) return S.squadCache.get(key).filter((p) => !S.taken.has(p.id));
  const rng = rngFrom(S.seasonSeed, S.season, "squad", t.id);
  const out = [];
  POS_PLAN.forEach((pos, i) => {
    let m = AI_STARTERS.has(i) ? 0.94 + rng() * 0.12 : 0.74 + rng() * 0.2;
    if (rng() < 0.012 && t.level <= 2) m *= 1.07;
    const age = 18 + Math.floor(rng() * 17);
    out.push(genPlayer(rng, pos, t.str * m, age, t.id + ":" + S.season, i, { cc: t.cc || "Ger", level: t.level }));
  });
  S.squadCache?.set(key, out);
  return out.filter((p) => !S.taken.has(p.id));
}

// Startelf: verfügbare Spieler (nicht verletzt/gesperrt) nach aktueller Stärke auf die Positionen der Formation
export const COMPS = { liga: "Liga", pokal: "Pokal" };
// Einstellungen je Wettbewerb: Liga = Grundeinstellung, Pokal optional abweichend
export const LU_KEY = { pokal: "cup", europa: "euroLu" };
export function setupOf(h, comp = "liga") {
  const base = { formation: h.formation, tactic: h.tactic, intensity: h.intensity || 3, aggression: h.aggression || 3, minFit: h.minFit ?? 60, manual: h.manual || [] };
  const key = LU_KEY[comp], o = key ? h[key] : null;
  if (!o || o.same !== false) return { ...base, same: !!key };
  return { formation: o.formation || base.formation, tactic: o.tactic || base.tactic, intensity: o.intensity || base.intensity, aggression: o.aggression || base.aggression, minFit: o.minFit ?? base.minFit, manual: o.manual || [], same: false };
}
export function humanXI(S, c, comp = "liga") {
  const h = c.h, U = setupOf(h, comp);
  const slots = FORMATIONS[U.formation] || FORMATIONS["4-4-2"];
  const minFit = U.minFit;
  const docOn = h.followDoc && sl(h, "arzt") > 0;
  const ready = h.players.filter((p) => !p.inj && !(p.ban > 0) && !p.away && p.fit > 0 && !(docOn && p.fit < DOC_REST[sl(h, "arzt")]));
  const used = new Set(), xi = [];
  // fest eingeplante Spieler zuerst (sofern einsatzfähig)
  const readyIds = new Set(ready.map((p) => p.id));
  slots.forEach((pos, i) => {
    const id = U.manual[i];
    if (!id || used.has(id) || !readyIds.has(id)) return;
    const p = ready.find((q) => q.id === id);
    let v = curStrength(p, pos); if (pos === "TW") v *= 1 + 0.01 * sl(h, "twtrainer");
    used.add(id); xi[i] = { slot: pos, p, eff: v, max: posStrength(p, pos), fixed: true };
  });
  const order = slots.map((pos, i) => ({ pos, i })).filter(({ i }) => !xi[i]).sort((a, b) => (a.pos === "TW" ? -1 : b.pos === "TW" ? 1 : 0));
  for (const { pos, i } of order) {
    let best = null, bv = -1, bk = -1;
    for (const p of ready) {
      if (used.has(p.id)) continue;
      const v = curStrength(p, pos), k = p.fit >= minFit ? 1 : 0;   // ausgeruhte Spieler zuerst
      if (k > bk || (k === bk && (v > bv || (v === bv && p.id < best.id)))) { bk = k; bv = v; best = p; }
    }
    if (best && pos === "TW") bv *= 1 + 0.01 * sl(h, "twtrainer");
    if (best) { used.add(best.id); xi[i] = { slot: pos, p: best, eff: bv, max: posStrength(best, pos) }; }
    else xi[i] = { slot: pos, p: null, eff: 0.5, max: 0.5 };
  }
  const missing = xi.filter((x) => !x.p).length;
  const base = xi.reduce((s2, x) => s2 + x.eff, 0) / 11;
  const maxStr = xi.reduce((s2, x) => s2 + x.max, 0) / 11;
  let str = base * (1 + INT_PERF[U.intensity - 1]);
  str *= 1 + HC_B[sl(h, "headcoach")] + 0.004 * sl(h, "taktik") + 0.003 * sl(h, "psycho") + 0.002 * sl(h, "betreuer") + 0.003 * sl(h, "praesident");
  const xp = xi.filter((x) => x.p);
  const avgA = (k) => xp.length ? xp.reduce((s2, x) => s2 + x.p.a[k], 0) / xp.length : 0;
  return { str: r2(str), max: r2(maxStr), xi, missing, setup: U, zwk: avgA("zwk"), disc: (avgA("tak") + avgA("men")) / 2, ovr: xp.length ? xp.reduce((s2, x) => s2 + x.p.max, 0) / xp.length : 1 };
}

// ---------------------------------------------------------------- Spiel
export function teamStrength(S, t) {
  const c = S.clubs.get(t.clubId);
  if (t.rank === 1 && c && c.h) return humanXI(S, c).str;
  return r2(t.str * AI_FIT);
}
function sideInfo(S, tid, comp = "liga") {
  const t = tm(S, tid); const c = t.clubId ? S.clubs.get(t.clubId) : null;
  if (t.rank === 1 && c?.h) {
    const X = humanXI(S, c, comp), U = X.setup;
    return { t, c, human: true, X, comp, str: X.str, tac: TACTICS[U.tactic] || TACTICS.normal, tacName: U.tactic, agg: U.aggression, players: X.xi.filter((x) => x.p).map((x) => ({ p: x.p, slot: x.slot })) };
  }
  const getPool = () => {
    const key = "pool:" + t.id + ":" + S.season;
    let pool = S.squadCache.get(key);
    if (!pool) { pool = aiSquad(S, t).sort((a, b) => b.max - a.max).slice(0, 14).map((p) => ({ p, slot: p.pos, w: SCORE_W[p.pos] * Math.pow((p.a.abs + p.a.kop * 0.3) / 100, 2) })); S.squadCache.set(key, pool); }
    return pool;
  };
  return { t, c, human: false, str: r2(t.str * AI_FIT), tac: TACTICS.normal, tacName: "normal", agg: 3, get players() { return getPool(); } };
}
function pickWeighted(rng, list, wf) {
  const w = list.map(wf); const tot = w.reduce((a, b) => a + b, 0); if (!tot) return null;
  let x = rng() * tot;
  for (let i = 0; i < list.length; i++) { x -= w[i]; if (x <= 0) return list[i]; }
  return list[list.length - 1];
}
// Spielt eine Partie inklusive Karten, Torschützen und Statistik
function playMatch(S, h, a, rng, neutral = false, comp = "liga") {
  const H = sideInfo(S, h, comp), A = sideInfo(S, a, comp);
  const sides = [H, A];
  const st = { p: [50, 50], s: [0, 0], o: [0, 0], f: [0, 0], y: [0, 0], r: [0, 0], g: [], c: [] };
  // Karten
  for (let k = 0; k < 2; k++) {
    const X = sides[k];
    let cardMod = 1;
    if (X.human && X.X.ovr) cardMod = clamp(1.25 - 0.3 * (X.X.disc / X.X.ovr), 0.75, 1.3) * (1 - 0.04 * sl(X.c.h, "psycho"));
    const ag = AGG_CARD[X.agg - 1] * cardMod;
    const pl = X.human ? X.players : null;
    for (let i = 0; i < 11; i++) {
      const who = pl ? pl[i] : null;
      const wpos = who ? CARD_W[who.slot] : 1;
      if (rng() < 0.11 * ag * wpos) {
        const min = 1 + Math.floor(rng() * 90);
        if (rng() < 0.05 * ag) { st.r[k]++; st.c.push([min, k, who?.p.name || null, "GR", who?.p.id || null]); }
        else { st.y[k]++; st.c.push([min, k, who?.p.name || null, "Y", who?.p.id || null]); }
      } else if (rng() < 0.004 * ag * ag * wpos) {
        st.r[k]++; st.c.push([1 + Math.floor(rng() * 90), k, who?.p.name || null, "R", who?.p.id || null]);
      }
    }
    st.f[k] = Math.round(9 * AGG_CARD[X.agg - 1] * (0.8 + 0.4 * rng()) + st.y[k] + 2 * st.r[k]);
  }
  st.c.sort((x, y) => x[0] - y[0]);
  // Stärke: Zweikampfhärte, Unterzahl
  const eff = sides.map((X, k) => {
    const zk = X.human && X.X.ovr ? X.X.zwk / X.X.ovr : 1;
    return X.str * (1 + (X.agg - 3) * 0.012 * zk) * (1 - 0.12 * st.r[k]);
  });
  const rel = ((eff[0] - eff[1]) / Math.max(1, (eff[0] + eff[1]) / 2)) * 100 + (neutral ? 0 : 6);
  const f = (x) => clamp(x <= -60 ? 0.08 : Math.pow(1 + x / 60, 2), 0.08, 4.5);
  const lh = r4(1.35 * f(rel) * H.tac[0] * A.tac[1] * (0.85 + 0.3 * rng()));
  const la = r4(1.1 * f(-rel) * A.tac[0] * H.tac[1] * (0.85 + 0.3 * rng()));
  const goals = (l) => { let g = 0; const p = Math.min(0.85, l / 10); for (let i = 0; i < 10; i++) if (rng() < p) g++; return g; };
  const gh = goals(lh), ga = goals(la);
  // Torschützen
  for (const [k, n] of [[0, gh], [1, ga]]) {
    for (let i = 0; i < n; i++) {
      const pl = sides[k].players;
      const who = pickWeighted(rng, pl, (x) => x.w ?? SCORE_W[x.slot] * Math.pow((x.p.a.abs + x.p.a.kop * 0.3) / 100, 2));
      let ast = null;
      if (who && rng() < 0.72) ast = pickWeighted(rng, pl.filter((x) => x !== who), (x) => (ASSIST_W[x.slot] ?? 1) * Math.pow((x.p.a.pas + x.p.a.vis) / 200, 2));
      st.g.push([1 + Math.floor(rng() * 90), k, who?.p.name || "Eigentor", who?.p.id || null, ast?.p.name || null, ast?.p.id || null]);
    }
  }
  st.g.sort((x, y) => x[0] - y[0]);
  // Statistik
  const tacPoss = { defensiv: -4, normal: 0, offensiv: 3 };
  const ph = Math.round(clamp(50 + rel * 0.22 + (tacPoss[H.tacName] || 0) - (tacPoss[A.tacName] || 0) + (rng() - 0.5) * 8, 22, 78));
  st.p = [ph, 100 - ph];
  st.s = [gh + Math.round(lh * 3.3 + rng() * 4), ga + Math.round(la * 3.3 + rng() * 4)];
  st.o = [gh + Math.round((st.s[0] - gh) * (0.2 + 0.2 * rng())), ga + Math.round((st.s[1] - ga) * (0.2 + 0.2 * rng()))];
  return { gh, ga, lh, la, rel, st, H, A };
}

// Nach dem Spiel: Einsätze, Tore, Karten, Fitness, Verletzungen der eigenen Spieler
const INJURIES = [
  { n: "Prellung", min: 1, max: 3, w: 30, back: 75, sev: 0 }, { n: "Muskelverhärtung", min: 1, max: 2, w: 15, back: 80, sev: 0 },
  { n: "Zerrung", min: 3, max: 8, w: 22, back: 65, sev: 1 }, { n: "Bänderdehnung", min: 5, max: 12, w: 8, back: 60, sev: 1 },
  { n: "Gehirnerschütterung", min: 5, max: 10, w: 2, back: 70, sev: 1, head: true }, { n: "Muskelfaserriss", min: 10, max: 21, w: 10, back: 55, sev: 2 },
  { n: "Bänderriss", min: 28, max: 50, w: 4, back: 45, sev: 2 }, { n: "Mittelfußbruch", min: 40, max: 70, w: 1, back: 40, sev: 3 },
  { n: "Meniskusschaden", min: 30, max: 60, w: 2, back: 40, sev: 3 }, { n: "Kreuzbandriss", min: 150, max: 220, w: 0.6, back: 35, sev: 3 },
];
const ILLNESS = [{ n: "Erkältung", min: 1, max: 3, w: 50, back: 80 }, { n: "Grippe", min: 4, max: 8, w: 25, back: 60 }, { n: "Magen-Darm-Infekt", min: 1, max: 3, w: 25, back: 75 }];
function injure(S, c, p, rng, list, sevBoost, ill) {
  const it = pickWeighted(rng, list, (x) => x.w * (x.sev ? 1 + sevBoost * x.sev : 1));
  const days = Math.max(1, Math.round((it.min + Math.floor(rng() * (it.max - it.min + 1))) * (ill ? 1 : REHA_F[sl(c.h, "reha")])));
  p.inj = { n: it.n, days, back: it.back, ill: !!ill }; p.fit = 0;
  if (!ill && days >= 28) {
    // Schwere Verletzung: bleibende Einbußen, abhängig von Dauer, Alter und medizinischer Abteilung
    const med = clamp(1.3 - 0.06 * (sl(c.h, "arzt") + sl(c.h, "physio")) - 0.04 * sl(c.h, "reha"), 0.35, 1.3);
    const loss = clamp((days / 365) * 0.12 * med * (1 + 0.04 * Math.max(0, p.age - 27)) * (0.6 + 0.8 * rng()), 0, 0.15);
    p.major = (p.major || 0) + 1;
    if (loss >= 0.004) {
      const before = p.max;
      for (const k of ATTRS) p.a[k] = r2(clamp(p.a[k] * (1 - loss * (k === "spd" || k === "fit" ? 1.4 : 0.8)), 0.5, 99.99));
      refreshPlayer(p); p.pot = r2(Math.max(p.max, p.pot * (1 - loss)));
      userNews(S, c.owner, `Langzeitfolgen: ${p.name} verliert durch die schwere Verletzung ${(before - p.max).toFixed(2)} Punkte Maximalstärke.`);
    }
  }
  userNews(S, c.owner, `${ill ? "Erkrankt" : "Verletzt"}: ${p.name} – ${it.n}, fällt ca. ${days} ${days === 1 ? "Tag" : "Tage"} aus.`);
}
function afterMatchHuman(S, X, opp, r, k, compName, isLeague, daySeed) {
  const c = X.c, h = c.h, lvl = (X.X.setup?.intensity || h.intensity || 3) - 1;
  const rng = rngFrom(daySeed, "post", c.id, compName);
  const ids = new Set(X.players.map((x) => x.p.id));
  const at = (h.allTime[compName] = h.allTime[compName] || {});
  const bump = (p, key, n = 1) => { p.s[key] = (p.s[key] || 0) + n; p.c[key] = (p.c[key] || 0) + n; const e = (at[p.id] = at[p.id] || { name: p.name, apps: 0, g: 0, y: 0, r: 0 }); e.name = p.name; e[key] = (e[key] || 0) + n; };
  const ev = new Map(X.players.map(({ p }) => [p.id, { apps: 1, g: 0, as: 0, zw: 0 }]));
  for (const { p } of X.players) bump(p, "apps");
  for (const g of r.st.g) if (g[1] === k) {
    if (g[3] && ids.has(g[3])) { bump(h.players.find((p) => p.id === g[3]), "g"); ev.get(g[3]).g++; }
    if (g[5] && ids.has(g[5])) { bump(h.players.find((p) => p.id === g[5]), "as"); ev.get(g[5]).as++; }
  }
  const aggF = AGG_DUEL[(X.agg || 3) - 1];
  for (const { p, slot } of X.players) { const n = Math.round(DUEL_BASE[slot] * (p.a.zwk / 60) * aggF * (0.6 + 0.8 * rng())); if (n) { bump(p, "zw", n); ev.get(p.id).zw += n; } }
  // Form: Ergebnis, Tore und Vorlagen wirken je nach mentaler Stärke
  const won = (k ? r.ga > r.gh : r.gh > r.ga), lost = (k ? r.ga < r.gh : r.gh < r.ga);
  for (const { p } of X.players) { const e = ev.get(p.id); const sw = formSwing(p) / 0.35; p.form = r2(clamp((p.form || 0) + sw * ((won ? 0.08 : lost ? -0.08 : 0) + 0.12 * e.g + 0.06 * e.as), -1, 1)); }
  // Leistungsprämien laut Vertrag
  let bonus = 0;
  for (const { p } of X.players) { const b = p.ct?.bonus; if (!b) continue; const e = ev.get(p.id); bonus += b.app + b.duel * e.zw + b.ast * e.as + b.goal * e.g; }
  if (bonus) ledger(h, "out", "Prämien Spieler", bonus);
  for (const cd of r.st.c) if (cd[1] === k && cd[4] && ids.has(cd[4])) {
    const p = h.players.find((q) => q.id === cd[4]);
    if (cd[3] !== "Y") p.form = r2(clamp((p.form || 0) - 0.25 * formSwing(p) / 0.35, -1, 1));
    if (cd[3] === "Y") { bump(p, "y"); if (isLeague && p.s.y % 5 === 0) { p.ban = Math.max(p.ban, 1); userNews(S, c.owner, `${p.name} ist nach der ${p.s.y}. Gelben Karte für ein Spiel gesperrt.`); } }
    else { bump(p, "r"); p.ban = Math.max(p.ban, cd[3] === "R" ? 2 : 1); userNews(S, c.owner, `${cd[3] === "R" ? "Rote Karte" : "Gelb-Rot"} für ${p.name} – Sperre ${cd[3] === "R" ? 2 : 1} Spiel(e).`); }
  }
  const oppAgg = AGG_HURT[(opp.agg || 3) - 1];
  for (const { p } of X.players) {
    const before = p.fit;
    p.fit = r2(clamp(p.fit - INT_DRAIN[lvl] * (1.25 - p.a.fit / 200) * (1 - 0.03 * sl(h, "athletik")), 0, 100));
    p.played = true;
    const ageF = p.age > 30 ? 1 + 0.05 * (p.age - 30) : 1;
    const risk = (1 - 0.06 * sl(h, "arzt") - 0.01 * sl(h, "praesident")) * 0.009 * INT_RISK[lvl] * (1 + 2.5 * Math.pow(1 - before / 100, 2)) * ageF * oppAgg * (1.15 - p.a.fit / 300);
    if (!p.inj && rng() < risk) injure(S, c, p, rng, INJURIES, 2 * (1 - before / 100) + (oppAgg - 1), false);
  }
  // Mannschaftsstatistik der Saison
  const ts = (h.tstats = h.tstats || {});
  const add = (key, v) => { ts[key] = (ts[key] || 0) + v; };
  add("games", 1); add("poss", r.st.p[k]); add("shots", r.st.s[k]); add("on", r.st.o[k]); add("shotsAg", r.st.s[1 - k]); add("fouls", r.st.f[k]);
  add("y", r.st.y[k]); add("r", r.st.r[k]); add("gf", k ? r.ga : r.gh); add("ga", k ? r.gh : r.ga);
  const gfx = k ? r.ga : r.gh, gax = k ? r.gh : r.ga; add(gfx > gax ? "w" : gfx < gax ? "l" : "d", 1);
  h.reports.push({ season: S.season, day: S.day, comp: compName, h: r.H.t.name, a: r.A.t.name, gh: r.gh, ga: r.ga, st: r.st, k });
  if (h.reports.length > 40) h.reports.shift();
}
function recordLeagueGoals(S, lg, r) {
  let m = S.lscorers.get(lg.id); if (!m) { m = new Map(); S.lscorers.set(lg.id, m); }
  for (const g of r.st.g) {
    if (!g[3]) continue;
    const tid = g[1] ? r.A.t.id : r.H.t.id;
    const e = m.get(g[3]) || { id: g[3], name: g[2], team: tid, goals: 0 };
    e.goals++; m.set(g[3], e);
  }
}
export function topScorers(S, n = 25, leagueId = "bl") {
  const m = S.lscorers.get(leagueId); if (!m) return [];
  return [...m.values()].sort((a, b) => b.goals - a.goals || (a.name < b.name ? -1 : 1)).slice(0, n);
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
  const players = aiSquad(S, t).map((p) => ({ ...p, a: { ...p.a }, s: newStats(), c: newStats(), fit: 100, id: "h" + c.id + ":" + p.id }));
  const fac = LV[L].fac;
  c.owner = userId;
  c.h = {
    cash: eur(cash), players, trainer: null, fac: { jugend: fac, training: fac, umfeld: fac }, formation: "4-4-2", tactic: "normal",
    ticket: 1, sponsor: null, offers: [], reserves: {}, popularity: 1, ledger: newLedger(), annual: [], youthSeq: 0,
    trainers: [], intensity: 3, aggression: 3, allTime: {}, tstats: {}, reports: [], hires: 0,
    staff: {}, gf: { budget: 0, tasks: { staff: false, squad: false, rotation: false }, spent: 0 }, followDoc: false,
  };
  for (const tid of c.teams.slice(1)) c.h.reserves[S.teams.get(tid).rank] = { team: tid, active: true };
  const base = L <= 2 ? 4 : L <= 4 ? 3 : L <= 6 ? 2 : 1;
  const def = { praesident: base, gf: 0, headcoach: base, cotrainer: base - 1, taktik: base - 1, athletik: base - 1, twtrainer: base - 1, scout: base - 1, nlz: base - 1, arzt: base - 1, physio: base - 1, reha: base - 2, psycho: base - 2, betreuer: Math.max(1, base - 1), kasse: Math.max(1, base - 1), marketing: base - 1, presse: base - 1 };
  for (const r of ROLE_ORDER) setStaff(c, r, Math.max(0, def[r] || 0));
  ensureVenue(S, c); ensureGround(S, c);
  seasonStartHuman(S, c, true);
}

function seasonStartHuman(S, c, initial = false) {
  const h = c.h, t = firstTeam(S, c);
  const L = Math.min(t.level, 11);
  const rng = rngFrom(S.seasonSeed, S.season, "offers", c.id);
  const base = LV[L].sponsor * (1 + 0.04 * venueScore(h)) * h.popularity * (1 + 0.07 * sl(h, "marketing")) * (1 + 0.01 * sl(h, "praesident"));
  h.offers = [
    { id: "o1", name: sponsorName(rng), base: eur(base * (1.05 + rng() * 0.1)), win: 0, typ: "Sicherheit" },
    { id: "o2", name: sponsorName(rng), base: eur(base * (0.85 + rng() * 0.1)), win: eur((base / 34) * (0.6 + rng() * 0.4)), typ: "Ausgewogen" },
    { id: "o3", name: sponsorName(rng), base: eur(base * (0.55 + rng() * 0.1)), win: eur((base / 34) * (1.4 + rng() * 0.6)), typ: "Leistung" },
  ];
  h.sponsor = null;
  h.trainers = [];
  if (h.gf) { h.gf.spent = 0; h.gf.replan = true; }
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
  const nTeams = 3 + 2 * sl(c.h, "scout");
  for (let i = 0; i < nTeams && pool.length; i++) {
    const tm = pool[Math.floor(rng() * pool.length)];
    const sq = aiSquad(S, tm);
    for (let k = 0; k < 3 && sq.length; k++) {
      const p = sq[Math.floor(rng() * sq.length)];
      if (!out.find((x) => x.id === p.id)) out.push({ ...p, from: tm.id, price: valueOf(p) });
    }
  }
  for (const p of S.freeAgents.slice(-6)) out.push({ ...p, from: null, price: eur(valueOf(p) * 0.3) });
  return out.sort((a, b) => b.max - a.max);
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
  return eur(LV[L].fixed * (0.04 * youthTeams(c.h) + 0.04 * c.h.fac.jugend));
}


// ---------------------------------------------------------------- Personal
function setStaff(c, role, lvl) {
  const h = c.h;
  h.staff = h.staff || {};
  if (!lvl) { delete h.staff[role]; return; }
  const rng = rngFrom(c.id, role, h.hires = (h.hires || 0) + 1);
  h.staff[role] = { lvl, name: nameFrom(rng) };
}
export function staffCost(h, L) {
  let s2 = 0; for (const r in h.staff || {}) s2 += staffSalary(r, h.staff[r].lvl, L);
  return s2;
}
const GF_PRIO = ["headcoach", "cotrainer", "arzt", "physio", "athletik", "reha", "taktik", "scout", "nlz", "psycho", "twtrainer", "betreuer"];
function gfDaily(S, c, daySeed) {
  const h = c.h, g = sl(h, "gf"); if (!g) return;
  const t = firstTeam(S, c), L = Math.min(t.level, 11);
  const rng = rngFrom(daySeed, "gf", c.id);
  const T = h.gf.tasks;
  // Personal planen: zu Saisonbeginn oder nach Änderungen
  if (T.staff && (h.gf.replan || S.day === 1)) {
    h.gf.replan = false;
    const usable = h.gf.budget * (T.squad ? 0.7 : 1) * (0.7 + 0.06 * g);
    const prio = GF_PRIO.map((r, i) => ({ r, k: i + (rng() - 0.5) * (6 - g) * 2 })).sort((a, b) => a.k - b.k).map((x) => x.r);
    const lv = Object.fromEntries(prio.map((r) => [r, 1]));
    let cost = () => prio.reduce((s2, r) => s2 + staffSalary(r, lv[r], L), 0);
    for (let round = 2; round <= 5; round++) for (const r of prio) { if (lv[r] !== round - 1) continue; lv[r] = round; if (cost() > usable) lv[r] = round - 1; }
    const changed = [];
    for (const r of prio) if (sl(h, r) !== lv[r]) { if (sl(h, r) >= 2) ledger(h, "out", "Abfindungen", staffSalary(r, sl(h, r), L) * 0.3); setStaff(c, r, lv[r]); changed.push(ROLES[r].name + " " + lv[r]); }
    if (changed.length) userNews(S, c.owner, `GF Sport ${h.staff.gf.name} hat das Personal neu aufgestellt: ${changed.join(", ")}.`);
  }
  // Rotation & Intensität
  if (T.rotation) {
    const fit = h.players.filter((p) => !p.inj).map((p) => p.fit).sort((a, b) => b - a).slice(0, 16);
    const avg = fit.reduce((a, b) => a + b, 0) / Math.max(1, fit.length);
    const inj = h.players.filter((p) => p.inj).length;
    const noise = (rng() - 0.5) * (5 - g) * 8;
    if (inj >= 4 || avg + noise < 60) { h.intensity = Math.max(2, (h.intensity || 3) - 1); h.minFit = 65; }
    else if (avg + noise > 85) { h.intensity = g >= 3 ? 4 : 3; h.minFit = 55; }
    else { h.intensity = 3; h.minFit = 60; }
  }
  // Kader auffüllen
  if (T.squad && S.day % 2 === 1) {
    const ok = h.players.filter((p) => !p.inj);
    const need = { TW: 2, D: 6, M: 6, O: 5 };
    const have = { TW: 0, D: 0, M: 0, O: 0 };
    for (const p of ok) have[p.pos === "TW" ? "TW" : POS_GROUP[p.pos]]++;
    const gap = Object.keys(need).find((k) => have[k] < need[k]);
    const budgetLeft = h.gf.budget * 0.3 - (h.gf.spent || 0);
    if (gap && h.players.length < 30 && budgetLeft > 0) {
      const mk = marketFor(S, c, daySeed).filter((p) => (gap === "TW" ? p.pos === "TW" : POS_GROUP[p.pos] === gap && p.pos !== "TW") && p.price <= Math.min(budgetLeft, h.cash));
      if (mk.length) {
        const pick = g >= 3 ? mk.sort((a, b) => b.max / Math.max(1, b.price) - a.max / Math.max(1, a.price))[0] : mk[Math.floor(rng() * mk.length)];
        ledger(h, "out", "Transfers", pick.price); h.gf.spent = (h.gf.spent || 0) + pick.price;
        S.taken.add(pick.id); S.freeAgents = S.freeAgents.filter((x) => x.id !== pick.id);
        h.players.push({ id: "h" + c.id + ":" + pick.id, name: pick.name, nat: pick.nat, pos: pick.pos, age: pick.age, a: { ...pick.a }, max: pick.max, pot: pick.pot, wage: wageOf(pick.max), fit: 100, inj: null, ban: 0, s: newStats(), c: newStats() });
        userNews(S, c.owner, `GF Sport verpflichtet ${pick.name} (${pick.pos}, ${pick.max.toFixed(2)}) für ${fmt(pick.price)}.`);
      }
    }
  }
}
// Scout: geschätztes Potenzial (Spanne) je nach Stufe
export function potEstimate(h, p) {
  const lvl = sl(h, "scout");
  if (!lvl) return null;
  const spread = [0, 0.25, 0.15, 0.1, 0.05, 0][lvl];
  const noise = (rngFrom("pe", p.id, lvl)() - 0.5) * spread;
  const mid = p.pot * (1 + noise);
  return { lo: r2(Math.max(p.max, mid * (1 - spread))), hi: r2(Math.min(99.99, mid * (1 + spread))), exact: lvl === 5 };
}
// Taktiktrainer: Gegneranalyse
export function opponentReport(S, c, oppId) {
  const h = c.h, lvl = sl(h, "taktik"); const o = S.teams.get(oppId);
  if (!lvl) return { lvl, text: "Kein Taktiktrainer – keine Gegneranalyse." };
  if (lvl === 1) return { lvl, text: `„${o.name} hat elf Spieler und einen Torwart. Ich würde sagen: Tore schießen, keine kassieren.“` };
  const rng = rngFrom("rep", c.id, oppId, S.gday || 0);
  const real = teamStrength(S, o), mine = humanXI(S, c).str;
  const spread = [0, 0, 0.15, 0.07, 0.03, 0][lvl];
  const est = real * (1 + (rng() - 0.5) * 2 * spread);
  const out = { lvl, est: r2(est), spread, mine };
  const lg = o.league ? S.leagues.get(o.league) : null;
  if (lvl >= 3 && lg) {
    const res = [];
    for (let d = S.day; d >= 1 && res.length < 5; d--) { const m = (lg.fixtures[d] || []).find((x) => x.gh != null && (x.h === oppId || x.a === oppId)); if (m) { const gf = m.h === oppId ? m.gh : m.ga, ga = m.h === oppId ? m.ga : m.gh; res.push(gf > ga ? "S" : gf < ga ? "N" : "U"); } }
    out.form = res;
  }
  if (lvl >= 4) {
    const sq = aiSquad(S, o).slice().sort((a, b) => b.max - a.max);
    out.key = sq.slice(0, 3).map((p) => `${p.name} (${p.pos}, ${p.max.toFixed(1)})`);
    const zk = sq.slice(0, 11).reduce((s2, p) => s2 + p.a.zwk, 0) / 11, sp = sq.slice(0, 11).reduce((s2, p) => s2 + p.a.spd, 0) / 11;
    out.trait = zk > sp ? "zweikampfstark, eher langsam – mit Tempo über die Flügel überlaufen" : "schnell, aber anfällig in Zweikämpfen – robust dagegenhalten";
  }
  if (lvl >= 5) out.tip = real > mine * 1.08 ? "Empfehlung: defensiv stehen, auf Konter lauern, Aggressivität 4." : real < mine * 0.92 ? "Empfehlung: offensiv auftreten, früh pressen." : "Empfehlung: normal spielen, die Standards entscheiden.";
  return out;
}
// Mannschaftsarzt: Einsatzempfehlung
export function doctorAdvice(h, p) {
  const lvl = sl(h, "arzt");
  if (!lvl || p.inj) return null;
  if (p.fit < DOC_REST[lvl]) return lvl >= 3 ? `Pause empfohlen (Verletzungsrisiko erhöht)` : "Pause empfohlen";
  if (lvl >= 4 && p.age > 32 && p.fit < 70) return "Belastung dosieren";
  return null;
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
        sponsor: null, offers: [], reserves: {}, popularity: 0.8, ledger: newLedger(), annual: [], youthSeq: 0, trainers: [],
        intensity: 3, aggression: 3, allTime: {}, tstats: {}, reports: [], hires: 0, staff: {}, gf: { budget: 0, tasks: { staff: false, squad: false, rotation: false }, spent: 0 }, followDoc: false };
      for (const r of ["praesident", "headcoach", "betreuer", "kasse"]) setStaff(c, r, 1);
      c.h.cat = 1; c.h.sec = 1; c.h.ticketAuto = false;
      c.h.ground = { pitches: [{ t: "rasen", main: true }], light: 0, steh: 200, sitz: 0 };
      FOUND_PLAN.forEach((pos, i) => c.h.players.push(genPlayer(rng, pos, LV[11].bot * (0.75 + rng() * 0.5), 17 + Math.floor(rng() * 16), "h" + id, i, { level: 11 })));
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
      if (P.formation && FORMATIONS[P.formation] && P.formation !== h.formation) { h.formation = P.formation; h.manual = []; }
      if (P.tactic && TACTICS[P.tactic]) h.tactic = P.tactic;
      if (P.intensity) h.intensity = clamp(Math.round(Number(P.intensity)) || 3, 1, 5);
      if (P.aggression) h.aggression = clamp(Math.round(Number(P.aggression)) || 3, 1, 5);
      if (P.minFit != null) h.minFit = clamp(Math.round(Number(P.minFit)) || 0, 0, 90);
      return true;
    }
    case "lineup": {
      if (!h) return fail("Kein Verein.");
      const comp = LU_KEY[P.comp] ? P.comp : "liga";
      const key = LU_KEY[comp];
      if (key) {
        const o = (h[key] = h[key] || { same: true });
        if (P.same != null) {
          o.same = !!P.same;
          if (!o.same && !o.formation) Object.assign(o, { formation: h.formation, tactic: h.tactic, intensity: h.intensity || 3, aggression: h.aggression || 3, minFit: h.minFit ?? 60, manual: [...(h.manual || [])] });
        }
      }
      const tgt = key ? (h[key].same === false ? h[key] : null) : h;
      if (!tgt) return fail("Dieser Wettbewerb nutzt die Liga-Aufstellung.");
      if (P.formation && FORMATIONS[P.formation] && P.formation !== tgt.formation) { tgt.formation = P.formation; tgt.manual = []; }
      if (P.tactic && TACTICS[P.tactic]) tgt.tactic = P.tactic;
      if (P.intensity) tgt.intensity = clamp(Math.round(Number(P.intensity)) || 3, 1, 5);
      if (P.aggression) tgt.aggression = clamp(Math.round(Number(P.aggression)) || 3, 1, 5);
      if (P.minFit != null) tgt.minFit = clamp(Math.round(Number(P.minFit)) || 0, 0, 90);
      if (P.reset) tgt.manual = [];
      if (P.slot != null) {
        const n = (FORMATIONS[tgt.formation] || FORMATIONS["4-4-2"]).length;
        const i = Math.round(Number(P.slot)); if (!(i >= 0 && i < n)) return fail("Ungültige Position.");
        const m = (tgt.manual = (tgt.manual || []).slice(0, n));
        const id = P.player || null;
        if (id && !h.players.some((x) => x.id === id)) return fail("Spieler nicht im Kader.");
        if (id) for (let k = 0; k < n; k++) if (m[k] === id) m[k] = null;
        m[i] = id;
      }
      return true;
    }
    case "pitch": {
      if (!h) return fail("Kein Verein.");
      ensureGround(S, club);
      const g = h.ground, sub = 1 - subsidy(S, club);
      if (P.op === "add") {
        if (!PITCH[P.type]) return fail("Unbekannter Platz.");
        if (g.pitches.length >= 8) return fail("Mehr Fläche gibt das Gelände nicht her.");
        const cost = eur(PITCH[P.type].cost * sub);
        if (h.cash < cost) return fail("Nicht genug Geld auf dem Vereinskonto.");
        ledger(h, "out", "Investitionen", cost); g.pitches.push({ t: P.type, main: false });
        userNews(S, a.user_id, `Neuer ${PITCH[P.type].name} für ${fmt(cost)} gebaut.`);
        return true;
      }
      const p = g.pitches[Number(P.idx)]; if (!p) return fail("Platz nicht gefunden.");
      if (P.op === "convert") {
        if (!PITCH[P.type] || P.type === p.t) return fail("Ungültiger Umbau.");
        if (p.main && P.type === "tenne") return fail("Auf Asche spielt die erste Mannschaft nicht.");
        const cost = eur(PITCH[P.type].cost * 0.8 * sub);
        if (h.cash < cost) return fail("Nicht genug Geld auf dem Vereinskonto.");
        ledger(h, "out", "Investitionen", cost); userNews(S, a.user_id, `${PITCH[p.t].name} wird zum ${PITCH[P.type].name} umgebaut (${fmt(cost)}).`); p.t = P.type;
        return true;
      }
      if (P.op === "remove") { if (p.main) return fail("Der Hauptplatz bleibt."); g.pitches.splice(Number(P.idx), 1); return true; }
      return fail("Unbekannte Aktion.");
    }
    case "light": {
      if (!h) return fail("Kein Verein.");
      ensureGround(S, club);
      const g = h.ground, lvl = clamp(Math.round(Number(P.lvl)) || 0, 0, 3);
      if (lvl > g.light) {
        const cost = eur(LIGHT_COST.slice(g.light + 1, lvl + 1).reduce((x, y) => x + y, 0) * (1 - subsidy(S, club)));
        if (h.cash < cost) return fail("Nicht genug Geld auf dem Vereinskonto.");
        ledger(h, "out", "Investitionen", cost);
      }
      g.light = lvl; userNews(S, a.user_id, `Flutlicht: ${LIGHT[lvl][0]}.`);
      return true;
    }
    case "stand": {
      if (!h) return fail("Kein Verein.");
      ensureGround(S, club);
      const k = STAND[P.kind] ? P.kind : null; if (!k) return fail("Unbekannt.");
      const n = clamp(Math.round(Number(P.blocks)) || 1, -40, 40), g = h.ground;
      if (n < 0) { g[k] = Math.max(k === "steh" ? 100 : 0, g[k] + n * STAND[k].block); return true; }
      const cost = eur(n * STAND[k].block * STAND[k].perSeat);
      if (h.cash < cost) return fail("Nicht genug Geld auf dem Vereinskonto.");
      if (capacity(h) + n * STAND[k].block > 81000) return fail("Größer als der Signal Iduna Park wird es nicht.");
      ledger(h, "out", "Investitionen", cost); g[k] += n * STAND[k].block;
      userNews(S, a.user_id, `${n * STAND[k].block} neue ${STAND[k].name} für ${fmt(cost)} – Kapazität jetzt ${capacity(h).toLocaleString("de-DE")}.`);
      return true;
    }
    case "catering": {
      if (!h) return fail("Kein Verein.");
      ensureVenue(S, club);
      const lvl = clamp(Math.round(Number(P.lvl)) || 0, 0, 5);
      if (lvl > h.cat) {
        const cost = CAT_BUILD.slice(h.cat + 1, lvl + 1).reduce((a, b) => a + b, 0);
        if (h.cash < cost) return fail("Nicht genug Geld auf dem Vereinskonto.");
        ledger(h, "out", "Investitionen", cost);
      }
      h.cat = lvl;
      userNews(S, a.user_id, `Catering: ${CATERING[lvl][0]}.`);
      return true;
    }
    case "security": {
      if (!h) return fail("Kein Verein.");
      ensureVenue(S, club);
      h.sec = clamp(Math.round(Number(P.lvl)) || 0, 0, 5);
      userNews(S, a.user_id, `Sicherheitsdienst: ${SECURITY[h.sec][0]}.`);
      return true;
    }
    case "ticketAuto": {
      if (!h) return fail("Kein Verein.");
      if (P.on && !sl(h, "kasse")) return fail("Ohne Kassenwart kann niemand die Preise übernehmen.");
      h.ticketAuto = !!P.on;
      return true;
    }
    case "ticket": {
      if (!h) return fail("Kein Verein.");
      if (h.ticketAuto) h.ticketAuto = false;
      h.ticket = clamp(Number(P.factor) || 1, 0.5, 2);
      return true;
    }
    case "facility": {
      if (!h) return fail("Kein Verein.");
      if (P.kind !== "jugend") return fail("Unbekannt.");
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
      const tr = h.trainers.find((x) => x.id === P.id); if (!tr) return fail("Trainer nicht verfügbar.");
      setStaff(club, "headcoach", clamp(Math.round((tr.q / levelMid(Math.min(firstTeam(S, club).level, 11))) * 3), 1, 5));
      return true;
    }
    case "fireTrainer": { if (!h) return fail("Kein Verein."); setStaff(club, "headcoach", 0); return true; }
    case "staff": {
      if (!h) return fail("Kein Verein.");
      const role = P.role, lvl = clamp(Math.round(Number(P.lvl)) || 0, 0, 5);
      if (!ROLES[role]) return fail("Unbekanntes Amt.");
      if (SPORT_ROLES.includes(role) && sl(h, "gf") > 0 && h.gf.tasks.staff) return fail("Dieses Amt verwaltet der Geschäftsführer Sport.");
      const L = Math.min(firstTeam(S, club).level, 11);
      const cur = sl(h, role);
      if (cur === lvl) return true;
      if (cur >= 2) ledger(h, "out", "Abfindungen", staffSalary(role, cur, L) * 0.3);
      setStaff(club, role, lvl);
      userNews(S, a.user_id, lvl ? `${ROLES[role].name}: ${h.staff[role].name} übernimmt als „${ROLES[role].lv[lvl - 1][0]}“.` : `${ROLES[role].name}: Stelle ist jetzt unbesetzt.`);
      if (role === "gf" && lvl && h.gf.tasks.staff) h.gf.replan = true;
      return true;
    }
    case "gfSettings": {
      if (!h) return fail("Kein Verein.");
      if (P.budget != null) h.gf.budget = eur(clamp(Number(P.budget) || 0, 0, 1e9));
      if (P.tasks) for (const k of ["staff", "squad", "rotation"]) if (k in P.tasks) h.gf.tasks[k] = !!P.tasks[k];
      h.gf.replan = true;
      return true;
    }
    case "doctor": { if (!h) return fail("Kein Verein."); h.followDoc = !!P.follow; return true; }
    case "rename": {
      if (!h) return fail("Kein Verein.");
      const name = String(P.name || "").replace(/[\u0000-\u001f<>]/g, "").replace(/\s+/g, " ").trim().slice(0, 40);
      if (name.length < 2) return fail("Name zu kurz.");
      if (P.what === "staff") {
        const st = h.staff?.[P.role]; if (!st) return fail("Amt nicht besetzt.");
        st.name = name; return true;
      }
      const p = h.players.find((x) => x.id === P.id); if (!p) return fail("Spieler nicht im Kader.");
      p.name = name;
      for (const comp in h.allTime) if (h.allTime[comp][p.id]) h.allTime[comp][p.id].name = name;
      for (const m of S.lscorers.values()) { const e = m.get(p.id); if (e) e.name = name; }
      return true;
    }
    case "buyPlayer": {
      if (!h) return fail("Kein Verein.");
      if (h.players.length >= 30) return fail("Kader voll (max. 30).");
      const m = marketFor(S, club, daySeed).find((p) => p.id === P.id);
      if (!m) return fail("Spieler nicht mehr auf dem Markt.");
      if (h.cash < m.price) return fail("Nicht genug Geld.");
      const yrs = clamp(Math.round(Number(P.years)) || 2, 1, 5);
      const off = contractOffers(m, yrs).find((o) => o.kind === (CT_KINDS[P.kind] ? P.kind : "mix"));
      if (m.age >= 33 && yrs > 2) return fail(`${m.name} unterschreibt in seinem Alter höchstens 2 Jahre.`);
      ledger(h, "out", "Transfers", m.price);
      S.taken.add(m.id); S.freeAgents = S.freeAgents.filter((x) => x.id !== m.id);
      const np = { id: "h" + club.id + ":" + m.id, name: m.name, nat: m.nat, pos: m.pos, age: m.age, a: { ...m.a }, max: m.max, pot: m.pot, wage: off.base,
        fit: m.inj ? 0 : 100, form: 0, inj: null, ban: 0, s: newStats(), c: newStats() };
      setContract(np, off, ctUntil(S, yrs));
      h.players.push(np);
      if (m.from) { const ft = S.teams.get(m.from); ft.str = r2(ft.str * 0.997); }
      userNews(S, a.user_id, `${m.name} (${m.pos}, ${m.max.toFixed(2)}) verpflichtet für ${fmt(m.price)}.`);
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
      ensureContract(S, p);
      const remain = Math.max(0, p.ct.until - S.season) + Math.max(0, MATCHDAYS - S.day) / MATCHDAYS;
      ledger(h, "out", "Abfindungen", p.wage * remain * 0.5);
      h.players = h.players.filter((x) => x !== p);
      S.freeAgents.push({ ...p, id: "fa:" + a.id });
      return true;
    }
    case "contract": {
      if (!h) return fail("Kein Verein.");
      const p = h.players.find((x) => x.id === P.id); if (!p) return fail("Spieler nicht gefunden.");
      ensureContract(S, p);
      const yrs = clamp(Math.round(Number(P.years)) || 1, 1, 5);
      if (p.age >= 33 && yrs > 2) return fail(`${p.name} unterschreibt in seinem Alter höchstens 2 Jahre.`);
      if (p.retiring) return fail(`${p.name} beendet zum Saisonende seine Karriere.`);
      const off = contractOffers(p, yrs).find((o) => o.kind === (CT_KINDS[P.kind] ? P.kind : "mix"));
      const until = Math.max(p.ct.until, S.season - 1 + (S.day > 17 ? 1 : 0)) + yrs;
      setContract(p, off, until);
      userNews(S, a.user_id, `${p.name} verlängert bis Saison ${until} (${CT_KINDS[off.kind]}, ${fmt(off.base)} fix pro Saison).`);
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
      m.gh = r.gh; m.ga = r.ga; m.st = r.st;
      recordLeagueGoals(S, lg, r);
      if (r.H.human) afterMatchHuman(S, r.H, r.A, r, 0, lg.name, true, daySeed);
      if (r.A.human) afterMatchHuman(S, r.A, r.H, r, 1, lg.name, true, daySeed);
      const th = lg.table.get(m.h), ta = lg.table.get(m.a);
      th.p++; ta.p++; th.gf += r.gh; th.ga += r.ga; ta.gf += r.ga; ta.ga += r.gh;
      if (r.gh > r.ga) { th.w++; th.pts += 3; ta.l++; } else if (r.gh < r.ga) { ta.w++; ta.pts += 3; th.l++; } else { th.d++; ta.d++; th.pts++; ta.pts++; }
      matchFinance(S, m.h, m.a, r, lg.level, false, null);
      if (lg.level === 1) blRecords(S, m);
    }
  }
  // Pokale
  for (const cup of S.cups) {
    const ri = cup.rounds.findIndex((r) => r && r.day === d);
    if (ri < 0) continue;
    const rd = cup.rounds[ri];
    const winners = [...rd.byes];
    for (const m of rd.matches) {
      const rr = rngFrom(daySeed, cup.id, m.h, m.a);
      const r = playMatch(S, m.h, m.a, rr, ri === cup.days.length - 1 && cup.type === "dfb", "pokal");
      m.gh = r.gh; m.ga = r.ga; m.st = r.st;
      if (r.H.human) afterMatchHuman(S, r.H, r.A, r, 0, cup.name, false, daySeed);
      if (r.A.human) afterMatchHuman(S, r.A, r.H, r, 1, cup.name, false, daySeed);
      if (m.gh === m.ga) {
        m.et = true;
        const p1 = Math.min(0.8, r.lh / 3 / 4), p2 = Math.min(0.8, r.la / 3 / 4);
        for (let i = 0; i < 4; i++) { if (rr() < p1) m.gh++; if (rr() < p2) m.ga++; }
        if (m.gh === m.ga) { const hw = rr() < 0.5 + clamp(r.rel / 400, -0.15, 0.15); m.pen = hw ? "h" : "a"; }
      }
      m.winner = m.pen ? (m.pen === "h" ? m.h : m.a) : m.gh > m.ga ? m.h : m.a;
      winners.push(m.winner);
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
  // Europapokal
  if (S.euro) euroDay(S, d, daySeed);
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

function secCheck(S, c, att) {
  const h = c.h, cap = SEC_CAP[h.sec ?? 5];
  if (att <= cap) return;
  const fine = eur((att - cap) * 3);
  ledger(h, "out", "Strafen & Auflagen", fine);
  userNews(S, c.owner, `Ordnungsstrafe: ${att} Zuschauer, aber der Sicherheitsdienst ist nur für ${cap} ausgelegt. Der Verband kassiert ${fmt(fine)}.`);
}
export function ticketOptimum(S, c) {
  const h = c.h, t = firstTeam(S, c), L = Math.min(t.level, 11), save = h.ticket || 1;
  const rev = (f) => { h.ticket = f; const att = attendance(S, c, t, null, false); return att * (LV[L].price * f + CAT_EUR[h.cat ?? 2] * (1 + 0.1 * venueScore(h))); };
  let best = 1, bv = -1;
  for (let f = 0.5; f <= 2.0001; f += 0.05) { const v = rev(r2(f)); if (v > bv + 1e-9) { bv = v; best = r2(f); } }
  const cur = rev(save);
  h.ticket = save;
  return { f: best, rev: eur(bv), cur: eur(cur) };
}
// Tipp des Kassenwarts: Genauigkeit je Stufe (Stufe 5 exakt)
export function kasseAdvice(S, c) {
  const h = c.h, lvl = sl(h, "kasse");
  if (!lvl) return null;
  const o = ticketOptimum(S, c);
  const noise = [0, 0.45, 0.25, 0.12, 0.05, 0][lvl];
  const rr = rngFrom("kasse", c.id, S.season, Math.floor((S.day || 0) / 5));
  const f = r2(clamp(Math.round((o.f * (1 + (rr() - 0.5) * 2 * noise)) * 20) / 20, 0.5, 2));
  const cur = h.ticket || 1;
  return { lvl, f, opt: o, dir: f > cur + 0.02 ? "up" : f < cur - 0.02 ? "down" : "ok" };
}
function attendance(S, c, t, opp, cup) {
  const h = c.h; const L = Math.min(t.level, 11);
  const lg = t.league ? S.leagues.get(t.league) : null;
  let posRatio = 0.5;
  if (lg) { const sorted = sortedTable(lg); const i = sorted.findIndex((x) => x.id === t.id); posRatio = sorted.length > 1 ? i / (sorted.length - 1) : 0.5; }
  const oppF = opp ? clamp(1 + (L - opp.level) * 0.25, 0.7, 3) : 1;
  let att = LV[L].att * h.popularity * (1 + 0.06 * venueScore(h)) * (1 + 0.05 * sl(h, "presse")) * (1 + 0.01 * sl(h, "praesident")) * (1.25 - 0.5 * posRatio) * oppF * Math.exp(-0.6 * (h.ticket - 1)) * (cup ? 1.3 : 1) * (1 + 0.02 * ((h.cat ?? 2) - 2));
  const cap = capacity(h);
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
      let ticket = att * price * (1 + 0.8 * sitzShare(h)); if (isCup) ticket *= 0.5;
      ledger(h, "in", "Zuschauer", ticket);
      ledger(h, "in", "Catering & Fanartikel", att * CAT_EUR[h.cat ?? 2] * (1 + 0.1 * venueScore(h)));
      secCheck(S, c, att);
      ledger(h, "out", "Spielbetrieb", LV[L].match);
      h.lastAtt = att;
    } else ledger(h, "out", "Spielbetrieb", LV[L].match * 0.4);
    if (!isCup && won && h.sponsor?.win) ledger(h, "in", "Sponsoring", h.sponsor.win);
    h.popularity = clamp(h.popularity + (won ? 0.004 * (1 + 0.15 * sl(h, "presse")) : -0.002), 0.5, 2.5);
  }
}

// Karriereende: Wahrscheinlichkeit je Alter aus einer Normalverteilung des Karriereendes
// (Profis: im Schnitt ~33 Jahre, Spitzenspieler ~35, Torhüter ~2–3 Jahre später; Streuung ~3,3 Jahre).
function normCdf(x) { const t = 1 / (1 + 0.3275911 * Math.abs(x) / Math.SQRT2); const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x / 2); return x >= 0 ? 0.5 * (1 + y) : 0.5 * (1 - y); }
export function retireChance(p, L) {
  if (p.age < 28) return 0;
  const posAdj = p.pos === "TW" ? 2.5 : ["IV", "DM", "MS"].includes(p.pos) ? 0.5 : ["AS", "AV", "AM"].includes(p.pos) ? -0.5 : 0;
  const lvlAdj = clamp((p.max / Math.max(1, levelMid(L)) - 1) * 4, -1.5, 1.5);
  const mu = 33.3 + posAdj + lvlAdj - 0.6 * (p.major || 0) + ((p.a?.fit ?? 50) - 50) / 50;
  const sd = 3.3;
  const a0 = normCdf((p.age - 0.5 - mu) / sd), a1 = normCdf((p.age + 0.5 - mu) / sd);
  return clamp((a1 - a0) / Math.max(1e-6, 1 - a0), 0, 0.97);
}
function retirementCheck(S, c, daySeed) {
  const h = c.h, L = Math.min(firstTeam(S, c).level, 11);
  const rng = rngFrom(daySeed, "retire", c.id);
  const out = [];
  for (const p of h.players) {
    if (p.retiring) continue;
    let q = retireChance({ ...p, age: p.age + 1 }, L);
    if (p.ct && p.ct.until > S.season) q *= 0.35;       // laufender Vertrag wird meist erfüllt
    if (rng() < q) { p.retiring = true; out.push(`${p.name} (${p.age})`); }
  }
  if (out.length) userNews(S, c.owner, `Karriereende zum Saisonende angekündigt: ${out.join(", ")}.`);
}
function humanDaily(S, c, daySeed) {
  const h = c.h; const t = firstTeam(S, c);
  if (t.status === "pending") return;
  const L = Math.min(t.level, 11);
  const per = 1 / MATCHDAYS;
  ledger(h, "out", "Gehälter Spieler", h.players.reduce((s, p) => s + p.wage, 0) * per);
  ledger(h, "out", "Gehälter Personal", staffCost(h, L) * per);
  gfDaily(S, c, daySeed);
  ensureVenue(S, c);
  ledger(h, "out", "Verwaltung & Platz", LV[L].fixed * per * (1 - 0.02 * sl(h, "kasse")));
  if (CAT_UPKEEP[h.cat]) ledger(h, "out", "Catering (Betrieb)", CAT_UPKEEP[h.cat] * per);
  if (SEC_COST[h.sec]) ledger(h, "out", "Sicherheitsdienst", SEC_COST[h.sec] * per);
  if (h.ticketAuto && sl(h, "kasse")) { const adv = kasseAdvice(S, c); if (adv) h.ticket = adv.f; }
  ledger(h, "out", "Unterhalt Anlagen", (h.facInvest || 0) * 0.08 * per);
  ledger(h, "out", "Unterhalt Gelände", groundUpkeep(S, c) * per);
  ledger(h, "out", "Jugendabteilung", youthCost(S, c) * per);
  for (const rk of [2, 3]) if (h.reserves[rk]?.active) ledger(h, "out", rk + ". Mannschaft", reserveCost(S, c, rk) * per);
  if (LV[L].tv) ledger(h, "in", "TV-Gelder", LV[L].tv * per);
  ledger(h, "in", "Sponsoring", (h.sponsor ? h.sponsor.base : LV[L].sponsor * 0.35 * (1 + 0.07 * sl(h, "marketing"))) * per);
  // Fitness, Verletzungen, Krankheiten, Training
  const lvl = (h.intensity || 3) - 1;
  const rng = rngFrom(daySeed, "train", c.id);
  ensureGround(S, c);
  const trainQ = trainingCapacity(S, h);
  const trainerF = (0.5 + 0.22 * sl(h, "cotrainer") + 0.06 * sl(h, "headcoach")) * (1 + 0.01 * sl(h, "praesident"));
  const mf = monthFactor(S);
  const illNow = h.players.filter((p) => p.inj?.ill).length;
  const frng = rngFrom(daySeed, "form", c.id);
  for (const p of h.players) {
    ensureContract(S, p);
    // Form: tägliche Schwankung, kehrt langsam zur Mitte zurück
    const sw = formSwing(p);
    p.form = r2(clamp((p.form || 0) * 0.85 + (frng() - 0.5) * 2 * sw * 0.35, -1, 1));
  }
  if (S.day === 20) {
    const exp = h.players.filter((p) => p.ct.until <= S.season && !p.retiring);
    if (exp.length) userNews(S, c.owner, `Verträge laufen zum Saisonende aus: ${exp.map((p) => p.name).join(", ")}. Verlängern im Kader.`);
  }
  if (S.day === 25) retirementCheck(S, c, daySeed);
  absences(S, c, daySeed);
  for (const p of h.players) {
    if (p.inj) {
      p.fit = 0;
      if (--p.inj.days <= 0) { const back = p.inj.back; userNews(S, c.owner, `${p.name} ist wieder einsatzbereit.`); p.inj = null; p.fit = back; }
    } else {
      p.fit = r2(clamp(p.fit + INT_REC[lvl] * (0.8 + p.a.fit / 250) * (p.played ? 0.5 : 1) * (1 + 0.06 * sl(h, "physio")), 0, 100));
      const illP = 0.0018 * mf * (p.fit < 40 ? 1.6 : 1) * (1 + 0.35 * illNow);
      const trP = 0.0012 * INT_RISK[lvl] * (1 + (1 - p.fit / 100)) * (p.played ? 0.3 : 1);
      const x = rng();
      if (x < illP) injure(S, c, p, rng, ILLNESS, 0, true);
      else if (x < illP + trP) injure(S, c, p, rng, INJURIES, 0.5, false);
    }
    p.played = false;
    if (p.ban > 0) p.ban--;
    // Training
    if (p.inj) continue;
    let delta = 0;
    if (p.max < p.pot && p.age < 30) delta += (p.pot - p.max) * 0.006 * (0.6 + 0.5 * trainQ) * trainerF * INT_GROW[lvl] * (0.5 + rng()) * (p.age < 21 ? 1 + 0.1 * sl(h, "nlz") : 1) * (p.pos === "TW" ? 1 + 0.15 * sl(h, "twtrainer") : 1);
    if (p.age >= 30) delta -= p.max * 0.0006 * (p.age - 29) * (0.5 + rng());
    if (delta) {
      const f = clamp((p.max + delta) / Math.max(0.5, p.max), 0.9, 1.1);
      for (const k of ATTRS) p.a[k] = r2(clamp(p.a[k] * f, 0.5, 99.99));
    }
    if (p.age < 31) { const ath = sl(h, "athletik"), psy = sl(h, "psycho"); if (ath) { p.a.spd = r2(clamp(p.a.spd * (1 + 0.0004 * ath), 0.5, 99.99)); p.a.fit = r2(clamp(p.a.fit * (1 + 0.0004 * ath), 0.5, 99.99)); } if (psy) p.a.men = r2(clamp(p.a.men * (1 + 0.0004 * psy), 0.5, 99.99)); }
    refreshPlayer(p);
  }
}
// Amateurfußball: Spieler fehlen aus privaten Gründen (Bezirksliga sehr selten … Kreisklassen gelegentlich)
// [Grund, Gewicht, Tage min, Tage max, Monate (leer = ganzjährig)]
export const ABSENCES = [
  ["muss arbeiten (Spätschicht)", 14, 1, 1], ["Kind krank", 10, 1, 1], ["Konfirmation der Tochter", 6, 1, 1, [4, 5]], ["Kommunion des Sohnes", 4, 1, 1, [4, 5]],
  ["Geburt seines Kindes", 3, 2, 4], ["Hochzeit eines Kumpels", 5, 1, 1, [5, 6, 7, 8, 9]], ["Polterabend", 3, 1, 1, [4, 5, 6, 7, 8, 9]],
  ["Urlaub auf Mallorca", 6, 7, 12, [6, 7, 8]], ["Herbsturlaub mit der Familie", 4, 5, 9, [10]], ["Skiurlaub in Tirol", 4, 6, 9, [1, 2, 3]],
  ["Junggesellenabschied in Hamburg", 3, 1, 2, [4, 5, 6, 7, 8, 9]], ["90. Geburtstag der Oma", 3, 1, 1], ["Umzug", 3, 1, 1],
  ["Montage in Norwegen", 3, 4, 9], ["Schützenfest (ist Thronanwärter)", 4, 1, 2, [6, 7, 8]], ["Erntezeit auf dem Hof", 4, 2, 5, [7, 8, 9]],
  ["Klausurenphase an der Uni", 4, 1, 3, [1, 2, 6, 7]], ["Elternabend", 3, 1, 1], ["Einsatz bei der Freiwilligen Feuerwehr", 3, 1, 1],
  ["Auto springt nicht an", 4, 1, 1], ["Weihnachtsfeier der Firma", 4, 1, 1, [12]], ["Karneval/Fasching", 4, 1, 1, [2]],
  ["Schwiegereltern zu Besuch", 4, 1, 1], ["renoviert das Bad", 3, 1, 2], ["Dauerkarte – Heimspiel des Lieblingsvereins", 4, 1, 1],
  ["Familienfeier", 5, 1, 1], ["Taufe des Patenkinds", 3, 1, 1], ["Nachtdienst im Krankenhaus", 3, 1, 1], ["hat verschlafen", 3, 1, 1],
  ["Fortbildung beim Arbeitgeber", 3, 1, 2], ["Geburtstag der Freundin", 4, 1, 1], ["Ostern bei der Familie", 3, 1, 2, [3, 4]],
];
const ABSENCE_P = { 7: 0.004, 8: 0.012, 9: 0.022, 10: 0.03, 11: 0.04, 12: 0.04 };
export function gameMonth(S, offset = 0) {
  if (!S.startDate) return null;
  const [y, m, d] = S.startDate.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + (S.gday || 1) - 1 + offset)).getUTCMonth() + 1;
}
function absences(S, c, daySeed) {
  const h = c.h, L = firstTeam(S, c).level;
  for (const p of h.players) if (p.away && --p.away.days <= 0) p.away = null;
  const base = ABSENCE_P[Math.min(L, 12)] || 0;
  if (!base) return;
  const mon = gameMonth(S, 1);
  const list = ABSENCES.filter((a) => !a[4] || (mon && a[4].includes(mon)));
  const rng = rngFrom(daySeed, "away", c.id);
  const out = [];
  for (const p of h.players) {
    if (p.inj || p.away) continue;
    if (rng() < base * (1 - 0.05 * sl(h, "betreuer")) * (p.age >= 27 && p.age <= 40 ? 1.2 : 0.85)) {
      const tot = list.reduce((a, b) => a + b[1], 0); let x = rng() * tot, r = list[0];
      for (const a of list) { x -= a[1]; if (x <= 0) { r = a; break; } }
      const days = r[2] + Math.floor(rng() * (r[3] - r[2] + 1));
      p.away = { n: r[0], days };
      out.push(`${p.name} (${r[0]}${days > 1 ? `, ${days} Spieltage` : ""})`);
    }
  }
  if (out.length) userNews(S, c.owner, `Absagen für den nächsten Spieltag: ${out.join("; ")}.`);
}
function monthFactor(S) {
  if (!S.startDate) return 1;
  const [y, m, d] = S.startDate.split("-").map(Number);
  const mon = new Date(Date.UTC(y, m - 1, d + (S.gday || 1) - 1)).getUTCMonth() + 1;
  return [12, 1, 2].includes(mon) ? 2.2 : [11, 3].includes(mon) ? 1.6 : [10, 4].includes(mon) ? 1.1 : 0.7;
}


// ---------------------------------------------------------------- Rekorde Bundesliga
function blRecords(S, m) {
  const diff = Math.abs(m.gh - m.ga), tot = m.gh + m.ga;
  const rec = { season: S.season, day: S.day, h: S.teams.get(m.h).name, a: S.teams.get(m.a).name, gh: m.gh, ga: m.ga };
  if (!S.records.bigWin || diff > Math.abs(S.records.bigWin.gh - S.records.bigWin.ga)) S.records.bigWin = rec;
  if (!S.records.maxGoals || tot > S.records.maxGoals.gh + S.records.maxGoals.ga) S.records.maxGoals = rec;
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
  S.archive.push({ season: S.season, leagues: Object.fromEntries([...S.leagues.values()].filter((l) => l.teams.length).map((l) => [l.id, { name: l.name, level: l.level, rows: S.lastTables.get(l.id).map((r) => ({ id: r.id, name: r.name, p: r.p, w: r.w, d: r.d, l: r.l, gf: r.gf, ga: r.ga, pts: r.pts })), scorers: topScorers(S, 10, l.id).map((x) => ({ name: x.name, team: S.teams.get(x.team)?.name, goals: x.goals })) }])) });
  S.cupWinners = {};
  for (const cup of S.cups) S.cupWinners[cup.id] = { winner: cup.winner, runnerUp: cup.runnerUp };
  if (S.euro) euroSeasonEnd(S);
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
  const king = topScorers(S, 1, "bl")[0];
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
    if (c?.owner && t.rank === 1 && b === t.level && b > 1 && (rank.get(t.id)?.pos ?? 99) <= 1 && !licensedFor(S, t, b - 1))
      userNews(S, c.owner, `Lizenz verweigert: ${t.name} hätte aufsteigen können, aber für die ${LV[b - 1].name} fehlt: ${licenseIssues(S, c, b - 1).join(", ")}. Der Verein bleibt in der ${S.leagues.get(t.league).name}.`);
    if (c?.owner && t.rank === 1 && b !== t.level && b <= 11) userNews(S, c.owner, t.level < b ? `Aufstieg! ${t.name} spielt jetzt in der ${S.leagues.get(t.league).name}.` : `Abstieg: ${t.name} spielt jetzt in der ${S.leagues.get(t.league).name}.`);
  }
  // Menschliche Vereine: Altern, Jugend, Verträge
  for (const c of S.clubs.values()) {
    if (!c.h) continue;
    const h = c.h, t = firstTeam(S, c); const L = Math.min(t.level, 11);
    const rr = rngFrom(daySeed, "youth", c.id);
    const retire = h.players.filter((p) => p.retiring);
    if (retire.length) userNews(S, c.owner, "Karriereende: " + retire.map((p) => `${p.name} (${p.age + 1})`).join(", ") + ". Danke für alles!");
    // GF Sport verlängert auf Wunsch wichtige Verträge
    if (sl(h, "gf") && h.gf.tasks.squad) {
      const avg = h.players.reduce((a, p) => a + p.max, 0) / Math.max(1, h.players.length);
      for (const p of h.players) if (!p.retiring && p.ct?.until <= S.season && (p.max >= avg * (1.05 - 0.03 * sl(h, "gf")) || p.age <= 21) && p.age < 33) {
        const off = contractOffers(p, 2).find((o) => o.kind === "mix"); setContract(p, off, S.season + 2);
        userNews(S, c.owner, `GF Sport verlängert mit ${p.name} bis Saison ${S.season + 2}.`);
      }
    }
    const leaving = h.players.filter((p) => !p.retiring && p.ct && p.ct.until <= S.season);
    if (leaving.length) userNews(S, c.owner, "Vertrag ausgelaufen, ablösefrei weg: " + leaving.map((p) => p.name).join(", "));
    for (const p of leaving) S.freeAgents.push({ ...p, id: "fa:" + S.season + ":" + p.id, ct: null });
    h.players = h.players.filter((p) => !p.retiring && !leaving.includes(p));
    for (const p of h.players) { p.age++; if (!p.ct) p.wage = wageOf(p.max); }
    const nlz = sl(h, "nlz");
    ensureGround(S, c);
    const n = 1 + Math.floor(youthTeams(h) / 2) + Math.floor(nlz / 2);
    for (let i = 0; i < n; i++) {
      const base = levelMid(L) * (0.32 + 0.035 * h.fac.jugend) * (0.8 + rr() * 0.4) * (1 + 0.06 * nlz);
      const pos = POSITIONS[Math.floor(rr() * POSITIONS.length)];
      const p = genPlayer(rr, pos, base, 17 + Math.floor(rr() * 2), "y" + c.id + ":" + S.season, h.youthSeq++, { level: L, youth: true });
      p.pot = r2(clamp(p.max * (1.5 + 0.09 * h.fac.jugend + rr() * 0.4) * (1 + 0.05 * nlz), p.max, 99.99));
      setContract(p, contractOffers(p, 3).find((o) => o.kind === "fest"), S.season + 3);
      h.players.push(p);
    }
    userNews(S, c.owner, `${n} Talente aus der eigenen Jugend rücken in den Kader auf.`);
    while (h.players.length < 14) h.players.push(genPlayer(rr, FOUND_PLAN[h.players.length % FOUND_PLAN.length], levelMid(L) * 0.6, 20, "f" + c.id + ":" + S.season, h.youthSeq++, { level: L }));
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
export function simulate(world, seeds, actions, members = {}, opts = {}) {
  const S0 = hex32(seeds[0]);
  const S = createState(world, S0);
  S.startDate = opts.startDate || null;
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
