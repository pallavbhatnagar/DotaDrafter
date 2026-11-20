// Data layer: OpenDota fetches with a localStorage cache so the app works offline.
import { NICKNAMES } from './rules.js';

const API = 'https://api.opendota.com/api';
export const CDN = 'https://cdn.cloudflare.steamstatic.com';
const DAY = 864e5;

function readCache(key) {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : null; } catch { return null; }
}
function writeCache(key, data) {
  try { localStorage.setItem(key, JSON.stringify({ t: Date.now(), data })); } catch { /* storage full or blocked */ }
}

/**
 * Fetch JSON with a cache. Returns { data, t, stale }.
 * Fresh cache is used directly; otherwise the network is tried and stale cache is the fallback.
 */
async function cached(key, url, maxAge, shrink = (d) => d) {
  const hit = readCache(key);
  if (hit && Date.now() - hit.t < maxAge) return { data: hit.data, t: hit.t, stale: false };
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = shrink(await res.json());
    writeCache(key, data);
    return { data, t: Date.now(), stale: false };
  } catch (err) {
    if (hit) return { data: hit.data, t: hit.t, stale: true };
    throw err;
  }
}

function shrinkHeroes(raw) {
  return Object.values(raw).map((h) => ({
    id: h.id,
    key: h.name.replace('npc_dota_hero_', ''),
    name: h.localized_name,
    primary_attr: h.primary_attr,
    attack_type: h.attack_type,
    roles: h.roles,
    img: h.img,
    aliases: h.aliases || [],
    stats: { str: [h.base_str, h.str_gain], agi: [h.base_agi, h.agi_gain], int: [h.base_int, h.int_gain] },
    range: h.attack_range, speed: h.move_speed, armor: h.base_armor,
  }));
}

function shrinkItems(raw) {
  const out = {};
  for (const [key, it] of Object.entries(raw)) {
    if (!it || !it.id || key.startsWith('recipe_')) continue;
    const types = (it.abilities || []).map((a) => a.type);
    const desc = (it.abilities || [])
      .map((a) => `${a.title}: ${String(a.description || '').replace(/<[^>]+>/g, '').split('\n')[0]}`)
      .join(' ').slice(0, 320);
    out[key] = {
      id: it.id,
      name: it.dname || key,
      img: it.img,
      cost: it.cost || 0,
      qual: it.qual || '',
      components: it.components || [],
      active: types.includes('active') || types.includes('use'),
      passive: types.includes('passive'),
      desc,
      lore: it.lore || '',
    };
  }
  return out;
}

let heroes = null, items = null, itemsById = null, heroesById = null, aghs = new Map();
export let dataStamp = { t: 0, stale: false };
export let patch = null; // e.g. "7.42"
export let patches = []; // recent major patches: [{ name, date }] newest first

function shrinkAghs(raw) {
  return raw.map((a) => ({
    id: a.hero_id,
    scepter: a.has_scepter ? { desc: a.scepter_desc, skill: a.scepter_skill_name, isNew: !!a.scepter_new_skill } : null,
    shard: a.has_shard ? { desc: a.shard_desc, skill: a.shard_skill_name, isNew: !!a.shard_new_skill } : null,
  }));
}

// ---------- Enemy abilities, tagged by threat ----------
// Lets the app name the exact spell an item answers ("Hits through Blur").
// Read from the game data (~300 KB once, cached 3 days), reduced to { hero: { threat: [names] } }.
const ABILITY_RULES = {
  brk: (a) => a.passive,
  ev: (a) => /\bevasion|\bevade/.test(a.d) && !/true strike|cannot miss|pierc/.test(a.d),
  inv: (a) => /invisib/.test(a.d) && !/reveal|true sight/.test(a.d),
  heal: (a) => /\bheal|regenerat|lifesteal|life steal|restores? (health|hp)/.test(a.d) && !/reduc\w* (heal|regen)/.test(a.d),
  ill: (a) => /illusion/.test(a.d),
  sum: (a) => /\bsummon|\bspawn|\bcreates? (a |an |\d+ )?[\w ]*(unit|spider|wol|golem|treant|zombie|ward|spirit|eidolon|bird|familiar|bear|beetle|serpent)/.test(a.d),
  dis: (a) => a.b.includes('Unit Target') && /\bstun|\bhex|\broot|silenc|disable|\blift|duel|lasso|banish|\bsleep|transform|disarm/.test(a.d),
  sil: (a) => /silenc|\bmute/.test(a.d),
  mag: (a) => a.dt === 'Magical' && !a.passive,
  rc: (a) => /critical|\bbash|attack damage|bonus damage|attack speed/.test(a.d) && (a.passive || a.self),
  esc: (a) => (a.self && /movement speed|move speed/.test(a.d)) || /\bblink|teleport|\bleap|\bjump|\bdash|charges? (forward|toward)|swaps? positions|\bfly|flies|burrow|travels? to/.test(a.d),
  buf: (a) => a.disp === 'Yes' && a.self && /grant|bonus|shield|barrier|increas|regenerat|immun/.test(a.d),
};
let abilityTags = null;
/** Names of the hero's abilities behind a threat, e.g. ('phantom_assassin', 'ev') → ['Blur'] */
export const abilitiesFor = (heroKey, threat) => abilityTags?.[heroKey]?.[threat] || [];
export const abilitiesReady = () => !!abilityTags;
export async function loadAbilities() {
  if (abilityTags) return abilityTags;
  const hit = readCache('dcb:abilities:v1');
  if (hit && Date.now() - hit.t < 3 * DAY) return (abilityTags = hit.data);
  try {
    const [ha, ab] = await Promise.all([
      fetch(API + '/constants/hero_abilities').then((r) => r.json()),
      fetch(API + '/constants/abilities').then((r) => r.json()),
    ]);
    const out = {};
    for (const [name, v] of Object.entries(ha)) {
      const tags = {};
      for (const key of v.abilities || []) {
        const raw = ab[key];
        if (!raw || !raw.dname) continue;
        const b = [].concat(raw.behavior || []);
        if (b.includes('Hidden') && !b.includes('Passive')) continue;
        const a = {
          b, d: String(raw.desc || '').toLowerCase(), dt: raw.dmg_type, disp: raw.dispellable,
          passive: b.includes('Passive'),
          self: b.includes('No Target') || [].concat(raw.target_team || []).includes('Friendly'),
        };
        for (const [t, test] of Object.entries(ABILITY_RULES)) {
          if (test(a)) (tags[t] ||= []).includes(raw.dname) || tags[t].push(raw.dname);
        }
      }
      out[name.replace('npc_dota_hero_', '')] = tags;
    }
    writeCache('dcb:abilities:v1', out);
    return (abilityTags = out);
  } catch {
    if (hit) return (abilityTags = hit.data);
    return null;
  }
}

/** Aghanim's Scepter / Shard upgrades for a hero (from the game files via OpenDota). */
export const getAghs = (heroId) => aghs.get(heroId) || null;

// Optional extras: the app still works if these fail.
async function loadExtras() {
  const [a, p] = await Promise.allSettled([
    cached('dcb:aghs:v1', API + '/constants/aghs_desc', 3 * DAY, shrinkAghs),
    cached('dcb:patch:v2', API + '/constants/patch', DAY, (d) => d.slice(-8).reverse().map((x) => ({ name: x.name, date: x.date }))),
  ]);
  if (a.status === 'fulfilled') aghs = new Map(a.value.data.map((x) => [x.id, x]));
  if (p.status === 'fulfilled') { patches = p.value.data || []; patch = patches[0]?.name || null; }
}

/** Load hero and item constants. */
export async function loadConstants() {
  const [h, i] = await Promise.all([
    cached('dcb:heroes:v2', API + '/constants/heroes', 3 * DAY, shrinkHeroes),
    cached('dcb:items:v3', API + '/constants/items', 3 * DAY, shrinkItems),
    loadExtras(),
  ]);
  heroes = h.data.sort((a, b) => a.name.localeCompare(b.name));
  items = i.data;
  heroesById = new Map(heroes.map((x) => [x.id, x]));
  itemsById = new Map(Object.entries(items).map(([k, v]) => [v.id, k]));
  for (const hero of heroes) {
    const extra = (NICKNAMES[hero.key] || '').split(' ').filter(Boolean);
    hero.search = [hero.name, ...hero.aliases, ...extra].map((s) => s.toLowerCase());
    hero.short = shortLabel(hero.name);
  }
  dataStamp = { t: Math.min(h.t, i.t), stale: h.stale || i.stale };
  return { heroes, items };
}

export const getHeroes = () => heroes;
export const getHero = (id) => heroesById && heroesById.get(id);
export const getItem = (key) => items && items[key];
/** All items, keyed by internal name (for finding item names inside patch notes). */
export const allItems = () => items || {};
export const itemKeyById = (id) => itemsById && itemsById.get(Number(id));

/** Popular items for a hero, split by game phase. */
export function loadPopularity(heroId, force = false) {
  const key = 'dcb:pop:' + heroId;
  return cached(key, `${API}/heroes/${heroId}/itemPopularity`, force ? 0 : 12 * 36e5);
}

export function shortLabel(name) {
  const words = name.replace(/[^A-Za-z ]/g, '').split(' ').filter(Boolean);
  if (words.length > 1) return words.map((w) => w[0]).join('').toUpperCase().slice(0, 3);
  const w = words[0] || name;
  return (w.length <= 4 ? w : w.slice(0, 3)).toUpperCase();
}

export function searchHeroes(query, attr) {
  const q = query.trim().toLowerCase();
  // 3 = exact nickname ("pa"), 2 = name starts with it, 1 = a word starts with it.
  const score = (h) => {
    if (!q) return 1;
    let best = 0;
    for (const s of h.search) {
      if (s === q) return 3;
      if (s.startsWith(q)) best = Math.max(best, 2);
      else if (s.split(/[\s-]+/).some((w) => w.startsWith(q))) best = Math.max(best, 1);
    }
    return best;
  };
  return heroes
    .filter((h) => !attr || attr === 'all' || h.primary_attr === attr)
    .map((h) => [h, score(h)])
    .filter(([, s]) => s > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([h]) => h);
}

export const heroImg = (h) => CDN + h.img;
export const itemImg = (it) => CDN + it.img;

// ---------- Small persisted preferences ----------
export function loadPrefs() {
  return readCache('dcb:prefs')?.data || {};
}
export function savePrefs(p) {
  writeCache('dcb:prefs', p);
}

// ---------- Matchups (for suggesting strong picks against the chosen foes) ----------
// OpenDota /heroes/{id}/matchups: how the foe did against every other hero (pro matches).
// Returns Map(heroId → { g: games, w: the foe's wins }).
export async function loadMatchups(foeId) {
  const r = await cached('dcb:mu:' + foeId, `${API}/heroes/${foeId}/matchups`, DAY,
    (rows) => rows.map((x) => [x.hero_id, x.games_played, x.wins]));
  return new Map(r.data.map(([id, g, w]) => [id, { g, w }]));
}

// ---------- Patch notes (OpenDota /constants/patchnotes, from Valve's notes) ----------
// ~600 KB compressed for every version, so it is fetched only when the bell or the notes
// page opens, then cached for a day. Kept: the 10 newest versions, tidied to plain text.
const clean = (t) => String(t).replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, '').replace(/\\"/g, '"').replace(/\s+/g, ' ').trim();
function tidyList(list) {
  // Turns Valve's flat list into [{ h: heading|null, lines: [...] }] blocks.
  const out = [];
  let cur = { h: null, lines: [] };
  for (const raw of list || []) {
    const isSub = /class=\\?"Subtitle/.test(raw);
    const text = clean(raw);
    if (/^<br\s*\/?>$/i.test(String(raw).trim()) || !text) { if (cur.lines.length) { out.push(cur); cur = { h: null, lines: [] }; } continue; }
    if (isSub) { if (cur.lines.length || cur.h) out.push(cur); cur = { h: text, lines: [] }; continue; }
    cur.lines.push(text);
  }
  if (cur.lines.length || cur.h) out.push(cur);
  return out;
}
function shrinkNotes(raw) {
  const keys = Object.keys(raw).slice(-10).reverse();
  return keys.map((k) => {
    const v = raw[k] || {};
    const heroes = {};
    for (const [hk, hv] of Object.entries(v.heroes || {})) {
      heroes[hk] = Array.isArray(hv) ? { General: hv.map(clean).filter(Boolean) }
        : Object.fromEntries(Object.entries(hv).map(([ak, lines]) => [ak, (lines || []).map(clean).filter(Boolean)]));
    }
    const items = {};
    for (const [ik, lines] of Object.entries(v.items || {})) items[ik] = (lines || []).map(clean).filter(Boolean);
    return { key: k, name: k.replace('_', '.'), general: tidyList(v.general), heroes, items };
  });
}
let notes = null;
export const getNotes = () => notes;
export async function loadPatchNotes() {
  if (notes) return notes;
  const r = await cached('dcb:notes:v1', API + '/constants/patchnotes', DAY, shrinkNotes);
  return (notes = r.data);
}
/** Date for a patch name like "7.42" or "7.41f" (letter updates use their major patch's date). */
export function patchDate(name) {
  const major = String(name).replace(/[a-z]+$/i, '');
  const p = patches.find((x) => x.name === name) || patches.find((x) => x.name === major);
  return p ? new Date(p.date) : null;
}
