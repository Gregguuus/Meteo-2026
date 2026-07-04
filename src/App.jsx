import { useState, useEffect, useRef } from 'react';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import {
  fetchWeather, fetchStats, fetchMonthlyStats,
  fetchConditions, fetchMonths, fetchPredictions,
  fetchInsights, fetchSummary, fetchPredictionSummary,
  fetchForecast,
} from './api';

const MONTHS = { 1:'Janvier',2:'Février',3:'Mars',4:'Avril',5:'Mai',6:'Juin',7:'Juillet',8:'Août',9:'Septembre',10:'Octobre',11:'Novembre',12:'Décembre' };
const COND = { Soleil:'☀️', Nuageux:'☁️', Pluie:'🌧️', Neige:'❄️', Vent:'💨' };
const COND_COL = { Soleil:'#f59e0b', Nuageux:'#6b7280', Pluie:'#3b82f6', Neige:'#e5e7eb', Vent:'#ec4899' };
const ACCENTS = { Soleil:'#f59e0b15', Nuageux:'#6b728015', Pluie:'#3b82f615', Neige:'#e5e7eb15', Vent:'#ec489915' };

export default function App() {
  const [data, setData] = useState([]);
  const [stats, setStats] = useState(null);
  const [monthlyStats, setMonthlyStats] = useState([]);
  const [conditions, setConditions] = useState([]);
  const [months, setMonths] = useState([]);
  const [predictions, setPredictions] = useState(null);
  const [insights, setInsights] = useState(null);
  const [summary, setSummary] = useState(null);
  const [predSummary, setPredSummary] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [loading, setLoading] = useState(true);
  const [visibleSections, setVisibleSections] = useState(new Set());

  useEffect(() => {
    async function load() {
      const [d, s, ms, c, m, p, i, su, ps, f] = await Promise.all([
        fetchWeather(), fetchStats(), fetchMonthlyStats(),
        fetchConditions(), fetchMonths(), fetchPredictions(7),
        fetchInsights(), fetchSummary(), fetchPredictionSummary(),
        fetchForecast(),
      ]);
      setData(d); setStats(s); setMonthlyStats(ms); setConditions(c);
      setMonths(m); setPredictions(p); setInsights(i);
      setSummary(su); setPredSummary(ps); setForecast(f); setLoading(false);
    }
    load();
  }, []);

  // Intersection Observer for scroll animations
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          setVisibleSections(p => new Set(p).add(e.target.dataset.section));
        }
      });
    }, { threshold: 0.1 });
    document.querySelectorAll('[data-section]').forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, [loading]);

  if (loading) return <Loader />;

  const visible = (id) => visibleSections.has(id);

  return (
    <div className="app">
      <div className="hero-bg">
        <div className="orb" />
        <div className="orb" />
        <div className="orb" />
      </div>

      {/* ═══════ HERO ═══════ */}
      <section className="hero">
        <div className="container">
          <div className="hero-badge fade-up d1">
            <span className="dot" /> Mise à jour en temps réel
          </div>
          <h1 className="fade-up d2">
            Météo <span className="gradient">2026</span>
          </h1>
          <p className="fade-up d3">
            Relevés météo personnels de Givrand et Pornic, Vendée. 
            {summary?.summary ? ` ${summary.summary}` : ' 154 jours de données enregistrées de janvier à juillet 2026.'}
          </p>

          <HeroStats stats={stats} predictions={predictions} />
        </div>
      </section>

      {/* ═══════ CHIFFRES CLÉS ═══════ */}
      <section className="section" data-section="chiffres" id="chiffres">
        <div className="container">
          <div className={`fade-up ${visible('chiffres') ? 'visible' : ''}`}>
            <div className="section-header">
              <div className="section-label">En chiffres</div>
              <h2>L'année <span className="highlight">2026</span></h2>
            </div>
          </div>
          <Higlights stats={stats} insights={insights} visible={visible('chiffres')} />
        </div>
      </section>

      {/* ═══════ ÉVOLUTION ═══════ */}
      <section className="section" data-section="evolution" id="evolution">
        <div className="container">
          <div className={`fade-up ${visible('evolution') ? 'visible' : ''}`}>
            <div className="section-header">
              <div className="section-label">Températures</div>
              <h2>Évolution <span className="highlight">jour par jour</span></h2>
              <div className="section-sub">Les températures du matin et de l'après-midi, de janvier à juillet.</div>
            </div>
          </div>
          <div className={`glass full scale-in ${visible('evolution') ? 'visible' : ''}`} style={{ padding: 24 }}>
            <TempChart data={data} />
          </div>
        </div>
      </section>

      {/* ═══════ EXTRÊMES ═══════ */}
      <section className="section" data-section="extremes" id="extremes">
        <div className="container">
          <div className={`fade-up ${visible('extremes') ? 'visible' : ''}`}>
            <div className="section-header">
              <div className="section-label">Extrêmes</div>
              <h2>Vagues de chaleur <span className="highlight">&</span> périodes de gel</h2>
            </div>
          </div>
          <Extremes insights={insights} visible={visible('extremes')} />
        </div>
      </section>

      {/* ═══════ CONDITIONS ═══════ */}
      <section className="section" data-section="conditions" id="conditions">
        <div className="container">
          <div className={`fade-up ${visible('conditions') ? 'visible' : ''}`}>
            <div className="section-header">
              <div className="section-label">Conditions</div>
              <h2>Répartition <span className="highlight">météo</span></h2>
              <div className="section-sub">La répartition des conditions météo sur l'ensemble de la période.</div>
            </div>
          </div>
          <div className="bento">
            <div className={`glass span2 scale-in ${visible('conditions') ? 'visible' : ''}`} style={{ padding: 24 }}>
              <ConditionsChart conditions={conditions} />
            </div>
            <div className={`glass scale-in ${visible('conditions') ? 'visible' : ''}`} style={{ padding: 24 }}>
              <MonthlyCondGrid data={data} months={months} />
            </div>
          </div>
        </div>
      </section>

      {/* ═══════ MENSUEL ═══════ */}
      <section className="section" data-section="mensuel" id="mensuel">
        <div className="container">
          <div className={`fade-up ${visible('mensuel') ? 'visible' : ''}`}>
            <div className="section-header">
              <div className="section-label">Mensuel</div>
              <h2>Moyennes <span className="highlight">par mois</span></h2>
            </div>
          </div>
          <div className="bento">
            <div className={`glass span2 scale-in ${visible('mensuel') ? 'visible' : ''}`} style={{ padding: 24 }}>
              <MonthlyBarChart monthlyStats={monthlyStats} />
            </div>
            <div className={`glass scale-in ${visible('mensuel') ? 'visible' : ''}`} style={{ padding: 24 }}>
              <MonthlyTable monthlyStats={monthlyStats} />
            </div>
          </div>
        </div>
      </section>

      {/* ═══════ PRÉVISIONS IA ═══════ */}
      <section className="section" data-section="previsions" id="previsions">
        <div className="container">
          <div className={`fade-up ${visible('previsions') ? 'visible' : ''}`}>
            <div className="section-header">
              <div className="section-label">Intelligence Artificielle</div>
              <h2>Prévisions <span className="highlight">7 jours</span></h2>
              <div className="section-sub">Basées sur une régression linéaire des données historiques.</div>
            </div>
          </div>
          <div className="bento">
            {predictions && forecast && (
              <div className={`glass span2 scale-in ${visible('previsions') ? 'visible' : ''}`} style={{ padding: 24 }}>
                <div className="section-label" style={{ marginBottom: 8 }}>Comparaison : régression vs Open-Meteo</div>
                <ForecastChart predictions={predictions} forecast={forecast} />
              </div>
            )}
            <div className={`glass scale-in ${visible('previsions') ? 'visible' : ''}`} style={{ padding: 24 }}>
              <div className="section-label" style={{ marginBottom: 12 }}>Résumé IA</div>
              {predSummary?.summary ? (
                <div className="prediction-text">{predSummary.summary}</div>
              ) : (
                <div className="prediction-text" style={{ color: 'var(--text-tertiary)' }}>
                  Utilise Ollama pour un résumé en langage naturel. Sinon, un template structuré est affiché.
                </div>
              )}
              {forecast && (
                <div style={{ marginTop: 16, padding: '12px 14px', borderRadius: 10, background: 'rgba(79,110,247,0.06)', border: '1px solid rgba(79,110,247,0.1)' }}>
                  <div style={{ fontSize:'0.65rem', textTransform:'uppercase', letterSpacing:'0.5px', color:'var(--text-tertiary)', marginBottom:6 }}>
                    🌐 Open-Meteo — données réelles
                  </div>
                  {forecast.slice(0, 3).map(d => (
                    <div key={d.date} style={{ display:'flex', justifyContent:'space-between', fontSize:'0.78rem', marginBottom:3 }}>
                      <span>{fmtDate(d.date)}</span>
                      <span>{COND[d.condition]} {d.temp_min}° / {d.temp_max}°</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════ ANOMALIES ═══════ */}
      {insights?.anomalies?.length > 0 && (
        <section className="section" data-section="anomalies" id="anomalies">
          <div className="container">
            <div className={`fade-up ${visible('anomalies') ? 'visible' : ''}`}>
              <div className="section-header">
                <div className="section-label">Analyse</div>
                <h2>Anomalies <span className="highlight">statistiques</span></h2>
                <div className="section-sub">Jours où la température s'écarte de plus de 2 écarts-types de la moyenne mensuelle.</div>
              </div>
            </div>
            <div className="bento">
              <div className={`glass span2 scale-in ${visible('anomalies') ? 'visible' : ''}`} style={{ padding: 24 }}>
                {insights.anomalies.slice(0, 6).map((a, i) => (
                  <div key={a.date} className="fade-up" style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '10px 0', borderBottom: i < 5 ? '1px solid rgba(255,255,255,0.03)' : 'none',
                  }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{fmtDate(a.date)}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>Moyenne du mois: {a.month_avg}°C</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '1.3rem', fontWeight: 800, color: a.type === 'chaud' ? '#fb923c' : '#38bdf8' }}>
                        {a.temp}°C
                      </div>
                      <div style={{ fontSize: '0.72rem', color: a.type === 'chaud' ? '#fb923c' : '#38bdf8' }}>
                        {a.diff > 0 ? '+' : ''}{a.diff}°C vs moyenne
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className={`glass scale-in ${visible('anomalies') ? 'visible' : ''}`} style={{ padding: 24 }}>
                <div className="section-label" style={{ marginBottom: 12 }}>Écarts thermiques</div>
                {insights.biggest_swings?.slice(0, 5).map((s, i) => (
                  <div key={s.date} style={{
                    display: 'flex', justifyContent: 'space-between',
                    padding: '8px 0', borderBottom: i < 4 ? '1px solid rgba(255,255,255,0.03)' : 'none',
                    fontSize: '0.82rem',
                  }}>
                    <span style={{ color: 'var(--text-secondary)' }}>{fmtDate(s.date)}</span>
                    <span style={{ fontWeight: 600 }}>{s.matin}° → {s.aprem}° <span style={{ color: '#f59e0b' }}>+{s.swing}°</span></span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ═══════ DONNÉES ═══════ */}
      <section className="section" data-section="donnees" id="donnees">
        <div className="container">
          <div className={`fade-up ${visible('donnees') ? 'visible' : ''}`}>
            <div className="section-header">
              <div className="section-label">Archive</div>
              <h2>Tous les <span className="highlight">relevés</span></h2>
              <div className="section-sub">{stats?.total || data.length} jours de données.</div>
            </div>
          </div>
          <div className={`glass scale-in ${visible('donnees') ? 'visible' : ''}`} style={{ padding: '12px 20px', maxHeight: 500, overflowY: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr><th>Date</th><th>Matin</th><th>Après-midi</th><th>Condition</th></tr>
              </thead>
              <tbody>
                {data.map(r => (
                  <tr key={r.date}>
                    <td style={{ fontWeight: 600 }}>{fmtDate(r.date)}</td>
                    <td><span className={r.temp_matin < 2 ? 'temp-cold' : ''}>{r.temp_matin != null ? `${r.temp_matin}°` : '—'}</span></td>
                    <td><span className={r.temp_aprem >= 30 ? 'temp-hot' : ''}>{r.temp_aprem != null ? `${r.temp_aprem}°` : '—'}</span></td>
                    <td>{COND[r.categorie_aprem] || ''} {r.categorie_aprem || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <div className="footer">
        <div className="container">
          Météo 2026 · Relevés personnels · Givrand & Pornic, Vendée<br />
          Python / Flask / SQLite · React · Recharts · Ollama IA
        </div>
      </div>
    </div>
  );
}

// ── Loader ──
function Loader() {
  return (
    <div className="app" style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh' }}>
      <div style={{ textAlign:'center' }}>
        <div className="hero-bg"><div className="orb"/><div className="orb"/><div className="orb"/></div>
        <div className="hero-badge" style={{ margin:'0 auto 20px' }}><span className="dot" /> Chargement</div>
        <div style={{ fontSize:'0.85rem', color:'var(--text-secondary)' }}>Récupération des données...</div>
      </div>
    </div>
  );
}

// ── HeroStats ──
function HeroStats({ stats, predictions }) {
  if (!stats) return null;
  const avg = stats.avg_matin && stats.avg_aprem ? ((stats.avg_matin + stats.avg_aprem) / 2).toFixed(1) : '—';
  const predMax = predictions?.length ? Math.max(...predictions.map(p => p.temp_aprem)) : '—';
  return (
    <div className="hero-stats">
      <div className="hero-stat fade-up d4">
        <div className="label">Moyenne</div>
        <div className="value text-gradient">{avg}°</div>
        <div className="sub">{stats.avg_matin?.toFixed(1)}° · {stats.avg_aprem?.toFixed(1)}°</div>
      </div>
      <div className="hero-stat fade-up d5">
        <div className="label">Plus chaud</div>
        <div className="value" style={{ color: '#fb923c' }}>{stats.max_aprem}°</div>
        <div className="sub">{stats.max_date ? fmtDate(stats.max_date) : ''}</div>
      </div>
      <div className="hero-stat fade-up d6">
        <div className="label">Plus froid</div>
        <div className="value" style={{ color: '#38bdf8' }}>{stats.min_matin}°</div>
        <div className="sub">{stats.min_date ? fmtDate(stats.min_date) : ''}</div>
      </div>
      <div className="hero-stat fade-up d7">
        <div className="label">Prévision max</div>
        <div className="value" style={{ color: '#a78bfa' }}>{predMax}°</div>
        <div className="sub">7 jours</div>
      </div>
    </div>
  );
}

// ── Higlights ──
function Higlights({ stats, insights, visible }) {
  if (!stats) return null;
  const heatCount = insights?.heatwaves?.length || 0;
  const coldCount = insights?.coldspells?.length || 0;
  const anomCount = insights?.anomalies?.length || 0;
  const items = [
    { icon: '🌡️', bg: '#4f6ef715', label: 'Jours relevés', value: stats.total, sub: '7 mois de données' },
    { icon: '🔥', bg: '#fb923c15', label: 'Vagues de chaleur', value: heatCount, sub: '≥30°C pendant ≥3 jours' },
    { icon: '❄️', bg: '#38bdf815', label: 'Périodes de gel', value: coldCount, sub: '≤0°C au matin' },
    { icon: '⚡', bg: '#f59e0b15', label: 'Anomalies détectées', value: anomCount, sub: 'Écart > 2σ' },
  ];
  return (
    <div className="bento">
      {items.map((item, i) => (
        <div key={item.label} className={`glass stat-card scale-in ${visible ? 'visible' : ''}`}
          style={{ animationDelay: `${i * 0.08}s` }}>
          <div className="icon" style={{ background: item.bg }}>{item.icon}</div>
          <h3>{item.label}</h3>
          <div className="big">{item.value}</div>
          <div className="small">{item.sub}</div>
        </div>
      ))}
    </div>
  );
}

// ── TempChart ──
function TempChart({ data }) {
  const cd = data.map(r => ({ date: r.date.slice(5), matin: r.temp_matin, aprem: r.temp_aprem }));
  return (
    <div className="chart-wrap">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={cd} margin={{ top:4, right:4, bottom:0, left:-12 }}>
          <defs>
            <linearGradient id="gm" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#4f6ef7" stopOpacity={0.25}/><stop offset="100%" stopColor="#4f6ef7" stopOpacity={0}/></linearGradient>
            <linearGradient id="ga" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#fb923c" stopOpacity={0.25}/><stop offset="100%" stopColor="#fb923c" stopOpacity={0}/></linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" tick={{ fontSize:10 }} interval="preserveStartEnd" />
          <YAxis domain={['dataMin - 3', 'dataMax + 3']} tick={{ fontSize:10 }} />
          <Tooltip />
          <Legend />
          <Area type="monotone" dataKey="matin" stroke="#4f6ef7" strokeWidth={2} fill="url(#gm)" name="Matin" dot={false} activeDot={{ r:3 }} />
          <Area type="monotone" dataKey="aprem" stroke="#fb923c" strokeWidth={2} fill="url(#ga)" name="Après-midi" dot={false} activeDot={{ r:3 }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── PredictionChart ──
function PredictionChart({ predictions, data }) {
  const last = data.slice(-5).map(r => ({ date: r.date.slice(5), matin: r.temp_matin, aprem: r.temp_aprem, pred: false }));
  const pred = predictions.map(r => ({ date: r.date.slice(5), matin: r.temp_matin, aprem: r.temp_aprem, pred: true }));
  const cd = [...last, ...pred];
  return (
    <div className="chart-wrap">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={cd} margin={{ top:4, right:4, bottom:0, left:-12 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" tick={{ fontSize:10 }} />
          <YAxis domain={['dataMin - 2', 'dataMax + 2']} tick={{ fontSize:10 }} />
          <Tooltip />
          <Legend />
          <Area type="monotone" dataKey="matin" stroke="#4f6ef7" strokeWidth={2} fill="none" name="Matin (réel)" dot={false} />
          <Area type="monotone" dataKey="aprem" stroke="#fb923c" strokeWidth={2} fill="none" name="Après-midi (réel)" dot={false} />
          <Area type="monotone" dataKey="matin" stroke="#a78bfa" strokeWidth={2} strokeDasharray="5 4" fill="none" name="Matin (prévision)" connectNulls />
          <Area type="monotone" dataKey="aprem" stroke="#f97316" strokeWidth={2} strokeDasharray="5 4" fill="none" name="Après-midi (prévision)" connectNulls />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Extremes ──
function Extremes({ insights, visible }) {
  if (!insights) return null;
  const hw = insights.heatwaves || [];
  const cs = insights.coldspells || [];
  if (!hw.length && !cs.length) return null;
  return (
    <div className="bento">
      {hw.map((h, i) => (
        <div key={`hw-${i}`} className={`glass extreme-card scale-in ${visible ? 'visible' : ''}`}
          style={{ borderLeft: '3px solid #fb923c', animationDelay: `${i * 0.1}s` }}>
          <div className="tag" style={{ background: '#fb923c15', color: '#fb923c' }}>🔥 Canicule {i + 1}</div>
          <div className="temp" style={{ color: '#fb923c' }}>{h.max_temp}°C</div>
          <div className="detail">
            Du {fmtDate(h.start)} au {fmtDate(h.end)} · {h.days} jours · Ø {h.avg_temp}°C
          </div>
        </div>
      ))}
      {cs.map((c, i) => (
        <div key={`cs-${i}`} className={`glass extreme-card scale-in ${visible ? 'visible' : ''}`}
          style={{ borderLeft: '3px solid #38bdf8', animationDelay: `${(hw.length + i) * 0.1}s` }}>
          <div className="tag" style={{ background: '#38bdf815', color: '#38bdf8' }}>❄️ Gel {i + 1}</div>
          <div className="temp" style={{ color: '#38bdf8' }}>{c.min_temp}°C</div>
          <div className="detail">
            Du {fmtDate(c.start)} au {fmtDate(c.end)} · {c.days} jours · Ø {c.avg_temp}°C
          </div>
        </div>
      ))}
    </div>
  );
}

// ── ConditionsChart ──
function ConditionsChart({ conditions }) {
  const total = conditions.reduce((a, c) => a + c.count, 0);
  return (
    <div className="condition-list">
      {conditions.map(c => (
        <div key={c.cat} className="condition-item">
          <div className="emoji" style={{ background: ACCENTS[c.cat] || 'rgba(255,255,255,0.03)' }}>
            {COND[c.cat] || '❓'}
          </div>
          <div className="info">
            <div className="top">
              <span className="name">{c.cat}</span>
              <span className="pct">{((c.count / total) * 100).toFixed(0)}% · {c.count}j</span>
            </div>
            <div className="track">
              <div className="bar" style={{ width: `${(c.count / total) * 100}%`, background: COND_COL[c.cat] || '#6b7280' }} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── MonthlyCondGrid ──
function MonthlyCondGrid({ data, months }) {
  const cats = ['Soleil','Nuageux','Pluie','Neige','Vent'];
  const md = {};
  for (const r of data) {
    const m = parseInt(r.date.split('-')[1]);
    if (!md[m]) md[m] = {};
    md[m][r.categorie_aprem || 'Autre'] = (md[m][r.categorie_aprem || 'Autre'] || 0) + 1;
  }
  return (
    <div style={{ overflowX:'auto' }}>
      <div className="section-label" style={{ marginBottom: 12 }}>Conditions par mois</div>
      <table className="data-table">
        <thead><tr><th></th>{cats.map(c => <th key={c} style={{ textAlign:'center', fontSize:'0.55rem' }}>{c}</th>)}</tr></thead>
        <tbody>
          {months.map(m => {
            const d = md[m.num] || {};
            const tot = Object.values(d).reduce((a,b) => a + b, 0);
            return (
              <tr key={m.num}>
                <td style={{ fontWeight:600, fontSize:'0.7rem' }}>{m.nom.slice(0, 3)}</td>
                {cats.map(c => {
                  const n = d[c] || 0;
                  return (
                    <td key={c} style={{ textAlign:'center', padding:'5px 3px' }}>
                      {n > 0 ? (
                        <div style={{
                          display:'inline-flex', alignItems:'center', justifyContent:'center',
                          width:24, height:24, borderRadius:'50%',
                          background: `${COND_COL[c]}${Math.round(15 + (n / tot) * 35).toString(16).padStart(2,'0')}`,
                          color: COND_COL[c], fontSize:'0.65rem', fontWeight:700,
                        }}>{n}</div>
                      ) : <span style={{ opacity:0.08 }}>·</span>}
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

// ── MonthlyBarChart ──
function MonthlyBarChart({ monthlyStats }) {
  const cd = monthlyStats.map(m => ({ ...m, nom: MONTHS[m.mois] }));
  return (
    <div className="chart-wrap" style={{ height: 240 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={cd} margin={{ top:4, right:4, bottom:0, left:-12 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="nom" tick={{ fontSize:10 }} />
          <YAxis tick={{ fontSize:10 }} />
          <Tooltip />
          <Legend />
          <Bar dataKey="avg_matin" name="Matin" fill="#4f6ef7" radius={[4,4,0,0]} />
          <Bar dataKey="avg_aprem" name="Après-midi" fill="#fb923c" radius={[4,4,0,0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── MonthlyTable ──
function MonthlyTable({ monthlyStats }) {
  return (
    <div style={{ overflowX:'auto' }}>
      <div className="section-label" style={{ marginBottom: 12 }}>Records par mois</div>
      <table className="data-table">
        <thead><tr><th>Mois</th><th style={{ textAlign:'right' }}>Max</th><th style={{ textAlign:'right' }}>Min</th></tr></thead>
        <tbody>
          {monthlyStats.map(m => (
            <tr key={m.mois}>
              <td style={{ fontWeight:600, fontSize:'0.75rem' }}>{MONTHS[m.mois]}</td>
              <td style={{ textAlign:'right' }}>
                <span className="temp-hot">{m.max_aprem}°</span>
                <span style={{ marginLeft:6, fontSize:'0.62rem', color:'var(--text-tertiary)' }}>Ø {m.avg_aprem}°</span>
              </td>
              <td style={{ textAlign:'right' }}>
                <span className="temp-cold">{m.min_matin}°</span>
                <span style={{ marginLeft:6, fontSize:'0.62rem', color:'var(--text-tertiary)' }}>Ø {m.avg_matin}°</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── ForecastChart ──
function ForecastChart({ predictions, forecast }) {
  const cd = predictions.map((p, i) => {
    const f = forecast[i];
    return {
      date: p.date.slice(5),
      pred_matin: p.temp_matin,
      pred_aprem: p.temp_aprem,
      real_min: f?.temp_min,
      real_max: f?.temp_max,
    };
  });
  return (
    <div className="chart-wrap" style={{ height: 240 }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={cd} margin={{ top:4, right:4, bottom:0, left:-12 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" tick={{ fontSize:10 }} />
          <YAxis domain={['dataMin - 3', 'dataMax + 3']} tick={{ fontSize:10 }} />
          <Tooltip />
          <Legend />
          <Area type="monotone" dataKey="pred_matin" stroke="#a78bfa" strokeWidth={2} strokeDasharray="5 4" fill="none" name="Prédiction matin" />
          <Area type="monotone" dataKey="pred_aprem" stroke="#f97316" strokeWidth={2} strokeDasharray="5 4" fill="none" name="Prédiction après-midi" />
          <Area type="monotone" dataKey="real_min" stroke="#4f6ef7" strokeWidth={2} fill="none" name="Open-Meteo min" dot={{ r:3 }} />
          <Area type="monotone" dataKey="real_max" stroke="#22c55e" strokeWidth={2} fill="none" name="Open-Meteo max" dot={{ r:3 }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── fmtDate ──
function fmtDate(d) {
  const [y, m, day] = d.split('-');
  const ms = ['','Jan','Fév','Mar','Avr','Mai','Juin','Juil','Aoû','Sep','Oct','Nov','Déc'];
  return `${parseInt(day)} ${ms[parseInt(m)]}`;
}
