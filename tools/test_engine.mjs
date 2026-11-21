import fs from "fs";
import * as E from "../engine.js";
const world = JSON.parse(fs.readFileSync(new URL("../world.json", import.meta.url)));
const days = +(process.argv[2] || 80);
const seeds = [];
for (let g = 0; g <= days; g++) seeds.push((E.hash32("secret:" + g) >>> 0).toString(16).padStart(8, "0") + "abcdef");

// Initialstand prüfen
const S0 = E.createState(world, E.hex32(seeds[0]));
const sizes = [...S0.leagues.values()].map((l) => `${l.id}:${l.teams.length}`).join(" ");
console.log("Ligagrößen nach Normalisierung:", sizes);
console.log("Startbewegungen:");
for (const m of S0.initialMoves) console.log("  ", m.type, S0.teams.get(m.team).name, m.from, "->", m.to);
console.log("Pokale:", S0.cups.map((c) => `${c.id}(${c.entrants.length})`).join(" "));

const actions = [
  { id: 1, user_id: "u1", type: "found", payload: { name: "FC Blue Angels", kreis: "RH" }, eff_day: 1 },
  { id: 2, user_id: "u2", type: "investor", payload: {}, eff_day: 1 },
];
const tl = [...S0.teams.values()].find((t) => t.name === "SSG Halvestorf-Herkendorf");
actions.push({ id: 3, user_id: "u2", type: "buy", payload: { clubId: tl.clubId }, eff_day: 1 });
actions.push({ id: 4, user_id: "u2", type: "sponsor", payload: { id: "o2" }, eff_day: 2 });
actions.push({ id: 5, user_id: "u2", type: "facility", payload: { kind: "training" }, eff_day: 3 });
actions.push({ id: 6, user_id: "u2", type: "reserve", payload: { rank: 2, on: false }, eff_day: 4 });
const t0 = Date.now();
const S = E.simulate(world, seeds, actions, { u1: "Anna", u2: "Ben" });
const t1 = Date.now();
console.log(`Simulation ${days} Tage: ${t1 - t0} ms, Saison ${S.season}, Tag ${S.day}`);
const S2 = E.simulate(world, seeds, actions, { u1: "Anna", u2: "Ben" });
const sig = (X) => [...X.leagues.values()].map((l) => l.teams.join(",") + [...l.table.values()].map((r) => r.pts + ":" + r.gf).join(",")).join("|");
console.log("deterministisch:", sig(S) === sig(S2));
const bl = S.leagues.get("bl");
console.log("BL Tabelle:", E.sortedTable(bl).slice(0, 5).map((r) => `${S.teams.get(r.id).name} ${r.pts} (${r.gf}:${r.ga})`).join(" | "));
console.log("sizes:", [...S.leagues.values()].filter((l) => l.teams.length !== 18).map((l) => `${l.id}:${l.teams.length}`).join(" "));
for (const u of S.users.values()) { console.log(u.name, u.role, u.clubId, u.wallet); for (const n of u.news.slice(-8)) console.log("   ", n.g, n.text); }
const c = S.clubs.get(tl.clubId);
console.log("Halvestorf cash", c.h.cash, "XI", E.humanXI(S, c).str, "league", firstName(c));
function firstName(c) { const t = S.teams.get(c.teams[0]); return t.league + " lvl" + t.level; }
console.log("Jahresabschluss:", JSON.stringify(c.h.annual.at(-1) || c.h.ledger).slice(0, 600));
console.log("history:", JSON.stringify(S.history.at(-1)?.cups));
console.log("Blue Angels:", [...S.teams.values()].filter((t) => t.name === "FC Blue Angels").map((t) => t.status + " " + t.league));
const goals = []; for (const l of S.leagues.values()) for (const r of l.table.values()) goals.push(r.gf / Math.max(1, r.p));
console.log("Tore/Spiel Schnitt:", (goals.reduce((a, b) => a + b, 0) / goals.length * 2).toFixed(2));
