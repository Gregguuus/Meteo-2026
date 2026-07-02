import { useMemo } from 'react';
import {
  ComposedChart, Line, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts';

export default function TempChart({ data }) {
  const chartData = useMemo(() => {
    return data
      .filter((r) => r.temp_matin != null || r.temp_aprem != null)
      .map((r) => {
        const [y, m, d] = r.date.split('-');
        return {
          date: `${d}/${m}`,
          dateFull: r.date,
          matin: r.temp_matin,
          aprem: r.temp_aprem,
          diff: r.temp_aprem != null && r.temp_matin != null
            ? (r.temp_aprem - r.temp_matin).toFixed(1)
            : null,
        };
      });
  }, [data]);

  return (
    <ResponsiveContainer width="100%" height={380}>
      <ComposedChart data={chartData} margin={{ top: 4, right: 8, left: -8, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11, fill: '#6b7280' }}
          tickLine={false}
          interval="preserveStartEnd"
          minTickGap={40}
        />
        <YAxis
          tick={{ fontSize: 11, fill: '#6b7280' }}
          tickLine={false}
          axisLine={false}
          domain={['dataMin - 3', 'dataMax + 3']}
          tickFormatter={(v) => `${v}°`}
        />
        <Tooltip
          contentStyle={{
            background: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: 8,
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
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
        <defs>
          <linearGradient id="matinGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.01} />
          </linearGradient>
          <linearGradient id="apremGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.15} />
            <stop offset="95%" stopColor="#ef4444" stopOpacity={0.01} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="matin"
          stroke="#3b82f6"
          strokeWidth={2}
          fill="url(#matinGrad)"
          dot={false}
          activeDot={{ r: 4, fill: '#3b82f6', stroke: 'white', strokeWidth: 2 }}
        />
        <Area
          type="monotone"
          dataKey="aprem"
          stroke="#ef4444"
          strokeWidth={2}
          fill="url(#apremGrad)"
          dot={false}
          activeDot={{ r: 4, fill: '#ef4444', stroke: 'white', strokeWidth: 2 }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
