import { Game } from './game.js';
import { Input } from './input.js';
import { renderCard } from './card.js';
import { net, fmtRank } from './net.js';
import { Missions, BLADES } from './missions.js';
import { registerPwa, canInstall, promptInstall, onInstallChange } from './pwa.js';
import { $, show, hide, renderBoard, renderRank, renderMissions, renderBlades, renderStats, renderOver } from './ui.js';

const canvas = $('game');
const pageUrl = location.origin + location.pathname;
const params = new URLSearchParams(location.search);
const read = (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } };
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* private mode */ } };

const MODE_TEXT = {
  arcade: 'Sixty seconds. Cut everything made of glass, then break the Core.',
  classic: 'No clock. A missed target or a cut block is a crack. Three cracks ends it.',
  daily: 'Today’s course, the same for everyone. One shared board.',
};

// ---- state ----
let calm = false;
try { calm = matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { /* ignore */ }
const settings = Object.assign({ sound: true, music: true, shake: !calm, vibrate: true, mute: false }, read('fl-settings', {}));
let mode = 'arcade';
const best = Object.assign({ arcade: 0, classic: 0, daily: 0, dailyDate: '' }, read('fl-best', {}));
let lastCard = null, lastRes = null, lastStart = null, pendingStart = null, submitted = null, overAt = 0, starting = false, runNo = 0;
const missions = new Missions();

const game = new Game(canvas, {
  onEvent: (name, value) => { missions.track(name, value); if (missions.runTick) missions.runTick({ score: game.score }); },
  onPause: (paused) => { if (paused) { show('pause'); hide('btn-pause'); } else { hide('pause'); show('btn-pause'); } },
  onVibrate: (pattern) => { if (settings.vibrate && input.touch && navigator.vibrate) { try { navigator.vibrate(pattern); } catch (e) { /* ignore */ } } },
  onTutorial: () => write('fl-tut', 1),
  onOver: onOver,
});
game.skin = missions.getBlade();
if (params.has('debug')) window.__fl = game;   // console access while developing

const input = new Input(game, {
  gesture: () => game.sfx.ensure(),
  pause: () => { if (game.state === 'playing' || game.state === 'paused') game.togglePause(); else closePanels(); },
  mute: () => { settings.mute = !settings.mute; applySettings(); },
  restart: () => { if (game.state === 'title' || game.state === 'over') startRun(); },
});
// iOS only counts some events as a user gesture, and can suspend audio again later
for (const t of ['pointerup', 'touchend', 'click', 'keydown']) window.addEventListener(t, () => { if (!document.hidden && game.state !== 'paused') game.sfx.ensure(); }, true);
document.addEventListener('visibilitychange', () => {
  const c = game.sfx.ctx;
  if (!c) return;
  // stay silent behind the pause panel; Resume wakes the audio again
  try { if (document.hidden) c.suspend(); else if (game.state !== 'paused') c.resume(); } catch (e) { /* ignore */ }
});

// ---- title ----
function bestFor(m) { return m === 'daily' ? (best.dailyDate === net.dailyDate() ? best.daily : 0) : best[m]; }
function refreshTitle() {
  const b = bestFor(mode);
  $('best-title').textContent = b ? b.toLocaleString('en-US') : '—';
  $('daily-date').textContent = net.dailyDate().slice(5);
  $('mode-text').firstElementChild.textContent = MODE_TEXT[mode];
  renderRank(missions.rank());
  document.querySelectorAll('.mode').forEach((el) => { const on = el.dataset.mode === mode; el.classList.toggle('on', on); el.setAttribute('aria-selected', on ? 'true' : 'false'); });
}
function closePanels() { ['board', 'missions', 'settings'].forEach(hide); }

async function startRun() {
  if (starting) return;
  if (game.state === 'over' && performance.now() - overAt < 700) return;
  starting = true;
  try {
    closePanels();
    hide('title'); hide('over'); hide('pause'); hide('btn-mute'); show('btn-pause');
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    submitted = null; runNo++;
    pendingStart = net.startRun();
    let seed = 0, date = net.dailyDate();
    if (mode === 'daily') {
      // The daily course comes from the server (its seed is secret). Wait for it:
      // the request gives up by itself after 3.5 s. Without it, play a practice
      // course that is never posted.
      const r = await pendingStart;
      if (r && r.seed && r.online) { seed = r.seed; date = r.date; }
      else { seed = net.dailySeed(date); pendingStart = Promise.resolve(null); }
    }
    missions.runStart(mode);
    game.best = bestFor(mode);
    game.settings.shake = settings.shake;
    game.needTutorial = !read('fl-tut', 0);
    const seen = read('fl-blocks', 0);
    game.blockHints = seen < 3 ? 1 : 0;
    if (seen < 3) write('fl-blocks', seen + 1);
    game.start(mode, seed, date);
    if (document.hidden && !params.has('nopause')) game.togglePause();
  } finally { starting = false; }
}

async function onOver(res) {
  const start = pendingStart;   // this round's token, whatever starts next
  overAt = performance.now();
  lastRes = res; lastCard = null; lastStart = start;
  hide('btn-pause'); show('btn-mute');
  const missionRes = missions.runEnd({ score: res.score, mode: res.mode, duration: res.duration, maxCombo: res.maxCombo, sliced: res.sliced });
  let isNew = false;
  if (res.mode === 'daily') {
    if (best.dailyDate !== res.date || res.score > best.daily) { best.daily = res.score; best.dailyDate = res.date; isNew = true; }
  } else if (res.score > best[res.mode]) { best[res.mode] = res.score; isNew = true; }
  if (isNew) write('fl-best', best);
  renderOver(res, bestFor(res.mode), missionRes);
  const prev = bestFor(res.mode), gap = prev - res.score;
  const near = !isNew && prev > 0 && gap > 0 && gap <= Math.max(5, prev * 0.15) ? `${gap} point${gap === 1 ? '' : 's'} from your best. ` : '';
  $('o-note').innerHTML = (isNew && res.score > 0 ? '<span class="new">New best.</span> ' : near) + (input.touch ? '' : 'Press Enter to play again.');
  $('o-card').removeAttribute('src');
  hide('o-name');
  show('over');
  refreshTitle();
  game.skin = missions.getBlade();
  postScore(res, start);
  try {
    const card = await renderCard({ ...res, name: net.name() }, pageUrl.replace(/^https?:\/\//, ''));
    if (lastRes !== res) return;   // a newer round finished meanwhile
    lastCard = card;
    $('o-card').src = card.toDataURL('image/png');
  } catch (e) { /* the card is a nicety: the round is already posted */ }
}

async function postScore(res, startP) {
  const start = await startP;
  const no = runNo, mine = () => lastRes === res && runNo === no;   // still the round on screen
  if (!start || !start.token || !start.online) { if (mine()) $('o-rank').textContent = res.mode === 'daily' && !start ? 'practice' : 'offline'; return; }
  if (!mine()) return;
  if (!net.name()) {
    $('name-input').value = '';
    show('o-name');
    $('o-rank').textContent = 'add a name';
    return;
  }
  $('o-rank').textContent = 'posting…';
  const r = await net.submit({ token: start.token, mode: res.mode, score: res.score, sliced: res.sliced, combos: res.combos, maxCombo: res.maxCombo, bossHits: res.bossHits, seed: res.seed });
  if (!mine()) return;
  submitted = r;
  if (!r) { $('o-rank').textContent = net.online ? 'not posted' : 'offline'; return; }
  if (r.ok === false) { $('o-rank').textContent = r.error === 'token used' ? 'posted' : 'rejected'; return; }
  $('o-rank').textContent = r.rank ? fmtRank(r.rank, r.total) : 'posted';
  if (r.improved && r.rank) $('o-note').innerHTML += ` <span class="new">${fmtRank(r.rank, r.total)} on the ${res.mode} board.</span>`;
}

$('btn-name').addEventListener('click', () => {
  const v = $('name-input').value.trim();
  if (v.length < 2) { $('name-input').focus(); return; }
  net.setName(v);
  $('board-name').value = net.name();
  hide('o-name');
  if (lastRes) postScore(lastRes, lastStart);
});
$('name-input').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); $('btn-name').click(); } e.stopPropagation(); });

function toMenu() {
  hide('over'); hide('pause'); hide('btn-pause'); show('btn-mute');
  game.toTitle();
  show('title'); refreshTitle();
}
$('btn-run').addEventListener('click', startRun);
$('btn-again').addEventListener('click', startRun);
$('btn-home').addEventListener('click', toMenu);
$('btn-pause').addEventListener('click', () => { if (game.state === 'playing') game.togglePause(); });
$('btn-resume').addEventListener('click', () => { if (game.state === 'paused') { game.togglePause(); game.sfx.ensure(); } });
$('btn-restart').addEventListener('click', () => { game.state = 'title'; startRun(); });
$('btn-quit').addEventListener('click', toMenu);
document.querySelectorAll('.mode').forEach((el) => el.addEventListener('click', () => { mode = el.dataset.mode; refreshTitle(); el.blur(); }));
document.addEventListener('click', (e) => {
  const b = e.target && e.target.closest && e.target.closest('button');
  if (!b) return;
  game.sfx.ui();
  if (e.detail > 0) b.blur();   // a mouse or touch click should not leave Enter bound to that button
}, true);
document.querySelectorAll('[data-close]').forEach((el) => el.addEventListener('click', () => hide(el.dataset.close)));

// leaderboard
let boardTab = 'arcade', boardSeq = 0;
async function openBoard() {
  const seq = ++boardSeq;
  closePanels(); show('board');
  $('board-name').value = net.name();
  document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('on', t.dataset.board === boardTab));
  $('board-status').textContent = 'Loading…';
  $('board-list').innerHTML = ''; $('board-you').textContent = '';
  // a daily round that crossed midnight was posted to the day it started on
  const date = boardTab === 'daily' && submitted && submitted.ok && submitted.board === 'daily' ? submitted.date : undefined;
  const data = await net.board(boardTab, { limit: 25, date });
  if (seq !== boardSeq || $('board').classList.contains('hidden')) return;
  renderBoard(data, net.pid(), boardTab);
}
$('btn-board').addEventListener('click', () => { boardTab = mode; openBoard(); });
document.querySelectorAll('.tab').forEach((t) => t.addEventListener('click', () => { boardTab = t.dataset.board; openBoard(); }));
$('btn-board-name').addEventListener('click', () => { $('board-name').value = net.setName($('board-name').value); $('btn-board-name').textContent = 'Saved'; setTimeout(() => { $('btn-board-name').textContent = 'Save'; }, 1200); });
$('board-name').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); $('btn-board-name').click(); } e.stopPropagation(); });

// missions
function openMissions() {
  closePanels(); show('missions');
  renderRank(missions.rank());
  renderMissions(missions.list());
  const pick = (id) => { if (missions.setBlade(id)) { game.skin = id; renderBlades(missions, BLADES, pick); } };
  renderBlades(missions, BLADES, pick);
  renderStats(missions.stats());
}
$('btn-missions').addEventListener('click', openMissions);

// settings
const KEYS = ['sound', 'music', 'shake', 'vibrate'];
function applySettings() {
  write('fl-settings', settings);
  // the corner button (and M) silences everything; the two toggles choose what plays otherwise
  game.sfx.setMuted(settings.mute || !settings.sound);
  game.music.setEnabled(settings.music && !settings.mute);
  game.settings.shake = settings.shake;
  $('btn-mute').textContent = settings.mute ? 'sound off' : 'sound on';
  for (const k of KEYS) $('s-' + k).checked = settings[k];
}
for (const k of KEYS) $('s-' + k).addEventListener('change', (e) => { settings[k] = e.target.checked; applySettings(); game.sfx.ensure(); });
$('btn-settings').addEventListener('click', () => { closePanels(); show('settings'); });
$('btn-mute').addEventListener('click', () => { settings.mute = !settings.mute; applySettings(); game.sfx.ensure(); });
applySettings();

// share / save / copy
function shareText() {
  if (!lastRes) return '';
  const where = lastRes.mode === 'daily' ? `Daily ${lastRes.date}` : lastRes.mode === 'classic' ? 'Classic' : 'Arcade';
  const rank = submitted && submitted.ok && submitted.rank ? ` ${fmtRank(submitted.rank, submitted.total)}.` : '';
  const combo = lastRes.maxCombo ? `, best aftershock x${lastRes.maxCombo}` : '';
  return `Fault Line · ${where}: ${lastRes.score} points, ${lastRes.sliced} shattered${combo}.${rank} Beat me: ${pageUrl}`;
}
function flash(btn, text) { const old = btn.textContent; btn.textContent = text; setTimeout(() => { btn.textContent = old; }, 1500); }
$('btn-save').addEventListener('click', () => {
  if (!lastCard || !lastRes) return;
  const a = document.createElement('a');
  a.href = lastCard.toDataURL('image/png');
  a.download = `fault-line-${lastRes.score}.png`;
  a.click();
});
$('btn-copy').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(shareText()); flash($('btn-copy'), 'Copied'); }
  catch (e) { flash($('btn-copy'), 'Copy failed'); }
});
$('btn-share').addEventListener('click', () => {
  if (!lastCard || !lastRes) return;
  lastCard.toBlob(async (blob) => {
    const file = new File([blob], `fault-line-${lastRes.score}.png`, { type: 'image/png' });
    const data = { files: [file], text: shareText(), title: 'Fault Line' };
    try {
      if (navigator.canShare && navigator.canShare(data)) await navigator.share(data);
      else if (navigator.share) await navigator.share({ text: shareText(), title: 'Fault Line' });
      else { await navigator.clipboard.writeText(shareText()); flash($('btn-share'), 'Text copied'); }
    } catch (e) { /* user dismissed */ }
  }, 'image/png');
});

// pwa: skipped on localhost (add ?pwa=1 to test it) so development always loads fresh files
const isLocal = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
if (!isLocal || params.has('pwa')) registerPwa();
else if ('serviceWorker' in navigator) navigator.serviceWorker.getRegistrations().then((rs) => rs.forEach((r) => r.unregister())).catch(() => {});
onInstallChange((ok) => $('btn-install').classList.toggle('hidden', !ok));
$('btn-install').classList.toggle('hidden', !canInstall());
$('btn-install').addEventListener('click', () => promptInstall());

if (!params.has('nopause')) document.addEventListener('visibilitychange', () => { if (document.hidden && game.state === 'playing') game.togglePause(); });
refreshTitle();
