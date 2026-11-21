import * as E from "./engine.js";
import { backend, MODE, kickoff } from "./backend.js";

const $app = document.getElementById("app");
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const eur = (x) => (x == null ? "–" : Math.round(x).toLocaleString("de-DE") + " €");
const st = (x) => (x == null ? "–" : Number(x).toFixed(2));
const LVLNAME = (l) => E.LV[l]?.name || "–";

const app = { world: null, S: null, info: null, seeds: [], actions: [], members: {}, me: null, tab: "home", sel: {}, busy: false, sig: "" };

// ------------------------------------------------------------ Start
async function boot() {
  try {
    app.world = await (await fetch("./world.json")).json();
    const r = await backend.init();
    app.me = r.user?.id || null;
    if (MODE === "online" && !r.user) return renderAuth();
    if (MODE === "online" && !r.member) return renderJoin();
    await load();
    setInterval(poll, 60000);
    setInterval(tick, 1000);
  } catch (e) { console.error(e); $app.innerHTML = `<div class="center"><div class="card auth"><h3>Fehler beim Laden</h3><p class="muted">${esc(e.message || e)}</p></div></div>`; }
}

async function load() {
  const [info, seeds, actions, members] = await Promise.all([backend.info(), backend.seeds(), backend.actions(), backend.members()]);
  app.info = info; app.seeds = seeds; app.actions = actions; app.members = members;
  app.sig = seeds.length + ":" + actions.length;
  if (!seeds.length) return renderWaiting();
  const t0 = performance.now();
  app.S = E.simulate(app.world, seeds, actions, members);
  app.simMs = Math.round(performance.now() - t0);
  render();
}
async function poll() {
  try {
    const [seeds, actions] = await Promise.all([backend.seeds(), backend.actions()]);
    if (seeds.length + ":" + actions.length !== app.sig) await load();
  } catch (e) { console.warn(e); }
}
function tick() {
  const el = document.getElementById("countdown"); if (!el || !app.info) return;
  const ko = kickoff(app.info.start_date, (app.S?.revealed ?? -1) + 1);
  let ms = ko - Date.now();
  if (ms <= 0) { el.textContent = "läuft – Ergebnisse gleich da"; if (ms < -5000 && ms > -8000) poll(); return; }
  const h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000), s = Math.floor((ms % 60000) / 1000);
  el.textContent = `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
async function act(type, payload = {}) {
  if (app.busy) return; app.busy = true;
  try { await backend.submit(type, payload); await load(); toast("Gespeichert – gilt ab dem nächsten Spieltag."); }
  catch (e) { toast("Fehler: " + (e.message || e)); }
  finally { app.busy = false; }
}
function toast(msg) {
  const t = document.createElement("div"); t.className = "toast"; t.textContent = msg; document.body.appendChild(t);
  setTimeout(() => t.remove(), 3200);
}

// ------------------------------------------------------------ Anmeldung
function renderAuth() {
  $app.innerHTML = `<div class="center"><div class="card auth">
    <h2>Anstoß</h2><p class="sub">Melde dich an oder lege ein Konto an. Danach brauchst du den Einladungscode.</p>
    <input id="em" type="email" placeholder="E-Mail" autocomplete="email">
    <input id="pw" type="password" placeholder="Passwort (mind. 6 Zeichen)" autocomplete="current-password">
    <div class="row"><button class="btn pri" id="in">Anmelden</button><button class="btn" id="up">Konto anlegen</button></div>
    <p class="small muted" id="msg"></p></div></div>`;
  const go = async (fn) => {
    const em = document.getElementById("em").value.trim(), pw = document.getElementById("pw").value;
    const msg = document.getElementById("msg");
    try { await backend[fn](em, pw); location.reload(); }
    catch (e) { msg.textContent = e.message || String(e); }
  };
  document.getElementById("in").onclick = () => go("signIn");
  document.getElementById("up").onclick = () => go("signUp");
}
function renderJoin() {
  $app.innerHTML = `<div class="center"><div class="card auth">
    <h2>Dem Spiel beitreten</h2><p class="sub">Den Einladungscode bekommst du von der Person, die das Spiel eingerichtet hat.</p>
    <input id="nm" placeholder="Dein Name im Spiel" maxlength="30">
    <input id="cd" placeholder="Einladungscode">
    <div class="row"><button class="btn pri" id="jn">Beitreten</button><button class="btn" id="out">Abmelden</button></div>
    <p class="small muted" id="msg"></p></div></div>`;
  document.getElementById("jn").onclick = async () => {
    try { await backend.join(document.getElementById("cd").value, document.getElementById("nm").value); location.reload(); }
    catch (e) { document.getElementById("msg").textContent = e.message || String(e); }
  };
  document.getElementById("out").onclick = async () => { await backend.signOut(); location.reload(); };
}
function renderWaiting() {
  const ko = kickoff(app.info.start_date, 0);
  $app.innerHTML = `<div class="center"><div class="card auth"><h2>${esc(app.info.name)}</h2>
  <p>Die Vorsaison beginnt am <b>${ko.toLocaleString("de-DE", { dateStyle: "full", timeStyle: "short", timeZone: "Europe/Berlin" })}</b>.</p>
  <p class="muted small">Der erste Spieltag ist am ${kickoff(app.info.start_date, 1).toLocaleDateString("de-DE", { timeZone: "Europe/Berlin" })} um 18:00 Uhr.</p></div></div>`;
}

// ------------------------------------------------------------ Hilfen
const S = () => app.S;
const meUser = () => S().users.get(app.me) || { name: app.members[app.me] || "Ich", role: null, clubId: null, wallet: 0, news: [] };
const myClub = () => { const u = meUser(); return u.clubId ? S().clubs.get(u.clubId) : null; };
const team = (id) => S().teams.get(id);
const lgOf = (t) => (t?.league ? S().leagues.get(t.league) : null);
function posOf(t) { const lg = lgOf(t); if (!lg) return null; const i = E.sortedTable(lg).findIndex((r) => r.id === t.id); return i < 0 ? null : i + 1; }
const ownerName = (c) => (c?.owner ? S().users.get(c.owner)?.name || app.members[c.owner] || "?" : null);
function nextDay() { return E.dayInfo((S().revealed ?? 0) + 1); }
function fixtureFor(t, day) {
  const lg = lgOf(t); const fx = lg?.fixtures?.[day] || [];
  return fx.find((m) => m.h === t.id || m.a === t.id) || null;
}
function cupMatchFor(t, day) {
  for (const cup of S().cups) for (const rd of cup.rounds) if (rd && rd.day === day) {
    const m = rd.matches.find((x) => x.h === t.id || x.a === t.id); if (m) return { cup, m };
  }
  return null;
}
function initials(name) { return name.replace(/[^A-Za-zÄÖÜäöüß0-9 ]/g, "").split(" ").filter((w) => w.length > 1 && !/^(FC|SV|TSV|SC|VfL|VfB|TuS|SG|SpVgg|1|MTV|BSV|SSV|FSV)$/i.test(w)).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "FC"; }

// ------------------------------------------------------------ Rahmen
function render() {
  const c = myClub(); const u = meUser();
  const tabs = c ? [["home", "Übersicht"], ["kader", "Kader"], ["transfer", "Transfers"], ["verein", "Verein"], ["finanzen", "Finanzen"], ["ligen", "Ligen"], ["pokale", "Pokale"], ["spieler", "Mitspieler"]]
    : [["start", "Start"], ["ligen", "Ligen"], ["pokale", "Pokale"], ["spieler", "Mitspieler"]];
  if (!tabs.find((t) => t[0] === app.tab)) app.tab = tabs[0][0];
  const t = c ? E.firstTeam(S(), c) : null;
  const nd = nextDay();
  let kpis = "";
  if (c) {
    const pos = posOf(t);
    kpis = `<div class="kpi ${c.h.cash < 0 ? "alert" : ""}"><label>Konto</label><b>${eur(c.h.cash)}</b></div>
      <div class="kpi"><label>Stärke</label><b>${st(E.humanXI(S(), c).str)}</b></div>
      <div class="kpi"><label>Platz</label><b>${pos ?? "–"}</b></div>`;
  }
  if (u.role === "Investor") kpis += `<div class="kpi"><label>Privat</label><b>${eur(u.wallet)}</b></div>`;
  kpis += `<div class="kpi"><label>Anpfiff 18:00</label><b id="countdown" style="font-size:17px">–</b></div>`;
  $app.innerHTML = `<header><div class="wrap">
    <div class="topin">
      <div class="row club"><div class="crest">${esc(c ? initials(c.name) : "⚽")}</div>
        <div><b>${esc(c ? c.name : app.info.name)}</b><small>${c ? esc(lgOf(t)?.name || "wartet auf Saisonstart") + " · " : ""}Saison ${nd.season} · Spieltag ${Math.min(nd.day, 34)}${nd.day === 35 ? " (Saisonumbruch)" : "/34"}${MODE === "solo" ? " · Solo-Test" : ""}</small></div></div>
      <div class="kpis">${kpis}</div>
    </div>
    <nav>${tabs.map(([k, n]) => `<button data-tab="${k}" aria-selected="${app.tab === k}">${n}</button>`).join("")}</nav>
  </div></header><main class="wrap" id="main"></main>`;
  $app.querySelectorAll("nav button").forEach((b) => (b.onclick = () => { app.tab = b.dataset.tab; render(); }));
  const main = document.getElementById("main");
  const view = { home: vHome, kader: vKader, transfer: vTransfer, verein: vVerein, finanzen: vFinanzen, ligen: vLigen, pokale: vPokale, spieler: vSpieler, start: vStart }[app.tab];
  main.innerHTML = view();
  bindActions(main);
  tick();
}
function bindActions(root) {
  root.querySelectorAll("[data-act]").forEach((el) => {
    el.addEventListener(el.tagName === "SELECT" ? "change" : "click", () => {
      const type = el.dataset.act;
      let payload = el.dataset.p ? JSON.parse(el.dataset.p) : {};
      if (el.dataset.confirm && !confirm(el.dataset.confirm)) return;
      if (el.tagName === "SELECT") payload = { ...payload, [el.dataset.key]: el.value };
      if (type === "found") payload = { name: document.getElementById("fname").value, kreis: document.getElementById("fkreis").value };
      if (type === "investorCustom") { act("investor", { custom: true, title: document.getElementById("itit").value, desc: document.getElementById("idesc").value, capital: Number(document.getElementById("icap").value) }); return; }
      if (type === "deposit") payload = { amount: Number(document.getElementById("dep").value) };
      act(type, payload);
    });
  });
  root.querySelectorAll("[data-sel]").forEach((el) => {
    el.addEventListener(el.tagName === "SELECT" ? "change" : "click", () => { app.sel[el.dataset.sel] = el.tagName === "SELECT" ? el.value : el.dataset.v; render(); });
  });
}
const btn = (label, type, p = {}, cls = "btn sm", extra = "") => `<button class="${cls}" data-act="${type}" data-p='${esc(JSON.stringify(p))}' ${extra}>${label}</button>`;

// ------------------------------------------------------------ Start (ohne Verein)
function vStart() {
  const u = meUser();
  let html = `<h2>Willkommen, ${esc(u.name)}</h2><p class="sub">Jeder echte Kalendertag ist ein Spieltag, Anpfiff ist um 18:00 Uhr. Eine Saison dauert 34 Spieltage plus einen Tag Saisonumbruch.</p>`;
  if (!u.role) {
    const mode = app.sel.startMode || "";
    html += `<h3 style="font-size:22px;margin-top:4px">Wie möchtest du starten?</h3>
    <div class="grid g2" style="margin-bottom:14px">
      <button class="card choice ${mode === "found" ? "on" : ""}" data-sel="startMode" data-v="found"><b>Verein gründen</b><span>Klein anfangen in der untersten Spielklasse der Region Hannover oder in Hameln-Pyrmont – mit 50.000 € und viel Herzblut.</span></button>
      <button class="card choice ${mode === "investor" ? "on" : ""}" data-sel="startMode" data-v="investor"><b>Als Investor einsteigen</b><span>Wähle, wer du bist – vom Kioskbesitzer bis zum Tech-Milliardär – und kauf einen bestehenden Klub ab Liga 5 abwärts.</span></button>
    </div>`;
    if (mode === "found") {
      html += `<div class="card"><h3>Neuen Verein gründen</h3><p class="muted">Der Einstieg in den Spielbetrieb erfolgt zur nächsten Saison. Bis dahin kannst du Kader, Trainer und Anlagen vorbereiten.</p>
        <div class="row" style="margin-bottom:8px"><input id="fname" placeholder="Vereinsname, z. B. FC Blue Angels" maxlength="40" style="flex:1">
        <select id="fkreis"><option value="RH">Region Hannover</option><option value="HM">Hameln-Pyrmont</option></select></div>
        ${btn("Verein gründen", "found", {}, "btn pri")}</div>`;
    } else if (mode === "investor") {
      html += `<div class="card"><h3>Wer bist du?</h3><p class="muted small">Das Startkapital ist dein Privatvermögen. Damit kaufst du einen Klub und kannst später Geld ins Vereinskonto einlegen.</p>
        <div class="scroll"><table><thead><tr><th>Investor</th><th class="r">Startkapital</th><th></th></tr></thead><tbody>
        ${E.INVESTORS.map((x) => `<tr><td style="white-space:normal"><b>${esc(x.title)}</b><div class="small muted">${esc(x.desc)}</div></td><td class="r">${eur(x.capital)}</td><td>${btn("Wählen", "investor", { id: x.id }, "btn sm pri")}</td></tr>`).join("")}
        </tbody></table></div></div>
        <div class="card" style="margin-top:14px"><h3>Investor selbst erstellen</h3>
        <div class="grid" style="gap:8px"><input id="itit" maxlength="40" placeholder="Bezeichnung, z. B. Gebrauchtwagenhändler aus Hameln">
        <input id="idesc" maxlength="120" placeholder="Kurzbeschreibung (optional)">
        <div class="row"><label class="muted">Startkapital</label><input id="icap" type="number" min="${E.CUSTOM_CAPITAL.min}" max="${E.CUSTOM_CAPITAL.max}" step="1000" value="500000" style="width:170px"><span class="small muted">${eur(E.CUSTOM_CAPITAL.min)} bis ${eur(E.CUSTOM_CAPITAL.max)}</span></div>
        <div>${btn("Als eigener Investor starten", "investorCustom", {}, "btn pri")}</div></div></div>`;
    }
  } else if (u.role === "Investor") {
    const lvl = Number(app.sel.buyLevel || 6);
    const list = [...S().clubs.values()].filter((c) => !c.owner && E.firstTeam(S(), c).status === "active" && E.firstTeam(S(), c).level === lvl)
      .map((c) => ({ c, t: E.firstTeam(S(), c), price: E.clubPrice(S(), c) })).filter((x) => x.price != null)
      .sort((a, b) => (a.t.league < b.t.league ? -1 : a.t.league > b.t.league ? 1 : (posOf(a.t) || 99) - (posOf(b.t) || 99)));
    html += `<div class="card"><div class="row" style="justify-content:space-between"><h3>Klub kaufen</h3>
      <select data-sel="buyLevel">${[5, 6, 7, 8, 9, 10, 11].map((l) => `<option value="${l}" ${l === lvl ? "selected" : ""}>Liga ${l}: ${LVLNAME(l)}</option>`).join("")}</select></div>
      <p class="muted small">${u.investor ? `Du bist <b>${esc(u.investor.title)}</b>. ` : ""}Privatvermögen: <b>${eur(u.wallet)}</b>. Liga 6 gibt es nur in Niedersachsen, darunter nur Region Hannover und Hameln-Pyrmont.</p>
      <div class="scroll"><table><thead><tr><th>Liga</th><th>Pl.</th><th>Verein</th><th class="r">Stärke</th><th class="r">Preis</th><th></th></tr></thead><tbody>
      ${list.map(({ c, t, price }) => `<tr><td class="small">${esc(lgOf(t).name)}</td><td>${posOf(t) ?? ""}</td><td>${esc(c.name)}${t.fict ? ' <span class="pill warn">fiktiv</span>' : ""}</td><td class="r">${st(t.str)}</td><td class="r">${eur(price)}</td>
        <td>${btn("Kaufen", "buy", { clubId: c.id }, "btn sm pri", price > u.wallet ? "disabled" : "")}</td></tr>`).join("")}
      </tbody></table></div></div>`;
  }
  return html + newsCard();
}

// ------------------------------------------------------------ Übersicht
function vHome() {
  const c = myClub(), t = E.firstTeam(S(), c), nd = nextDay();
  const parts = [];
  if (t.status !== "active") {
    parts.push(`<div class="card"><h3>Saisonstart abwarten</h3><p>${esc(c.name)} steigt zum nächsten Saisonumbruch in den Spielbetrieb ein. Bis dahin kannst du Kader, Trainer und Anlagen vorbereiten.</p></div>`);
  } else {
    const m = nd.day <= 34 ? fixtureFor(t, nd.day) : null;
    const cm = nd.day <= 34 ? cupMatchFor(t, nd.day) : null;
    const lastDay = S().day;
    const last = lastDay && lastDay <= 34 ? fixtureFor(t, lastDay) : null;
    const lastCup = lastDay && lastDay <= 34 ? cupMatchFor(t, lastDay) : null;
    const mbox = (title, mm, extra = "") => mm ? `<div class="card"><div class="lvl">${title}</div>
      <div class="match" style="margin-top:8px"><div class="t">${esc(team(mm.h).name)}</div><div class="score">${mm.gh == null ? "–:–" : `${mm.gh}:${mm.ga}`}</div><div class="t">${esc(team(mm.a).name)}</div></div>
      ${extra}</div>` : "";
    parts.push(`<div class="grid g2">
      ${m ? mbox(`Nächstes Spiel · Spieltag ${nd.day} · heute 18:00`, m, `<p class="small muted" style="text-align:center;margin:8px 0 0">Stärke ${st(E.teamStrength(S(), team(m.h)))} gegen ${st(E.teamStrength(S(), team(m.a)))} · Taktik: ${esc(c.h.formation)}, ${esc(c.h.tactic)}</p>`) : `<div class="card"><div class="lvl">Nächster Spieltag</div><p>${nd.day === 35 ? "Heute ist Saisonumbruch: Auf- und Abstieg, Jahresabschluss, Jugend." : "Spielfrei."}</p></div>`}
      ${cm ? mbox(`${cm.cup.name} · zusätzlich heute`, cm.m) : ""}
      ${last ? mbox(`Letztes Ligaspiel · Spieltag ${lastDay}`, last, c.h.lastAtt ? `<p class="small muted" style="text-align:center;margin:8px 0 0">Zuschauer zuletzt daheim: ${c.h.lastAtt.toLocaleString("de-DE")}</p>` : "") : ""}
      ${lastCup ? mbox(`${lastCup.cup.name} · Ergebnis`, lastCup.m, lastCup.m.pen ? `<p class="small muted" style="text-align:center">nach Elfmeterschießen</p>` : lastCup.m.et ? `<p class="small muted" style="text-align:center">nach Verlängerung</p>` : "") : ""}
    </div>`);
    const lg = lgOf(t); const tab = E.sortedTable(lg); const i = tab.findIndex((r) => r.id === t.id);
    const from = Math.max(0, Math.min(i - 3, tab.length - 7));
    parts.push(`<div class="card" style="margin-top:14px"><div class="row" style="justify-content:space-between"><h3>${esc(lg.name)}</h3><button class="btn sm" data-sel="league" data-v="${lg.id}">Ganze Tabelle</button></div>${tableHtml(lg, tab.slice(from, from + 7), from)}</div>`);
  }
  const todo = [];
  if (!c.h.sponsor) todo.push("Sponsorvertrag für diese Saison unterschreiben (Verein).");
  if (!c.h.trainer) todo.push("Einen Trainer einstellen (Transfers) – ohne Trainer entwickeln sich Spieler kaum.");
  if (c.h.cash < 0) todo.push("Das Vereinskonto ist im Minus. Spieler verkaufen oder Kosten senken.");
  if (todo.length) parts.push(`<div class="card" style="margin-top:14px"><h3>To-do</h3>${todo.map((x) => `<div>• ${esc(x)}</div>`).join("")}</div>`);
  parts.push(newsCard());
  setTimeout(() => document.querySelectorAll('[data-sel="league"]').forEach((b) => b.addEventListener("click", () => { app.tab = "ligen"; render(); })), 0);
  return parts.join("");
}
function newsCard() {
  const u = meUser();
  const items = [...(u.news || []).map((n) => ({ ...n, me: true })), ...S().news.slice(-25)].sort((a, b) => b.g - a.g).slice(0, 30);
  return `<div class="card" style="margin-top:14px"><h3>Neuigkeiten</h3><div class="news">${items.map((n) => `<div><span class="muted small">${n.g ? `S${E.dayInfo(n.g).season} T${E.dayInfo(n.g).day}` : "Start"}</span> ${n.me ? "<b>" : ""}${esc(n.text)}${n.me ? "</b>" : ""}</div>`).join("") || '<div class="muted">Noch nichts passiert.</div>'}</div></div>`;
}

// ------------------------------------------------------------ Kader
function vKader() {
  const c = myClub(), h = c.h;
  const xi = E.humanXI(S(), c); const xiIds = new Set(xi.xi.filter((x) => x.p).map((x) => x.p.id));
  const order = { TW: 0, AB: 1, MF: 2, ST: 3 };
  const ps = h.players.slice().sort((a, b) => order[a.pos] - order[b.pos] || b.str - a.str);
  const wages = h.players.reduce((s, p) => s + p.wage, 0);
  return `<h2>Kader</h2><p class="sub">${h.players.length} Spieler · Gehälter ${eur(wages)} pro Saison · Startelf-Stärke <b>${st(xi.str)}</b>${xi.missing ? ` · <span class="warn">${xi.missing} Positionen nicht passend besetzt</span>` : ""}</p>
  <div class="card" style="margin-bottom:14px"><div class="row">
    <label class="muted">Formation</label><select data-act="tactic" data-key="formation">${Object.keys(E.FORMATIONS).map((f) => `<option ${f === h.formation ? "selected" : ""}>${f}</option>`).join("")}</select>
    <label class="muted">Spielweise</label><select data-act="tactic" data-key="tactic">${Object.keys(E.TACTICS).map((f) => `<option ${f === h.tactic ? "selected" : ""}>${f}</option>`).join("")}</select>
    <span class="small muted">Die stärksten Spieler je Position spielen automatisch (blau markiert).</span></div></div>
  <div class="card scroll"><table><thead><tr><th>Pos</th><th>Name</th><th class="r">Alter</th><th class="r">Stärke</th><th class="r">Potenzial</th><th class="r">Gehalt/Saison</th><th class="r">Marktwert</th><th></th></tr></thead><tbody>
  ${ps.map((p) => `<tr class="${xiIds.has(p.id) ? "xi" : ""}"><td>${p.pos}</td><td>${esc(p.name)}</td><td class="r">${p.age}</td><td class="r"><b>${st(p.str)}</b></td><td class="r muted">${p.pot > p.str + 0.5 && p.age < 30 ? "↑ " + st(p.pot) : "–"}</td>
    <td class="r">${eur(p.wage)}</td><td class="r">${eur(E.valueOf(p))}</td>
    <td>${btn("Verkaufen", "sellPlayer", { id: p.id }, "btn sm", `data-confirm="${esc(p.name)} für ${eur(E.valueOf(p) * 0.8)} verkaufen?"`)} ${btn("Entlassen", "releasePlayer", { id: p.id }, "btn sm danger", `data-confirm="${esc(p.name)} entlassen? Abfindung ${eur(p.wage * 0.5)}."`)}</td></tr>`).join("")}
  </tbody></table></div>`;
}

// ------------------------------------------------------------ Transfers & Trainer
function vTransfer() {
  const c = myClub(), h = c.h;
  const market = E.marketFor(S(), c, S().lastSeed);
  const tr = h.trainer;
  return `<h2>Transfers & Trainer</h2><p class="sub">Der Markt wechselt täglich nach dem Spieltag. Käufe gelten ab dem nächsten Spieltag.</p>
  <div class="grid g2">
  <div class="card"><h3>Trainer</h3>${tr ? `<div class="kv"><label>Aktuell</label><b>${esc(tr.name)}</b><label>Qualität</label><span>${st(tr.q)}</span><label>Gehalt</label><span>${eur(tr.wage)} / Saison</span></div>
    <div style="margin-top:8px">${btn("Trainer entlassen", "fireTrainer", {}, "btn sm danger", `data-confirm="Trainer entlassen? Abfindung ${eur(tr.wage * 0.3)}."`)}</div>` : '<p class="warn">Kein Trainer angestellt.</p>'}
    <div class="scroll" style="margin-top:10px"><table><thead><tr><th>Kandidat</th><th class="r">Alter</th><th class="r">Qualität</th><th class="r">Gehalt</th><th></th></tr></thead><tbody>
    ${h.trainers.map((x) => `<tr><td>${esc(x.name)}</td><td class="r">${x.age}</td><td class="r">${st(x.q)}</td><td class="r">${eur(x.wage)}</td><td>${btn("Einstellen", "hireTrainer", { id: x.id })}</td></tr>`).join("")}
    </tbody></table></div><p class="small muted">Ein Trainer über dem Niveau deiner Liga beschleunigt das Training und bringt bis zu 4 % Spielstärke.</p></div>
  <div class="card"><h3>Transfermarkt</h3><div class="scroll"><table><thead><tr><th>Pos</th><th>Name</th><th class="r">Alter</th><th class="r">Stärke</th><th>Verein</th><th class="r">Ablöse</th><th></th></tr></thead><tbody>
  ${market.map((p) => `<tr><td>${p.pos}</td><td>${esc(p.name)}</td><td class="r">${p.age}</td><td class="r"><b>${st(p.str)}</b></td><td class="small">${p.from ? esc(team(p.from).name) : "vereinslos"}</td><td class="r">${eur(p.price)}</td>
    <td>${btn("Kaufen", "buyPlayer", { id: p.id }, "btn sm pri", p.price > h.cash ? "disabled" : "")}</td></tr>`).join("")}
  </tbody></table></div><p class="small muted">Gehalt nach Wechsel: abhängig von der Stärke. Kader max. 30 Spieler.</p></div></div>`;
}

// ------------------------------------------------------------ Verein
function vVerein() {
  const c = myClub(), h = c.h, u = meUser(), t = E.firstTeam(S(), c);
  const fac = [["jugend", "Jugendakademie", "Mehr und bessere Talente zum Saisonumbruch, stärkere Zweitmannschaft."], ["training", "Trainingsplätze", "Schnellere Entwicklung aller Spieler."], ["umfeld", "Umfeld & Stadion", "Mehr Zuschauer, höhere Kapazität, mehr Catering und Sponsoring."]];
  const L = Math.min(t.level, 11);
  const reserves = [2, 3].map((rk) => {
    const r = h.reserves[rk]; const rt = r?.team ? team(r.team) : null;
    const status = r?.active ? (rt ? `${esc(rt.name)} · ${esc(lgOf(rt)?.name || "Unterbau")}${rt.str ? " · Stärke " + st(rt.str) : ""}` : "gemeldet – startet zur nächsten Saison") : r && !r.active ? "abgemeldet zum Saisonende" : "nicht gemeldet";
    const on = r?.active;
    return `<tr><td>${rk}. Mannschaft</td><td class="small">${status}</td><td class="r">${on ? eur(E.reserveCost(S(), c, rk)) : "–"}</td>
      <td>${on ? btn("Abmelden", "reserve", { rank: rk, on: false }, "btn sm danger", `data-confirm="${rk}. Mannschaft zum Saisonende abmelden?"`) : btn("Anmelden", "reserve", { rank: rk, on: true })}</td></tr>`;
  }).join("");
  const ticketF = h.ticket || 1;
  return `<h2>Verein</h2><p class="sub">Investitionen werden sofort bezahlt. Laufende Kosten werden täglich abgebucht.</p>
  <div class="grid g2">
  <div class="card"><h3>Anlagen</h3>${fac.map(([k, n, d]) => { const cost = E.facilityCost(S(), c, k); return `<div style="margin-bottom:12px"><div class="row" style="justify-content:space-between"><b>${n}</b><span class="muted">Stufe ${h.fac[k]}/10</span></div>
    <div class="bar" style="margin:5px 0"><i style="width:${h.fac[k] * 10}%"></i></div><div class="small muted">${d}</div>
    <div style="margin-top:5px">${cost == null ? '<span class="pill ok">Maximal</span>' : btn(`Ausbauen für ${eur(cost)}`, "facility", { kind: k }, "btn sm", cost > h.cash ? "disabled" : "")}</div></div>`; }).join("")}
    <p class="small muted">Unterhalt pro Saison: ${eur((h.facInvest || 0) * 0.08)} · Jugendabteilung: ${eur(E.youthCost(S(), c))} pro Saison</p></div>
  <div class="card"><h3>Sponsoring & Werbung</h3>${h.sponsor ? `<div class="kv"><label>Hauptsponsor</label><b>${esc(h.sponsor.name)}</b><label>Grundbetrag</label><span>${eur(h.sponsor.base)} / Saison</span><label>Siegprämie</label><span>${eur(h.sponsor.win)} je Ligasieg</span></div>`
    : `<p class="muted small">Noch kein Vertrag – bis dahin zahlen nur Kleinsponsoren (35 % des Ligaüblichen).</p>
    <div class="scroll"><table><thead><tr><th>Angebot</th><th>Typ</th><th class="r">Grundbetrag</th><th class="r">Siegprämie</th><th></th></tr></thead><tbody>
    ${h.offers.map((o) => `<tr><td>${esc(o.name)}</td><td>${o.typ}</td><td class="r">${eur(o.base)}</td><td class="r">${eur(o.win)}</td><td>${btn("Unterschreiben", "sponsor", { id: o.id }, "btn sm pri")}</td></tr>`).join("")}</tbody></table></div>`}
    <h3 style="margin-top:16px">Eintrittspreise</h3><div class="row"><select data-act="ticket" data-key="factor">${[0.6, 0.8, 1, 1.2, 1.4, 1.7, 2].map((f) => `<option value="${f}" ${Math.abs(f - ticketF) < 0.01 ? "selected" : ""}>${Math.round(f * 100)} % – ${(E.LV[L].price * f).toFixed(2)} €</option>`).join("")}</select>
    <span class="small muted">Höhere Preise bringen mehr pro Fan, aber weniger Zuschauer.</span></div></div>
  <div class="card"><h3>Weitere Mannschaften</h3><p class="small muted">Zweit- und Drittmannschaften werden nicht verwaltet, nur ihre Kosten fließen in den Jahresabschluss. Neue Mannschaften starten zur nächsten Saison${t.kreis ? " in der untersten Spielklasse" : " außerhalb der simulierten Ligen"}.</p>
    <div class="scroll"><table><thead><tr><th>Team</th><th>Status</th><th class="r">Kosten/Saison</th><th></th></tr></thead><tbody>${reserves}
    <tr><td>Jugendteams</td><td class="small">abhängig von der Jugendakademie</td><td class="r">${eur(E.youthCost(S(), c))}</td><td></td></tr></tbody></table></div></div>
  <div class="card"><h3>Eigentum</h3>${u.role === "Investor" ? `<p>${u.investor ? esc(u.investor.title) + " · " : ""}Privatvermögen: <b>${eur(u.wallet)}</b></p><div class="row"><input id="dep" type="number" min="1000" step="1000" placeholder="Betrag in €" style="width:160px">${btn("Ins Vereinskonto einlegen", "deposit", {}, "btn")}</div>` : `<p class="muted">Gründer – Vereinskonto ist dein Budget.</p>`}
    <div style="margin-top:14px">${btn("Verein abgeben", "leave", {}, "btn danger", `data-confirm="${esc(c.name)} wirklich abgeben? Der Verein wird wieder vom Computer geführt."`)}</div></div>
  </div>`;
}

// ------------------------------------------------------------ Finanzen
function vFinanzen() {
  const c = myClub(), h = c.h;
  const sum = (o) => Object.values(o).reduce((a, b) => a + b, 0);
  const list = (o) => Object.entries(o).sort((a, b) => b[1] - a[1]).map(([k, v]) => `<tr><td>${esc(k)}</td><td class="r">${eur(v)}</td></tr>`).join("") || '<tr><td class="muted">–</td><td></td></tr>';
  const tin = sum(h.ledger.in), tout = sum(h.ledger.out);
  return `<h2>Finanzen</h2><p class="sub">Laufende Saison bis heute · Kontostand <b>${eur(h.cash)}</b></p>
  <div class="grid g2"><div class="card"><h3>Einnahmen</h3><table><tbody>${list(h.ledger.in)}<tr><td><b>Summe</b></td><td class="r"><b>${eur(tin)}</b></td></tr></tbody></table></div>
  <div class="card"><h3>Ausgaben</h3><table><tbody>${list(h.ledger.out)}<tr><td><b>Summe</b></td><td class="r"><b>${eur(tout)}</b></td></tr></tbody></table></div></div>
  <div class="card" style="margin-top:14px"><h3>Ergebnis laufende Saison: <span class="${tin - tout >= 0 ? "ok" : "crit"}">${eur(tin - tout)}</span></h3></div>
  <div class="card" style="margin-top:14px"><h3>Jahresabschlüsse</h3>${h.annual.length ? `<div class="scroll"><table><thead><tr><th>Saison</th><th>Liga</th><th class="r">Platz</th><th class="r">Einnahmen</th><th class="r">Ausgaben</th><th class="r">Ergebnis</th><th class="r">Kontostand</th></tr></thead><tbody>
    ${h.annual.slice().reverse().map((a) => `<tr><td>${a.season}</td><td class="small">${esc(a.league)}</td><td class="r">${a.pos != null ? a.pos + 1 : "–"}</td><td class="r">${eur(sum(a.in))}</td><td class="r">${eur(sum(a.out))}</td><td class="r ${a.result >= 0 ? "ok" : "crit"}">${eur(a.result)}</td><td class="r">${eur(a.cash)}</td></tr>`).join("")}</tbody></table></div>
    <details style="margin-top:8px"><summary class="muted small">Details letzter Abschluss</summary>${(() => { const a = h.annual.at(-1); return `<div class="grid g2" style="margin-top:8px"><table><tbody>${list(a.in)}</tbody></table><table><tbody>${list(a.out)}</tbody></table></div>`; })()}</details>`
    : '<p class="muted">Der erste Jahresabschluss entsteht am Saisonumbruch (Tag 35).</p>'}</div>`;
}

// ------------------------------------------------------------ Ligen
function tableHtml(lg, rows, offset = 0) {
  const c = myClub(); const myT = c ? c.teams : [];
  const n = lg.teams.length;
  return `<div class="scroll"><table><thead><tr><th>Pl.</th><th>Verein</th><th class="r">Sp</th><th class="r">S</th><th class="r">U</th><th class="r">N</th><th class="r">Tore</th><th class="r">Diff</th><th class="r">Pkt</th><th class="r">Stärke</th></tr></thead><tbody>
  ${rows.map((r, i) => { const t = team(r.id); const pos = offset + i + 1; const cl = S().clubs.get(t.clubId);
    const cls = [myT.includes(r.id) ? "me" : cl?.owner ? "hum" : "", pos <= 2 && lg.level > 1 ? "up" : "", pos > n - 2 ? "down" : ""].join(" ");
    return `<tr class="${cls}"><td>${pos}</td><td>${esc(t.name)}${t.fict ? ' <span class="pill warn">fiktiv</span>' : ""}${cl?.owner && !myT.includes(r.id) ? ` <span class="pill">${esc(ownerName(cl))}</span>` : ""}</td><td class="r">${r.p}</td><td class="r">${r.w}</td><td class="r">${r.d}</td><td class="r">${r.l}</td><td class="r">${r.gf}:${r.ga}</td><td class="r">${r.gf - r.ga}</td><td class="r"><b>${r.pts}</b></td><td class="r muted">${st(E.teamStrength(S(), t))}</td></tr>`; }).join("")}
  </tbody></table></div>`;
}
function vLigen() {
  const c = myClub();
  const myLg = c ? E.firstTeam(S(), c).league : null;
  const sel = app.sel.league && S().leagues.get(app.sel.league)?.teams.length ? app.sel.league : myLg || "bl";
  const lg = S().leagues.get(sel);
  const levels = [...new Set([...S().leagues.values()].map((l) => l.level))].sort((a, b) => a - b);
  const opts = levels.map((L) => `<optgroup label="Liga ${L} – ${LVLNAME(L)}">${[...S().leagues.values()].filter((l) => l.level === L && l.teams.length).map((l) => `<option value="${l.id}" ${l.id === sel ? "selected" : ""}>${esc(l.name)}</option>`).join("")}</optgroup>`).join("");
  const nd = nextDay();
  const days = Object.keys(lg.fixtures).map(Number).sort((a, b) => a - b);
  const prev = days.filter((d) => d < nd.day).pop();
  const day = Number(app.sel["day_" + sel] || prev || days[0]);
  const idx = days.indexOf(day);
  const fx = lg.fixtures[day] || [];
  return `<div class="row" style="justify-content:space-between;margin-bottom:10px"><h2>${esc(lg.name)}</h2><select data-sel="league">${opts}</select></div>
  <div class="card">${tableHtml(lg, E.sortedTable(lg))}<p class="small muted">Grün: Aufstiegsränge, rot: Abstiegsränge (Richtwert – die genaue Zahl ergibt sich am Saisonumbruch, weil alle Ligen auf 18 Teams aufgefüllt werden).</p></div>
  <div class="card" style="margin-top:14px"><div class="row" style="justify-content:space-between"><h3>Spieltag ${day}</h3><div class="row">
    <button class="btn sm" data-sel="day_${sel}" data-v="${days[Math.max(0, idx - 1)]}">‹</button><button class="btn sm" data-sel="day_${sel}" data-v="${days[Math.min(days.length - 1, idx + 1)]}">›</button></div></div>
    <table><tbody>${fx.map((m) => `<tr><td style="text-align:right;width:45%">${esc(team(m.h).name)}</td><td style="text-align:center"><b>${m.gh == null ? "–:–" : m.gh + ":" + m.ga}</b></td><td style="width:45%">${esc(team(m.a).name)}</td></tr>`).join("")}</tbody></table></div>`;
}

// ------------------------------------------------------------ Pokale
function vPokale() {
  const c = myClub(); const mine = new Set(c ? c.teams : []);
  const cups = S().cups.filter((x) => x.entrants.length >= 2);
  const myCups = cups.filter((x) => x.entrants.some((id) => mine.has(id)));
  const sel = app.sel.cup && cups.find((x) => x.id === app.sel.cup) ? app.sel.cup : (myCups[0]?.id || "dfb");
  const cup = cups.find((x) => x.id === sel);
  const nm = (id) => { const t = team(id); return t ? esc(t.name) + (t.level <= 11 ? ` <span class="muted small">(${t.level})</span>` : "") : "?"; };
  const rounds = cup.rounds.map((rd, i) => rd ? `<div class="card" style="margin-top:12px"><h3>${roundName(cup, i)} · Spieltag ${rd.day}</h3>
    ${rd.byes.length ? `<p class="small muted">${rd.byes.length} Freilose: ${rd.byes.slice(0, 12).map((id) => esc(team(id).name)).join(", ")}${rd.byes.length > 12 ? " …" : ""}</p>` : ""}
    <div class="scroll"><table><tbody>${rd.matches.map((m) => `<tr class="${mine.has(m.h) || mine.has(m.a) ? "me" : ""}"><td style="text-align:right;width:44%;white-space:normal">${nm(m.h)}</td><td style="text-align:center;white-space:nowrap"><b>${m.gh == null ? "–:–" : m.gh + ":" + m.ga}</b>${m.pen ? " i.E." : m.et ? " n.V." : ""}</td><td style="width:44%;white-space:normal">${nm(m.a)}</td></tr>`).join("")}</tbody></table></div></div>` : "").join("");
  return `<div class="row" style="justify-content:space-between"><h2>${esc(cup.name)}</h2><select data-sel="cup">${cups.map((x) => `<option value="${x.id}" ${x.id === sel ? "selected" : ""}>${esc(x.name)}${myCups.includes(x) ? " ★" : ""}</option>`).join("")}</select></div>
  <p class="sub">${cup.entrants.length} Teilnehmer${cup.winner ? ` · Sieger: <b>${esc(team(cup.winner).name)}</b>` : ""}. Der Sieger startet nächste Saison zusätzlich im nächsthöheren Pokal (Kreis → Bezirk → Land → DFB).</p>${rounds}`;
}
function roundName(cup, i) {
  const left = cup.days.length - i;
  return left === 1 ? "Finale" : left === 2 ? "Halbfinale" : left === 3 ? "Viertelfinale" : left === 4 ? "Achtelfinale" : `${i + 1}. Runde`;
}

// ------------------------------------------------------------ Mitspieler
function vSpieler() {
  const users = [...S().users.values()];
  const last = S().history.at(-1);
  const rows = users.map((u) => { const c = u.clubId ? S().clubs.get(u.clubId) : null; const t = c ? E.firstTeam(S(), c) : null;
    return `<tr class="${u.id === app.me ? "me" : ""}"><td>${esc(u.name)}</td><td class="small">${esc(u.investor ? u.investor.title : u.role || "–")}</td><td>${c ? esc(c.name) : "–"}</td><td class="small">${t ? esc(lgOf(t)?.name || "Saisonstart") : ""}</td><td class="r">${t ? posOf(t) ?? "" : ""}</td><td class="r">${c ? st(E.humanXI(S(), c).str) : ""}</td><td class="r">${c ? eur(c.h.cash) : ""}</td></tr>`; }).join("");
  return `<h2>Mitspieler</h2><div class="card scroll"><table><thead><tr><th>Name</th><th>Rolle</th><th>Verein</th><th>Liga</th><th class="r">Pl.</th><th class="r">Stärke</th><th class="r">Konto</th></tr></thead><tbody>${rows || '<tr><td class="muted">Noch niemand aktiv.</td></tr>'}</tbody></table></div>
  ${last ? `<div class="card" style="margin-top:14px"><h3>Saison ${last.season}: Meister & Pokalsieger</h3><div class="grid g2"><div>${last.champions.filter((x) => x.level <= 6 || /Hannover|Hameln/.test(x.league)).slice(0, 40).map((x) => `<div class="small"><span class="muted">${esc(x.league)}:</span> ${esc(x.team)}</div>`).join("")}</div>
    <div>${last.cups.map((x) => `<div class="small"><span class="muted">${esc(x.name)}:</span> ${esc(x.winner || "–")}</div>`).join("")}</div></div></div>` : ""}
  ${newsCard()}
  <p class="small muted" style="margin-top:14px">Berechnet in ${app.simMs} ms · ${app.actions.length} Aktionen · ${app.seeds.length - 1} gespielte Tage · Daten: ${esc(app.world.source)}${MODE === "solo" ? ' · <a href="#" id="reset">Solo-Spiel zurücksetzen</a>' : ' · <a href="#" id="logout">Abmelden</a>'}</p>`;
}

document.addEventListener("click", async (e) => {
  if (e.target.id === "reset") { e.preventDefault(); if (confirm("Solo-Spiel komplett zurücksetzen?")) { backend.reset(); location.reload(); } }
  if (e.target.id === "logout") { e.preventDefault(); await backend.signOut(); location.reload(); }
});
window.__fm = { app, backend, E };
boot();
