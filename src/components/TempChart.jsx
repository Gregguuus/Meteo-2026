import { useMemo } from 'react';
import {
  ComposedChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts';

export default function TempChart({ data }) {
  const chartData = useMemo(() => {
    return data
      .filter(r => r.temp_matin != null || r.temp_aprem != null)
      .map(r => {
        const [y, m, d] = r.date.split('-');
        return {
          date: `${d}/${m}`,
          dateFull: r.date,
          matin: r.temp_matin,
          aprem: r.temp_aprem,
        };
      });
  }, [data]);

  return (
    <ResponsiveContainer width="100%" height={420}>
      <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: -12, bottom: 4 }}>
        <defs>
          <linearGradient id="matinG" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.3} />
            <stop offset="100%" stopColor="#38bdf8" stopOpacity={0.02} />
          </linearGradient>
          <linearGradient id="apremG" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fb923c" stopOpacity={0.3} />
            <stop offset="100%" stopColor="#fb923c" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 10, fill: '#7b7f94' }}
          tickLine={false}
          axisLine={false}
          interval="preserveStartEnd"
          minTickGap={50}
        />
        <YAxis
          tick={{ fontSize: 10, fill: '#7b7f94' }}
          tickLine={false}
          axisLine={false}
          domain={['dataMin - 3', 'dataMax + 3']}
          tickFormatter={v => `${v}°`}
        />
        <Tooltip
          contentStyle={{
            background: '#1a1d2b',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 12,
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            fontSize: 13,
            color: '#e8eaf0',
          }}
          formatter={(value, name) => {
            const labels = { matin: 'Matin', aprem: 'Après-midi' };
            return [`${value}°C`, labels[name] || name];
          }}
        />
        <Legend
          verticalAlign="top"
          height={32}
          iconType="circle"
          formatter={(value) => {
            const labels = { matin: 'Matin', aprem: 'Après-midi' };
            return <span style={{ color: '#9ca3af', fontSize: 13 }}>{labels[value] || value}</span>;
          }}
        />
        <Area
          type="monotone"
          dataKey="matin"
          stroke="#38bdf8"
          strokeWidth={2}
          fill="url(#matinG)"
          dot={false}
          activeDot={{ r: 5, fill: '#38bdf8', stroke: '#0b0d15', strokeWidth: 2 }}
        />
        <Area
          type="monotone"
          dataKey="aprem"
          stroke="#fb923c"
          strokeWidth={2.5}
          fill="url(#apremG)"
          dot={false}
          activeDot={{ r: 5, fill: '#fb923c', stroke: '#0b0d15', strokeWidth: 2 }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
