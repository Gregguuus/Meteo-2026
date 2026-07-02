export default function StatsCards({ data }) {
  const tempsMatin = data
    .filter((r) => r.temp_matin != null)
    .map((r) => r.temp_matin);

  const tempsAprem = data
    .filter((r) => r.temp_aprem != null)
    .map((r) => r.temp_aprem);

  const tmax = Math.max(...tempsAprem);
  const tmin = Math.min(...tempsMatin);
  const avgMatin = tempsMatin.reduce((a, b) => a + b, 0) / tempsMatin.length;
  const avgAprem = tempsAprem.reduce((a, b) => a + b, 0) / tempsAprem.length;

  const tmaxRecord = data.find((r) => r.temp_aprem === tmax);
  const tminRecord = data.find((r) => r.temp_matin === tmin);

  const soleilCount = data.filter((r) => r.categorie_aprem === 'Soleil').length;
  const pluieCount = data.filter((r) => r.categorie_aprem === 'Pluie').length;

  const cards = [
    {
      label: 'Moyenne générale',
      value: `${((avgMatin + avgAprem) / 2).toFixed(1)}°`,
      sub: `Matin ${avgMatin.toFixed(1)}° · Aprem ${avgAprem.toFixed(1)}°`,
      color: 'var(--text)',
    },
    {
      label: 'Max après-midi',
      value: `${tmax}°`,
      sub: tmaxRecord ? `le ${formatDate(tmaxRecord.date)}` : '',
      color: 'var(--hot)',
    },
    {
      label: 'Min matin',
      value: `${tmin}°`,
      sub: tminRecord ? `le ${formatDate(tminRecord.date)}` : '',
      color: 'var(--cold)',
    },
    {
      label: 'Jours de soleil',
      value: `${soleilCount}`,
      sub: `sur ${data.length} jours (${((soleilCount / data.length) * 100).toFixed(0)}%)`,
      color: '#f59e0b',
    },
  ];

  return (
    <div className="grid-4">
      {cards.map((card) => (
        <div key={card.label} className="stat-card">
          <div className="stat-label">{card.label}</div>
          <div className="stat-value" style={{ color: card.color }}>
            {card.value}
          </div>
          <div className="stat-sub">{card.sub}</div>
        </div>
      ))}
    </div>
  );
}

function formatDate(d) {
  const [y, m, day] = d.split('-');
  return `${day}/${m}`;
}
