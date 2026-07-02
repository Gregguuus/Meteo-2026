import { useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const META = {
  Soleil: { color: '#fbbf24', glow: 'rgba(251,191,36,0.3)', label: 'Soleil' },
  Nuageux: { color: '#6b7280', glow: 'rgba(107,114,128,0.3)', label: 'Nuageux' },
  Pluie: { color: '#3b82f6', glow: 'rgba(59,130,246,0.3)', label: 'Pluie' },
  Neige: { color: '#d1d5db', glow: 'rgba(209,213,219,0.3)', label: 'Neige' },
  Vent: { color: '#ec4899', glow: 'rgba(236,72,153,0.3)', label: 'Vent' },
};

export default function ConditionsChart({ data }) {
  const chartData = useMemo(() => {
    const counts = {};
    for (const r of data) {
      const cat = r.categorie_aprem || 'Autre';
      counts[cat] = (counts[cat] || 0) + 1;
    }
    return Object.entries(counts)
      .filter(([k]) => k && META[k])
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [data]);

  const total = chartData.reduce((s, d) => s + d.value, 0);

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 360 }}>
      <ResponsiveContainer width="100%" height={320}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%" cy="50%"
            innerRadius={65}
            outerRadius={110}
            dataKey="value"
            strokeWidth={0}
            paddingAngle={2}
          >
            {chartData.map(entry => (
              <Cell key={entry.name} fill={META[entry.name]?.color || '#6b7280'} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value, name) => {
              const pct = ((value / total) * 100).toFixed(1);
              return [`${value} jours (${pct}%)`, META[name]?.label || name];
            }}
            contentStyle={{
              background: '#1a1d2b', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 12, fontSize: 13, color: '#e8eaf0',
              boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            }}
          />
          <Legend
            verticalAlign="bottom" height={40}
            iconType="circle"
            formatter={(value) => (
              <span style={{ color: '#9ca3af', fontSize: 13 }}>
                {META[value]?.label || value} ({chartData.find(d => d.name === value)?.value || 0})
              </span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
