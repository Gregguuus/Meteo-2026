"""
Flask REST API — Météo 2026
endpoints:
  GET /api/weather         ?month=&condition=
  GET /api/weather/<date>
  GET /api/stats           ?month=
  GET /api/stats/monthly
  GET /api/conditions      ?month=
  GET /api/months
"""

import sqlite3, os, sys, urllib.request, json, ssl
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from flask import Flask, g, jsonify, request
from flask_cors import CORS
from analysis import predict, get_insights, generate_summary, generate_prediction_summary

app = Flask(__name__)
CORS(app)

DB = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'weather.db')

def get_db():
    if 'db' not in g:
        g.db = sqlite3.connect(DB)
        g.db.row_factory = sqlite3.Row
    return g.db

@app.teardown_appcontext
def close_db(exc):
    db = g.pop('db', None)
    if db: db.close()

def dict_from_row(row):
    return dict(row) if row else None

MONTH_NAMES = {
    1:'Janvier',2:'Février',3:'Mars',4:'Avril',5:'Mai',6:'Juin',
    7:'Juillet',8:'Août',9:'Septembre',10:'Octobre',11:'Novembre',12:'Décembre'
}

@app.route('/api/weather')
def get_weather():
    db = get_db()
    month = request.args.get('month')
    condition = request.args.get('condition')

    query = 'SELECT * FROM weather'
    params = []
    filters = []

    if month and month != 'all':
        filters.append("CAST(substr(date,6,2) AS INTEGER) = ?")
        params.append(int(month))
    if condition and condition != 'all':
        filters.append("categorie_aprem = ?")
        params.append(condition)

    if filters:
        query += ' WHERE ' + ' AND '.join(filters)
    query += ' ORDER BY date ASC'

    rows = db.execute(query, params).fetchall()
    return jsonify([dict_from_row(r) for r in rows])

@app.route('/api/weather/<date_str>')
def get_weather_date(date_str):
    db = get_db()
    row = db.execute('SELECT * FROM weather WHERE date = ?', (date_str,)).fetchone()
    if not row:
        return jsonify({'error': 'not found'}), 404
    return jsonify(dict_from_row(row))

@app.route('/api/stats')
def get_stats():
    db = get_db()
    month = request.args.get('month')

    where = ''
    params = []
    if month and month != 'all':
        where = 'WHERE CAST(substr(date,6,2) AS INTEGER) = ?'
        params.append(int(month))

    row = db.execute(f'''
        SELECT
            COUNT(*) as total,
            ROUND(AVG(temp_matin), 1) as avg_matin,
            ROUND(AVG(temp_aprem), 1) as avg_aprem,
            ROUND(MIN(temp_matin), 1) as min_matin,
            ROUND(MAX(temp_aprem), 1) as max_aprem
        FROM weather {where}
    ''', params).fetchone()

    stats = dict(row)

    max_row = db.execute(f'''
        SELECT date, temp_aprem FROM weather {where}
        ORDER BY temp_aprem DESC LIMIT 1
    ''', params).fetchone()
    min_row = db.execute(f'''
        SELECT date, temp_matin FROM weather {where}
        ORDER BY temp_matin ASC LIMIT 1
    ''', params).fetchone()
    soleil = db.execute(f'''
        SELECT COUNT(*) as c FROM weather
        WHERE categorie_aprem = 'Soleil' {("AND CAST(substr(date,6,2) AS INTEGER) = ?" if month and month != 'all' else '')}
    ''', params).fetchone()

    stats['max_date'] = max_row['date'] if max_row else None
    stats['min_date'] = min_row['date'] if min_row else None
    stats['soleil'] = soleil['c'] if soleil else 0
    if stats['total']:
        stats['pct_soleil'] = round(stats['soleil'] / stats['total'] * 100, 1)
    return jsonify(stats)

@app.route('/api/stats/monthly')
def get_monthly_stats():
    db = get_db()
    rows = db.execute('''
        SELECT
            CAST(substr(date,6,2) AS INTEGER) as mois,
            COUNT(*) as jours,
            ROUND(AVG(temp_matin), 1) as avg_matin,
            ROUND(AVG(temp_aprem), 1) as avg_aprem,
            ROUND(MIN(temp_matin), 1) as min_matin,
            ROUND(MAX(temp_aprem), 1) as max_aprem
        FROM weather
        GROUP BY mois
        ORDER BY mois
    ''').fetchall()

    result = []
    for r in rows:
        d = dict(r)
        d['mois_nom'] = MONTH_NAMES.get(d['mois'], '')
        result.append(d)
    return jsonify(result)

@app.route('/api/conditions')
def get_conditions():
    db = get_db()
    month = request.args.get('month')

    query = 'SELECT categorie_aprem as cat, COUNT(*) as count FROM weather'
    params = []
    if month and month != 'all':
        query += ' WHERE CAST(substr(date,6,2) AS INTEGER) = ?'
        params.append(int(month))
    query += ' GROUP BY cat ORDER BY count DESC'

    rows = db.execute(query, params).fetchall()
    return jsonify([dict(r) for r in rows])

@app.route('/api/months')
def get_months():
    db = get_db()
    rows = db.execute('''
        SELECT DISTINCT CAST(substr(date,6,2) AS INTEGER) as num
        FROM weather ORDER BY num
    ''').fetchall()
    result = [{'num': r['num'], 'nom': MONTH_NAMES[r['num']]} for r in rows]
    return jsonify(result)

@app.route('/api/weather', methods=['POST'])
def add_weather():
    """Add or update a weather record."""
    db = get_db()
    body = request.get_json()
    if not body or 'date' not in body:
        return jsonify({'error': 'date required'}), 400

    date = body['date']
    temp_matin = body.get('temp_matin')
    temp_aprem = body.get('temp_aprem')
    categorie_aprem = body.get('categorie_aprem')

    existing = db.execute('SELECT date FROM weather WHERE date = ?', (date,)).fetchone()
    if existing:
        db.execute('''UPDATE weather SET temp_matin=?, temp_aprem=?, categorie_aprem=?
                      WHERE date=?''', (temp_matin, temp_aprem, categorie_aprem, date))
    else:
        db.execute('''INSERT INTO weather (date, temp_matin, temp_aprem, categorie_aprem)
                      VALUES (?, ?, ?, ?)''', (date, temp_matin, temp_aprem, categorie_aprem))
    db.commit()
    return jsonify({'status': 'ok', 'date': date})

@app.route('/api/health')
def health():
    db = get_db()
    count = db.execute('SELECT COUNT(*) FROM weather').fetchone()[0]
    return jsonify({'status': 'ok', 'records': count})

@app.route('/api/predict')
def get_predict():
    days = request.args.get('days', 7, type=int)
    return jsonify(predict(min(days, 14)))

@app.route('/api/insights')
def get_insights_api():
    return jsonify(get_insights())

@app.route('/api/summary')
def get_summary():
    import concurrent.futures
    insights = get_insights()
    if 'error' in insights:
        return jsonify(insights)
    executor = concurrent.futures.ThreadPoolExecutor(max_workers=1)
    future = executor.submit(generate_summary, insights)
    try:
        text = future.result(timeout=8)
    except concurrent.futures.TimeoutError:
        from analysis import _template_summary
        text = _template_summary(insights)
    return jsonify({'summary': text})

WMO_CODES = {0:'Soleil',1:'Soleil',2:'Nuageux',3:'Nuageux',45:'Brouillard',48:'Brouillard',51:'Pluie',53:'Pluie',55:'Pluie',61:'Pluie',63:'Pluie',65:'Pluie',71:'Neige',73:'Neige',75:'Neige',80:'Pluie',81:'Pluie',82:'Pluie',85:'Neige',86:'Neige',95:'Orage',96:'Orage',99:'Orage'}

@app.route('/api/forecast')
def get_forecast():
    """Proxy to Open-Meteo (free, no key) for Bouffémont."""
    url = ("https://api.open-meteo.com/v1/forecast?"
           "latitude=49.0442&longitude=2.3000"
           "&daily=temperature_2m_max,temperature_2m_min,weathercode,precipitation_sum"
           "&timezone=Europe/Paris&forecast_days=7")
    try:
        ctx = ssl.create_default_context()
        try:
            import certifi
            ctx.load_verify_locations(certifi.where())
        except ImportError:
            pass
        req = urllib.request.Request(url, headers={'User-Agent': 'Meteo2026/1.0'})
        with urllib.request.urlopen(req, timeout=5, context=ctx) as resp:
            data = json.loads(resp.read())
        daily = data.get('daily', {})
        result = []
        for i, date in enumerate(daily.get('time', [])):
            wmo = daily['weathercode'][i]
            result.append({
                'date': date,
                'temp_max': daily['temperature_2m_max'][i],
                'temp_min': daily['temperature_2m_min'][i],
                'condition': WMO_CODES.get(wmo, 'Nuageux'),
                'precipitation': daily['precipitation_sum'][i],
            })
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/predict/summary')
def get_prediction_summary():
    import concurrent.futures
    insights = get_insights()
    predictions = predict(7)
    if 'error' in insights or 'error' in predictions:
        return jsonify({'error': 'Cannot generate summary'})
    executor = concurrent.futures.ThreadPoolExecutor(max_workers=1)
    future = executor.submit(generate_prediction_summary, predictions, insights)
    try:
        text = future.result(timeout=8)
    except concurrent.futures.TimeoutError:
        from analysis import _template_prediction
        text = _template_prediction(predictions, insights)
    return jsonify({'summary': text})

if __name__ == '__main__':
    print(f'meteo api — 154 records in database')
    app.run(host='0.0.0.0', port=5000, debug=True)
