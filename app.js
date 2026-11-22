import * as E from "./engine.js?v=202611221351";
import { backend, MODE, kickoff } from "./backend.js?v=202611221351";
import { ROLES, ROLE_ORDER, SPORT_ROLES, STAFF_LEVELS, GF_TASKS, staffSalary } from "./staff.js?v=202611221351";

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
  const D = seeds.length - 1;
  const liveMs = Date.now() - kickoff(info.start_date, D);
  const live = D >= 1 && E.dayInfo(D).day !== E.SEASON_DAYS && liveMs >= 0 && liveMs < LIVE_LEN;
  let from = null;
  try {
    const rec = await snapGet("main");
    if (rec && rec.day <= (live ? D - 1 : D) && rec.fp === snapFp(rec.day)) from = { S: rec.S, day: rec.day };
    if (live && !from) { const pr = await snapGet("prev"); if (pr && pr.day === D - 1 && pr.fp === snapFp(pr.day)) from = { S: pr.S, day: pr.day }; }
  } catch (e) { console.warn("Zwischenspeicher nicht lesbar", e); }
  app.fromDay = from ? from.day : 0;
  let prev = null;
  const full = E.simulate(app.world, seeds, actions, members, {
    startDate: info.start_date, from,
    onPrev: (S2, d) => { try { prev = structuredClone({ ...S2, squadCache: new Map() }); if (live) snapPut("prev", { day: d, fp: snapFp(d), S: structuredClone(prev) }).catch(() => {}); } catch (e) { console.warn(e); } },
    onSnapshot: (S2, d) => { try { const snap = structuredClone({ ...S2, squadCache: new Map() }); snapPut("main", { day: d, fp: snapFp(d), S: snap }).catch(() => {}); } catch (e) { console.warn("Zwischenspeicher nicht schreibbar", e); } },
  });
  app.Slive = full; app.live = null;
  if (live && prev) {
    prev.revealed = D - 1; prev.lastSeed = E.hex32(seeds[D - 1]);
    // Während des Livetickers: Stand vor dem Spieltag anzeigen, eigene neue Eingaben aber schon sichtbar machen
    for (const a of actions.slice().sort((x, y) => x.id - y.id)) if (Math.max(1, a.eff_day | 0) > D) { try { E.applyAction(prev, a, members[a.user_id], E.hex32(seeds[D])); } catch (e) { console.warn(e); } }
    app.S = prev; app.live = { day: D, ko: kickoff(info.start_date, D).getTime() };
  }
  else app.S = full;
  app.simMs = Math.round(performance.now() - t0);
  render();
}
// ------------------------------------------------------------ Spielstand-Zwischenspeicher (IndexedDB)
const APP_V = new URL(import.meta.url).searchParams.get("v") || "dev";
function cyrb53(str, seed = 0) {
  let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
  for (let i = 0; i < str.length; i++) { const ch = str.charCodeAt(i); h1 = Math.imul(h1 ^ ch, 2654435761); h2 = Math.imul(h2 ^ ch, 1597334677); }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}
function snapFp(d) {
  const acts = app.actions.filter((a) => Math.max(1, a.eff_day | 0) <= d).sort((x, y) => x.id - y.id).map((a) => [a.id, a.user_id, a.type, a.payload, a.eff_day]);
  return [APP_V, MODE, app.world.version || "", app.info?.start_date || "", cyrb53(app.seeds.slice(0, d + 1).join(",")), acts.length, cyrb53(JSON.stringify(acts))].join("|");
}
function idb() {
  return new Promise((res, rej) => { const r = indexedDB.open("anstoss", 1); r.onupgradeneeded = () => r.result.createObjectStore("snap"); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
}
async function snapGet(k) { const db = await idb(); return new Promise((res, rej) => { const q = db.transaction("snap").objectStore("snap").get(k); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error); }); }
async function snapPut(k, v) { const db = await idb(); return new Promise((res, rej) => { const tx = db.transaction("snap", "readwrite"); tx.objectStore("snap").put(v, k); tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error); }); }
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
  if (app.live) {
    const el2 = document.getElementById("countdown");
    if (Date.now() - app.live.ko >= LIVE_LEN) { app.live = null; app.S = app.Slive; render(); return; }
    const mi = liveMinute(); if (el2) el2.textContent = mi.label;
    if ((Date.now() / 1000 | 0) % 10 === 0) { const box = document.getElementById("liveticker"); if (box) box.outerHTML = liveCard(); }
    return;
  }
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
const team = (id) => E.tm(S(), id);
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
  const tabs = c ? [["home", "Übersicht"], ["kader", "Kader"], ["aufstellung", "Aufstellungen"], ["transfer", "Transfers"], ["personal", "Personal"], ["verein", "Verein"], ["finanzen", "Finanzen"], ["statistik", "Statistik"], ["ligen", "Ligen"], ["pokale", "Pokale"], ["europa", "Europa"], ["erfolge", "Erfolge"], ["chat", "Chat" + unreadBadge()], ["spieler", "Mitspieler"]]
    : [["start", "Start"], ["ligen", "Ligen"], ["pokale", "Pokale"], ["europa", "Europa"], ["erfolge", "Erfolge"], ["chat", "Chat" + unreadBadge()], ["spieler", "Mitspieler"]];
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
  const view = { home: vHome, kader: vKader, transfer: vTransfer, verein: vVerein, personal: vPersonal, aufstellung: vAufstellung, europa: vEuropa, finanzen: vFinanzen, ligen: vLigen, pokale: vPokale, spieler: vSpieler, start: vStart, erfolge: vErfolge, chat: vChat, statistik: vStatistik }[app.tab];
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
      if (type === "ticketAuto") payload = { on: el.checked };
      if (type === "friendly") payload = { ids: [...document.querySelectorAll(".frsel:checked")].map((x) => x.value) };
      if (type === "credit") payload = { amount: Number(document.getElementById("crAmt")?.value || 0), years: Number(document.getElementById("crYrs")?.value || 3) };
      if (type === "buyPlayer" && payload.mode === "bid") payload.amount = Number(document.getElementById("bidAmt")?.value || 0);
      if (type === "humanOffer") payload.amount = Number(document.getElementById("ho-" + payload.pid)?.value || 0);
      if (type === "lineup" && el.type === "checkbox") payload = { comp: el.dataset.comp || "pokal", same: !el.checked };
      if (type === "rename") { const inp = document.getElementById(payload.what === "staff" ? "rn-staff-" + payload.role : "rn-" + payload.id); payload = { ...payload, name: inp?.value || "" }; if (payload.what === "staff") app.sel.staffRn = ""; }
      if (type === "staff") payload = { role: el.dataset.role, lvl: Number(el.value) };
      act(type, payload);
    });
  });
  root.querySelectorAll("[data-sel]").forEach((el) => {
    el.addEventListener(el.tagName === "SELECT" ? "change" : "click", () => { app.sel[el.dataset.sel] = el.tagName === "SELECT" ? el.value : el.dataset.v; render(); if (el.dataset.sel === "buy" && el.dataset.v) window.scrollTo({ top: 0, behavior: "smooth" }); });
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
  if (app.live) parts.push(liveCard());
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
      ${cm ? mbox(`${cm.cup.name} · ${m ? "zusätzlich " : ""}heute 18:00`, cm.m, (() => { const U = E.setupOf(c.h, "pokal"); return `<p class="small muted" style="text-align:center;margin:8px 0 0">${U.same ? "Liga-Aufstellung" : "Eigene Pokal-Aufstellung"} · ${esc(U.formation)}, ${esc(U.tactic)}, Intensität ${U.intensity} · Stärke ${st(E.humanXI(S(), c, "pokal").str)}</p>`; })()) : ""}
      ${(() => { const em = euroMatchFor(t, nd.day); return em ? mbox(`${esc(em.C.name)} · ${esc(em.stage)} · heute 18:00`, em.m, `<p class="small muted" style="text-align:center;margin:8px 0 0">${E.setupOf(c.h, "europa").same ? "Liga-Aufstellung" : "Europapokal-Aufstellung"} · Stärke ${st(E.humanXI(S(), c, "europa").str)} gegen ${st(E.teamStrength(S(), team(em.m.h === t.id ? em.m.a : em.m.h)))}</p>`) : ""; })()}
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
  if (t.status === "active") {
    const L = Math.min(t.level, 11), pos = posOf(t);
    const now = E.licenseIssues(S(), c, L), up = L > 1 ? E.licenseIssues(S(), c, L - 1) : [];
    if (now.length) todo.push(`Anforderungen der eigenen Liga nicht erfüllt: ${now.join(", ")} – im Verein nachrüsten.`);
    else if (up.length) todo.push(`${pos && pos <= 3 ? "Achtung, Aufstiegsplatz! " : ""}Für einen Aufstieg in die ${E.LV[L - 1].name} fehlt: ${up.join(", ")} – sonst gibt es keine Lizenz (Verein → Lizenz-Check).`);
    if (E.isWinter(S()) && E.trainingCapacity(S(), c.h) < 0.8) todo.push(`Wintersperre: Rasenplätze gesperrt, Trainingsbetrieb nur ${Math.round(E.trainingCapacity(S(), c.h) * 100)} % – ein Kunstrasen würde helfen.`);
  }
  const sad = c.h.players.filter((p) => (p.mood ?? 60) < 30);
  if (sad.length) todo.push(`Unzufrieden: ${sad.map((p) => `${p.name}${p.moodWhy ? " (" + p.moodWhy + ")" : ""}`).join(", ")}.`);
  if (!c.h.captain) todo.push("Einen Kapitän bestimmen (Kader → Spieler) – stärkt die Teamchemie.");
  const awayP = c.h.players.filter((p) => p.away);
  if (awayP.length) todo.push(`Heute fehlen: ${awayP.map((p) => `${p.name} (${p.away.n})`).join(", ")}.`);
  const expN = c.h.players.filter((p) => p.ct && p.ct.until <= S().season && !p.retiring).length;
  if (expN && S().day >= 15) todo.push(`${expN} Verträge laufen zum Saisonende aus – im Kader verlängern (Sortierung „Vertrag“).`);
  if (tired > 6) todo.push(`${tired} Spieler sind müde (Fitness unter 50). Intensität senken oder rotieren.`);
  if (todo.length) parts.push(`<div class="card" style="margin-top:14px"><h3>To-do</h3>${todo.map((x) => `<div>• ${esc(x)}</div>`).join("")}</div>`);
  if (c.h.request) parts.push(`<div class="card" style="margin-top:14px;border-color:var(--warn)"><h3>Mannschaftsrat</h3><p>${esc(c.h.request.reason)}: <b>${eur(c.h.request.amount)}</b>.</p><div class="row">${btn("Prämie zusagen", "request", { accept: true }, "btn pri")} ${btn("Ablehnen", "request", { accept: false }, "btn")}</div><p class="small muted">Zusagen hebt Laune und Teamchemie, Ablehnen drückt beides. Ohne Antwort gilt sie nach drei Tagen als abgelehnt.</p></div>`);
  parts.push(headlinesCard(c));
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
  if (p.away) return `<span class="pill" title="Fehlt: ${esc(p.away.n)}">fehlt · ${esc(p.away.n)}${p.away.days > 1 ? " · " + p.away.days + " T" : ""}</span>`;
  if (p.fit <= 0) return `<span class="pill crit">nicht spielfit</span>`;
  return "";
}
function vKader() {
  const c = myClub(), h = c.h;
  const doc = (p) => { const a = E.doctorAdvice(h, p); return a ? ` <span class="pill warn" title="Mannschaftsarzt">🩺 ${esc(a)}</span>` : ""; };
  const xi = E.humanXI(S(), c); const slotOf = new Map(xi.xi.filter((x) => x.p).map((x) => [x.p.id, x.slot]));
  const sortBy = app.sel.kaderSort || "pos";
  const sorters = { pos: (a, b) => POS_ORDER[a.pos] - POS_ORDER[b.pos] || b.max - a.max, max: (a, b) => b.max - a.max, fit: (a, b) => b.fit - a.fit, g: (a, b) => b.s.g - a.s.g || b.s.apps - a.s.apps, form: (a, b) => (b.form || 0) - (a.form || 0), ct: (a, b) => (a.ct?.until ?? 0) - (b.ct?.until ?? 0) || b.max - a.max };
  const ps = h.players.slice().sort(sorters[sortBy] || sorters.pos);
  const wages = h.players.reduce((s2, p) => s2 + p.wage, 0);
  const inj = h.players.filter((p) => p.inj).length, ban = h.players.filter((p) => p.ban > 0).length;
  const avgFit = h.players.reduce((s2, p) => s2 + p.fit, 0) / Math.max(1, h.players.length);
  const sel = (key, opts, cur) => `<select data-act="tactic" data-key="${key}">${opts.map(([v, n]) => `<option value="${v}" ${String(v) === String(cur) ? "selected" : ""}>${n}</option>`).join("")}</select>`;
  const open = app.sel.player;
  const detail = (p) => `<tr><td colspan="16" style="white-space:normal;background:var(--surface2);padding:0"><div style="position:sticky;left:0;width:min(calc(100vw - 64px),1040px);padding:10px">
    <div class="row" style="justify-content:space-between"><b>${esc(p.name)} · ${E.POS_NAMES[p.pos]}${p.nat ? " · " + esc(E.NAT_NAMES[p.nat] || p.nat) : ""}</b><span class="small muted">Potenzial ${p.age < 30 ? potTxt(h, p) : "–"} · Marktwert ${eur(E.valueOf(p))} · Gehalt ${eur(p.wage)}/Saison</span></div>
    <div class="grid g3" style="gap:4px 16px;margin:8px 0">${E.ATTRS.map((k) => `<div class="row" style="gap:6px"><span class="small" style="width:108px">${E.ATTR_NAMES[k]}</span><span class="bar" style="flex:1"><i style="width:${p.a[k]}%"></i></span><b class="small" style="width:40px;text-align:right">${st(p.a[k])}</b></div>`).join("")}</div>
    <div class="small muted">Stärke auf anderen Positionen: ${E.POSITIONS.filter((x) => x !== p.pos).map((x) => ({ x, v: E.posStrength(p, x) })).sort((a, b) => b.v - a.v).slice(0, 4).map((o) => `${o.x} ${st(o.v)}`).join(" · ")}</div>
    <div class="small muted">Karriere: ${p.c.apps} Spiele, ${p.c.g} Tore, ${p.c.as || 0} Vorlagen, ${p.c.zw || 0} gewonnene Zweikämpfe, ${p.c.y} Gelb, ${p.c.r} Rot</div>
    <div class="small muted">Noten: letzte <b>${p.lastGrade != null ? String(p.lastGrade).replace(".", ",") : "–"}</b> · Schnitt ${avgGrade(p)} aus ${p.s.nn || 0} Spielen${p.s.fr ? ` · ${p.s.fr} Testspiele` : ""}</div>
    <div class="small muted">Form: <b>${E.formLabel(p.form)}</b> (${p.form > 0 ? "+" : ""}${Math.round((p.form || 0) * E.FORM_AMP * 100)} % Leistung) · Formschwankung ${p.a.men >= 70 ? "gering" : p.a.men >= 40 ? "mittel" : "hoch"} (Mentale Stärke ${Math.round(p.a.men)})${p.major ? ` · ${p.major} schwere Verletzung(en)` : ""}</div>
    <div class="small" style="margin-top:4px">Laune: <b>${E.MOOD_LABEL(p.mood)}</b> (${Math.round(p.mood ?? 60)}/100)${(p.mood ?? 60) < 50 && p.moodWhy ? ` – Grund: ${esc(p.moodWhy)}` : ""}${p.wantsOut ? ' · <span class="crit">will wechseln</span>' : ""} · Rolle: ${E.squadRoles(h).get(p.id)} ${p.id === h.captain ? "· <b>Kapitän</b>" : btn("Zum Kapitän machen", "captain", { id: p.id }, "btn sm")}</div>
    ${ctBox(h, p)}
    <div class="row" style="margin-top:8px;gap:6px"><input id="rn-${esc(p.id)}" maxlength="40" value="${esc(p.name)}" style="width:200px">${btn("Umbenennen", "rename", { what: "player", id: p.id })}</div>
    <div style="margin-top:6px">${p.loan ? "" : E.transferWindow(S()) ? `${btn("Verkaufen", "sellPlayer", { id: p.id }, "btn sm", `data-confirm="${esc(p.name)} für ${eur(E.valueOf(p) * 0.8)} verkaufen?"`)} ${btn("Verleihen", "loanOut", { id: p.id }, "btn sm", `data-confirm="${esc(p.name)} bis Saisonende verleihen?"`)}` : '<span class="small muted">Verkaufen/Verleihen nur im Transferfenster · </span>'} ${btn("Entlassen", "releasePlayer", { id: p.id }, "btn sm danger", `data-confirm="${esc(p.name)} entlassen? Abfindung ${eur(p.wage * 0.5 * (Math.max(0, (p.ct?.until ?? S().season) - S().season) + Math.max(0, 34 - S().day) / 34))} (halbes Restgehalt)."`)}</div></div></td></tr>`;
  const foreignN = h.players.filter((p) => p.nat && p.nat !== "GER").length;
  const cap = h.players.find((p) => p.id === h.captain);
  return `<h2>Kader</h2><p class="sub">Teamchemie <b>${Math.round(h.chem ?? 60)}</b>/100 · Kapitän: ${cap ? esc(cap.name) : '<span class="warn">keiner</span>'} · ${h.players.length} Spieler (${foreignN} Ausländer) · Gehälter ${eur(wages)}/Saison · Startelf <b>${st(xi.str)}</b> aktuell / ${st(xi.max)} max · Ø Fitness ${Math.round(avgFit)}${inj ? ` · <span class="crit">${inj} verletzt/krank</span>` : ""}${ban ? ` · <span class="warn">${ban} gesperrt</span>` : ""}</p>
  <div class="card" style="margin-bottom:14px"><div class="grid g2" style="gap:10px">
    <div class="row"><label class="muted" style="width:110px">Formation</label>${sel("formation", Object.keys(E.FORMATIONS).map((f) => [f, f]), h.formation)}</div>
    <div class="row"><label class="muted" style="width:110px">Spielweise</label>${sel("tactic", Object.keys(E.TACTICS).map((f) => [f, f]), h.tactic)}</div>
    <div class="row"><label class="muted" style="width:110px">Intensität</label>${sel("intensity", E.INTENSITY.map((n, i) => [i + 1, `${i + 1} – ${n}`]), h.intensity || 3)}</div>
    <div class="row"><label class="muted" style="width:110px">Aggressivität</label>${sel("aggression", E.AGGRESSION.map((n, i) => [i + 1, `${i + 1} – ${n}`]), h.aggression || 3)}</div>
    <div class="row"><label class="muted" style="width:110px">Rotation ab</label>${sel("minFit", [[0, "keine Schonung"], [40, "Fitness unter 40"], [50, "Fitness unter 50"], [60, "Fitness unter 60"], [70, "Fitness unter 70"], [80, "Fitness unter 80"]], h.minFit ?? 60)}</div>
  </div>
  <p class="small muted" style="margin:10px 0 0">Hohe Intensität bringt etwas mehr Leistung und schnellere Entwicklung, kostet aber mehr Fitness und erhöht das Verletzungsrisiko. Pausen bauen Fitness wieder auf. Hohe Aggressivität gewinnt mehr Zweikämpfe (je nach Zweikampfstärke), bringt aber Karten und Sperren. Die Startelf stellt sich automatisch aus den fittesten und stärksten Spielern zusammen.</p></div>
  <div class="row" style="margin-bottom:8px"><span class="muted small">Sortieren:</span><div class="seg">${[["pos", "Position"], ["max", "Stärke"], ["fit", "Fitness"], ["form", "Form"], ["ct", "Vertrag"], ["g", "Tore"]].map(([k, n]) => `<button data-sel="kaderSort" data-v="${k}" aria-pressed="${sortBy === k}">${n}</button>`).join("")}</div><span class="small muted">Tippe auf einen Spieler für Details.</span></div>
  <div class="card scroll"><table><thead><tr><th>Pos</th><th>Name</th><th class="r">Alter</th><th>Fitness</th><th class="r">Aktuell</th><th class="r">Max</th><th>Form</th><th>Laune</th><th>Status</th><th>Vertrag</th><th class="r">Sp</th><th class="r" title="Notenschnitt">Ø</th><th class="r">Tore</th><th class="r">Vorl.</th><th class="r">Gelb</th><th class="r">Rot</th></tr></thead><tbody>
  ${ps.map((p) => `<tr class="${slotOf.has(p.id) ? "xi" : ""}" data-sel="player" data-v="${open === p.id ? "" : esc(p.id)}" style="cursor:pointer"><td>${p.pos}${slotOf.has(p.id) && slotOf.get(p.id) !== p.pos ? `<span class="small muted">→${slotOf.get(p.id)}</span>` : ""}</td><td>${esc(p.name)}${p.id === h.captain ? ' <b title="Kapitän">©</b>' : ""}${p.loan ? ' <span class="pill">Leihe</span>' : ""}${natTag(p)}</td><td class="r">${p.age}</td><td>${fitBar(p.fit)}</td>
    <td class="r"><b>${st(p.inj ? 0 : E.curStrength(p))}</b></td><td class="r muted">${st(p.max)}</td><td>${formIcon(p.form)}</td><td>${moodIcon(p.mood)}</td><td>${statusOf(p)}${doc(p)}${p.retiring ? ' <span class="pill">Karriereende</span>' : ""}</td><td class="small ${p.ct && p.ct.until <= S().season ? "warn" : ""}">${p.ct ? `bis S${p.ct.until}${p.ct.kind !== "fest" ? " · " + E.CT_KINDS[p.ct.kind] : ""}` : "–"}</td><td class="r">${p.s.apps}</td><td class="r" style="color:${p.s?.nn ? gradeCol(p.s.nt / p.s.nn) : "inherit"}">${avgGrade(p)}</td><td class="r">${p.s.g}</td><td class="r">${p.s.as || 0}</td><td class="r">${p.s.y}</td><td class="r">${p.s.r}</td></tr>${open === p.id ? detail(p) : ""}`).join("")}
  </tbody></table></div>${friendlyCard(h)}<p class="small muted">Blau markiert: aktuelle Startelf (→ andere Position). Statistik der laufenden Saison inklusive Pokalspielen.</p>`;
}



const gradeCol = (g) => (g <= 2 ? "var(--ok)" : g <= 3.5 ? "inherit" : g <= 4.5 ? "var(--warn)" : "var(--crit)");
const avgGrade = (p) => (p.s?.nn ? (p.s.nt / p.s.nn).toFixed(1).replace(".", ",") : "–");
const moodIcon = (m = 60) => `<span title="${E.MOOD_LABEL(m)} (${Math.round(m)})">${m >= 80 ? "😀" : m >= 62 ? "🙂" : m >= 45 ? "😐" : m >= 30 ? "🙁" : "😠"}</span>`;
const natTag = (p) => p.nat && p.nat !== "GER" ? ` <span class="muted small" title="${esc(E.NAT_NAMES[p.nat] || p.nat)}">${p.nat}</span>` : "";
function kasseTip(c) {
  const h = c.h, a = E.kasseAdvice(S(), c);
  if (!a) return '<p class="small muted">Kein Kassenwart – niemand rechnet nach, ob die Preise passen.</p>';
  const L = Math.min(E.firstTeam(S(), c).level, 11), price = (f) => (E.LV[L].price * f).toFixed(2) + " €";
  const dirTxt = a.dir === "up" ? "rauf" : a.dir === "down" ? "runter" : "passt so";
  const who = `${esc(h.staff.kasse.name)} (${esc(ROLES.kasse.lv[a.lvl - 1][0])})`;
  const txt = a.lvl === 1 ? `„Ich würd' sagen: ${dirTxt}! Und das Bier könnte auch 50 Cent mehr kosten.“`
    : a.lvl === 2 ? (a.dir === "ok" ? "„Die Preise passen ungefähr.“" : `„Die Preise sollten eher ${a.dir === "up" ? "höher" : "niedriger"} sein.“`)
    : `Empfehlung: <b>${Math.round(a.f * 100)} %</b> (${price(a.f)})${a.lvl >= 4 ? ` · erwartete Einnahmen je Heimspiel ca. ${eur(a.opt.rev * (a.f === a.opt.f ? 1 : 0.98))} (aktuell ${eur(a.opt.cur)})` : ""}`;
  return `<p class="small" style="margin:6px 0">${who}: ${txt}</p>`;
}
function friendlyCard(h) {
  const nd = nextDay().day;
  const planned = h.friendly && h.friendly.day === nd ? h.friendly : null;
  const cand = h.players.filter((p) => !p.inj).sort((a, b) => ((a.form || 0) - (b.form || 0)) || (a.s.apps - b.s.apps));
  const hint = (p) => (p.form || 0) < -0.15 ? "Formtief" : p.s.apps < 3 ? "wenig Spielpraxis" : p.fit < 70 ? "müde" : "";
  return `<div class="card" style="margin-top:14px"><h3>Freundschaftsspiel</h3><p class="small muted" style="margin-top:0">Ein Testspiel pro Spieltag: bringt Spielpraxis und Form (vor allem bei Spielern im Formtief oder nach Verletzungen), kostet aber 14–24 Fitness. Findet nach dem Pflichtspiel statt.</p>
    ${planned ? `<p class="small"><b>Angesetzt für heute</b> mit ${planned.ids.length} Spielern: ${planned.ids.map((id) => esc(h.players.find((p) => p.id === id)?.name || "")).join(", ")}.</p>` : ""}
    <div style="display:flex;flex-wrap:wrap;gap:4px 14px">${cand.map((p) => `<label class="small" style="display:flex;gap:6px;align-items:center"><input type="checkbox" class="frsel" value="${esc(p.id)}" ${planned?.ids.includes(p.id) ? "checked" : ""}> ${esc(p.name)} <span class="muted">${p.pos} · Fit ${Math.round(p.fit)}${hint(p) ? " · " + hint(p) : ""}</span></label>`).join("")}</div>
    <div style="margin-top:8px">${btn(planned ? "Aufstellung fürs Testspiel ändern" : "Testspiel ansetzen", "friendly", {}, "btn sm pri")}</div></div>`;
}
// ------------------------------------------------------------ Form & Verträge
function formIcon(f = 0) { const [i, col] = f >= 0.5 ? ["⬆", "var(--ok)"] : f >= 0.15 ? ["↗", "var(--ok)"] : f > -0.15 ? ["→", "var(--muted)"] : f > -0.5 ? ["↘", "var(--warn)"] : ["⬇", "var(--crit)"]; return `<span title="${E.formLabel(f)}" style="color:${col};font-weight:700">${i}</span>`; }
function ctPanel(p, mode, h) {
  const yrs = Math.min(5, Math.max(1, Number(app.sel.ctYears) || 2));
  const maxY = p.age >= 33 ? 2 : 5;
  const clause = !!app.sel.ctClause;
  const bmode = mode === "buy" ? (app.sel.buyMode || "buy") : null;
  const canLoan = mode === "buy" && p.from && p.age <= 23;
  const offers = E.contractOffers(p, bmode === "loan" ? 1 : Math.min(yrs, maxY), clause && bmode !== "loan");
  const until = mode === "buy" ? E.ctUntil(S(), Math.min(yrs, maxY)) : Math.max(p.ct?.until ?? S().season, S().season - 1 + (S().day > 17 ? 1 : 0)) + Math.min(yrs, maxY);
  const bon = (b) => b ? `${eur(b.app)} je Einsatz · ${eur(b.duel)} je gew. Zweikampf · ${eur(b.ast)} je Vorlage · ${eur(b.goal)} je Tor` : "keine Prämien";
  const win = E.transferWindow(S());
  const modeBar = mode === "buy" ? `<div class="row" style="gap:6px;margin-bottom:6px;flex-wrap:wrap"><div class="seg">${[["buy", `Sofortkauf (${eur(p.price)})`], ["bid", "Gebot"], ...(canLoan ? [["loan", `Leihe (${eur(E.valueOf(p) * 0.08)})`]] : [])].map(([k, n]) => `<button data-sel="buyMode" data-v="${k}" aria-pressed="${bmode === k}">${n}</button>`).join("")}</div>
    ${bmode === "bid" ? `<input id="bidAmt" type="number" min="0" step="100" value="${Math.round(p.price * 0.85)}" style="width:130px"> <span class="small muted">€ – zu niedrige Gebote lehnt der Verein ab und nennt seine Forderung.</span>` : ""}
    ${bmode === "loan" ? '<span class="small muted">Bis Saisonende, Gehalt zahlst du voll, danach geht er zurück.</span>' : ""}</div>
    ${p.from && !win ? '<p class="small warn" style="margin:0 0 6px">Transferfenster geschlossen – Vereinsspieler erst wieder im nächsten Fenster.</p>' : ""}` : "";
  return `<div style="padding:6px 0">${modeBar}<div class="row" style="gap:6px;margin-bottom:6px"><b class="small">${mode === "buy" ? `Vertrag für ${esc(p.name)}` : "Vertrag verlängern"}</b>
    <span class="small muted">Laufzeit:</span><div class="seg">${[1, 2, 3, 4, 5].map((y) => `<button data-sel="ctYears" data-v="${y}" aria-pressed="${Math.min(yrs, maxY) === y}" ${y > maxY ? "disabled" : ""}>${y} J.</button>`).join("")}</div><span class="small muted">→ bis Saison ${bmode === "loan" ? S().season : until}</span>
    ${bmode !== "loan" ? `<label class="small" style="display:flex;gap:6px;align-items:center"><input type="checkbox" data-sel="ctClause" data-v="${clause ? "" : "1"}" ${clause ? "checked" : ""}> Ausstiegsklausel (${eur(E.valueOf(p) * 1.6)}) – 8 % weniger Gehalt</label>` : ""}</div>
    <div class="scroll"><table><thead><tr><th>Angebot</th><th class="r">Fix / Saison</th><th>Leistungsprämien</th><th class="r">Erwartet / Saison</th><th></th></tr></thead><tbody>
    ${offers.map((o) => `<tr><td><b>${E.CT_KINDS[o.kind]}</b></td><td class="r">${eur(o.base)}</td><td class="small" style="white-space:normal">${bon(o.kind === "fest" ? null : o.bonus)}</td><td class="r">${eur(o.expected)}</td>
      <td>${mode === "buy" ? btn(bmode === "bid" ? "Gebot abgeben" : "Unterschreiben", "buyPlayer", { id: p.id, years: Math.min(yrs, maxY), kind: o.kind, mode: bmode, clause }, "btn sm pri", (p.from && !win) ? "disabled" : "") : btn("Verlängern", "contract", { id: p.id, years: Math.min(yrs, maxY), kind: o.kind, clause }, "btn sm pri")}</td></tr>`).join("")}</tbody></table></div>
    <p class="small muted" style="margin:4px 0 0">Fest = volles Gehalt, egal wie er spielt. Leistung = niedriges Fixum, dafür Prämien für Einsätze, gewonnene Zweikämpfe, Vorlagen und Tore (erwartet bei ca. 26 Einsätzen). ${p.age >= 33 ? "Mit über 32 Jahren unterschreibt er höchstens 2 Jahre." : ""}</p></div>`;
}
function ctBox(h, p) {
  if (!p.ct) return "";
  const b = p.ct.bonus;
  if (p.loan) return `<div class="small" style="margin-top:6px"><b>Leihspieler</b> von ${esc(team(p.loan.from)?.name || "?")} bis Saisonende · ${eur(p.ct.base)} Gehalt/Saison</div>`;
  return `<div class="small" style="margin-top:6px"><b>Vertrag:</b> bis Saison ${p.ct.until} · ${E.CT_KINDS[p.ct.kind]} · ${eur(p.ct.base)} fix/Saison${p.ct.clause ? ` · Ausstiegsklausel ${eur(p.ct.clause)}` : ""}${b ? ` · Prämien: ${eur(b.app)}/Einsatz, ${eur(b.duel)}/Zweikampf, ${eur(b.ast)}/Vorlage, ${eur(b.goal)}/Tor` : ""}${p.retiring ? ' · <span class="warn">beendet zum Saisonende seine Karriere</span>' : ""}</div>
    ${p.retiring ? "" : app.sel.ctOpen === p.id ? ctPanel(p, "extend", h) : `<button class="btn sm" style="margin-top:4px" data-sel="ctOpen" data-v="${esc(p.id)}">Vertrag verlängern …</button>`}`;
}

// ------------------------------------------------------------ Aufstellungen (Liga / Pokal)
function vAufstellung() {
  const c = myClub(), h = c.h;
  const comp = ["pokal", "europa"].includes(app.sel.lineupComp) ? app.sel.lineupComp : "liga";
  const X = E.humanXI(S(), c, comp), U = X.setup;
  const locked = comp !== "liga" && U.same;
  const sel = (key, opts, cur) => `<select data-act="lineup" data-key="${key}" data-p='${esc(JSON.stringify({ comp }))}' ${locked ? "disabled" : ""}>${opts.map(([v, n]) => `<option value="${v}" ${String(v) === String(cur) ? "selected" : ""}>${n}</option>`).join("")}</select>`;
  const slots = E.FORMATIONS[U.formation] || E.FORMATIONS["4-4-2"];
  const avail = (p) => !p.inj && !(p.ban > 0) && !p.away && p.fit > 0;
  const tag = (p) => p.inj ? ` – ${p.inj.n}` : p.ban > 0 ? " – gesperrt" : p.away ? ` – fehlt (${p.away.n})` : p.fit <= 0 ? " – nicht spielfit" : "";
  const rows = slots.map((pos, i) => {
    const cur = X.xi[i]; const want = U.manual[i] || "";
    const wantP = want ? h.players.find((p) => p.id === want) : null;
    const cand = h.players.slice().sort((a, b) => E.posStrength(b, pos) - E.posStrength(a, pos));
    const opts = `<option value="">Automatisch${!want && cur?.p ? ` (${esc(cur.p.name)})` : ""}</option>` + cand.map((p) => `<option value="${esc(p.id)}" ${p.id === want ? "selected" : ""} ${avail(p) ? "" : "style=\"color:#b42318\""}>${esc(p.name)} (${p.pos}) · ${st(E.posStrength(p, pos))} · Fit ${Math.round(p.fit)}${tag(p)}</option>`).join("");
    const note = wantP && !(cur?.p && cur.p.id === want) ? `<div class="small crit">${esc(wantP.name)} fällt aus${tag(wantP) || " (Arzt rät ab)"} – wird automatisch ersetzt.</div>` : "";
    return `<tr><td><b>${pos}</b></td><td style="min-width:220px"><select data-act="lineup" data-key="player" data-p='${esc(JSON.stringify({ comp, slot: i }))}' ${locked ? "disabled" : ""} style="width:100%">${opts}</select>${note}</td>
      <td>${cur?.p ? `${esc(cur.p.name)}${cur.fixed ? ' <span class="pill">fest</span>' : ""}` : '<span class="crit">niemand verfügbar</span>'}</td><td class="r">${cur?.p ? st(cur.eff) : "–"}</td><td>${cur?.p ? fitBar(cur.p.fit) : ""}</td></tr>`;
  }).join("");
  const nd = nextDay(), t = E.firstTeam(S(), c);
  const cm = nd.day <= 34 ? cupMatchFor(t, nd.day) : null;
  return `<div class="row" style="justify-content:space-between"><h2>Aufstellungen</h2>
    <div class="seg">${[["liga", "Liga"], ["pokal", "Pokal"], ["europa", "Europa"]].map(([k, n]) => `<button data-sel="lineupComp" data-v="${k}" aria-pressed="${comp === k}">${n}</button>`).join("")}</div></div>
  <p class="sub">${comp === "liga" ? "Gilt für alle Ligaspiele (entspricht den Einstellungen im Kader)." : comp === "europa" ? "Gilt für Champions League, Europa League und Conference League." : `Gilt für alle Pokalspiele${cm ? ` – nächstes: <b>${esc(cm.cup.name)}</b> heute 18:00` : ""}.`} Feste Spieler werden gesetzt, sofern sie einsatzfähig sind; alle anderen Positionen füllt das Spiel automatisch mit den fittesten und stärksten Spielern.</p>
  ${comp !== "liga" ? `<div class="card" style="margin-bottom:12px"><label class="small" style="display:flex;gap:8px;align-items:center"><input style="flex:none" type="checkbox" data-act="lineup" data-comp="${comp}" ${U.same ? "" : "checked"}> <b>Eigene ${comp === "pokal" ? "Pokal" : "Europapokal"}-Aufstellung verwenden</b></label>
    <p class="small muted" style="margin:6px 0 0">${U.same ? `Aktuell spielt die Mannschaft im ${comp === "pokal" ? "Pokal" : "Europapokal"} mit der Liga-Aufstellung.` : comp === "pokal" ? "Ideal, um im Pokal Stammspieler zu schonen oder Talenten Spielzeit zu geben." : "Für die großen Abende: eigene Formation, Taktik und Intensität in CL, EL und ECL."}</p></div>` : ""}
  <div class="card" style="margin-bottom:12px${locked ? ";opacity:.6" : ""}"><div class="grid g2" style="gap:10px">
    <div class="row"><label class="muted" style="width:110px">Formation</label>${sel("formation", Object.keys(E.FORMATIONS).map((f) => [f, f]), U.formation)}</div>
    <div class="row"><label class="muted" style="width:110px">Spielweise</label>${sel("tactic", Object.keys(E.TACTICS).map((f) => [f, f]), U.tactic)}</div>
    <div class="row"><label class="muted" style="width:110px">Intensität</label>${sel("intensity", E.INTENSITY.map((n, i) => [i + 1, `${i + 1} – ${n}`]), U.intensity)}</div>
    <div class="row"><label class="muted" style="width:110px">Aggressivität</label>${sel("aggression", E.AGGRESSION.map((n, i) => [i + 1, `${i + 1} – ${n}`]), U.aggression)}</div>
    <div class="row"><label class="muted" style="width:110px">Rotation ab</label>${sel("minFit", [[0, "keine Schonung"], [40, "Fitness unter 40"], [50, "Fitness unter 50"], [60, "Fitness unter 60"], [70, "Fitness unter 70"], [80, "Fitness unter 80"], [90, "Fitness unter 90"]], U.minFit)}</div>
    <div class="row"><label class="muted" style="width:110px">Stärke</label><b>${st(X.str)}</b><span class="small muted">&nbsp;aktuell / ${st(X.max)} max</span></div>
  </div></div>
  <div class="card scroll"><table><thead><tr><th>Pos</th><th>Einplanung</th><th>Spielt</th><th class="r">Stärke</th><th>Fitness</th></tr></thead><tbody>${rows}</tbody></table>
  <div style="margin-top:8px">${locked ? "" : btn("Alle Positionen automatisch", "lineup", { comp, reset: true }, "btn sm")}</div></div>
  <p class="small muted">Rot markierte Spieler sind derzeit nicht einsatzfähig. Bei einem Formationswechsel werden die festen Einplanungen zurückgesetzt.</p>`;
}

// ------------------------------------------------------------ Transfers & Trainer
function vTransfer() {
  const c = myClub(), h = c.h;
  const market = E.marketFor(S(), c, S().lastSeed);
  const buyP = app.sel.buy ? market.find((x) => x.id === app.sel.buy) : null;
  const win = E.transferWindow(S());
  const offIn = (h.offersIn || []).map((o) => `<tr><td>${esc(o.name)}</td><td class="small">${esc(team(o.from)?.name || "?")}</td><td class="r">${eur(o.amount)}</td><td class="r small muted">${eur(E.valueOf(h.players.find((x) => x.id === o.pid) || {}))}</td><td>${btn("Annehmen", "offerAnswer", { id: o.id, accept: true }, "btn sm pri", `data-confirm="${esc(o.name)} für ${eur(o.amount)} abgeben?"`)} ${btn("Ablehnen", "offerAnswer", { id: o.id, accept: false }, "btn sm")}</td></tr>`).join("");
  const hIn = (S().hoffers || []).filter((o) => o.to === c.id).map((o) => `<tr><td>${esc(o.name)}</td><td class="small">${esc(S().clubs.get(o.from)?.name || "?")} <span class="pill">Mitspieler</span></td><td class="r">${eur(o.amount)}</td><td></td><td>${btn("Annehmen", "humanAnswer", { id: o.id, accept: true }, "btn sm pri", `data-confirm="${esc(o.name)} für ${eur(o.amount)} abgeben?"`)} ${btn("Ablehnen", "humanAnswer", { id: o.id, accept: false }, "btn sm")}</td></tr>`).join("");
  const hOut = (S().hoffers || []).filter((o) => o.from === c.id).map((o) => `<div class="row" style="justify-content:space-between;padding:4px 0;border-top:1px solid var(--line)"><span>${esc(o.name)} · ${esc(S().clubs.get(o.to)?.name || "")} · <b>${eur(o.amount)}</b></span>${btn("Zurückziehen", "humanAnswer", { id: o.id, accept: false }, "btn sm")}</div>`).join("");
  const loaned = (h.loaned || []).map((l) => `<div class="small" style="padding:3px 0">${esc(l.p.name)} (${l.p.pos}, ${st(l.p.max)}) bei ${esc(team(l.to)?.name || "?")} · dort zahlt man ${Math.round(l.share * 100)} % des Gehalts</div>`).join("");
  const others = [...S().clubs.values()].filter((x) => x.h && x !== c && x.owner);
  const oc = others.find((x) => x.id === app.sel.hClub) || null;
  const hSquad = oc ? `<div class="scroll" style="margin-top:8px"><table><thead><tr><th>Pos</th><th>Name</th><th class="r">Alter</th><th class="r">Stärke</th><th class="r">Marktwert</th><th>Vertrag</th><th></th></tr></thead><tbody>${oc.h.players.filter((p) => !p.loan).sort((a, b) => b.max - a.max).map((p) => `<tr><td>${p.pos}</td><td>${esc(p.name)}${natTag(p)}</td><td class="r">${p.age}</td><td class="r">${st(p.max)}</td><td class="r">${eur(E.valueOf(p))}</td><td class="small">${p.ct ? "bis S" + p.ct.until : ""}${p.ct?.clause ? " · Klausel " + eur(p.ct.clause) : ""}</td>
    <td style="white-space:nowrap"><input id="ho-${esc(p.id)}" type="number" min="0" step="1000" value="${Math.round(E.valueOf(p))}" style="width:110px"> ${btn("Angebot", "humanOffer", { pid: p.id }, "btn sm pri", win ? "" : "disabled")}</td></tr>`).join("")}</tbody></table></div>` : "";
  return `<h2>Transfers</h2><p class="sub">${win ? `<span class="pill ok">Transferfenster offen</span> ${win.name}fenster bis Spieltag ${win.until}.` : `<span class="pill warn">Transferfenster geschlossen</span> Nächstes Fenster ab Spieltag ${E.nextWindow(S())}. Vereinslose Spieler gehen immer.`} Fenster: Spieltag 1–7 (Sommer) und 17–20 (Winter).</p>
  ${offIn || hIn ? `<div class="card" style="margin-bottom:14px"><h3>Angebote für deine Spieler</h3><div class="scroll"><table><thead><tr><th>Spieler</th><th>Von</th><th class="r">Angebot</th><th class="r">Marktwert</th><th></th></tr></thead><tbody>${hIn}${offIn}</tbody></table></div><p class="small muted">Angebote gelten drei Tage. Ablehnen kann die Laune des Spielers drücken, wenn das Angebot gut war.</p></div>` : ""}
  ${hOut || loaned ? `<div class="grid g2" style="margin-bottom:14px">${hOut ? `<div class="card"><h3>Deine Angebote an Mitspieler</h3>${hOut}</div>` : ""}${loaned ? `<div class="card"><h3>Verliehen</h3>${loaned}</div>` : ""}</div>` : ""}
  ${buyP ? `<div class="card" style="margin-bottom:14px;border-color:var(--accent)"><div class="row" style="justify-content:space-between"><h3>${esc(buyP.name)} · ${buyP.pos}, ${buyP.age} J., Stärke ${st(buyP.max)}</h3><button class="btn sm" data-sel="buy" data-v="">Schließen</button></div>${ctPanel(buyP, "buy", h)}</div>` : ""}
  <div class="grid g2">
  <div class="card"><h3>Scouting-Bericht</h3>${scoutCard(h, market)}</div>
  <div class="card"><h3>Transfermarkt</h3><div class="scroll"><table><thead><tr><th>Pos</th><th>Name</th><th class="r">Alter</th><th class="r">Stärke</th><th>Verein</th><th class="r">Ablöse</th><th></th></tr></thead><tbody>
  ${market.map((p) => `<tr><td>${p.pos}</td><td>${esc(p.name)}${natTag(p)}</td><td class="r">${p.age}</td><td class="r"><b>${st(p.max)}</b><div class="small muted">Pot. ${potTxt(h, p)}</div><div class="small muted">${["spd", "tec", "zwk", "abs"].map((k) => E.ATTR_NAMES[k].slice(0, 3) + " " + Math.round(p.a[k])).join(" · ")}</div></td><td class="small">${p.from ? esc(team(p.from).name) : "vereinslos"}</td><td class="r">${eur(p.price)}</td>
    <td><button class="btn sm pri" data-sel="buy" data-v="${esc(p.id)}" ${p.price > h.cash ? "disabled" : ""}>Kaufen …</button></td></tr>`).join("")}
  </tbody></table></div><p class="small muted">Beim Kauf wählst du Sofortkauf, Gebot oder (bei Talenten bis 23) Leihe, dazu Laufzeit und eines von drei Vertragsangeboten (fest, ausgewogen, leistungsabhängig). Kader max. 30 Spieler. Mehr Scouts = mehr Angebote und genauere Potenzialschätzung.</p></div></div>
  <div class="card" style="margin-top:14px"><div class="row" style="justify-content:space-between"><h3>Spieler von Mitspielern</h3>${others.length ? `<select data-sel="hClub"><option value="">Verein wählen …</option>${others.map((x) => `<option value="${x.id}" ${oc === x ? "selected" : ""}>${esc(x.name)} (${esc(userName(x.owner))})</option>`).join("")}</select>` : ""}</div>
    ${others.length ? (oc ? hSquad : '<p class="small muted">Wähle einen Verein, um ein Angebot abzugeben.</p>') : '<p class="small muted">Noch keine anderen Mitspieler mit Verein.</p>'}
    <p class="small muted">Transfers unter Mitspielern nur im Transferfenster. Der andere Manager entscheidet innerhalb von drei Tagen; der Spieler behält seinen Vertrag.</p></div>`;
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
    ${recs.length ? recs.map(({ p }) => `<div class="row" style="justify-content:space-between;border-top:1px solid var(--line);padding:6px 0"><span><b>${esc(p.name)}</b>${natTag(p)} <span class="small muted">${p.pos}, ${p.age} J., Stärke ${st(p.max)}, Potenzial ${potTxt(h, p)}</span></span><span>${eur(p.price)} <button class="btn sm pri" data-sel="buy" data-v="${esc(p.id)}" ${p.price > h.cash ? "disabled" : ""}>Kaufen …</button></span></div>`).join("") : '<p class="muted">Heute keine bezahlbare Empfehlung.</p>'}`;
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
      ${role === "kasse" && lvl ? `${kasseTip(c)}<label class="small" style="display:flex;margin-top:4px;gap:8px;align-items:center"><input style="flex:none" type="checkbox" data-act="ticketAuto" ${h.ticketAuto ? "checked" : ""}> Eintrittspreise vom Kassenwart festlegen lassen</label>` : ""}
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
  const fac = [["jugend", "Jugendakademie", "Bessere Jugendtrainer und mehr gewünschte Jugendteams – wie viele es wirklich gibt, hängt von den Plätzen ab."]];
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
  ${groundCard(c)}
  <div class="card"><h3>Jugendakademie</h3>${fac.map(([k, n, d]) => { const cost = E.facilityCost(S(), c, k); return `<div style="margin-bottom:12px"><div class="row" style="justify-content:space-between"><b>${n}</b><span class="muted">Stufe ${h.fac[k]}/10</span></div>
    <div class="bar" style="margin:5px 0"><i style="width:${h.fac[k] * 10}%"></i></div><div class="small muted">${d}</div>
    <div style="margin-top:5px">${cost == null ? '<span class="pill ok">Maximal</span>' : btn(`Ausbauen für ${eur(cost)}`, "facility", { kind: k }, "btn sm", cost > h.cash ? "disabled" : "")}</div></div>`; }).join("")}
    <p class="small muted">Unterhalt pro Saison: ${eur((h.facInvest || 0) * 0.08)} · Jugendabteilung: ${eur(E.youthCost(S(), c))} pro Saison</p></div>
  <div class="card"><h3>Sponsoring & Werbung</h3>${h.sponsor ? `<div class="kv"><label>Hauptsponsor</label><b>${esc(h.sponsor.name)}</b><label>Grundbetrag</label><span>${eur(h.sponsor.base)} / Saison</span><label>Siegprämie</label><span>${eur(h.sponsor.win)} je Ligasieg</span></div>`
    : `<p class="muted small">Noch kein Vertrag – bis dahin zahlen nur Kleinsponsoren (35 % des Ligaüblichen).</p>
    <div class="scroll"><table><thead><tr><th>Angebot</th><th>Typ</th><th class="r">Grundbetrag</th><th class="r">Siegprämie</th><th></th></tr></thead><tbody>
    ${h.offers.map((o) => `<tr><td>${esc(o.name)}</td><td>${o.typ}</td><td class="r">${eur(o.base)}</td><td class="r">${eur(o.win)}</td><td>${btn("Unterschreiben", "sponsor", { id: o.id }, "btn sm pri")}</td></tr>`).join("")}</tbody></table></div>`}
    <h3 style="margin-top:16px">Eintrittspreise</h3><div class="row"><select data-act="ticket" data-key="factor">${Array.from({ length: 31 }, (_, i) => Math.round((0.5 + i * 0.05) * 100) / 100).map((f) => `<option value="${f}" ${Math.abs(f - ticketF) < 0.01 ? "selected" : ""}>${Math.round(f * 100)} % – ${(E.LV[L].price * f).toFixed(2)} €</option>`).join("")}</select>
    <span class="small muted">Höhere Preise bringen mehr pro Fan, aber weniger Zuschauer – und weniger Umsatz am Catering.</span></div>
    ${kasseTip(c)}${E.sl(h, "kasse") ? `<label class="small" style="display:flex;gap:8px;align-items:center"><input style="flex:none" type="checkbox" data-act="ticketAuto" ${h.ticketAuto ? "checked" : ""}> Kassenwart legt die Preise fest${h.ticketAuto ? " (aktiv – eine manuelle Änderung beendet das)" : ""}</label>` : ""}</div>
  <div class="card"><h3>Catering</h3>${venueList("catering", E.CATERING, h.cat ?? 2, (i) => `+${E.CAT_EUR[i].toFixed(2).replace(".", ",")} € je Zuschauer · Betrieb ${eur(E.CAT_UPKEEP[i])}/Saison${i > (h.cat ?? 2) ? ` · Ausbau ${eur(E.CAT_BUILD.slice((h.cat ?? 2) + 1, i + 1).reduce((a, b) => a + b, 0))}` : ""}`)}
    <p class="small muted">Besseres Catering bringt mehr Umsatz je Zuschauer und lockt ein paar Fans mehr an – lohnt sich aber erst, wenn genug Leute kommen. Abbauen kostet nichts.</p></div>
  <div class="card"><h3>Security</h3>${venueList("security", E.SECURITY, h.sec ?? 1, (i) => `${eur(E.SEC_COST[i])}/Saison · bis ${E.SEC_CAP[i] === Infinity ? "unbegrenzt" : E.SEC_CAP[i].toLocaleString("de-DE")} Zuschauer · Lizenz bis ${secLicense(i)}`)}
    <p class="small muted">Für jede Spielklasse gilt eine Mindeststufe (Lizenz). Fehlt sie, bleibt der Verein trotz Meisterschaft in seiner Liga. Kommen mehr Zuschauer als der Dienst betreuen kann, verhängt der Verband Ordnungsstrafen.
    Aktuell nötig: Stufe ${E.SEC_REQ[L]} · für den Aufstieg${L > 1 ? ` in die ${esc(E.LV[L - 1].name)}: Stufe ${E.SEC_REQ[L - 1]}` : ": –"}.</p></div>
  <div class="card"><h3>Weitere Mannschaften</h3><p class="small muted">Zweit- und Drittmannschaften werden nicht verwaltet, nur ihre Kosten fließen in den Jahresabschluss. Neue Mannschaften starten zur nächsten Saison${t.kreis ? " in der untersten Spielklasse" : " außerhalb der simulierten Ligen"}.</p>
    <div class="scroll"><table><thead><tr><th>Team</th><th>Status</th><th class="r">Kosten/Saison</th><th></th></tr></thead><tbody>${reserves}
    <tr><td>Jugendteams</td><td class="small">abhängig von der Jugendakademie</td><td class="r">${eur(E.youthCost(S(), c))}</td><td></td></tr></tbody></table></div></div>
  <div class="card"><h3>Eigentum</h3>${u.role === "Investor" ? `<p>${u.investor ? esc(u.investor.title) + " · " : ""}Privatvermögen: <b>${eur(u.wallet)}</b></p><div class="row"><input id="dep" type="number" min="1000" step="1000" placeholder="Betrag in €" style="width:160px">${btn("Ins Vereinskonto einlegen", "deposit", {}, "btn")}</div>` : `<p class="muted">Gründer – Vereinskonto ist dein Budget.</p>`}
    <div style="margin-top:14px">${btn("Verein abgeben", "leave", {}, "btn danger", `data-confirm="${esc(c.name)} wirklich abgeben? Der Verein wird wieder vom Computer geführt."`)}</div></div>
  </div>`;
}

function secLicense(i) { const lv = Object.keys(E.SEC_REQ).map(Number).filter((L) => L <= 11 && E.SEC_REQ[L] <= i); return lv.length ? E.LV[Math.min(...lv)].name : "–"; }
function venueList(act, list, cur, info) {
  return list.map(([n, d], i) => `<div style="display:flex;gap:10px;align-items:flex-start;padding:6px 0;border-top:1px solid var(--line)${i === cur ? ";background:var(--accent-soft)" : ""}">
    <div style="flex:1"><b>${i}. ${esc(n)}</b>${i === cur ? ' <span class="pill">aktuell</span>' : ""}<div class="small">${esc(d)}</div><div class="small muted">${info(i)}</div></div>
    <div>${i === cur ? "" : btn(i > cur ? "Wählen" : "Wechseln", act, { lvl: i }, "btn sm", `data-confirm="${esc(n)} wählen?"`)}</div></div>`).join("");
}
function groundCard(c) {
  const h = c.h, g = h.ground; if (!g) return "";
  const t = E.firstTeam(S(), c), L = Math.min(t.level, 11), sub = E.subsidy(S(), c);
  const costP = (type, f = 1) => eur(E.PITCH[type].cost * f * (1 - sub));
  const pitches = g.pitches.map((p, i) => `<div style="padding:6px 0;border-top:1px solid var(--line)">
    <div><b>${p.main ? "Hauptplatz" : `Platz ${i + 1}`}:</b> ${esc(E.PITCH[p.t].name)}${p.t === "rasen" && E.isWinter(S()) ? ' <span class="pill warn">Wintersperre</span>' : ""}<div class="small muted">${esc(E.PITCH[p.t].desc)}</div></div>
    <div class="row" style="gap:4px;margin-top:4px;flex-wrap:wrap">${Object.keys(E.PITCH).filter((x) => x !== p.t && !(p.main && x === "tenne")).map((x) => btn(`→ ${E.PITCH[x].name.split(" ")[0]} (${costP(x, 0.8)})`, "pitch", { op: "convert", idx: i, type: x }, "btn sm", `data-confirm="${esc(E.PITCH[p.t].name)} zum ${esc(E.PITCH[x].name)} umbauen für ${costP(x, 0.8)}?"`)).join("")}
    ${p.main ? "" : btn("Abreißen", "pitch", { op: "remove", idx: i }, "btn sm danger", 'data-confirm="Platz wirklich abreißen?"')}</div></div>`).join("");
  const add = Object.keys(E.PITCH).map((x) => btn(`+ ${E.PITCH[x].name} (${costP(x)})`, "pitch", { op: "add", type: x }, "btn sm", `data-confirm="${esc(E.PITCH[x].name)} für ${costP(x)} bauen?"`)).join(" ");
  const yt = E.youthTeams(h), want = 2 + (h.fac?.jugend || 0);
  const tq = E.trainingCapacity(S(), h);
  const lic = (Lx) => { if (Lx < 1) return ""; const iss = E.licenseIssues(S(), c, Lx); return `<tr><td>${esc(E.LV[Lx].name)}</td><td class="small">${E.STADIUM_REQ[Lx] ? `${E.STADIUM_REQ[Lx].cap.toLocaleString("de-DE")} Plätze · ${E.STADIUM_REQ[Lx].sitz.toLocaleString("de-DE")} Sitz · ${esc(E.LIGHT[E.STADIUM_REQ[Lx].light][0])}` : "keine Stadionauflagen"} · Security ${E.SEC_REQ[Lx]}</td><td>${iss.length ? `<span class="crit small">fehlt: ${esc(iss.join(", "))}</span>` : '<span class="pill ok">erfüllt</span>'}</td></tr>`; };
  const stand = (k) => `<div class="row" style="justify-content:space-between;padding:6px 0;border-top:1px solid var(--line)"><span><b>${E.STAND[k].name}:</b> ${g[k].toLocaleString("de-DE")}</span><span class="row" style="gap:4px">
    ${btn(`+${E.STAND[k].block} (${eur(E.STAND[k].block * E.STAND[k].perSeat)})`, "stand", { kind: k, blocks: 1 }, "btn sm")} ${btn(`+${E.STAND[k].block * 4} (${eur(E.STAND[k].block * 4 * E.STAND[k].perSeat)})`, "stand", { kind: k, blocks: 4 }, "btn sm")} ${btn(`−${E.STAND[k].block}`, "stand", { kind: k, blocks: -1 }, "btn sm", 'data-confirm="Plätze zurückbauen? Es gibt kein Geld zurück."')}</span></div>`;
  return `<div class="card" style="grid-column:1/-1"><h3>Vereinsgelände & Stadion</h3>
    <div class="grid g2" style="gap:16px">
    <div><b>Plätze</b>${pitches}<div style="margin-top:8px;display:flex;flex-wrap:wrap;gap:4px">${add}</div>
      <p class="small muted" style="margin-top:8px">${sub ? "Im Amateurbereich übernehmen Kommune und Landessportbund 50 % der Baukosten. " : ""}Pro Platz können etwa drei Mannschaften trainieren und am Wochenende spielen. Rasenplätze sind von November bis Februar gesperrt.</p>
      <div class="kv"><label>Mannschaften</label><span>${E.seniorTeams(h)} Herren · ${yt} Jugend${yt < want ? ` <span class="warn small">(Akademie möchte ${want} – zu wenig Plätze)</span>` : ""}</span>
      <label>Trainingsbetrieb</label><span>${Math.round(tq * 100)} %${E.isWinter(S()) ? " (Winter)" : ""} ${tq < 0.8 ? '<span class="warn small">– zu wenig Platz, Spieler entwickeln sich langsamer</span>' : ""}</span>
      <label>Unterhalt</label><span>${eur(E.groundUpkeep(S(), c))} / Saison</span></div></div>
    <div><b>Stadion</b> <span class="muted small">Kapazität ${E.capacity(h).toLocaleString("de-DE")} · ${Math.round(E.sitzShare(h) * 100)} % Sitzplätze (bringen 80 % mehr Eintritt)</span>${stand("steh")}${stand("sitz")}
      <div style="margin-top:10px"><b>Flutlicht</b>${venueList("light", E.LIGHT, g.light, (i) => `Bau ${eur(E.LIGHT_COST[i] * (1 - sub))} · Unterhalt ${eur(E.LIGHT_UPKEEP[i])}/Saison`)}</div></div>
    </div>
    <h3 style="margin-top:14px">Lizenz-Check</h3><div class="scroll"><table><thead><tr><th>Spielklasse</th><th>Anforderungen</th><th>Status</th></tr></thead><tbody>${lic(L)}${L > 1 ? lic(L - 1) : ""}</tbody></table></div>
    <p class="small muted">Erfüllt der Verein die Anforderungen der höheren Liga nicht, bleibt er trotz Aufstiegsplatz in seiner Liga.</p></div>`;
}
// ------------------------------------------------------------ Finanzen
function vFinanzen() {
  const c = myClub(), h = c.h;
  const sum = (o) => Object.values(o).reduce((a, b) => a + b, 0);
  const list = (o) => Object.entries(o).sort((a, b) => b[1] - a[1]).map(([k, v]) => `<tr><td>${esc(k)}</td><td class="r">${eur(v)}</td></tr>`).join("") || '<tr><td class="muted">–</td><td></td></tr>';
  const tin = sum(h.ledger.in), tout = sum(h.ledger.out);
  const L = Math.min(E.firstTeam(S(), c).level, 11);
  return `<h2>Finanzen</h2><p class="sub">Laufende Saison bis heute · Kontostand <b>${eur(h.cash)}</b></p>
  <div class="grid g2"><div class="card"><h3>Einnahmen</h3><table><tbody>${list(h.ledger.in)}<tr><td><b>Summe</b></td><td class="r"><b>${eur(tin)}</b></td></tr></tbody></table></div>
  <div class="card"><h3>Ausgaben</h3><table><tbody>${list(h.ledger.out)}<tr><td><b>Summe</b></td><td class="r"><b>${eur(tout)}</b></td></tr></tbody></table></div></div>
  <div class="card" style="margin-top:14px"><h3>Ergebnis laufende Saison: <span class="${tin - tout >= 0 ? "ok" : "crit"}">${eur(tin - tout)}</span></h3>
    ${E.LV[L].tv ? `<p class="small">TV-Gelder: Faktor <b>${(h.tvFactor || 1).toFixed(2)}</b> aus der Fünfjahreswertung (Platzierungen der letzten Spielzeiten, die jüngste zählt am meisten).</p>` : ""}
    ${L <= 4 ? `<p class="small">Lizenzierung: Zum Saisonende muss das Konto im Plus sein, sonst gibt es ${L <= 3 ? 6 : 3} Punkte Abzug.${h.penaltyShown ? ` <span class="crit">Diese Saison: ${h.penaltyShown} Punkte Abzug.</span>` : ""}</p>` : ""}
    ${L <= 2 ? '<p class="small">Financial Fair Play (Europapokal): Gehälter, Prämien und Ablösen über 75 % der Einnahmen kosten eine Geldstrafe, über 90 % den Startplatz.</p>' : ""}</div>
  <div class="grid g2" style="margin-top:14px">
  <div class="card"><h3>Verträge</h3>${Object.entries(E.DEAL_NAMES).map(([k, n]) => { const d = h.deals?.[k]; const offers = h.dealOffers?.[k] || [];
    return `<div style="padding:6px 0;border-top:1px solid var(--line)"><b>${n}</b>${d ? `<div class="small">${esc(d.name)} · ${d.base ? eur(d.base) + " / Saison" : "variabel"}${d.share ? ` · ${Math.round(d.share * 100)} % vom Fanshop-Umsatz` : ""} · bis Saison ${d.until}</div>` : offers.length ? offers.map((o) => `<div class="row" style="justify-content:space-between;gap:6px"><span class="small">${esc(o.name)} · ${o.years} J. · ${o.base ? eur(o.base) + "/Saison" : "kein Fixum"}${o.share ? ` + ${Math.round(o.share * 100)} % Umsatz` : ""}${o.cost ? ` · Einkauf ${eur(o.cost)}/Saison` : ""}</span>${btn("Unterschreiben", "deal", { slot: k, id: o.id }, "btn sm")}</div>`).join("") : '<div class="small muted">Neue Angebote zur nächsten Saison.</div>'}</div>`; }).join("")}
    <p class="small muted">Merchandising: Eigenvertrieb bringt den vollen Fanshop-Umsatz je Heimspiel (abzüglich Einkauf), ein Lizenzpartner zahlt einen sicheren Festbetrag.</p></div>
  <div class="card"><h3>Kredite</h3>${(h.credits || []).map((k) => `<div class="row" style="justify-content:space-between;padding:4px 0;border-top:1px solid var(--line)"><span class="small">${eur(k.amount)} seit Saison ${k.since} · ${(k.rate * 100).toFixed(1)} % · Rate ${eur(k.annuity)}/Saison · Rest <b>${eur(k.rest)}</b></span>${btn("Ablösen", "repay", { id: k.id }, "btn sm", `data-confirm="Restschuld ${eur(k.rest)} sofort zahlen?"`)}</div>`).join("") || '<p class="small muted">Keine Kredite.</p>'}
    <div class="row" style="margin-top:8px;gap:6px"><input id="crAmt" type="number" min="1000" step="1000" placeholder="Betrag" style="width:130px"><select id="crYrs">${[1, 2, 3, 4, 5].map((y) => `<option value="${y}" ${y === 3 ? "selected" : ""}>${y} Jahre</option>`).join("")}</select>${btn("Kredit aufnehmen", "credit", {}, "btn sm")}</div>
    <p class="small muted">Kreditrahmen: ${eur(E.creditLimit(S(), c))} · Zinssatz ${(E.creditRate(S(), c) * 100).toFixed(1)} % (teurer, wenn das Konto im Minus ist). Zins und Tilgung werden täglich abgebucht.</p></div></div>
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
  if (app.sel.myLeague) { app.sel.myLeague = ""; app.sel.league = myLg; app.sel.ligSeason = "0"; }
  if (app.sel.friendLeague) { app.sel.league = app.sel.friendLeague; app.sel.ligSeason = "0"; app.sel.friendLeague = ""; }
  const season = Number(app.sel.ligSeason || 0); // 0 = laufende Saison
  const arch = season ? S().archive.find((x) => x.season === season) : null;
  const leagueSrc = arch ? Object.entries(arch.leagues).map(([id, l]) => ({ id, name: l.name, level: l.level })) : [...S().leagues.values()].filter((l) => l.teams.length);
  const sel = app.sel.league && leagueSrc.find((l) => l.id === app.sel.league) ? app.sel.league : (leagueSrc.find((l) => l.id === myLg)?.id || "bl");
  const levels = [...new Set(leagueSrc.map((l) => l.level))].sort((a, b) => a - b);
  const opts = levels.map((L) => `<optgroup label="Liga ${L} – ${LVLNAME(L)}">${leagueSrc.filter((l) => l.level === L).map((l) => `<option value="${l.id}" ${l.id === sel ? "selected" : ""}>${esc(l.name)}</option>`).join("")}</optgroup>`).join("");
  const seasonOpts = `<option value="0">Saison ${S().season} (laufend)</option>` + S().archive.slice().reverse().map((x) => `<option value="${x.season}" ${x.season === season ? "selected" : ""}>Saison ${x.season} (Abschluss)</option>`).join("");
  const others = new Map(Object.entries(app.members || {}).filter(([id]) => id !== app.me).map(([id, n]) => [id, { name: n }]));
  for (const u of S().users.values()) if (u.id !== app.me) others.set(u.id, { name: (app.members || {})[u.id] || u.name, u });
  const friends = [...others.values()].map(({ name, u }) => { const fc = u?.clubId ? S().clubs.get(u.clubId) : null; const ft = fc && E.firstTeam(S(), fc); const fl = ft?.league ? S().leagues.get(ft.league) : null; return { name, club: fc?.name || "", lg: fl }; }).sort((x, y) => (x.lg?.level ?? 99) - (y.lg?.level ?? 99) || x.name.localeCompare(y.name));
  const friendSel = `<select data-sel="friendLeague" title="Liga eines Mitspielers anzeigen"><option value="" selected>👥 Freunde …</option>${friends.map((f) => `<option value="${f.lg ? f.lg.id : ""}" ${f.lg ? "" : "disabled"}>${esc(f.name)}${f.club ? " – " + esc(f.club) : ""} (${f.lg ? esc(f.lg.name) : f.club ? "wartet auf Saisonstart" : "noch kein Verein"})</option>`).join("") || '<option disabled>Noch keine Mitspieler</option>'}</select>`;
  const head = `<div class="row" style="justify-content:space-between;margin-bottom:10px"><h2>${esc(leagueSrc.find((l) => l.id === sel)?.name || "")}</h2><div class="row">${myLg && (sel !== myLg || season) ? `<button class="btn sm pri" data-sel="myLeague" data-v="1">⌂ Meine Liga</button>` : ""}<select data-sel="ligSeason">${seasonOpts}</select><select data-sel="league">${opts}</select>${friendSel}</div></div>`;
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




// ------------------------------------------------------------ Liveticker (18:00 – ca. 19:50)
const LIVE_LEN = 112 * 60000;
function liveMinute() {
  const e = (Date.now() - app.live.ko) / 60000;
  if (e < 45) return { m: Math.floor(e) + 1, label: `LIVE ${Math.floor(e) + 1}'` };
  if (e < 60) return { m: 45, label: "Halbzeit" };
  if (e < 105) return { m: 46 + Math.floor(e - 60), label: `LIVE ${46 + Math.floor(e - 60)}'` };
  return { m: 90, label: "Abpfiff" };
}
const CHANCE_TXT = ["{p} prüft den Torwart – gehalten!", "Distanzschuss von {p}, knapp drüber.", "Pfosten! {p} hat Pech.", "Kopfball nach Ecke – {p} setzt ihn vorbei.", "{p} frei vor dem Tor … vergeben!", "Gefährlicher Freistoß von {p}, die Mauer steht.", "{p} zieht ab – Latte!", "Konter über {p}, im letzten Moment geklärt."];
function tickerEvents(m, myTid, names) {
  const st = m.st || { g: [], c: [], s: [0, 0] };
  const tn = [team(m.h)?.name || "", team(m.a)?.name || ""];
  const ev = [{ m: 0, t: "Anpfiff!" }, { m: 45.5, t: "Halbzeit." }, { m: 90.5, t: "Abpfiff!" }];
  const gc = [0, 0];
  for (const g of st.g) { gc[g[1]]++; ev.push({ m: g[0], k: g[1], goal: true, t: `TOR für ${tn[g[1]]}! ${g[2]}${g[4] ? ` (Vorlage ${g[4]})` : ""}` }); }
  for (const c2 of st.c) ev.push({ m: c2[0], k: c2[1], t: `${c2[3] === "Y" ? "🟨 Gelb" : c2[3] === "GR" ? "🟨🟥 Gelb-Rot" : "🟥 Rot"} für ${c2[2] || tn[c2[1]]}` });
  for (let k = 0; k < 2; k++) {
    const n = Math.max(0, (st.s?.[k] || 0) - gc[k]);
    for (let i = 0; i < n; i++) {
      const hsh = E.hash32(`${m.h}:${m.a}:${k}:${i}`) >>> 0;
      const pl = (k === (m.h === myTid ? 0 : 1) && names.length) ? names[hsh % names.length] : tn[k];
      ev.push({ m: 1 + (hsh % 90), k, t: CHANCE_TXT[(hsh >>> 5) % CHANCE_TXT.length].replace("{p}", pl) });
    }
  }
  return ev.sort((a, b) => a.m - b.m);
}
function liveCard() {
  if (!app.live) return "";
  const c = app.Slive && [...app.Slive.clubs.values()].find((x) => x.owner === app.me && x.h);
  const SL = app.Slive; const D = app.live.day, di = E.dayInfo(D).day;
  const mi = liveMinute();
  if (!c) return `<div id="liveticker"></div>`;
  const t = SL.teams.get(c.teams[0]);
  const games = [];
  const lg = t.league ? SL.leagues.get(t.league) : null;
  const lm = lg?.fixtures?.[di]?.find((m) => m.h === t.id || m.a === t.id); if (lm) games.push([lg.name, lm]);
  for (const cup of SL.cups) for (const rd of cup.rounds) if (rd && rd.day === di) { const m = rd.matches.find((x) => x.h === t.id || x.a === t.id); if (m) games.push([cup.name, m]); }
  for (const C of Object.values(SL.euro?.comps || {})) { const lp = C.lp.find((x) => x.day === di); const m = lp?.matches.find((x) => x.h === t.id || x.a === t.id); if (m) games.push([C.name, m]); }
  const score = (m) => { const g = (m.st?.g || []).filter((x) => x[0] <= mi.m); return `${g.filter((x) => x[1] === 0).length}:${g.filter((x) => x[1] === 1).length}`; };
  const blocks = games.map(([comp, m]) => {
    const rep = c.h.reports.find((r) => r.season === SL.season && r.day === di && r.comp === comp);
    const names = (rep?.grades || []).filter((g) => g[1] !== "TW").map((g) => g[0]);
    const ev = tickerEvents(m, t.id, names).filter((e) => e.m <= mi.m + (mi.label === "Abpfiff" ? 1 : 0)).reverse();
    return `<div style="margin-top:8px"><div class="lvl">${esc(comp)}</div><div class="match" style="margin:6px 0"><div class="t">${esc(team(m.h)?.name || SL.teams.get(m.h)?.name || "")}</div><div class="score">${score(m)}</div><div class="t">${esc(team(m.a)?.name || SL.teams.get(m.a)?.name || "")}</div></div>
      <div class="small" style="max-height:220px;overflow:auto">${ev.map((e) => `<div style="padding:2px 0;${e.goal ? "font-weight:700" : ""}"><span class="muted">${e.m >= 90.5 ? "90'" : e.m === 45.5 ? "45'" : e.m ? Math.floor(e.m) + "'" : ""}</span> ${esc(e.t)}</div>`).join("")}</div></div>`;
  }).join("");
  const conf = lg ? (lg.fixtures[di] || []).filter((m) => m !== lm).map((m) => `<div class="row small" style="justify-content:space-between"><span>${esc(SL.teams.get(m.h).name)} – ${esc(SL.teams.get(m.a).name)}</span><b>${score(m)}</b></div>`).join("") : "";
  return `<div class="card" id="liveticker" style="margin-bottom:14px;border-color:#d40000"><div class="row" style="justify-content:space-between"><h3><span style="color:#d40000">●</span> Liveticker</h3><b>${mi.label}</b></div>
    ${blocks || '<p class="small muted">Heute kein Spiel für deine Mannschaft.</p>'}
    ${conf ? `<details style="margin-top:8px"><summary class="small">Konferenz ${esc(lg.name)}</summary>${conf}</details>` : ""}
    <p class="small muted" style="margin-top:6px">Die Tabellen zeigen bis zum Abpfiff den Stand vor dem Spieltag.</p></div>`;
}

// ------------------------------------------------------------ Schlagzeilen (je Liga: Dorfblatt … Boulevard)
const PAPERS = [
  ["Der Gemeindebote", "Mitteilungsblatt mit Sportecke"], ["Kreis-Anzeiger", "Lokalteil Sport"], ["Bezirksrundschau", "Regionalsport"],
  ["Fußball-Echo", "Das Magazin für den Fußball im Norden"], ["BLITZ", "Deutschlands lauteste Sportseite"],
];
const PAPER_TIER = { 1: 4, 2: 4, 3: 3, 4: 3, 5: 2, 6: 2, 7: 1, 8: 1, 9: 0, 10: 0, 11: 0 };
const HL = {
  bigwin: [
    ["{team} gewinnt deutlich mit {score} gegen {opp}", "Klarer Sieg für {team}: {score} gegen {opp}", "{team} feiert {score}-Erfolg – {scorer} trifft"],
    ["Torfestival: {team} fegt {opp} mit {score} vom Platz", "{team} in Torlaune – {opp} chancenlos", "{scorer} und Co. schießen {opp} ab"],
    ["{team} zerlegt {opp} – {score}!", "Machtdemonstration: {team} überrollt {opp}", "{opp} erlebt beim {score} sein blaues Wunder"],
    ["Gala! {team} demontiert {opp} mit {score}", "{scorer} im Rausch – {team} spielt {opp} schwindelig", "Fußballfest: {team} lässt {opp} keine Luft zum Atmen"],
    ["WAHNSINN! {TEAM} ZERLEGT {OPP} {score}!", "{SCORER}-GALA! DIE FANS TANZEN AUF DEN SITZEN!", "{OPP} WIRD GEDEMÜTIGT – {score}! MUSS DORT JETZT DER TRAINER ZITTERN?"],
  ],
  win: [
    ["{team} gewinnt {score} gegen {opp}", "Drei Punkte für {team}", "{team} setzt sich mit {score} durch"],
    ["{scorer} schießt {team} zum Sieg", "{team} bleibt in der Spur", "Arbeitssieg für {team} gegen {opp}"],
    ["{team} siegt verdient – {opp} findet kein Mittel", "{scorer} entscheidet die Partie", "Wichtiger Dreier für {team}"],
    ["{scorer} – der Mann der Stunde bei {team}", "{team} bleibt eiskalt: {score} gegen {opp}", "Sieg mit Ansage: {team} liefert"],
    ["{SCORER} KNIPST {TEAM} ZUM SIEG!", "SIEG-RAUSCH! {TEAM} WILL MEHR!", "{TEAM} GEWINNT – UND DIE KONKURRENZ ZITTERT!"],
  ],
  draw: [
    ["{team} und {opp} trennen sich {score}", "Punkteteilung zwischen {team} und {opp}", "Unentschieden für {team}"],
    ["Remis mit Luft nach oben für {team}", "{team} kommt über ein {score} nicht hinaus", "Gerechtes Unentschieden gegen {opp}"],
    ["{team} verpasst den Sieg – nur {score} gegen {opp}", "Zu wenig Ideen: {team} spielt {score}", "Ein Punkt, mehr nicht"],
    ["Schlaftablette! {team} und {opp} langweilen beim {score}", "{team} tritt auf der Stelle", "Remis-Frust bei {team}"],
    ["GÄHN! {TEAM} SCHLÄFERT DAS STADION EIN!", "REMIS-FRUST! WO IST DER BISS, {TEAM}?", "{score}! FANS FORDERN: AUFWACHEN!"],
  ],
  loss: [
    ["{team} unterliegt {opp} mit {score}", "Niederlage für {team} – Trainer: „Wir schauen nach vorn“", "{opp} nimmt die Punkte mit"],
    ["{team} enttäuscht gegen {opp}", "Rückschlag für {team}", "{team} geht leer aus – {score} gegen {opp}"],
    ["Bittere Pleite: {team} patzt gegen {opp}", "{team} ohne Durchschlagskraft", "Fehlerfestival kostet {team} die Punkte"],
    ["Krise bei {team}? {score}-Pleite gegen {opp}", "Ratlos: {team} findet kein Rezept", "{team} enttäuscht auf ganzer Linie"],
    ["PLEITE! {TEAM} BLAMIERT SICH GEGEN {OPP}!", "WAS WAR DAS DENN, {TEAM}?", "FANS STINKSAUER – {TEAM} VERSAGT!"],
  ],
  bigloss: [
    ["Deutliche Niederlage für {team} gegen {opp}", "{team} verliert hoch mit {score}", "Ein Tag zum Vergessen für {team}"],
    ["Debakel für {team}: {score} gegen {opp}", "{team} unter die Räder gekommen", "Abwehr von {team} mit offenen Türen"],
    ["Abwehr im Winterschlaf: {team} kassiert {ga} Gegentore", "Blamage gegen {opp}", "{team} geht sang- und klanglos unter"],
    ["Totalausfall! {team} geht gegen {opp} unter", "{ga} Gegentore – bei {team} brennt der Baum", "Offenbarungseid: {team} wird vorgeführt"],
    ["SCHÄM-PARTIE! {TEAM} GEHT {score} UNTER!", "{ga} GEGENTORE! DIESE ABWEHR IST EIN SCHEUNENTOR!", "TRAINER-BEBEN? {TEAM} WIRD ZERLEGT!"],
  ],
};
const HL_CTX = {
  top: ["{team} ist Tabellenführer", "{team} grüßt von der Spitze", "Spitzenreiter {team} legt vor", "Platz 1! Bei {team} träumen sie vom Aufstieg", "{TEAM} GANZ OBEN – AUFSTIEGS-ALARM!"],
  bottom: ["{team} auf einem Abstiegsplatz", "{team} steckt im Tabellenkeller", "Abstiegssorgen bei {team}", "Abstiegsangst! {team} versinkt im Keller", "KELLER-ALARM! {TEAM} TAUMELT RICHTUNG ABGRUND!"],
  streakL: ["Dritte Niederlage in Folge für {team}", "{team} wartet weiter auf Punkte", "Negativserie hält an: {team} verliert erneut", "Horror-Serie! Bei {team} geht nichts mehr", "PLEITEN-SERIE! WER RETTET {TEAM}?"],
  streakW: ["{team} gewinnt zum dritten Mal in Folge", "{team} mit Siegesserie", "{team} im Lauf – drei Siege am Stück", "Unaufhaltsam! {team} feiert die nächste Gala", "{TEAM} IM SIEGES-RAUSCH – DREI DINGER AM STÜCK!"],
  hattrick: ["Drei Tore von {scorer}", "{scorer} trifft dreifach", "Hattrick! {scorer} glänzt", "{scorer} schnürt den Dreierpack – ein Spieler in Topform", "{SCORER} DREI MAL! DIESER MANN IST NICHT ZU STOPPEN!"],
  red: ["Platzverweis für {red}", "{red} sieht Rot", "Rote Karte gegen {red} schwächt {team}", "Rot-Sünder {red} lässt {team} im Stich", "{RED} DREHT DURCH – ROT! TEAM IM STICH GELASSEN!"],
};
function hlFill(tpl, v) { return tpl.replace(/\{(\w+)\}/g, (_, k) => { const lo = k.toLowerCase(); const val = v[lo] ?? ""; return k === k.toUpperCase() && k.length > 1 ? String(val).toUpperCase() : val; }); }
function hlPick(arr, seed) { return arr[(E.hash32(seed) >>> 0) % arr.length]; }
function matchFacts(m, tid) {
  const k = m.h === tid ? 0 : 1, gf = k ? m.ga : m.gh, ga = k ? m.gh : m.ga;
  const goals = (m.st?.g || []).filter((g) => g[1] === k && g[3]); const cnt = {}; for (const g of goals) cnt[g[2]] = (cnt[g[2]] || 0) + 1;
  const top = Object.entries(cnt).sort((a, b) => b[1] - a[1])[0];
  const red = (m.st?.c || []).find((c2) => c2[1] === k && c2[3] !== "Y" && c2[2]);
  return { gf, ga, opp: team(k ? m.h : m.a)?.name || "?", scorer: top ? top[0] : null, scorerN: top ? top[1] : 0, red: red?.[2] || null, score: `${gf}:${ga}` };
}
function headlineFor(tier, t, m, comp, seed, needTeam = false) {
  const f = matchFacts(m, t.id);
  const d = f.gf - f.ga, kind = d >= 3 ? "bigwin" : d > 0 ? "win" : d === 0 ? "draw" : d <= -3 ? "bigloss" : "loss";
  let pool = HL[kind][tier];
  if (!f.scorer) pool = pool.filter((x) => !/\{scorer\}|\{SCORER\}/.test(x));
  if (needTeam) pool = pool.filter((x) => /\{team\}|\{TEAM\}/.test(x));
  const v = { team: t.name, opp: f.opp, score: f.score, scorer: f.scorer || "", ga: f.ga, red: f.red || "" };
  const main = hlFill(hlPick(pool.length ? pool : HL[kind][tier].slice(0, 1), seed), v);
  const extra = [];
  if (f.scorerN >= 3) extra.push(hlFill(HL_CTX.hattrick[tier], v));
  if (f.red && tier >= 2) extra.push(hlFill(HL_CTX.red[tier], v));
  return { main: (comp ? (tier === 4 ? comp.toUpperCase() + ": " : comp + ": ") : "") + main, kind, extra };
}
function headlinesCard(c) {
  const t = E.firstTeam(S(), c); if (t.status !== "active") return "";
  const L = Math.min(t.level, 11), tier = PAPER_TIER[L], [paper, sub] = PAPERS[tier];
  const day = S().day; if (!day || day > 34) return "";
  const items = [];
  const lm = fixtureFor(t, day); if (lm?.gh != null) { const h = headlineFor(tier, t, lm, null, `${t.id}:${S().season}:${day}:l`); items.push([h.main, true]); h.extra.forEach((x) => items.push([x, false])); }
  const cm = cupMatchFor(t, day); if (cm?.m.gh != null) { const h = headlineFor(tier, t, cm.m, cm.cup.name, `${t.id}:${S().season}:${day}:c`); items.push([h.main, true]); }
  const em = euroMatchFor(t, day); if (em?.m.gh != null) { const h = headlineFor(Math.max(tier, 3), t, em.m, em.C.short, `${t.id}:${S().season}:${day}:e`); items.push([h.main, true]); }
  // Tabellenlage und Serien
  const lg = lgOf(t), pos = posOf(t), n = lg?.teams.length || 18, v = { team: t.name };
  const last3 = [day, day - 1, day - 2].map((d) => fixtureFor(t, d)).filter((m) => m?.gh != null).map((m) => { const f = matchFacts(m, t.id); return Math.sign(f.gf - f.ga); });
  if (last3.length === 3 && last3.every((x) => x < 0)) items.push([hlFill(HL_CTX.streakL[tier], v), false]);
  else if (last3.length === 3 && last3.every((x) => x > 0)) items.push([hlFill(HL_CTX.streakW[tier], v), false]);
  if (pos === 1 && day >= 3) items.push([hlFill(HL_CTX.top[tier], v), false]);
  else if (pos && pos > n - 2 && day >= 3) items.push([hlFill(HL_CTX.bottom[tier], v), false]);
  // Rest der Liga: höchster Sieg des Spieltags
  const fx = (lg?.fixtures?.[day] || []).filter((m) => m.gh != null && m.h !== t.id && m.a !== t.id).sort((a, b) => Math.abs(b.gh - b.ga) - Math.abs(a.gh - a.ga));
  if (fx[0] && Math.abs(fx[0].gh - fx[0].ga) >= 2) { const m = fx[0], w = m.gh > m.ga ? team(m.h) : team(m.a); const h = headlineFor(tier, w, m, null, `${m.h}:${m.a}:${day}`, true); items.push([h.main, false]); }
  if (!items.length) return "";
  const style = tier === 4 ? "font-family:'Barlow Condensed',sans-serif;font-weight:800;letter-spacing:.2px" : "";
  return `<div class="card" style="margin-top:14px${tier === 4 ? ";border-top:4px solid #d40000" : ""}"><div class="row" style="justify-content:space-between"><h3 style="${tier === 4 ? "color:#d40000;font-style:italic" : ""}">${paper}</h3><span class="small muted">${sub} · Spieltag ${day}</span></div>
    ${items.map(([x, big]) => `<div style="${style}${big ? ";font-size:" + (tier === 4 ? "20px" : "16px") + ";font-weight:" + (tier >= 3 ? 800 : 600) : ";font-size:14px"};padding:4px 0;border-top:1px solid var(--line)">${esc(x)}</div>`).join("")}</div>`;
}

// ------------------------------------------------------------ Europapokal
function euroMatchFor(t, day) {
  const E2 = S().euro; if (!E2) return null;
  for (const C of Object.values(E2.comps)) {
    const lp = C.lp.find((x) => x.day === day);
    const mm = lp?.matches.find((x) => x.h === t.id || x.a === t.id);
    if (mm) return { C, m: mm, stage: `Ligaphase ${C.lp.indexOf(lp) + 1}. Spieltag` };
    for (const rd of C.ko) {
      const leg = rd.days.indexOf(day); if (leg < 0) continue;
      const tie = rd.ties.find((x) => x.a === t.id || x.b === t.id); if (!tie) continue;
      const fin = rd.days.length === 1;
      const [h, a] = fin ? [tie.a, tie.b] : leg === 0 ? [tie.b, tie.a] : [tie.a, tie.b];
      return { C, m: tie.legs[leg] || { h, a, gh: null, ga: null }, stage: rd.name + (fin ? "" : leg === 0 ? " Hinspiel" : " Rückspiel") };
    }
  }
  return null;
}
const ccOf = (id) => team(id)?.cc || "Ger";
const CC3 = { Azb: "AZE", Bls: "BLR", Mac: "MKD", Sma: "SMR", Lat: "LVA", Lit: "LTU", Mon: "MNE", Far: "FRO", Sui: "SUI", Kos: "KOS" };
const flagName = (id) => `${esc(team(id)?.name || "?")} <span class="muted small" title="${esc(E.UEFA_NAMES[ccOf(id)] || "")}">${CC3[ccOf(id)] || ccOf(id).toUpperCase()}</span>`;
function vEuropa() {
  const c = myClub(), mine = new Set(c ? c.teams : []);
  const EU = S().euro;
  if (!EU) return "<h2>Europa</h2><p class='muted'>Noch nicht verfügbar.</p>";
  const comps = Object.values(EU.comps);
  const myComp = comps.find((C) => C.teams.some((id) => mine.has(id)));
  const sel = EU.comps[app.sel.euroComp] ? app.sel.euroComp : (myComp?.id || "cl");
  const C = EU.comps[sel];
  const tab = E.euroTable(C);
  const nd = nextDay();
  const lpIdx = Math.max(0, Math.min(C.lp.length - 1, app.sel.euroMd != null && app.sel.euroMd !== "" ? Number(app.sel.euroMd) : (() => { const i = C.lp.findIndex((x) => x.day >= nd.day); return i < 0 ? C.lp.length - 1 : i; })()));
  const rowCls = (id, i) => [mine.has(id) ? "me" : ccOf(id) === "Ger" ? "hum" : "", i < 8 ? "up" : i >= 24 ? "down" : ""].join(" ");
  const table = `<div class="scroll"><table><thead><tr><th>Pl.</th><th>Verein</th><th class="r">Sp</th><th class="r">S</th><th class="r">U</th><th class="r">N</th><th class="r">Tore</th><th class="r">Diff</th><th class="r">Pkt</th><th class="r">Stärke</th></tr></thead><tbody>
    ${tab.map((r, i) => `<tr class="${rowCls(r.id, i)}"><td>${i + 1}</td><td>${flagName(r.id)}</td><td class="r">${r.p}</td><td class="r">${r.w}</td><td class="r">${r.d}</td><td class="r">${r.l}</td><td class="r">${r.gf}:${r.ga}</td><td class="r">${r.gf - r.ga}</td><td class="r"><b>${r.pts}</b></td><td class="r muted">${st(E.teamStrength(S(), team(r.id)))}</td></tr>`).join("")}</tbody></table></div>
    <p class="small muted">Plätze 1–8: direkt im Achtelfinale · 9–24: K.-o.-Playoffs · 25–36: ausgeschieden. Deutsche Teams hervorgehoben.</p>`;
  const lp = C.lp[lpIdx];
  const score = (m) => m.gh == null ? "–:–" : `${m.gh}:${m.ga}${m.pen ? " i.E." : m.et ? " n.V." : ""}`;
  const mrow = (m) => `<tr class="${mine.has(m.h) || mine.has(m.a) ? "me" : ""}"><td style="text-align:right;width:44%;white-space:normal">${flagName(m.h)}</td><td style="text-align:center;white-space:nowrap"><b>${score(m)}</b></td><td style="width:44%;white-space:normal">${flagName(m.a)}</td></tr>`;
  const md = `<div class="row" style="justify-content:space-between"><h3>Ligaphase · ${lpIdx + 1}. Spieltag <span class="muted small">(Tag ${lp.day})</span></h3><select data-sel="euroMd">${C.lp.map((x, i) => `<option value="${i}" ${i === lpIdx ? "selected" : ""}>${i + 1}. Spieltag</option>`).join("")}</select></div>
    <div class="scroll"><table><tbody>${lp.matches.map(mrow).join("")}</tbody></table></div>`;
  const ko = C.ko.filter((rd) => rd.ties.length).map((rd) => `<div class="card" style="margin-top:12px"><h3>${rd.name} <span class="muted small">(Tag ${rd.days.join(" & ")})</span></h3><div class="scroll"><table><tbody>
    ${rd.ties.map((tie) => { const agg = (id) => tie.legs.reduce((s2, x) => s2 + (x && x.gh != null ? (x.h === id ? x.gh : x.ga) : 0), 0); const played = tie.legs.some((x) => x?.gh != null);
      return `<tr class="${mine.has(tie.a) || mine.has(tie.b) ? "me" : ""}"><td style="text-align:right;width:40%;white-space:normal">${tie.winner === tie.a ? "<b>" : ""}${flagName(tie.a)}${tie.winner === tie.a ? "</b>" : ""}</td><td style="text-align:center;white-space:nowrap"><b>${played ? agg(tie.a) + ":" + agg(tie.b) : "–:–"}</b><div class="small muted">${tie.legs.filter(Boolean).map((x) => `${x.h === tie.a ? x.gh + ":" + x.ga : x.ga + ":" + x.gh}${x.pen ? " i.E." : x.et ? " n.V." : ""}`).join(" / ")}</div></td><td style="width:40%;white-space:normal">${tie.winner === tie.b ? "<b>" : ""}${flagName(tie.b)}${tie.winner === tie.b ? "</b>" : ""}</td></tr>`; }).join("")}</tbody></table></div></div>`).join("");
  const sc = E.topScorers(S(), 15, C.id);
  const scorers = `<div class="scroll"><table><thead><tr><th>#</th><th>Spieler</th><th>Verein</th><th class="r">Tore</th></tr></thead><tbody>${sc.map((x, i) => `<tr class="${mine.has(x.team) ? "me" : ""}"><td>${i + 1}</td><td>${esc(x.name)}</td><td class="small">${flagName(x.team)}</td><td class="r"><b>${x.goals}</b></td></tr>`).join("") || '<tr><td colspan="4" class="muted">Noch keine Tore.</td></tr>'}</tbody></table></div>`;
  const byCc = {}; for (const id of C.teams) byCc[ccOf(id)] = (byCc[ccOf(id)] || 0) + 1;
  const hist = EU.hist.length ? `<div class="scroll"><table><thead><tr><th>Saison</th><th>Champions League</th><th>Europa League</th><th>Conference League</th></tr></thead><tbody>${EU.hist.slice().reverse().map((h) => `<tr><td>${h.season}</td>${["cl", "el", "ecl"].map((k) => `<td class="small">${h[k] ? `<b>${esc(h[k].winner)}</b><div class="muted">Finale gegen ${esc(h[k].runnerUp || "?")}</div>` : "–"}</td>`).join("")}</tr>`).join("")}</tbody></table></div>` : '<p class="muted small">Die ersten Sieger werden in dieser Saison ermittelt.</p>';
  return `<div class="row" style="justify-content:space-between"><h2>${esc(C.name)}</h2>
    <div class="seg">${comps.map((x) => `<button data-sel="euroComp" data-v="${x.id}" aria-pressed="${x.id === sel}">${x.short}${x.teams.some((id) => mine.has(id)) ? " ★" : ""}</button>`).join("")}</div></div>
  <p class="sub">Saison ${S().season} · 36 Teams aus ${Object.keys(byCc).length} Ländern${C.winner ? ` · Sieger: <b>${esc(team(C.winner).name)}</b>` : ""}. Deutsche Starter kommen aus der Bundesliga (1–4 CL, 5 + DFB-Pokalsieger EL, 6 ECL), die übrigen werden jede Saison nach UEFA-Verbandskoeffizient aus allen Klubs der letzten fünf Europapokal-Jahre ausgelost – die stärksten Klubs eines Landes spielen meist Champions League.</p>
  <div class="grid g2"><div class="card">${table}</div><div><div class="card">${md}</div><div class="card" style="margin-top:12px"><h3>Torschützen</h3>${scorers}</div></div></div>
  ${ko}
  <div class="card" style="margin-top:12px"><h3>Teilnehmer nach Land</h3><p class="small">${Object.entries(byCc).sort((a, b) => b[1] - a[1]).map(([cc, n]) => `${esc(E.UEFA_NAMES[cc] || cc)} ${n}`).join(" · ")}</p></div>
  <div class="card" style="margin-top:12px"><h3>Europapokalsieger</h3>${hist}</div>`;
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
  const ev = [...st.g.map((g) => ({ m: g[0], k: g[1], t: "⚽ " + esc(g[2]) + (g[4] ? ` <span class="muted small">(Vorlage ${esc(g[4])})</span>` : "") })), ...st.c.map((c2) => ({ m: c2[0], k: c2[1], t: (c2[3] === "Y" ? "🟨 " : c2[3] === "GR" ? "🟨🟥 " : "🟥 ") + esc(c2[2] || (c2[3] === "Y" ? "Gelbe Karte" : "Platzverweis")) }))].sort((a, b) => a.m - b.m);
  const won = (me ? r.ga > r.gh : r.gh > r.ga), lost = (me ? r.ga < r.gh : r.gh < r.ga);
  return `<div class="card" style="margin-bottom:10px"><div class="row" style="justify-content:space-between"><span class="lvl">${esc(r.comp)} · Saison ${r.season}, Tag ${r.day}</span><span class="pill ${won ? "ok" : lost ? "crit" : ""}">${won ? "Sieg" : lost ? "Niederlage" : "Remis"}</span></div>
    <div class="match" style="margin:6px 0"><div class="t">${esc(r.h)}</div><div class="score">${r.gh}:${r.ga}</div><div class="t">${esc(r.a)}</div></div>
    <table><tbody>${row("Ballbesitz", st.p[0], st.p[1], (x) => x + " %")}${row("Torschüsse", st.s[0], st.s[1])}${row("aufs Tor", st.o[0], st.o[1])}${row("Fouls", st.f[0], st.f[1])}${row("Gelbe Karten", st.y[0], st.y[1])}${row("Rote Karten", st.r[0], st.r[1])}</tbody></table>
    ${ev.length ? `<div class="small" style="margin-top:6px">${ev.map((e) => `<div style="text-align:${e.k ? "right" : "left"}"><span class="muted">${e.m}'</span> ${e.t}</div>`).join("")}</div>` : ""}
    ${r.grades?.length ? `<div class="small" style="margin-top:8px;border-top:1px solid var(--line);padding-top:6px"><b>Noten:</b> ${r.grades.map(([n, pos, g]) => `${esc(n)} (${pos}) <b style="color:${gradeCol(g)}">${String(g).replace(".", ",")}</b>`).join(" · ")}</div>` : ""}</div>`;
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
const CUP_ICON = (t) => (t.kind === "liga" ? "🏆" : t.kind === "europa" ? "🌟" : "🥇");
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
