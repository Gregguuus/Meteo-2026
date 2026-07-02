"""
weather data ingestion pipeline
reads raw text → normalizes → writes sqlite + json
"""

import sqlite3, re, json, os
from datetime import date

MONTHS = {
    'janvier': 1, 'février': 2, 'fevrier': 2, 'mars': 3,
    'avril': 4, 'mai': 5, 'juin': 6, 'juillet': 7,
    'août': 8, 'aout': 8, 'septembre': 9, 'octobre': 10,
    'novembre': 11, 'décembre': 12, 'decembre': 12
}

TEMP_RE = re.compile(r'([-]?\d+[.,]?\d*)\s*°?\s*c?')
TIME_RE = re.compile(r'\d+\s*[hô]:?\s*\d*')

def strip_time(s):
    return TIME_RE.sub('', s)

def extract_temps(s):
    if not s: return []
    s = s.replace(',', '.').replace('º', '°')
    cleaned = strip_time(s)
    results = []
    for m in TEMP_RE.finditer(cleaned):
        v = float(m.group(1))
        if v <= 60: results.append(v)
    return results

def strip_cond(s):
    if not s: return ''
    s = strip_time(s)
    s = re.sub(r'[-]?\d+[.,]?\d*\s*°?\s*c?\s*', ' ', s)
    return re.sub(r'\s+', ' ', s).strip()

def classify(s):
    s = s.lower()
    if re.search(r'soleil|☀️|☀|ensoleillé|beau|parfaite|🌞', s): return 'Soleil'
    if re.search(r'pluie|🌧️|🌧|tempête|humide|orage|🌩️|grêle|grelé', s): return 'Pluie'
    if re.search(r'neige', s): return 'Neige'
    if re.search(r'nuage|☁️|☁|⛅️|⛅|🌥️|couvert|couver|brouillard|🌦️', s): return 'Nuageux'
    if re.search(r'💨|vent', s): return 'Vent'
    return ''

def parse(raw_path):
    with open(raw_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    records = []
    current_month = None
    prev = {'tm': None, 'ta': None, 'cm': '', 'ca': ''}

    for line in lines:
        l = line.strip()
        if not l or l.startswith(('Semaine', 'Week', 'Pornic', 'Givrand')):
            continue

        mm = re.search(
            r'(janvier|février|fevrier|mars|avril|mai|juin|juillet|août|aout|septembre|octobre|novembre|décembre|decembre)',
            l, re.IGNORECASE
        )
        if mm: current_month = MONTHS[mm.group(1).lower()]

        m = re.match(r'(\d+)(?:er)?\s*(?:\w+\s+)?[:\-]\s*(.*)', l, re.IGNORECASE)
        if not m: m = re.match(r'(\d+)\s*[:\-]\s*(.*)', l)
        if not m: continue

        day = int(m.group(1))
        if not current_month or day < 1 or day > 31: continue
        rest = m.group(2).strip()
        is_idem = rest.lower().startswith('idem')

        if is_idem:
            rc = rest[4:].lstrip(',').strip()
            parts = [p.strip() for p in re.split(r'/{1,2}', rc) if p.strip()]
            hs = '/' in rc
            tm, ta, cm_, ca_ = prev['tm'], prev['ta'], prev['cm'], prev['ca']
            for i, pt in enumerate(parts):
                tt = extract_temps(pt); cd = strip_cond(pt)
                if hs:
                    if i == 0 and cd and not tt: cm_ = cd
                    elif i == 0 and tt: ta = max(tt); ca_ = cd or ca_
                    elif i >= 1:
                        if tt: ta = max(tt)
                        if cd: ca_ = cd
                elif i == 0:
                    if cd and not tt: cm_ = cd
                    if tt: tm = max(tt)
        else:
            parts = [p.strip() for p in re.split(r'/{1,2}', rest) if p.strip()]
            tm, ta, cm_, ca_ = None, None, '', ''
            for i, pt in enumerate(parts):
                tt = extract_temps(pt); cd = strip_cond(pt)
                if i == 0:
                    if tt: tm = max(tt)
                    if cd: cm_ = cd
                elif i == 1:
                    if tt: ta = max(tt)
                    if cd: ca_ = cd

        if tm is None and ta is None: continue

        records.append({
            'date': f'2026-{current_month:02d}-{day:02d}',
            'temp_matin': tm,
            'temp_aprem': ta,
            'condition_matin': cm_ or '',
            'condition_aprem': ca_ or '',
            'categorie_matin': classify(cm_),
            'categorie_aprem': classify(ca_),
        })
        prev = {'tm': tm, 'ta': ta, 'cm': cm_ or '', 'ca': ca_ or ''}

    return records

def write_db(records, db_path):
    conn = sqlite3.connect(db_path)
    conn.execute('''
        CREATE TABLE IF NOT EXISTS weather (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT NOT NULL UNIQUE,
            temp_matin REAL,
            temp_aprem REAL,
            condition_matin TEXT DEFAULT '',
            condition_aprem TEXT DEFAULT '',
            categorie_matin TEXT DEFAULT '',
            categorie_aprem TEXT DEFAULT ''
        )
    ''')
    conn.execute('DELETE FROM weather')
    conn.executemany(
        'INSERT INTO weather (date, temp_matin, temp_aprem, condition_matin, condition_aprem, categorie_matin, categorie_aprem) '
        'VALUES (:date, :temp_matin, :temp_aprem, :condition_matin, :condition_aprem, :categorie_matin, :categorie_aprem)',
        records
    )
    conn.commit()
    conn.close()

def write_json(records, json_path):
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(records, f, ensure_ascii=False, indent=2)

if __name__ == '__main__':
    base = os.path.dirname(os.path.abspath(__file__))
    raw = os.path.join(base, 'weather_raw.txt')
    db = os.path.join(base, 'weather.db')
    js = os.path.join(base, '..', 'src', 'data', 'weather.json')

    records = parse(raw)
    write_db(records, db)
    write_json(records, js)

    conn = sqlite3.connect(db)
    count = conn.execute('SELECT COUNT(*) FROM weather').fetchone()[0]
    tmax = conn.execute('SELECT MAX(temp_aprem) FROM weather').fetchone()[0]
    tmin = conn.execute('SELECT MIN(temp_matin) FROM weather').fetchone()[0]
    conn.close()

    print(f'  {count} records → {db}')
    print(f'  {count} records → {js}')
    print(f'  max: {tmax:.0f}°C, min: {tmin:.0f}°C')
