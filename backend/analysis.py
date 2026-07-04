"""
Predictions & analysis engine — Météo 2026
Uses numpy for linear/polynomial regression + optional Ollama for NL summaries.
"""

import sqlite3, os, json, subprocess
from math import sqrt
from collections import Counter

try:
    import numpy as np
    HAS_NUMPY = True
except ImportError:
    HAS_NUMPY = False

DB = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'weather.db')

def get_data():
    conn = sqlite3.connect(DB)
    conn.row_factory = sqlite3.Row
    rows = conn.execute('SELECT * FROM weather ORDER BY date ASC').fetchall()
    conn.close()
    return [dict(r) for r in rows]


# ── Predictions ──────────────────────────────────────────────────────────────

def predict(days_ahead=7):
    """Predict next `days_ahead` days using linear regression on each series."""
    data = get_data()
    if len(data) < 3:
        return {'error': 'Not enough data'}

    n = len(data)
    x = list(range(n))
    y_matin = [r['temp_matin'] or 0 for r in data]
    y_aprem = [r['temp_aprem'] or 0 for r in data]

    def _linreg(xs, ys):
        if not HAS_NUMPY:
            # pure python linear regression
            sx = sum(xs); sy = sum(ys); n_ = len(xs)
            sxx = sum(v*v for v in xs); sxy = sum(xs[i]*ys[i] for i in range(n_))
            slope = (n_ * sxy - sx * sy) / (n_ * sxx - sx * sx) if (n_ * sxx - sx * sx) != 0 else 0
            intercept = (sy - slope * sx) / n_
            return slope, intercept
        A = np.vstack([xs, np.ones(len(xs))]).T
        m, c = np.linalg.lstsq(A, ys, rcond=None)[0]
        return float(m), float(c)

    slope_m, intercept_m = _linreg(x, y_matin)
    slope_a, intercept_a = _linreg(x, y_aprem)

    predictions = []
    last_date = data[-1]['date']
    year, month, day = last_date.split('-')

    for i in range(1, days_ahead + 1):
        xi = n - 1 + i
        pred_m = round(slope_m * xi + intercept_m, 1)
        pred_a = round(slope_a * xi + intercept_a, 1)

        # increment date
        import datetime
        d = datetime.date(int(year), int(month), int(day)) + datetime.timedelta(days=i)
        predictions.append({
            'date': d.isoformat(),
            'temp_matin': max(-10, min(45, pred_m)),
            'temp_aprem': max(-10, min(45, pred_a)),
        })

    return predictions


# ── Analysis / Insights ─────────────────────────────────────────────────────

def get_insights():
    """Return structured analysis of the data."""
    data = get_data()
    if not data:
        return {'error': 'No data'}

    temps_m = [r['temp_matin'] for r in data if r['temp_matin'] is not None]
    temps_a = [r['temp_aprem'] for r in data if r['temp_aprem'] is not None]

    if not temps_m or not temps_a:
        return {'error': 'Insufficient temperature data'}

    avg_m = sum(temps_m) / len(temps_m)
    avg_a = sum(temps_a) / len(temps_a)

    insights = {}

    # ── Global trends
    insights['global'] = {
        'avg_matin': round(avg_m, 1),
        'avg_aprem': round(avg_a, 1),
        'max_aprem': max(temps_a),
        'min_matin': min(temps_m),
        'max_aprem_date': next((r['date'] for r in data if r['temp_aprem'] == max(temps_a)), None),
        'min_matin_date': next((r['date'] for r in data if r['temp_matin'] == min(temps_m)), None),
    }

    # ── Heatwaves (>=3 consecutive days with aprem >= 30°C)
    heatwaves = []
    current = []
    for r in data:
        if r['temp_aprem'] and r['temp_aprem'] >= 30:
            current.append(r)
        else:
            if len(current) >= 3:
                heatwaves.append({
                    'start': current[0]['date'],
                    'end': current[-1]['date'],
                    'days': len(current),
                    'max_temp': max(r['temp_aprem'] for r in current),
                    'avg_temp': round(sum(r['temp_aprem'] for r in current) / len(current), 1),
                })
            current = []
    if len(current) >= 3:
        heatwaves.append({
            'start': current[0]['date'],
            'end': current[-1]['date'],
            'days': len(current),
            'max_temp': max(r['temp_aprem'] for r in current),
            'avg_temp': round(sum(r['temp_aprem'] for r in current) / len(current), 1),
        })
    insights['heatwaves'] = heatwaves

    # ── Cold spells (>=3 consecutive days with matin <= 0°C)
    coldspells = []
    current = []
    for r in data:
        if r['temp_matin'] is not None and r['temp_matin'] <= 0:
            current.append(r)
        else:
            if len(current) >= 3:
                coldspells.append({
                    'start': current[0]['date'],
                    'end': current[-1]['date'],
                    'days': len(current),
                    'min_temp': min(r['temp_matin'] for r in current),
                    'avg_temp': round(sum(r['temp_matin'] for r in current) / len(current), 1),
                })
            current = []
    if len(current) >= 3:
        coldspells.append({
            'start': current[0]['date'],
            'end': current[-1]['date'],
            'days': len(current),
            'min_temp': min(r['temp_matin'] for r in current),
            'avg_temp': round(sum(r['temp_matin'] for r in current) / len(current), 1),
        })
    insights['coldspells'] = coldspells

    # ── Anomalies (days where temp deviates > 2 * std from monthly avg)
    anomalies = []
    by_month = {}
    for r in data:
        m = int(r['date'].split('-')[1])
        if m not in by_month:
            by_month[m] = {'matins': [], 'aprems': [], 'days': []}
        if r['temp_matin'] is not None:
            by_month[m]['matins'].append(r['temp_matin'])
        if r['temp_aprem'] is not None:
            by_month[m]['aprems'].append(r['temp_aprem'])
        by_month[m]['days'].append(r)

    for m, v in by_month.items():
        if not v['aprems']: continue
        m_avg = sum(v['aprems']) / len(v['aprems'])
        m_std = sqrt(sum((t - m_avg)**2 for t in v['aprems']) / len(v['aprems']))
        for r in v['days']:
            if r['temp_aprem'] and abs(r['temp_aprem'] - m_avg) > 2 * m_std:
                anomalies.append({
                    'date': r['date'],
                    'temp': r['temp_aprem'],
                    'month_avg': round(m_avg, 1),
                    'diff': round(r['temp_aprem'] - m_avg, 1),
                    'type': 'chaud' if r['temp_aprem'] > m_avg else 'froid',
                })
    anomalies.sort(key=lambda x: abs(x['diff']), reverse=True)
    insights['anomalies'] = anomalies[:10]

    # ── Biggest temperature swings (diff between aprem and matin)
    swings = []
    for r in data:
        if r['temp_matin'] is not None and r['temp_aprem'] is not None:
            swings.append({
                'date': r['date'],
                'matin': r['temp_matin'],
                'aprem': r['temp_aprem'],
                'swing': round(r['temp_aprem'] - r['temp_matin'], 1),
            })
    swings.sort(key=lambda x: x['swing'], reverse=True)
    insights['biggest_swings'] = swings[:5]
    insights['smallest_swings'] = swings[-5:][::-1]

    # ── Monthly trends
    monthly = []
    prev_avg = None
    for m in sorted(by_month.keys()):
        v = by_month[m]
        ma = round(sum(v['aprems']) / len(v['aprems']), 1) if v['aprems'] else None
        trend = None
        if prev_avg is not None and ma is not None:
            diff = round(ma - prev_avg, 1)
            trend = {'direction': 'hausse' if diff > 0 else ('baisse' if diff < 0 else 'stable'), 'diff': abs(diff)}
        monthly.append({
            'mois': m,
            'avg_aprem': ma,
            'avg_matin': round(sum(v['matins']) / len(v['matins']), 1) if v['matins'] else None,
            'trend': trend,
        })
        if ma is not None:
            prev_avg = ma
    insights['monthly_trends'] = monthly

    return insights


# ── Natural language summary (via Ollama) ──────────────────────────────────

def generate_summary(insights):
    """Generate a French summary — uses Ollama if available, falls back to template."""
    if 'error' in insights:
        return "Données insuffisantes pour générer un résumé."

    try:
        prompt = f"""Tu es un météorologue. Résume ces données météo de Bouffémont (Val-d'Oise) en 3-4 phrases en français, style bulletin météo TV :

{json.dumps(insights, indent=2, ensure_ascii=False)}

Réponds uniquement avec le texte du résumé, sans introduction."""
        result = subprocess.run(
            ['ollama', 'run', 'llama2'],
            input=prompt.encode(), capture_output=True, timeout=60,
        )
        if result.returncode == 0:
            return result.stdout.decode().strip()
    except Exception:
        pass

    return _template_summary(insights)

def generate_prediction_summary(predictions, insights):
    """Generate a French prediction summary — Ollama or template."""
    try:
        prompt = f"""Tu es un météorologue. Fais une prévision météo pour les 7 prochains jours à Bouffémont (Val-d'Oise) en 2-3 phrases en français, basée sur ces données :

Prévisions: {json.dumps(predictions, ensure_ascii=False)}

Tendances actuelles: {json.dumps(insights.get('global', {}), ensure_ascii=False)}

Réponds uniquement avec le texte de la prévision."""
        result = subprocess.run(
            ['ollama', 'run', 'llama2'],
            input=prompt.encode(), capture_output=True, timeout=60,
        )
        if result.returncode == 0:
            return result.stdout.decode().strip()
    except Exception:
        pass

    return _template_prediction(predictions, insights)

def _template_summary(insights):
    """Fallback template-based French summary."""
    g = insights.get('global', {})
    parts = []

    avg = round((g.get('avg_matin', 0) + g.get('avg_aprem', 0)) / 2, 1)
    parts.append(f"Sur l'ensemble des relevés, la température moyenne à Bouffémont est de {avg}°C.")

    if insights.get('heatwaves'):
        h = insights['heatwaves'][0]
        parts.append(f"Une vague de chaleur de {h['days']} jours a été enregistrée du {h['start']} au {h['end']}, avec un pic à {h['max_temp']}°C.")

    if insights.get('coldspells'):
        c = insights['coldspells'][0]
        parts.append(f"Une période de gel de {c['days']} jours a eu lieu du {c['start']} au {c['end']}, avec une minimale de {c['min_temp']}°C.")

    anomalies = insights.get('anomalies', [])
    if anomalies:
        hottest = [a for a in anomalies if a['type'] == 'chaud']
        if hottest:
            a = hottest[0]
            parts.append(f"Anomalie notable : le {a['date']} avec {a['temp']}°C, soit {a['diff']:+.1f}°C au-dessus de la moyenne mensuelle.")

    return ' '.join(parts)

def _template_prediction(predictions, insights):
    """Fallback template-based French prediction summary."""
    if not predictions:
        return "Prévision non disponible."

    avg_m = round(sum(p['temp_matin'] for p in predictions) / len(predictions), 1)
    avg_a = round(sum(p['temp_aprem'] for p in predictions) / len(predictions), 1)
    max_a = max(p['temp_aprem'] for p in predictions)
    min_m = min(p['temp_matin'] for p in predictions)

    g = insights.get('global', {})
    trend = "hausse" if avg_a > (g.get('avg_aprem', 0) or 0) else "baisse" if avg_a < (g.get('avg_aprem', 0) or 0) else "stabilité"

    return f"Pour les 7 prochains jours, la tendance est à la {trend} avec une moyenne de {avg_m}°C le matin et {avg_a}°C l'après-midi. Les maximales pourraient atteindre {max_a}°C et les minimales {min_m}°C. Ces prévisions sont basées sur une régression linéaire des données historiques de 2026."
