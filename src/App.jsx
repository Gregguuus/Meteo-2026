import { useState, useMemo, useEffect } from 'react';
import StatsCards from './components/StatsCards';
import TempChart from './components/TempChart';
import MonthlyChart from './components/MonthlyChart';
import ConditionsChart from './components/ConditionsChart';
import DataTable from './components/DataTable';
import {
  fetchWeather, fetchStats, fetchMonthlyStats,
  fetchConditions, fetchMonths,
} from './api';

const MONTH_NAMES = {
  1:'Janvier',2:'Février',3:'Mars',4:'Avril',5:'Mai',6:'Juin',
  7:'Juillet',8:'Août',9:'Septembre',10:'Octobre',11:'Novembre',12:'Décembre',
};

export default function App() {
  const [tab, setTab] = useState('apercu');
  const [monthFilter, setMonthFilter] = useState('all');
  const [conditionFilter, setConditionFilter] = useState('all');
  const [data, setData] = useState([]);
  const [stats, setStats] = useState(null);
  const [monthlyStats, setMonthlyStats] = useState([]);
  const [conditions, setConditions] = useState([]);
  const [months, setMonths] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [d, s, ms, c, m] = await Promise.all([
        fetchWeather(),
        fetchStats(),
        fetchMonthlyStats(),
        fetchConditions(),
        fetchMonths(),
      ]);
      setData(d);
      setStats(s);
      setMonthlyStats(ms);
      setConditions(c);
      setMonths(m);
      setLoading(false);
    }
    load();
  }, []);

  useEffect(() => {
    if (data.length === 0) return;
    const params = {};
    if (monthFilter !== 'all') params.month = monthFilter;
    if (conditionFilter !== 'all') params.condition = conditionFilter;

    async function refresh() {
      const [d, s, c] = await Promise.all([
        fetchWeather(params),
        fetchStats(monthFilter),
        fetchConditions(monthFilter),
      ]);
      setData(d);
      setStats(s);
      setConditions(c);
    }
    refresh();
  }, [monthFilter, conditionFilter]);

  if (loading) {
    return (
      <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: 12, animation: 'fadeUp 0.6s ease infinite alternate' }}>🌤</div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Chargement des données météo...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <header className="animate-fade" style={{ marginBottom: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 12,
              background: 'linear-gradient(135deg, var(--primary), #a78bfa)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 20, boxShadow: '0 4px 20px var(--primary-glow)',
            }}>🌤</div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.5px', margin: 0 }}>
              Météo <span className="gradient-text">2026</span>
            </h1>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            Givrand · Pornic · Vendée — <strong>{stats?.total || data.length}</strong> jours de relevés
            <span style={{ opacity: 0.5, marginLeft: 8 }}>| API: {stats ? '✓' : '✗'} live · JSON fallback</span>
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <select value={monthFilter} onChange={e => setMonthFilter(e.target.value)}>
            <option value="all">Tous les mois</option>
            {months.map(m => (
              <option key={m.num} value={m.num}>{m.nom}</option>
            ))}
          </select>
          <select value={conditionFilter} onChange={e => setConditionFilter(e.target.value)}>
            <option value="all">Toutes conditions</option>
            <option value="Soleil">☀️ Soleil</option>
            <option value="Nuageux">☁️ Nuageux</option>
            <option value="Pluie">🌧️ Pluie</option>
            <option value="Neige">❄️ Neige</option>
            <option value="Vent">💨 Vent</option>
          </select>
        </div>
      </header>

      {stats && <StatsCards stats={stats} />}

      <div className="tabs animate-fade delay-3">
        {[
          { key: 'apercu', label: 'Aperçu' },
          { key: 'mensuel', label: 'Mensuel' },
          { key: 'conditions', label: 'Conditions' },
          { key: 'donnees', label: 'Données' },
        ].map(t => (
          <button key={t.key}
            className={`tab-btn${tab === t.key ? ' active' : ''}`}
            onClick={() => setTab(t.key)}
          >{t.label}</button>
        ))}
      </div>

      {tab === 'apercu' && (
        <div className="card animate-fade delay-4">
          <div className="card-title">
            Évolution des températures
            <span className="gradient-line" style={{ display: 'block', marginTop: 8 }} />
          </div>
          <TempChart data={data} />
        </div>
      )}

      {tab === 'mensuel' && (
        <div className="grid-2">
          <div className="card animate-scale delay-1">
            <div className="card-title">Moyennes mensuelles</div>
            <MonthlyChart monthlyStats={monthlyStats} />
          </div>
          <div className="card animate-scale delay-2">
            <div className="card-title">Records par mois</div>
            <MonthlyRecords monthlyStats={monthlyStats} />
          </div>
        </div>
      )}

      {tab === 'conditions' && (
        <div className="grid-2">
          <div className="card animate-scale delay-1">
            <div className="card-title">Répartition</div>
            <ConditionsChart conditions={conditions} data={data} />
          </div>
          <div className="card animate-scale delay-2">
            <div className="card-title">Conditions par mois</div>
            <ConditionsByMonth data={data} months={months} />
          </div>
        </div>
      )}

      {tab === 'donnees' && (
        <div className="card animate-fade delay-3">
          <div className="card-title">Relevés détaillés</div>
          <DataTable data={data} />
        </div>
      )}

      <footer style={{
        textAlign: 'center', marginTop: 60, paddingTop: 24,
        borderTop: '1px solid var(--border)',
        color: 'var(--text-secondary)', fontSize: '0.75rem',
      }}>
        Météo 2026 · Relevés personnels · Givrand & Pornic, Vendée
        <br />
        <span style={{ opacity: 0.5 }}>Python/Flask API + React frontend · SQLite database</span>
      </footer>
    </div>
  );
}

function MonthlyRecords({ monthlyStats }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table>
        <thead>
          <tr>
            <th>Mois</th>
            <th style={{ textAlign: 'right' }}>🔥 Max</th>
            <th style={{ textAlign: 'right' }}>❄️ Min</th>
          </tr>
        </thead>
        <tbody>
          {monthlyStats.map(m => (
            <tr key={m.mois}>
              <td style={{ fontWeight: 600 }}>{MONTH_NAMES[m.mois]}</td>
              <td style={{ textAlign: 'right' }}>
                <span className="temp-hot">{m.max_aprem}°</span>
                <span style={{ marginLeft: 8, fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                  Ø {m.avg_aprem}°
                </span>
              </td>
              <td style={{ textAlign: 'right' }}>
                <span className="temp-cold">{m.min_matin}°</span>
                <span style={{ marginLeft: 8, fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                  Ø {m.avg_matin}°
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ConditionsByMonth({ data, months }) {
  const cats = ['Soleil', 'Nuageux', 'Pluie', 'Neige', 'Vent'];
  const monthData = {};
  for (const r of data) {
    const m = parseInt(r.date.split('-')[1]);
    if (!monthData[m]) monthData[m] = {};
    const cat = r.categorie_aprem || 'Autre';
    monthData[m][cat] = (monthData[m][cat] || 0) + 1;
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table>
        <thead>
          <tr>
            <th>Mois</th>
            {cats.map(c => <th key={c} style={{ textAlign: 'center', fontSize: '0.65rem' }}>{c}</th>)}
          </tr>
        </thead>
        <tbody>
          {months.map(m => {
            const d = monthData[m.num] || {};
            const total = Object.values(d).reduce((a, b) => a + b, 0);
            return (
              <tr key={m.num}>
                <td style={{ fontWeight: 600 }}>{m.nom}</td>
                {cats.map(c => {
                  const count = d[c] || 0;
                  const pct = total > 0 ? count / total : 0;
                  return (
                    <td key={c} style={{ textAlign: 'center' }}>
                      <div style={{
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        width: 30, height: 30, borderRadius: '50%',
                        background: count > 0 ? `rgba(${rgb(c)},${0.1 + pct * 0.5})` : 'transparent',
                        color: count > 0 ? `rgba(${rgb(c)},1)` : 'transparent',
                        fontSize: '0.75rem', fontWeight: 700,
                      }}>{count || ''}</div>
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function rgb(cat) {
  const m = { Soleil: '251,191,36', Nuageux: '107,114,128', Pluie: '59,130,246', Neige: '209,213,219', Vent: '236,72,153' };
  return m[cat] || '255,255,255';
}
