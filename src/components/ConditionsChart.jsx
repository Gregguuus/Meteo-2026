import { useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const COLORS = {
  Soleil: '#f59e0b',
  Nuageux: '#6b7280',
  Pluie: '#3b82f6',
  Neige: '#9ca3af',
  Vent: '#ec4899',
};

const LABELS = {
  Soleil: '☀️ Soleil',
  Nuageux: '☁️ Nuageux',
  Pluie: '🌧️ Pluie',
  Neige: '❄️ Neige',
  Vent: '💨 Vent',
};

export default function ConditionsChart({ data }) {
  const chartData = useMemo(() => {
    const counts = {};
    for (const r of data) {
      const cat = r.categorie_aprem || 'Autre';
      counts[cat] = (counts[cat] || 0) + 1;
    }
    return Object.entries(counts)
      .filter(([k]) => k)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [data]);

  const total = chartData.reduce((s, d) => s + d.value, 0);

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 340 }}>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={70}
            outerRadius={110}
            dataKey="value"
            strokeWidth={0}
          >
            {chartData.map((entry) => (
              <Cell key={entry.name} fill={COLORS[entry.name] || '#d1d5db'} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value, name) => {
              const pct = ((value / total) * 100).toFixed(1);
              return [`${value} jours (${pct}%)`, LABELS[name] || name];
            }}
            contentStyle={{
              background: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: 8,
              fontSize: 13,
            }}
          />
          <Legend
            verticalAlign="bottom"
            height={36}
            formatter={(value) => (
              <span style={{ color: '#374151', fontSize: 13 }}>{LABELS[value] || value}</span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
