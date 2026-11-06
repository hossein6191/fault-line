// DOM rendering for the panels. No game logic here: main.js hands data in.
import { fmtRank } from './net.js';
import { BLADE_SKINS } from './blade.js';
import { HALLOWEEN, HW, HNAMES, HPOWERS } from './theme.js';
import { RockyHost } from './rocky.js';

export const $ = (id) => document.getElementById(id);
export const show = (id) => $(id).classList.remove('hidden');
export const hide = (id) => $(id).classList.add('hidden');
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const num = (n) => Math.floor(Number(n) || 0).toLocaleString('en-US');

// ---- Halloween names ----
// Text from missions.js and game.js names the classic things; in the Halloween
// edition it is rewritten with HNAMES / HPOWERS before it reaches the screen.
const cap = (w) => w.charAt(0).toUpperCase() + w.slice(1);
const plural = (n) => (/corn$/i.test(n) ? n : n + 's');
const potion = cap(HNAMES.block.split(' ').pop());   // "Potion"
const SWAPS = [
  [/\bNothing shielded was cut\b/g, `No ${HNAMES.block} was cut`],
  [/\bshielded blocks\b/gi, plural(HNAMES.block)],
  [/\bshielded block\b/gi, HNAMES.block],
  [/\bShield hits\b/g, `${potion} hits`],
  ...[['orb', 'Orbs', 'Orb'], ['lens', 'Lenses', 'Lens'], ['prism', 'Prisms', 'Prism'], ['dart', 'Darts', 'Dart'], ['star', 'Stars', 'Star']]
    .map(([k, pl, sg]) => [new RegExp(`\\b(${pl}|${sg})\\b`, 'gi'), (m) => (m.toLowerCase() === pl.toLowerCase() ? plural(HNAMES[k]) : HNAMES[k])]),
  [/\b[Tt]he Core\b/g, HNAMES.boss],
  [/\bCore\b/g, HNAMES.boss],
  ...[['overclock', 'Overclock'], ['amp', 'Amplifier'], ['stasis', 'Stasis'], ['quake', 'Quake']]
    .map(([k, w]) => [new RegExp(`\\b${w}(s?)\\b`, 'g'), (m, s) => HPOWERS[k].name + s]),
  [/\btargets\b/g, 'treats'], [/\btarget\b/g, 'treat'],
  [/\bShatter\b/g, 'Smash'], [/\bShattered\b/g, 'Sliced'], [/\bshattered\b/g, 'sliced'],
];
export const hn = (text) => (HALLOWEEN ? SWAPS.reduce((t, [re, to]) => t.replace(re, to), String(text)) : String(text));

// Static screen text that names things (index.html carries the same words, so
// nothing flickers when this runs).
export function themeScreens() {
  if (!HALLOWEEN) return;
  const names = ['overclock', 'amp', 'stasis', 'quake'].map((k) => HPOWERS[k].name);
  $('hw-lede').textContent = `Jack-o'-Rocky's haunted seismograph: slice the treats, never the ${HNAMES.block}.`;
  $('hw-powers').textContent = `Slice a power-up for ${names.slice(0, -1).join(', ')} or ${names[names.length - 1]}.`;
  const label = (id, text) => { const dd = $(id); if (dd && dd.previousElementSibling) dd.previousElementSibling.textContent = text; };
  label('o-sliced', 'Sliced');
  label('o-boss', HNAMES.boss.replace(/^The /, ''));
  label('o-shield', `${potion} hits`);
  document.title = 'Fault Line · Halloween edition';
  const tc = document.querySelector('meta[name="theme-color"]');
  if (tc) tc.setAttribute('content', HW.night);
}

export function renderBoard(data, pid, boardName) {
  const list = $('board-list'), status = $('board-status'), you = $('board-you');
  list.innerHTML = ''; you.textContent = '';
  if (!data) { status.textContent = 'Could not reach the leaderboard.'; return; }
  if (!data.online) { status.textContent = 'The leaderboard is offline on this host. Scores are kept in this browser only.'; return; }
  const label = boardName === 'daily' ? `Today · ${data.date}` : boardName === 'classic' ? 'Classic · all time' : 'Arcade · all time';
  if (!data.entries.length) { status.textContent = `${label} · no rounds posted yet. Be the first.`; return; }
  status.textContent = `${label} · ${data.total} player${data.total === 1 ? '' : 's'}`;
  list.innerHTML = data.entries.map((e) => `<li class="${e.you ? 'you' : ''}"><span class="r">#${e.rank}</span><span class="n">${esc(e.name || 'Player')}</span><span class="m">${num(e.score)}</span><span class="d">x${num(e.maxCombo)} · ${num(e.sliced)} cut</span></li>`).join('');
  if (data.you) you.textContent = `You: ${fmtRank(data.you.rank, data.total)} · ${num(data.you.score)}`;
  else if (pid) you.textContent = 'You have not posted a round on this board yet.';
}

export function renderRank(rank) {
  $('rank-level').textContent = rank.level.toFixed(1);
  $('rank-title').textContent = rank.title;
  $('rank-bar').style.width = Math.round(rank.progress * 100) + '%';
  $('rank-next').textContent = rank.nextAt == null ? `${rank.points} pts · top rank` : `${rank.points} / ${rank.nextAt} pts to the next magnitude`;
  $('rank-badge').textContent = rank.level.toFixed(1);
}

export function renderMissions(list) {
  $('mission-list').innerHTML = list.map((m) => {
    const frac = m.goal ? Math.min(1, m.progress / m.goal) : 0;
    return `<li class="${m.done ? 'done' : ''}"><span>${esc(hn(m.text))}</span><span class="p">${esc(m.label || `${m.progress} / ${m.goal}`)} · ${m.points} pts</span><div class="bar"><i style="width:${Math.round(frac * 100)}%"></i></div></li>`;
  }).join('');
}

export function renderBlades(missions, blades, onPick) {
  const unlocked = new Set(missions.unlocks());
  const current = missions.getBlade();
  const el = $('blades');
  el.innerHTML = '';
  for (const b of blades) {
    const sk = BLADE_SKINS[b.id] || BLADE_SKINS.pearl;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'skin' + (b.id === current ? ' on' : '') + (unlocked.has(b.id) ? '' : ' locked');
    btn.innerHTML = `<i class="blade" style="background:rgb(${sk.core});box-shadow:0 0 10px 3px rgba(${sk.glow},0.7)"></i>${esc(HALLOWEEN && sk.name ? sk.name : b.name)}<small>${unlocked.has(b.id) ? '' : `rank ${b.level}.0`}</small>`;
    btn.disabled = !unlocked.has(b.id);
    btn.addEventListener('click', () => onPick(b.id));
    el.appendChild(btn);
  }
}

export function renderStats(s) {
  const rows = [
    ['Rounds', s.runs], ['Best arcade', s.bestArcade || '—'], ['Best classic', s.bestClassic || '—'], ['Shattered', num(s.sliced)],
    ['Aftershocks', num(s.combos)], ['Best aftershock', s.bestCombo ? 'x' + s.bestCombo : '—'], ['Quakes', num(s.quakes)], ['Shield hits', num(s.shieldHits)],
  ];
  $('life-stats').innerHTML = rows.map(([k, v]) => `<div><dt>${esc(hn(k))}</dt><dd>${esc(v)}</dd></div>`).join('');
}

export function renderOver(res, best, missionRes) {
  const where = res.mode === 'daily' ? `Daily · ${res.date}` : res.mode === 'classic' ? 'Classic' : 'Arcade · 60 s';
  $('o-eyebrow').textContent = where;
  $('o-score').textContent = num(res.score);
  $('o-tier').textContent = `M ${res.m.toFixed(2)} · ${res.tier}`;
  $('o-line').textContent = HALLOWEEN
    ? (res.mode === 'classic' ? 'Three cracks. The treats got away.' : res.bossHits ? `${HNAMES.boss} took ${res.bossHits} cuts before it split.` : '')
    : (res.mode === 'classic' ? 'Three cracks. The glass got through.' : res.bossHits ? `The Core took ${res.bossHits} cuts before it broke.` : '');
  $('o-sliced').textContent = num(res.sliced);
  $('o-combo').textContent = res.maxCombo ? 'x' + res.maxCombo : '—';
  $('o-clean').textContent = num(res.cleans);
  $('o-best').textContent = num(best);
  $('o-combos').textContent = num(res.combos);
  $('o-boss').textContent = res.bossHits ? 'x' + res.bossHits : '—';
  $('o-shield').textContent = num(res.shieldHits);
  $('o-rank').textContent = '—';
  const done = $('o-missions');
  done.innerHTML = (res.bonuses || []).map((b) => `<div><b>Bonus</b> \u00b7 ${esc(hn(b.name))} \u00b7 +${b.points}</div>`).join('');
  if (missionRes && missionRes.completed && missionRes.completed.length) {
    done.innerHTML += missionRes.completed.map((c) => `<div><b>Mission complete</b> · ${esc(hn(c.text))} · +${c.points} pts</div>`).join('');
    if (missionRes.rankAfter && missionRes.rankBefore && missionRes.rankAfter.level > missionRes.rankBefore.level) done.innerHTML += `<div><b>Rank up</b> · Magnitude ${missionRes.rankAfter.level.toFixed(1)} · ${esc(missionRes.rankAfter.title)}</div>`;
    if (missionRes.newUnlocks && missionRes.newUnlocks.length) done.innerHTML += `<div><b>Blade unlocked</b> · ${missionRes.newUnlocks.map((s) => esc(BLADE_SKINS[s] ? BLADE_SKINS[s].name : s)).join(', ')}</div>`;
  }
}

// ---- the title stage: Jack-o'-Rocky with a bat about his head, waving now and then ----
function bat(g, x, y, s, flap) {
  const up = Math.sin(flap), tip = -6 - up * 7;
  g.save(); g.translate(x, y); g.scale(s, s);
  g.beginPath();
  for (const d of [-1, 1]) {
    g.moveTo(0, -1);
    g.quadraticCurveTo(d * 5, tip * 0.6 - 2, d * 12, tip);
    g.quadraticCurveTo(d * 10, tip * 0.3 + 1, d * 9, 2 - up);
    g.quadraticCurveTo(d * 6.5, 0, d * 5, 3 - up * 0.5);
    g.quadraticCurveTo(d * 3, 1, 0, 3);
  }
  g.fillStyle = '#0B0612'; g.fill();
  g.strokeStyle = 'rgba(243,231,236,0.45)'; g.lineWidth = 0.7 / s; g.stroke();
  g.beginPath(); g.ellipse(0, 0.6, 2.2, 3, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = HW.pumpkin; g.fillRect(-1.3, -0.8, 0.9, 0.9); g.fillRect(0.4, -0.8, 0.9, 0.9);
  g.restore();
}

function drawStage(cv, host, t) {
  const w = cv.clientWidth, h = cv.clientHeight;
  if (!w || !h) return;
  const dpr = Math.min(3, window.devicePixelRatio || 1);
  const bw = Math.round(w * dpr), bh = Math.round(h * dpr);
  if (cv.width !== bw || cv.height !== bh) { cv.width = bw; cv.height = bh; }
  const g = cv.getContext('2d');
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, w, h);
  // the host brings his own lantern light and shadow; feet at the bottom, facing the text
  const fy = h - Math.max(6, h * 0.05), fx = w * 0.5;
  const s = Math.min((fy - 4) / 112, (w * 0.5) / 46);
  g.save();
  g.translate(fx + 2 * s, 0); g.scale(-1, 1);
  host.draw(g, 0, fy, s);
  g.restore();
  // a bat on a lazy loop about his head
  const bx = w * (0.5 + 0.34 * Math.sin(t * 0.55)), by = h * (0.12 + 0.06 * Math.sin(t * 1.1 + 1));
  bat(g, bx, by, Math.max(0.7, w / 120), t * 14);
}

// Draws the stage while the title is on screen; sleeps while it is hidden.
// Rocky idles (breathing, blinking, looking about) and waves every few seconds.
export function mountTitleRocky() {
  const cv = $('title-rocky'), panel = $('title');
  if (!HALLOWEEN || !cv || !panel) return;
  let calm = false;
  try { calm = matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { /* ignore */ }
  const host = new RockyHost();
  host.react('wave', 2);
  let raf = 0, last = -1, prev = 0, t = 0, nextWave = 6;
  const frame = (now) => {
    raf = 0;
    if (panel.classList.contains('hidden') || document.hidden) { prev = 0; return; }
    if (calm) { host.update(0.6); try { drawStage(cv, host, 1.2); } catch (e) { /* the stage is a nicety */ } return; }
    if (now - last >= 30) {
      const dt = prev ? Math.min(0.1, (now - prev) / 1000) : 0;
      prev = now; last = now; t += dt;
      if (t >= nextWave) { host.react('wave', 2); nextWave = t + 5 + Math.random() * 3; }
      host.update(dt);
      try { drawStage(cv, host, t); } catch (e) { return; }
    }
    raf = requestAnimationFrame(frame);
  };
  const kick = () => { if (!raf) raf = requestAnimationFrame(frame); };
  new MutationObserver(() => { last = -1; kick(); }).observe(panel, { attributes: true, attributeFilter: ['class'] });
  document.addEventListener('visibilitychange', kick);
  window.addEventListener('resize', () => { last = -1; kick(); });
  kick();
}
