// Counter Build — UI. Vanilla JS, no build step: works straight from GitHub Pages.
import {
  loadConstants, getHeroes, getHero, searchHeroes, loadPopularity, heroImg, itemImg, CDN, loadMatchups,
  loadPrefs, savePrefs, dataStamp, patch, getAghs, getItem, abilitiesFor, loadAbilities,
} from './data.js';
import {
  ROLES, BUILD_TYPES, TYPE_NAMES, TEAM_LABEL, SUPPORT_LABEL, typeFit, suggestRole, isSupport, COMPLEXITY, DIFFICULTY,
} from './rules.js';
import { enemyDamage, damageAdvice, counterItems, fullBuild, needsKey } from './engine.js';

// ---------- State ----------
const prefs = loadPrefs();
const S = {
  ready: false,
  loadError: null,
  mode: prefs.mode === 'normal' ? 'normal' : 'turbo', // Turbo by default; the user's choice is remembered
  passiveFirst: prefs.passiveFirst !== false,
  recent: Array.isArray(prefs.recent) ? prefs.recent : [],
  you: prefs.draft?.you ?? null,
  role: prefs.draft?.role ?? null,
  roleChosen: !!prefs.draft?.roleChosen, // true once the user taps a lane themselves
  enemies: Array.isArray(prefs.draft?.enemies) && prefs.draft.enemies.length === 5 ? prefs.draft.enemies : [null, null, null, null, null],
  active: 0, // enemy slot the grid fills next (null = team full)
  youOpen: false, // changing an already-picked hero
  youListOpen: false,
  youQuery: '',
  youIdx: 0,
  type: null, // null = best fit for the hero
  query: '',
  attr: 'all',
  dmgOpen: false,
  countersOpen: true,
  laneOpen: false,
  gridStep: 0, // rows shown = 3 × (gridStep + 1)
  phase: 'Early',
  pop: {}, // heroId -> { status, data, t, stale }
};
S.active = nextEmpty();

function persist() {
  savePrefs({
    mode: S.mode, passiveFirst: S.passiveFirst, recent: S.recent.slice(0, 5),
    draft: { you: S.you, role: S.role, roleChosen: S.roleChosen, enemies: S.enemies },
  });
}

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => [...document.querySelectorAll(sel)];
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const isDesktop = () => matchMedia('(min-width: 1024px)').matches;
const enemyHeroes = () => S.enemies.filter((id) => id != null).map(getHero).filter(Boolean);
const ready = () => S.you != null && enemyHeroes().length > 0;

function nextEmpty(from = 0) {
  for (let k = 0; k < 5; k++) { const i = (from + k) % 5; if (S.enemies[i] == null) return i; }
  return null;
}

// ---------- Icons ----------
const I = {
  plus: (s = 20) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>`,
  x: (s = 10, w = 2.6) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>`,
  chev: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>',
  back: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg>',
  shield: (s = 20) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z"/></svg>`,
  swords: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14.5 17.5L3 6V3h3l11.5 11.5M13 19l6-6M16 16l4 4M19 21l2-2M14.5 6.5L18 3h3v3l-3.5 3.5M5 14l4 4M7 17l-3 3M3 19l2 2"/></svg>',
  breakIco: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="vertical-align:-2px"><path d="M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z"/><path d="M12 7l-2 4 3 2-2 4"/></svg>',
  star: '<svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z"/></svg>',
  // Keyboard: marks items you have to activate with a key.
  key: (s = 14) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="5" width="20" height="14" rx="2.5"/><path d="M6 9h.01M10 9h.01M14 9h.01M18 9h.01M6 12.5h.01M18 12.5h.01M10 12.5h4M8 16h8"/></svg>`,
  tick: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  check: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  offline: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 3l18 18"/><path d="M8.5 16.5a5 5 0 0 1 7 0"/><path d="M5 12.5a10 10 0 0 1 4-2.3"/><path d="M14.5 10.3A10 10 0 0 1 19 12.5"/><circle cx="12" cy="20" r="0.8"/></svg>',
};
const ATTR = { str: ['Strength', 'var(--attr-str)', 'strength'], agi: ['Agility', 'var(--attr-agi)', 'agility'], int: ['Intelligence', 'var(--attr-int)', 'intelligence'], all: ['Universal', 'var(--attr-all)', 'universal'] };
// Valve's own attribute icons (hero_strength.png etc.)
const attrIcon = (attr, cls = 'attr-ico') => `<img class="${cls}" src="${CDN}/apps/dota2/images/dota_react/icons/hero_${(ATTR[attr] || ATTR.all)[2]}.png" alt="" width="16" height="16" loading="lazy">`;
const DMG_COLOR = { Magical: 'var(--magical)', Physical: 'var(--physical)', Pure: 'var(--pure)', Mixed: 'var(--mixed)' };

// Portrait with initials underneath; the image is removed if it fails to load.
const vt = (name) => ` style="view-transition-name:${name}"`;
const portrait = (h, cls = '', name = '') =>
  `<span class="portrait ${cls}"${name ? vt(name) : ''}>${esc(h.short)}<img src="${heroImg(h)}" alt="" loading="lazy" decoding="async" data-fallback></span>`;
const itemIcon = (it) =>
  `<span class="item-ico">${esc(it.name.split(' ').map((w) => w[0]).join('').slice(0, 3))}<img src="${itemImg(it)}" alt="" loading="lazy" decoding="async" data-fallback></span>`;

function timeAgo(t) {
  const m = Math.round((Date.now() - t) / 6e4);
  if (m < 2) return 'just now';
  if (m < 60) return m + ' min ago';
  const h = Math.round(m / 60);
  if (h < 36) return h + ' h ago';
  return Math.round(h / 24) + ' days ago';
}

// ---------- Draft rendering ----------
function modeSwitch() {
  return `<div class="seg seg-mode${S.pulse === 'mode' ? ' slide' : ''}" data-on="${S.mode}" role="radiogroup" aria-label="Game mode">
    ${['turbo', 'normal'].map((m) => `<button role="radio" aria-checked="${S.mode === m}" data-action="mode" data-v="${m}">${m === 'normal' ? 'Normal' : 'Turbo'}</button>`).join('')}
  </div>`;
}

// Role chips show the lane under the role name.
const ROLE_INFO = {
  Carry: ['Carry', 'Safe lane', 'Position 1 · farms the safe lane'],
  Mid: ['Mid', 'Mid lane', 'Position 2 · solo mid lane'],
  Off: ['Offlane', 'Off lane', 'Position 3 · solo off lane'],
  'Sup 4': ['Sup 4', 'Off lane', 'Position 4 · soft support, laning with your offlaner'],
  'Sup 5': ['Sup 5', 'Safe lane', 'Position 5 · hard support, protecting your carry'],
};
const roleText = (r) => (ROLE_INFO[r] ? `${ROLE_INFO[r][0]} · ${ROLE_INFO[r][1]}` : r);
const GRID_ROWS = 3;
// Phases, named for the hours of the day.
const PHASE_NAME = { Early: 'Early', Mid: 'Mid', Late: 'Late' };

// ---------- Your hero: type-to-search combobox ----------
const youEditing = () => !getHero(S.you) || S.youOpen;

function youOptions() {
  if (!S.ready) return [];
  const q = S.youQuery.trim();
  return q ? searchHeroes(q).slice(0, 30) : getHeroes();
}

// Simple line icons for hero roles (Valve has no public role icons).
const ROLE_PATHS = {
  Carry: 'M12 3l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.4 6.8 19.1l1-5.8L3.5 9.2l5.9-.9z',
  Support: 'M12 21s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 5.6-7 10-7 10z',
  Nuker: 'M13 2L4 14h7l-1 8 9-12h-7z',
  Disabler: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM5.6 5.6l12.8 12.8',
  Initiator: 'M5 19l6-6M14 4l6 6-8 8-6-6zM14 4l2-2 6 6-2 2',
  Durable: 'M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z',
  Escape: 'M4 12h11M11 6l6 6-6 6M19 5v14',
  Pusher: 'M5 21V5l7-3 7 3v16M9 21v-6h6v6M5 9h14',
  Jungler: 'M12 3l6 9h-4l4 6H6l4-6H6zM12 18v3',
};
const roleIcon = (r) => ROLE_PATHS[r] ? `<svg class="tl-ico role" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${ROLE_PATHS[r]}"/></svg>` : '';

// ---------- Hero details on the card ----------
// Difficulty (Valve's 1–3) + win rate vs your foes, then attribute · attack type · top roles.
function heroMeta(h) {
  const diff = COMPLEXITY[h.id];
  const gems = diff ? `<span class="diff" title="Difficulty: ${DIFFICULTY[diff]}" aria-label="Difficulty ${DIFFICULTY[diff]}">${[1, 2, 3].map((n) => `<i class="${n <= diff ? 'on' : ''}"></i>`).join('')}<em>${DIFFICULTY[diff]}</em></span>` : '';
  const vsFoes = foeScore(h);
  const wr = vsFoes != null ? `<span class="vs-foes ${vsFoes >= 0.5 ? 'good' : 'bad'}" title="Win rate against your foes in pro matches">${Math.round(vsFoes * 100)}% vs foes</span>` : '';
  return `<span class="you-meta">${gems}${wr}</span>
    <span class="tag-line"><span class="tl">${attrIcon(h.primary_attr, 'tl-ico')}${(ATTR[h.primary_attr] || ATTR.all)[0]}</span>${h.attack_type ? `<span class="tl"><img class="tl-ico" src="${CDN}/apps/dota2/images/dota_react/icons/${h.attack_type === 'Ranged' ? 'ranged' : 'melee'}.svg" alt="" width="14" height="14">${h.attack_type}</span>` : ''}${(h.roles || []).slice(0, 2).map((r) => `<span class="tl">${roleIcon(r)}${esc(r)}</span>`).join('')}</span>`;
}

// ---------- Strong picks against the chosen foes ----------
// From OpenDota pro-match matchups, smoothed toward 50% so tiny samples can't dominate.
function ensureMatchups() {
  S.mu ||= new Map();
  for (const e of enemyHeroes()) {
    if (S.mu.has(e.id)) continue;
    S.mu.set(e.id, null);
    loadMatchups(e.id).then((m) => { S.mu.set(e.id, m); renderYou(); }).catch(() => S.mu.delete(e.id));
  }
}
function foeScore(h) {
  const foes = enemyHeroes().filter((e) => S.mu?.get(e.id));
  if (!foes.length) return null;
  let sum = 0;
  for (const e of foes) {
    const r = S.mu.get(e.id).get(h.id) || { g: 0, w: 0 };
    sum += (r.g - r.w + 10) / (r.g + 20); // h's wins vs e, smoothed
  }
  return sum / foes.length;
}
const fitsRole = (h, role) => !role || suggestRole(h) === role || (isSupport(role) && isSupport(suggestRole(h)));
// Top 5 heroes against the named foes, limited to the chosen lane (if one is chosen).
function strongPicks() {
  const foes = enemyHeroes();
  if (!S.ready || !foes.some((e) => S.mu?.get(e.id))) return [];
  const role = S.roleChosen ? S.role : null;
  return getHeroes()
    .filter((h) => h.id !== S.you && !S.enemies.includes(h.id) && fitsRole(h, role))
    .map((h) => [h, foeScore(h)])
    .filter(([, sc]) => sc > 0.5)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
}

function suggestRow(better = false) {
  const foes = enemyHeroes();
  const cur = better ? foeScore(getHero(S.you)) : null;
  if (!S.ready || !foes.length) return '';
  const ready = foes.some((e) => S.mu?.get(e.id));
  const role = S.you != null ? S.role : null;
  const picks = ready ? getHeroes()
    .filter((h) => h.id !== S.you && !S.enemies.includes(h.id) && fitsRole(h, role))
    .map((h) => [h, foeScore(h)])
    .filter(([, sc]) => sc > 0.5 && (cur == null || sc > cur + 0.01))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5) : [];
  const head = `<div class="recent-label">${better ? "Stronger picks against your foes" : "Strong picks against your foes"}${role ? ` · ${ROLE_INFO[role][0]}` : ''}</div>`;
  if (!ready) return better ? "" : `<div class="recent suggest">${head}<div class="row-5">${Array.from({ length: 5 }, () => '<div aria-hidden="true"><div class="sk sk-tile"></div></div>').join('')}</div></div>`;
  if (!picks.length) return '';
  return `<div class="recent suggest" role="group" aria-label="Strong picks against your foes">${head}
    <div class="row-5">${picks.map(([h, sc]) => `<button class="recent-btn" data-action="set-you" data-id="${h.id}" aria-label="${esc(h.name)}, ${Math.round(sc * 100)}% against your foes">
      <span class="pick-wrap">${portrait(h)}<span class="wr">${Math.round(sc * 100)}%</span></span><span class="tile-name">${esc(h.name)}</span></button>`).join('')}</div>
  </div>`;
}

// Quick picks under the search field.
function recentRow() {
  const list = S.recent.map(getHero).filter(Boolean).slice(0, 5);
  if (!list.length) return '';
  return `<div class="recent" role="group" aria-label="Your recent heroes">
    <div class="recent-label">Your recent champions</div>
    <div class="row-5">${list.map((h) => {
      const enemy = S.enemies.includes(h.id);
      return `<button class="recent-btn${h.id === S.you ? ' is-current' : ''}" data-action="set-you" data-id="${h.id}" aria-label="${esc(h.name)}${enemy ? ', on the enemy team' : ''}"${enemy ? ' aria-disabled="true"' : ''}>
        ${portrait(h)}<span class="tile-name">${esc(h.name)}</span></button>`;
    }).join('')}</div>
  </div>`;
}

function renderYou() {
  const you = getHero(S.you);
  let html = '<div class="section-head"><label class="eyebrow" for="you-input">Your champion</label></div>';
  if (youEditing()) {
    html += `<div class="combo">
      <div class="combo-field">
        <svg class="combo-ico" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>
        <input id="you-input" type="text" role="combobox" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="done"
          aria-autocomplete="list" aria-controls="you-list" aria-expanded="${S.youListOpen}"
          placeholder="${you ? 'Choose another champion' : 'Name your champion — “jugg”, “sf”, “am”'}" value="${esc(S.youQuery)}">
      </div>
      <div class="combo-list" id="you-list" role="listbox" aria-label="Heroes"${S.youListOpen ? '' : ' hidden'}></div>
    </div>${recentRow()}`;
  } else {
    html += `<div class="you-card">
        <button class="you-main" data-action="open-you" aria-label="Change your hero, currently ${esc(you.name)}">
          ${portrait(you, 'you', 'h' + you.id)}
          <span class="you-text"><span class="you-name">${esc(you.name)}</span>${heroMeta(you)}</span>
        </button>
        <span class="you-actions">
          <button class="you-swap" data-action="remove-you" aria-label="Remove ${esc(you.name)}">${I.x(14, 2)}</button>
          <button class="you-swap" data-action="open-you" aria-label="Change your hero"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg></button>
        </span>
      </div>`;
  }
  {
    const best = you ? suggestRole(you) : null;
    html += `<div class="section-head lane-head"><div class="eyebrow">Your lane</div></div><div class="chips" role="radiogroup" aria-label="Your role and lane">
      ${ROLES.map((r) => {
        const [n, lane, tip] = ROLE_INFO[r];
        return `<button class="chip" role="radio" aria-checked="${S.role === r}"${S.role === r && S.pulse === 'role' ? ' data-pulse' : ''} data-action="role" data-v="${r}" title="${tip}" aria-label="${n}, ${lane}${r === best ? ', best fit' : ''}"><b>${n}</b><small${r === best ? ' class="best"' : ''}>${r === best ? I.star + 'Best fit' : lane}</small></button>`;
      }).join('')}
    </div>`;
  }
  // Keep typing focus if this re-render happens while the search field is in use.
  const typing = document.activeElement?.id === 'you-input';
  $('#you-section').innerHTML = html;
  if (typing) { const inp = $('#you-input'); inp?.focus({ preventScroll: true }); inp?.setSelectionRange(inp.value.length, inp.value.length); }
  if (youEditing()) renderYouList();
  ensureMatchups();
}

function renderYouList() {
  const list = $('#you-list');
  const input = $('#you-input');
  if (!list || !input) return;
  input.setAttribute('aria-expanded', String(S.youListOpen));
  list.hidden = !S.youListOpen;
  if (!S.youListOpen) { input.removeAttribute('aria-activedescendant'); return; }
  const opts = youOptions();
  if (!opts.length) {
    list.innerHTML = `<div class="combo-empty">${S.ready ? `No champion answers to “${esc(S.youQuery)}”` : 'Summoning the heroes…'}</div>`;
    input.removeAttribute('aria-activedescendant');
    return;
  }
  // Suggested picks (dynamic: foes + chosen lane) sit on top when nothing is typed.
  const picks = S.youQuery.trim() ? [] : strongPicks();
  const role = S.roleChosen ? S.role : null;
  const entries = [...picks.map(([h]) => ({ h, sug: true })), ...opts.map((h) => ({ h }))];
  S.youIdx = Math.max(0, Math.min(S.youIdx, entries.length - 1));
  list.innerHTML = entries.map(({ h, sug }, i) => {
    const enemy = S.enemies.includes(h.id);
    const sc = foeScore(h);
    const head = sug && i === 0 ? `<div class="combo-group" role="presentation">Strong picks against your foes${role ? ' · ' + ROLE_INFO[role][0] : ''}</div>`
      : picks.length && i === picks.length ? '<div class="combo-group" role="presentation">All heroes</div>' : '';
    const side = enemy ? '<span class="combo-note">Enemy</span>' : h.id === S.you ? '<span class="combo-note">Current</span>'
      : sc != null ? `<span class="combo-wr ${sc >= 0.5 ? 'good' : 'bad'}">${Math.round(sc * 100)}%</span>${attrIcon(h.primary_attr)}` : attrIcon(h.primary_attr);
    return `${head}<div class="combo-opt${sug ? ' sug' : ''}" role="option" id="you-opt-${sug ? 's' : ''}${h.id}" data-action="set-you" data-id="${h.id}"
      aria-selected="${i === S.youIdx}"${enemy ? ' aria-disabled="true"' : ''}>
      <span class="portrait combo-pic">${esc(h.short)}<img src="${heroImg(h)}" alt="" loading="lazy" decoding="async" data-fallback></span>
      <span class="combo-name">${esc(h.name)}</span>
      ${side}
    </div>`;
  }).join('');
  const active = list.querySelector('[aria-selected="true"]');
  if (active) {
    input.setAttribute('aria-activedescendant', active.id);
    active.scrollIntoView({ block: 'nearest' });
  }
}

function setYou(id) {
  const h = getHero(id);
  if (!h) return;
  if (S.enemies.includes(id)) { toast(`${h.name} already marches with the enemy`); return; }
  if (S.you !== id) { if (!S.roleChosen || !S.role) S.role = suggestRole(h); S.type = null; S.phase = 'Early'; }
  S.you = id;
  S.recent = [id, ...S.recent.filter((x) => x !== id)].slice(0, 5);
  S.youOpen = false; S.youListOpen = false; S.youQuery = ''; S.youIdx = 0;
  persist();
  render();
}

// ---------- Enemies ----------
function renderEnemies() {
  const n = enemyHeroes().length;
  const slots = S.enemies.map((id, i) => {
    const h = getHero(id);
    if (h) return `<button${vt('h' + h.id)} class="enemy-slot filled" data-action="remove-enemy" data-i="${i}" aria-label="Remove ${esc(h.name)}">${esc(h.short)}<img src="${heroImg(h)}" alt="" loading="lazy" data-fallback><span class="x">${I.x()}</span></button>`;
    if (S.active === i) return `<button class="enemy-slot active" data-action="slot" data-i="${i}" aria-label="Enemy slot ${i + 1}, next to fill">${I.plus(18)}</button>`;
    return `<button class="enemy-slot empty" data-action="slot" data-i="${i}" aria-label="Enemy slot ${i + 1}, empty">${I.plus(16)}</button>`;
  }).join('');
  $('#enemy-section').innerHTML = `<div class="section-head"><div class="eyebrow">Your foes</div>
      <span class="count">${n} of 5${n ? '<button class="btn-text" data-action="clear-enemies">Clear</button>' : ''}</span></div>
    <div class="row-5">${slots}</div>`;
}


function renderFilters() {
  const opts = [['all', 'All'], ...Object.entries(ATTR).map(([k, [l]]) => [k === 'all' ? 'universal' : k, l])];
  $('#filters').innerHTML = opts.map(([v, l]) => {
    const color = v === 'all' ? '' : attrIcon(v === 'universal' ? 'all' : v);
    return `<button class="filter" role="radio" aria-checked="${S.attr === v}"${S.attr === v && S.pulse === 'attr' ? ' data-pulse' : ''} data-action="attr" data-v="${v}">${color}${l}</button>`;
  }).join('');
}

function renderGrid() {
  const grid = $('#hero-grid');
  const more = $('#grid-more');
  more.innerHTML = '';
  if (S.loadError) {
    grid.innerHTML = `<div class="grid-empty">The ravens have not returned. Connect once so the heroes can be summoned — after that, the app needs no ravens at all.<br><br><button class="btn-outline" data-action="reload">Retry</button></div>`;
    return;
  }
  const cols = isDesktop() ? 7 : 5;
  if (!S.ready) {
    grid.innerHTML = Array.from({ length: cols * GRID_ROWS }, () => '<div aria-hidden="true"><div class="sk sk-tile"></div><div class="sk-line"></div></div>').join('');
    grid.setAttribute('aria-busy', 'true');
    return;
  }
  grid.removeAttribute('aria-busy');
  const attr = S.attr === 'universal' ? 'all' : S.attr;
  const list = searchHeroes(S.query, S.attr === 'all' ? null : attr);
  const taken = new Set([S.you, ...S.enemies].filter((x) => x != null));
  if (!list.length) {
    grid.innerHTML = `<div class="grid-empty">No champion answers to “${esc(S.query)}”.</div>`;
    return;
  }
  // Stepped reveal: 3 rows → 6 → 9 → everyone.
  const rows = GRID_ROWS * (S.gridStep + 1);
  const cap = cols * rows;
  const shown = S.query ? list : list.slice(0, cap);
  grid.innerHTML = shown.map((h) => {
    const t = taken.has(h.id);
    const who = h.id === S.you ? 'your hero' : 'enemy';
    return `<button class="hero-tile" data-action="hero" data-id="${h.id}" ${t ? `aria-disabled="true" aria-label="${esc(h.name)}, already picked as ${who}"` : `aria-label="${esc(h.name)}"`}>
      <span class="portrait"${t ? '' : vt('h' + h.id)}>${esc(h.short)}<img src="${heroImg(h)}" alt="" loading="lazy" decoding="async" data-fallback>${attrIcon(h.primary_attr, 'attr')}${t ? `<span class="taken">${I.check}</span>` : ''}</span>
      <span class="tile-name">${esc(h.name)}</span></button>`;
  }).join('');
  if (!S.query && (list.length > cap || S.gridStep > 0)) {
    const all = list.length <= cap;
    const label = all ? `Showing all ${list.length} heroes` : 'Show more';
    more.innerHTML = `<button class="more-btn" data-action="more" data-v="${all ? 'less' : 'more'}" aria-expanded="${all}">${label}<span class="chev"${all ? ' style="transform:rotate(180deg)"' : ''}>${I.chev}</span></button>`;
  }
}

function renderDraft() {
  $$('.mode-slot').forEach((el) => (el.innerHTML = modeSwitch()));
  const focusedYou = document.activeElement?.id === 'you-input';
  renderYou();
  if (focusedYou) $('#you-input')?.focus({ preventScroll: true });
  renderEnemies();
  renderFilters();
  renderGrid();
  const input = $('#hero-search');
  input.placeholder = 'Seek your foes — “pa”, “riki”' + (isDesktop() ? ' · press /' : '');
  const btn = $('#build-btn');
  btn.setAttribute('aria-disabled', String(!ready()));
  btn.querySelector('.cta-label').textContent = 'Forge my build';
  const clear = $('.draft-head [data-action="clear-all"]');
  if (clear) clear.disabled = S.you == null && !enemyHeroes().length;
  renderStatus();
}

function renderStatus() {
  const el = $('#data-status');
  if (!S.ready) { el.innerHTML = ''; return; }
  const off = !navigator.onLine || dataStamp.stale;
  el.innerHTML = `<span class="dot" style="background:${off ? 'var(--accent)' : 'var(--attr-agi)'};width:7px;height:7px"></span>${patch ? 'Patch ' + esc(patch) + ' · ' : ''}${off ? 'offline, data from ' + timeAgo(dataStamp.t) : 'updated ' + timeAgo(dataStamp.t)}`;
}

// ---------- Results rendering ----------
function ctxFor(you) {
  const { best, fit } = typeFit(you);
  const type = S.type || best;
  return { you, role: S.role || suggestRole(you), type, best, fit, mode: S.mode, passiveFirst: S.passiveFirst, aghs: getAghs(you.id) };
}

function renderBuildHead() {
  const you = getHero(S.you);
  if (!you) { $('#build-head').innerHTML = ''; return; }
  const enemies = enemyHeroes();
  $('#build-head').innerHTML = `
    <button class="icon-btn" data-action="back" aria-label="Back to draft" style="color:var(--text)">${I.back}</button>
    ${portrait(you, '', 'h' + you.id)}
    <div class="build-title"><h1>${esc(you.name)}</h1>
      <div class="build-sub">${S.mode === 'turbo' ? 'Turbo' : 'Normal'} match${S.role ? ' · ' + esc(ROLE_INFO[S.role][0]) : ''}</div></div>
    ${enemyStack(enemies)}
    <button class="icon-btn head-close" data-action="reset-all" aria-label="Start over: clear the draft">${I.x(16, 2)}</button>`;
}

// Enemy lineup, shown in the Enemy damage row.
const enemyStack = (enemies) => `<span class="pile" role="img" aria-label="Enemy team: ${esc(enemies.map((e) => e.name).join(', '))}">
  ${enemies.map((e) => portrait(e)).join('')}</span>`;

// Slim one-row switch: no card, no heading.
function typeCard(ctx) {
  return `<div class="types compact" role="radiogroup" aria-label="Role type">
      ${BUILD_TYPES.map((t) => {
        const f = ctx.fit[t];
        return `<button class="type-btn" role="radio" aria-checked="${ctx.type === t}"${ctx.type === t && S.pulse === 'type' ? ' data-pulse' : ''} data-action="type" data-v="${t}" aria-label="${TYPE_NAMES[t]}, ${f}">
          <b>${TYPE_NAMES[t]}</b><small class="${f === 'Unwise' ? 'off' : f === 'Best fit' ? 'best' : ''}">${f === 'Best fit' ? I.star : ''}${f}</small></button>`;
      }).join('')}
    </div>`;
}

function scoutCard(dmg, counters, ctx, enemies) {
  const [m, p, u] = dmg.pct;
  const segs = `<span style="width:${m}%;background:var(--magical)"></span><span style="width:${p}%;background:var(--physical)"></span>${u ? `<span style="width:${u}%;background:var(--pure)"></span>` : ''}`;
  const mine = S.role ? LANE_OF[S.role] : null; // only predict rivals for a lane the user picked
  const rows = enemies.map((h) => ({ h, role: suggestRole(h), lane: LANE_OF[suggestRole(h)] }));
  const rivals = rows.filter((r) => r.lane === FACING[mine]);
  const names = (list) => list.map((r) => esc(r.h.name)).join(' and ');
  const face = !mine ? 'pick your lane to see your rivals' : rivals.length ? `You’ll face <span class="pile mini" role="img" aria-label="${esc(rivals.map((r) => r.h.name).join(', '))}">${rivals.map((r) => `<span title="${esc(r.h.name)}">${portrait(r.h)}</span>`).join('')}</span>` : 'no clear lane rival';
  return `<section class="card" aria-label="Enemy intel">
    <button class="disclosure" aria-expanded="${S.dmgOpen}" aria-controls="scout-details" data-action="toggle-dmg">
      <span class="disclosure-text"><span class="eyebrow">Enemy intel</span>
      <span class="verdict one-line">${dmg.verdict}<span class="face-inline">· ${face}</span></span></span>
      <span class="chev">${I.chev}</span>
    </button>
    ${S.dmgOpen ? `<div class="scout${S.opened === 'dmg' ? ' rise-in' : ''}" id="scout-details">
      <div class="scout-tabs" role="tablist" aria-label="Enemy intel view">
        <button role="tab" aria-selected="${S.scoutTab !== 'lanes'}" data-action="scout-tab" data-v="damage">Damage</button>
        <button role="tab" aria-selected="${S.scoutTab === 'lanes'}" data-action="scout-tab" data-v="lanes">Lanes</button>
      </div>
      ${S.scoutTab !== 'lanes' ? `
        <div class="split-bar" role="img" aria-label="Predicted enemy damage: ${m}% magical, ${p}% physical, ${u}% pure">${segs}</div>
        <div class="intel-rows">${[['Magical', m], ['Physical', p], ['Pure', u], ['Mixed', null]].map(([type, pc]) => {
          const heroes = dmg.rows.filter((r) => r.type === type).map((r) => r.hero);
          if (!heroes.length && !pc) return '';
          return `<div class="intel"><span class="intel-k"><span class="dot" style="background:${DMG_COLOR[type]}"></span>${type}${pc != null ? ` <b>${pc}%</b>` : ''}</span>
            ${heroes.length ? `<span class="pile mini" role="img" aria-label="${esc(heroes.map((h) => h.name).join(', '))}">${heroes.map((h) => `<span title="${esc(h.name)}">${portrait(h)}</span>`).join('')}</span>` : '<span class="pile-none">—</span>'}</div>`;
        }).join('')}</div>
        <p class="intel-note">${esc(damageAdvice(dmg, counters))}</p>` : `
        <p class="intel-note">${!mine ? 'Pick your lane on the draft screen to see who you’ll face. Their likely positions:' : rivals.length ? `In the ${mine.toLowerCase()} you’ll most likely face <b>${names(rivals)}</b>.` : `None of your foes usually plays opposite the ${mine.toLowerCase()}.`}</p>
        <div class="lane-chips">${rows.map((r) => `<span class="lane-chip${mine && r.lane === FACING[mine] ? ' rival' : ''}">${portrait(r.h, 'lane-face')}<span><b>${esc(r.h.name)}</b><small>${ROLE_INFO[r.role][0]} · ${ROLE_INFO[r.role][1]}</small></span></span>`).join('')}</div>`}
    </div>` : ''}
  </section>`;
}

// ---------- Insights: name the exact enemy spell each item answers ----------
// e.g. "Breaks Bristleback’s Bristleback, Warpath" · "Hits through Phantom Assassin’s Immaterial"
const VERB = {
  ev: 'Hits through', inv: 'Reveals', heal: 'Cuts healing from', ill: 'Clears', sum: 'Clears',
  dis: 'Blocks', sil: 'Purges', mag: 'Wards against', rc: 'Blunts', esc: 'Stops', buf: 'Strips', brk: 'Breaks',
};
const spellsOf = (hero, t) => abilitiesFor(hero.key, t).slice(0, 3).join(', ');
function insightLines(c) {
  const byT = new Map();
  for (const p of c.pairs || []) {
    if (!p.t || !spellsOf(p.hero, p.t)) continue;
    const list = byT.get(p.t) || [];
    if (!list.includes(p.hero)) list.push(p.hero);
    byT.set(p.t, list);
  }
  return [...byT.entries()].slice(0, 3).map(([t, heroes]) =>
    `<span class="insight${t === 'brk' ? ' brk' : ''}">${t === 'brk' ? I.breakIco + ' ' : ''}${VERB[t]} ${heroes.map((h) => `${esc(h.name)}’s <b>${esc(spellsOf(h, t))}</b>`).join('; ')}</span>`).join('');
}

// ---------- Lane prediction ----------
// Each foe's likely position (from their roles), then who should end up in your lane.
const LANE_OF = { Carry: 'Safe lane', 'Sup 5': 'Safe lane', Mid: 'Mid lane', Off: 'Off lane', 'Sup 4': 'Off lane' };
const FACING = { 'Safe lane': 'Off lane', 'Off lane': 'Safe lane', 'Mid lane': 'Mid lane' };
function countersCard(rows) {
  const list = rows.length
    ? rows.map((c) => `<button class="counter-row" data-action="item" data-v="${c.key}" aria-label="${esc(c.item.name)}: how it counters">
        ${itemIcon(c.item)}
        <span class="counter-text"><span class="nm">${esc(c.item.name)}${c.item.cost ? `<span class="gold-inline"> · ${c.item.cost.toLocaleString()}</span>` : ''}${c.aghs && !c.isNew ? '<span class="tagx up" title="Upgrades a spell you already use">Upgrade</span>'
          : c.passive ? '<span class="tagx p" title="Passive: works on its own" aria-label="Passive">P</span>'
          : `<span class="tagx key" title="Needs a key press" aria-label="Press key">${I.key(12)}</span>`}</span>
          <span class="vs"><span class="vs-why">${esc(c.why.join(' · '))}</span></span>
          ${insightLines(c)}
          ${c.alt ? `<span class="alt">${esc(c.alt).replace(" — press key", ` <span class="alt-key" aria-label="press key">${I.key(13)}</span>`)}</span>` : ''}</span>
        <span class="row-side"><span class="vs-faces" aria-label="against ${esc(c.vs.map((h) => h.name).join(', '))}">${c.vs.map((h) => `<span title="${esc(h.name)}">${portrait(h, 'vs-face')}</span>`).join('')}</span></span>
      </button>`).join('')
    : '<p class="no-counters">Nothing among your foes demands a special answer. Follow the full build.</p>';
  return `<section class="counters" aria-label="Counter items">
    <div class="counters-head">
      <button class="counters-toggle" data-action="toggle-counters" aria-expanded="${S.countersOpen}" aria-controls="counter-list"><span class="counters-ico">${I.shield(14)}</span><h2>The Counters</h2><span class="counters-count">${rows.length}</span></button>
      <button class="switch" role="switch" aria-checked="${S.passiveFirst}" data-action="passive" aria-label="Prefer passive items">Passive <span class="tagx p" aria-hidden="true">P</span><span class="track"><span class="knob"></span></span></button>
      <button class="icon-btn counters-chev" data-action="toggle-counters" aria-expanded="${S.countersOpen}" aria-controls="counter-list" aria-label="${S.countersOpen ? 'Collapse' : 'Expand'} counters"><span class="chev">${I.chev}</span></button>
    </div>${S.countersOpen ? `<div id="counter-list" class="${S.opened === 'counters' ? 'rise-in' : ''}">${list}</div>` : ''}</section>`;
}

// ---------- Match clock: runs while the results screen is open ----------
// Starts when the results open for a draft; Early → Mid → Late follow real match time
// (Normal 15/30 min, Turbo 8/18 min). You can still open and close phases yourself.
const PHASE_END = { normal: [15, 30], turbo: [8, 18] };
const draftSig = () => [S.you, ...S.enemies, S.mode].join('|');
function startClock() {
  if (S.clock && S.clock.sig === draftSig()) return;
  S.clock = { start: Date.now(), sig: draftSig(), phase: 'Early' };
  S.phase = 'Early';
}
function phaseNow() {
  const elapsed = (Date.now() - S.clock.start) / 1000;
  const [a, b] = PHASE_END[S.mode];
  const min = elapsed / 60;
  if (min < a) return { phase: 'Early', elapsed, end: a * 60, frac: min / a };
  if (min < b) return { phase: 'Mid', elapsed, end: b * 60, frac: (min - a) / (b - a) };
  return { phase: 'Late', elapsed, end: 0, frac: 1 };
}
// Radial progress for the running phase (r = 6 → circumference ≈ 37.7).
const RING_C = 2 * Math.PI * 6;
const ring = (frac) => `<svg class="ring" width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6" class="ring-bg"/><circle cx="8" cy="8" r="6" class="ring-fg" data-ring stroke-dasharray="${RING_C.toFixed(2)}" style="stroke-dashoffset:${(RING_C * (1 - Math.min(1, frac))).toFixed(2)}"/></svg>`;
const fmtClock = (sec) => `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;
setInterval(() => {
  if (!S.clock || document.hidden || document.body.dataset.screen !== 'build' && !isDesktop()) return;
  const live = phaseNow();
  if (live.phase !== S.clock.phase) {
    // Time's up for this phase: close it and open the next one.
    S.clock.phase = live.phase;
    if (!isDesktop()) { S.phase = live.phase; S.opened = live.phase; }
    renderResults(); S.opened = null;
    return;
  }
  $$('[data-clock]').forEach((el) => (el.textContent = fmtClock(live.elapsed)));
  $$('[data-ring]').forEach((el) => (el.style.strokeDashoffset = String(RING_C * (1 - Math.min(1, live.frac)))));
}, 1000);

function buildCard(ctx, counters) {
  const st = S.pop[S.you];
  const head = `<div class="build-card-head"><div class="title-row"><span class="counters-ico">${I.swords}</span><h2>The Full Build</h2></div>
    <p class="build-desc">What most who play ${esc(ctx.you.name)} buy${patch ? ' in patch ' + esc(patch) : ''}${S.mode === 'turbo' ? ', reshaped for Turbo: lane-only items dropped, your first core item pulled into Early, and one luxury item added late' : ''}.</p></div>`;
  if (!st || st.status === 'loading') {
    return `<section class="card build-card" aria-label="Item build by phase" aria-busy="true">${head}
      ${['Early', 'Mid', 'Late'].map(() => `<div class="phase" style="padding:14px"><div class="sk-cells"><div class="sk"></div><div class="sk"></div><div class="sk"></div><div class="sk"></div></div></div>`).join('')}</section>`;
  }
  if (st.status === 'error') {
    return `<section class="card build-card" aria-label="Item build by phase">${head}
      <div class="phase" style="padding:14px;display:flex;align-items:center;gap:12px"><span style="flex:1;font-size:13px;color:var(--muted)">The ravens brought no word of items. Your answers above still stand.</span>
      <button class="btn-outline" data-action="retry">Retry</button></div></section>`;
  }
  const phases = fullBuild(st.data, ctx, counters);
  const desktop = isDesktop();
  S.phaseOf = new Map(phases.flatMap((p) => p.items.map((x) => [x.key, p.label])));
  // Counter items carry the faces of the enemies they answer.
  const faces = (row) => `<span class="faces" aria-label="counters ${esc(row.vs.map((h) => h.name).join(', '))}">${row.vs.slice(0, 3).map((h) => portrait(h, 'face')).join('')}${row.vs.length > 3 ? `<span class="face-more">+${row.vs.length - 3}</span>` : ''}</span>`;
  const pill = (x) => `<button class="pill${x.counter ? ' counter' : ''}" data-action="item" data-v="${x.key}" aria-label="${esc(x.item.name)}, details">${itemIcon(x.item)}${esc(x.item.name)}${x.press ? `<span class="k" aria-label="press key">${I.key()}</span>` : ''}${x.row ? faces(x.row) : ''}</button>`;
  const live = S.clock ? phaseNow() : null;
  const rows = phases.map((p) => {
    const open = desktop || S.phase === p.label;
    const running = live && live.phase === p.label;
    return `<div class="phase">
      <button class="disclosure" aria-expanded="${open}" aria-controls="ph-${p.label}" data-action="phase" data-v="${p.label}" ${desktop ? 'tabindex="-1"' : ''}>
        <span class="phase-label"><b>${PHASE_NAME[p.label]}</b><small>${p.time}</small></span>
        <span class="phase-sum">${open ? p.items.length + ' items' : esc(p.items.map((x) => x.item.name).join(', '))}</span>
        ${running ? `<span class="phase-timer" aria-label="Match time">${live.end ? ring(live.frac) : '<i class="live-dot"></i>'}<span data-clock>${fmtClock(live.elapsed)}</span></span>` : ''}
        ${desktop ? '' : `<span class="chev">${I.chev}</span>`}
      </button>
      ${open ? `<div class="phase-items${S.opened === p.label ? ' rise-in' : ''}" id="ph-${p.label}">${p.items.map(pill).join('')}</div>` : ''}
    </div>`;
  }).join('');
  return `<section class="card build-card" aria-label="Item build by phase">${head}${rows}</section>`;
}

// ---------- Item info sheet ----------
function openItem(key) {
  const it = getItem(key);
  if (!it) return;
  const row = S.counterBy?.get(key);
  const phase = S.phaseOf?.get(key);
  const press = row ? !row.passive : needsKey(key);
  const badge = row?.aghs && !row.isNew ? '<span class="badge upgrade">Upgrade</span>'
    : press ? `<span class="badge key" aria-label="Needs a key press">${I.key(14)} Needs a key</span>` : '<span class="badge passive">Passive</span>';
  // One line per enemy: who, what they do, and how this item answers it.
  let counters = '';
  if (row) {
    const byHero = new Map();
    for (const pr of row.pairs || []) {
      const e = byHero.get(pr.hero) || { hero: pr.hero, why: [], how: [] };
      if (!e.why.includes(pr.why)) e.why.push(pr.why);
      const how = pr.t && spellsOf(pr.hero, pr.t) ? `${pr.how}: ${spellsOf(pr.hero, pr.t)}` : pr.how;
      if (!e.how.includes(how)) e.how.push(how);
      byHero.set(pr.hero, e);
    }
    counters = `<section class="sheet-sec"><div class="eyebrow">Whom it answers</div>
      ${[...byHero.values()].map((e) => `<div class="sheet-enemy">${portrait(e.hero, 'sheet-face')}
        <div><b>${esc(e.hero.name)}</b> <span class="sheet-why">${esc(e.why.join(', '))}</span>
        <p>${esc(it.name)} ${esc(e.how.join(', and '))}.</p></div></div>`).join('')}
    </section>`;
  }
  const what = row?.aghs ? row.alt : it.desc;
  $('#sheet-body').innerHTML = `
    <div class="sheet-grab" aria-hidden="true"><span></span></div>
    <div class="sheet-head">
      <span class="sheet-ico">${itemIcon(it)}</span>
      <div class="sheet-title"><h3 id="sheet-title">${esc(it.name)}</h3>
        <div class="sheet-meta">${it.cost ? `<span class="gold">${it.cost.toLocaleString()} gold</span>` : ''}${badge}${phase ? `<span>${phase} game</span>` : ''}</div></div>
      <button class="icon-btn" data-action="close-sheet" aria-label="Close">${I.x(18, 1.75)}</button>
    </div>
    ${counters}
    ${what ? `<section class="sheet-sec"><div class="eyebrow">Its virtues</div><p class="sheet-desc">${esc(what)}</p></section>` : ''}`;
  const dlg = $('#sheet');
  if (!dlg.open) { resetSheet(); dlg.showModal(); }
}

function offlineBanner() {
  const st = S.pop[S.you];
  const off = !navigator.onLine;
  if (!(off || st?.stale) || !st?.data) return '';
  return `<div class="banner" role="status"><span style="color:var(--text-2);display:flex">${I.offline}</span>
    <div class="banner-text"><b>${off ? 'No ravens fly' : 'The ravens failed us'}</b><span>This counsel is from ${timeAgo(st.t)}</span></div>
    <button class="btn-outline" data-action="retry">Retry</button></div>`;
}

function renderResults() {
  const body = $('#results-body');
  if (S.loadError) {
    body.innerHTML = `<div class="empty-state">${I.offline}<b>The ravens have not returned</b><span>Connect once so heroes and items can be summoned. After that, the app needs no ravens at all.</span><button class="btn-outline" data-action="reload">Retry</button></div>`;
    return;
  }
  if (!S.ready) {
    body.innerHTML = Array.from({ length: 3 }, (_, i) => `<div class="sk-card" aria-hidden="true"><div class="sk-bar" style="width:${[64, 48, 56][i]}px"></div><div class="sk-cells"><div class="sk"></div><div class="sk"></div><div class="sk"></div><div class="sk"></div></div></div>`).join('');
    return;
  }
  renderBuildHead();
  const you = getHero(S.you);
  const enemies = enemyHeroes();
  if (!you || !enemies.length) {
    body.innerHTML = `<div class="empty-state">${I.shield(40)}<b>${you ? 'Name at least one foe' : 'Name your champion'}</b><span>${you ? 'The answers appear the moment a foe is named. Even one foe will do.' : 'Then name your foes. The answers and your build will appear here.'}</span></div>`;
    return;
  }
  const ctx = ctxFor(you);
  if (isDesktop()) startClock(); // desktop has no separate results screen
  const counters = counterItems(enemies, ctx);
  S.counterBy = new Map(counters.map((c) => [c.key, c]));
  if (!S.abilitiesAsked && counters.length) {
    S.abilitiesAsked = true;
    loadAbilities().then((a) => { if (a) renderResults(); });
  }
  const dmg = enemyDamage(enemies);
  ensurePopularity(you.id);
  const parts = { type: typeCard(ctx), dmg: scoutCard(dmg, counters, ctx, enemies), counters: countersCard(counters), build: buildCard(ctx, counters) };
  body.innerHTML = offlineBanner() + (isDesktop()
    ? `${parts.type}<div class="res-grid"><div class="stack-col">${parts.counters}${parts.dmg}</div><div class="stack-col">${parts.build}</div></div>`
    : parts.type + parts.dmg + parts.counters + parts.build)
    + `<footer class="credits">Crafted by Pallav Bhatnagar${patch ? ' · Patch ' + esc(patch) : ''} · Not affiliated with Valve</footer>`;
}

function ensurePopularity(id, force = false) {
  const st = S.pop[id];
  if (st && !force && (st.status === 'loading' || st.status === 'ok')) return;
  S.pop[id] = { ...(st || {}), status: st?.data ? 'ok' : 'loading' };
  loadPopularity(id, force)
    .then((r) => { S.pop[id] = { status: 'ok', data: r.data, t: r.t, stale: r.stale }; })
    .catch(() => { S.pop[id] = st?.data ? { ...st, status: 'ok', stale: true } : { status: 'error' }; })
    .finally(() => { if (S.you === id) renderResults(); });
}

function render() {
  renderDraft();
  renderResults();
}

// ---------- Screens (mobile) ----------
function showScreen() {
  const asked = location.hash === '#build';
  const want = asked && (!S.ready || ready()) ? 'build' : 'draft';
  if (asked && want === 'draft') history.replaceState(null, '', location.pathname + location.search);
  if (document.body.dataset.screen !== want) {
    document.body.dataset.screen = want;
    window.scrollTo(0, 0);
    if (want === 'build') { startClock(); playEnter(); }
    else fadeIn($('.draft-body'));
  }
}

// Plain fade for the content only; the glass bars are never animated, so they
// keep their blur and appear at once (view transitions drew them late).
function fadeIn(el) {
  if (!el || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  el.classList.remove('fade-in');
  void el.offsetWidth;
  el.classList.add('fade-in');
}

// Staggered rise-in for the result cards; removed afterwards so toggles don't replay it.
let enterTimer;
function playEnter() {
  const el = $('#results-body');
  el.classList.remove('enter');
  void el.offsetWidth;
  el.classList.add('enter');
  clearTimeout(enterTimer);
  enterTimer = setTimeout(() => el.classList.remove('enter'), 1100);
}

// ---------- Motion ----------
// Animate a state change with the View Transitions API (Chrome/Edge/Safari 18+).
// Elements sharing a view-transition-name glide between their old and new spots.
function morph(update, screen = false) {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!document.startViewTransition || reduce || S.kb) { update(); return; }
  // Only named elements (hero portraits) glide; the page itself swaps instantly, so the
  // CTA and other controls never cross-fade between their old and new states.
  // A screen change (draft → build) is the one place the whole page cross-fades.
  const root = document.documentElement;
  if (screen) root.classList.add('vt-screen');
  const t = document.startViewTransition(update);
  t.finished.finally(() => root.classList.remove('vt-screen'));
}

// ---------- Actions ----------
let toastTimer;
function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
}

function pickHero(id) {
  const h = getHero(id);
  if (!h) return;
  if (S.you === id || S.enemies.includes(id)) {
    toast(`${h.name} already stands in this war`);
    return;
  }
  const slot = nextEmpty();
  if (slot == null) { toast('Five foes already stand against you. Tap one to cast them out.'); return; }
  S.enemies[slot] = id;
  S.active = nextEmpty(slot + 1);
  if (S.active == null) toast(S.you == null ? 'All five foes are named. Now name your champion.' : 'All five foes are named.');
  S.query = '';
  $('#hero-search').value = '';
  persist();
  render();
}

const actions = {
  noop() {},
  mode(v) { if (S.mode === v) return; S.mode = v; S.pulse = 'mode'; persist(); render(); S.pulse = null; },
  role(v) {
    if (S.role === v) { S.role = null; S.roleChosen = false; } // tap again to clear
    else { S.role = v; S.roleChosen = true; S.pulse = 'role'; }
    persist(); render(); S.pulse = null;
  },
  attr(v) { S.attr = v; S.pulse = 'attr'; renderFilters(); renderGrid(); S.pulse = null; },
  hero(v, el) { if (el.getAttribute('aria-disabled') === 'true') { toast(`${getHero(+v).name} already stands in this war`); return; } morph(() => pickHero(+v)); },
  more(v) { S.gridStep = v === 'less' ? 0 : S.gridStep + 1; renderGrid(); },
  item(v) { openItem(v); },
  'close-sheet'() { closeSheet(); },
  'open-you'() {
    S.youOpen = true; S.youListOpen = true; S.youQuery = ''; S.youIdx = 0;
    renderYou();
    $('#you-input')?.focus();
  },
  'remove-you'() { S.you = null; if (!S.roleChosen) S.role = null; S.type = null; S.youOpen = false; S.youListOpen = false; S.youQuery = ''; persist(); render(); },
  'close-you'() { S.youOpen = false; S.youListOpen = false; S.youQuery = ''; renderYou(); },
  'set-you'(v, el) {
    if (el.getAttribute('aria-disabled') === 'true') { toast(`${getHero(+v).name} already marches with the enemy`); return; }
    morph(() => setYou(+v));
  },
  slot() { S.active = nextEmpty(); $('#hero-search').focus({ preventScroll: true }); },
  'remove-enemy'(v) {
    // Close the gap: the remaining foes slide left.
    const left = S.enemies.filter((x, i) => x != null && i !== +v);
    S.enemies = [...left, ...Array(5 - left.length).fill(null)];
    S.active = nextEmpty();
    persist(); morph(render);
  },
  'clear-enemies'() { S.enemies = [null, null, null, null, null]; S.active = 0; persist(); morph(render); },
  'clear-all'() {
    if (S.you == null && !enemyHeroes().length) return;
    S.you = null; S.role = null; S.roleChosen = false; S.type = null; S.enemies = [null, null, null, null, null]; S.active = 0;
    S.youOpen = false; S.youListOpen = false; S.youQuery = '';
    persist(); render(); toast('The muster is scattered.');
  },
  build() {
    if (!ready()) { toast(S.you == null ? 'Name your champion first.' : 'Name at least one foe.'); return; }
    location.hash = 'build';
  },
  back() { if (history.length > 1 && location.hash === '#build') history.back(); else location.hash = ''; },
  type(v) { S.type = v; S.pulse = 'type'; renderResults(); S.pulse = null; },
  passive() { S.passiveFirst = !S.passiveFirst; persist(); renderResults(); },
  'toggle-counters'() { S.countersOpen = !S.countersOpen; S.opened = 'counters'; renderResults(); S.opened = null; },
  'toggle-lane'() { S.laneOpen = !S.laneOpen; S.opened = 'lane'; renderResults(); S.opened = null; },
  'reset-all'() {
    S.you = null; S.role = null; S.roleChosen = false; S.type = null; S.enemies = [null, null, null, null, null]; S.active = 0;
    S.youOpen = false; S.youListOpen = false; S.youQuery = ''; S.clock = null; S.dmgOpen = false;
    persist(); location.hash = ''; render(); toast('A fresh muster. Name your champion.');
  },
  'scout-tab'(v) { S.scoutTab = v; renderResults(); },
  'toggle-dmg'() { S.dmgOpen = !S.dmgOpen; S.opened = 'dmg'; renderResults(); S.opened = null; },
  phase(v) { if (isDesktop()) return; S.phase = S.phase === v ? null : v; S.opened = v; renderResults(); S.opened = null; },
  retry() { ensurePopularity(S.you, true); renderResults(); },
  reload() { boot(); },
  install() { installPrompt?.prompt(); },
};

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-action]');
  if (!el) return;
  const fn = actions[el.dataset.action];
  if (!fn) return;
  e.preventDefault();
  // Keep focus on the same control after a re-render, for keyboard users.
  const focusKey = el.dataset.action + '|' + (el.dataset.v ?? el.dataset.i ?? '');
  S.kb = e.detail === 0; // keyboard clicks skip animated swaps so focus is restored
  fn(el.dataset.v ?? el.dataset.i ?? el.dataset.id, el);
  if (e.detail === 0) {
    const again = $$('[data-action]').find((x) => x.dataset.action + '|' + (x.dataset.v ?? x.dataset.i ?? '') === focusKey);
    again?.focus({ preventScroll: true });
  }
});
// Arrow keys inside radio groups.
document.addEventListener('keydown', (e) => {
  if (e.key === '/' && !/INPUT|TEXTAREA/.test(document.activeElement?.tagName || '')) {
    e.preventDefault();
    $('#hero-search').focus();
    return;
  }
  const radio = e.target.closest?.('[role="radio"]');
  if (radio && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
    const group = [...radio.closest('[role="radiogroup"]').querySelectorAll('[role="radio"]')];
    const i = group.indexOf(radio) + (e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : -1);
    group[(i + group.length) % group.length].focus();
    e.preventDefault();
  }
});

// Your-hero combobox: type to filter, arrows to move, Enter to pick, Esc to close.
document.addEventListener('focusin', (e) => {
  if (e.target.id === 'you-input' && !S.youListOpen) { S.youListOpen = true; renderYouList(); }
});
document.addEventListener('input', (e) => {
  if (e.target.id !== 'you-input') return;
  S.youQuery = e.target.value; S.youIdx = 0; S.youListOpen = true;
  renderYouList();
});
document.addEventListener('keydown', (e) => {
  if (e.target.id !== 'you-input') return;
  const opts = [...document.querySelectorAll('#you-list .combo-opt')];
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault();
    if (!S.youListOpen) { S.youListOpen = true; renderYouList(); return; }
    S.youIdx = (S.youIdx + (e.key === 'ArrowDown' ? 1 : -1) + opts.length) % Math.max(opts.length, 1);
    renderYouList();
  } else if (e.key === 'Enter') {
    e.preventDefault();
    const opt = opts[S.youIdx];
    if (opt) actions['set-you'](opt.dataset.id, opt);
  } else if (e.key === 'Escape') {
    if (S.you != null) actions['close-you']();
    else { S.youListOpen = false; renderYouList(); }
  } else if (e.key === 'Tab') {
    S.youListOpen = false; renderYouList();
  }
});
document.addEventListener('pointerdown', (e) => {
  if (!S.youListOpen || e.target.closest('.combo, .recent')) return;
  if (S.you != null) { S.youOpen = false; S.youQuery = ''; S.youListOpen = false; renderYou(); }
  else { S.youListOpen = false; renderYouList(); }
});

// Tap outside the sheet closes it.
// Tap on the dimmed backdrop (outside the panel) closes it; the click a drag ends with does not.
$('#sheet').addEventListener('click', (e) => {
  if (e.target.id !== 'sheet') return;
  const r = e.target.getBoundingClientRect();
  const outside = e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
  if (outside) closeSheet();
});

// ---------- Draggable bottom sheet ----------
// Hold the handle (or the header) and drag: up to expand, down to dismiss.
function resetSheet() {
  const dlg = $('#sheet');
  dlg.classList.remove('closing', 'dragging');
  Object.assign(dlg.style, { transform: '', height: '', maxHeight: '' });
}
function closeSheet() {
  const dlg = $('#sheet');
  if (!dlg.open) return;
  dlg.classList.add('closing');
  setTimeout(() => { dlg.close(); resetSheet(); }, 260);
}
(() => {
  const dlg = $('#sheet');
  let drag = false, y0 = 0, h0 = 0, dy = 0, t0 = 0;
  dlg.addEventListener('pointerdown', (e) => {
    if (isDesktop() || !e.target.closest('.sheet-grab, .sheet-head') || e.target.closest('button')) return;
    drag = true; y0 = e.clientY; dy = 0; t0 = performance.now();
    h0 = dlg.getBoundingClientRect().height;
    dlg.setPointerCapture(e.pointerId);
    dlg.classList.add('dragging');
  });
  dlg.addEventListener('pointermove', (e) => {
    if (!drag) return;
    dy = e.clientY - y0;
    if (dy > 0) { dlg.style.transform = `translateY(${dy}px)`; return; }
    dlg.style.transform = '';
    const h = Math.min(innerHeight * 0.94, h0 - dy) + 'px';
    dlg.style.height = h; dlg.style.maxHeight = h;
  });
  const end = () => {
    if (!drag) return;
    drag = false;
    dlg.classList.remove('dragging');
    const speed = dy / Math.max(1, performance.now() - t0);
    if (dy > 110 || speed > 0.6) { closeSheet(); return; }
    dlg.style.transform = '';
    if (dy < -40) { dlg.style.height = '94dvh'; dlg.style.maxHeight = '94dvh'; }
  };
  dlg.addEventListener('pointerup', end);
  dlg.addEventListener('pointercancel', end);
  dlg.addEventListener('close', resetSheet);
})();

// ---------- Drag to scroll (filter row): hold and slide, no scrollbar ----------
(() => {
  let el = null, x0 = 0, s0 = 0, moved = false;
  document.addEventListener('pointerdown', (e) => {
    const box = e.target.closest('[data-dragscroll]');
    if (!box || e.pointerType !== 'mouse' || box.scrollWidth <= box.clientWidth) return;
    el = box; x0 = e.clientX; s0 = box.scrollLeft; moved = false;
  });
  document.addEventListener('pointermove', (e) => {
    if (!el) return;
    const dx = e.clientX - x0;
    if (Math.abs(dx) > 4) { moved = true; el.classList.add('grabbing'); }
    el.scrollLeft = s0 - dx;
  });
  document.addEventListener('pointerup', () => { if (el) el.classList.remove('grabbing'); setTimeout(() => (moved = false)); el = null; });
  // A drag should not also count as a tap on a filter.
  document.addEventListener('click', (e) => { if (moved && e.target.closest('[data-dragscroll]')) { e.stopPropagation(); e.preventDefault(); } }, true);
})();

const search = $('#hero-search');
search.addEventListener('input', () => { S.query = search.value; renderGrid(); });
search.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') { search.value = ''; S.query = ''; renderGrid(); }
  if (e.key === 'Enter') {
    const first = $('#hero-grid .hero-tile:not([aria-disabled="true"])');
    if (first && S.query) pickHero(+first.dataset.id);
  }
});

// Image fallback: drop failed images so the initials underneath show.
document.addEventListener('error', (e) => { if (e.target.matches?.('img[data-fallback]')) e.target.remove(); }, true);

// Screen changes swap instantly (no view transition), so the glass bars never lag.
window.addEventListener('hashchange', () => { showScreen(); render(); });
window.addEventListener('online', render);
window.addEventListener('offline', render);
matchMedia('(min-width: 1024px)').addEventListener('change', render);

// ---------- Install + service worker ----------
let installPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  installPrompt = e;
  $$('.install-btn').forEach((b) => (b.hidden = false));
});
window.addEventListener('appinstalled', () => {
  installPrompt = null;
  $$('.install-btn').forEach((b) => (b.hidden = true));
});
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
  // A new version took over: reload once so old and new files never run together.
  const hadController = !!navigator.serviceWorker.controller;
  let reloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || reloaded) return;
    reloaded = true;
    location.reload();
  });
}

// ---------- Boot ----------
async function boot() {
  S.loadError = null;
  render();
  try {
    await loadConstants();
    S.ready = true;
    // Drop saved picks that no longer exist after a patch.
    if (S.you != null && !getHero(S.you)) S.you = null;
    S.enemies = S.enemies.map((id) => (id != null && getHero(id) ? id : null));
    S.active = nextEmpty();
  } catch (err) {
    S.loadError = err;
    toast('The ravens have not returned. Check your connection.');
  }
  showScreen();
  render();
}
showScreen();
boot();
