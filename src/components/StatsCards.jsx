export default function StatsCards({ stats }) {
  const cards = [
    {
      label: 'Température moyenne',
      value: `${stats.avg_matin ? ((stats.avg_matin + stats.avg_aprem) / 2).toFixed(1) : '—'}°`,
      sub: `${stats.avg_matin?.toFixed(1) ?? '—'}° matin · ${stats.avg_aprem?.toFixed(1) ?? '—'}° après-midi`,
      accent: 'linear-gradient(135deg, var(--primary), #a78bfa)',
      delay: 'delay-1',
    },
    {
      label: 'Max après-midi',
      value: `${stats.max_aprem ?? '—'}°`,
      sub: stats.max_date ? fmt(stats.max_date) : '',
      accent: 'linear-gradient(135deg, #fb923c, #ef4444)',
      delay: 'delay-2',
    },
    {
      label: 'Min matin',
      value: `${stats.min_matin ?? '—'}°`,
      sub: stats.min_date ? fmt(stats.min_date) : '',
      accent: 'linear-gradient(135deg, #38bdf8, #6366f1)',
      delay: 'delay-3',
    },
    {
      label: 'Jours de soleil',
      value: `${stats.soleil ?? 0}`,
      sub: stats.pct_soleil ? `${stats.pct_soleil}% des relevés` : '',
      accent: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
      delay: 'delay-4',
    },
  ];

  return (
    <div className="grid-4" style={{ marginBottom: 32 }}>
      {cards.map(c => (
        <div key={c.label} className={`stat-card animate-fade ${c.delay}`} style={{ position: 'relative', overflow: 'hidden' }}>
          <div style={{
            position: 'absolute', top: '-40%', right: '-20%',
            width: 120, height: 120, borderRadius: '50%',
            background: c.accent,
            opacity: 0.04,
            filter: 'blur(30px)',
          }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div className="stat-label">{c.label}</div>
            <div className="stat-value" style={{
              background: c.accent,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>{c.value}</div>
            <div className="stat-sub">{c.sub}</div>
          </div>
          <div style={{
            width: '100%', height: 2, borderRadius: 2,
            background: c.accent, opacity: 0.15, marginTop: 12,
          }} />
        </div>
      ))}
    </div>
  );
}

function fmt(d) {
  const [y, m, day] = d.split('-');
  const ms = ['', 'Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
  return `${parseInt(day)} ${ms[parseInt(m)]}`;
}
