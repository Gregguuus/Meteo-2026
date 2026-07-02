import { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts';

const MONTH_NAMES = {
  1: 'Jan', 2: 'Fév', 3: 'Mar', 4: 'Avr', 5: 'Mai', 6: 'Juin',
  7: 'Juil', 8: 'Aoû', 9: 'Sep', 10: 'Oct', 11: 'Nov', 12: 'Déc',
};

export default function MonthlyChart({ data }) {
  const chartData = useMemo(() => {
    const months = {};
    for (const r of data) {
      const m = parseInt(r.date.split('-')[1]);
      if (!months[m]) months[m] = { matins: [], aprems: [] };
      if (r.temp_matin != null) months[m].matins.push(r.temp_matin);
      if (r.temp_aprem != null) months[m].aprems.push(r.temp_aprem);
    }

    return Object.entries(months)
      .sort(([a], [b]) => parseInt(a) - parseInt(b))
      .map(([m, v]) => {
        const avgMatin = v.matins.reduce((a, b) => a + b, 0) / v.matins.length;
        const avgAprem = v.aprems.reduce((a, b) => a + b, 0) / v.aprems.length;
        return {
          mois: MONTH_NAMES[m],
          matin: Math.round(avgMatin * 10) / 10,
          aprem: Math.round(avgAprem * 10) / 10,
        };
      });
  }, [data]);

  return (
    <ResponsiveContainer width="100%" height={340}>
      <BarChart data={chartData} margin={{ top: 4, right: 8, left: -8, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey="mois" tick={{ fontSize: 12, fill: '#6b7280' }} tickLine={false} />
        <YAxis
          tick={{ fontSize: 11, fill: '#6b7280' }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => `${v}°`}
        />
        <Tooltip
          contentStyle={{
            background: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: 8,
            fontSize: 13,
          }}
          formatter={(value, name) => {
            const labels = { matin: '🌅 Matin', aprem: '🌤 Après-midi' };
            return [`${value}°C`, labels[name] || name];
          }}
        />
        <Legend
          verticalAlign="top"
          height={28}
          iconType="circle"
          formatter={(value) => {
            const labels = { matin: 'Matin', aprem: 'Après-midi' };
            return <span style={{ color: '#374151', fontSize: 13 }}>{labels[value] || value}</span>;
          }}
        />
        <Bar
          dataKey="matin"
          fill="#93c5fd"
          radius={[4, 4, 0, 0]}
          maxBarSize={32}
        />
        <Bar
          dataKey="aprem"
          fill="#fca5a5"
          radius={[4, 4, 0, 0]}
          maxBarSize={32}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
