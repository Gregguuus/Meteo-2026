import { useState, useMemo } from 'react';
import data from './data/weather.json';
import StatsCards from './components/StatsCards';
import TempChart from './components/TempChart';
import MonthlyChart from './components/MonthlyChart';
import ConditionsChart from './components/ConditionsChart';
import DataTable from './components/DataTable';

function formatDate(d) {
  const [y, m, day] = d.split('-');
  return `${day}/${m}`;
}

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
    if (monthFilter !== 'all') {
      f = f.filter((r) => {
        const m = parseInt(r.date.split('-')[1]);
        return m === parseInt(monthFilter);
      });
    }
    if (conditionFilter !== 'all') {
      f = f.filter((r) => r.categorie_aprem === conditionFilter);
    }
    return f;
  }, [monthFilter, conditionFilter]);

  return (
    <div className="container">
      <header style={{ marginBottom: 28, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>Météo 2026</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: 2 }}>
            Givrand · Pornic · Vendée — {data.length} jours de relevés
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
            style={{
              padding: '6px 12px',
              borderRadius: 6,
              border: '1px solid var(--border)',
              fontSize: '0.85rem',
              background: 'white',
            }}
          >
            <option value="all">Tous les mois</option>
            {Object.entries(MONTH_NAMES).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <select
            value={conditionFilter}
            onChange={(e) => setConditionFilter(e.target.value)}
            style={{
              padding: '6px 12px',
              borderRadius: 6,
              border: '1px solid var(--border)',
              fontSize: '0.85rem',
              background: 'white',
            }}
          >
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

      <div className="tabs">
        {[
          { key: 'apercu', label: 'Aperçu' },
          { key: 'mensuel', label: 'Mensuel' },
          { key: 'conditions', label: 'Conditions' },
          { key: 'donnees', label: 'Données' },
        ].map((t) => (
          <button
            key={t.key}
            className={`tab-btn${tab === t.key ? ' active' : ''}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'apercu' && (
        <div className="card">
          <div className="card-title">Évolution des températures</div>
          <TempChart data={filtered} />
        </div>
      )}

      {tab === 'mensuel' && (
        <div className="grid-2">
          <div className="card">
            <div className="card-title">Moyennes mensuelles</div>
            <MonthlyChart data={data} />
          </div>
          <div className="card">
            <div className="card-title">Records par mois</div>
            <MonthlyRecords data={data} />
          </div>
        </div>
      )}

      {tab === 'conditions' && (
        <div className="grid-2">
          <div className="card">
            <div className="card-title">Répartition des conditions</div>
            <ConditionsChart data={filtered} />
          </div>
          <div className="card">
            <div className="card-title">Conditions par mois</div>
            <ConditionsByMonth data={data} />
          </div>
        </div>
      )}

      {tab === 'donnees' && (
        <div className="card">
          <div className="card-title">Relevés détaillés</div>
          <DataTable data={filtered} />
        </div>
      )}
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
      months[m].maxDate = formatDate(r.date);
    }
    if (r.temp_matin != null && r.temp_matin < months[m].min) {
      months[m].min = r.temp_matin;
      months[m].minDate = formatDate(r.date);
    }
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table>
        <thead>
          <tr>
            <th>Mois</th>
            <th>🔥 Max</th>
            <th>Date</th>
            <th>❄️ Min</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(months).map(([m, v]) => (
            <tr key={m}>
              <td style={{ fontWeight: 600 }}>{MONTH_NAMES[m]}</td>
              <td className="temp-hot">{v.max > -Infinity ? `${v.max}°` : '-'}</td>
              <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{v.maxDate}</td>
              <td className="temp-cold">{v.min < Infinity ? `${v.min}°` : '-'}</td>
              <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{v.minDate}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ConditionsByMonth({ data }) {
  const months = {};
  const order = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  for (const r of data) {
    const m = parseInt(r.date.split('-')[1]);
    if (!months[m]) months[m] = {};
    const cat = r.categorie_aprem || 'Autre';
    months[m][cat] = (months[m][cat] || 0) + 1;
  }

  const cats = ['Soleil', 'Nuageux', 'Pluie', 'Neige', 'Vent'];
  const colors = { Soleil: '#f59e0b', Nuageux: '#6b7280', Pluie: '#3b82f6', Neige: '#9ca3af', Vent: '#ec4899' };

  return (
    <div style={{ overflowX: 'auto' }}>
      <table>
        <thead>
          <tr>
            <th>Mois</th>
            {cats.map((c) => (
              <th key={c} style={{ textAlign: 'center', fontSize: '0.7rem' }}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {order.filter((m) => months[m]).map((m) => {
            const total = Object.values(months[m]).reduce((a, b) => a + b, 0);
            return (
              <tr key={m}>
                <td style={{ fontWeight: 600 }}>{MONTH_NAMES[m]}</td>
                {cats.map((c) => {
                  const count = months[m][c] || 0;
                  const pct = total > 0 ? (count / total) * 100 : 0;
                  return (
                    <td key={c} style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                      <div style={{
                        display: 'inline-block',
                        width: 28,
                        height: 28,
                        borderRadius: '50%',
                        background: count > 0 ? colors[c] : 'transparent',
                        opacity: count > 0 ? 0.7 + (pct / 100) * 0.3 : 0,
                        lineHeight: '28px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        color: 'white',
                      }}>
                        {count > 0 ? count : ''}
                      </div>
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
