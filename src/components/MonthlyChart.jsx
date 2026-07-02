import { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts';

const MN = { 1:'Jan', 2:'Fév', 3:'Mar', 4:'Avr', 5:'Mai', 6:'Juin',
  7:'Juil', 8:'Aoû', 9:'Sep', 10:'Oct', 11:'Nov', 12:'Déc' };

export default function MonthlyChart({ data }) {
  const chartData = useMemo(() => {
    const m = {};
    for (const r of data) {
      const month = parseInt(r.date.split('-')[1]);
      if (!m[month]) m[month] = { matins: [], aprems: [] };
      if (r.temp_matin != null) m[month].matins.push(r.temp_matin);
      if (r.temp_aprem != null) m[month].aprems.push(r.temp_aprem);
    }
    return Object.entries(m)
      .sort(([a], [b]) => parseInt(a) - parseInt(b))
      .map(([k, v]) => ({
        mois: MN[k],
        matin: +(v.matins.reduce((a, b) => a + b, 0) / v.matins.length).toFixed(1),
        aprem: +(v.aprems.reduce((a, b) => a + b, 0) / v.aprems.length).toFixed(1),
      }));
  }, [data]);

  return (
    <ResponsiveContainer width="100%" height={360}>
      <BarChart data={chartData} margin={{ top: 4, right: 8, left: -12, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
        <XAxis dataKey="mois" tick={{ fontSize: 11, fill: '#7b7f94' }} tickLine={false} axisLine={false} />
        <YAxis
          tick={{ fontSize: 10, fill: '#7b7f94' }}
          tickLine={false}
          axisLine={false}
          tickFormatter={v => `${v}°`}
        />
        <Tooltip
          contentStyle={{
            background: '#1a1d2b', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 12, fontSize: 13, color: '#e8eaf0',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          }}
          formatter={(value, name) => {
            const labels = { matin: 'Matin', aprem: 'Après-midi' };
            return [`${value}°C`, labels[name] || name];
          }}
        />
        <Legend
          verticalAlign="top" height={28} iconType="circle"
          formatter={(v) => {
            const labels = { matin: 'Matin', aprem: 'Après-midi' };
            return <span style={{ color: '#9ca3af', fontSize: 13 }}>{labels[v] || v}</span>;
          }}
        />
        <Bar dataKey="matin" fill="rgba(56,189,248,0.6)" radius={[6, 6, 0, 0]} maxBarSize={36} />
        <Bar dataKey="aprem" fill="rgba(251,146,60,0.6)" radius={[6, 6, 0, 0]} maxBarSize={36} />
      </BarChart>
    </ResponsiveContainer>
  );
}
