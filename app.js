import * as E from "./engine.js";
import { backend, MODE, kickoff } from "./backend.js";
import { ROLES, ROLE_ORDER, SPORT_ROLES, STAFF_LEVELS, GF_TASKS, staffSalary } from "./staff.js";

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
    setInterval(pollChat, 15000);
    setInterval(tick, 1000);
  } catch (e) { console.error(e); $app.innerHTML = `<div class="center"><div class="card auth"><h3>Fehler beim Laden</h3><p class="muted">${esc(e.message || e)}</p></div></div>`; }
}

async function load() {
  const [info, seeds, actions, members] = await Promise.all([backend.info(), backend.seeds(), backend.actions(), backend.members()]);
  app.info = info; app.seeds = seeds; app.actions = actions; app.members = members;
  await loadMsgs();
  app.sig = seeds.length + ":" + actions.length;
  if (!seeds.length) return renderWaiting();
  const t0 = performance.now();
  app.S = E.simulate(app.world, seeds, actions, members, { startDate: info.start_date });
  app.simMs = Math.round(performance.now() - t0);
  render();
}
async function loadMsgs() {
  try { app.msgs = await backend.messages(); app.chatError = null; } catch (e) { app.msgs = app.msgs || []; app.chatError = e.message || String(e); }
}
async function pollChat() {
  const sig = () => (app.msgs || []).map((m) => m.id + ":" + (m.edited_at || "")).join(",");
  const before = sig();
  await loadMsgs();
  if (sig() !== before && app.S && !(app.tab === "chat" && app.sel.chatEdit)) {
    const draft = document.getElementById("chatmsg")?.value, hadFocus = document.activeElement?.id === "chatmsg";
    const y = window.scrollY; render(); window.scrollTo(0, y);
    const inp = document.getElementById("chatmsg"); if (inp && draft) inp.value = draft; if (inp && hadFocus) inp.focus();
  }
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
  try { await backend.submit(type, payload); await load(); toast(type === "rename" ? "Name geändert." : "Gespeichert – gilt ab dem nächsten Spieltag."); }
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
    <h2>Anstoß</h2><p class="sub"><b>Schritt 1 von 2:</b> Konto anlegen bzw. anmelden. Das Passwort denkst du dir selbst aus (mind. 6 Zeichen). Den Einladungscode gibst du im nächsten Schritt ein.</p>
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
    <h2>Dem Spiel beitreten</h2><p class="sub"><b>Schritt 2 von 2.</b> Den Einladungscode bekommst du von der Person, die das Spiel eingerichtet hat.</p>
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
  const tabs = c ? [["home", "Übersicht"], ["kader", "Kader"], ["transfer", "Transfers"], ["personal", "Personal"], ["verein", "Verein"], ["finanzen", "Finanzen"], ["statistik", "Statistik"], ["ligen", "Ligen"], ["pokale", "Pokale"], ["erfolge", "Erfolge"], ["chat", "Chat" + unreadBadge()], ["spieler", "Mitspieler"]]
    : [["start", "Start"], ["ligen", "Ligen"], ["pokale", "Pokale"], ["erfolge", "Erfolge"], ["chat", "Chat" + unreadBadge()], ["spieler", "Mitspieler"]];
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
  const view = { home: vHome, kader: vKader, transfer: vTransfer, verein: vVerein, personal: vPersonal, finanzen: vFinanzen, ligen: vLigen, pokale: vPokale, spieler: vSpieler, start: vStart, erfolge: vErfolge, chat: vChat, statistik: vStatistik }[app.tab];
  main.innerHTML = view();
  bindActions(main);
  if (app.tab === "chat") bindChat(main);
  tick();
}
function bindActions(root) {
  root.querySelectorAll("[data-act]").forEach((el) => {
    el.addEventListener(el.tagName === "SELECT" || el.type === "checkbox" ? "change" : "click", () => {
      const type = el.dataset.act;
      let payload = el.dataset.p ? JSON.parse(el.dataset.p) : {};
      if (el.dataset.confirm && !confirm(el.dataset.confirm)) return;
      if (el.tagName === "SELECT") payload = { ...payload, [el.dataset.key]: el.value };
      if (type === "found") payload = { name: document.getElementById("fname").value, kreis: document.getElementById("fkreis").value };
      if (type === "investorCustom") { act("investor", { custom: true, title: document.getElementById("itit").value, desc: document.getElementById("idesc").value, capital: Number(document.getElementById("icap").value) }); return; }
      if (type === "deposit") payload = { amount: Number(document.getElementById("dep").value) };
      if (type === "gfSettings" && el.dataset.key === "budget") payload = { budget: Number(document.getElementById("gfbudget").value) };
      if (type === "gfSettings" && el.dataset.task) payload = { tasks: { [el.dataset.task]: el.checked } };
      if (type === "doctor") payload = { follow: el.checked };
      if (type === "rename") { const inp = document.getElementById(payload.what === "staff" ? "rn-staff-" + payload.role : "rn-" + payload.id); payload = { ...payload, name: inp?.value || "" }; if (payload.what === "staff") app.sel.staffRn = ""; }
      if (type === "staff") payload = { role: el.dataset.role, lvl: Number(el.value) };
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
      html += `<div class="card"><h3>Neuen Verein gründen</h3><p class="muted">Der Einstieg in den Spielbetrieb erfolgt zur nächsten Saison. Bis dahin kannst du Kader, Personal und Anlagen vorbereiten.</p>
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
    parts.push(`<div class="card"><h3>Saisonstart abwarten</h3><p>${esc(c.name)} steigt zum nächsten Saisonumbruch in den Spielbetrieb ein. Bis dahin kannst du Kader, Personal und Anlagen vorbereiten.</p></div>`);
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
      ${m ? mbox(`Nächstes Spiel · Spieltag ${nd.day} · heute 18:00`, m, `<p class="small muted" style="text-align:center;margin:8px 0 0">Stärke ${st(E.teamStrength(S(), team(m.h)))} gegen ${st(E.teamStrength(S(), team(m.a)))} · ${esc(c.h.formation)}, ${esc(c.h.tactic)}, Intensität ${c.h.intensity || 3}, Aggressivität ${c.h.aggression || 3}</p>`) : `<div class="card"><div class="lvl">Nächster Spieltag</div><p>${nd.day === 35 ? "Heute ist Saisonumbruch: Auf- und Abstieg, Jahresabschluss, Jugend." : "Spielfrei."}</p></div>`}
      ${cm ? mbox(`${cm.cup.name} · zusätzlich heute`, cm.m) : ""}
      ${m || cm ? oppCard(c, t, m || cm.m) : ""}
      ${last ? mbox(`Letztes Ligaspiel · Spieltag ${lastDay}`, last, c.h.lastAtt ? `<p class="small muted" style="text-align:center;margin:8px 0 0">Zuschauer zuletzt daheim: ${c.h.lastAtt.toLocaleString("de-DE")}</p>` : "") : ""}
      ${lastCup ? mbox(`${lastCup.cup.name} · Ergebnis`, lastCup.m, lastCup.m.pen ? `<p class="small muted" style="text-align:center">nach Elfmeterschießen</p>` : lastCup.m.et ? `<p class="small muted" style="text-align:center">nach Verlängerung</p>` : "") : ""}
    </div>`);
    const lg = lgOf(t); const tab = E.sortedTable(lg); const i = tab.findIndex((r) => r.id === t.id);
    const from = Math.max(0, Math.min(i - 3, tab.length - 7));
    parts.push(`<div class="card" style="margin-top:14px"><div class="row" style="justify-content:space-between"><h3>${esc(lg.name)}</h3><button class="btn sm" data-sel="league" data-v="${lg.id}">Ganze Tabelle</button></div>${tableHtml(lg, tab.slice(from, from + 7), from)}</div>`);
  }
  const todo = [];
  if (!c.h.sponsor) todo.push("Sponsorvertrag für diese Saison unterschreiben (Verein).");
  if (!E.sl(c.h, "headcoach")) todo.push("Einen Headcoach einstellen (Personal) – ohne Headcoach leidet die Leistung.");
  if (c.h.cash < 0) todo.push("Das Vereinskonto ist im Minus. Spieler verkaufen oder Kosten senken.");
  const injN = c.h.players.filter((p) => p.inj).length; const tired = c.h.players.filter((p) => !p.inj && p.fit < 50).length;
  if (injN) todo.push(`${injN} Spieler verletzt oder krank – siehe Kader.`);
  if (tired > 6) todo.push(`${tired} Spieler sind müde (Fitness unter 50). Intensität senken oder rotieren.`);
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
const POS_ORDER = Object.fromEntries(E.POSITIONS.map((p, i) => [p, i]));
function fitBar(f) { const col = f >= 75 ? "var(--ok)" : f >= 50 ? "var(--warn)" : "var(--crit)"; return `<span class="bar" style="display:inline-block;width:46px;vertical-align:middle"><i style="width:${f}%;background:${col}"></i></span> <span class="small">${Math.round(f)}</span>`; }
function statusOf(p) {
  if (p.inj) return `<span class="pill crit">${esc(p.inj.n)} · ${p.inj.days} T</span>`;
  if (p.ban > 0) return `<span class="pill warn">gesperrt · ${p.ban}</span>`;
  if (p.fit <= 0) return `<span class="pill crit">nicht spielfit</span>`;
  return "";
}
function vKader() {
  const c = myClub(), h = c.h;
  const doc = (p) => { const a = E.doctorAdvice(h, p); return a ? ` <span class="pill warn" title="Mannschaftsarzt">🩺 ${esc(a)}</span>` : ""; };
  const xi = E.humanXI(S(), c); const slotOf = new Map(xi.xi.filter((x) => x.p).map((x) => [x.p.id, x.slot]));
  const sortBy = app.sel.kaderSort || "pos";
  const sorters = { pos: (a, b) => POS_ORDER[a.pos] - POS_ORDER[b.pos] || b.max - a.max, max: (a, b) => b.max - a.max, fit: (a, b) => b.fit - a.fit, g: (a, b) => b.s.g - a.s.g || b.s.apps - a.s.apps };
  const ps = h.players.slice().sort(sorters[sortBy] || sorters.pos);
  const wages = h.players.reduce((s2, p) => s2 + p.wage, 0);
  const inj = h.players.filter((p) => p.inj).length, ban = h.players.filter((p) => p.ban > 0).length;
  const avgFit = h.players.reduce((s2, p) => s2 + p.fit, 0) / Math.max(1, h.players.length);
  const sel = (key, opts, cur) => `<select data-act="tactic" data-key="${key}">${opts.map(([v, n]) => `<option value="${v}" ${String(v) === String(cur) ? "selected" : ""}>${n}</option>`).join("")}</select>`;
  const open = app.sel.player;
  const detail = (p) => `<tr><td colspan="11" style="white-space:normal;background:var(--surface2);padding:0"><div style="position:sticky;left:0;width:min(calc(100vw - 64px),1040px);padding:10px">
    <div class="row" style="justify-content:space-between"><b>${esc(p.name)} · ${E.POS_NAMES[p.pos]}</b><span class="small muted">Potenzial ${p.age < 30 ? potTxt(h, p) : "–"} · Marktwert ${eur(E.valueOf(p))} · Gehalt ${eur(p.wage)}/Saison</span></div>
    <div class="grid g3" style="gap:4px 16px;margin:8px 0">${E.ATTRS.map((k) => `<div class="row" style="gap:6px"><span class="small" style="width:108px">${E.ATTR_NAMES[k]}</span><span class="bar" style="flex:1"><i style="width:${p.a[k]}%"></i></span><b class="small" style="width:40px;text-align:right">${st(p.a[k])}</b></div>`).join("")}</div>
    <div class="small muted">Stärke auf anderen Positionen: ${E.POSITIONS.filter((x) => x !== p.pos).map((x) => ({ x, v: E.posStrength(p, x) })).sort((a, b) => b.v - a.v).slice(0, 4).map((o) => `${o.x} ${st(o.v)}`).join(" · ")}</div>
    <div class="small muted">Karriere: ${p.c.apps} Spiele, ${p.c.g} Tore, ${p.c.y} Gelb, ${p.c.r} Rot</div>
    <div class="row" style="margin-top:8px;gap:6px"><input id="rn-${esc(p.id)}" maxlength="40" value="${esc(p.name)}" style="width:200px">${btn("Umbenennen", "rename", { what: "player", id: p.id })}</div>
    <div style="margin-top:6px">${btn("Verkaufen", "sellPlayer", { id: p.id }, "btn sm", `data-confirm="${esc(p.name)} für ${eur(E.valueOf(p) * 0.8)} verkaufen?"`)} ${btn("Entlassen", "releasePlayer", { id: p.id }, "btn sm danger", `data-confirm="${esc(p.name)} entlassen? Abfindung ${eur(p.wage * 0.5)}."`)}</div></div></td></tr>`;
  return `<h2>Kader</h2><p class="sub">${h.players.length} Spieler · Gehälter ${eur(wages)}/Saison · Startelf <b>${st(xi.str)}</b> aktuell / ${st(xi.max)} max · Ø Fitness ${Math.round(avgFit)}${inj ? ` · <span class="crit">${inj} verletzt/krank</span>` : ""}${ban ? ` · <span class="warn">${ban} gesperrt</span>` : ""}</p>
  <div class="card" style="margin-bottom:14px"><div class="grid g2" style="gap:10px">
    <div class="row"><label class="muted" style="width:110px">Formation</label>${sel("formation", Object.keys(E.FORMATIONS).map((f) => [f, f]), h.formation)}</div>
    <div class="row"><label class="muted" style="width:110px">Spielweise</label>${sel("tactic", Object.keys(E.TACTICS).map((f) => [f, f]), h.tactic)}</div>
    <div class="row"><label class="muted" style="width:110px">Intensität</label>${sel("intensity", E.INTENSITY.map((n, i) => [i + 1, `${i + 1} – ${n}`]), h.intensity || 3)}</div>
    <div class="row"><label class="muted" style="width:110px">Aggressivität</label>${sel("aggression", E.AGGRESSION.map((n, i) => [i + 1, `${i + 1} – ${n}`]), h.aggression || 3)}</div>
    <div class="row"><label class="muted" style="width:110px">Rotation ab</label>${sel("minFit", [[0, "keine Schonung"], [40, "Fitness unter 40"], [50, "Fitness unter 50"], [60, "Fitness unter 60"], [70, "Fitness unter 70"], [80, "Fitness unter 80"]], h.minFit ?? 60)}</div>
  </div>
  <p class="small muted" style="margin:10px 0 0">Hohe Intensität bringt etwas mehr Leistung und schnellere Entwicklung, kostet aber mehr Fitness und erhöht das Verletzungsrisiko. Pausen bauen Fitness wieder auf. Hohe Aggressivität gewinnt mehr Zweikämpfe (je nach Zweikampfstärke), bringt aber Karten und Sperren. Die Startelf stellt sich automatisch aus den fittesten und stärksten Spielern zusammen.</p></div>
  <div class="row" style="margin-bottom:8px"><span class="muted small">Sortieren:</span><div class="seg">${[["pos", "Position"], ["max", "Stärke"], ["fit", "Fitness"], ["g", "Tore"]].map(([k, n]) => `<button data-sel="kaderSort" data-v="${k}" aria-pressed="${sortBy === k}">${n}</button>`).join("")}</div><span class="small muted">Tippe auf einen Spieler für Details.</span></div>
  <div class="card scroll"><table><thead><tr><th>Pos</th><th>Name</th><th class="r">Alter</th><th>Fitness</th><th class="r">Aktuell</th><th class="r">Max</th><th>Status</th><th class="r">Sp</th><th class="r">Tore</th><th class="r">Gelb</th><th class="r">Rot</th></tr></thead><tbody>
  ${ps.map((p) => `<tr class="${slotOf.has(p.id) ? "xi" : ""}" data-sel="player" data-v="${open === p.id ? "" : esc(p.id)}" style="cursor:pointer"><td>${p.pos}${slotOf.has(p.id) && slotOf.get(p.id) !== p.pos ? `<span class="small muted">→${slotOf.get(p.id)}</span>` : ""}</td><td>${esc(p.name)}</td><td class="r">${p.age}</td><td>${fitBar(p.fit)}</td>
    <td class="r"><b>${st(p.inj ? 0 : E.curStrength(p))}</b></td><td class="r muted">${st(p.max)}</td><td>${statusOf(p)}${doc(p)}</td><td class="r">${p.s.apps}</td><td class="r">${p.s.g}</td><td class="r">${p.s.y}</td><td class="r">${p.s.r}</td></tr>${open === p.id ? detail(p) : ""}`).join("")}
  </tbody></table></div><p class="small muted">Blau markiert: aktuelle Startelf (→ andere Position). Statistik der laufenden Saison inklusive Pokalspielen.</p>`;
}

// ------------------------------------------------------------ Transfers & Trainer
function vTransfer() {
  const c = myClub(), h = c.h;
  const market = E.marketFor(S(), c, S().lastSeed);
  return `<h2>Transfers</h2><p class="sub">Der Markt wechselt täglich nach dem Spieltag. Käufe gelten ab dem nächsten Spieltag.</p>
  <div class="grid g2">
  <div class="card"><h3>Scouting-Bericht</h3>${scoutCard(h, market)}</div>
  <div class="card"><h3>Transfermarkt</h3><div class="scroll"><table><thead><tr><th>Pos</th><th>Name</th><th class="r">Alter</th><th class="r">Stärke</th><th>Verein</th><th class="r">Ablöse</th><th></th></tr></thead><tbody>
  ${market.map((p) => `<tr><td>${p.pos}</td><td>${esc(p.name)}</td><td class="r">${p.age}</td><td class="r"><b>${st(p.max)}</b><div class="small muted">Pot. ${potTxt(h, p)}</div><div class="small muted">${["spd", "tec", "zwk", "abs"].map((k) => E.ATTR_NAMES[k].slice(0, 3) + " " + Math.round(p.a[k])).join(" · ")}</div></td><td class="small">${p.from ? esc(team(p.from).name) : "vereinslos"}</td><td class="r">${eur(p.price)}</td>
    <td>${btn("Kaufen", "buyPlayer", { id: p.id }, "btn sm pri", p.price > h.cash ? "disabled" : "")}</td></tr>`).join("")}
  </tbody></table></div><p class="small muted">Gehalt nach Wechsel: abhängig von der Stärke. Kader max. 30 Spieler. Mehr Scouts = mehr Angebote und genauere Potenzialschätzung.</p></div></div>`;
}


// ------------------------------------------------------------ Personal
function potTxt(h, p) {
  const e = E.potEstimate(h, p);
  if (!e) return "?";
  return e.exact ? st(p.pot) : `${Math.round(e.lo)}–${Math.round(e.hi)}`;
}
function scoutCard(h, market) {
  const lvl = E.sl(h, "scout");
  if (!lvl) return '<p class="muted">Keine Scouts angestellt – das Potenzial der Spieler bleibt ein Rätsel und der Markt ist klein. (Personal → Scouts)</p>';
  const pos = h.players.filter((p) => !p.inj); const cnt = {}; for (const p of pos) cnt[p.pos] = (cnt[p.pos] || 0) + 1;
  const weakest = E.POSITIONS.map((x) => ({ x, n: cnt[x] || 0, best: Math.max(0, ...h.players.filter((p) => p.pos === x).map((p) => p.max)) })).sort((a, b) => a.n - b.n || a.best - b.best)[0];
  const recs = market.filter((p) => p.price <= h.cash * 0.6).map((p) => { const e = E.potEstimate(h, p); return { p, score: p.max + ((e.lo + e.hi) / 2 - p.max) * 0.25 * (p.age < 25 ? 1 : 0.3) + (p.pos === weakest.x ? 3 : 0) }; }).sort((a, b) => b.score - a.score).slice(0, lvl >= 3 ? 3 : 1);
  return `<p class="small muted" style="margin-top:0">${esc(h.staff.scout.name)} (${ROLES.scout.lv[lvl - 1][0]}) meint: ${lvl >= 2 ? `Dünnste Stelle im Kader ist <b>${E.POS_NAMES[weakest.x]}</b>.` : "„Ich hab da einen gesehen, der lief echt schnell.“"}</p>
    ${recs.length ? recs.map(({ p }) => `<div class="row" style="justify-content:space-between;border-top:1px solid var(--line);padding:6px 0"><span><b>${esc(p.name)}</b> <span class="small muted">${p.pos}, ${p.age} J., Stärke ${st(p.max)}, Potenzial ${potTxt(h, p)}</span></span><span>${eur(p.price)} ${btn("Kaufen", "buyPlayer", { id: p.id }, "btn sm pri", p.price > h.cash ? "disabled" : "")}</span></div>`).join("") : '<p class="muted">Heute keine bezahlbare Empfehlung.</p>'}`;
}
function oppCard(c, t, m) {
  const oppId = m.h === t.id ? m.a : m.h;
  const r = E.opponentReport(S(), c, oppId);
  let body;
  if (!r.lvl || r.lvl === 1) body = `<p class="small">${esc(r.text)}</p>`;
  else body = `<div class="kv"><label>Stärke Gegner</label><b>${r.spread ? "ca. " : ""}${st(r.est)}${r.spread ? ` <span class="small muted">±${Math.round(r.spread * 100)} %</span>` : ""}</b><label>Eigene Startelf</label><span>${st(r.mine)}</span>
    ${r.form ? `<label>Form (zuletzt)</label><span>${r.form.join(" ") || "–"}</span>` : ""}${r.key ? `<label>Schlüsselspieler</label><span class="small">${r.key.map(esc).join("<br>")}</span><label>Profil</label><span class="small">${esc(r.trait)}</span>` : ""}${r.tip ? `<label>Tipp</label><b class="small">${esc(r.tip)}</b>` : ""}</div>`;
  return `<div class="card"><div class="lvl">Videoanalyse · ${esc(team(oppId).name)}</div>${r.lvl ? `<p class="small muted" style="margin:4px 0">${esc(c.h.staff.taktik.name)}, ${esc(ROLES.taktik.lv[r.lvl - 1][0])}</p>` : ""}${body}</div>`;
}
function vPersonal() {
  const c = myClub(), h = c.h, t = E.firstTeam(S(), c), L = Math.min(t.level || 11, 11);
  const gfl = E.sl(h, "gf"), gfStaff = gfl > 0 && h.gf.tasks.staff;
  const total = E.staffCost(h, L);
  const sportCost = SPORT_ROLES.reduce((a, r) => a + staffSalary(r, E.sl(h, r), L), 0);
  const card = (role) => {
    const R = ROLES[role], lvl = E.sl(h, role), st0 = h.staff[role];
    const locked = gfStaff && SPORT_ROLES.includes(role);
    const opts = STAFF_LEVELS.map((n, i) => `<option value="${i}" ${i === lvl ? "selected" : ""}>${i ? `Stufe ${i} · ${R.lv[i - 1][0]} – ${i === 1 ? "Ehrenamt" : eur(staffSalary(role, i, L)) + "/Saison"}` : "unbesetzt"}</option>`).join("");
    return `<div class="card"><div class="row" style="justify-content:space-between;align-items:flex-start"><div><div class="lvl">${esc(R.area)}</div><h3 style="margin:2px 0">${esc(R.name)}</h3></div><span class="pill">${lvl ? `Stufe ${lvl} · ${STAFF_LEVELS[lvl]}` : "unbesetzt"}</span></div>
      ${lvl && app.sel.staffRn === role ? `<div class="row" style="gap:6px;margin:6px 0"><input id="rn-staff-${role}" maxlength="40" value="${esc(st0.name)}" style="width:190px">${btn("Speichern", "rename", { what: "staff", role })}<button class="btn sm" data-sel="staffRn" data-v="">Abbrechen</button></div>` : ""}
      ${lvl ? `<p style="margin:6px 0 2px"><b>${esc(st0.name)}</b> <button class="btn sm" style="padding:0 6px" data-sel="staffRn" data-v="${role}" title="Namen ändern">✎</button> – „${esc(R.lv[lvl - 1][0])}“</p><p class="small" style="margin:0 0 6px">${esc(R.lv[lvl - 1][1])}</p>` : `<p class="small muted">Die Stelle ist frei.</p>`}
      <p class="small muted" style="margin:0 0 8px">${esc(R.effect)}</p>
      <select data-act="staff" data-role="${role}" ${locked ? "disabled" : ""} data-confirm="Stufe ändern? Bei Abstufung oder Entlassung ab Stufe 2 fallen 30 % Abfindung an.">${opts}</select>${locked ? '<div class="small muted" style="margin-top:4px">Wird vom GF Sport verwaltet.</div>' : ""}
      ${role === "arzt" && lvl ? `<label class="small" style="display:flex;margin-top:8px;gap:8px;align-items:center"><input style="flex:none" type="checkbox" data-act="doctor" ${h.followDoc ? "checked" : ""}> Empfehlungen bei der Aufstellung befolgen</label>` : ""}
      ${role === "gf" && lvl ? `<div style="margin-top:10px;border-top:1px solid var(--line);padding-top:8px"><div class="row"><label class="muted small" style="width:120px">Budget / Saison</label><input id="gfbudget" type="number" min="0" step="1000" value="${h.gf.budget}" style="width:130px"> ${btn("Speichern", "gfSettings", {}, "btn sm", 'data-key="budget"')}</div>
        <p class="small muted" style="margin:6px 0">Personal Sport aktuell: ${eur(sportCost)}/Saison${h.gf.tasks.squad ? ` · Transfers diese Saison: ${eur(h.gf.spent || 0)} von ${eur(h.gf.budget * 0.3)}` : ""}</p>
        ${Object.entries(GF_TASKS).map(([k, [ti, de]]) => `<label class="small" style="display:flex;gap:8px;align-items:flex-start;margin:6px 0"><input style="flex:none;margin-top:3px" type="checkbox" data-act="gfSettings" data-task="${k}" ${h.gf.tasks[k] ? "checked" : ""}><span><b>${esc(ti)}</b> – ${esc(de)}</span></label>`).join("")}</div>` : ""}
    </div>`;
  };
  return `<h2>Personal & Ämter</h2><p class="sub">Personalkosten gesamt: <b>${eur(total)}</b> pro Saison (taggenau abgerechnet). Stufe 1 ist Ehrenamt ohne Gehalt, Stufe 5 der Vollprofi. Ein Stufenwechsel bedeutet eine neue Person; Abstufung oder Entlassung ab Stufe 2 kostet 30 % eines Jahresgehalts Abfindung.</p>
  <div class="grid g2">${ROLE_ORDER.map(card).join("")}</div>`;
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
  const season = Number(app.sel.ligSeason || 0); // 0 = laufende Saison
  const arch = season ? S().archive.find((x) => x.season === season) : null;
  const leagueSrc = arch ? Object.entries(arch.leagues).map(([id, l]) => ({ id, name: l.name, level: l.level })) : [...S().leagues.values()].filter((l) => l.teams.length);
  const sel = app.sel.league && leagueSrc.find((l) => l.id === app.sel.league) ? app.sel.league : (leagueSrc.find((l) => l.id === myLg)?.id || "bl");
  const levels = [...new Set(leagueSrc.map((l) => l.level))].sort((a, b) => a - b);
  const opts = levels.map((L) => `<optgroup label="Liga ${L} – ${LVLNAME(L)}">${leagueSrc.filter((l) => l.level === L).map((l) => `<option value="${l.id}" ${l.id === sel ? "selected" : ""}>${esc(l.name)}</option>`).join("")}</optgroup>`).join("");
  const seasonOpts = `<option value="0">Saison ${S().season} (laufend)</option>` + S().archive.slice().reverse().map((x) => `<option value="${x.season}" ${x.season === season ? "selected" : ""}>Saison ${x.season} (Abschluss)</option>`).join("");
  const head = `<div class="row" style="justify-content:space-between;margin-bottom:10px"><h2>${esc(leagueSrc.find((l) => l.id === sel)?.name || "")}</h2><div class="row"><select data-sel="ligSeason">${seasonOpts}</select><select data-sel="league">${opts}</select></div></div>`;
  const scorerTable = (list) => `<div class="scroll"><table><thead><tr><th>#</th><th>Spieler</th><th>Verein</th><th class="r">Tore</th></tr></thead><tbody>${list.map((x, i) => `<tr class="${c && c.teams.includes(x.teamId) ? "me" : ""}"><td>${i + 1}</td><td>${esc(x.name)}</td><td class="small" style="white-space:normal">${esc(x.team)}</td><td class="r"><b>${x.goals}</b></td></tr>`).join("") || '<tr><td colspan="4" class="muted">Noch keine Tore.</td></tr>'}</tbody></table></div>`;
  if (arch) {
    const L = arch.leagues[sel];
    const mine = new Set(c ? c.teams : []);
    return head + `<div class="card"><div class="scroll"><table><thead><tr><th>Pl.</th><th>Verein</th><th class="r">Sp</th><th class="r">S</th><th class="r">U</th><th class="r">N</th><th class="r">Tore</th><th class="r">Diff</th><th class="r">Pkt</th></tr></thead><tbody>
      ${L.rows.map((r, i) => `<tr class="${mine.has(r.id) ? "me" : ""}"><td>${i + 1}</td><td>${esc(r.name)}</td><td class="r">${r.p}</td><td class="r">${r.w}</td><td class="r">${r.d}</td><td class="r">${r.l}</td><td class="r">${r.gf}:${r.ga}</td><td class="r">${r.gf - r.ga}</td><td class="r"><b>${r.pts}</b></td></tr>`).join("")}</tbody></table></div></div>
      <div class="card" style="margin-top:14px"><h3>Torschützen Saison ${season}</h3>${scorerTable(L.scorers.map((x) => ({ ...x, teamId: null })))}</div>`;
  }
  const lg = S().leagues.get(sel);
  const nd = nextDay();
  const days = Object.keys(lg.fixtures).map(Number).sort((a, b) => a - b);
  const prev = days.filter((d) => d < nd.day).pop();
  const day = Number(app.sel["day_" + sel] || prev || days[0]);
  const idx = days.indexOf(day);
  const fx = lg.fixtures[day] || [];
  const goalsLine = (m, k) => (m.st?.g || []).filter((g) => g[1] === k).map((g) => `${esc(g[2])} ${g[0]}'`).join(", ");
  return head + `<div class="card">${tableHtml(lg, E.sortedTable(lg))}<p class="small muted">Grün: Aufstiegsränge, rot: Abstiegsränge (Richtwert – die genaue Zahl ergibt sich am Saisonumbruch, weil alle Ligen auf 18 Teams aufgefüllt werden).</p></div>
  <div class="grid g2" style="margin-top:14px">
  <div class="card"><div class="row" style="justify-content:space-between"><h3>Spieltag ${day}</h3><div class="row">
    <button class="btn sm" data-sel="day_${sel}" data-v="${days[Math.max(0, idx - 1)]}">‹</button><button class="btn sm" data-sel="day_${sel}" data-v="${days[Math.min(days.length - 1, idx + 1)]}">›</button></div></div>
    <table><tbody>${fx.map((m) => `<tr><td style="text-align:right;width:44%;white-space:normal">${esc(team(m.h).name)}${m.st ? `<div class="small muted">${goalsLine(m, 0)}</div>` : ""}</td><td style="text-align:center"><b>${m.gh == null ? "–:–" : m.gh + ":" + m.ga}</b>${m.st && (m.st.r[0] || m.st.r[1]) ? `<div class="small">${"🟥".repeat(m.st.r[0])}<span class="muted">·</span>${"🟥".repeat(m.st.r[1])}</div>` : ""}</td><td style="width:44%;white-space:normal">${esc(team(m.a).name)}${m.st ? `<div class="small muted">${goalsLine(m, 1)}</div>` : ""}</td></tr>`).join("")}</tbody></table></div>
  <div class="card"><h3>Torschützenliste</h3>${scorerTable(E.topScorers(S(), 20, lg.id).map((x) => ({ name: x.name, team: team(x.team)?.name, teamId: x.team, goals: x.goals })))}</div></div>`;
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


// ------------------------------------------------------------ Statistik
function matchReport(r) {
  const st = r.st, me = r.k;
  const row = (lbl, a, b, fmt = (x) => x) => `<tr><td class="r" style="width:30%">${fmt(a)}</td><td style="text-align:center" class="muted small">${lbl}</td><td style="width:30%">${fmt(b)}</td></tr>`;
  const ev = [...st.g.map((g) => ({ m: g[0], k: g[1], t: "⚽ " + esc(g[2]) })), ...st.c.map((c2) => ({ m: c2[0], k: c2[1], t: (c2[3] === "Y" ? "🟨 " : c2[3] === "GR" ? "🟨🟥 " : "🟥 ") + esc(c2[2] || (c2[3] === "Y" ? "Gelbe Karte" : "Platzverweis")) }))].sort((a, b) => a.m - b.m);
  const won = (me ? r.ga > r.gh : r.gh > r.ga), lost = (me ? r.ga < r.gh : r.gh < r.ga);
  return `<div class="card" style="margin-bottom:10px"><div class="row" style="justify-content:space-between"><span class="lvl">${esc(r.comp)} · Saison ${r.season}, Tag ${r.day}</span><span class="pill ${won ? "ok" : lost ? "crit" : ""}">${won ? "Sieg" : lost ? "Niederlage" : "Remis"}</span></div>
    <div class="match" style="margin:6px 0"><div class="t">${esc(r.h)}</div><div class="score">${r.gh}:${r.ga}</div><div class="t">${esc(r.a)}</div></div>
    <table><tbody>${row("Ballbesitz", st.p[0], st.p[1], (x) => x + " %")}${row("Torschüsse", st.s[0], st.s[1])}${row("aufs Tor", st.o[0], st.o[1])}${row("Fouls", st.f[0], st.f[1])}${row("Gelbe Karten", st.y[0], st.y[1])}${row("Rote Karten", st.r[0], st.r[1])}</tbody></table>
    ${ev.length ? `<div class="small" style="margin-top:6px">${ev.map((e) => `<div style="text-align:${e.k ? "right" : "left"}"><span class="muted">${e.m}'</span> ${e.t}</div>`).join("")}</div>` : ""}</div>`;
}
function vStatistik() {
  const c = myClub(), h = c.h, ts = h.tstats || {};
  const sub = app.sel.statSub || "spiele";
  const seg = `<div class="seg" style="margin-bottom:12px">${[["spiele", "Spiele"], ["saison", "Saison"], ["historie", "Historie"], ["torjaeger", "Torjäger (ewig)"]].map(([k, n]) => `<button data-sel="statSub" data-v="${k}" aria-pressed="${sub === k}">${n}</button>`).join("")}</div>`;
  const g = ts.games || 0, avg = (x) => (g ? (x / g).toFixed(1) : "–");
  if (sub === "spiele") return `<h2>Statistik</h2>${seg}${(h.reports || []).slice().reverse().slice(0, 15).map(matchReport).join("") || '<p class="muted">Noch keine Spiele.</p>'}`;
  if (sub === "saison") return `<h2>Statistik</h2>${seg}<div class="card"><h3>Saison ${S().season} (Liga und Pokal)</h3><div class="kv">
    <label>Spiele</label><b>${g} (${ts.w || 0} S · ${ts.d || 0} U · ${ts.l || 0} N)</b>
    <label>Tore</label><span>${ts.gf || 0}:${ts.ga || 0} (Ø ${avg(ts.gf || 0)} : ${avg(ts.ga || 0)})</span>
    <label>Ø Ballbesitz</label><span>${g ? Math.round(ts.poss / g) + " %" : "–"}</span>
    <label>Ø Torschüsse</label><span>${avg(ts.shots || 0)} (aufs Tor ${avg(ts.on || 0)}) · gegen ${avg(ts.shotsAg || 0)}</span>
    <label>Chancenverwertung</label><span>${ts.shots ? Math.round(((ts.gf || 0) / ts.shots) * 100) + " %" : "–"}</span>
    <label>Ø Fouls</label><span>${avg(ts.fouls || 0)}</span>
    <label>Karten</label><span>${ts.y || 0} Gelb · ${ts.r || 0} Rot</span></div></div>
    <div class="card" style="margin-top:12px"><h3>Spieler der Saison</h3><div class="scroll"><table><thead><tr><th>Spieler</th><th>Pos</th><th class="r">Sp</th><th class="r">Tore</th><th class="r">Gelb</th><th class="r">Rot</th></tr></thead><tbody>
    ${h.players.slice().sort((a, b) => b.s.g - a.s.g || b.s.apps - a.s.apps).map((p) => `<tr><td>${esc(p.name)}</td><td>${p.pos}</td><td class="r">${p.s.apps}</td><td class="r"><b>${p.s.g}</b></td><td class="r">${p.s.y}</td><td class="r">${p.s.r}</td></tr>`).join("")}</tbody></table></div></div>`;
  if (sub === "historie") {
    const rows = [];
    for (const ar of S().archive) for (const [lid, L] of Object.entries(ar.leagues)) L.rows.forEach((r, i) => { if (c.teams.includes(r.id) || r.name === c.name) rows.push({ season: ar.season, league: L.name, level: L.level, pos: i + 1, n: L.rows.length, r, lid }); });
    const t = E.firstTeam(S(), c);
    const cur = t.league ? (() => { const lg = S().leagues.get(t.league); const tab = E.sortedTable(lg); const i = tab.findIndex((x) => x.id === t.id); return { season: S().season, league: lg.name, level: lg.level, pos: i + 1, n: tab.length, r: tab[i], live: true }; })() : null;
    const all = [...(cur ? [cur] : []), ...rows.sort((a, b) => b.season - a.season)];
    const tr = S().trophies.get(c.id) || [];
    return `<h2>Statistik</h2>${seg}<div class="card scroll"><table><thead><tr><th>Saison</th><th>Liga</th><th class="r">Pl.</th><th class="r">Sp</th><th class="r">S-U-N</th><th class="r">Tore</th><th class="r">Pkt</th><th></th></tr></thead><tbody>
      ${all.map((x) => `<tr class="${x.live ? "me" : ""}"><td>${x.season}${x.live ? " (lfd.)" : ""}</td><td class="small">${esc(x.league)}</td><td class="r">${x.pos}/${x.n}</td><td class="r">${x.r.p}</td><td class="r">${x.r.w}-${x.r.d}-${x.r.l}</td><td class="r">${x.r.gf}:${x.r.ga}</td><td class="r"><b>${x.r.pts}</b></td><td>${tr.filter((y) => y.season === x.season).map(() => "🏆").join("")}</td></tr>`).join("") || '<tr><td class="muted" colspan="8">Noch keine Saison abgeschlossen.</td></tr>'}</tbody></table></div>
      <p class="small muted">Platzierungen aller Mannschaften vergangener Saisons findest du unter „Ligen“ über die Saisonauswahl.</p>`;
  }
  const comps = Object.keys(h.allTime || {});
  const comp = comps.includes(app.sel.atComp) ? app.sel.atComp : comps[0];
  const list = comp ? Object.values(h.allTime[comp]).sort((a, b) => b.g - a.g || b.apps - a.apps) : [];
  return `<h2>Statistik</h2>${seg}<div class="card"><div class="row" style="justify-content:space-between"><h3>Ewige Torschützen</h3>${comps.length ? `<select data-sel="atComp">${comps.map((x) => `<option ${x === comp ? "selected" : ""}>${esc(x)}</option>`).join("")}</select>` : ""}</div>
    <p class="small muted">Alle Spieler deines Vereins in diesem Wettbewerb seit du den Verein führst – auch ehemalige.</p>
    <div class="scroll"><table><thead><tr><th>#</th><th>Spieler</th><th class="r">Sp</th><th class="r">Tore</th><th class="r">Gelb</th><th class="r">Rot</th></tr></thead><tbody>
    ${list.slice(0, 50).map((x, i) => `<tr><td>${i + 1}</td><td>${esc(x.name)}</td><td class="r">${x.apps}</td><td class="r"><b>${x.g}</b></td><td class="r">${x.y}</td><td class="r">${x.r}</td></tr>`).join("") || '<tr><td class="muted" colspan="6">Noch keine Spiele.</td></tr>'}</tbody></table></div></div>`;
}

// ------------------------------------------------------------ Chat
const LS_SEEN = "fm_chat_seen";
function lastSeen() { try { return Number(localStorage.getItem(LS_SEEN) || 0); } catch { return 0; } }
function unreadBadge() {
  if (app.tab === "chat" || !app.msgs?.length) return "";
  const n = app.msgs.filter((m) => m.id > lastSeen() && m.user_id !== app.me).length;
  return n ? ` <span class="pill crit">${n}</span>` : "";
}
const userName = (id) => S()?.users.get(id)?.name || app.members[id] || "Unbekannt";
function vChat() {
  if (app.msgs?.length) try { localStorage.setItem(LS_SEEN, String(app.msgs[app.msgs.length - 1].id)); } catch {}
  if (app.chatError) return `<h2>Chat</h2><div class="card"><p class="crit">Der Chat ist noch nicht eingerichtet.</p><p class="small muted">${esc(app.chatError)}</p></div>`;
  const to = app.sel.chatTo || "";
  const others = Object.entries(app.members).filter(([id]) => id !== app.me);
  const filter = app.sel.chatFilter || "alle";
  const list = (app.msgs || []).filter((m) => filter === "alle" ? true : filter === "privat" ? !!m.to_user : !m.to_user);
  const fmtT = (iso) => new Date(iso).toLocaleString("de-DE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin" });
  return `<div class="row" style="justify-content:space-between"><h2>Chat</h2>
    <div class="seg">${[["alle", "Alle"], ["oeffentlich", "Öffentlich"], ["privat", "Privat"]].map(([k, n]) => `<button data-sel="chatFilter" data-v="${k}" aria-pressed="${filter === k}">${n}</button>`).join("")}</div></div>
  <div class="card" id="chatbox" style="max-height:55vh;overflow:auto;display:flex;flex-direction:column;gap:8px">
    ${list.map((m) => { const mine = m.user_id === app.me; const priv = !!m.to_user;
      return `<div style="align-self:${mine ? "flex-end" : "flex-start"};max-width:85%;background:${mine ? "var(--accent-soft)" : "var(--surface2)"};border:1px solid ${priv ? "var(--warn)" : "var(--line)"};border-radius:10px;padding:7px 10px">
        <div class="small muted">${esc(userName(m.user_id))}${priv ? ` → ${esc(m.to_user === app.me ? "dich" : userName(m.to_user))} <span class="pill warn">privat</span>` : ""} · ${fmtT(m.created_at)}</div>
        ${app.sel.chatEdit === String(m.id) ? `<textarea id="chatedit" maxlength="1000" rows="3" style="width:100%;min-width:220px">${esc(m.body)}</textarea>
          <div class="row" style="gap:6px;margin-top:4px"><button class="btn sm pri" data-chat="save" data-id="${m.id}">Speichern</button><button class="btn sm" data-chat="cancel">Abbrechen</button></div>`
        : `<div style="white-space:pre-wrap;word-break:break-word">${esc(m.body)}</div>`}
        ${m.edited_at ? '<div class="small muted" style="font-style:italic">bearbeitet</div>' : ""}
        ${mine && app.sel.chatEdit !== String(m.id) ? `<div class="small" style="text-align:right;margin-top:2px"><a href="#" data-chat="edit" data-id="${m.id}">Bearbeiten</a> · <a href="#" data-chat="del" data-id="${m.id}" style="color:var(--crit)">Löschen</a></div>` : ""}</div>`; }).join("") || '<div class="muted">Noch keine Nachrichten.</div>'}
  </div>
  <div class="card" style="margin-top:10px"><div class="row">
    <select id="chatto"><option value="">An: alle</option>${others.map(([id, n]) => `<option value="${esc(id)}" ${to === id ? "selected" : ""}>An: ${esc(n)} (privat)</option>`).join("")}</select>
    <input id="chatmsg" maxlength="1000" placeholder="Nachricht …" style="flex:1;min-width:180px">
    <button class="btn pri" id="chatsend">Senden</button></div>
    <p class="small muted" style="margin:6px 0 0">Private Nachrichten sehen nur Absender und Empfänger. Neue Nachrichten erscheinen automatisch.</p></div>`;
}
function bindChat(root) {
  const box = root.querySelector("#chatbox"); if (box) box.scrollTop = box.scrollHeight;
  const send = async () => {
    const inp = root.querySelector("#chatmsg"); const body = inp.value.trim(); if (!body) return;
    const to = root.querySelector("#chatto").value; app.sel.chatTo = to;
    try { await backend.sendMessage(to, body); inp.value = ""; await loadMsgs(); render(); setTimeout(() => document.getElementById("chatmsg")?.focus(), 0); }
    catch (e) { toast("Fehler: " + (e.message || e)); }
  };
  root.querySelector("#chatsend")?.addEventListener("click", send);
  root.querySelectorAll("[data-chat]").forEach((el) => el.addEventListener("click", async (e) => {
    e.preventDefault();
    const what = el.dataset.chat, id = Number(el.dataset.id);
    try {
      if (what === "edit") { app.sel.chatEdit = el.dataset.id; render(); setTimeout(() => { const t = document.getElementById("chatedit"); if (t) { t.focus(); t.setSelectionRange(t.value.length, t.value.length); } }, 0); return; }
      if (what === "cancel") { app.sel.chatEdit = null; render(); return; }
      if (what === "save") {
        const body = document.getElementById("chatedit").value.trim(); if (!body) { toast("Leere Nachricht – zum Entfernen bitte „Löschen“ nutzen."); return; }
        await backend.editMessage(id, body); app.sel.chatEdit = null;
      }
      if (what === "del") { if (!confirm("Nachricht endgültig löschen?")) return; await backend.deleteMessage(id); }
      await loadMsgs(); const y = window.scrollY; render(); window.scrollTo(0, y);
    } catch (err) { toast("Fehler: " + (err.message || err)); }
  }));
  root.querySelector("#chatmsg")?.addEventListener("keydown", (e) => { if (e.key === "Enter") send(); });
  root.querySelector("#chatto")?.addEventListener("change", (e) => { app.sel.chatTo = e.target.value; });
}

// ------------------------------------------------------------ Erfolge: Trophäenschrank & Bestenliste
const CUP_ICON = (t) => (t.kind === "liga" ? "🏆" : "🥇");
function trophyCase(club) {
  const list = (S().trophies.get(club.id) || []).slice().sort((a, b) => a.level - b.level || b.season - a.season);
  if (!list.length) return '<p class="muted small">Noch keine Titel – der Schrank wartet.</p>';
  const groups = {};
  for (const t of list) { const k = t.title + (t.team !== club.name ? ` (${t.team})` : ""); (groups[k] = groups[k] || { t, seasons: [] }).seasons.push(t.season); }
  return `<div class="grid g3" style="gap:8px">${Object.entries(groups).map(([k, g]) => `<div style="border:1px solid var(--line);border-radius:8px;padding:8px 10px;background:var(--surface2)">
    <div style="font-size:22px">${CUP_ICON(g.t).repeat(Math.min(g.seasons.length, 5))}${g.seasons.length > 5 ? ` <b>×${g.seasons.length}</b>` : ""}</div>
    <b>${esc(k)}</b><div class="small muted">Saison ${g.seasons.sort((a, b) => a - b).join(", ")}</div></div>`).join("")}</div>`;
}
function vErfolge() {
  const c = myClub();
  const humanClubs = [...S().clubs.values()].filter((x) => x.owner && x.id !== c?.id);
  const sub = app.sel.erfolgeSub || "schrank";
  const seg = `<div class="seg" style="margin-bottom:12px">${[["schrank", "Trophäenschrank"], ["bl", "Bestenliste Bundesliga"]].map(([k, n]) => `<button data-sel="erfolgeSub" data-v="${k}" aria-pressed="${sub === k}">${n}</button>`).join("")}</div>`;
  if (sub === "schrank") {
    return `<h2>Erfolge</h2>${seg}
    ${c ? `<div class="card"><h3>${esc(c.name)}</h3>${trophyCase(c)}</div>` : ""}
    ${humanClubs.map((x) => `<div class="card" style="margin-top:12px"><h3>${esc(x.name)} <span class="pill">${esc(ownerName(x))}</span></h3>${trophyCase(x)}</div>`).join("")}
    <p class="small muted" style="margin-top:12px">Titel werden am Saisonumbruch (Tag 35) vergeben: Meisterschaften aller Ligen sowie Kreis-, Bezirks-, Landes- und DFB-Pokal. Titel von 2./3. Mannschaften zählen für den Verein.</p>`;
  }
  const bl = S().leagues.get("bl");
  const live = new Map([...S().eternal.values()].map((e) => [e.id, { ...e }]));
  for (const r of bl.table.values()) {
    const e = live.get(r.id) || { id: r.id, name: team(r.id).name, seasons: 0, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0, titles: 0 };
    if (r.p) { e.seasons++; e.p += r.p; e.w += r.w; e.d += r.d; e.l += r.l; e.gf += r.gf; e.ga += r.ga; e.pts += r.pts; }
    live.set(r.id, e);
  }
  const eternal = [...live.values()].filter((e) => e.p).sort((a, b) => b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga));
  const sc = E.topScorers(S(), 20);
  const R = S().records; const mine = new Set(c ? c.teams : []);
  const recLine = (lbl, r, txt) => r ? `<div class="kv" style="margin-bottom:4px"><label>${lbl}</label><span>${txt} <span class="muted small">(Saison ${r.season}${r.day ? ", Spieltag " + r.day : ""})</span></span></div>` : "";
  return `<h2>Erfolge</h2>${seg}
  <div class="grid g2">
    <div class="card"><h3>Torjäger Saison ${S().season}</h3><div class="scroll"><table><thead><tr><th>#</th><th>Spieler</th><th>Verein</th><th class="r">Tore</th></tr></thead><tbody>
      ${sc.map((x, i) => `<tr class="${mine.has(x.team) ? "me" : ""}"><td>${i + 1}</td><td>${esc(x.name)}</td><td class="small">${esc(team(x.team)?.name || "")}</td><td class="r"><b>${x.goals}</b></td></tr>`).join("") || '<tr><td class="muted" colspan="4">Noch keine Tore.</td></tr>'}</tbody></table></div></div>
    <div class="card"><h3>Meister & Torschützenkönige</h3>${S().history.length ? `<div class="scroll"><table><thead><tr><th>Saison</th><th>Meister</th><th>Torschützenkönig</th></tr></thead><tbody>
      ${S().history.slice().reverse().map((h) => `<tr><td>${h.season}</td><td>${esc(h.blChampion || "–")}</td><td class="small">${h.topScorer ? `${esc(h.topScorer.name)} (${esc(h.topScorer.team)}, ${h.topScorer.goals})` : "–"}</td></tr>`).join("")}</tbody></table></div>` : '<p class="muted small">Die erste Saison läuft noch.</p>'}
      <h3 style="margin-top:14px">Rekorde</h3>
      ${recLine("Meiste Punkte", R.maxPts, R.maxPts ? `${esc(R.maxPts.name)} – ${R.maxPts.pts} Punkte` : "")}
      ${recLine("Höchster Sieg", R.bigWin, R.bigWin ? `${esc(R.bigWin.h)} – ${esc(R.bigWin.a)} ${R.bigWin.gh}:${R.bigWin.ga}` : "")}
      ${recLine("Torreichstes Spiel", R.maxGoals, R.maxGoals ? `${esc(R.maxGoals.h)} – ${esc(R.maxGoals.a)} ${R.maxGoals.gh}:${R.maxGoals.ga}` : "")}
      ${!R.bigWin ? '<p class="muted small">Noch keine Rekorde.</p>' : ""}</div>
  </div>
  <div class="card" style="margin-top:14px"><h3>Ewige Tabelle der Bundesliga</h3><p class="small muted">Alle Bundesliga-Spiele seit Spielbeginn, inklusive laufender Saison.</p><div class="scroll"><table><thead><tr><th>#</th><th>Verein</th><th class="r">Jahre</th><th class="r">Sp</th><th class="r">S</th><th class="r">U</th><th class="r">N</th><th class="r">Tore</th><th class="r">Pkt</th><th class="r">Titel</th></tr></thead><tbody>
    ${eternal.map((e, i) => `<tr class="${mine.has(e.id) ? "me" : ""}"><td>${i + 1}</td><td>${esc(e.name)}</td><td class="r">${e.seasons}</td><td class="r">${e.p}</td><td class="r">${e.w}</td><td class="r">${e.d}</td><td class="r">${e.l}</td><td class="r">${e.gf}:${e.ga}</td><td class="r"><b>${e.pts}</b></td><td class="r">${e.titles ? "🏆".repeat(Math.min(e.titles, 3)) + (e.titles > 3 ? e.titles : "") : ""}</td></tr>`).join("")}</tbody></table></div></div>`;
}

document.addEventListener("click", async (e) => {
  if (e.target.id === "reset") { e.preventDefault(); if (confirm("Solo-Spiel komplett zurücksetzen?")) { backend.reset(); location.reload(); } }
  if (e.target.id === "logout") { e.preventDefault(); await backend.signOut(); location.reload(); }
});
window.__fm = { app, backend, E };
boot();
