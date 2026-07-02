export default function DataTable({ data }) {
  const sorted = [...data].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div style={{ overflowX: 'auto', maxHeight: 520, overflowY: 'auto', borderRadius: 8, border: '1px solid var(--border)' }}>
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Matin</th>
            <th>Aprem</th>
            <th>Condition</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map(r => (
            <tr key={r.date}>
              <td style={{ whiteSpace: 'nowrap', fontWeight: 500 }}>{fmt(r.date)}</td>
              <td>
                <TempBadge value={r.temp_matin} />
              </td>
              <td>
                <TempBadge value={r.temp_aprem} />
              </td>
              <td>
                {r.categorie_aprem && (
                  <span className={`badge badge-${r.categorie_aprem.toLowerCase().normalize('NFD').replace(/[^a-z]/g, '')}`}>
                    {icon(r.categorie_aprem)} {r.categorie_aprem}
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TempBadge({ value }) {
  if (value == null) return <span style={{ color: 'var(--text-secondary)', opacity: 0.4 }}>—</span>;
  const cls = value <= 0 ? 'temp-cold' : value >= 30 ? 'temp-hot' : value >= 25 ? 'temp-warm' : '';
  return <span className={cls}>{value}°</span>;
}

function icon(cat) {
  const m = { Soleil: '☀️', Nuageux: '☁️', Pluie: '🌧️', Neige: '❄️', Vent: '💨' };
  return m[cat] || '';
}

function fmt(d) {
  const [y, m, day] = d.split('-');
  const ms = ['', 'Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
  return `${parseInt(day)} ${ms[parseInt(m)]}`;
}
