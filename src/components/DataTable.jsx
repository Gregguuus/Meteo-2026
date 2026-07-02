export default function DataTable({ data }) {
  const tempClass = (v) => {
    if (v == null) return '';
    if (v <= 0) return 'temp-cold';
    if (v >= 30) return 'temp-hot';
    if (v >= 25) return 'temp-warm';
    return '';
  };

  const badgeClass = (cat) => {
    const map = {
      Soleil: 'badge-soleil',
      Nuageux: 'badge-nuageux',
      Pluie: 'badge-pluie',
      Neige: 'badge-neige',
      Vent: 'badge-vent',
    };
    return map[cat] || '';
  };

  const sorted = [...data].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div style={{ overflowX: 'auto', maxHeight: 480, overflowY: 'auto' }}>
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Ville</th>
            <th style={{ textAlign: 'right' }}>🌅 Matin</th>
            <th style={{ textAlign: 'right' }}>🌤 Aprem</th>
            <th>Condition</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((r) => (
            <tr key={r.date}>
              <td style={{ whiteSpace: 'nowrap', fontWeight: 500 }}>
                {formatDate(r.date)}
              </td>
              <td style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                {r.ville}
              </td>
              <td style={{ textAlign: 'right' }}>
                <span className={tempClass(r.temp_matin)}>
                  {r.temp_matin != null ? `${r.temp_matin}°` : '-'}
                </span>
              </td>
              <td style={{ textAlign: 'right' }}>
                <span className={tempClass(r.temp_aprem)}>
                  {r.temp_aprem != null ? `${r.temp_aprem}°` : '-'}
                </span>
              </td>
              <td>
                {r.categorie_aprem && (
                  <span className={`badge ${badgeClass(r.categorie_aprem)}`}>
                    {r.categorie_aprem}
                  </span>
                )}
                {r.condition_aprem && (
                  <span style={{ marginLeft: 6, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    {r.condition_aprem}
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

function formatDate(d) {
  const [y, m, day] = d.split('-');
  const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
  return `${parseInt(day)} ${months[parseInt(m) - 1]}`;
}
