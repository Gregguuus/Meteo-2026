/* Mon Golf — application web 100 % statique (GitHub Pages).
   Données : localStorage (séances, parties, signets) + IndexedDB (vidéos de swing).
   Services gratuits sans clé : Open-Meteo (météo), OpenStreetMap/Overpass (détection du golf). */
'use strict';

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const today = () => new Date().toISOString().slice(0, 10);
const fmtDate = (d) => new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });

/* ---------- Stockage ---------- */
const DEFAULT_CLUBS = ['Driver', 'Bois 3', 'Hybride', 'Fer 4', 'Fer 5', 'Fer 6', 'Fer 7', 'Fer 8', 'Fer 9', 'PW', 'GW', 'SW', 'LW', 'Putter'];
const DEFAULT = { sessions: [], rounds: [], insta: [], clubs: Object.fromEntries(DEFAULT_CLUBS.map((c) => [c, ''])), activeRound: null,
  settings: { auto: true, wake: true } };
let db;
function load() {
  try { db = { ...DEFAULT, ...JSON.parse(localStorage.getItem('mongolf') || '{}') }; } catch { db = structuredClone(DEFAULT); }
  db.settings = { ...DEFAULT.settings, ...db.settings };
}
function save() { try { localStorage.setItem('mongolf', JSON.stringify(db)); } catch (e) { console.warn(e); } }
load();

/* IndexedDB pour les vidéos */
const idb = new Promise((res, rej) => {
  if (!('indexedDB' in window)) return rej(new Error('IndexedDB indisponible'));
  const r = indexedDB.open('mongolf-videos', 1);
  r.onupgradeneeded = () => r.result.createObjectStore('swings', { keyPath: 'id' });
  r.onsuccess = () => res(r.result);
  r.onerror = () => rej(r.error);
});
async function vStore(mode) { return (await idb).transaction('swings', mode).objectStore('swings'); }
const reqP = (r) => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
async function vPut(rec) { return reqP((await vStore('readwrite')).put(rec)); }
async function vAll() { return reqP((await vStore('readonly')).getAll()); }
async function vDel(id) { return reqP((await vStore('readwrite')).delete(id)); }

/* ---------- Onglets ---------- */
function showTab(name) {
  $$('.tab').forEach((t) => t.classList.toggle('active', t.id === 'tab-' + name));
  $$('.tabs button').forEach((b) => b.classList.toggle('active', b.dataset.tab === name));
  if (name !== 'swing') stopCamera();
  window.scrollTo(0, 0);
}
$$('.tabs button').forEach((b) => b.addEventListener('click', () => showTab(b.dataset.tab)));

function banner(html, actionLabel, action) {
  const el = $('#banner');
  el.innerHTML = `<span>${html}</span>` + (actionLabel ? `<button>${esc(actionLabel)}</button>` : '');
  el.classList.remove('hidden');
  if (actionLabel) $('button', el).onclick = () => { el.classList.add('hidden'); action(); };
  else setTimeout(() => el.classList.add('hidden'), 4000);
}

/* ---------- Localisation, météo, détection du golf ---------- */
let pos = null, weather = null, golf = null;

function getPosition() {
  return new Promise((res, rej) => {
    if (!navigator.geolocation) return rej(new Error('Géolocalisation non disponible'));
    navigator.geolocation.getCurrentPosition((p) => res({ lat: p.coords.latitude, lon: p.coords.longitude }), rej,
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 });
  });
}

const WMO = { 0: ['☀️', 'Ciel dégagé'], 1: ['🌤️', 'Plutôt dégagé'], 2: ['⛅', 'Partiellement nuageux'], 3: ['☁️', 'Couvert'],
  45: ['🌫️', 'Brouillard'], 48: ['🌫️', 'Brouillard givrant'], 51: ['🌦️', 'Bruine légère'], 53: ['🌦️', 'Bruine'], 55: ['🌧️', 'Bruine forte'],
  61: ['🌦️', 'Pluie faible'], 63: ['🌧️', 'Pluie'], 65: ['🌧️', 'Forte pluie'], 66: ['🌧️', 'Pluie verglaçante'], 67: ['🌧️', 'Pluie verglaçante'],
  71: ['🌨️', 'Neige faible'], 73: ['🌨️', 'Neige'], 75: ['❄️', 'Forte neige'], 77: ['🌨️', 'Grains de neige'],
  80: ['🌦️', 'Averses'], 81: ['🌧️', 'Averses'], 82: ['⛈️', 'Fortes averses'], 85: ['🌨️', 'Averses de neige'], 86: ['🌨️', 'Averses de neige'],
  95: ['⛈️', 'Orage'], 96: ['⛈️', 'Orage avec grêle'], 99: ['⛈️', 'Orage avec grêle'] };
const wmo = (c) => WMO[c] || ['🌡️', '—'];
const DIRS = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'];
const dirName = (deg) => DIRS[Math.round(deg / 45) % 8];

async function fetchWeather() {
  if (!pos) return;
  const u = new URL('https://api.open-meteo.com/v1/forecast');
  Object.entries({ latitude: pos.lat, longitude: pos.lon, timezone: 'auto', wind_speed_unit: 'kmh', forecast_hours: 7,
    current: 'temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,weather_code,wind_speed_10m,wind_direction_10m,wind_gusts_10m',
    hourly: 'temperature_2m,precipitation_probability,weather_code,wind_speed_10m' }).forEach(([k, v]) => u.searchParams.set(k, v));
  try {
    const r = await fetch(u);
    if (!r.ok) throw new Error(r.status);
    weather = await r.json();
    renderWeather();
  } catch (e) { $('#weather').textContent = 'Météo indisponible pour le moment.'; }
}

function golfTip(c) {
  const tips = [];
  if (c.wind_speed_10m >= 30) tips.push('Vent fort : jouez des balles basses (« knock-down »), jusqu\'à 2 clubs de plus face au vent.');
  else if (c.wind_speed_10m >= 15) tips.push('Vent sensible : environ 1 club de plus face au vent, 1 de moins vent dans le dos.');
  if (c.wind_gusts_10m - c.wind_speed_10m >= 15) tips.push('Rafales irrégulières : attendez une accalmie avant de frapper.');
  if (c.temperature_2m <= 8) tips.push('Froid : la balle porte moins (environ −5 %), prévoyez un club de plus.');
  if (c.temperature_2m >= 28) tips.push('Chaud : hydratez-vous, la balle porte un peu plus.');
  if (c.precipitation > 0) tips.push('Pluie : gants de rechange et grips au sec, greens plus lents.');
  if ([95, 96, 99].includes(c.weather_code)) tips.push('⚠️ Orage : quittez le parcours et mettez-vous à l\'abri.');
  return tips.length ? tips.join(' ') : 'Conditions idéales, bon jeu ! 🏌️';
}

function renderWeather() {
  if (!weather) return;
  const c = weather.current, [icon, label] = wmo(c.weather_code);
  // Flèche : la direction météo est celle d'OÙ vient le vent ; la flèche montre où il va.
  const arrow = `<span class="arrow" style="transform:rotate(${(c.wind_direction_10m + 180) % 360}deg)">↑</span>`;
  const h = weather.hourly, now = Date.now();
  const hours = h.time.map((t, i) => ({ t: new Date(t), i })).filter((x) => x.t.getTime() > now - 3600e3).slice(0, 6)
    .map(({ t, i }) => `<div>${t.getHours()}h<br>${wmo(h.weather_code[i])[0]}<br>${Math.round(h.temperature_2m[i])}°<br>💧${h.precipitation_probability[i] ?? 0}%<br>💨${Math.round(h.wind_speed_10m[i])}</div>`).join('');
  $('#weather').innerHTML = `
    <div class="wx-main"><div class="wx-icon">${icon}</div><div><div class="wx-temp">${Math.round(c.temperature_2m)}°C</div>
      <div class="sub">${label} · ressenti ${Math.round(c.apparent_temperature)}° · humidité ${c.relative_humidity_2m}%</div></div></div>
    <div class="wx-wind">${arrow} Vent ${Math.round(c.wind_speed_10m)} km/h de ${dirName(c.wind_direction_10m)} · rafales ${Math.round(c.wind_gusts_10m)} km/h</div>
    <div class="wx-tip">${golfTip(c)}</div>
    <div class="wx-hours">${hours}</div>`;
  $('#mini-weather').innerHTML = `${icon} ${Math.round(c.temperature_2m)}°C<br>${arrow} ${Math.round(c.wind_speed_10m)} km/h ${dirName(c.wind_direction_10m)}`;
}

async function detectGolf() {
  if (!pos) return null;
  // Cherche un parcours de golf OpenStreetMap à moins de 150 m de ma position.
  const q = `[out:json][timeout:20];(way["leisure"="golf_course"](around:150,${pos.lat},${pos.lon});relation["leisure"="golf_course"](around:150,${pos.lat},${pos.lon}););out tags center 1;`;
  try {
    const r = await fetch('https://overpass-api.de/api/interpreter', { method: 'POST', body: 'data=' + encodeURIComponent(q),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
    if (!r.ok) throw new Error(r.status);
    const j = await r.json();
    const el = j.elements?.[0];
    return el ? { name: el.tags?.name || 'Golf', id: el.id } : false;
  } catch { return null; } // null = impossible de vérifier
}

async function locate(manual = false) {
  $('#loc-status').textContent = 'Localisation…';
  try { pos = await getPosition(); } catch (e) {
    $('#loc-status').textContent = 'Position non autorisée';
    $('#weather').textContent = 'Autorisez la localisation pour voir la météo en direct.';
    $('#detect-info').textContent = 'Autorisez la localisation dans les réglages du navigateur.';
    return;
  }
  fetchWeather();
  const g = await detectGolf();
  golf = g || null;
  if (g) {
    $('#loc-status').textContent = '⛳ ' + g.name;
    $('#detect-info').textContent = `Vous êtes sur : ${g.name}.`;
    onGolfDetected(g);
  } else {
    $('#loc-status').textContent = g === false ? '📍 Pas sur un golf' : '📍 Position OK';
    $('#detect-info').textContent = g === false ? 'Aucun parcours de golf détecté à proximité.' : 'Détection du golf momentanément indisponible.';
    if (manual) banner(g === false ? 'Pas de golf détecté ici.' : 'Détection indisponible, réessayez.');
  }
}

let golfHandled = false;
function onGolfDetected(g) {
  $('#course-name').value ||= g.name;
  if (db.activeRound) { if (!golfHandled) showTab('parcours'); golfHandled = true; return; }
  if (golfHandled) return;
  golfHandled = true;
  const played = db.rounds.some((r) => r.date === today() && r.course === g.name);
  if (db.settings.auto && !played) {
    startRound(g.name, 18);
    showTab('parcours');
    banner(`⛳ Bienvenue à ${esc(g.name)} ! Carte de score lancée.`);
  } else {
    banner(`⛳ Vous êtes à ${esc(g.name)}`, 'Démarrer une partie', () => { startRound(g.name, 18); showTab('parcours'); });
  }
}

/* ---------- Entraînement ---------- */
const sf = $('#session-form');
sf.date.value = today();
sf.addEventListener('submit', (e) => {
  e.preventDefault();
  const f = Object.fromEntries(new FormData(sf));
  db.sessions.unshift({ id: uid(), ...f, duration: +f.duration || 0, balls: +f.balls || 0, feeling: +f.feeling });
  db.sessions.sort((a, b) => b.date.localeCompare(a.date));
  save(); sf.reset(); sf.date.value = today(); renderSessions(); renderSummary();
  banner('Séance enregistrée ✔');
});
const FEEL = ['', '😣', '😕', '😐', '🙂', '🤩'];
function sessionLi(s, del) {
  return `<li><div class="grow"><b>${esc(s.type)}</b> <span class="tag">${s.duration} min${s.balls ? ' · ' + s.balls + ' balles' : ''}</span> ${FEEL[s.feeling] || ''}
    <div class="sub">${fmtDate(s.date)}${s.notes ? ' — ' + esc(s.notes) : ''}</div></div>${del ? `<button class="x" data-del="${s.id}" aria-label="Supprimer">✕</button>` : ''}</li>`;
}
function renderSessions() {
  $('#sessions').innerHTML = db.sessions.map((s) => sessionLi(s, true)).join('') || '<li class="empty">Aucune séance pour l\'instant.</li>';
  $('#recent-sessions').innerHTML = db.sessions.slice(0, 3).map((s) => sessionLi(s)).join('') || '<li class="empty">Enregistrez votre première séance dans « Entraîn. ».</li>';
}
$('#sessions').addEventListener('click', (e) => {
  const id = e.target.dataset.del; if (!id || !confirm('Supprimer cette séance ?')) return;
  db.sessions = db.sessions.filter((s) => s.id !== id); save(); renderSessions(); renderSummary();
});
function renderClubs() {
  $('#clubs').innerHTML = Object.entries(db.clubs).map(([c, d]) =>
    `<tr><td>${esc(c)}</td><td><input type="number" inputmode="numeric" data-club="${esc(c)}" value="${esc(d)}" placeholder="—"></td></tr>`).join('');
  $('#swing-club').innerHTML = Object.keys(db.clubs).map((c) => `<option>${esc(c)}</option>`).join('');
}
$('#clubs').addEventListener('change', (e) => { const c = e.target.dataset.club; if (c) { db.clubs[c] = e.target.value; save(); } });

function renderSummary() {
  const m = today().slice(0, 7);
  const monthMin = db.sessions.filter((s) => s.date.startsWith(m)).reduce((a, s) => a + s.duration, 0);
  const done = db.rounds.filter((r) => r.holes === 18 && r.complete);
  const best = done.length ? Math.min(...done.map((r) => total(r, 'strokes'))) : '—';
  $('#summary').innerHTML = stat(Math.round(monthMin / 6) / 10 + ' h', 'entraînement ce mois') + stat(db.rounds.length, 'parties jouées') + stat(best, 'meilleur 18 trous');
}
const stat = (v, l) => `<div class="stat"><b>${v}</b><span>${l}</span></div>`;

/* ---------- Swing ---------- */
let stream = null, recorder = null, chunks = [];
async function startCamera() {
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', frameRate: { ideal: 60 } }, audio: false });
    $('#preview').srcObject = stream; $('#rec-btn').disabled = false;
  } catch { banner('Caméra inaccessible : autorisez-la, ou utilisez « Importer une vidéo ».'); }
}
function stopCamera() {
  if (recorder?.state === 'recording') recorder.stop();
  stream?.getTracks().forEach((t) => t.stop()); stream = null;
  $('#preview').srcObject = null; $('#rec-btn').disabled = true;
}
function pickMime() {
  if (!window.MediaRecorder) return null;
  return ['video/mp4', 'video/webm;codecs=vp9', 'video/webm'].find((m) => MediaRecorder.isTypeSupported?.(m)) || '';
}
$('#cam-start').onclick = () => (stream ? stopCamera() : startCamera());
$('#rec-btn').onclick = () => {
  const btn = $('#rec-btn');
  if (recorder?.state === 'recording') { recorder.stop(); return; }
  const mime = pickMime();
  if (mime === null) return banner('Enregistrement non pris en charge ici : utilisez « Importer une vidéo ».');
  chunks = [];
  recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
  recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  recorder.onstop = () => { btn.textContent = '⏺ Enregistrer'; btn.classList.remove('rec');
    saveSwing(new Blob(chunks, { type: recorder.mimeType || mime || 'video/webm' })); };
  recorder.start(); btn.textContent = '⏹ Arrêter'; btn.classList.add('rec');
};
$('#swing-file').onchange = (e) => { const f = e.target.files[0]; if (f) saveSwing(f); e.target.value = ''; };
async function saveSwing(blob) {
  const rec = { id: uid(), date: new Date().toISOString(), club: $('#swing-club').value, note: $('#swing-note').value, blob };
  try { await vPut(rec); $('#swing-note').value = ''; banner('Swing enregistré 🎥'); renderSwings(); openSwing(rec); }
  catch { banner('Impossible d\'enregistrer la vidéo (espace insuffisant ?).'); }
}
let playerURL;
function openSwing(rec) {
  if (playerURL) URL.revokeObjectURL(playerURL);
  playerURL = URL.createObjectURL(rec.blob);
  const p = $('#player'); p.src = playerURL; p.playbackRate = 0.5;
  $('#player-title').textContent = `${rec.club} — ${fmtDate(rec.date)}${rec.note ? ' — ' + rec.note : ''}`;
  $('#player-card').classList.remove('hidden');
  $('#player-card').scrollIntoView({ behavior: 'smooth' });
}
$$('[data-rate]').forEach((b) => (b.onclick = () => { $('#player').playbackRate = +b.dataset.rate; $('#player').play(); }));
$('#frame-back').onclick = () => { const p = $('#player'); p.pause(); p.currentTime = Math.max(0, p.currentTime - 1 / 30); };
$('#frame-fwd').onclick = () => { const p = $('#player'); p.pause(); p.currentTime += 1 / 30; };
let swingCache = [];
async function renderSwings() {
  try { swingCache = (await vAll()).sort((a, b) => b.date.localeCompare(a.date)); } catch { swingCache = []; }
  $('#swings').innerHTML = swingCache.map((s) => `<li><button class="btn sm" data-play="${s.id}">▶</button>
    <div class="grow"><b>${esc(s.club)}</b><div class="sub">${fmtDate(s.date)}${s.note ? ' — ' + esc(s.note) : ''}</div></div>
    <button class="x" data-del="${s.id}" aria-label="Supprimer">✕</button></li>`).join('') || '<li class="empty">Aucun swing enregistré.</li>';
}
$('#swings').addEventListener('click', async (e) => {
  const { play, del } = e.target.dataset;
  if (play) openSwing(swingCache.find((s) => s.id === play));
  if (del && confirm('Supprimer cette vidéo ?')) { await vDel(del); renderSwings(); }
});

/* ---------- Instagram ---------- */
let instaFilter = 'Tous';
const isInsta = (u) => { try { return /(^|\.)instagram\.com$/.test(new URL(u).hostname); } catch { return false; } };
const fi = $('#insta-form');
fi.addEventListener('submit', (e) => {
  e.preventDefault();
  const f = Object.fromEntries(new FormData(fi));
  if (!isInsta(f.url)) return banner('Ce lien n\'est pas un lien Instagram.');
  if (db.insta.some((x) => x.url === f.url)) return banner('Ce signet existe déjà.');
  db.insta.unshift({ id: uid(), url: f.url.trim(), title: f.title.trim(), cat: f.cat, date: new Date().toISOString() });
  save(); fi.reset(); renderInsta(); banner('Signet ajouté 📌');
});
function renderInsta() {
  const cats = ['Tous', ...new Set(db.insta.map((x) => x.cat))];
  $('#insta-filters').innerHTML = cats.map((c) => `<button class="btn sm toggle ${c === instaFilter ? 'on' : ''}" data-cat="${esc(c)}">${esc(c)}</button>`).join('');
  const list = db.insta.filter((x) => instaFilter === 'Tous' || x.cat === instaFilter);
  $('#insta').innerHTML = list.map((x) => `<li><div class="grow"><a href="${esc(x.url)}" target="_blank" rel="noopener"><b>${esc(x.title || 'Post Instagram')}</b></a>
    <div class="sub"><span class="tag">${esc(x.cat)}</span> ${esc(x.url.replace(/^https?:\/\/(www\.)?/, ''))}</div></div>
    <button class="x" data-del="${x.id}" aria-label="Supprimer">✕</button></li>`).join('') || '<li class="empty">Aucun signet pour l\'instant.</li>';
}
$('#insta-filters').addEventListener('click', (e) => { if (e.target.dataset.cat) { instaFilter = e.target.dataset.cat; renderInsta(); } });
$('#insta').addEventListener('click', (e) => {
  const id = e.target.dataset.del; if (!id || !confirm('Supprimer ce signet ?')) return;
  db.insta = db.insta.filter((x) => x.id !== id); save(); renderInsta();
});
/* Partage Android (Web Share Target) : ?url=…&text=… */
function handleShare() {
  const p = new URLSearchParams(location.search);
  const raw = [p.get('url'), p.get('text'), p.get('title')].filter(Boolean).join(' ');
  if (!raw) return;
  const m = raw.match(/https?:\/\/\S+/);
  history.replaceState(null, '', location.pathname);
  if (!m) return;
  showTab('insta');
  fi.url.value = m[0];
  fi.title.focus();
  banner('Lien reçu : choisissez une catégorie puis « Ajouter ».');
}

/* ---------- Carte de score ---------- */
let hole = 0, wakeLock = null;
const total = (r, f) => r.scores.reduce((a, h) => a + (h[f] || 0), 0);
const parOf = (r) => r.scores.reduce((a, h) => a + h.par, 0);
const playedPar = (r) => r.scores.reduce((a, h) => a + (h.strokes ? h.par : 0), 0);
const toPar = (n) => (n === 0 ? 'E' : n > 0 ? '+' + n : String(n));

function startRound(course, holes) {
  db.activeRound = { id: uid(), date: today(), course: course || 'Parcours', holes,
    scores: Array.from({ length: holes }, () => ({ par: 4, strokes: 0, putts: 0, fw: null })) };
  hole = 0; save(); renderRound(); keepAwake();
}
$('#round-form').addEventListener('submit', (e) => {
  e.preventDefault(); const f = e.target;
  startRound(f.course.value.trim() || golf?.name, +f.holes.value);
});
function renderRound() {
  const r = db.activeRound;
  $('#round-setup').classList.toggle('hidden', !!r);
  $('#round-live').classList.toggle('hidden', !r);
  if (!r) return;
  const h = r.scores[hole];
  $('#round-title').textContent = `${r.course} · ${fmtDate(r.date)}`;
  const t = total(r, 'strokes');
  $('#round-total').innerHTML = t ? `${t} <small class="${t - playedPar(r) < 0 ? 'under' : t - playedPar(r) > 0 ? 'over' : ''}">(${toPar(t - playedPar(r))})</small>` : 'Bonne partie !';
  $('#hole-n').textContent = hole + 1;
  $('#v-par').textContent = h.par; $('#v-strokes').textContent = h.strokes; $('#v-putts').textContent = h.putts;
  $$('[data-fw]').forEach((b) => b.classList.toggle('on', b.dataset.fw === h.fw));
  const cls = (x) => (!x.strokes ? '' : x.strokes < x.par ? 'under' : x.strokes > x.par ? 'over' : '');
  const cols = r.scores.map((x, i) => i);
  $('#scorecard').innerHTML =
    `<tr><th>Trou</th>${cols.map((i) => `<th class="${i === hole ? 'cur' : ''}" data-h="${i}">${i + 1}</th>`).join('')}<th>Tot</th></tr>` +
    `<tr><th>Par</th>${r.scores.map((x) => `<td>${x.par}</td>`).join('')}<td>${parOf(r)}</td></tr>` +
    `<tr><th>Score</th>${r.scores.map((x, i) => `<td class="${cls(x)} ${i === hole ? 'cur' : ''}" data-h="${i}">${x.strokes || '·'}</td>`).join('')}<td><b>${t}</b></td></tr>` +
    `<tr><th>Putts</th>${r.scores.map((x) => `<td>${x.putts || '·'}</td>`).join('')}<td>${total(r, 'putts')}</td></tr>`;
}
$$('.counter button').forEach((b) => b.addEventListener('click', () => {
  const h = db.activeRound.scores[hole], f = b.dataset.f, d = +b.dataset.d;
  const min = f === 'par' ? 3 : 0, max = f === 'par' ? 6 : 15;
  h[f] = Math.min(max, Math.max(min, h[f] + d));
  if (f === 'putts' && h.putts > h.strokes) h.strokes = h.putts;
  if (f === 'strokes' && h.putts > h.strokes) h.putts = h.strokes;
  save(); renderRound();
}));
$$('[data-fw]').forEach((b) => b.addEventListener('click', () => {
  const h = db.activeRound.scores[hole]; h.fw = h.fw === b.dataset.fw ? null : b.dataset.fw; save(); renderRound();
}));
$('#hole-prev').onclick = () => { hole = (hole - 1 + db.activeRound.holes) % db.activeRound.holes; renderRound(); };
$('#hole-next').onclick = () => {
  const h = db.activeRound.scores[hole];
  if (!h.strokes) h.strokes = h.par; // valeur par défaut si oubli
  save(); hole = (hole + 1) % db.activeRound.holes; renderRound();
};
$('#scorecard').addEventListener('click', (e) => { const i = e.target.dataset.h; if (i != null) { hole = +i; renderRound(); } });
$('#round-finish').onclick = () => {
  const r = db.activeRound;
  const missing = r.scores.filter((x) => !x.strokes).length;
  if (missing && !confirm(`${missing} trou(s) sans score. Terminer quand même ?`)) return;
  r.complete = !missing; db.rounds.unshift(r); db.activeRound = null; save();
  releaseWake(); renderRound(); renderRounds(); renderSummary();
  banner(`Partie enregistrée : ${total(r, 'strokes')} coups (${toPar(total(r, 'strokes') - playedPar(r))}) 🏆`);
};
$('#round-cancel').onclick = () => { if (confirm('Abandonner cette partie ? Elle ne sera pas enregistrée.')) { db.activeRound = null; save(); releaseWake(); renderRound(); } };

function renderRounds() {
  const rs = db.rounds;
  const n = rs.length;
  const avgPutts = n ? (rs.reduce((a, r) => a + total(r, 'putts'), 0) / rs.reduce((a, r) => a + r.scores.filter((x) => x.strokes).length, 0)).toFixed(1) : '—';
  const fw = rs.flatMap((r) => r.scores.filter((x) => x.fw)); const fwPct = fw.length ? Math.round((fw.filter((x) => x.fw === 'yes').length / fw.length) * 100) + ' %' : '—';
  const last18 = rs.filter((r) => r.holes === 18 && r.complete).slice(0, 5);
  const avg = last18.length ? Math.round(last18.reduce((a, r) => a + total(r, 'strokes'), 0) / last18.length) : '—';
  $('#round-stats').innerHTML = stat(avg, 'moyenne (5 derniers 18 t.)') + stat(avgPutts, 'putts / trou') + stat(fwPct, 'fairways touchés');
  $('#rounds').innerHTML = rs.map((r) => { const t = total(r, 'strokes'), d = t - playedPar(r);
    return `<li><div class="grow"><b>${esc(r.course)}</b> <span class="tag">${r.holes} trous</span>
      <div class="sub">${fmtDate(r.date)} · ${total(r, 'putts')} putts</div></div>
      <div class="big ${d < 0 ? 'under' : d > 0 ? 'over' : ''}">${t} <small>${toPar(d)}</small></div>
      <button class="x" data-del="${r.id}" aria-label="Supprimer">✕</button></li>`; }).join('') || '<li class="empty">Aucune partie enregistrée.</li>';
}
$('#rounds').addEventListener('click', (e) => {
  const id = e.target.dataset.del; if (!id || !confirm('Supprimer cette partie ?')) return;
  db.rounds = db.rounds.filter((r) => r.id !== id); save(); renderRounds(); renderSummary();
});

async function keepAwake() {
  if (!db.settings.wake || !('wakeLock' in navigator) || !db.activeRound) return;
  try { wakeLock = await navigator.wakeLock.request('screen'); } catch {}
}
function releaseWake() { wakeLock?.release?.(); wakeLock = null; }

/* ---------- Réglages ---------- */
$('#opt-auto').checked = db.settings.auto;
$('#opt-wake').checked = db.settings.wake;
$('#opt-auto').onchange = (e) => { db.settings.auto = e.target.checked; save(); };
$('#opt-wake').onchange = (e) => { db.settings.wake = e.target.checked; save(); e.target.checked ? keepAwake() : releaseWake(); };
$('#detect-now').onclick = () => { golfHandled = false; locate(true); };
$('#export').onclick = () => {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(db, null, 2)], { type: 'application/json' }));
  a.download = `mon-golf-${today()}.json`; a.click();
};
$('#import').onchange = async (e) => {
  const f = e.target.files[0]; if (!f) return;
  try { const d = JSON.parse(await f.text()); if (!confirm('Remplacer les données actuelles par ce fichier ?')) return;
    db = { ...DEFAULT, ...d }; save(); renderAll(); banner('Données importées ✔'); }
  catch { banner('Fichier invalide.'); }
  e.target.value = '';
};

/* ---------- Démarrage ---------- */
function renderAll() { renderSessions(); renderClubs(); renderSummary(); renderInsta(); renderRound(); renderRounds(); renderSwings(); }
renderAll();
handleShare();
if (db.activeRound) keepAwake();
locate();
// Revérifie la position et la météo quand on revient sur l'app, et toutes les 10 min.
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') { locate(); keepAwake(); } });
setInterval(() => document.visibilityState === 'visible' && locate(), 10 * 60 * 1000);

if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
