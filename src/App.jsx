import { useState, useMemo } from 'react';
import data from './data/weather.json';
import StatsCards from './components/StatsCards';
import TempChart from './components/TempChart';
import MonthlyChart from './components/MonthlyChart';
import ConditionsChart from './components/ConditionsChart';
import DataTable from './components/DataTable';

const MONTH_NAMES = {
  1: 'Janvier', 2: 'Février', 3: 'Mars', 4: 'Avril', 5: 'Mai', 6: 'Juin',
  7: 'Juillet', 8: 'Août', 9: 'Septembre', 10: 'Octobre', 11: 'Novembre', 12: 'Décembre',
};

export default function App() {
  const [tab, setTab] = useState('apercu');
  const [monthFilter, setMonthFilter] = useState('all');
  const [conditionFilter, setConditionFilter] = useState('all');

  const filtered = useMemo(() => {
    let f = [...data];
    if (monthFilter !== 'all')
      f = f.filter(r => parseInt(r.date.split('-')[1]) === parseInt(monthFilter));
    if (conditionFilter !== 'all')
      f = f.filter(r => r.categorie_aprem === conditionFilter);
    return f;
  }, [monthFilter, conditionFilter]);

  return (
    <div className="container">
      <header className="animate-fade" style={{ marginBottom: 40, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 12,
              background: 'linear-gradient(135deg, var(--primary), #a78bfa)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 20, boxShadow: '0 4px 20px var(--primary-glow)',
            }}>🌤</div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 800, letterSpacing: '-0.5px' }}>
              Météo <span className="gradient-text">2026</span>
            </h1>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
            Givrand · Pornic · Vendée — {data.length} jours de relevés personnels
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <select value={monthFilter} onChange={e => setMonthFilter(e.target.value)}>
            <option value="all">Tous les mois</option>
            {Object.entries(MONTH_NAMES).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
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

      <StatsCards data={filtered} />

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
          <TempChart data={filtered} />
        </div>
      )}

      {tab === 'mensuel' && (
        <div className="grid-2">
          <div className="card animate-scale delay-1">
            <div className="card-title">Moyennes mensuelles</div>
            <MonthlyChart data={data} />
          </div>
          <div className="card animate-scale delay-2">
            <div className="card-title">Records par mois</div>
            <MonthlyRecords data={data} />
          </div>
        </div>
      )}

      {tab === 'conditions' && (
        <div className="grid-2">
          <div className="card animate-scale delay-1">
            <div className="card-title">Répartition</div>
            <ConditionsChart data={filtered} />
          </div>
          <div className="card animate-scale delay-2">
            <div className="card-title">Conditions par mois</div>
            <ConditionsByMonth data={data} />
          </div>
        </div>
      )}

      {tab === 'donnees' && (
        <div className="card animate-fade delay-3">
          <div className="card-title">Relevés détaillés</div>
          <DataTable data={filtered} />
        </div>
      )}

      <footer style={{
        textAlign: 'center', marginTop: 60, paddingTop: 24,
        borderTop: '1px solid var(--border)',
        color: 'var(--text-secondary)', fontSize: '0.75rem',
      }}>
        Relevés météo personnels · Givrand & Pornic 2026
      </footer>
    </div>
  );
}

function MonthlyRecords({ data }) {
  const months = {};
  for (const r of data) {
    const m = parseInt(r.date.split('-')[1]);
    if (!months[m]) months[m] = { max: -Infinity, min: Infinity, maxDate: '', minDate: '' };
    if (r.temp_aprem != null && r.temp_aprem > months[m].max) {
      months[m].max = r.temp_aprem;
      months[m].maxDate = fmt(r.date);
    }
    if (r.temp_matin != null && r.temp_matin < months[m].min) {
      months[m].min = r.temp_matin;
      months[m].minDate = fmt(r.date);
    }
  }

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
          {Object.entries(months).map(([m, v]) => (
            <tr key={m}>
              <td style={{ fontWeight: 600 }}>{MONTH_NAMES[m]}</td>
              <td style={{ textAlign: 'right' }}>
                <span className="temp-hot">{v.max > -Infinity ? `${v.max}°` : '-'}</span>
                <span style={{ marginLeft: 8, fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{v.maxDate}</span>
              </td>
              <td style={{ textAlign: 'right' }}>
                <span className="temp-cold">{v.min < Infinity ? `${v.min}°` : '-'}</span>
                <span style={{ marginLeft: 8, fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{v.minDate}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ConditionsByMonth({ data }) {
  const months = {};
  const order = [1, 2, 3, 4, 5, 6, 7];
  for (const r of data) {
    const m = parseInt(r.date.split('-')[1]);
    if (!months[m]) months[m] = {};
    const cat = r.categorie_aprem || 'Autre';
    months[m][cat] = (months[m][cat] || 0) + 1;
  }
  const cats = ['Soleil', 'Nuageux', 'Pluie', 'Neige', 'Vent'];

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
          {order.filter(m => months[m]).map(m => (
            <tr key={m}>
              <td style={{ fontWeight: 600 }}>{MONTH_NAMES[m]}</td>
              {cats.map(c => {
                const count = months[m][c] || 0;
                const total = Object.values(months[m]).reduce((a, b) => a + b, 0);
                const pct = total > 0 ? (count / total) * 100 : 0;
                return (
                  <td key={c} style={{ textAlign: 'center' }}>
                    <div style={{
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      width: 32, height: 32, borderRadius: '50%',
                      background: count > 0 ? getColor(c, 0.15 + pct / 200) : 'transparent',
                      color: getColor(c, 1),
                      fontSize: '0.78rem', fontWeight: 700,
                    }}>{count || ''}</div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function getColor(cat, opacity) {
  const m = { Soleil: `rgba(251,191,36,${opacity})`, Nuageux: `rgba(107,114,128,${opacity})`,
    Pluie: `rgba(59,130,246,${opacity})`, Neige: `rgba(209,213,219,${opacity})`, Vent: `rgba(236,72,153,${opacity})` };
  return m[cat] || `rgba(255,255,255,${opacity})`;
}

function fmt(d) {
  const [y, m, day] = d.split('-');
  const ms = ['', 'Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
  return `${parseInt(day)} ${ms[parseInt(m)]}`;
}
