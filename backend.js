// Datenzugriff: Supabase (Mehrspieler) oder Solo-Modus (nur dieser Browser)
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js?v=202611221226";
import { hash32 } from "./engine.js?v=202611221226";

export const TZ = "Europe/Berlin";
function berlinParts(date) {
  const f = new Intl.DateTimeFormat("de-DE", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false });
  const o = {}; for (const p of f.formatToParts(date)) o[p.type] = p.value;
  return { y: +o.year, m: +o.month, d: +o.day, h: +o.hour % 24, mi: +o.minute };
}
export function berlinToday() { const p = berlinParts(new Date()); return `${p.y}-${String(p.m).padStart(2, "0")}-${String(p.d).padStart(2, "0")}`; }
function addDays(iso, n) { const [y, m, d] = iso.split("-").map(Number); const t = new Date(Date.UTC(y, m - 1, d + n)); return t.toISOString().slice(0, 10); }
// Anpfiff (18:00 deutscher Zeit) von Spieltag d
export function kickoff(startIso, d) {
  const iso = addDays(startIso, d - 1); const [y, m, dd] = iso.split("-").map(Number);
  for (const utcH of [17, 16]) { const t = new Date(Date.UTC(y, m - 1, dd, utcH, 0)); if (berlinParts(t).h === 18) return t; }
  return new Date(Date.UTC(y, m - 1, dd, 17, 0));
}
export function revealedDay(startIso, now = new Date()) {
  const p = berlinParts(now); const today = `${p.y}-${String(p.m).padStart(2, "0")}-${String(p.d).padStart(2, "0")}`;
  const diff = Math.round((Date.parse(today) - Date.parse(startIso)) / 86400000);
  return diff + 1 - (p.h < 18 ? 1 : 0);
}

export const MODE = SUPABASE_URL && SUPABASE_ANON_KEY ? "online" : "solo";

// ------------------------------------------------ Solo
const LS = "fm_solo_v1";
function soloLoad() {
  let s = null; try { s = JSON.parse(localStorage.getItem(LS)); } catch {}
  if (!s) { s = { secret: String(Math.random()).slice(2) + Date.now(), start: berlinToday(), actions: [], name: "Ich", nextId: 1 }; soloSave(s); }
  return s;
}
function soloSave(s) { try { localStorage.setItem(LS, JSON.stringify(s)); } catch {} }

const solo = {
  async init() { this.s = soloLoad(); return { user: { id: "solo" }, member: true }; },
  async info() { return { name: "Solo-Testspiel", start_date: this.s.start, eff_day: Math.max(1, revealedDay(this.s.start) + 1) }; },
  async seeds() {
    const D = revealedDay(this.s.start); const out = [];
    for (let d = 0; d <= D; d++) out.push((hash32(this.s.secret + ":" + d) >>> 0).toString(16).padStart(8, "0") + (hash32(d + ":" + this.s.secret) >>> 0).toString(16).padStart(8, "0"));
    return out;
  },
  async actions() { return this.s.actions; },
  async members() { return { solo: this.s.name }; },
  async submit(type, payload) {
    const eff = Math.max(1, revealedDay(this.s.start) + 1);
    this.s.actions.push({ id: this.s.nextId++, user_id: "solo", type, payload, eff_day: eff }); soloSave(this.s);
  },
  async messages() { return (this.s.msgs || []).slice(-200); },
  async editMessage(id, body) { const m = (this.s.msgs || []).find((x) => x.id === id); if (m) { m.body = body; m.edited_at = new Date().toISOString(); soloSave(this.s); } },
  async deleteMessage(id) { this.s.msgs = (this.s.msgs || []).filter((x) => x.id !== id); soloSave(this.s); },
  async sendMessage(to, body) { this.s.msgs = this.s.msgs || []; this.s.msgs.push({ id: Date.now(), user_id: "solo", to_user: to || null, body, created_at: new Date().toISOString() }); soloSave(this.s); },
  async rename(name) { this.s.name = name; soloSave(this.s); },
  reset() { localStorage.removeItem(LS); },
  // Testhilfe: Start um n Tage vorverlegen (simuliert vergangene Spieltage)
  shift(n) { this.s.start = addDays(this.s.start, -n); soloSave(this.s); },
};

// ------------------------------------------------ Supabase
let sb = null;
const online = {
  async init() {
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data } = await sb.auth.getSession();
    this.user = data.session?.user || null;
    sb.auth.onAuthStateChange((_e, sess) => { this.user = sess?.user || null; });
    let member = false;
    if (this.user) { const { data: m } = await sb.from("members").select("user_id").eq("user_id", this.user.id).maybeSingle(); member = !!m; }
    return { user: this.user, member };
  },
  async signUp(email, password) {
    const { data, error } = await sb.auth.signUp({ email, password }); if (error) throw error;
    if (!data.session) { const r = await sb.auth.signInWithPassword({ email, password }); if (r.error) throw new Error("Konto angelegt. Bitte bestätige zuerst die E-Mail und melde dich dann an."); }
    this.user = data.user; return data;
  },
  async signIn(email, password) { const { data, error } = await sb.auth.signInWithPassword({ email, password }); if (error) throw error; this.user = data.user; return data; },
  async signOut() { await sb.auth.signOut(); this.user = null; },
  async join(code, name) { const { error } = await sb.rpc("join_game", { code, name }); if (error) throw error; },
  async info() { const { data, error } = await sb.rpc("game_info"); if (error) throw error; return data; },
  async seeds() { const { data, error } = await sb.rpc("revealed_seeds"); if (error) throw error; return (data || []).map((x) => (typeof x === "string" ? x : Object.values(x)[0])); },
  async actions() {
    const out = []; let from = 0;
    for (;;) {
      const { data, error } = await sb.from("actions").select("id,user_id,type,payload,eff_day").order("id").range(from, from + 999);
      if (error) throw error; out.push(...data); if (data.length < 1000) break; from += 1000;
    }
    return out;
  },
  async members() { const { data, error } = await sb.from("members").select("user_id,display_name"); if (error) throw error; return Object.fromEntries(data.map((m) => [m.user_id, m.display_name])); },
  async messages() {
    let { data, error } = await sb.from("messages").select("id,user_id,to_user,body,created_at,edited_at").order("id", { ascending: false }).limit(200);
    if (error && /edited_at/.test(error.message || "")) ({ data, error } = await sb.from("messages").select("id,user_id,to_user,body,created_at").order("id", { ascending: false }).limit(200));
    if (error) throw error; return data.reverse();
  },
  async editMessage(id, body) {
    const { data, error } = await sb.from("messages").update({ body }).eq("id", id).select("id");
    if (error) throw error; if (!data?.length) throw new Error("Bearbeiten ist noch nicht freigeschaltet (supabase_chat_edit.sql ausführen).");
  },
  async deleteMessage(id) {
    const { data, error } = await sb.from("messages").delete().eq("id", id).select("id");
    if (error) throw error; if (!data?.length) throw new Error("Löschen ist noch nicht freigeschaltet (supabase_chat_edit.sql ausführen).");
  },
  async sendMessage(to, body) { const { error } = await sb.from("messages").insert({ to_user: to || null, body }); if (error) throw error; },
  async submit(type, payload) { const { error } = await sb.from("actions").insert({ type, payload }); if (error) throw error; },
};

export const backend = MODE === "online" ? online : solo;
