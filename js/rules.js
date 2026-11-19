// Hand-made rules layer: enemy threats -> counter items, hero damage profiles,
// build-type fit, and item categories. Edit this file to tune the advice.
// Hero keys are OpenDota internal names without the "npc_dota_hero_" prefix.

// ---------- Threats and the items that answer them ----------
// Each option: i = item key, p = passive (no key press needed),
// g = who it suits ('core' | 'sup' | 'any'), t = build types it fits (omit = all).
export const THREATS = {
  ev: {
    why: 'evasion',
    options: [
      { i: 'monkey_king_bar', p: true, g: 'core', t: ['physical', 'hybrid', 'tanky'] },
      { i: 'bloodthorn', p: false, g: 'core', t: ['physical', 'hybrid'] },
    ],
  },
  inv: {
    why: 'invisible',
    options: [
      { i: 'gem', p: true, g: 'core' },
      { i: 'ward_sentry', p: false, g: 'sup' },
      { i: 'dust', p: false, g: 'any' },
    ],
  },
  mag: {
    why: 'magic burst',
    options: [
      { i: 'black_king_bar', p: false, g: 'core' },
      { i: 'pipe', p: false, g: 'off' },
      { i: 'glimmer_cape', p: false, g: 'sup' },
    ],
  },
  heal: {
    why: 'healing',
    options: [
      { i: 'skadi', p: true, g: 'core', t: ['physical', 'hybrid'] },
      { i: 'shivas_guard', p: true, g: 'core', t: ['magical', 'tanky', 'hybrid'] },
      { i: 'spirit_vessel', p: false, g: 'any' },
    ],
  },
  ill: {
    why: 'illusions',
    options: [
      { i: 'bfury', p: true, g: 'core', t: ['physical'], melee: true },
      { i: 'mjollnir', p: true, g: 'core', t: ['physical', 'hybrid'] },
      { i: 'radiance', p: true, g: 'core', t: ['tanky', 'hybrid'] },
      { i: 'shivas_guard', p: true, g: 'core', t: ['magical', 'tanky'] },
    ],
  },
  sum: {
    why: 'summons',
    options: [
      { i: 'bfury', p: true, g: 'core', t: ['physical'], melee: true },
      { i: 'mjollnir', p: true, g: 'core', t: ['physical', 'hybrid'] },
      { i: 'radiance', p: true, g: 'core', t: ['tanky', 'hybrid'] },
      { i: 'shivas_guard', p: true, g: 'core', t: ['magical', 'tanky'] },
      { i: 'crimson_guard', p: false, g: 'off' },
    ],
  },
  dis: {
    why: 'targeted disable',
    options: [
      { i: 'sphere', p: true, g: 'core' },
      { i: 'lotus_orb', p: false, g: 'any' },
    ],
  },
  sil: {
    why: 'silence',
    options: [
      { i: 'manta', p: false, g: 'core', t: ['physical', 'hybrid'] },
      { i: 'lotus_orb', p: false, g: 'any' },
      { i: 'cyclone', p: false, g: 'any', t: ['magical', 'hybrid'] },
    ],
  },
  rc: {
    why: 'right-click burst',
    options: [
      { i: 'butterfly', p: true, g: 'core', t: ['physical'] },
      { i: 'assault', p: true, g: 'core', t: ['tanky', 'hybrid'] },
      { i: 'shivas_guard', p: true, g: 'core', t: ['magical'] },
      { i: 'blade_mail', p: false, g: 'core', t: ['tanky'] },
      { i: 'ghost', p: false, g: 'sup' },
      { i: 'solar_crest', p: false, g: 'sup' },
    ],
  },
  esc: {
    why: 'escapes',
    options: [
      { i: 'skadi', p: true, g: 'core', t: ['physical', 'hybrid'] },
      { i: 'sheepstick', p: false, g: 'core', t: ['magical'] },
      { i: 'orchid', p: false, g: 'core', t: ['magical', 'hybrid'] },
      { i: 'abyssal_blade', p: false, g: 'core', t: ['tanky', 'physical'] },
      { i: 'rod_of_atos', p: false, g: 'sup' },
    ],
  },
  buf: {
    why: 'dispellable buffs',
    options: [
      { i: 'nullifier', p: false, g: 'core' },
      { i: 'diffusal_blade', p: false, g: 'core', t: ['physical'] },
    ],
  },
  brk: {
    why: 'strong passives',
    options: [{ i: 'silver_edge', p: false, g: 'core', t: ['physical', 'hybrid'] }],
  },
};

// One plain sentence per threat: how a counter item deals with it.
export const HOW = {
  ev: 'lets your blows land through their evasion',
  inv: 'tears away their cloak of invisibility',
  mag: 'wards you against their sorcery',
  heal: 'denies them their healing',
  ill: 'cuts down many at once, so their illusions fall swiftly',
  sum: 'cuts down many at once, so their summoned beasts fall swiftly',
  dis: 'turns aside the spells they aim at you',
  sil: 'breaks the silences and curses laid upon you',
  rc: 'blunts the blows of their blades',
  esc: 'binds and slows them, so they cannot flee',
  buf: 'strips away their wards and blessings',
  brk: 'breaks their passive gifts',
};

// Priority when there are more threats than room (lower = shown first).
export const THREAT_ORDER = ['ev', 'inv', 'ill', 'mag', 'dis', 'heal', 'sum', 'rc', 'esc', 'sil', 'brk', 'buf'];

// ---------- Hero profiles ----------
// d = damage: 'p' physical-heavy, 'm' magical-heavy, 'x' mixed, or [magical, physical, pure] %.
// t = threat tags (keys of THREATS).
const P = 'p', M = 'm', X = 'x';
export const HEROES = {
  antimage: [P, 'esc brk'],
  axe: [[30, 25, 45], 'brk'],
  bane: [[40, 10, 50], 'dis'],
  bloodseeker: [[10, 60, 30], 'sil buf'],
  crystal_maiden: [M, 'mag dis'],
  drow_ranger: [P, 'rc sil brk'],
  earthshaker: [M, 'mag'],
  juggernaut: [P, 'rc heal'],
  mirana: [X, 'inv esc'],
  morphling: [X, 'esc'],
  nevermore: [X, 'mag rc'],
  phantom_lancer: [P, 'ill esc brk'],
  puck: [M, 'mag esc sil'],
  pudge: [[70, 15, 15], 'dis'],
  razor: [X, 'rc'],
  sand_king: [M, 'mag inv'],
  storm_spirit: [M, 'mag esc'],
  sven: [P, 'rc buf dis'],
  tiny: [X, 'mag'],
  vengefulspirit: [X, 'dis'],
  windrunner: [X, 'ev esc buf'],
  zuus: [M, 'mag'],
  kunkka: [X, 'rc'],
  lina: [M, 'mag dis'],
  lion: [M, 'mag dis'],
  shadow_shaman: [M, 'dis sum'],
  slardar: [P, 'rc brk'],
  tidehunter: [M, 'brk'],
  witch_doctor: [M, 'mag heal'],
  lich: [M, 'mag buf'],
  riki: [P, 'inv sil brk'],
  enigma: [M, 'sum mag'],
  tinker: [M, 'mag esc'],
  sniper: [P, 'rc brk'],
  necrolyte: [M, 'heal mag dis'],
  warlock: [M, 'sum heal mag'],
  beastmaster: [X, 'sum dis'],
  queenofpain: [M, 'mag esc'],
  venomancer: [M, 'sum'],
  faceless_void: [P, 'esc brk rc'],
  skeleton_king: [P, 'rc heal dis brk'],
  death_prophet: [M, 'mag sil'],
  phantom_assassin: [P, 'ev rc brk'],
  pugna: [M, 'mag heal sum'],
  templar_assassin: [P, 'rc inv'],
  viper: [M, 'brk'],
  luna: [X, 'rc'],
  dragon_knight: [X, 'rc heal dis'],
  dazzle: [M, 'heal'],
  rattletrap: [M, 'mag'],
  leshrac: [M, 'mag'],
  furion: [X, 'sum esc'],
  life_stealer: [P, 'rc heal'],
  dark_seer: [M, 'buf'],
  clinkz: [P, 'inv rc esc'],
  omniknight: [[40, 30, 30], 'heal buf'],
  enchantress: [[30, 10, 60], 'heal sum'],
  huskar: [X, 'heal brk rc'],
  night_stalker: [X, 'sil rc'],
  broodmother: [X, 'sum inv rc'],
  bounty_hunter: [X, 'inv esc'],
  weaver: [P, 'inv esc heal brk'],
  jakiro: [M, 'mag'],
  batrider: [M, 'dis esc'],
  chen: [M, 'sum heal'],
  spectre: [[10, 50, 40], 'rc brk'],
  ancient_apparition: [M, 'mag'],
  doom_bringer: [X, 'sil dis'],
  ursa: [P, 'rc brk'],
  spirit_breaker: [X, 'brk'],
  gyrocopter: [X, 'rc mag'],
  alchemist: [X, 'heal rc'],
  invoker: [M, 'mag sum'],
  silencer: [[40, 10, 50], 'sil'],
  obsidian_destroyer: [[40, 10, 50], 'mag'],
  lycan: [P, 'sum rc esc'],
  brewmaster: [X, 'ev sum'],
  shadow_demon: [M, 'dis'],
  lone_druid: [P, 'sum rc'],
  chaos_knight: [P, 'ill rc dis'],
  meepo: [P, 'ill esc'],
  treant: [X, 'heal buf inv'],
  ogre_magi: [M, 'buf dis mag'],
  undying: [M, 'sum heal'],
  rubick: [M, 'mag dis'],
  disruptor: [M, 'mag'],
  nyx_assassin: [M, 'mag inv'],
  naga_siren: [P, 'ill'],
  keeper_of_the_light: [M, 'mag'],
  wisp: [M, 'heal'],
  visage: [X, 'sum'],
  slark: [P, 'esc heal brk rc'],
  medusa: [P, 'rc'],
  troll_warlord: [P, 'rc'],
  centaur: [M, 'brk'],
  magnataur: [X, 'buf'],
  shredder: [[30, 10, 60], 'heal'],
  bristleback: [X, 'brk'],
  tusk: [X, ''],
  skywrath_mage: [M, 'mag sil'],
  abaddon: [X, 'heal buf brk'],
  elder_titan: [[30, 30, 40], 'mag'],
  legion_commander: [P, 'dis buf'],
  techies: [M, 'mag'],
  ember_spirit: [X, 'esc mag'],
  earth_spirit: [M, 'esc sil'],
  abyssal_underlord: [M, ''],
  terrorblade: [P, 'ill rc'],
  phoenix: [M, 'mag'],
  oracle: [M, 'heal'],
  winter_wyvern: [M, 'heal'],
  arc_warden: [X, 'ill rc'],
  monkey_king: [P, 'rc esc'],
  dark_willow: [M, 'mag esc'],
  pangolier: [X, 'esc'],
  grimstroke: [M, 'mag dis'],
  hoodwink: [X, 'esc'],
  void_spirit: [M, 'esc mag'],
  snapfire: [M, 'mag'],
  mars: [X, 'brk'],
  ringmaster: [M, 'dis'],
  dawnbreaker: [X, 'heal'],
  marci: [P, 'esc'],
  primal_beast: [M, 'dis'],
  muerta: [X, 'rc mag'],
  kez: [P, 'esc rc'],
  largo: [M, 'heal'],
};

const DMG = { p: [15, 85, 0], m: [85, 15, 0], x: [50, 50, 0] };

/** Damage profile [magical, physical, pure] for a hero; falls back to attack type for new heroes. */
export function damageProfile(hero) {
  const row = HEROES[hero.key];
  if (row) return Array.isArray(row[0]) ? row[0] : DMG[row[0]];
  if (hero.primary_attr === 'int') return DMG.m;
  if (hero.primary_attr === 'agi') return DMG.p;
  return DMG.x;
}

export function threatsOf(hero) {
  const row = HEROES[hero.key];
  if (row) return row[1].split(' ').filter(Boolean);
  // Unknown (brand-new) hero: infer a little from OpenDota roles.
  const r = hero.roles || [];
  const t = [];
  if (r.includes('Nuker')) t.push('mag');
  if (r.includes('Carry') && hero.attack_type) t.push('rc');
  if (r.includes('Escape')) t.push('esc');
  return t;
}

// ---------- Build types ----------
export const BUILD_TYPES = ['physical', 'magical', 'hybrid', 'tanky'];
export const TYPE_NAMES = { physical: 'Physical', magical: 'Magical', hybrid: 'Hybrid', tanky: 'Tanky' };
// Team-chat label for "what are you building?"
export const TEAM_LABEL = {
  physical: 'Right-click · Physical',
  magical: 'Spell burst · Magical',
  hybrid: 'Hybrid · Spells + hits',
  tanky: 'Tank · Frontline',
};
export const SUPPORT_LABEL = {
  physical: 'Support · Physical',
  magical: 'Support · Spells',
  hybrid: 'Support · Utility',
  tanky: 'Support · Tanky saves',
};

// Heroes whose best build type isn't obvious from their attribute.
const BEST_OVERRIDE = {
  axe: 'tanky', centaur: 'tanky', tidehunter: 'tanky', mars: 'tanky', bristleback: 'tanky',
  shredder: 'tanky', primal_beast: 'tanky', abyssal_underlord: 'tanky', brewmaster: 'tanky',
  abaddon: 'tanky', legion_commander: 'physical', slardar: 'physical', chaos_knight: 'physical',
  life_stealer: 'physical', skeleton_king: 'physical', sven: 'physical', dragon_knight: 'physical',
  huskar: 'physical', kunkka: 'physical', tiny: 'physical', night_stalker: 'physical',
  ogre_magi: 'magical', windrunner: 'physical', marci: 'physical', meepo: 'physical',
  arc_warden: 'physical', dazzle: 'magical', bane: 'magical', sand_king: 'magical',
  enigma: 'magical', venomancer: 'magical', death_prophet: 'magical', batrider: 'magical',
  void_spirit: 'magical', snapfire: 'magical', techies: 'magical', nyx_assassin: 'magical',
  earthshaker: 'magical', rattletrap: 'tanky', lycan: 'physical', ember_spirit: 'hybrid',
};

export function bestType(hero) {
  if (BEST_OVERRIDE[hero.key]) return BEST_OVERRIDE[hero.key];
  const a = hero.primary_attr, r = hero.roles || [];
  if (a === 'agi') return 'physical';
  if (a === 'int') return 'magical';
  if (a === 'str') return r.includes('Carry') && !r.includes('Initiator') ? 'physical' : 'tanky';
  return 'hybrid';
}

/** Fit label for each build type: "Best fit" | "Works" | "Off-meta". */
export function typeFit(hero) {
  const best = bestType(hero);
  const off = {
    physical: ['magical'],
    magical: hero.primary_attr === 'int' ? ['physical', 'tanky'] : ['physical'],
    tanky: (hero.roles || []).includes('Nuker') ? [] : ['magical'],
    hybrid: [],
  }[best];
  const fit = {};
  for (const t of BUILD_TYPES) fit[t] = t === best ? 'Best fit' : off.includes(t) ? 'Unwise' : 'Serves';
  return { best, fit };
}

export const ROLES = ['Carry', 'Mid', 'Off', 'Sup 4', 'Sup 5'];
export const isSupport = (role) => role === 'Sup 4' || role === 'Sup 5';

export function suggestRole(hero) {
  const r = hero.roles || [], a = hero.primary_attr;
  const best = bestType(hero);
  if (r.includes('Support') && !r.includes('Carry')) return r.includes('Initiator') || r.includes('Escape') ? 'Sup 4' : 'Sup 5';
  if (best === 'tanky') return 'Off';
  if (r.includes('Carry') && (a === 'agi' || best === 'physical')) return 'Carry';
  if (r.includes('Support')) return 'Sup 4';
  return 'Mid';
}

// ---------- Item categories used to reshape the build ----------
const list = (s) => new Set(s.split(/\s+/).filter(Boolean));
export const ITEM_TAGS = {
  physical: list(`bfury butterfly greater_crit satanic monkey_king_bar desolator lesser_crit mjollnir maelstrom
    silver_edge invis_sword skadi manta diffusal_blade disperser basher abyssal_blade bloodthorn echo_sabre armlet
    power_treads wraith_band falcon_blade hurricane_pike dragon_lance moon_shard rapier yasha sange_and_yasha
    orb_of_corrosion mask_of_madness nullifier harpoon mage_slayer witch_blade`),
  magical: list(`kaya kaya_and_sange yasha_and_kaya aether_lens octarine_core dagon dagon_2 dagon_3 dagon_4 dagon_5
    ethereal_blade sheepstick veil_of_discord cyclone wind_waker bloodstone arcane_boots null_talisman devastator
    phylactery angels_demise witch_blade gungir refresher`),
  tanky: list(`heart crimson_guard pipe vanguard blade_mail shivas_guard lotus_orb eternal_shroud assault
    heavens_halberd sange_and_yasha kaya_and_sange radiance bracer soul_ring guardian_greaves pavise
    boots_of_bearing armlet helm_of_iron_will black_king_bar`),
  // Items that reward both spells and right-clicks.
  hybrid: list(`witch_blade devastator angels_demise kaya_and_sange yasha_and_kaya sange_and_yasha bloodthorn orchid
    mage_slayer echo_sabre diffusal_blade disperser nullifier gungir maelstrom mjollnir ultimate_scepter aghanims_shard
    falcon_blade revenants_brooch phylactery khanda`),
  support: list(`glimmer_cape force_staff ghost solar_crest pavise urn_of_shadows spirit_vessel tranquil_boots
    arcane_boots boots_of_bearing guardian_greaves mekansm holy_locket rod_of_atos cyclone lotus_orb aether_lens
    magic_wand wind_lace ward_sentry dust gem ultimate_scepter aeon_disk blink`),
};
// Items a support should not be told to buy.
export const CORE_ONLY = list(`bfury butterfly greater_crit satanic monkey_king_bar skadi radiance rapier moon_shard
  abyssal_blade bloodthorn silver_edge desolator mjollnir manta assault heart hand_of_midas sange_and_yasha
  diffusal_blade disperser maelstrom lesser_crit echo_sabre armlet power_treads`);

// Fallback items per build type and phase, used when popular data is thin
// or the chosen build type is off-meta for this hero.
export const FILLERS = {
  physical: { Early: ['wraith_band', 'power_treads', 'magic_wand'], Mid: ['black_king_bar', 'manta', 'desolator'], Late: ['butterfly', 'satanic', 'greater_crit'] },
  magical: { Early: ['null_talisman', 'arcane_boots', 'magic_wand'], Mid: ['kaya', 'aether_lens', 'black_king_bar'], Late: ['octarine_core', 'sheepstick', 'ethereal_blade'] },
  hybrid: { Early: ['magic_wand', 'power_treads', 'bracer'], Mid: ['witch_blade', 'kaya_and_sange', 'black_king_bar'], Late: ['devastator', 'skadi', 'bloodthorn'] },
  tanky: { Early: ['vanguard', 'phase_boots', 'bracer'], Mid: ['blink', 'blade_mail', 'crimson_guard'], Late: ['shivas_guard', 'heart', 'assault'] },
  support: { Early: ['tranquil_boots', 'magic_wand', 'wind_lace'], Mid: ['glimmer_cape', 'force_staff', 'ghost'], Late: ['ultimate_scepter', 'aeon_disk', 'lotus_orb'] },
};

export const BOOTS = list(`boots travel_boots travel_boots_2 phase_boots power_treads arcane_boots tranquil_boots guardian_greaves boots_of_bearing`);
// Turbo: items that only matter in a long lane, and late-game luxuries.
export const LANE_ONLY = list('quelling_blade orb_of_venom blight_stone magic_stick orb_of_frost ring_of_protection');
export const LUXURY = {
  physical: ['moon_shard', 'satanic', 'rapier'],
  magical: ['refresher', 'moon_shard', 'sheepstick'],
  hybrid: ['moon_shard', 'refresher'],
  tanky: ['heart', 'refresher', 'moon_shard'],
  support: ['aeon_disk', 'refresher', 'ultimate_scepter'],
};
// Components worth listing on their own.
export const KEEP_COMPONENTS = list('quelling_blade gem');
// Items that need a key press even though they also have a passive part.
export const FORCE_KEY = list('abyssal_blade mjollnir diffusal_blade');
// Items whose value is passive even though they also have an active.
export const FORCE_PASSIVE = list('gem sphere');

// ---------- Search nicknames on top of OpenDota's aliases ----------
export const NICKNAMES = {
  abyssal_underlord: 'ul underlord pit', shredder: 'timber tb', furion: 'np prophet', necrolyte: 'necro',
  obsidian_destroyer: 'od', windrunner: 'wr', skeleton_king: 'wk', rattletrap: 'clock cw',
  queenofpain: 'qop', ancient_apparition: 'aa', keeper_of_the_light: 'kotl', spirit_breaker: 'sb bara',
  nevermore: 'sf', zuus: 'zeus', juggernaut: 'jugg', terrorblade: 'tb', phantom_assassin: 'pa',
  templar_assassin: 'ta', legion_commander: 'lc', witch_doctor: 'wd', chaos_knight: 'ck', bristleback: 'bb',
  storm_spirit: 'ss storm', phantom_lancer: 'pl', lone_druid: 'ld', night_stalker: 'ns', dark_seer: 'ds',
  sand_king: 'sk', venomancer: 'veno', enchantress: 'ench', brewmaster: 'brew', bounty_hunter: 'bh',
  beastmaster: 'bm', centaur: 'cent', dragon_knight: 'dk', death_prophet: 'dp', elder_titan: 'et',
  gyrocopter: 'gyro', invoker: 'invo', leshrac: 'lesh', lycan: 'lyc', monkey_king: 'mk', ogre_magi: 'ogre om',
  omniknight: 'omni', pangolier: 'pango', vengefulspirit: 'venge vs', warlock: 'wl', winter_wyvern: 'ww',
  shadow_demon: 'sd', primal_beast: 'pb', abaddon: 'abba', alchemist: 'alch', batrider: 'bat', bloodseeker: 'bs',
  crystal_maiden: 'cm', earthshaker: 'es shaker', faceless_void: 'fv void', anti_mage: 'am', antimage: 'am',
  life_stealer: 'ls naix', drow_ranger: 'drow', troll_warlord: 'troll', naga_siren: 'naga', skywrath_mage: 'sky',
  treant: 'tree', wisp: 'io', magnataur: 'mag magnus', void_spirit: 'void', earth_spirit: 'es kaolin',
  ember_spirit: 'ember', arc_warden: 'aw arc', dark_willow: 'dw', snapfire: 'snap', hoodwink: 'hood',
};

// ---------- Hero difficulty (Valve's own 1–3 rating) ----------
// Snapshot from dota2.com/datafeed/herolist, which browsers cannot read directly (no CORS).
// New heroes show no difficulty until this list is refreshed.
export const COMPLEXITY = {"1":1,"2":1,"3":2,"4":1,"5":1,"6":1,"7":2,"8":1,"9":2,"10":3,"11":2,"12":2,"13":2,"14":2,"15":1,"16":2,"17":2,"18":1,"19":2,"20":1,"21":2,"22":1,"23":2,"25":1,"26":1,"27":1,"28":1,"29":1,"30":1,"31":1,"32":1,"33":2,"34":2,"35":1,"36":1,"37":1,"38":2,"39":2,"40":1,"41":2,"42":1,"43":1,"44":1,"45":2,"46":2,"47":1,"48":1,"49":1,"50":1,"51":2,"52":1,"53":2,"54":2,"55":1,"56":2,"57":1,"58":2,"59":1,"60":1,"61":2,"62":1,"63":2,"64":1,"65":2,"66":3,"67":2,"68":2,"69":2,"70":1,"71":1,"72":1,"73":1,"74":3,"75":2,"76":2,"77":2,"78":3,"79":2,"80":3,"81":1,"82":3,"83":2,"84":1,"85":1,"86":3,"87":2,"88":2,"89":2,"90":2,"91":3,"92":3,"93":2,"94":1,"95":2,"96":1,"97":2,"98":2,"99":1,"100":1,"101":1,"102":1,"103":2,"104":1,"105":2,"106":2,"107":3,"108":2,"109":2,"110":2,"111":3,"112":2,"113":3,"114":2,"119":2,"120":2,"121":2,"123":2,"126":2,"128":1,"129":1,"131":2,"135":1,"136":2,"137":1,"138":1,"145":3,"155":2};
export const DIFFICULTY = { 1: 'Easy', 2: 'Moderate', 3: 'Hard' };
