const API_BASE = 'http://localhost:5001/api';
const FALLBACK_DATA = () => import('./data/weather.json');

export async function fetchWeather(params = {}) {
  try {
    const qs = new URLSearchParams(params).toString();
    const url = `${API_BASE}/weather${qs ? '?' + qs : ''}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(2000) });
    if (!res.ok) throw new Error('API error');
    return await res.json();
  } catch {
    const mod = await FALLBACK_DATA();
    let data = mod.default;
    if (params.month && params.month !== 'all')
      data = data.filter(r => r.date.split('-')[1] === params.month.padStart(2, '0'));
    if (params.condition && params.condition !== 'all')
      data = data.filter(r => r.categorie_aprem === params.condition);
    return data;
  }
}

export async function fetchStats(month = 'all') {
  try {
    const qs = month !== 'all' ? `?month=${month}` : '';
    const res = await fetch(`${API_BASE}/stats${qs}`, { signal: AbortSignal.timeout(2000) });
    if (!res.ok) throw new Error('API error');
    return await res.json();
  } catch {
    const mod = await FALLBACK_DATA();
    const data = mod.default;
    let filtered = data;
    if (month !== 'all')
      filtered = data.filter(r => r.date.split('-')[1] === month.padStart(2, '0'));
    const tm = filtered.filter(r => r.temp_matin != null).map(r => r.temp_matin);
    const ta = filtered.filter(r => r.temp_aprem != null).map(r => r.temp_aprem);
    const tmMax = Math.max(...tm), taMax = Math.max(...ta);
    const tmMin = Math.min(...tm), taMin = Math.min(...ta);
    return {
      total: filtered.length,
      avg_matin: +(tm.reduce((a, b) => a + b, 0) / tm.length).toFixed(1),
      avg_aprem: +(ta.reduce((a, b) => a + b, 0) / ta.length).toFixed(1),
      max_aprem: taMax,
      min_matin: tmMin,
      max_date: data.find(r => r.temp_aprem === taMax)?.date || null,
      min_date: data.find(r => r.temp_matin === tmMin)?.date || null,
      soleil: filtered.filter(r => r.categorie_aprem === 'Soleil').length,
    };
  }
}

export async function fetchMonthlyStats() {
  try {
    const res = await fetch(`${API_BASE}/stats/monthly`, { signal: AbortSignal.timeout(2000) });
    if (!res.ok) throw new Error('API error');
    return await res.json();
  } catch {
    const mod = await FALLBACK_DATA();
    const data = mod.default;
    const months = {};
    for (const r of data) {
      const m = parseInt(r.date.split('-')[1]);
      if (!months[m]) months[m] = { matins: [], aprems: [] };
      if (r.temp_matin != null) months[m].matins.push(r.temp_matin);
      if (r.temp_aprem != null) months[m].aprems.push(r.temp_aprem);
    }
    return Object.entries(months).sort(([a], [b]) => a - b).map(([m, v]) => ({
      mois: parseInt(m),
      jours: v.matins.length,
      avg_matin: +(v.matins.reduce((a, b) => a + b, 0) / v.matins.length).toFixed(1),
      avg_aprem: +(v.aprems.reduce((a, b) => a + b, 0) / v.aprems.length).toFixed(1),
      min_matin: Math.min(...v.matins),
      max_aprem: Math.max(...v.aprems),
    }));
  }
}

export async function fetchConditions(month = 'all') {
  try {
    const qs = month !== 'all' ? `?month=${month}` : '';
    const res = await fetch(`${API_BASE}/conditions${qs}`, { signal: AbortSignal.timeout(2000) });
    if (!res.ok) throw new Error('API error');
    return await res.json();
  } catch {
    const mod = await FALLBACK_DATA();
    const data = mod.default;
    let filtered = data;
    if (month !== 'all')
      filtered = data.filter(r => r.date.split('-')[1] === month.padStart(2, '0'));
    const counts = {};
    for (const r of filtered) {
      const cat = r.categorie_aprem || 'Autre';
      counts[cat] = (counts[cat] || 0) + 1;
    }
    return Object.entries(counts).map(([cat, count]) => ({ cat, count }));
  }
}

export async function fetchPredictions(days = 7) {
  try {
    const res = await fetch(`${API_BASE}/predict?days=${days}`, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) throw new Error('API error');
    return await res.json();
  } catch {
    return null;
  }
}

export async function fetchInsights() {
  try {
    const res = await fetch(`${API_BASE}/insights`, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) throw new Error('API error');
    return await res.json();
  } catch {
    return null;
  }
}

export async function fetchSummary() {
  try {
    const res = await fetch(`${API_BASE}/summary`, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) throw new Error('API error');
    return await res.json();
  } catch {
    return null;
  }
}

export async function fetchPredictionSummary() {
  try {
    const res = await fetch(`${API_BASE}/predict/summary`, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) throw new Error('API error');
    return await res.json();
  } catch {
    return null;
  }
}

export async function addWeather(record) {
  const res = await fetch(`${API_BASE}/weather`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(record),
  });
  return await res.json();
}

export async function fetchForecast() {
  try {
    const res = await fetch(`${API_BASE}/forecast`, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error('API error');
    return await res.json();
  } catch {
    return null;
  }
}

export async function fetchMonths() {
  try {
    const res = await fetch(`${API_BASE}/months`, { signal: AbortSignal.timeout(2000) });
    if (!res.ok) throw new Error('API error');
    return await res.json();
  } catch {
    const mod = await FALLBACK_DATA();
    const data = mod.default;
    const months = [...new Set(data.map(r => parseInt(r.date.split('-')[1])))].sort();
    const names = { 1:'Janvier',2:'Février',3:'Mars',4:'Avril',5:'Mai',6:'Juin',
      7:'Juillet',8:'Août',9:'Septembre',10:'Octobre',11:'Novembre',12:'Décembre' };
    return months.map(m => ({ num: m, nom: names[m] }));
  }
}
