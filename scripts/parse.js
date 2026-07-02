import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const MONTHS = {
  janvier: 1, février: 2, fevrier: 2, mars: 3,
  avril: 4, mai: 5, juin: 6, juillet: 7,
  août: 8, aout: 8, septembre: 9, octobre: 10,
  novembre: 11, décembre: 12, decembre: 12,
};

const CITIES = {
  'givrand': 'Givrand', 'pornic': 'Pornic', 'challans': 'Challans',
};

const raw = fs.readFileSync(path.join(__dirname, '..', 'weather_raw.txt'), 'utf-8');
const lines = raw.split('\n');

function stripTime(s) {
  return s.replace(/\d+\s*[hô]:?\s*\d*/g, ' ');
}

function findTemps(s) {
  if (!s) return [];
  s = s.replace(',', '.').replace(/º/g, '°');
  const cleaned = stripTime(s);
  const results = [];
  const re = /([-]?\d+\.?\d*)\s*°/g;
  let m;
  while ((m = re.exec(cleaned)) !== null) {
    const v = parseFloat(m[1]);
    if (v <= 60) results.push(v);
  }
  const re2 = /([-]?\d+\.?\d*)\s*c/g;
  while ((m = re2.exec(cleaned)) !== null) {
    const v = parseFloat(m[1]);
    if (v <= 60 && !results.includes(v)) results.push(v);
  }
  const nums = cleaned.match(/([-]?\d+\.?\d*)/g) || [];
  for (const n of nums) {
    const v = parseFloat(n);
    if (Math.abs(v) <= 60 && !results.includes(v)) results.push(v);
  }
  return results;
}

function stripCond(s) {
  if (!s) return '';
  s = stripTime(s);
  s = s.replace(/[-]?\d+\.?\d*\s*°?\s*c?\s*/g, ' ');
  return s.replace(/\s+/g, ' ').trim();
}

function classify(s) {
  const sl = s.toLowerCase();
  if (/soleil|☀️|☀|ensoleillé|beau|parfaite|🌞/.test(sl)) return 'Soleil';
  if (/pluie|🌧️|🌧|tempête|humide|orage|🌩️|grêle|grelé/.test(sl)) return 'Pluie';
  if (/neige/.test(sl)) return 'Neige';
  if (/nuage|☁️|☁|⛅️|⛅|🌥️|couvert|couver|brouillard|🌦️/.test(sl)) return 'Nuageux';
  if (/💨|vent/.test(sl)) return 'Vent';
  return '';
}

const records = [];
let currentMonth = null;
let prev = { tm: null, ta: null, cm: '', ca: '' };
let notes = '';

for (const rawLine of lines) {
  let l = rawLine.trim();
  if (!l) continue;
  if (/^Semaine|^Week end|^Pornic \/|^Pornic\b|^Givrand\b/.test(l)) {
    notes = l;
    continue;
  }

  const mm = l.match(/(janvier|février|fevrier|mars|avril|mai|juin|juillet|août|aout|septembre|octobre|novembre|décembre|decembre)/i);
  if (mm) currentMonth = MONTHS[mm[1].toLowerCase()];

  const md = l.match(/^(\d+)(?:er)?\s*(?:\w+\s+)?[:\-]\s*(.*)/i) || l.match(/^(\d+)\s*[:\-]\s*(.*)/);
  if (!md) continue;

  const day = parseInt(md[1]);
  if (!currentMonth || day < 1 || day > 31) continue;

  let rest = md[2].trim();
  const isIdem = rest.toLowerCase().startsWith('idem');

  let tm, ta, cm_, ca_;

  if (isIdem) {
    const rc = rest.slice(4).replace(/^[,\s]+/, '').trim();
    const hasSlash = rc.includes('/');
    const parts = rc.split(/\/{1,2}/).map((p) => p.trim()).filter(Boolean);
    tm = prev.tm;
    ta = prev.ta;
    cm_ = prev.cm;
    ca_ = prev.ca;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const tt = findTemps(part);
      const cd = stripCond(part);

      if (hasSlash) {
        if (i === 0 && cd && !tt.length) {
          cm_ = cd;
        } else if (i === 0 && tt.length) {
          ta = Math.max(...tt);
          ca_ = cd || ca_;
        } else if (i >= 1) {
          if (tt.length) ta = Math.max(...tt);
          if (cd) ca_ = cd;
        }
      } else if (i === 0) {
        if (cd && !tt.length) cm_ = cd;
        if (tt.length) tm = Math.max(...tt);
      }
    }
  } else {
    const parts = rest.split(/\/{1,2}/).map((p) => p.trim()).filter(Boolean);
    tm = null;
    ta = null;
    cm_ = '';
    ca_ = '';

    for (let i = 0; i < parts.length; i++) {
      const tt = findTemps(parts[i]);
      const cd = stripCond(parts[i]);
      if (i === 0) {
        if (tt.length) tm = Math.max(...tt);
        if (cd) cm_ = cd;
      } else if (i === 1) {
        if (tt.length) ta = Math.max(...tt);
        if (cd) ca_ = cd;
      }
    }
  }

  if (tm == null && ta == null) continue;

  const dateStr = `2026-${String(currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  let city = '';
  const cityMatch = rest.match(/(Pornic|Givrand|Challans)/i);
  if (cityMatch) city = cityMatch[1].charAt(0).toUpperCase() + cityMatch[1].slice(1).toLowerCase();
  else if (notes.includes('Pornic')) city = 'Pornic';
  else if (notes.includes('Givrand')) city = 'Givrand';

  records.push({
    date: dateStr,
    temp_matin: tm,
    temp_aprem: ta,
    condition_matin: cm_ || '',
    condition_aprem: ca_ || '',
    categorie_matin: classify(cm_),
    categorie_aprem: classify(ca_),
    ville: city || 'Givrand',
  });

  prev = { tm, ta, cm: cm_ || '', ca: ca_ || '' };
}

const output = JSON.stringify(records, null, 2);
const outPath = path.join(__dirname, '..', 'src', 'data', 'weather.json');
fs.writeFileSync(outPath, output, 'utf-8');
console.log(`✅ ${records.length} records parsed → src/data/weather.json`);
