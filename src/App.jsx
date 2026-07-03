import { useState, useEffect } from 'react';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import {
  fetchWeather, fetchStats, fetchMonthlyStats,
  fetchConditions, fetchMonths,
  fetchPredictions, fetchInsights, fetchSummary, fetchPredictionSummary,
} from './api';

const MONTH_NAMES = { 1:'Janvier',2:'Février',3:'Mars',4:'Avril',5:'Mai',6:'Juin',7:'Juillet',8:'Août',9:'Septembre',10:'Octobre',11:'Novembre',12:'Décembre' };
const COND_ICONS = { Soleil:'☀️', Nuageux:'☁️', Pluie:'🌧️', Neige:'❄️', Vent:'💨' };
const COND_COLORS = { Soleil:'#f59e0b', Nuageux:'#6b7280', Pluie:'#3b82f6', Neige:'#e5e7eb', Vent:'#ec4899' };
const COND_NAMES = { Soleil:'Soleil', Nuageux:'Nuageux', Pluie:'Pluie', Neige:'Neige', Vent:'Vent' };

export default function App() {
  const [tab, setTab] = useState('apercu');
  const [monthFilter, setMonthFilter] = useState('all');
  const [data, setData] = useState([]);
  const [stats, setStats] = useState(null);
  const [monthlyStats, setMonthlyStats] = useState([]);
  const [conditions, setConditions] = useState([]);
  const [months, setMonths] = useState([]);
  const [predictions, setPredictions] = useState(null);
  const [insights, setInsights] = useState(null);
  const [summary, setSummary] = useState(null);
  const [predSummary, setPredSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    async function load() {
      const [d, s, ms, c, m] = await Promise.all([
        fetchWeather(), fetchStats(), fetchMonthlyStats(), fetchConditions(), fetchMonths(),
      ]);
      setData(d); setStats(s); setMonthlyStats(ms); setConditions(c); setMonths(m);
      setLoading(false);
    }
    load();
  }, []);

  useEffect(() => {
    (async () => {
      const [p, i] = await Promise.all([fetchPredictions(7), fetchInsights()]);
      setPredictions(p); setInsights(i);
    })();
  }, []);

  useEffect(() => {
    if (tab === 'previsions' && !summary && !aiLoading) {
      setAiLoading(true);
      Promise.all([fetchSummary(), fetchPredictionSummary()]).then(([s, p]) => {
        setSummary(s); setPredSummary(p); setAiLoading(false);
      });
    }
  }, [tab]);

  useEffect(() => {
    if (!data.length || loading) return;
    async function refresh() {
      const [d, s, c] = await Promise.all([
        fetchWeather(monthFilter !== 'all' ? { month: monthFilter } : {}),
        fetchStats(monthFilter),
        fetchConditions(monthFilter),
      ]);
      setData(d); setStats(s); setConditions(c);
    }
    refresh();
  }, [monthFilter]);

  if (loading) return <Loader />;

  return (
    <div className="container">
      <header className="header">
        <div className="header-left">
          <div className="logo">🌤</div>
          <div>
            <h1>Météo <span>2026</span></h1>
            <div className="header-sub">
              Givrand & Pornic · Vendée
              <span className="badge badge-success">● Live</span>
              <span className="badge">{stats?.total} jours</span>
            </div>
          </div>
        </div>
        <div className="filter-bar">
          <select value={monthFilter} onChange={e => setMonthFilter(e.target.value)}>
            <option value="all">Tous les mois</option>
            {months.map(m => <option key={m.num} value={m.num}>{m.nom}</option>)}
          </select>
        </div>
      </header>

      <HeroCards stats={stats} />

      <div className="tabs animate-fade">
        {[
          { key:'apercu', label:'Évolution' },
          { key:'mensuel', label:'Mensuel' },
          { key:'conditions', label:'Conditions' },
          { key:'previsions', label:'Prévisions IA' },
          { key:'donnees', label:'Données' },
        ].map(t => (
          <button key={t.key} className={`tab-btn${tab === t.key ? ' active' : ''}`} onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'apercu' && (
        <div className="bento">
          <div className="glass wide animate-scale delay-1" style={{ padding: 20 }} key={`chart-${monthFilter}`}>
            <div className="section-title">Températures matin · après-midi</div>
            <TempChart data={data} />
          </div>
          <div className="glass animate-scale delay-2" style={{ padding: 20 }}>
            <div className="section-title">Conditions</div>
            <ConditionsPie conditions={conditions} />
          </div>
          <div className="glass animate-scale delay-3" style={{ padding: 20 }}>
            <div className="section-title">Carte d'identité</div>
            <IdentityCard stats={stats} data={data} />
          </div>
        </div>
      )}

      {tab === 'mensuel' && (
        <div className="bento">
          <div className="glass span-2 animate-scale delay-1" style={{ padding: 20 }} key={`monthly-${monthFilter}`}>
            <div className="section-title">Moyennes par mois</div>
            <MonthlyChart monthlyStats={monthlyStats} />
          </div>
          <div className="glass animate-scale delay-2" style={{ padding: 20 }}>
            <div className="section-title">Records</div>
            <MonthlyRecords monthlyStats={monthlyStats} />
          </div>
        </div>
      )}

      {tab === 'conditions' && (
        <div className="bento">
          <div className="glass span-2 animate-scale delay-1" style={{ padding: 20 }}>
            <div className="section-title">Répartition des conditions</div>
            <ConditionsDetail conditions={conditions} />
          </div>
          <div className="glass animate-scale delay-2" style={{ padding: 20 }}>
            <div className="section-title">Par mois</div>
            <ConditionsByMonth data={data} months={months} />
          </div>
        </div>
      )}

      {tab === 'previsions' && (
        <div className="bento">
          {/* AI Summary */}
          <div className="glass wide animate-scale delay-1" style={{ padding: 20 }}>
            <div className="section-title">🤖 Résumé IA</div>
            {aiLoading ? (
              <div style={{ color:'var(--text-secondary)', fontSize:'0.82rem', fontStyle:'italic' }}>Génération du résumé avec Llama 3.2...</div>
            ) : summary?.summary ? (
              <div style={{ fontSize:'0.88rem', lineHeight:1.7, color:'var(--text-secondary)' }}>{summary.summary}</div>
            ) : (
              <div style={{ color:'var(--text-tertiary)', fontSize:'0.8rem' }}>Résumé non disponible (Ollama requis)</div>
            )}
          </div>

          {/* Predictions chart */}
          {predictions && (
            <div className="glass span-2 animate-scale delay-2" style={{ padding: 20 }} key={`pred-${monthFilter}`}>
              <div className="section-title">📈 Prévisions 7 jours (régression linéaire)</div>
              <PredictionChart predictions={predictions} data={data} />
            </div>
          )}

          {/* Prediction AI summary */}
          <div className="glass animate-scale delay-3" style={{ padding: 20 }}>
            <div className="section-title">🔮 À venir</div>
            {aiLoading ? (
              <div style={{ color:'var(--text-secondary)', fontSize:'0.82rem', fontStyle:'italic' }}>Génération...</div>
            ) : predSummary?.summary ? (
              <div style={{ fontSize:'0.85rem', lineHeight:1.7, color:'var(--text-secondary)' }}>{predSummary.summary}</div>
            ) : (
              <div style={{ color:'var(--text-tertiary)', fontSize:'0.8rem' }}>Prévision non disponible</div>
            )}
          </div>

          {/* Insights */}
          {insights && (
            <>
              {/* Heatwaves */}
              {insights.heatwaves?.length > 0 && (
                <div className="glass animate-scale delay-4" style={{ padding: 20 }}>
                  <div className="section-title">🔥 Vagues de chaleur</div>
                  {insights.heatwaves.map(h => (
                    <div key={h.start} style={{ marginBottom:10, fontSize:'0.82rem' }}>
                      <strong>{fmtDate(h.start)} → {fmtDate(h.end)}</strong>
                      <div style={{ color:'var(--text-secondary)', fontSize:'0.75rem', marginTop:2 }}>
                        {h.days} jours · Ø {h.avg_temp}°C · max {h.max_temp}°C
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Cold spells */}
              {insights.coldspells?.length > 0 && (
                <div className="glass animate-scale delay-4" style={{ padding: 20 }}>
                  <div className="section-title">❄️ Périodes de gel</div>
                  {insights.coldspells.map(h => (
                    <div key={h.start} style={{ marginBottom:10, fontSize:'0.82rem' }}>
                      <strong>{fmtDate(h.start)} → {fmtDate(h.end)}</strong>
                      <div style={{ color:'var(--text-secondary)', fontSize:'0.75rem', marginTop:2 }}>
                        {h.days} jours · Ø {h.avg_temp}°C · min {h.min_temp}°C
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Anomalies */}
              {insights.anomalies?.length > 0 && (
                <div className="glass animate-scale delay-5" style={{ padding: 20 }}>
                  <div className="section-title">⚠️ Anomalies</div>
                  {insights.anomalies.slice(0, 5).map(a => (
                    <div key={a.date} style={{ marginBottom:8, fontSize:'0.82rem', display:'flex', justifyContent:'space-between' }}>
                      <span>{fmtDate(a.date)}</span>
                      <span style={{ color: a.type === 'chaud' ? '#fb923c' : '#38bdf8', fontWeight:600 }}>
                        {a.temp}°C {a.type === 'chaud' ? '🔥' : '❄️'} ({a.diff > 0 ? '+' : ''}{a.diff}° vs Ø {a.month_avg}°)
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Biggest swings */}
              <div className="glass animate-scale delay-5" style={{ padding: 20 }}>
                <div className="section-title">🌊 Plus grands écarts matin→après-midi</div>
                {insights.biggest_swings?.map(s => (
                  <div key={s.date} style={{ marginBottom:6, fontSize:'0.8rem', display:'flex', justifyContent:'space-between' }}>
                    <span>{fmtDate(s.date)}</span>
                    <span style={{ fontWeight:600 }}>{s.matin}° → {s.aprem}° <span style={{ color:'var(--accent-3)' }}>(+{s.swing}°)</span></span>
                  </div>
                ))}
              </div>

              {/* Monthly trends */}
              {insights.monthly_trends && (
                <div className="glass wide animate-scale delay-5" style={{ padding: 20 }}>
                  <div className="section-title">📊 Tendances mensuelles</div>
                  <div style={{ overflowX:'auto' }}>
                    <table className="data-table">
                      <thead><tr><th>Mois</th><th>Ø Matin</th><th>Ø Après-midi</th><th>Tendance</th></tr></thead>
                      <tbody>
                        {insights.monthly_trends.map(m => (
                          <tr key={m.mois}>
                            <td style={{ fontWeight:600 }}>{MONTH_NAMES[m.mois]}</td>
                            <td>{m.avg_matin ?? '—'}°</td>
                            <td>{m.avg_aprem ?? '—'}°</td>
                            <td>{m.trend ? (
                              <span style={{ color: m.trend.direction === 'hausse' ? '#fb923c' : m.trend.direction === 'baisse' ? '#38bdf8' : 'var(--text-secondary)' }}>
                                {m.trend.direction === 'hausse' ? '↑' : m.trend.direction === 'baisse' ? '↓' : '→'} {m.trend.diff}°
                              </span>
                            ) : '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {tab === 'donnees' && (
        <div className="glass animate-scale delay-1" style={{ padding: 20 }}>
          <div className="section-title">Relevés détaillés</div>
          <DataTable data={data} />
        </div>
      )}

      <div className="footer">Météo 2026 · Relevés personnels · Python/Flask API + React</div>
    </div>
  );
}

/* Loader */
function Loader() {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh' }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ fontSize:'2.5rem', marginBottom:12, animation:'fadeUp 0.6s ease infinite alternate' }}>🌤</div>
        <div style={{ color:'var(--text-secondary)', fontSize:'0.85rem' }}>Chargement…</div>
      </div>
    </div>
  );
}

/* Hero cards */
function HeroCards({ stats }) {
  if (!stats) return null;
  const avg = stats.avg_matin && stats.avg_aprem ? ((stats.avg_matin + stats.avg_aprem) / 2).toFixed(1) : '—';
  const cards = [
    { label:'Moyenne', value:`${avg}°`, sub:`${stats?.avg_matin?.toFixed(1) ?? '—'}° mat · ${stats?.avg_aprem?.toFixed(1) ?? '—'}° ap`, gradient:'linear-gradient(135deg, #6366f1, #a78bfa)', delay:'delay-1' },
    { label:'Max après-midi', value:`${stats.max_aprem ?? '—'}°`, sub:stats.max_date ? fmtDate(stats.max_date) : '', gradient:'linear-gradient(135deg, #fb923c, #ef4444)', delay:'delay-2' },
    { label:'Min matin', value:`${stats.min_matin ?? '—'}°`, sub:stats.min_date ? fmtDate(stats.min_date) : '', gradient:'linear-gradient(135deg, #38bdf8, #6366f1)', delay:'delay-3' },
    { label:'Soleil', value:`${stats.soleil ?? 0}`, sub:stats.pct_soleil ? `${stats.pct_soleil}% des jours` : '', gradient:'linear-gradient(135deg, #fbbf24, #f59e0b)', delay:'delay-4' },
  ];
  return (
    <div className="hero-grid">
      {cards.map(c => (
        <div key={c.label} className={`glass hero-card animate-fade ${c.delay}`}>
          <div className="glow" style={{ background: c.gradient }} />
          <div className="hero-label">{c.label}</div>
          <div className="hero-value" style={{ background: c.gradient, WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text' }}>{c.value}</div>
          <div className="hero-sub">{c.sub}</div>
        </div>
      ))}
    </div>
  );
}

/* Identity card */
function IdentityCard({ stats, data }) {
  const uniqueDays = new Set(data.map(r => r.date)).size;
  const ecart = stats.max_aprem && stats.min_matin ? (stats.max_aprem - stats.min_matin).toFixed(1) : '—';
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
      {[
        { label:'Amplitude thermique', value:`${ecart}°C` },
        { label:'Jours relevés', value:`${uniqueDays}` },
        { label:'Condition dominante', value:dominantCondition(data) },
        { label:'Mois couverts', value:`${new Set(data.map(r => r.date.split('-')[1])).size}` },
      ].map((r, i) => (
        <div key={r.label} className="animate-fade" style={{ animationDelay:`${0.2 + i * 0.05}s` }}>
          <div style={{ fontSize:'0.68rem', color:'var(--text-secondary)', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:2 }}>{r.label}</div>
          <div style={{ fontSize:'1.1rem', fontWeight:700 }}>{r.value}</div>
        </div>
      ))}
    </div>
  );
}

function dominantCondition(data) {
  const counts = {};
  for (const r of data) {
    const c = r.categorie_aprem || 'Autre';
    counts[c] = (counts[c] || 0) + 1;
  }
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  return top ? `${COND_ICONS[top[0]] || ''} ${top[0]} (${top[1]}j)` : '—';
}

/* Temperature chart */
function TempChart({ data }) {
  const chartData = data.map(r => ({
    date: r.date.slice(5),
    matin: r.temp_matin,
    apresMidi: r.temp_aprem,
  }));
  return (
    <div className="chart-wrapper">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top:4, right:4, bottom:0, left:-12 }}>
          <defs>
            <linearGradient id="gradMatin" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#6366f1" stopOpacity={0.3}/><stop offset="100%" stopColor="#6366f1" stopOpacity={0}/></linearGradient>
            <linearGradient id="gradAprem" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#fb923c" stopOpacity={0.3}/><stop offset="100%" stopColor="#fb923c" stopOpacity={0}/></linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" tick={{ fontSize:10 }} interval="preserveStartEnd" />
          <YAxis domain={['dataMin - 2', 'dataMax + 2']} tick={{ fontSize:10 }} />
          <Tooltip contentStyle={{ background:'rgba(10,10,15,0.95)', backdropFilter:'blur(16px)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:10, fontSize:'0.78rem' }} />
          <Legend wrapperStyle={{ fontSize:'0.72rem', marginTop:4 }} />
          <Area type="monotone" dataKey="matin" stroke="#6366f1" strokeWidth={2} fill="url(#gradMatin)" name="Matin" dot={false} activeDot={{ r:3 }} />
          <Area type="monotone" dataKey="apresMidi" stroke="#fb923c" strokeWidth={2} fill="url(#gradAprem)" name="Après-midi" dot={false} activeDot={{ r:3 }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/* Monthly chart */
function MonthlyChart({ monthlyStats }) {
  return (
    <div className="chart-wrapper" style={{ height:240 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={monthlyStats.map(m => ({ ...m, nom:MONTH_NAMES[m.mois] }))} margin={{ top:4, right:4, bottom:0, left:-12 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="nom" tick={{ fontSize:10 }} />
          <YAxis tick={{ fontSize:10 }} />
          <Tooltip contentStyle={{ background:'rgba(10,10,15,0.95)', backdropFilter:'blur(16px)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:10, fontSize:'0.78rem' }} />
          <Legend wrapperStyle={{ fontSize:'0.72rem' }} />
          <Bar dataKey="avg_matin" name="Matin" fill="#6366f1" radius={[4,4,0,0]} />
          <Bar dataKey="avg_aprem" name="Après-midi" fill="#fb923c" radius={[4,4,0,0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* Conditions pie/info */
function ConditionsPie({ conditions }) {
  const total = conditions.reduce((a, c) => a + c.count, 0);
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
      {conditions.map((c, i) => (
        <div key={c.cat} className="condition-row animate-fade" style={{ animationDelay:`${i * 0.05}s` }}>
          <div className="condition-icon" style={{ background:`${COND_COLORS[c.cat] || '#6b7280'}15` }}>
            {COND_ICONS[c.cat] || '❓'}
          </div>
          <div style={{ flex:1 }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
              <span style={{ fontSize:'0.75rem', fontWeight:500 }}>{COND_NAMES[c.cat] || c.cat}</span>
              <span style={{ fontSize:'0.72rem', color:'var(--text-secondary)' }}>{((c.count / total) * 100).toFixed(0)}%</span>
            </div>
            <div className="condition-bar-track">
              <div className="condition-bar" style={{ width:`${(c.count / total) * 100}%`, background:COND_COLORS[c.cat] || '#6b7280' }} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* Conditions detail */
function ConditionsDetail({ conditions }) {
  const total = conditions.reduce((a, c) => a + c.count, 0);
  return (
    <div>
      {conditions.map((c, i) => (
        <div key={c.cat} className="condition-row animate-fade" style={{ animationDelay:`${i * 0.05}s` }}>
          <div className="condition-icon" style={{ background:`${COND_COLORS[c.cat] || '#6b7280'}15` }}>
            {COND_ICONS[c.cat] || '❓'}
          </div>
          <div style={{ flex:1 }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
              <span style={{ fontWeight:500, fontSize:'0.82rem' }}>{COND_NAMES[c.cat] || c.cat}</span>
              <span style={{ fontSize:'0.78rem', fontWeight:700, color:'var(--text-secondary)' }}>{c.count}j</span>
            </div>
            <div className="condition-bar-track">
              <div className="condition-bar" style={{ width:`${(c.count / total) * 100}%`, background:COND_COLORS[c.cat] || '#6b7280' }} />
            </div>
          </div>
          <span style={{ fontSize:'0.72rem', color:'var(--text-tertiary)', minWidth:36, textAlign:'right' }}>
            {((c.count / total) * 100).toFixed(0)}%
          </span>
        </div>
      ))}
    </div>
  );
}

/* Conditions by month */
function ConditionsByMonth({ data, months }) {
  const cats = ['Soleil','Nuageux','Pluie','Neige','Vent'];
  const monthData = {};
  for (const r of data) {
    const m = parseInt(r.date.split('-')[1]);
    if (!monthData[m]) monthData[m] = {};
    monthData[m][r.categorie_aprem || 'Autre'] = (monthData[m][r.categorie_aprem || 'Autre'] || 0) + 1;
  }
  return (
    <div style={{ overflowX:'auto' }}>
      <table className="data-table">
        <thead><tr><th>Mois</th>{cats.map(c => <th key={c} style={{ textAlign:'center', fontSize:'0.6rem' }}>{c}</th>)}</tr></thead>
        <tbody>
          {months.map(m => {
            const d = monthData[m.num] || {};
            const total = Object.values(d).reduce((a, b) => a + b, 0);
            return (
              <tr key={m.num}>
                <td style={{ fontWeight:600, fontSize:'0.72rem' }}>{m.nom}</td>
                {cats.map(c => {
                  const count = d[c] || 0;
                  return (
                    <td key={c} style={{ textAlign:'center', padding:'6px 4px' }}>
                      {count > 0 ? (
                        <div style={{
                          display:'inline-flex', alignItems:'center', justifyContent:'center',
                          width:26, height:26, borderRadius:'50%',
                          background:`${COND_COLORS[c]}${Math.round(15 + (count / total) * 35).toString(16).padStart(2,'0')}`,
                          color: COND_COLORS[c],
                          fontSize:'0.68rem', fontWeight:700,
                        }}>{count}</div>
                      ) : <span style={{ opacity:0.1 }}>·</span>}
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

/* Monthly records */
function MonthlyRecords({ monthlyStats }) {
  return (
    <div style={{ overflowX:'auto' }}>
      <table className="data-table">
        <thead><tr><th>Mois</th><th style={{ textAlign:'right' }}>Max</th><th style={{ textAlign:'right' }}>Min</th></tr></thead>
        <tbody>
          {monthlyStats.map(m => (
            <tr key={m.mois}>
              <td style={{ fontWeight:600, fontSize:'0.75rem' }}>{MONTH_NAMES[m.mois]}</td>
              <td style={{ textAlign:'right' }}>
                <span className="temp-hot">{m.max_aprem}°</span>
                <span style={{ marginLeft:6, fontSize:'0.65rem', color:'var(--text-tertiary)' }}>Ø {m.avg_aprem}°</span>
              </td>
              <td style={{ textAlign:'right' }}>
                <span className="temp-cold">{m.min_matin}°</span>
                <span style={{ marginLeft:6, fontSize:'0.65rem', color:'var(--text-tertiary)' }}>Ø {m.avg_matin}°</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* Data table */
/* Prediction chart */
function PredictionChart({ predictions, data }) {
  const lastData = data.slice(-3).map(r => ({ date: r.date.slice(5), matin: r.temp_matin, aprem: r.temp_aprem, pred: false }));
  const pred = predictions.map(r => ({ date: r.date.slice(5), matin: r.temp_matin, aprem: r.temp_aprem, pred: true }));
  const chartData = [...lastData, ...pred];
  return (
    <div className="chart-wrapper">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top:4, right:4, bottom:0, left:-12 }}>
          <defs>
            <linearGradient id="gradPredM" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#a78bfa" stopOpacity={0.2}/><stop offset="100%" stopColor="#a78bfa" stopOpacity={0}/></linearGradient>
            <linearGradient id="gradPredA" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#f97316" stopOpacity={0.2}/><stop offset="100%" stopColor="#f97316" stopOpacity={0}/></linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" tick={{ fontSize:10 }} />
          <YAxis domain={['dataMin - 2', 'dataMax + 2']} tick={{ fontSize:10 }} />
          <Tooltip contentStyle={{ background:'rgba(10,10,15,0.95)', backdropFilter:'blur(16px)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:10, fontSize:'0.78rem' }} />
          <Legend wrapperStyle={{ fontSize:'0.72rem' }} />
          <Area type="monotone" dataKey="matin" stroke="#6366f1" strokeWidth={2} fill="url(#gradPredM)" name="Matin (réel)" dot={false} activeDot={{ r:3 }} />
          <Area type="monotone" dataKey="aprem" stroke="#fb923c" strokeWidth={2} fill="url(#gradPredA)" name="Après-midi (réel)" dot={false} activeDot={{ r:3 }} />
          <Area type="monotone" dataKey="matin" stroke="#a78bfa" strokeWidth={2} strokeDasharray="5 4" fill="none" name="Matin (prévision)" connectNulls />
          <Area type="monotone" dataKey="aprem" stroke="#f97316" strokeWidth={2} strokeDasharray="5 4" fill="none" name="Après-midi (prévision)" connectNulls />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function DataTable({ data }) {
  return (
    <div style={{ maxHeight:480, overflowY:'auto' }}>
      <table className="data-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Matin</th>
            <th>Après-midi</th>
            <th>Condition</th>
          </tr>
        </thead>
        <tbody>
          {data.map(r => (
            <tr key={r.date} className="animate-fade">
              <td style={{ fontWeight:600, fontSize:'0.75rem' }}>{fmtDate(r.date)}</td>
              <td><span className={r.temp_matin < 5 ? 'temp-cold' : ''}>{r.temp_matin != null ? `${r.temp_matin}°` : '—'}</span></td>
              <td><span className={r.temp_aprem >= 30 ? 'temp-hot' : ''}>{r.temp_aprem != null ? `${r.temp_aprem}°` : '—'}</span></td>
              <td>{COND_ICONS[r.categorie_aprem] || ''} {r.categorie_aprem || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function fmtDate(d) {
  const [y, m, day] = d.split('-');
  const ms = ['','Jan','Fév','Mar','Avr','Mai','Juin','Juil','Aoû','Sep','Oct','Nov','Déc'];
  return `${parseInt(day)} ${ms[parseInt(m)]}`;
}
