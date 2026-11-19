// Turns a draft into: enemy damage prediction, counter items, and a 3-phase build.
import {
  THREATS, THREAT_ORDER, HOW, damageProfile, threatsOf, isSupport, ITEM_TAGS, CORE_ONLY, FILLERS,
  BOOTS, KEEP_COMPONENTS, FORCE_KEY, FORCE_PASSIVE, LANE_ONLY, LUXURY,
} from './rules.js';
import { getItem, itemKeyById } from './data.js';

const groupsFor = (role) => (isSupport(role) ? ['sup', 'any'] : role === 'Off' ? ['core', 'off', 'any'] : ['core', 'any']);

export function needsKey(key) {
  const it = getItem(key);
  if (!it) return false;
  if (FORCE_KEY.has(key)) return true;
  if (FORCE_PASSIVE.has(key)) return false;
  return it.active && !it.passive;
}

// ---------- Enemy damage ----------
export function enemyDamage(enemies) {
  if (!enemies.length) return null;
  const sum = [0, 0, 0];
  const rows = enemies.map((h) => {
    const d = damageProfile(h);
    d.forEach((v, i) => (sum[i] += v));
    const type = d[2] >= 40 ? 'Pure' : d[0] >= 60 ? 'Magical' : d[1] >= 60 ? 'Physical' : 'Mixed';
    return { hero: h, type };
  });
  const total = sum[0] + sum[1] + sum[2];
  const pct = sum.map((v) => Math.round((v / total) * 100));
  pct[1] = 100 - pct[0] - pct[2];
  // Headline = the biggest share, named, e.g. "Physical 52%".
  const names = ['Magical', 'Physical', 'Pure'];
  const top = pct.indexOf(Math.max(...pct));
  const verdict = `${names[top]} ${pct[top]}%`;
  const count = rows.filter((r) => r.type === names[top]).length;
  const lean = pct[0] >= 55 ? 'magical' : pct[1] >= 55 ? 'physical' : 'mixed';
  return { pct, rows, verdict, count, lean, n: enemies.length };
}

export function damageAdvice(dmg, counters) {
  const has = (k) => counters.some((c) => c.key === k);
  if (dmg.lean === 'magical') {
    const cover = ['black_king_bar', 'pipe', 'glimmer_cape'].find(has);
    return cover
      ? `Their sorcery is the greater danger. ${getItem(cover).name}, below, will ward you against it.`
      : 'Their sorcery is the greater danger. Seek Black King Bar, Pipe or Glimmer Cape.';
  }
  if (dmg.lean === 'physical') {
    const cover = ['butterfly', 'assault', 'shivas_guard', 'ghost', 'solar_crest', 'blade_mail'].find(has);
    return cover
      ? `Their steel is the greater danger. ${getItem(cover).name}, below, will blunt it.`
      : 'Their steel is the greater danger. Seek Assault Cuirass, Shiva’s Guard or Ghost Scepter.';
  }
  return 'Steel and sorcery in near-equal measure. Build health first, then armor and magic resistance as the war demands.';
}

// ---------- Counters ----------
function pickOption(threat, ctx) {
  const opts = THREATS[threat].options.filter((o) =>
    getItem(o.i) &&
    groupsFor(ctx.role).includes(o.g) &&
    (!o.t || o.t.includes(ctx.type)) &&
    (!o.melee || ctx.melee));
  if (!opts.length) return null;
  const passive = opts.find((o) => o.p);
  const active = opts.find((o) => !o.p);
  const chosen = ctx.passiveFirst ? passive || active : active || passive;
  let alt = '';
  // Only mention an alternative when there is one to name.
  if (chosen.p && active && getItem(active.i).cost < getItem(chosen.i).cost) {
    alt = `A cheaper blade: ${getItem(active.i).name} — press key`;
  } else if (!chosen.p && passive) alt = `A passive path: ${getItem(passive.i).name}`;
  return { option: chosen, alt };
}

/**
 * ctx: { you, role, type, passiveFirst }
 * Returns rows: { key, name, item, vs: [heroes], why: [labels], passive, alt }
 */
export function counterItems(enemies, ctx) {
  const byItem = new Map();
  const c = { ...ctx, melee: ctx.you && ctx.you.attack_type === 'Melee' };
  for (const threat of THREAT_ORDER) {
    const vs = enemies.filter((h) => threatsOf(h).includes(threat));
    if (!vs.length) continue;
    const pick = pickOption(threat, c);
    if (!pick) continue;
    const key = pick.option.i;
    const row = byItem.get(key) || {
      key, item: getItem(key), vs: [], why: [], pairs: [], passive: pick.option.p, alt: pick.alt, rank: THREAT_ORDER.indexOf(threat),
    };
    for (const h of vs) {
      if (!row.vs.includes(h)) row.vs.push(h);
      row.pairs.push({ hero: h, t: threat, why: THREATS[threat].why, how: HOW[threat] });
    }
    if (!row.why.includes(THREATS[threat].why)) row.why.push(THREATS[threat].why);
    byItem.set(key, row);
  }
  const rows = [...byItem.values()];
  rows.sort((a, b) => b.vs.length - a.vs.length || a.rank - b.rank);
  // Passive-first also orders passive items above press-key ones.
  if (ctx.passiveFirst) rows.sort((a, b) => Number(b.passive) - Number(a.passive));
  // Keep the 6 most relevant, then list them cheapest first (Shard/Scepter included).
  return [...rows.slice(0, 6), ...aghsCounters(enemies, ctx)].sort((a, b) => (a.item.cost || 0) - (b.item.cost || 0));
}

// Words in an Aghanim's upgrade description that answer a threat.
// Kept strict on purpose: only wording that clearly answers the threat.
const AGHS_HINTS = {
  inv: /true sight|reveals? (invisible|enemies|units|all)/,
  brk: /applies break|\bbreaks? (enemies|passives|the target)/,
  dis: /debuff immun|spell immun|spell block|strong dispel/,
  sil: /debuff immun|spell immun|basic dispel|strong dispel/,
  mag: /magic resistance|debuff immun|spell immun/,
  heal: /(heal|health|regen)\w* (reduc|restoration)|reduc\w* (heal|health|regen)|healing reduction/,
  ill: /\bcleave|bounces? between enemies/,
  sum: /\bcleave|bounces? between enemies/,
  esc: /\broots?\b|\bhex|\bstuns?\b|\bleash(es)? (the |enemies|target)|\btether/,
  ev: /true strike|cannot miss|pierces? evasion/,
  rc: /\bdisarm|\bblind|bonus armor|evasion/,
  buf: /\bpurge|dispels? (enemies|the target|enemy)/,
};

/** Shard / Scepter rows when your hero's upgrade text answers an enemy threat. */
function aghsCounters(enemies, ctx) {
  const a = ctx.aghs;
  if (!a) return [];
  const out = [];
  for (const [kind, key] of [['shard', 'aghanims_shard'], ['scepter', 'ultimate_scepter']]) {
    const up = a[kind];
    const item = getItem(key);
    if (!up || !item || !up.desc) continue;
    const clean = up.desc.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    // "can target debuff immune enemies" is not the same as gaining immunity.
    const text = clean.toLowerCase().replace(/(affect|affects|target|targets|through|pierc\w*)\s+(\w+\s+)?debuff[- ]immune\w*/g, '');
    const hits = Object.keys(AGHS_HINTS).filter((t) => AGHS_HINTS[t].test(text));
    const vs = enemies.filter((h) => threatsOf(h).some((t) => hits.includes(t)));
    if (!vs.length) continue;
    const why = [...new Set(hits.filter((t) => vs.some((h) => threatsOf(h).includes(t))).map((t) => THREATS[t].why))];
    const pairs = vs.flatMap((h) => threatsOf(h).filter((t) => hits.includes(t)).map((t) => ({ hero: h, t, why: THREATS[t].why, how: `empowers ${up.skill}` })));
    out.push({ key, item, vs, why, pairs, passive: !up.isNew, aghs: true, isNew: up.isNew, alt: `${up.skill}: ${clean}` });
  }
  return out;
}

// ---------- Full build ----------
const PHASES = ['Early', 'Mid', 'Late'];
const TIMES = {
  normal: { Early: '0–15m', Mid: '15–30m', Late: '30m+' },
  turbo: { Early: '0–8m', Mid: '8–18m', Late: '18m+' },
};
const LIMIT = { Early: 4, Mid: 4, Late: 4 };
const OPPOSITE = { physical: ['magical'], magical: ['physical'], hybrid: [], tanky: [] };

function usable(key, support) {
  const it = getItem(key);
  if (!it || !it.cost) return false;
  if (it.qual.startsWith('consumable') || it.qual === 'secret_shop') return false;
  if (it.qual === 'component' && !KEEP_COMPONENTS.has(key)) return false;
  if (support && CORE_ONLY.has(key)) return false;
  return true;
}

function tagScore(key, type, support) {
  const inTag = (t) => !!ITEM_TAGS[t]?.has(key);
  if (OPPOSITE[type].some(inTag) && !inTag(type)) return 0; // drop off-type items
  let s = 1;
  if (inTag(type)) s *= 1.6;
  if (support && inTag('support')) s *= 1.8;
  return s;
}

/**
 * pop: OpenDota itemPopularity response.
 * Returns phases: [{ label, time, items: [{ key, item, key: needsKey, counter }] }]
 */
export function fullBuild(pop, ctx, counters) {
  const support = isSupport(ctx.role);
  const used = new Set();
  const src = {
    Early: { ...(pop.start_game_items || {}), ...(pop.early_game_items || {}) },
    Mid: pop.mid_game_items || {},
    Late: pop.late_game_items || {},
  };
  const out = {};
  let hasBoots = false;
  for (const phase of PHASES) {
    const scored = Object.entries(src[phase])
      .map(([id, n]) => [itemKeyById(id), n])
      .filter(([k]) => k && usable(k, support) && !used.has(k))
      .map(([k, n]) => [k, n * tagScore(k, ctx.type, support)])
      .filter(([, s]) => s > 0)
      .sort((a, b) => b[1] - a[1]);
    // Fallback items keep each phase useful when data is thin or the type is off-meta.
    const fill = (support ? FILLERS.support : FILLERS[ctx.type])[phase];
    const minScore = scored.length ? scored[Math.min(scored.length - 1, 2)][1] : 1;
    fill.forEach((k, i) => {
      if (getItem(k) && !scored.some(([x]) => x === k)) scored.push([k, minScore * (ctx.type === ctx.best && !support ? 0.5 : 1.2) - i]);
    });
    scored.sort((a, b) => b[1] - a[1]);
    const picked = [];
    for (const [k] of scored) {
      if (picked.length >= LIMIT[phase]) break;
      if (used.has(k)) continue;
      if (BOOTS.has(k)) {
        // One pair of lane boots early/mid; Boots of Travel only as a late upgrade.
        const travel = k.startsWith('travel_boots');
        if (travel !== (phase === 'Late') || (!travel && hasBoots) || picked.some((x) => BOOTS.has(x))) continue;
        if (!travel) hasBoots = true;
      }
      picked.push(k);
    }
    // Drop components when the finished item is in the same phase.
    const final = picked.filter((k) => !picked.some((o) => o !== k && getItem(o).components.includes(k)));
    final.forEach((k) => used.add(k));
    out[phase] = final;
  }
  // Turbo: laning is short and gold flows fast, so skip lane-only items,
  // pull the most-bought core into Early, and leave room for a luxury item.
  const keep = new Set(); // Turbo additions survive the trim below
  if (ctx.mode === 'turbo') {
    out.Early = out.Early.filter((k) => !LANE_ONLY.has(k));
    const core = out.Mid.find((k) => !counters.some((c) => c.key === k)) || out.Mid[0];
    if (core) { out.Mid = out.Mid.filter((k) => k !== core); out.Early.push(core); keep.add(core); }
    const lux = (support ? LUXURY.support : LUXURY[ctx.type]).find((k) => getItem(k) && !used.has(k));
    if (lux) { out.Late.push(lux); used.add(lux); keep.add(lux); }
  }
  // Make sure every counter item is in the build, in a phase that fits its cost.
  for (const c of counters) {
    if (used.has(c.key)) continue;
    const cost = c.item.cost;
    const phase = cost <= 1200 ? 'Early' : cost <= 4500 ? 'Mid' : 'Late';
    out[phase].push(c.key);
    used.add(c.key);
  }
  // Keep each phase short: counters win over the least popular regular items.
  const counterKeys = new Set(counters.map((c) => c.key));
  const counterBy = new Map(counters.map((c) => [c.key, c]));
  for (const phase of PHASES) {
    const list = out[phase];
    for (let i = list.length - 1; list.length > LIMIT[phase] + 1 && i >= 0; i--) {
      if (!counterKeys.has(list[i]) && !keep.has(list[i])) list.splice(i, 1);
    }
  }
  return PHASES.map((label) => ({
    label,
    time: TIMES[ctx.mode][label],
    items: out[label].map((k) => ({ key: k, item: getItem(k), press: needsKey(k), counter: counterKeys.has(k), row: counterBy.get(k) || null })),
  }));
}
