// Seasonal theme. The Halloween edition (#ROCKYHalloween, SEISCREATE #03) is the
// default until the end of November 2026. ?theme=classic or ?theme=halloween in the
// address, or the switch in Settings (stored in localStorage), picks one. The theme
// is read once at load; switching reloads. It is cosmetic only: hit radii, waves,
// scoring, the daily course and the leaderboard are the same in both themes.

let pick = null;
try { pick = localStorage.getItem('fl-theme'); } catch (e) { /* private mode */ }
try {
  const q = typeof location !== 'undefined' ? new URLSearchParams(location.search).get('theme') : null;
  if (q === 'halloween' || q === 'classic') pick = q;
} catch (e) { /* no location (tests) */ }
const seasonal = Date.now() < Date.UTC(2026, 11, 1);

export const THEME = pick === 'classic' || pick === 'halloween' ? pick : seasonal ? 'halloween' : 'classic';
export const HALLOWEEN = THEME === 'halloween';

export function setTheme(t) {
  try { localStorage.setItem('fl-theme', t === 'classic' ? 'classic' : 'halloween'); } catch (e) { /* ignore */ }
}

// Halloween palette, shared so every part of the game agrees. The chart paper turns
// into a night sheet: dark plum paper, faint orange grid, ghost-green pen traces.
export const HW = {
  night: '#150D20', paper: '#1E1430', paperEdge: '#120A1C', grid: '255,138,42', plum: '#3A1F4A',
  ink: '#F3E7EC', inkSoft: 'rgba(243,231,236,0.7)',
  moon: '#F6E7B0', moonGlow: '246,231,176',
  pumpkin: '#FF8A2A', pumpkinDeep: '#D2561A', ember: '255,150,60', stem: '#3B5A22',
  ghost: '#E8F2EA', ghostGlow: '190,255,210', slime: '#8DFF9E',
  bone: '#EDE3CF', candy: '#FF5FA2', potion: '#7B2FBE', mauve: '#825A6D', mauveHi: '#C29AAF',
};

// What each thing is called in the Halloween edition (classic names live in targets.js).
export const HNAMES = {
  orb: 'Pumpkin', lens: 'Skull', prism: 'Candy Corn', dart: 'Bat', star: 'Ghost',
  block: 'cursed potion', power: 'power-up', boss: 'The Great Pumpkin',
};
export const HPOWERS = {
  overclock: { name: 'Witching Hour', text: 'treats from every side' },
  amp: { name: 'Double Treat', text: 'every point counts double' },
  stasis: { name: 'Frozen Time', text: 'time slows, the clock stops' },
  quake: { name: 'Haunt', text: 'everything shatters' },
};
