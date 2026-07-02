export default function StatsCards({ data }) {
  const tMatin = data.filter(r => r.temp_matin != null).map(r => r.temp_matin);
  const tAprem = data.filter(r => r.temp_aprem != null).map(r => r.temp_aprem);
  const tmax = Math.max(...tAprem);
  const tmin = Math.min(...tMatin);
  const avg = (tMatin.reduce((a, b) => a + b, 0) / tMatin.length + tAprem.reduce((a, b) => a + b, 0) / tAprem.length) / 2;
  const tmaxR = data.find(r => r.temp_aprem === tmax);
  const tminR = data.find(r => r.temp_matin === tmin);
  const soleil = data.filter(r => r.categorie_aprem === 'Soleil').length;
  const soleilPct = ((soleil / data.length) * 100).toFixed(0);

  const cards = [
    {
      label: 'Température moyenne',
      value: `${avg.toFixed(1)}°`,
      sub: 'Sur l\'ensemble des relevés',
      accent: 'linear-gradient(135deg, var(--primary), #a78bfa)',
      delay: 'delay-1',
    },
    {
      label: 'Max après-midi',
      value: `${tmax}°`,
      sub: tmaxR ? `le ${fmt(tmaxR.date)}` : '',
      accent: 'linear-gradient(135deg, #fb923c, #ef4444)',
      delay: 'delay-2',
    },
    {
      label: 'Min matin',
      value: `${tmin}°`,
      sub: tminR ? `le ${fmt(tminR.date)}` : '',
      accent: 'linear-gradient(135deg, #38bdf8, #6366f1)',
      delay: 'delay-3',
    },
    {
      label: 'Jours de soleil',
      value: `${soleil}`,
      sub: `${soleilPct}% des relevés`,
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
