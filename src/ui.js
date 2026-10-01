// DOM rendering for the panels. No game logic here: main.js hands data in.
import { fmtRank } from './net.js';
import { BLADE_SKINS } from './blade.js';

export const $ = (id) => document.getElementById(id);
export const show = (id) => $(id).classList.remove('hidden');
export const hide = (id) => $(id).classList.add('hidden');
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const num = (n) => Math.floor(Number(n) || 0).toLocaleString('en-US');

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
    return `<li class="${m.done ? 'done' : ''}"><span>${esc(m.text)}</span><span class="p">${esc(m.label || `${m.progress} / ${m.goal}`)} · ${m.points} pts</span><div class="bar"><i style="width:${Math.round(frac * 100)}%"></i></div></li>`;
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
    btn.innerHTML = `<i class="blade" style="background:rgb(${sk.core});box-shadow:0 0 10px 3px rgba(${sk.glow},0.7)"></i>${esc(b.name)}<small>${unlocked.has(b.id) ? '' : `rank ${b.level}.0`}</small>`;
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
  $('life-stats').innerHTML = rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join('');
}

export function renderOver(res, best, missionRes) {
  const where = res.mode === 'daily' ? `Daily · ${res.date}` : res.mode === 'classic' ? 'Classic' : 'Arcade · 60 s';
  $('o-eyebrow').textContent = where;
  $('o-score').textContent = num(res.score);
  $('o-tier').textContent = `M ${res.m.toFixed(2)} · ${res.tier}`;
  $('o-line').textContent = res.mode === 'classic' ? 'Three cracks. The glass got through.' : res.bossHits ? `The Core took ${res.bossHits} cuts before it broke.` : '';
  $('o-sliced').textContent = num(res.sliced);
  $('o-combo').textContent = res.maxCombo ? 'x' + res.maxCombo : '—';
  $('o-clean').textContent = num(res.cleans);
  $('o-best').textContent = num(best);
  $('o-combos').textContent = num(res.combos);
  $('o-boss').textContent = res.bossHits ? 'x' + res.bossHits : '—';
  $('o-shield').textContent = num(res.shieldHits);
  $('o-rank').textContent = '—';
  const done = $('o-missions');
  done.innerHTML = (res.bonuses || []).map((b) => `<div><b>Bonus</b> \u00b7 ${esc(b.name)} \u00b7 +${b.points}</div>`).join('');
  if (missionRes && missionRes.completed && missionRes.completed.length) {
    done.innerHTML += missionRes.completed.map((c) => `<div><b>Mission complete</b> · ${esc(c.text)} · +${c.points} pts</div>`).join('');
    if (missionRes.rankAfter && missionRes.rankBefore && missionRes.rankAfter.level > missionRes.rankBefore.level) done.innerHTML += `<div><b>Rank up</b> · Magnitude ${missionRes.rankAfter.level.toFixed(1)} · ${esc(missionRes.rankAfter.title)}</div>`;
    if (missionRes.newUnlocks && missionRes.newUnlocks.length) done.innerHTML += `<div><b>Blade unlocked</b> · ${missionRes.newUnlocks.map((s) => esc(BLADE_SKINS[s] ? BLADE_SKINS[s].name : s)).join(', ')}</div>`;
  }
}
